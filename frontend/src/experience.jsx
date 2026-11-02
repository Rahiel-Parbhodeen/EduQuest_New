const YEAR_MODULES = {1:['Information systems','Maths','Programming','Web Technology','Networks'],2:['Programming','Database Systems','Information systems','Cloud computing','Networks'],3:['Programming','Mobile app development','Operating systems','Human Computer Interaction','Artificial Intelligence']};
import { moduleLabel } from './module-label.js';
import React, { useState, useEffect } from 'react';
const api = async (path, options = {}) => {
  const r = await fetch('/api/v1' + path, {
    credentials: 'include',
    ...options,
    headers: { 'content-type': 'application/json', ...options.headers },
  });
  const b = r.status === 204 ? {} : await r.json();
  if (!r.ok) throw Error(b.error?.message || 'Request failed.');
  return b;
};
const send = (path, data, method = 'POST') =>
  api(path, { method, body: JSON.stringify(data) });
const nameValid = (v) =>
  /^\p{L}[\p{L}\p{M}'’-]*(?:\s+\p{L}[\p{L}\p{M}'’-]*)+$/u.test(v.trim());
const passwordValid = (v) =>
  v.length >= 12 &&
  v.length <= 72 &&
  /[a-z]/.test(v) &&
  /[A-Z]/.test(v) &&
  /\d/.test(v) &&
  /[^A-Za-z0-9\s]/.test(v);
export function Fields({ form, setForm }) {
  return (
    <>
      <label>
        First and last name
        <input
          autoComplete="name"
          maxLength={120}
          required
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
        />
        <small>
          Letters, spaces, hyphens and apostrophes. Include your surname.
        </small>
      </label>
      <label>
        Study programme
        <select
          value={form.studyTrack}
          onChange={(e) => setForm({ ...form, studyTrack: e.target.value })}
        >
          <option>IT</option>
          <option>Business</option>
        </select>
      </label>
      <label>
        Year of study
        <select
          value={form.studyYear}
          onChange={(e) =>
            setForm({ ...form, studyYear: Number(e.target.value) })
          }
        >
          {[1, 2, 3].map((y) => (
            <option key={y} value={y}>
              Year {y}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
export function NewAuth({ onLogin, notice = '' }) {
  const [showPasswords, setShowPasswords] = useState(false);
  const [mode, setMode] = useState('login'),
    [form, setForm] = useState({
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      studyTrack: 'IT',
      studyYear: 1,
    }),
    [error, setError] = useState(''),
    [challenge, setChallenge] = useState(''),
    [code, setCode] = useState(''),
    [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (challenge) {
        onLogin((await send('/auth/mfa/verify', { challenge, code })).user);
        return;
      }
      if (mode === 'register') {
        if (!nameValid(form.fullName))
          throw Error('Enter your first and last name without numbers.');
        if (!passwordValid(form.password))
          throw Error(
            'Use 12–72 characters with uppercase, lowercase, a number and a special character.',
          );
        if (form.password !== form.confirmPassword)
          throw Error('Passwords must match.');
      }
      const b = await send(
        '/auth/' + mode,
        mode === 'register'
          ? form
          : { email: form.email, password: form.password },
      );
      if (b.mfaRequired) setChallenge(b.challenge);
      else onLogin(b.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="auth-page">
      <section className="auth-intro">
        <span className="intro-label">LEARN. PRACTISE. GROW TOGETHER.</span>
        <h2>
          Your next
          <br />
          lightbulb moment
          <br />
          <em>starts here.</em>
        </h2>
        <p>
          Discover your modules, find your study group and make revision your
          own.
        </p>
      </section>
      <form className="card auth-card" onSubmit={submit}>
        <span className="eyebrow">EDUQUEST</span>
        {notice && <p role="status">{notice}</p>}
        <h1>
          {challenge
            ? 'Verify your sign-in'
            : mode === 'register'
              ? 'Create your account'
              : 'Welcome back'}
        </h1>
        {challenge ? (
          <label>
            Authenticator code
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <small>Use the six-digit code from your authenticator app.</small>
          </label>
        ) : (
          <>
            {mode === 'register' && <Fields form={form} setForm={setForm} />}
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label>
              Password
              <input
                type={showPasswords ? "text" : "password"}
                autoComplete={
                  mode === 'register' ? 'new-password' : 'current-password'
                }
                required
                maxLength={72}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>
              <button type="button" aria-pressed={showPasswords} onClick={() => setShowPasswords(!showPasswords)}>{showPasswords ? "Hide passwords" : "Show passwords"}</button>
            {mode === 'register' && (
              <>
                <small>
                  12–72 characters, uppercase, lowercase, number and special
                  character.
                </small>
                <label>
                  Confirm password
                  <input
                    type={showPasswords ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={form.confirmPassword}
                    onChange={(e) =>
                      setForm({ ...form, confirmPassword: e.target.value })
                    }
                  />
                </label>
              </>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy}>
          {busy
            ? 'Please wait…'
            : challenge
              ? 'Verify'
              : mode === 'register'
                ? 'Register'
                : 'Log in'}
        </button>
        <button
          type="button"
          className="link-button"
          onClick={() => {
            setChallenge('');
            setMode(mode === 'register' ? 'login' : 'register');
            setError('');
          }}
        >
          {challenge
            ? 'Start again'
            : mode === 'register'
              ? 'I already have an account'
              : 'Create an account'}
        </button>
      </form>
    </main>
  );
}
export function PasswordChange() {
  const [fields, setFields] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState({ kind: '', message: '' });
  const change = (field, value) => {
    setFields((previous) => ({ ...previous, [field]: value }));
    setFeedback({ kind: '', message: '' });
  };
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setFeedback({ kind: '', message: '' });
    if (!fields.currentPassword) {
      setFeedback({ kind: 'error', message: 'Enter your current password.' });
      return;
    }
    if (fields.newPassword !== fields.confirmNewPassword) {
      setFeedback({ kind: 'error', message: 'New passwords do not match.' });
      return;
    }
    if (!passwordValid(fields.newPassword)) {
      setFeedback({
        kind: 'error',
        message:
          'Use 12–72 characters including uppercase, lowercase, a number and a special character.',
      });
      return;
    }
    if (fields.currentPassword === fields.newPassword) {
      setFeedback({
        kind: 'error',
        message:
          'Choose a new password that is different from your current password.',
      });
      return;
    }
    setBusy(true);
    try {
      const body = await send('/profile/password', fields, 'PUT');
      setFields({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
      setFeedback({
        kind: 'success',
        message: body.message || 'Password changed successfully.',
      });
    } catch (error) {
      setFeedback({ kind: 'error', message: error.message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="card password-change" onSubmit={submit}>
      <h2>Change password</h2>
      <label>
        Current password
        <input
          type="password"
          autoComplete="current-password"
          required
          maxLength={200}
          value={fields.currentPassword}
          onChange={(e) => change('currentPassword', e.target.value)}
        />
      </label>
      <label>
        New password
        <input
          type="password"
          autoComplete="new-password"
          required
          maxLength={72}
          value={fields.newPassword}
          onChange={(e) => change('newPassword', e.target.value)}
        />
      </label>
      <small>
        Use 12–72 characters with uppercase, lowercase, a number and a special
        character.
      </small>
      <label>
        Confirm new password
        <input
          type="password"
          autoComplete="new-password"
          required
          maxLength={72}
          value={fields.confirmNewPassword}
          onChange={(e) => change('confirmNewPassword', e.target.value)}
        />
      </label>
      <button className="primary" disabled={busy}>
        {busy ? 'Changing password…' : 'Change password'}
      </button>
      {feedback.message && (
        <p
          role={feedback.kind === 'error' ? 'alert' : 'status'}
          className={feedback.kind === 'error' ? 'field-error' : 'success'}
        >
          {feedback.message}
        </p>
      )}
    </form>
  );
}
export function Profile({ user, onUpdate }) {
  const [form, setForm] = useState({
      fullName: user.full_name || user.fullName || '',
      studyTrack: user.study_track || 'IT',
      studyYear: user.study_year || 1,
    }),
    [message, setMessage] = useState(''),
    [setup, setSetup] = useState(null),
    [code, setCode] = useState(''),
    [enabled, setEnabled] = useState(user.mfa_enabled || false);
  return (
    <section className="grid">
      <form
        className="card"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            if (!nameValid(form.fullName))
              throw Error('Enter your first and last name without numbers.');
            onUpdate((await send('/profile', form, 'PUT')).user);
            setMessage(
              'Profile saved. Your current-year curriculum is now available.',
            );
          } catch (e) {
            setMessage(e.message);
          }
        }}
      >
        <h2>Edit profile</h2>
        <p>{user.email}</p>
        <Fields form={form} setForm={setForm} />
        <button className="primary">Save profile</button>
        <p role="status">{message}</p>
      </form>
      <PasswordChange />
      <div className="card">
        <h2>Multifactor authentication</h2>
        <p>
          Protect sign-in with an authenticator app, such as Microsoft
          Authenticator, Google Authenticator or 1Password.
        </p>
        {enabled ? (
          <p className="success">Authenticator MFA is enabled.</p>
        ) : (
          <>
            <button
              className="secondary"
              onClick={async () => {
                try {
                  setSetup(await send('/auth/mfa/setup', {}));
                } catch (e) {
                  setMessage(e.message);
                }
              }}
            >
              Set up authenticator
            </button>
            {setup && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await send('/auth/mfa/enable', { code });
                    setEnabled(true);
                    setSetup(null);
                    setMessage(
                      'MFA enabled. Use a fresh code on your next sign-in.',
                    );
                  } catch (e) {
                    setMessage(e.message);
                  }
                }}
              >
                <p>
                  Add a new time-based account in your authenticator using this
                  setup key. Keep the key somewhere safe for recovery.
                </p>
                <code className="setup-key">{setup.secret}</code>
                <label>
                  Six-digit code
                  <input
                    required
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </label>
                <button className="primary">Confirm and enable MFA</button>
              </form>
            )}
          </>
        )}
      </div>
    </section>
  );
}
export function Curriculum({ user }) {
  const [data, setData] = useState([]),
    [enrolled, setEnrolled] = useState([]),
    [year, setYear] = useState(user.study_year || 1),
    [message, setMessage] = useState(''),
    [revision, setRevision] = useState(0),
    [form, setForm] = useState({
      moduleCode: '',
      moduleName: '',
      studyTrack: 'IT',
      studyYear: 1,
    });
  useEffect(() => {
    Promise.all([api('/modules'), api('/curriculum')])
      .then(([m, c]) => {
        setEnrolled(m.data);
        setData(c.data);
      })
      .catch((e) => setMessage(e.message));
  }, [revision]);
  const current = user.study_year || 1;
  return (
    <section className="grid">
      {user.role === "student" && <article className="card"><h2>Richfield</h2><a href="https://www.richfield.ac.za/" target="_blank" rel="noopener noreferrer">Visit the official Richfield website</a></article>}
      <article className="card">
        <h2>
          {user.role === 'student' ? 'Your modules' : 'Your teaching modules'}
        </h2>
        <div className="module-tiles">
          {(enrolled
          ).map((m) => (
            <article className="module-tile" key={m.module_id}>
              
              <h3>{m.module_name}</h3>
              <p>
                {m.study_track || 'General'} · Year {m.study_year || 1}
              </p>
            </article>
          ))}
        </div>
        {user.role === 'student' &&
          !(
            year === current
              ? enrolled
              : data.filter((m) => m.study_year === year)
          ).length && (
            <p>
              No modules have been configured for this year. Ask your lecturer
              to configure your programme and year in the curriculum.
            </p>
          )}
        <p role="status">{message}</p>
      </article>
      {user.role === 'lecturer' && (
        <form
          className="card"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await send('/curriculum', form);
              setRevision(revision + 1);
              setMessage(
                'Curriculum module created and current-year students enrolled.',
              );
            } catch (e) {
              setMessage(e.message);
            }
          }}
        >
          <h2>Configure curriculum</h2>
          <p>Add official modules for each programme and year.</p>
          <label>Module name<select required value={form.moduleName} onChange={e => setForm({...form, moduleName:e.target.value})}><option value="">Choose module</option>{(YEAR_MODULES[form.studyYear] || []).map(name => <option key={name}>{name}</option>)}</select></label>
          <label>
            Programme
            <select
              value={form.studyTrack}
              onChange={(e) => setForm({ ...form, studyTrack: e.target.value })}
            >
              <option>IT</option>
              <option>Business</option>
            </select>
          </label>
          <label>
            Year
            <select
              value={form.studyYear}
              onChange={(e) =>
                setForm({ ...form, studyYear: Number(e.target.value), moduleName: '' })
              }
            >
              {[1, 2, 3].map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
          <button className="primary">Add module</button>
        </form>
      )}
    </section>
  );
}
export function StudyGroups({ user }) {
  const [groups, setGroups] = useState([]),
    [modules, setModules] = useState([]),
    [language, setLanguage] = useState(''),
    [track, setTrack] = useState('recommended'),
    [message, setMessage] = useState(''),
    [revision, setRevision] = useState(0),
    [form, setForm] = useState({
      moduleId: '',
      groupName: '',
      language: 'English',
      currentActivity: '',
      meetingAt: '',
      meetingDetails: '',
    }),
    [editing, setEditing] = useState(null);
  useEffect(() => {
    Promise.all([api('/study-groups'), api('/modules')])
      .then(([g, m]) => {
        setGroups(g.data);
        setModules(m.data);
      })
      .catch((e) => setMessage(e.message));
  }, [revision]);
  const visible = groups.filter(
    (g) =>
      (!language || g.language === language) &&
      (track !== 'recommended' ||
        !user.study_track ||
        g.study_track === user.study_track),
  );
  const save = async (e) => {
    e.preventDefault();
    try {
      if (!form.meetingAt || new Date(form.meetingAt).getTime() <= Date.now()) throw new Error('Choose a future meeting date and time.');
      let id = editing;
      if (!id)
        id = (
          await send('/modules/' + form.moduleId + '/groups', {
            groupName: form.groupName,
          })
        ).group.group_id;
      await send(
        '/study-groups/' + id,
        {
          language: form.language,
          currentActivity: form.currentActivity,
          meetingAt: new Date(form.meetingAt).toISOString(),
          meetingDetails: form.meetingDetails,
        },
        'PUT',
      );
      setEditing(null);
      setRevision(revision + 1);
      setMessage('Group saved.');
      setForm({
        moduleId: '',
        groupName: '',
        language: 'English',
        currentActivity: '',
        meetingAt: '',
        meetingDetails: '',
      });
    } catch (e) {
      setMessage(e.message);
    }
  };
  return (
    <section>
      <div className="card">
        <h2>Find your study group</h2>
        <p>
          Groups are recommended using your programme. Only groups in modules
          you can access are shown.
        </p>
        <div className="filter-bar">
          <label>
            Language
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="">All languages</option>
              {["English", "Afrikaans", "Zulu"].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <label>
            Programme
            <select value={track} onChange={(e) => setTrack(e.target.value)}>
              <option value="recommended">Recommended for me</option>
              <option value="all">All my modules</option>
            </select>
          </label>
        </div>
        <p role="status">{message}</p>
      </div>
      <div className="module-tiles">
        {visible.map((g) => (
          <article className="card" key={g.group_id}>
            <span className="eyebrow">
              {g.module_name} · {g.language}
            </span>
            <h3>{g.group_name}</h3>
            <p>
              <b>Leader:</b> {g.leader_name}
            </p>
            <p>
              <b>Currently:</b> {g.current_activity}
            </p>
            <p>
              <b>Date and time:</b> {g.meeting_at ? new Date(g.meeting_at).toLocaleString() : "Not scheduled"}
            </p>
            <p>
              <b>Meetings:</b> {g.meeting_details}
            </p>
            {!g.joined && user.role === 'student' && (
              <button
                className="primary"
                onClick={async () => {
                  try {
                    await send('/groups/' + g.group_id + '/join', {});
                    setRevision(revision + 1);
                  } catch (e) {
                    setMessage(e.message);
                  }
                }}
              >
                Join group
              </button>
            )}
            {g.joined && <span>Joined</span>}
            {g.created_by === (user.userId || user.user_id) && (
              <button
                className="secondary"
                onClick={() => {
                  setEditing(g.group_id);
                  setForm({
                    moduleId: g.module_id,
                    groupName: g.group_name,
                    language: g.language,
                    currentActivity: g.current_activity,
                    meetingAt: g.meeting_at ? new Date(new Date(g.meeting_at).getTime() - new Date(g.meeting_at).getTimezoneOffset()*60000).toISOString().slice(0,16) : '',
                    meetingDetails: g.meeting_details,
                  });
                }}
              >
                Edit group activity
              </button>
            )}
          </article>
        ))}
      </div>
      {!visible.length && (
        <p className="empty-state">
          No matching groups yet. Change the filters or start a group.
        </p>
      )}
      <form className="card" onSubmit={save}>
        <h2>{editing ? 'Update your group' : 'Start a study group'}</h2>
        {!editing && (
          <>
            <label>
              Module
              <select
                required
                value={form.moduleId}
                onChange={(e) => setForm({ ...form, moduleId: e.target.value })}
              >
                <option value="">Choose module</option>
                {modules.map((m) => (
                  <option key={m.module_id} value={m.module_id}>
                    {moduleLabel(m)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Group name
              <input
                required
                maxLength={120}
                value={form.groupName}
                onChange={(e) =>
                  setForm({ ...form, groupName: e.target.value })
                }
              />
            </label>
          </>
        )}
        <label>
          Language
          <select value={form.language} onChange={e => setForm({...form,language:e.target.value})}>{['English','Afrikaans','Zulu'].map(l => <option key={l}>{l}</option>)}</select>
        </label>
        <label>
          What are you doing now?
          <textarea
            required
            maxLength={500}
            value={form.currentActivity}
            onChange={(e) =>
              setForm({ ...form, currentActivity: e.target.value })
            }
          />
        </label>
        <label>Meeting date and time<input type="datetime-local" required min={new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16)} value={form.meetingAt} onChange={e => setForm({...form,meetingAt:e.target.value})}/></label>
        <label>
          When and where do you meet?
          <input
            required
            maxLength={300}
            value={form.meetingDetails}
            onChange={(e) =>
              setForm({ ...form, meetingDetails: e.target.value })
            }
          />
        </label>
        <p>The creator is the group leader and can update the activities.</p>
        <button className="primary">Save group</button>
        {editing && (
          <button type="button" onClick={() => setEditing(null)}>
            Cancel edit
          </button>
        )}
      </form>
    </section>
  );
}
export function CodeLab() {
  const [html, setHtml] = useState(
      '<h1 id="message">Hello, student!</h1>\n<button onclick="changeMessage()">Change message</button>',
    ),
    [css, setCss] = useState(
      'body { font-family: sans-serif; padding: 24px; }\nh1 { color: #34644e; }',
    ),
    [js, setJs] = useState(
      'function changeMessage() {\n  document.getElementById("message").textContent = "You changed the page!";\n}',
    ),
    [source, setSource] = useState(''),
    [baseline, setBaseline] = useState(null);
  const run = () =>
    setSource(
      "<!doctype html><meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none';\"><style>" +
        css +
        '</style>' +
        html +
        '<script>' +
        js +
        '</script>',
    );
  const snapshot = () => setBaseline({ html, css, js });
  return (
    <section className="card code-lab">
      <h2>Try it: code and see what changes</h2>
      <p>
        HTML, CSS and JavaScript run in an isolated preview. Other languages can
        be studied as text but are not executed.
      </p>
      <div className="code-editors">
        {[
          ['HTML', html, setHtml],
          ['CSS', css, setCss],
          ['JavaScript', js, setJs],
        ].map(([label, value, set]) => (
          <label key={label}>
            {label}
            <textarea
              spellCheck={false}
              rows={8}
              maxLength={20000}
              value={value}
              onChange={(e) => set(e.target.value)}
            />
          </label>
        ))}
      </div>
      <div className="filter-bar">
        <button className="primary" onClick={run}>
          Run code
        </button>
        <button className="secondary" onClick={snapshot}>
          Save comparison point
        </button>
      </div>
      {baseline && (
        <details open>
          <summary>Changed lines since comparison point</summary>
          {[
            ['HTML', html, baseline.html],
            ['CSS', css, baseline.css],
            ['JavaScript', js, baseline.js],
          ].map(([label, now, before]) => (
            <div key={label}>
              <h4>{label}</h4>
              <pre>
                {Array.from(
                  {
                    length: Math.max(
                      now.split('\n').length,
                      before.split('\n').length,
                    ),
                  },
                  (_, i) => {
                    const a = before.split('\n')[i],
                      b = now.split('\n')[i];
                    return a === b
                      ? null
                      : `Line ${i + 1}\n− ${a ?? ''}\n+ ${b ?? ''}`;
                  },
                )
                  .filter(Boolean)
                  .join('\n') || 'No changes'}
              </pre>
            </div>
          ))}
        </details>
      )}
      <iframe
        title="Live code result"
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        srcDoc={source}
      />
    </section>
  );
}
const blankQuestion = () => ({
  questionText: '',
  topic: 'General',
  marks: 1,
  difficultyLevel: 3,
  explanation: '',
  options: [
    { optionText: '', isCorrect: true },
    { optionText: '', isCorrect: false },
    { optionText: '', isCorrect: false },
    { optionText: '', isCorrect: false },
  ],
});
export function ManualQuiz({ onCreated = () => {} }) {
  const [modules, setModules] = useState([]),
    [moduleId, setModuleId] = useState(''),
    [title, setTitle] = useState(''),
    [competitive, setCompetitive] = useState(false),
    [questions, setQuestions] = useState([blankQuestion()]),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    api('/modules')
      .then((b) => setModules(b.data))
      .catch((e) => setMessage(e.message));
  }, []);
  const update = (i, patch) =>
    setQuestions(questions.map((q, n) => (n === i ? { ...q, ...patch } : q)));
  return (
    <form
      className="card"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await send('/quizzes', {
            moduleId,
            title,
            isCompetitive: competitive,
            questions: questions.map((q) => ({
              ...q,
              explanation: q.explanation || null,
            })),
          });
          setMessage('Quiz published. Select its module below to view it.');
          setTitle('');
          setQuestions([blankQuestion()]);
          onCreated();
        } catch (e) {
          setMessage(e.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Create a quiz manually</h2>
      <label>
        Module
        <select
          required
          value={moduleId}
          onChange={(e) => setModuleId(e.target.value)}
        >
          <option value="">Choose module</option>
          {modules.map((m) => (
            <option key={m.module_id} value={m.module_id}>
              {moduleLabel(m)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Quiz title
        <input
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={competitive}
          onChange={(e) => setCompetitive(e.target.checked)}
        />
        Competitive: one scored attempt
      </label>
      {questions.map((q, i) => (
        <fieldset key={i}>
          <legend>Question {i + 1}</legend>
          <label>
            Question or code snippet
            <textarea
              required
              value={q.questionText}
              onChange={(e) => update(i, { questionText: e.target.value })}
            />
          </label>
          <label>
            Topic
            <input
              required
              value={q.topic}
              onChange={(e) => update(i, { topic: e.target.value })}
            />
          </label>
          <div className="filter-bar">
            <label>
              Marks
              <input
                type="number"
                min={1}
                max={100}
                required
                value={q.marks}
                onChange={(e) => update(i, { marks: Number(e.target.value) })}
              />
            </label>
            <label>
              Difficulty
              <select
                value={q.difficultyLevel}
                onChange={(e) =>
                  update(i, { difficultyLevel: Number(e.target.value) })
                }
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
          </div>
          {q.options.map((o, n) => (
            <div className="answer-editor" key={n}>
              <label>
                <input
                  type="radio"
                  name={'correct-' + i}
                  checked={o.isCorrect}
                  onChange={() =>
                    update(i, {
                      options: q.options.map((a, k) => ({
                        ...a,
                        isCorrect: k === n,
                      })),
                    })
                  }
                />
                Correct
              </label>
              <label>
                Option {n + 1}
                <input
                  required
                  value={o.optionText}
                  onChange={(e) =>
                    update(i, {
                      options: q.options.map((a, k) =>
                        k === n ? { ...a, optionText: e.target.value } : a,
                      ),
                    })
                  }
                />
              </label>
            </div>
          ))}
          <label>
            Explanation
            <textarea
              maxLength={300}
              value={q.explanation}
              onChange={(e) => update(i, { explanation: e.target.value })}
            />
          </label>
          {questions.length > 1 && (
            <button
              type="button"
              onClick={() => setQuestions(questions.filter((_, n) => n !== i))}
            >
              Remove question
            </button>
          )}
        </fieldset>
      ))}
      <button
        type="button"
        className="secondary"
        onClick={() => setQuestions([...questions, blankQuestion()])}
      >
        Add question
      </button>
      <button className="primary" disabled={busy}>
        {busy ? 'Saving…' : 'Publish manual quiz'}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
