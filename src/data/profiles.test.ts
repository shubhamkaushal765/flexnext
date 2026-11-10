import { describe, it, expect } from 'vitest';
import { createProfileStore, validateProfile, EPOCH, type KV, type ProfileInput, type ProfileDraft } from './profiles';

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

const prof = (id: string, over: Partial<ProfileDraft> = {}): ProfileDraft => ({ id, name: 'P' + id, legDays: [], ...over });

const clock = (...isos: string[]) => {
  let i = 0;
  return () => new Date(isos[Math.min(i++, isos.length - 1)]);
};

const T1 = '2024-01-01T00:00:00.000Z';
const T2 = '2024-02-02T00:00:00.000Z';

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
    await s.save(prof('1'));
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
    expect(l).toEqual([{ id: 'a', name: 'A', legDays: [], createdAt: EPOCH, updatedAt: EPOCH }]);
  });

  it('backs up raw data when normalisation drops items', async () => {
    const raw = JSON.stringify([{ id: 'a', name: 'A' }, { name: 'no id' }]);
    const kv = memKV({ profiles: raw });
    await createProfileStore(kv).list();
    expect(kv.map.get('profiles.bak')).toBe(raw);
  });

  it('does not back up when nothing is dropped', async () => {
    const kv = memKV({ profiles: JSON.stringify([{ id: 'a', name: 'A' }]) });
    await createProfileStore(kv).list();
    expect(kv.map.has('profiles.bak')).toBe(false);
  });

  it('does not lose concurrent saves', async () => {
    const s = createProfileStore(memKV());
    await Promise.all([s.save(prof('1')), s.save(prof('2'))]);
    expect((await s.list()).map((p) => p.id).sort()).toEqual(['1', '2']);
  });
});

describe('storage envelope and versions', () => {
  const stored = (kv: { map: Map<string, string> }) => JSON.parse(kv.map.get('profiles') as string);

  it('P1 save writes versioned envelope', async () => {
    const kv = memKV();
    await createProfileStore(kv).save(prof('1'));
    const d = stored(kv);
    expect(d.version).toBe(1);
    expect(d.profiles).toHaveLength(1);
  });

  it('P2 legacy array reads with EPOCH timestamps and no backup', async () => {
    const kv = memKV({ profiles: JSON.stringify([{ id: 'a', name: 'A', legDays: [] }]) });
    const l = await createProfileStore(kv).list();
    expect(l[0].createdAt).toBe(EPOCH);
    expect(l[0].updatedAt).toBe(EPOCH);
    expect(kv.map.has('profiles.bak')).toBe(false);
  });

  it('P3 save after legacy migrates to version 1', async () => {
    const kv = memKV({ profiles: JSON.stringify([{ id: 'a', name: 'A', legDays: [] }]) });
    const s = createProfileStore(kv, clock(T1));
    await s.save(prof('b'));
    const d = stored(kv);
    expect(d.version).toBe(1);
    expect(d.profiles.map((p: { id: string }) => p.id)).toEqual(['a', 'b']);
    expect(d.profiles[0].createdAt).toBe(EPOCH);
  });

  it('P4 newer version rejects and leaves data alone', async () => {
    const raw = JSON.stringify({ version: 2, profiles: [] });
    const kv = memKV({ profiles: raw });
    const s = createProfileStore(kv);
    await expect(s.list()).rejects.toMatchObject({ code: 'version' });
    await expect(s.save(prof('1'))).rejects.toMatchObject({ code: 'version' });
    expect(kv.map.get('profiles')).toBe(raw);
    expect(kv.map.has('profiles.bak')).toBe(false);
  });

  it('P5 bad envelope backs up and returns []', async () => {
    const raw = JSON.stringify({ version: 1, profiles: 'x' });
    const kv = memKV({ profiles: raw });
    expect(await createProfileStore(kv).list()).toEqual([]);
    expect(kv.map.get('profiles.bak')).toBe(raw);
  });
});

describe('timestamps', () => {
  const stored = (kv: { map: Map<string, string> }) => JSON.parse(kv.map.get('profiles') as string);

  it('P6 save stamps from clock', async () => {
    const kv = memKV();
    await createProfileStore(kv, clock(T1)).save(prof('1'));
    const p = stored(kv).profiles[0];
    expect(p.createdAt).toBe(T1);
    expect(p.updatedAt).toBe(T1);
  });

  it('P7 second save keeps createdAt, bumps updatedAt', async () => {
    const kv = memKV();
    const s = createProfileStore(kv, clock(T1, T2));
    await s.save(prof('1'));
    await s.save(prof('1', { name: 'New' }));
    const p = stored(kv).profiles[0];
    expect(p.createdAt).toBe(T1);
    expect(p.updatedAt).toBe(T2);
  });

  it('P8 ignores caller timestamps and extra fields', async () => {
    const kv = memKV();
    const draft = { ...prof('1'), createdAt: '2000-01-01T00:00:00.000Z', junk: 1 } as unknown as ProfileDraft;
    await createProfileStore(kv, clock(T1)).save(draft);
    const p = stored(kv).profiles[0];
    expect(p.createdAt).toBe(T1);
    expect('junk' in p).toBe(false);
  });

  it('P9 invalid stored createdAt becomes EPOCH with backup', async () => {
    const kv = memKV({
      profiles: JSON.stringify({ version: 1, profiles: [{ id: 'a', name: 'A', legDays: [], createdAt: 'nope', updatedAt: T1 }] }),
    });
    const l = await createProfileStore(kv).list();
    expect(l[0].createdAt).toBe(EPOCH);
    expect(kv.map.has('profiles.bak')).toBe(true);
  });
});

describe('load hardening', () => {
  it('P10 duplicate ids keep first with backup', async () => {
    const kv = memKV({
      profiles: JSON.stringify([
        { id: 'a', name: 'first', legDays: [] },
        { id: 'a', name: 'second', legDays: [] },
      ]),
    });
    const l = await createProfileStore(kv).list();
    expect(l).toHaveLength(1);
    expect(l[0].name).toBe('first');
    expect(kv.map.has('profiles.bak')).toBe(true);
  });

  it('P11 long name sliced to 60 with backup', async () => {
    const kv = memKV({ profiles: JSON.stringify([{ id: 'a', name: 'x'.repeat(61), legDays: [] }]) });
    const l = await createProfileStore(kv).list();
    expect(l[0].name).toBe('x'.repeat(60));
    expect(kv.map.has('profiles.bak')).toBe(true);
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

  it('P12 limits name length', () => {
    expect(validateProfile({ ...ok, name: 'x'.repeat(61) })).toContain('Name must be at most 60 characters');
    expect(validateProfile({ ...ok, name: 'x'.repeat(60) })).not.toContain('Name must be at most 60 characters');
  });

  it('checks leg days', () => {
    for (const legDays of [[7], [-1], [1.5]]) expect(validateProfile({ ...ok, legDays })).toContain(LEG);
  });

  describe('load normalisation', () => {
    const load = async (stored: unknown) => {
      const kv = memKV({ profiles: JSON.stringify(stored) });
      const l = await createProfileStore(kv).list();
      return { l, kv };
    };

    it('drops ftp 0 and writes a backup', async () => {
      const { l, kv } = await load([{ id: 'a', name: 'A', legDays: [], ftp: 0 }]);
      expect(l[0].ftp).toBeUndefined();
      expect(kv.map.has('profiles.bak')).toBe(true);
    });

    it('drops string ftp and writes a backup', async () => {
      const { l, kv } = await load([{ id: 'a', name: 'A', legDays: [], ftp: '250' }]);
      expect(l[0].ftp).toBeUndefined();
      expect(kv.map.has('profiles.bak')).toBe(true);
    });

    it('filters leg days and writes a backup', async () => {
      const { l, kv } = await load([{ id: 'a', name: 'A', legDays: [9, 0.5, 2] }]);
      expect(l[0].legDays).toEqual([2]);
      expect(kv.map.has('profiles.bak')).toBe(true);
    });

    it('writes no backup for clean data', async () => {
      const { l, kv } = await load([{ id: 'a', name: 'A', legDays: [1, 3], ftp: 250, maxHr: 190 }]);
      expect(l[0].ftp).toBe(250);
      expect(kv.map.has('profiles.bak')).toBe(false);
    });
  });

  it('setActiveId for a concurrently removed profile leaves no active id', async () => {
    const s = createProfileStore(memKV());
    await s.save(prof('a'));
    await s.setActiveId('a');
    await Promise.all([s.remove('a'), s.setActiveId('a')]);
    expect(await s.getActiveId()).toBeNull();
  });

  it('save trims name so a valid name survives list unchanged', async () => {
    const kv = memKV();
    const s = createProfileStore(kv);
    const name = 'a'.repeat(60);
    await s.save({ id: 'x', name: ' ' + name, legDays: [] });
    expect((await s.list())[0].name).toBe(name);
    expect(kv.map.has('profiles.bak')).toBe(false);
  });
});
