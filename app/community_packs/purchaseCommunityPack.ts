import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { emitAppEvent } from '../events';
import { getCanonicalUserId } from '../user_id_policy';
import { replaceShardsBalanceLocal } from '../shards_system';
import { packTitleForInterface, type FlashcardMarketPack } from '../flashcards/marketplace';
import type { CardPackShardPurchaseResult } from '../flashcards/cardPackShardPurchase';
import { callCommunityPurchasePack, isCommunityPacksCloudEnabled } from './functionsClient';
import { addCommunityOwnedPackId, loadCommunityOwnedPackIds } from './communityOwnedStorage';

/**
 * Cloud Functions (onCall) require Firebase Auth. `cloud_sync.ensureAnonUser` only starts
 * signInAnonymously() without await — purchse could run unauthenticated and fail.
 */
async function ensureFirebaseUserSignedInForCallable(): Promise<boolean> {
  if (!isCommunityPacksCloudEnabled()) return false;
  try {
    if (auth().currentUser) return true;
    await auth().signInAnonymously();
    return !!auth().currentUser;
  } catch {
    return false;
  }
}

function formatCommunityPurchaseError(e: unknown): { messageRu: string; messageUk: string; messageEs: string } {
  const raw = (() => {
    if (e == null) return '';
    if (typeof e === 'string') return e;
    if (typeof e === 'object') {
      const o = e as {
        message?: string;
        nativeErrorMessage?: string;
        code?: string;
        userInfo?: { message?: string };
      };
      const m = o.message || o.nativeErrorMessage || o.userInfo?.message;
      if (m && String(m).trim()) return String(m);
      if (o.code) return String(o.code);
    }
    return String(e);
  })();
  const lower = raw.toLowerCase();
  if (lower.includes('unauthenticated') || lower.includes('auth required')) {
    return {
      messageRu: 'Нужен вход в облако. Перезайдите в раздел и попробуйте снова.',
      messageUk: 'Потрібен вхід в хмару. Зайдіть у розділ знову й спробуйте ще раз.',
      messageEs: 'Hace falta la sesión en la nube. Vuelve al apartado e inténtalo de nuevo.',
    };
  }
  if (lower.includes('insufficient') || lower.includes('недостаточ') || lower.includes('недостатн')) {
    return {
      messageRu: 'Недостаточно осколков на балансе (проверьте после загрузки с сервера).',
      messageUk: 'Недостатньо осколків на балансі (перевірте після завантаження з сервера).',
      messageEs: 'Saldo de fragmentos insuficiente (sincroniza con el servidor y comprueba).',
    };
  }
  if (lower.includes('own pack') || lower.includes('свой') || lower.includes('власн')) {
    return {
      messageRu: 'Свой набор покупать нельзя — он уже в «Моих» как автор.',
      messageUk: 'Власний набір купити не можна — він уже у тебе в «Моїх» як у автора.',
      messageEs: 'No puedes comprar tu propio pack: ya lo tienes como autor.',
    };
  }
  if (lower.includes('not published') || lower.includes('не опублик') || lower.includes('не з опубл')) {
    return {
      messageRu: 'Набор сейчас не продаётся (модерация).',
      messageUk: 'Наразі набір не в продажу (модерація).',
      messageEs: 'Este pack no está a la venta (moderación).',
    };
  }
  const short = raw.slice(0, 200);
  return {
    messageRu: short || 'Не удалось купить набор.',
    messageUk: short || 'Не вдалося купити набір.',
    messageEs: short || 'No se pudo comprar el pack.',
  };
}

export async function purchaseCommunityPackWithShards(
  pack: FlashcardMarketPack,
): Promise<CardPackShardPurchaseResult> {
  if (!isCommunityPacksCloudEnabled()) return 'spend_failed';
  const owned = await loadCommunityOwnedPackIds();
  if (owned.includes(pack.id)) return 'already_owned';

  const buyerStableId = await getCanonicalUserId();
  if (!buyerStableId) {
    emitAppEvent('action_toast', {
      type: 'error',
      messageRu: 'Нет профиля для покупки.',
      messageUk: 'Немає профілю для покупки.',
      messageEs: 'No hay perfil para completar la compra.',
    });
    return 'spend_failed';
  }

  const nameRaw = (await AsyncStorage.getItem('user_name')) ?? '';
  const buyerDisplayName = nameRaw.trim().slice(0, 80) || 'Игрок';

  if (!(await ensureFirebaseUserSignedInForCallable())) {
    emitAppEvent('action_toast', {
      type: 'error',
      messageRu: 'Не удалось подключить облачный вход. Повторите попытку.',
      messageUk: 'Не вдалося підключити хмарний вхід. Спробуйте ще раз.',
      messageEs: 'No se pudo conectar con la cuenta en la nube. Inténtalo de nuevo.',
    });
    return 'spend_failed';
  }

  try {
    const res = await callCommunityPurchasePack({
      buyerStableId,
      packId: pack.id,
      buyerDisplayName,
    });
    if (res.alreadyOwned) return 'already_owned';
    if (typeof res.buyerBalanceAfter === 'number') {
      await replaceShardsBalanceLocal(res.buyerBalanceAfter);
    } else {
      const { getShardsBalance } = await import('../shards_system');
      await replaceShardsBalanceLocal(await getShardsBalance());
    }
    await addCommunityOwnedPackId(pack.id);
    const titleEs =
      pack.titleEs.trim()
      || pack.titleUk.trim()
      || pack.titleRu.trim()
      || pack.id;
    emitAppEvent('action_toast', {
      type: 'success',
      messageRu: `Набор «${pack.titleRu}» доступен в «Карточки».`,
      messageUk: `Набір «${pack.titleUk}» доступний у «Картки».`,
      messageEs: `El pack «${titleEs}» ya está disponible en Tarjetas.`,
    });
    return 'ok';
  } catch (e: unknown) {
    const { messageRu, messageUk, messageEs } = formatCommunityPurchaseError(e);
    emitAppEvent('action_toast', { type: 'error', messageRu, messageUk, messageEs });
    return 'spend_failed';
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
