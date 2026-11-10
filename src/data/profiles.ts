import { Preferences } from '@capacitor/preferences';
import type { Profile } from '../domain/types';

export interface KV {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export const prefsKV: KV = {
  get: async (key) => (await Preferences.get({ key })).value,
  set: (key, value) => Preferences.set({ key, value }),
  remove: (key) => Preferences.remove({ key }),
};

export type ProfileInput = Omit<Profile, 'id'>;

const PROFILES = 'profiles';
const ACTIVE = 'activeProfileId';
const BACKUP = 'profiles.bak';

const FTP_MIN = 50;
const FTP_MAX = 600;
const HR_MIN = 100;
const HR_MAX = 230;

const inRange = (v: unknown, lo: number, hi: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;

export function validateProfile(input: ProfileInput): string[] {
  const errors: string[] = [];
  if (input.name.trim() === '') errors.push('Name is required');
  const { ftp, maxHr } = input;
  if (ftp !== undefined && !inRange(ftp, FTP_MIN, FTP_MAX)) {
    errors.push(`FTP must be a whole number from ${FTP_MIN} to ${FTP_MAX}`);
  }
  if (maxHr !== undefined && !inRange(maxHr, HR_MIN, HR_MAX)) {
    errors.push(`Max HR must be a whole number from ${HR_MIN} to ${HR_MAX}`);
  }
  if (!input.legDays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) {
    errors.push('Leg days must be 0-6');
  }
  return errors;
}

// Returns the cleaned profile and whether anything was altered or dropped.
function normalise(item: unknown): { profile: Profile; changed: boolean } | null {
  if (typeof item !== 'object' || item === null) return null;
  const o = item as Record<string, unknown>;
  if (typeof o.id !== 'string' || typeof o.name !== 'string') return null;
  const rawDays: unknown[] = Array.isArray(o.legDays) ? o.legDays : [];
  const legDays = [...new Set(rawDays.filter((d): d is number => inRange(d, 0, 6)))];
  const p: Profile = { id: o.id, name: o.name, legDays };
  let changed = (o.legDays !== undefined && !Array.isArray(o.legDays)) || legDays.length !== rawDays.length;
  if (inRange(o.ftp, FTP_MIN, FTP_MAX)) p.ftp = o.ftp;
  else if (o.ftp !== undefined) changed = true;
  if (inRange(o.maxHr, HR_MIN, HR_MAX)) p.maxHr = o.maxHr;
  else if (o.maxHr !== undefined) changed = true;
  return { profile: p, changed };
}

export function createProfileStore(kv: KV): {
  list(): Promise<Profile[]>;
  save(p: Profile): Promise<void>;
  remove(id: string): Promise<void>;
  getActiveId(): Promise<string | null>;
  setActiveId(id: string | null): Promise<void>;
} {
  let chain: Promise<unknown> = Promise.resolve();
  // Serialise writes so concurrent save/remove calls never lose updates.
  const queue = <T>(fn: () => Promise<T>): Promise<T> => {
    const next = chain.then(fn, fn);
    chain = next.catch(() => undefined);
    return next;
  };

  const list = async (): Promise<Profile[]> => {
    const raw = await kv.get(PROFILES);
    if (raw === null) return [];
    try {
      const data: unknown = JSON.parse(raw);
      if (!Array.isArray(data)) throw new Error('not an array');
      const items = data.map(normalise);
      const out = items.flatMap((x) => (x ? [x.profile] : []));
      if (out.length < data.length || items.some((x) => x?.changed)) await kv.set(BACKUP, raw);
      return out;
    } catch {
      await kv.set(BACKUP, raw);
      return [];
    }
  };

  const write = (profiles: Profile[]) => kv.set(PROFILES, JSON.stringify(profiles));

  return {
    list: () => queue(list),
    save: (p) =>
      queue(async () => {
        const all = await list();
        const i = all.findIndex((x) => x.id === p.id);
        if (i >= 0) all[i] = p;
        else all.push(p);
        await write(all);
      }),
    remove: (id) =>
      queue(async () => {
        const all = await list();
        await write(all.filter((x) => x.id !== id));
        if ((await kv.get(ACTIVE)) === id) await kv.remove(ACTIVE);
      }),
    getActiveId: () => kv.get(ACTIVE),
    setActiveId: (id) =>
      queue(async () => {
        if (id !== null && (await list()).some((x) => x.id === id)) await kv.set(ACTIVE, id);
        else await kv.remove(ACTIVE);
      }),
  };
}
