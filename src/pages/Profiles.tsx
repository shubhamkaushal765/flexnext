import { useState } from 'react';
import type { FormEvent } from 'react';
import { validateProfile } from '../data/profiles';
import type { ProfileDraft, ProfileInput } from '../data/profiles';
import type { Profile } from '../domain/types';
import Skeleton from '../components/Skeleton';
import { toUserMessage } from '../lib/errors';
import { useProfiles } from '../state/useProfiles';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type Form = { id: string | null; name: string; ftp: string; maxHr: string; legDays: number[] };

const emptyForm: Form = { id: null, name: '', ftp: '', maxHr: '', legDays: [] };

function toNumber(s: string): number | undefined {
  const t = s.trim();
  if (t === '') return undefined;
  return /^\d+$/.test(t) ? Number(t) : NaN;
}

export default function Profiles() {
  const { loaded, profiles, active, error, save, remove, setActive } = useProfiles();
  const [form, setForm] = useState<Form | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  function edit(p: Profile) {
    setErrors([]);
    setForm({
      id: p.id,
      name: p.name,
      ftp: p.ftp === undefined ? '' : String(p.ftp),
      maxHr: p.maxHr === undefined ? '' : String(p.maxHr),
      legDays: p.legDays,
    });
  }

  function toggleDay(d: number) {
    setForm((f) =>
      f && {
        ...f,
        legDays: f.legDays.includes(d) ? f.legDays.filter((x) => x !== d) : [...f.legDays, d].sort((a, b) => a - b),
      },
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form || saving) return;
    const input: ProfileInput = {
      name: form.name.trim(),
      ftp: toNumber(form.ftp),
      maxHr: toNumber(form.maxHr),
      legDays: form.legDays,
    };
    const errs = validateProfile(input);
    setErrors(errs);
    if (errs.length > 0) return;
    const id = form.id ?? crypto.randomUUID();
    setSaving(true);
    setActionError(null);
    try {
      const draft: ProfileDraft = { id, ...input };
      await save(draft);
      if (!active) await setActive(id);
      setForm(null);
    } catch (err) {
      setActionError(toUserMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function del(p: Profile) {
    if (!window.confirm('Deletes this profile and its data from this phone.')) return;
    setActionError(null);
    try {
      await remove(p.id);
    } catch (err) {
      setActionError(toUserMessage(err));
    }
  }

  async function use(id: string) {
    setActionError(null);
    try {
      await setActive(id);
    } catch (err) {
      setActionError(toUserMessage(err));
    }
  }

  if (!loaded) {
    return (
      <>
        <h1>Profiles</h1>
        <Skeleton />
      </>
    );
  }

  return (
    <>
      <h1>Profiles</h1>
      {(error ?? actionError) && <p className="error" role="alert">{actionError ?? error}</p>}
      <ul className="list">
        {profiles.map((p) => (
          <li key={p.id} className="card">
            <p className="big-text">
              {p.name}
              {active?.id === p.id && ' (active)'}
            </p>
            <p className="label">
              FTP {p.ftp ?? '-'} W · Max HR {p.maxHr ?? '-'} bpm
            </p>
            <div className="row">
              {active?.id !== p.id && <button onClick={() => use(p.id)}>Use</button>}
              <button onClick={() => edit(p)}>Edit</button>
              <button className="danger" onClick={() => del(p)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>

      {form ? (
        <form className="card" onSubmit={submit}>
          <h2>{form.id ? 'Edit profile' : 'New profile'}</h2>
          <label>
            Name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            FTP (W)
            <input
              inputMode="numeric"
              value={form.ftp}
              onChange={(e) => setForm({ ...form, ftp: e.target.value })}
            />
          </label>
          <label>
            Max HR (bpm)
            <input
              inputMode="numeric"
              value={form.maxHr}
              onChange={(e) => setForm({ ...form, maxHr: e.target.value })}
            />
          </label>
          <fieldset>
            <legend>Gym leg days</legend>
            <div className="row">
              {DAYS.map((label, d) => (
                <button
                  type="button"
                  key={label}
                  className={form.legDays.includes(d) ? 'toggle on' : 'toggle'}
                  aria-pressed={form.legDays.includes(d)}
                  onClick={() => toggleDay(d)}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          {errors.map((m) => (
            <p key={m} className="error">{m}</p>
          ))}
          <div className="row">
            <button type="submit" disabled={saving}>Save</button>
            <button type="button" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => {
            setErrors([]);
            setForm(emptyForm);
          }}
        >
          Add profile
        </button>
      )}
    </>
  );
}
