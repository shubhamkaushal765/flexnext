import { describe, it, expect } from 'vitest';
import { createProfileStore, validateProfile, type KV, type ProfileInput } from './profiles';
import type { Profile } from '../domain/types';

function memKV(initial: Record<string, string> = {}): KV & { map: Map<string, string> } {
  const map = new Map(Object.entries(initial));
  return {
    map,
    get: async (k) => map.get(k) ?? null,
    set: async (k, v) => {
      await Promise.resolve();
      map.set(k, v);
    },
    remove: async (k) => {
      map.delete(k);
    },
  };
}

const prof = (id: string, over: Partial<Profile> = {}): Profile => ({ id, name: 'P' + id, legDays: [], ...over });

describe('profile store', () => {
  it('lists empty', async () => {
    expect(await createProfileStore(memKV()).list()).toEqual([]);
  });

  it('appends new profiles', async () => {
    const s = createProfileStore(memKV());
    await s.save(prof('1'));
    await s.save(prof('2'));
    expect((await s.list()).map((p) => p.id)).toEqual(['1', '2']);
  });

  it('replaces existing id in place', async () => {
    const s = createProfileStore(memKV());
    await s.save(prof('1'));
    await s.save(prof('2'));
    await s.save(prof('1', { name: 'Changed' }));
    const l = await s.list();
    expect(l.map((p) => p.id)).toEqual(['1', '2']);
    expect(l[0]?.name).toBe('Changed');
  });

  it('remove clears active id when active', async () => {
    const s = createProfileStore(memKV());
    await s.save(prof('1'));
    await s.save(prof('2'));
    await s.setActiveId('1');
    await s.remove('1');
    expect((await s.list()).map((p) => p.id)).toEqual(['2']);
    expect(await s.getActiveId()).toBeNull();
  });

  it('remove keeps active id otherwise', async () => {
    const s = createProfileStore(memKV());
    await s.save(prof('1'));
    await s.save(prof('2'));
    await s.setActiveId('2');
    await s.remove('1');
    expect(await s.getActiveId()).toBe('2');
  });

  it('setActiveId(null) removes the key', async () => {
    const kv = memKV();
    const s = createProfileStore(kv);
    await s.setActiveId('1');
    expect(kv.map.get('activeProfileId')).toBe('1');
    await s.setActiveId(null);
    expect(kv.map.has('activeProfileId')).toBe(false);
    expect(await s.getActiveId()).toBeNull();
  });

  it('backs up corrupt JSON and returns []', async () => {
    const kv = memKV({ profiles: '{not json' });
    const s = createProfileStore(kv);
    expect(await s.list()).toEqual([]);
    expect(kv.map.get('profiles.bak')).toBe('{not json');
  });

  it('normalises stored items', async () => {
    const kv = memKV({
      profiles: JSON.stringify([{ id: 'a', name: 'A' }, { name: 'no id' }, { id: 'b' }, { id: 3, name: 'num' }]),
    });
    const l = await createProfileStore(kv).list();
    expect(l).toEqual([{ id: 'a', name: 'A', legDays: [] }]);
  });

  it('does not lose concurrent saves', async () => {
    const s = createProfileStore(memKV());
    await Promise.all([s.save(prof('1')), s.save(prof('2'))]);
    expect((await s.list()).map((p) => p.id).sort()).toEqual(['1', '2']);
  });
});

describe('validateProfile', () => {
  const ok: ProfileInput = { name: 'Sam', ftp: 250, maxHr: 180, legDays: [1, 4] };
  const FTP = 'FTP must be a whole number from 50 to 600';
  const HR = 'Max HR must be a whole number from 100 to 230';
  const LEG = 'Leg days must be 0-6';

  it('accepts a valid profile', () => {
    expect(validateProfile(ok)).toEqual([]);
  });

  it('requires a name', () => {
    expect(validateProfile({ ...ok, name: '  ' })).toContain('Name is required');
  });

  it('checks ftp', () => {
    for (const ftp of [49, 601, 250.5]) expect(validateProfile({ ...ok, ftp })).toContain(FTP);
    for (const ftp of [50, 600, undefined]) expect(validateProfile({ ...ok, ftp })).toEqual([]);
  });

  it('checks max hr', () => {
    for (const maxHr of [99, 231, 180.5]) expect(validateProfile({ ...ok, maxHr })).toContain(HR);
    for (const maxHr of [100, 230, undefined]) expect(validateProfile({ ...ok, maxHr })).toEqual([]);
  });

  it('checks leg days', () => {
    for (const legDays of [[7], [-1], [1.5]]) expect(validateProfile({ ...ok, legDays })).toContain(LEG);
  });
});
