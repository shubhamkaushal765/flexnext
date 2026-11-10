import type { Mode, ModeId, Profile, Segment } from './types';

export const SAFETY_TEXT =
  'Stop and see a doctor if you get chest pain, dizziness, fainting or unusual breathlessness.';

export const READINESS_ITEMS: string[] = [
  'No chest pain, dizziness or fainting during exercise',
  'No known heart condition',
  'Not on medication that changes heart rate (for example beta-blockers)',
  'Slept well and feel recovered',
  'No gym leg day today or yesterday',
  'No doctor has told you to exercise only under medical supervision',
];

export const READINESS_FALLBACK =
  'If any of these is not true, stick to Easy Spin or Endurance and see a doctor first.';

const pct = (label: string, durationSec: number, p: number): Segment => ({
  label,
  durationSec,
  target: { kind: 'pct', pct: p },
});

const vo2Intervals: Segment[] = [];
for (let i = 0; i < 5; i++) {
  vo2Intervals.push(pct('VO2', 180, 110), pct('Recover', 180, 45));
}

export const MODES: Mode[] = [
  {
    id: 'ftp-ramp',
    name: 'FTP Ramp Test',
    summary:
      'Maximal effort test. Stop when you cannot hold the target, and stop immediately at any symptom. FTP = 75% of best 1-minute power.',
    optIn: true,
    segments: [{ label: 'Warm-up', durationSec: 300, target: { kind: 'watts', watts: 75 } }],
    ramp: { startWatts: 100, stepWatts: 20, stepSec: 60 },
  },
  {
    id: 'easy',
    name: 'Easy Spin',
    summary: 'Gentle 25 minute spin at 50% FTP.',
    optIn: false,
    segments: [pct('Spin', 1500, 50)],
  },
  {
    id: 'endurance',
    name: 'Endurance',
    summary: 'Steady aerobic ride: 10 minute warm-up, 40 minutes at 65% FTP, 5 minute cool-down.',
    optIn: false,
    segments: [pct('Warm-up', 600, 50), pct('Endurance', 2400, 65), pct('Cool-down', 300, 45)],
  },
  {
    id: 'free',
    name: 'Free Ride',
    summary: 'Open-ended ride with no targets. Records only.',
    optIn: false,
    segments: [],
  },
  {
    id: 'sweet-spot',
    name: 'Sweet Spot',
    summary: 'Three 10 minute blocks at 90% FTP with 5 minute recoveries.',
    optIn: true,
    segments: [
      pct('Warm-up', 600, 50),
      pct('SS', 600, 90),
      pct('Recover', 300, 50),
      pct('SS', 600, 90),
      pct('Recover', 300, 50),
      pct('SS', 600, 90),
      pct('Cool-down', 600, 45),
    ],
  },
  {
    id: 'vo2',
    name: 'VO2 Intervals',
    summary: 'Five hard 3 minute intervals at 110% FTP, each followed by 3 minutes easy.',
    optIn: true,
    segments: [pct('Warm-up', 900, 50), ...vo2Intervals, pct('Cool-down', 600, 45)],
  },
];

export function targetWatts(p: number, ftp: number): number {
  return Math.round((ftp * p) / 100);
}

export function ftpFromRamp(best1MinWatts: number): number {
  return Math.round(0.75 * best1MinWatts);
}

export function suggestedMode(profile: Profile, today: Date): ModeId {
  const t = today.getDay();
  const y = (t + 6) % 7;
  if (profile.legDays.includes(t) || profile.legDays.includes(y)) return 'easy';
  return profile.ftp === undefined ? 'easy' : 'endurance';
}

export function totalDurationSec(mode: Mode): number {
  return mode.segments.reduce((sum, s) => sum + s.durationSec, 0);
}
