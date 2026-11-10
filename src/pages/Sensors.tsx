import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { SENSORS, connectSensor } from '../ble/sensors';
import type { Reading, SensorKind } from '../domain/types';

const KINDS: SensorKind[] = ['hr', 'power', 'trainer'];
const STALE_MS = 5000;

type Status = 'idle' | 'connecting' | 'connected' | 'disconnected';
type Card = { status: Status; name: string; values: Reading; error: string };
type Handle = { disconnect(): Promise<void> };

const initial: Card = { status: 'idle', name: '', values: {}, error: '' };

const FIELDS: Record<SensorKind, { key: keyof Reading; unit: string }[]> = {
  hr: [{ key: 'heartRate', unit: 'bpm' }],
  power: [{ key: 'powerW', unit: 'W' }],
  trainer: [
    { key: 'powerW', unit: 'W' },
    { key: 'cadenceRpm', unit: 'rpm' },
    { key: 'speedKmh', unit: 'km/h' },
    { key: 'heartRate', unit: 'bpm' },
  ],
};

export default function Sensors() {
  const [cards, setCards] = useState<Record<SensorKind, Card>>({
    hr: initial,
    power: initial,
    trainer: initial,
  });
  const handles = useRef<Partial<Record<SensorKind, Handle>>>({});
  const mounted = useRef(false);
  const lastSeen = useRef<Partial<Record<SensorKind, Partial<Record<keyof Reading, number>>>>>({});

  const patch = useCallback((kind: SensorKind, p: Partial<Card>) => {
    setCards((c) => ({ ...c, [kind]: { ...c[kind], ...p } }));
  }, []);

  // Clear values that have not been updated for STALE_MS.
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      for (const kind of KINDS) {
        const seen = lastSeen.current[kind];
        if (!seen) continue;
        const stale = (Object.keys(seen) as (keyof Reading)[]).filter((k) => now - (seen[k] ?? 0) > STALE_MS);
        if (stale.length === 0) continue;
        for (const k of stale) delete seen[k];
        setCards((c) => {
          const values = { ...c[kind].values };
          for (const k of stale) delete values[k];
          return { ...c, [kind]: { ...c[kind], values } };
        });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [patch]);

  // Keep the screen awake while any sensor is connected.
  const anyConnected = KINDS.some((k) => cards[k].status === 'connected');
  useEffect(() => {
    if (!anyConnected) return;
    KeepAwake.keepAwake().catch(() => undefined);
    return () => {
      KeepAwake.allowSleep().catch(() => undefined);
    };
  }, [anyConnected]);

  // Release sensors when leaving the page.
  useEffect(() => {
    mounted.current = true;
    const current = handles.current;
    return () => {
      mounted.current = false;
      for (const kind of KINDS) current[kind]?.disconnect().catch(() => undefined);
    };
  }, []);

  const release = useCallback(
    (kind: SensorKind) => {
      delete handles.current[kind];
      delete lastSeen.current[kind];
      patch(kind, { status: 'disconnected', values: {} });
    },
    [patch],
  );

  async function connect(kind: SensorKind) {
    patch(kind, { status: 'connecting', error: '', values: {} });
    try {
      const h = await connectSensor(
        kind,
        (r) => {
          const now = Date.now();
          const seen = (lastSeen.current[kind] ??= {});
          for (const k of Object.keys(r) as (keyof Reading)[]) if (r[k] !== undefined) seen[k] = now;
          setCards((c) => ({ ...c, [kind]: { ...c[kind], values: { ...c[kind].values, ...r } } }));
        },
        () => release(kind),
      );
      if (!mounted.current) {
        h.disconnect().catch(() => {});
        return;
      }
      handles.current[kind] = h;
      patch(kind, { status: 'connected', name: h.name });
    } catch (e) {
      patch(kind, { status: 'idle', error: e instanceof Error ? e.message : String(e) });
    }
  }

  async function disconnect(kind: SensorKind) {
    try {
      await handles.current[kind]?.disconnect();
    } catch (e) {
      patch(kind, { error: e instanceof Error ? e.message : String(e) });
      return;
    }
    release(kind);
  }

  const unsupported = !('bluetooth' in navigator) && !Capacitor.isNativePlatform();

  return (
    <>
      <h1>Sensors</h1>
      {unsupported && (
        <p className="error">This browser has no Web Bluetooth. Use Chrome or Edge, or the Android app.</p>
      )}
      {KINDS.map((kind) => {
        const c = cards[kind];
        const on = c.status === 'connected';
        return (
          <section key={kind} className="card">
            <h2>{SENSORS[kind].label}</h2>
            <p className="label">
              {c.status === 'connected' && `Connected: ${c.name}`}
              {c.status === 'connecting' && 'Connecting...'}
              {c.status === 'disconnected' && 'Disconnected'}
              {c.status === 'idle' && 'Not connected'}
            </p>
            {on && (
              <div className="readings">
                {FIELDS[kind].map(({ key, unit }) => (
                  <div key={key}>
                    <span className="big-number">{c.values[key] ?? '--'}</span>
                    <span className="unit">{unit}</span>
                  </div>
                ))}
              </div>
            )}
            {c.error && <p className="error">{c.error}</p>}
            {on ? (
              <button onClick={() => disconnect(kind)}>Disconnect</button>
            ) : (
              <button disabled={c.status === 'connecting'} onClick={() => connect(kind)}>
                Connect
              </button>
            )}
          </section>
        );
      })}
    </>
  );
}
