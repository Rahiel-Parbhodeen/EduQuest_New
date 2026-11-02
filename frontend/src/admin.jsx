import React, { useEffect, useState } from 'react';
const api = async (path, options = {}) => {
  const response = await fetch('/api/v1' + path, {
    credentials: 'include',
    ...options,
    headers:
      options.body instanceof FormData
        ? options.headers
        : { 'content-type': 'application/json', ...options.headers },
  });
  const body = await response.json();
  if (!response.ok)
    throw Error(body.error?.message || 'The request could not be completed.');
  return body;
};
const send = (path, body, method = 'POST') =>
  api(path, { method, body: JSON.stringify(body) });
function useRecords(path, poll = false) {
  const [state, setState] = useState({
      loading: true,
      data: [],
      error: '',
      total: 0,
    }),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const body = await api(path);
        if (live) setState({ loading: false, error: '', ...body });
      } catch (e) {
        if (live) setState((s) => ({ ...s, loading: false, error: e.message }));
      }
    };
    load();
    const timer = poll ? setInterval(load, 10000) : null;
    return () => {
      live = false;
      if (timer) clearInterval(timer);
    };
  }, [path, revision, poll]);
  return [state, () => setRevision((r) => r + 1)];
}
function Feedback({ message, error = false }) {
  return message ? (
    <p
      role={error ? 'alert' : 'status'}
      className={error ? 'field-error' : 'success'}
    >
      {message}
    </p>
  ) : null;
}
export function LecturerApplication({ user }) {
  const [state, reload] = useRecords('/lecturer-applications/me', true),
    [name, setName] = useState(user.full_name || user.fullName || ''),
    [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState({ message: '', error: false });
  const pending = state.data.some((a) => a.status === 'pending');
  const submit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const file = form.cv.files[0];
    if (!file) {
      setFeedback({ message: 'Choose your CV.', error: true });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ message: 'Your CV must be 5 MB or smaller.', error: true });
      return;
    }
    setBusy(true);
    setFeedback({ message: '', error: false });
    try {
      const data = new FormData();
      data.append('fullName', name);
      data.append('cv', file);
      const result = await api('/lecturer-applications', {
        method: 'POST',
        body: data,
      });
      setFeedback({ message: result.message, error: false });
      form.reset();
      reload();
    } catch (e) {
      setFeedback({ message: e.message, error: true });
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="grid">
      <article className="card">
        <h2>Request to become a lecturer</h2>
        <p>
          Send your name and CV for administrator review. Approval changes your
          account to lecturer; you will then sign in again.
        </p>
        {pending ? (
          <p className="status-badge">
            Your request is awaiting administrator review.
          </p>
        ) : (
          <form onSubmit={submit}>
            <label>
              Full name
              <input
                autoComplete="name"
                required
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              CV
              <input name="cv" type="file" accept=".pdf,.docx" required />
            </label>
            <small>
              PDF or DOCX, up to 5 MB. Only you and administrators can download
              this CV.
            </small>
            <button className="primary" disabled={busy}>
              {busy ? 'Sending request…' : 'Send lecturer request'}
            </button>
          </form>
        )}
        <Feedback {...feedback} />
      </article>
      <article className="card">
        <h2>Your application history</h2>
        {state.loading && <p>Loading applications…</p>}
        <Feedback message={state.error} error />
        {!state.loading && !state.data.length && (
          <p>No requests submitted yet.</p>
        )}
        {state.data.map((a) => (
          <div className="application-history" key={a.application_id}>
            <span className="status-badge">{a.status}</span>
            <p>{a.applicant_name}</p>
            <p>{new Date(a.submitted_at).toLocaleString()}</p>
            <a href={`/api/v1/lecturer-applications/${a.application_id}/cv`}>
              Download your submitted CV
            </a>
            {a.review_note && (
              <p>
                <b>Administrator feedback:</b> {a.review_note}
              </p>
            )}
          </div>
        ))}
      </article>
    </section>
  );
}
function ReviewCard({ application, reload }) {
  const [note, setNote] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const review = async (decision) => {
    if (decision === 'rejected' && !note.trim()) {
      setError('Enter a reason for rejection.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await send(
        `/admin/lecturer-applications/${application.application_id}/review`,
        { decision, note },
      );
      reload(result.message);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="card">
      <span className="status-badge">{application.status}</span>
      <h3>{application.applicant_name}</h3>
      <p>{application.email}</p>
      <p>
        Account name: {application.account_name} · Current role:{' '}
        {application.current_role}
      </p>
      <p>Submitted {new Date(application.submitted_at).toLocaleString()}</p>
      <a
        className="secondary download-link"
        href={`/api/v1/lecturer-applications/${application.application_id}/cv`}
      >
        Download CV — {application.cv_original_name}
      </a>
      {application.status === 'pending' ? (
        <>
          <label>
            Review note
            <textarea
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Required when rejecting a request"
            />
          </label>
          <div className="filter-bar">
            <button
              className="primary"
              disabled={busy}
              onClick={() => review('approved')}
            >
              Approve request
            </button>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => review('rejected')}
            >
              Reject request
            </button>
          </div>
        </>
      ) : (
        <p>
          <b>Review note:</b> {application.review_note || 'No additional note.'}
        </p>
      )}
      <Feedback message={error} error />
    </article>
  );
}
export function AdminRequests() {
  const [status, setStatus] = useState('pending'),
    [page, setPage] = useState(0),
    [message, setMessage] = useState('');
  const [state, reload] = useRecords(
    `/admin/lecturer-applications?status=${status}&page=${page}`,
    true,
  );
  return (
    <section>
      <article className="card">
        <h2>Lecturer requests</h2>
        <p>
          Review submitted CVs, then approve or reject each application. This
          inbox refreshes automatically.
        </p>
        <label>
          Request status
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            {['pending', 'approved', 'rejected', 'all'].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <p aria-live="polite">
          {state.total}{' '}
          {status === 'all' ? 'applications' : status + ' requests'}
        </p>
        <button className="secondary" onClick={() => reload()}>
          Refresh requests
        </button>
        <Feedback message={message} />
        <Feedback message={state.error} error />
      </article>
      <div className="module-tiles">
        {state.data.map((a) => (
          <ReviewCard
            key={a.application_id}
            application={a}
            reload={(message) => {
              setMessage(message);
              reload();
            }}
          />
        ))}
      </div>
      {!state.loading && !state.data.length && (
        <p className="empty-state">No requests in this view.</p>
      )}
      <div className="filter-bar">
        <button disabled={!page} onClick={() => setPage(page - 1)}>
          Previous page
        </button>
        <button
          disabled={(page + 1) * 25 >= state.total}
          onClick={() => setPage(page + 1)}
        >
          Next page
        </button>
      </div>
    </section>
  );
}
function UserCard({ account, currentId, reload }) {
  const [role, setRole] = useState(account.role),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [busy, setBusy] = useState(false),
    [feedback, setFeedback] = useState({ message: '', error: false });
  useEffect(() => setRole(account.role), [account.role]);
  const own = account.user_id === currentId;
  const action = async (type) => {
    setBusy(true);
    setFeedback({ message: '', error: false });
    try {
      const body =
        type === 'role'
          ? { role }
          : { newPassword: password, confirmNewPassword: confirm };
      const result = await send(
        `/admin/users/${account.user_id}/${type}`,
        body,
        'PUT',
      );
      setPassword('');
      setConfirm('');
      setFeedback({ message: result.message, error: false });
      reload();
    } catch (e) {
      setFeedback({ message: e.message, error: true });
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="card">
      <h3>{account.full_name}</h3>
      <p>{account.email}</p>
      <p>
        <b>Current role:</b> {account.role}
      </p>
      <details>
        <summary>Account ID</summary>
        <code className="record-id">{account.user_id}</code>
      </details>
      <label>
        Account role
        <select
          disabled={own || busy}
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          {['student', 'lecturer', 'admin'].map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <button
        className="primary"
        disabled={own || busy || role === account.role}
        onClick={() => action('role')}
      >
        Save role
      </button>
      {own ? (
        <p>
          Use Profile to change your own password. Another admin must change
          your role.
        </p>
      ) : (
        <details>
          <summary>Reset password</summary>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              action('password');
            }}
          >
            <label>
              New password
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={72}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label>
              Confirm new password
              <input
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
            <small>
              Use uppercase, lowercase, a number and a special character. The
              user will be signed out of all sessions.
            </small>
            <button className="secondary" disabled={busy}>
              Reset user password
            </button>
          </form>
        </details>
      )}
      <Feedback {...feedback} />
    </article>
  );
}
export function AdminUsers({ user }) {
  const [search, setSearch] = useState(''),
    [query, setQuery] = useState(''),
    [page, setPage] = useState(0);
  const [state, reload] = useRecords(
    `/admin/users?search=${encodeURIComponent(query)}&page=${page}`,
  );
  return (
    <section>
      <article className="card">
        <h2>Manage users</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(search);
            setPage(0);
            reload();
          }}
        >
          <label>
            Search users
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name or email"
            />
          </label>
          <button className="secondary">Search</button>
        </form>
        <p>
          Role changes and password resets sign out the affected user. Lecturer
          accounts that own modules must transfer them before their role
          changes.
        </p>
        <Feedback message={state.error} error />
      </article>
      <div className="module-tiles">
        {state.data.map((a) => (
          <UserCard
            key={a.user_id}
            account={a}
            currentId={user.userId || user.user_id}
            reload={reload}
          />
        ))}
      </div>
      <div className="filter-bar">
        <button disabled={!page} onClick={() => setPage(page - 1)}>
          Previous page
        </button>
        <button
          disabled={(page + 1) * 50 >= state.total}
          onClick={() => setPage(page + 1)}
        >
          Next page
        </button>
      </div>
    </section>
  );
}
const label = (key) =>
  key.replaceAll('_', ' ').replace(/^./, (s) => s.toUpperCase());
const numberFields = new Set(['marks', 'study_year', 'difficulty_level']);
function RecordEditor({ row, fields, save, cancel }) {
  const [values, setValues] = useState(
      Object.fromEntries(fields.map((k) => [k, row[k] ?? null])),
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const change = (key, value) => setValues((v) => ({ ...v, [key]: value }));
  return (
    <form
      className="record-editor"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await save(values);
        } catch (e) {
          setError(e.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h4>Edit record</h4>
      {fields.map((key) => (
        <label key={key}>
          {label(key)}
          {typeof row[key] === 'boolean' ? (
            <input
              type="checkbox"
              checked={Boolean(values[key])}
              onChange={(e) => change(key, e.target.checked)}
            />
          ) : key === 'study_track' ? (
            <select
              value={values[key] || ''}
              onChange={(e) => change(key, e.target.value || null)}
            >
              <option value="">Not set</option>
              <option>IT</option>
              <option>Business</option>
            </select>
          ) : key === 'status' ? (
            <select
              value={values[key]}
              onChange={(e) => change(key, e.target.value)}
            >
              <option>draft</option>
              <option>published</option>
            </select>
          ) : [
              'question_text',
              'explanation',
              'current_activity',
              'next_activity',
            ].includes(key) ? (
            <textarea
              value={values[key] ?? ''}
              onChange={(e) => change(key, e.target.value || null)}
            />
          ) : (
            <input
              type={numberFields.has(key) ? 'number' : 'text'}
              step="any"
              value={values[key] ?? ''}
              onChange={(e) =>
                change(
                  key,
                  numberFields.has(key)
                    ? Number(e.target.value)
                    : e.target.value || null,
                )
              }
            />
          )}
        </label>
      ))}
      <small>
        Dates use ISO format, for example 2026-11-02T12:00:00Z. Lecturer IDs are
        available from the Users screen.
      </small>
      <div className="filter-bar">
        <button className="primary" disabled={busy}>
          Save record
        </button>
        <button
          className="secondary"
          type="button"
          disabled={busy}
          onClick={cancel}
        >
          Cancel
        </button>
      </div>
      <Feedback message={error} error />
    </form>
  );
}
export function AdminDatabase() {
  const [tables, setTables] = useState([]),
    [table, setTable] = useState('users'),
    [page, setPage] = useState(0),
    [editing, setEditing] = useState(null),
    [message, setMessage] = useState('');
  const [state, reload] = useRecords(`/admin/database/${table}?page=${page}`);
  useEffect(() => {
    api('/admin/database/tables')
      .then((b) => setTables(b.data))
      .catch((e) => setMessage(e.message));
  }, []);
  const fields = state.editableFields || [];
  return (
    <section>
      <article className="card">
        <h2>Database records</h2>
        <p>
          Edit permitted fields in existing records. Use Users for role changes
          and password resets. Authentication secrets are hidden; audit and
          academic history are protected.
        </p>
        <label>
          Database table
          <select
            value={table}
            onChange={(e) => {
              setTable(e.target.value);
              setPage(0);
              setEditing(null);
              setMessage('');
            }}
          >
            {tables.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
                {t.readOnly ? ' (read-only)' : ''}
              </option>
            ))}
          </select>
        </label>
        <Feedback message={message} />
        <Feedback message={state.error} error />
        {!fields.length && !state.loading && <p>This table is read-only.</p>}
      </article>
      {state.data.map((row, index) => {
        const key = Object.fromEntries(
          (state.key || []).map((k) => [k, row[k]]),
        );
        const id = JSON.stringify(key);
        return (
          <article className="card database-record" key={id}>
            <h3>Record {page * 25 + index + 1}</h3>
            <code className="record-id">{Object.values(key).join(' · ')}</code>
            <details>
              <summary>View fields</summary>
              <pre>{JSON.stringify(row, null, 2)}</pre>
            </details>
            {editing === id ? (
              <RecordEditor
                row={row}
                fields={fields}
                cancel={() => setEditing(null)}
                save={async (changes) => {
                  const result = await send(
                    `/admin/database/${table}`,
                    { key, changes },
                    'PATCH',
                  );
                  setEditing(null);
                  setMessage(result.message);
                  reload();
                }}
              />
            ) : (
              fields.length > 0 && (
                <button className="secondary" onClick={() => setEditing(id)}>
                  Edit record
                </button>
              )
            )}
          </article>
        );
      })}
      <div className="filter-bar">
        <button
          disabled={!page}
          onClick={() => {
            setPage(page - 1);
            setEditing(null);
          }}
        >
          Previous page
        </button>
        <button
          disabled={(page + 1) * 25 >= state.total}
          onClick={() => {
            setPage(page + 1);
            setEditing(null);
          }}
        >
          Next page
        </button>
      </div>
    </section>
  );
}
