import { useState } from 'react';
import { validateProfile } from '../data/profiles';
import {
  MODES,
  READINESS_FALLBACK,
  READINESS_ITEMS,
  SAFETY_TEXT,
  ftpFromRamp,
  targetWatts,
  totalDurationSec,
} from '../domain/modes';
import Skeleton from '../components/Skeleton';
import type { Mode, Segment } from '../domain/types';
import { toUserMessage } from '../lib/errors';
import { useProfiles } from '../state/useProfiles';

function minutes(sec: number): string {
  return String(Number((sec / 60).toFixed(1)));
}

function segmentText(s: Segment, ftp: number | undefined): string {
  const base = `${s.label} · ${minutes(s.durationSec)} min`;
  if (s.target.kind === 'watts') return `${base} · ${s.target.watts} W`;
  if (ftp === undefined) return `${base} · ${s.target.pct}% FTP`;
  return `${base} · ${s.target.pct}% FTP (${targetWatts(s.target.pct, ftp)} W)`;
}

function RampResult() {
  const { active, save } = useProfiles();
  const [best, setBest] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const watts = /^\d+$/.test(best.trim()) ? Number(best.trim()) : NaN;
  const ftp = watts > 0 ? ftpFromRamp(watts) : undefined;

  if (!active) return <p className="label">Select a profile to save the result.</p>;

  async function saveFtp() {
    if (!active || ftp === undefined) return;
    const { id, ...rest } = active;
    const errs = validateProfile({ ...rest, ftp });
    setError(errs[0] ?? '');
    setSaved(false);
    if (errs.length === 0) {
      try {
        await save({ id, ...rest, ftp });
        setSaved(true);
      } catch (e) {
        setError(toUserMessage(e));
      }
    }
  }

  return (
    <div>
      <label>
        Best 1-minute power (W)
        <input inputMode="numeric" value={best} onChange={(e) => {
            setBest(e.target.value);
            setError('');
            setSaved(false);
          }} />
      </label>
      {ftp !== undefined && (
        <p>
          FTP: <strong>{ftp} W</strong>
        </p>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      {saved && <p className="label">Saved</p>}
      <button disabled={ftp === undefined} onClick={saveFtp}>Save as FTP</button>
    </div>
  );
}

function ModeCard({ mode, unlocked }: { mode: Mode; unlocked: boolean }) {
  const { active } = useProfiles();
  const ftp = active?.ftp;
  const locked = mode.optIn && !unlocked;
  const hasPct = mode.segments.some((s) => s.target.kind === 'pct');

  return (
    <li className="card">
      <h2>{mode.name}</h2>
      <p>{mode.summary}</p>
      {locked ? (
        <p className="label">Locked. Tick every item in the readiness check to unlock.</p>
      ) : (
        <>
          <p className="label">
            {mode.segments.length === 0 && !mode.ramp
              ? 'Open-ended'
              : `${minutes(totalDurationSec(mode))} min${mode.ramp ? ' + ramp' : ''}`}
          </p>
          {hasPct && ftp === undefined && <p className="label">Set FTP or run the ramp test</p>}
          <ul className="segments">
            {mode.segments.map((s, i) => (
              <li key={i}>{segmentText(s, ftp)}</li>
            ))}
            {mode.ramp && (
              <li>
                then +{mode.ramp.stepWatts} W every {mode.ramp.stepSec} s from {mode.ramp.startWatts} W
              </li>
            )}
          </ul>
          {mode.id === 'ftp-ramp' && <RampResult />}
        </>
      )}
    </li>
  );
}

export default function Modes() {
  const { loaded } = useProfiles();
  const [ticked, setTicked] = useState<boolean[]>(() => READINESS_ITEMS.map(() => false));
  const unlocked = ticked.every(Boolean);

  if (!loaded) {
    return (
      <>
        <h1>Modes</h1>
        <Skeleton />
      </>
    );
  }

  return (
    <>
      <h1>Modes</h1>
      <p className="safety">{SAFETY_TEXT}</p>
      <section className="card">
        <h2>Readiness check</h2>
        <p className="label">Needed for the locked modes.</p>
        {READINESS_ITEMS.map((item, i) => (
          <label key={item} className="check">
            <input
              type="checkbox"
              checked={ticked[i] ?? false}
              onChange={() => setTicked((t) => t.map((v, j) => (j === i ? !v : v)))}
            />
            {item}
          </label>
        ))}
        {!unlocked && <p className="error">{READINESS_FALLBACK}</p>}
      </section>
      <ul className="list">
        {MODES.map((m) => (
          <ModeCard key={m.id} mode={m} unlocked={unlocked} />
        ))}
      </ul>
    </>
  );
}
