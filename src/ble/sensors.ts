import { BleClient, numberToUUID } from '@capacitor-community/bluetooth-le';
import type { Reading, SensorKind } from '../domain/types';
import { parseCyclingPower, parseHeartRate, parseIndoorBikeData } from './parse';

export const SENSORS: Record<
  SensorKind,
  { label: string; service: number; characteristic: number; parse: (v: DataView) => Reading }
> = {
  hr: {
    label: 'Heart rate',
    service: 0x180d,
    characteristic: 0x2a37,
    parse: (v) => {
      const heartRate = parseHeartRate(v);
      return heartRate === undefined ? {} : { heartRate };
    },
  },
  power: {
    label: 'Power meter',
    service: 0x1818,
    characteristic: 0x2a63,
    parse: (v) => {
      const powerW = parseCyclingPower(v);
      return powerW === undefined ? {} : { powerW };
    },
  },
  trainer: {
    label: 'Smart trainer',
    service: 0x1826,
    characteristic: 0x2ad2,
    parse: parseIndoorBikeData,
  },
};

export async function connectSensor(
  kind: SensorKind,
  onReading: (r: Reading) => void,
  onDisconnect: () => void,
): Promise<{ name: string; disconnect(): Promise<void> }> {
  const { label, service, characteristic, parse } = SENSORS[kind];
  const serviceUuid = numberToUUID(service);
  const characteristicUuid = numberToUUID(characteristic);

  await BleClient.initialize({ androidNeverForLocation: true });
  const device = await BleClient.requestDevice({ services: [serviceUuid] });
  await BleClient.connect(device.deviceId, () => onDisconnect());
  try {
    await BleClient.startNotifications(device.deviceId, serviceUuid, characteristicUuid, (value) => {
      const reading = parse(value);
      if (Object.keys(reading).length > 0) onReading(reading);
    });
  } catch (e) {
    await BleClient.disconnect(device.deviceId).catch(() => {});
    throw e;
  }

  return {
    name: device.name ?? label,
    disconnect: async () => {
      try {
        await BleClient.stopNotifications(device.deviceId, serviceUuid, characteristicUuid);
      } catch {
        // already gone
      }
      await BleClient.disconnect(device.deviceId);
    },
  };
}
