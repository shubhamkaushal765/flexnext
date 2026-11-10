import type { Reading } from '../domain/types';

export function parseHeartRate(v: DataView): number | undefined {
  if (v.byteLength < 2) return undefined;
  const wide = (v.getUint8(0) & 1) === 1;
  if (wide && v.byteLength < 3) return undefined;
  const hr = wide ? v.getUint16(1, true) : v.getUint8(1);
  return hr > 0 && hr <= 250 ? hr : undefined;
}

export function parseCyclingPower(v: DataView): number | undefined {
  if (v.byteLength < 4) return undefined;
  return Math.max(0, v.getInt16(2, true));
}

export function parseIndoorBikeData(v: DataView): Reading {
  const r: Reading = {};
  if (v.byteLength < 2) return r;
  const flags = v.getUint16(0, true);
  let o = 2;
  // Walk the fields in spec order; stop at the first one that is cut off.
  const has = (bit: number) => (flags & (1 << bit)) !== 0;
  const fits = (size: number) => o + size <= v.byteLength;

  if (!has(0)) {
    if (!fits(2)) return r;
    r.speedKmh = v.getUint16(o, true) / 100;
    o += 2;
  }
  if (has(1)) o += 2;
  if (has(2)) {
    if (!fits(2)) return r;
    r.cadenceRpm = v.getUint16(o, true) / 2;
    o += 2;
  }
  if (has(3)) o += 2;
  if (has(4)) o += 3;
  if (has(5)) o += 2;
  if (has(6)) {
    if (!fits(2)) return r;
    r.powerW = Math.max(0, v.getInt16(o, true));
    o += 2;
  }
  if (has(7)) o += 2;
  if (has(8)) o += 5;
  if (has(9)) {
    if (!fits(1)) return r;
    const hr = v.getUint8(o);
    if (hr > 0 && hr <= 250) r.heartRate = hr;
  }
  return r;
}
