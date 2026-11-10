import { describe, it, expect } from 'vitest';
import {
  MODES,
  SAFETY_TEXT,
  READINESS_ITEMS,
  READINESS_FALLBACK,
  targetWatts,
  ftpFromRamp,
  suggestedMode,
  totalDurationSec,
} from './modes';
import type { Mode, ModeId, Profile } from './types';
import { EPOCH } from '../data/profiles';

const byId = (id: ModeId): Mode => {
  return (
    MODES.find((x) => x.id === id) ?? { id, name: '', summary: '', optIn: false, segments: [] }
  );
};

// November 2026: the 1st is a Sunday, so day d has getDay() === (d - 1) % 7.
const day = (d: number): Date => new Date(2026, 10, d);

describe('MODES', () => {
  it('lists ids in order', () => {
    expect(MODES.map((m) => m.id)).toEqual(['ftp-ramp', 'easy', 'endurance', 'free', 'sweet-spot', 'vo2']);
  });

  it('flags opt-in modes', () => {
    const flags = Object.fromEntries(MODES.map((m) => [m.id, m.optIn]));
    expect(flags).toEqual({
      'ftp-ramp': true,
      'sweet-spot': true,
      vo2: true,
      easy: false,
      endurance: false,
      free: false,
    });
  });

  it('has sane segments', () => {
    expect(MODES.length).toBeGreaterThan(0);
    for (const m of MODES) {
      for (const s of m.segments) {
        expect(s.durationSec).toBeGreaterThan(0);
        if (s.target.kind === 'pct') {
          expect(s.target.pct).toBeGreaterThan(0);
          expect(s.target.pct).toBeLessThanOrEqual(120);
        }
      }
    }
  });

  it('computes total durations', () => {
    expect(totalDurationSec(byId('easy'))).toBe(1500);
    expect(totalDurationSec(byId('endurance'))).toBe(3300);
    expect(totalDurationSec(byId('sweet-spot'))).toBe(3600);
    expect(totalDurationSec(byId('vo2'))).toBe(900 + 5 * 360 + 600);
    expect(totalDurationSec(byId('vo2'))).toBe(3300);
    expect(totalDurationSec(byId('free'))).toBe(0);
  });

  it('puts a recovery after every vo2 interval including the last', () => {
    const segs = byId('vo2').segments;
    const idx = segs.map((s, i) => (s.label === 'VO2' ? i : -1)).filter((i) => i >= 0);
    expect(idx.length).toBe(5);
    for (const i of idx) {
      expect(segs[i + 1]?.label).toBe('Recover');
    }
    expect(segs[segs.length - 1]?.label).toBe('Cool-down');
  });

  it('defines the ftp-ramp', () => {
    const m = byId('ftp-ramp');
    expect(m.ramp).toEqual({ startWatts: 100, stepWatts: 20, stepSec: 60 });
    expect(m.segments[0]?.target).toEqual({ kind: 'watts', watts: 75 });
    expect(m.summary).toContain('symptom');
    expect(m.summary).toContain('75%');
  });
});

describe('safety copy', () => {
  it('has the exact safety text', () => {
    expect(SAFETY_TEXT).toBe(
      'Stop and see a doctor if you get chest pain, dizziness, fainting or unusual breathlessness.',
    );
  });

  it('has six readiness items', () => {
    expect(READINESS_ITEMS).toHaveLength(6);
    expect(READINESS_ITEMS).toContain('Not on medication that changes heart rate (for example beta-blockers)');
    expect(READINESS_ITEMS).toContain('No doctor has told you to exercise only under medical supervision');
  });

  it('has the exact fallback', () => {
    expect(READINESS_FALLBACK).toBe(
      'If any of these is not true, stick to Easy Spin or Endurance and see a doctor first.',
    );
  });
});

describe('maths', () => {
  it('targetWatts rounds', () => {
    expect(targetWatts(65, 250)).toBe(163);
    expect(targetWatts(50, 200)).toBe(100);
  });

  it('ftpFromRamp is 75% rounded', () => {
    expect(ftpFromRamp(300)).toBe(225);
    expect(ftpFromRamp(333)).toBe(250);
  });
});

describe('suggestedMode', () => {
  const p = (over: Partial<Profile>): Profile => ({ id: 'a', name: 'A', legDays: [], createdAt: EPOCH, updatedAt: EPOCH, ...over });

  it('suggests easy with no ftp and no leg days', () => {
    expect(suggestedMode(p({}), day(10))).toBe('easy');
  });

  it('suggests endurance with ftp and no leg day', () => {
    expect(suggestedMode(p({ ftp: 250 }), day(10))).toBe('endurance');
  });

  it('treats a non-positive or non-finite ftp as unknown', () => {
    expect(suggestedMode(p({ ftp: 0 }), day(10))).toBe('easy');
    expect(suggestedMode(p({ ftp: NaN }), day(10))).toBe('easy');
  });

  it('suggests easy on a leg day', () => {
    const today = day(10);
    expect(suggestedMode(p({ ftp: 250, legDays: [today.getDay()] }), today)).toBe('easy');
  });

  it('suggests easy the day after a leg day', () => {
    const today = day(10);
    const yesterday = day(9);
    expect(suggestedMode(p({ ftp: 250, legDays: [yesterday.getDay()] }), today)).toBe('easy');
  });

  it('wraps Sunday to Monday', () => {
    const monday = day(2);
    expect(monday.getDay()).toBe(1);
    expect(suggestedMode(p({ ftp: 250, legDays: [0] }), monday)).toBe('easy');
  });

  it('wraps Saturday to Sunday', () => {
    const sunday = day(1);
    expect(sunday.getDay()).toBe(0);
    expect(suggestedMode(p({ ftp: 250, legDays: [6] }), sunday)).toBe('easy');
  });

  it('never suggests an opt-in mode', () => {
    for (let d = 1; d <= 7; d++) {
      const today = day(d);
      for (const ftp of [undefined, 250]) {
        for (const legDays of [[], [3], [today.getDay()]]) {
          const id = suggestedMode({ id: 'a', name: 'A', ftp, legDays, createdAt: EPOCH, updatedAt: EPOCH }, today);
          expect(MODES.map((m) => m.id)).toContain(id);
          expect(byId(id).optIn).toBe(false);
        }
      }
    }
  });
});
