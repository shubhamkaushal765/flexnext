import { describe, it, expect } from 'vitest';
import { parseHeartRate, parseCyclingPower, parseIndoorBikeData } from './parse';

const dv = (...bytes: number[]): DataView => new DataView(new Uint8Array(bytes).buffer);

describe('parseHeartRate', () => {
  it('reads u8 format', () => expect(parseHeartRate(dv(0x00, 72))).toBe(72));
  it('reads u16 format', () => expect(parseHeartRate(dv(0x01, 0xb4, 0x00))).toBe(180));
  it('rejects above 250', () => expect(parseHeartRate(dv(0x01, 0x2c, 0x01))).toBeUndefined());
  it('rejects zero', () => expect(parseHeartRate(dv(0x00, 0))).toBeUndefined());
  it('handles short data', () => {
    expect(parseHeartRate(dv(0x00))).toBeUndefined();
    expect(parseHeartRate(dv())).toBeUndefined();
  });
});

describe('parseCyclingPower', () => {
  it('reads power', () => expect(parseCyclingPower(dv(0x00, 0x00, 0xfa, 0x00))).toBe(250));
  it('clamps negative to 0', () => expect(parseCyclingPower(dv(0x00, 0x00, 0xff, 0xff))).toBe(0));
  it('handles short data', () => expect(parseCyclingPower(dv(0x00, 0x00, 0xfa))).toBeUndefined());
});

describe('parseIndoorBikeData', () => {
  it('reads speed, cadence and power', () => {
    expect(parseIndoorBikeData(dv(0x44, 0x00, 0xc4, 0x09, 0xb4, 0x00, 0xc8, 0x00))).toEqual({
      speedKmh: 25,
      cadenceRpm: 90,
      powerW: 200,
    });
  });

  it('returns {} when only the more-data bit is set', () => {
    expect(parseIndoorBikeData(dv(0x01, 0x00))).toEqual({});
  });

  it('reads power only', () => {
    expect(parseIndoorBikeData(dv(0x41, 0x00, 0x2c, 0x01))).toEqual({ powerW: 300 });
  });

  it('skips intermediate fields to reach heart rate', () => {
    // flags: bit1,3,4,5,6,7,8,9 set, bit0 clear (speed present), bit2 clear
    const flags = 0x02 | 0x08 | 0x10 | 0x20 | 0x40 | 0x80 | 0x100 | 0x200;
    const r = parseIndoorBikeData(
      dv(
        flags & 0xff, flags >> 8,
        0xc4, 0x09, // inst speed 2500
        0x11, 0x11, // avg speed
        0x22, 0x22, // avg cadence
        0x33, 0x33, 0x33, // distance u24
        0x44, 0x44, // resistance
        0xc8, 0x00, // inst power 200
        0x55, 0x55, // avg power
        0x01, 0x02, 0x03, 0x04, 0x05, // energy 5 bytes
        150, // heart rate
      ),
    );
    expect(r).toEqual({ speedKmh: 25, powerW: 200, heartRate: 150 });
  });

  it('does not throw on truncated data and omits power', () => {
    let r: ReturnType<typeof parseIndoorBikeData> = {};
    expect(() => {
      r = parseIndoorBikeData(dv(0x41, 0x00, 0xc8));
    }).not.toThrow();
    expect(r).toEqual({});
    expect(r.powerW).toBeUndefined();
  });

  it('clamps negative power to 0', () => {
    expect(parseIndoorBikeData(dv(0x41, 0x00, 0xff, 0xff))).toEqual({ powerW: 0 });
  });

  it('omits heart rate 0', () => {
    expect(parseIndoorBikeData(dv(0x01, 0x02, 0x00))).toEqual({});
  });
});
