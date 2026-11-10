export type Profile = {
  id: string;
  name: string;
  ftp?: number;      // watts
  maxHr?: number;    // bpm, user-measured
  legDays: number[]; // gym leg days, 0=Sun..6=Sat (Date.getDay())
};
export type Target = { kind: 'pct'; pct: number } | { kind: 'watts'; watts: number } | { kind: 'free' };
export type Segment = { label: string; durationSec: number; target: Target };
export type ModeId = 'ftp-ramp' | 'easy' | 'endurance' | 'free' | 'sweet-spot' | 'vo2';
export type Mode = {
  id: ModeId;
  name: string;
  summary: string;
  optIn: boolean; // true = locked behind readiness check
  segments: Segment[];
  ramp?: { startWatts: number; stepWatts: number; stepSec: number }; // open-ended ramp after segments
};
export type Reading = { heartRate?: number; powerW?: number; cadenceRpm?: number; speedKmh?: number };
export type SensorKind = 'hr' | 'power' | 'trainer';
