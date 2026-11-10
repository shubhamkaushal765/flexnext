import type { Mode, ModeId, Profile } from './types';

export const SAFETY_TEXT = '';
export const READINESS_ITEMS: string[] = [];
export const READINESS_FALLBACK = '';
export const MODES: Mode[] = [];

export function targetWatts(_pct: number, _ftp: number): number {
  return 0;
}

export function ftpFromRamp(_best1MinWatts: number): number {
  return 0;
}

export function suggestedMode(_profile: Profile, _today: Date): ModeId {
  return 'free';
}

export function totalDurationSec(_mode: Mode): number {
  return -1;
}
