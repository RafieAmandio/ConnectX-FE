import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const DEVICE_ID_KEY = 'connectx.device.id';

export async function getOrCreateDeviceId() {
  const storedDeviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);

  if (storedDeviceId?.trim()) {
    return storedDeviceId.trim();
  }

  const deviceId = `device_${Crypto.randomUUID()}`;
  await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);

  return deviceId;
}
