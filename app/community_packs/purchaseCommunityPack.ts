import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { actionToastTri, emitAppEvent } from '../events';
import { getCanonicalUserId } from '../user_id_policy';
import { replaceShardsBalanceLocal } from '../shards_system';
import { packTitleForInterface, type FlashcardMarketPack } from '../flashcards/marketplace';
import type { CardPackShardPurchaseResult } from '../flashcards/cardPackShardPurchase';
import { callCommunityPurchasePack, isCommunityPacksCloudEnabled } from './functionsClient';
import { addCommunityOwnedPackId, loadCommunityOwnedPackIds } from './communityOwnedStorage';
import {
  trackCardPackAcquiredAchievement,
  trackExternalShardSpendAchievement,
} from '../flashcards/packAchievementTracking';
import type { RuntimeStudyTarget } from '../target_storage_keys';
import { storageStudyTarget } from '../target_storage_keys';

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

function formatCommunityPurchaseError(e: unknown): Parameters<typeof actionToastTri>[1] {
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
      ru: 'Нужен вход в облако. Перезайдите в раздел и попробуйте снова.',
      uk: 'Потрібен вхід в хмару. Зайдіть у розділ знову й спробуйте ще раз.',
      es: 'Hace falta la sesión en la nube. Vuelve al apartado e inténtalo de nuevo.',
      'pt-BR': 'É preciso entrar na nuvem. Reabra a seção e tente novamente.',
      vi: 'Cần đăng nhập vào đám mây. Mở lại mục này rồi thử lại.',
      id: 'Perlu masuk ke cloud. Buka kembali bagian ini lalu coba lagi.',
      tr: 'Bulut oturumu gerekiyor. Bölümü yeniden açıp tekrar dene.',
      pl: 'Wymagane jest logowanie do chmury. Otwórz sekcję ponownie i spróbuj jeszcze raz.',
    };
  }
  if (lower.includes('insufficient') || lower.includes('недостаточ') || lower.includes('недостатн')) {
    return {
      ru: 'Недостаточно осколков на балансе. Проверь баланс после синхронизации.',
      uk: 'Недостатньо осколків на балансі. Перевірте баланс після синхронізації.',
      es: 'Saldo de fragmentos insuficiente. Sincroniza con el servidor y comprueba.',
      'pt-BR': 'Saldo de fragmentos insuficiente. Sincronize com o servidor e confira.',
      vi: 'Không đủ mảnh trong số dư. Đồng bộ với máy chủ rồi kiểm tra.',
      id: 'Saldo pecahan tidak cukup. Sinkronkan dengan server lalu periksa.',
      tr: 'Parça bakiyesi yetersiz. Sunucuyla eşitleyip kontrol et.',
      pl: 'Za mało odłamków na saldzie. Zsynchronizuj z serwerem i sprawdź.',
    };
  }
  if (lower.includes('own pack') || lower.includes('свой') || lower.includes('власн')) {
    return {
      ru: 'Свой набор покупать нельзя — он уже в «Моих» как автор.',
      uk: 'Власний набір купити не можна — він уже у тебе в «Моїх» як у автора.',
      es: 'No puedes comprar tu propio pack: ya lo tienes como autor.',
      'pt-BR': 'Você não pode comprar seu próprio pacote: ele já está em “Meus” como autor.',
      vi: 'Bạn không thể mua bộ thẻ của chính mình: nó đã có trong “Của tôi” với vai trò tác giả.',
      id: 'Kamu tidak bisa membeli paket sendiri: paket itu sudah ada di “Milikku” sebagai penulis.',
      tr: 'Kendi paketini satın alamazsın: yazar olarak zaten “Benimkiler” bölümünde.',
      pl: 'Nie możesz kupić własnego zestawu: jako autor masz go już w „Moich”.',
    };
  }
  if (lower.includes('not published') || lower.includes('не опублик') || lower.includes('не з опубл')) {
    return {
      ru: 'Набор сейчас не продаётся (модерация).',
      uk: 'Наразі набір не в продажу (модерація).',
      es: 'Este pack no está a la venta (moderación).',
      'pt-BR': 'Este pacote não está à venda agora (moderação).',
      vi: 'Bộ thẻ này hiện chưa được bán (kiểm duyệt).',
      id: 'Paket ini belum dijual saat ini (moderasi).',
      tr: 'Bu paket şu anda satışta değil (moderasyon).',
      pl: 'Ten zestaw nie jest teraz w sprzedaży (moderacja).',
    };
  }
  const short = raw.slice(0, 200);
  return {
    ru: short || 'Покупка не прошла. Попробуй снова.',
    uk: short || 'Не вдалося купити набір.',
    es: short || 'No se pudo comprar el pack.',
    'pt-BR': short || 'Não foi possível comprar o pacote.',
    vi: short || 'Không thể mua bộ thẻ.',
    id: short || 'Tidak dapat membeli paket.',
    tr: short || 'Paket satın alınamadı.',
    pl: short || 'Nie udało się kupić zestawu.',
  };
}

export async function purchaseCommunityPackWithShards(
  pack: FlashcardMarketPack,
  studyTarget?: RuntimeStudyTarget,
): Promise<CardPackShardPurchaseResult> {
  if (!isCommunityPacksCloudEnabled()) return 'spend_failed';
  const owned = await loadCommunityOwnedPackIds(studyTarget);
  if (owned.includes(pack.id)) return 'already_owned';

  const buyerStableId = await getCanonicalUserId();
  if (!buyerStableId) {
    emitAppEvent('action_toast', actionToastTri('error', {
      ru: 'Нужен профиль, чтобы открыть набор.',
      uk: 'Потрібен профіль, щоб відкрити набір.',
      es: 'No hay perfil para completar la compra.',
      'pt-BR': 'Não há perfil para concluir a compra.',
      vi: 'Không có hồ sơ để hoàn tất giao dịch mua.',
      id: 'Tidak ada profil untuk menyelesaikan pembelian.',
      tr: 'Satın almayı tamamlamak için profil yok.',
      pl: 'Brak profilu do ukończenia zakupu.',
    }));
    return 'spend_failed';
  }

  const nameRaw = (await AsyncStorage.getItem('user_name')) ?? '';
  const buyerDisplayName = nameRaw.trim().slice(0, 80) || 'Игрок';

  if (!(await ensureFirebaseUserSignedInForCallable())) {
    emitAppEvent('action_toast', actionToastTri('error', {
      ru: 'Облачный вход не подключился. Повтори попытку.',
      uk: 'Не вдалося підключити хмарний вхід. Спробуйте ще раз.',
      es: 'No se pudo conectar con la cuenta en la nube. Inténtalo de nuevo.',
      'pt-BR': 'Não foi possível conectar o login na nuvem. Tente novamente.',
      vi: 'Không thể kết nối đăng nhập đám mây. Hãy thử lại.',
      id: 'Tidak dapat menghubungkan login cloud. Coba lagi.',
      tr: 'Bulut girişi bağlanamadı. Tekrar dene.',
      pl: 'Nie udało się połączyć logowania w chmurze. Spróbuj ponownie.',
    }));
    return 'spend_failed';
  }

  try {
    const res = await callCommunityPurchasePack({
      buyerStableId,
      packId: pack.id,
      studyTarget: storageStudyTarget(studyTarget),
      buyerDisplayName,
    });
    if (res.alreadyOwned) {
      await addCommunityOwnedPackId(pack.id, studyTarget);
      return 'already_owned';
    }
    if (typeof res.buyerBalanceAfter === 'number') {
      await replaceShardsBalanceLocal(res.buyerBalanceAfter, {
        updatedAtMs: res.shardsUpdatedAtMs,
        op: 'spend',
        reason: 'community_pack_purchase',
      });
    } else {
      const { getShardsBalance } = await import('../shards_system');
      await replaceShardsBalanceLocal(await getShardsBalance());
    }
    await addCommunityOwnedPackId(pack.id, studyTarget);
    void trackCardPackAcquiredAchievement(studyTarget);
    void trackExternalShardSpendAchievement(pack.priceShards);
    const titleEs =
      pack.titleEs.trim()
      || pack.titleUk.trim()
      || pack.titleRu.trim()
      || pack.id;
    const titlePtBr = (pack.titlePtBr ?? '').trim() || titleEs;
    const titleVi = (pack.titleVi ?? '').trim() || titleEs;
    const titleId = (pack.titleId ?? '').trim() || titleEs;
    const titleTr = (pack.titleTr ?? '').trim() || titleEs;
    const titlePl = (pack.titlePl ?? '').trim() || titleEs;
    emitAppEvent('action_toast', actionToastTri('success', {
      ru: `Набор «${pack.titleRu}» доступен в «Карточки».`,
      uk: `Набір «${pack.titleUk}» доступний у «Картки».`,
      es: `El pack «${titleEs}» ya está disponible en Tarjetas.`,
      'pt-BR': `O pacote “${titlePtBr}” já está disponível em Cartões.`,
      vi: `Bộ thẻ “${titleVi}” đã có trong Thẻ.`,
      id: `Paket “${titleId}” sudah tersedia di Kartu.`,
      tr: `“${titleTr}” paketi Kartlar bölümünde hazır.`,
      pl: `Zestaw „${titlePl}” jest już dostępny w Kartach.`,
    }));
    return 'ok';
  } catch (e: unknown) {
    emitAppEvent('action_toast', actionToastTri('error', formatCommunityPurchaseError(e)));
    return 'spend_failed';
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
