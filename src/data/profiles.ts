import { Preferences } from '@capacitor/preferences';
import type { Profile } from '../domain/types';
import { AppError } from '../lib/errors';

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

export const STORAGE_VERSION = 1;
export const EPOCH = '1970-01-01T00:00:00.000Z';
export const NAME_MAX = 60;
export type StoredProfiles = { version: typeof STORAGE_VERSION; profiles: Profile[] };
export type ProfileDraft = Omit<Profile, 'createdAt' | 'updatedAt'>;
export type ProfileInput = Omit<ProfileDraft, 'id'>;
export type ProfileStore = {
  list(): Promise<Profile[]>;
  save(p: ProfileDraft): Promise<void>;
  remove(id: string): Promise<void>;
  getActiveId(): Promise<string | null>;
  setActiveId(id: string | null): Promise<void>;
};

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
  else if (input.name.trim().length > NAME_MAX) errors.push(`Name must be at most ${NAME_MAX} characters`);
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

const validTime = (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v));

// Returns the cleaned profile and whether anything was altered or dropped.
function normalise(item: unknown): { profile: Profile; changed: boolean } | null {
  if (typeof item !== 'object' || item === null) return null;
  const o = item as Record<string, unknown>;
  if (typeof o.id !== 'string' || typeof o.name !== 'string') return null;
  const rawDays: unknown[] = Array.isArray(o.legDays) ? o.legDays : [];
  const legDays = [...new Set(rawDays.filter((d): d is number => inRange(d, 0, 6)))];
  const name = o.name.length > NAME_MAX ? o.name.slice(0, NAME_MAX) : o.name;
  const p: Profile = { id: o.id, name, legDays, createdAt: EPOCH, updatedAt: EPOCH };
  let changed = name !== o.name || (o.legDays !== undefined && !Array.isArray(o.legDays)) || legDays.length !== rawDays.length;
  if (inRange(o.ftp, FTP_MIN, FTP_MAX)) p.ftp = o.ftp;
  else if (o.ftp !== undefined) changed = true;
  if (inRange(o.maxHr, HR_MIN, HR_MAX)) p.maxHr = o.maxHr;
  else if (o.maxHr !== undefined) changed = true;
  for (const k of ['createdAt', 'updatedAt'] as const) {
    const v = o[k];
    if (validTime(v)) p[k] = v;
    else if (v !== undefined) changed = true;
  }
  return { profile: p, changed };
}

export function createProfileStore(kv: KV, now: () => Date = () => new Date()): ProfileStore {
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
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      await kv.set(BACKUP, raw);
      return [];
    }
    let arr: unknown[] | null = null;
    if (Array.isArray(data)) arr = data;
    else if (typeof data === 'object' && data !== null) {
      const { version, profiles } = data as { version?: unknown; profiles?: unknown };
      if (typeof version === 'number' && Number.isInteger(version) && version > STORAGE_VERSION) {
        throw new AppError(
          'Profiles were saved by a newer version of FlexNext. Update the app to use them.',
          'version',
        );
      }
      if (version === STORAGE_VERSION && Array.isArray(profiles)) arr = profiles;
    }
    if (arr === null) {
      await kv.set(BACKUP, raw);
      return [];
    }
    const items = arr.map(normalise);
    const seen = new Set<string>();
    let deduped = false;
    const out = items.flatMap((x) => {
      if (!x) return [];
      if (seen.has(x.profile.id)) {
        deduped = true;
        return [];
      }
      seen.add(x.profile.id);
      return [x.profile];
    });
    if (out.length < arr.length || deduped || items.some((x) => x?.changed)) await kv.set(BACKUP, raw);
    return out;
  };

  const write = (profiles: Profile[]) => kv.set(PROFILES, JSON.stringify({ version: STORAGE_VERSION, profiles } satisfies StoredProfiles));

  return {
    list: () => queue(list),
    save: (p) =>
      queue(async () => {
        const all = await list();
        const i = all.findIndex((x) => x.id === p.id);
        const ts = now().toISOString();
        const clean: Profile = {
          id: p.id,
          name: p.name.trim(),
          legDays: p.legDays,
          createdAt: all[i]?.createdAt ?? ts,
          updatedAt: ts,
        };
        if (p.ftp !== undefined) clean.ftp = p.ftp;
        if (p.maxHr !== undefined) clean.maxHr = p.maxHr;
        if (i >= 0) all[i] = clean;
        else all.push(clean);
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
