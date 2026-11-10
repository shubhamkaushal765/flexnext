import { createContext, useContext } from 'react';
import type { Profile } from '../domain/types';

export type ProfileState = {
  loaded: boolean;
  profiles: Profile[];
  active: Profile | null;
  save: (p: Profile) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setActive: (id: string | null) => Promise<void>;
};

export const Ctx = createContext<ProfileState | null>(null);

export function useProfiles(): ProfileState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useProfiles must be used inside ProfileProvider');
  return v;
}
