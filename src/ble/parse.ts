import type { Reading } from '../domain/types';

export function parseHeartRate(_v: DataView): number | undefined {
  return -1;
}

export function parseCyclingPower(_v: DataView): number | undefined {
  return -1;
}

export function parseIndoorBikeData(_v: DataView): Reading {
  return { powerW: -1 };
}
