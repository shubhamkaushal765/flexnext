import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { createProfileStore, prefsKV } from '../data/profiles';
import type { Profile } from '../domain/types';

const store = createProfileStore(prefsKV);

type ProfileState = {
  loaded: boolean;
  profiles: Profile[];
  active: Profile | null;
  save: (p: Profile) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setActive: (id: string | null) => Promise<void>;
};

const Ctx = createContext<ProfileState | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([store.list(), store.getActiveId()]).then(([list, id]) => {
      if (cancelled) return;
      setProfiles(list);
      setActiveId(id);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(async (p: Profile) => {
    await store.save(p);
    setProfiles(await store.list());
  }, []);

  const remove = useCallback(async (id: string) => {
    await store.remove(id);
    setProfiles(await store.list());
    setActiveId(await store.getActiveId());
  }, []);

  const setActive = useCallback(async (id: string | null) => {
    await store.setActiveId(id);
    setActiveId(id);
  }, []);

  const value = useMemo<ProfileState>(
    () => ({
      loaded,
      profiles,
      active: profiles.find((p) => p.id === activeId) ?? null,
      save,
      remove,
      setActive,
    }),
    [loaded, profiles, activeId, save, remove, setActive],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProfiles(): ProfileState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useProfiles must be used inside ProfileProvider');
  return v;
}
