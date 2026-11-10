import type { Profile } from '../domain/types';

export interface KV {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export const prefsKV: KV = {
  get: async () => null,
  set: async () => undefined,
  remove: async () => undefined,
};

export type ProfileInput = Omit<Profile, 'id'>;

export function validateProfile(_input: ProfileInput): string[] {
  return [];
}

export function createProfileStore(_kv: KV): {
  list(): Promise<Profile[]>;
  save(p: Profile): Promise<void>;
  remove(id: string): Promise<void>;
  getActiveId(): Promise<string | null>;
  setActiveId(id: string | null): Promise<void>;
} {
  return {
    list: async () => [],
    save: async () => undefined,
    remove: async () => undefined,
    getActiveId: async () => null,
    setActiveId: async () => undefined,
  };
}
