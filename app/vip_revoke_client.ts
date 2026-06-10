/**
 * Клиентская обёртка CF vipRevokeMine — серверный отзыв СВОЕГО VIP.
 *
 * Прямая запись vip_* в users/{uid}.progress запрещена клиенту
 * (firestore.rules: progressHasNoPremiumWrites), поэтому QA-кнопка
 * «Снять премиум» отзывает серверный VIP через Admin SDK на сервере.
 * Identity сервер берёт из auth — тело запроса пустое.
 */
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { initFirebaseAppCheckIfAvailable } from './app_check_init';

const REGION = 'us-central1';

export type VipRevokeMineResult = { ok?: boolean };

export async function callVipRevokeMine(): Promise<VipRevokeMineResult> {
  await initFirebaseAppCheckIfAvailable().catch(() => {});
  const fn = httpsCallable<Record<string, never>, VipRevokeMineResult>(
    getFunctions(getApp(), REGION),
    'vipRevokeMine',
  );
  const res = await fn({});
  return res.data;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
