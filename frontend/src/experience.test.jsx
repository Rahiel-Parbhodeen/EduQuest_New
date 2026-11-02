// @vitest-environment jsdom
import React from 'react';
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from '@testing-library/react';
import { it, expect, afterEach, vi } from 'vitest';
import {
  NewAuth,
  CodeLab,
  Profile,
  Curriculum,
  PasswordChange,
} from './experience.jsx';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('requires surname and matching strong passwords before registration request', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  render(<NewAuth onLogin={() => {}} />);
  fireEvent.click(screen.getByText('Create an account'));
  fireEvent.change(screen.getByLabelText(/First and last name/), {
    target: { value: 'Onlyfirst' },
  });
  fireEvent.submit(
    screen.getByRole('button', { name: 'Register' }).closest('form'),
  );
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(fetch).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Confirm password')).toBeTruthy();
  expect(screen.getByLabelText('Study programme')).toBeTruthy();
});
it('waits for authenticator verification before signing in', async () => {
  const login = vi.fn();
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ mfaRequired: true, challenge: 'challenge' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { role: 'student' } }),
      }),
  );
  render(<NewAuth onLogin={login} />);
  fireEvent.submit(
    screen.getByRole('button', { name: 'Log in' }).closest('form'),
  );
  await screen.findByText('Verify your sign-in');
  expect(login).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText(/Authenticator code/), {
    target: { value: '123456' },
  });
  fireEvent.submit(
    screen.getByRole('button', { name: 'Verify' }).closest('form'),
  );
  await waitFor(() => expect(login).toHaveBeenCalledWith({ role: 'student' }));
});
it('runs preview in an isolated iframe and shows changed code lines', () => {
  render(<CodeLab />);
  const iframe = screen.getByTitle('Live code result');
  expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
  fireEvent.click(screen.getByText('Save comparison point'));
  fireEvent.change(screen.getByLabelText('HTML'), {
    target: { value: '<h1>Changed</h1>' },
  });
  expect(screen.getByText(/Line 1/)).toBeTruthy();
  fireEvent.click(screen.getByText('Run code'));
  expect(iframe.getAttribute('srcdoc')).toContain('<h1>Changed</h1>');
  expect(iframe.getAttribute('srcdoc')).toContain("connect-src 'none'");
});

it('does not offer module join codes to students or lecturers', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            module_id: 'm',
            module_code: 'IT101',
            module_name: 'Programming',
            study_year: 1,
            join_code: 'LEGACYCODE',
          },
        ],
      }),
    }),
  );
  const view = render(<Curriculum user={{ role: 'student', study_year: 1 }} />);
  await screen.findByText('Programming');
  expect(screen.queryByText('Module join code')).toBeNull();
  expect(screen.queryByText('Join another module')).toBeNull();
  view.unmount();
  render(<Curriculum user={{ role: 'lecturer' }} />);
  await screen.findByText('Programming');
  expect(screen.queryByText(/LEGACYCODE/)).toBeNull();
});

it('shows mismatch feedback without submitting a password change', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  render(<PasswordChange />);
  fireEvent.change(screen.getByLabelText('Current password'), {
    target: { value: 'InitialPassword12!' },
  });
  fireEvent.change(screen.getByLabelText('New password'), {
    target: { value: 'ChangedPassword34!' },
  });
  fireEvent.change(screen.getByLabelText('Confirm new password'), {
    target: { value: 'DifferentPassword34!' },
  });
  fireEvent.submit(
    screen.getByRole('button', { name: 'Change password' }).closest('form'),
  );
  expect(await screen.findByRole('alert')).toHaveProperty(
    'textContent',
    'New passwords do not match.',
  );
  expect(fetch).not.toHaveBeenCalled();
});
it('shows server errors and clears secret fields after a successful password change', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: 'Your current password is incorrect.' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Password changed successfully.' }),
      }),
  );
  render(<PasswordChange />);
  for (const [label, value] of [
    ['Current password', 'InitialPassword12!'],
    ['New password', 'ChangedPassword34!'],
    ['Confirm new password', 'ChangedPassword34!'],
  ])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  const form = screen
    .getByRole('button', { name: 'Change password' })
    .closest('form');
  fireEvent.submit(form);
  expect(await screen.findByRole('alert')).toHaveProperty(
    'textContent',
    'Your current password is incorrect.',
  );
  fireEvent.submit(form);
  await screen.findByText('Password changed successfully.');
  expect(screen.getByLabelText('Current password').value).toBe('');
  expect(screen.getByLabelText('New password').value).toBe('');
  expect(screen.getByLabelText('Confirm new password').value).toBe('');
});
