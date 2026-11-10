import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { createProfileStore, prefsKV } from '../data/profiles';
import type { ProfileDraft } from '../data/profiles';
import type { Profile } from '../domain/types';
import { toUserMessage } from '../lib/errors';
import { Ctx } from './useProfiles';
import type { ProfileState } from './useProfiles';

const store = createProfileStore(prefsKV);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([store.list(), store.getActiveId()])
      .then(([list, id]) => {
        if (cancelled) return;
        setProfiles(list);
        setActiveId(id);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(toUserMessage(e));
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(async (p: ProfileDraft) => {
    await store.save(p);
    setProfiles(await store.list());
  }, []);

  const remove = useCallback(async (id: string) => {
    const wasActive = (await store.getActiveId()) === id;
    await store.remove(id);
    const list = await store.list();
    setProfiles(list);
    const next = wasActive ? (list[0]?.id ?? null) : await store.getActiveId();
    if (wasActive && next !== null) await store.setActiveId(next);
    setActiveId(next);
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
      error,
      save,
      remove,
      setActive,
    }),
    [loaded, profiles, activeId, error, save, remove, setActive],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
