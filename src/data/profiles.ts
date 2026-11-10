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

export function validateProfile(input: ProfileInput): string[] {
  const errors: string[] = [];
  if (input.name.trim() === '') errors.push('Name is required');
  const { ftp, maxHr } = input;
  if (ftp !== undefined && !(Number.isInteger(ftp) && ftp >= 50 && ftp <= 600)) {
    errors.push('FTP must be a whole number from 50 to 600');
  }
  if (maxHr !== undefined && !(Number.isInteger(maxHr) && maxHr >= 100 && maxHr <= 230)) {
    errors.push('Max HR must be a whole number from 100 to 230');
  }
  if (!input.legDays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) {
    errors.push('Leg days must be 0-6');
  }
  return errors;
}

function normalise(item: unknown): Profile | null {
  if (typeof item !== 'object' || item === null) return null;
  const o = item as Record<string, unknown>;
  if (typeof o.id !== 'string' || typeof o.name !== 'string') return null;
  const p: Profile = {
    id: o.id,
    name: o.name,
    legDays: Array.isArray(o.legDays) ? o.legDays.filter((d): d is number => typeof d === 'number') : [],
  };
  if (typeof o.ftp === 'number') p.ftp = o.ftp;
  if (typeof o.maxHr === 'number') p.maxHr = o.maxHr;
  return p;
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
      const out = data.map(normalise).filter((p): p is Profile => p !== null);
      if (out.length < data.length) await kv.set(BACKUP, raw);
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
    setActiveId: (id) => queue(() => (id === null ? kv.remove(ACTIVE) : kv.set(ACTIVE, id))),
  };
}
