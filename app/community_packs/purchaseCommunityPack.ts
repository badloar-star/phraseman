import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { actionToastTri, emitAppEvent } from '../events';
import { getCanonicalUserId } from '../user_id_policy';
import {
  getShardsBalance,
  refreshShardsBalanceFromCloudAuthoritative,
  replaceShardsBalanceLocal,
} from '../shards_system';
import {
  emitShardPurchaseSyncPendingToast,
  reconcileShardsBeforePurchase,
} from '../shards_purchase_reconcile';
import { packTitleForInterface, type FlashcardMarketPack } from '../flashcards/marketplace';
import type { CardPackShardPurchaseResult } from '../flashcards/cardPackShardPurchase';
import {
  callCommunityPurchasePack,
  callFlashcardPackGiftRedeem,
  isCommunityPacksCloudEnabled,
} from './functionsClient';
import { addCommunityOwnedPackId, loadCommunityOwnedPackIds } from './communityOwnedStorage';
import {
  trackCardPackAcquiredAchievement,
  trackExternalShardSpendAchievement,
} from '../flashcards/packAchievementTracking';
import type { RuntimeStudyTarget } from '../target_storage_keys';
import { storageStudyTarget } from '../target_storage_keys';
import { bindPackGiftVoucherSelection, consumePackGiftTrial, getPackGiftTrial } from '../flashcards/pack_trial_gift';
/**
 * Cards 2.1 §1.2: цены наборов удалены из создания/публикации (`schema.ts`).
 * Здесь константа осталась только для легаси-пути покупки набора за осколки
 * в «Магазине осколков» — каталог раздела «Карточки» её не использует.
 */
const COMMUNITY_PACK_PRICE_SHARDS = 10;

/**
 * Cloud Functions (onCall) require Firebase Auth. `cloud_sync.ensureAnonUser` only starts
 * signInAnonymously() without await — purchse could run unauthenticated and fail.
 */
export async function ensureFirebaseUserSignedInForCallable(): Promise<boolean> {
  if (!isCommunityPacksCloudEnabled()) return false;
  try {
    if (auth().currentUser) return true;
    await auth().signInAnonymously();
    return !!auth().currentUser;
  } catch {
    return false;
  }
}

function communityPurchaseErrorText(e: unknown): string {
  if (e == null) return '';
  if (typeof e === 'string') return e;
  if (typeof e === 'object') {
    const o = e as {
      message?: string;
      nativeErrorMessage?: string;
      code?: string;
      details?: unknown;
      userInfo?: { message?: string };
    };
    const details = typeof o.details === 'string'
      ? o.details
      : o.details && typeof o.details === 'object'
        ? JSON.stringify(o.details)
        : '';
    return [o.message, o.nativeErrorMessage, o.userInfo?.message, o.code, details]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join(' ');
  }
  return String(e);
}

function isInsufficientCommunityPurchaseError(e: unknown): boolean {
  const lower = communityPurchaseErrorText(e).toLowerCase();
  return lower.includes('insufficient')
    || lower.includes('недостаточ')
    || lower.includes('недостатн');
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
      ru: 'Не удалось подтвердить аккаунт. Перезайдите в раздел и попробуйте снова.',
      uk: 'Не вдалося підтвердити акаунт. Зайдіть у розділ знову й спробуйте ще раз.',
      es: 'No se pudo confirmar la cuenta. Vuelve al apartado e inténtalo de nuevo.',
      'pt-BR': 'Não foi possível confirmar a conta. Reabra a seção e tente novamente.',
      vi: 'Không thể xác nhận tài khoản. Mở lại mục này rồi thử lại.',
      id: 'Tidak dapat mengonfirmasi akun. Buka kembali bagian ini lalu coba lagi.',
      tr: 'Hesap doğrulanamadı. Bölümü yeniden açıp tekrar dene.',
      pl: 'Nie udało się potwierdzić konta. Otwórz sekcję ponownie i spróbuj jeszcze raz.',
    };
  }
  if (lower.includes('insufficient') || lower.includes('недостаточ') || lower.includes('недостатн')) {
    return {
      ru: 'Недостаточно жемчужин на балансе. Проверь баланс и попробуй снова.',
      uk: 'Недостатньо перлин на балансі. Перевір баланс і спробуй ще раз.',
      es: 'Saldo de perlas insuficiente. Comprueba el saldo e inténtalo de nuevo.',
      'pt-BR': 'Saldo de pérolas insuficiente. Confira o saldo e tente novamente.',
      vi: 'Không đủ xu trong số dư. Kiểm tra số dư rồi thử lại.',
      id: 'Saldo koin tidak cukup. Periksa saldo lalu coba lagi.',
      tr: 'Jeton bakiyesi yetersiz. Bakiyeni kontrol edip tekrar dene.',
      pl: 'Za mało monet na saldzie. Zsynchronizuj z serwerem i sprawdź.',
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
      ru: 'Не удалось подтвердить аккаунт. Повтори попытку.',
      uk: 'Не вдалося підтвердити акаунт. Спробуйте ще раз.',
      es: 'No se pudo confirmar la cuenta. Inténtalo de nuevo.',
      'pt-BR': 'Não foi possível confirmar a conta. Tente novamente.',
      vi: 'Không thể xác nhận tài khoản. Hãy thử lại.',
      id: 'Tidak dapat mengonfirmasi akun. Coba lagi.',
      tr: 'Hesap doğrulanamadı. Tekrar dene.',
      pl: 'Nie udało się potwierdzić konta. Spróbuj ponownie.',
    }));
    return 'spend_failed';
  }

  const reconciliation = await reconcileShardsBeforePurchase();
  if (reconciliation.status !== 'ready') {
    emitShardPurchaseSyncPendingToast();
    return 'wallet_sync_pending';
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
    void trackExternalShardSpendAchievement(COMMUNITY_PACK_PRICE_SHARDS);
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
    if (isInsufficientCommunityPurchaseError(e)) {
      // После server insufficient не используем обычный restore: он способен
      // протолкнуть свежую локальную метку вверх. Forced server read только
      // зеркалирует авторитетный кошелёк на устройство.
      const authoritativeBalance = await refreshShardsBalanceFromCloudAuthoritative();
      const freshBalance = authoritativeBalance
        ?? await getShardsBalance().catch(() => reconciliation.balance);
      emitAppEvent('shards_balance_updated', { balance: freshBalance });
      return 'insufficient';
    }
    emitAppEvent('action_toast', actionToastTri('error', formatCommunityPurchaseError(e)));
    return 'spend_failed';
  }
}

export type CommunityPackGiftRedeemResult = 'ok' | 'already_owned' | 'redeem_failed';

/**
 * Навсегда добавляет community-набор по активному бонусу «Набор в подарок».
 * Доступ создаёт сервер: он сам проверяет окно недельного бонуса и одноразовость.
 * Локальный ваучер сгорает только после подтверждённого entitlement и сохранения id.
 */
export async function redeemCommunityPackGiftVoucher(
  pack: FlashcardMarketPack,
  studyTarget?: RuntimeStudyTarget,
): Promise<CommunityPackGiftRedeemResult> {
  if (!isCommunityPacksCloudEnabled()) return 'redeem_failed';

  const trial = await getPackGiftTrial(studyTarget, {
    packId: pack.id, packType: 'community', studyTarget: storageStudyTarget(studyTarget),
  });
  if (!trial) return 'redeem_failed';
  if (trial.claimBinding && (
    trial.claimBinding.packId !== pack.id
    || trial.claimBinding.packType !== 'community'
    || trial.claimBinding.studyTarget !== storageStudyTarget(studyTarget)
  )) return 'redeem_failed';

  const buyerStableId = await getCanonicalUserId();
  if (!buyerStableId || !(await ensureFirebaseUserSignedInForCallable())) {
    emitAppEvent('action_toast', actionToastTri('error', {
      ru: 'Не удалось подтвердить аккаунт для подарка. Попробуй ещё раз.',
      uk: 'Не вдалося підтвердити акаунт для подарунка. Спробуй ще раз.',
      es: 'No se pudo confirmar la cuenta para el regalo. Inténtalo de nuevo.',
      'pt-BR': 'Não foi possível confirmar a conta para o presente. Tente novamente.',
      vi: 'Không thể xác nhận tài khoản cho quà tặng. Hãy thử lại.',
      id: 'Akun untuk hadiah tidak dapat dikonfirmasi. Coba lagi.',
      tr: 'Hediye için hesap doğrulanamadı. Tekrar dene.',
      pl: 'Nie udało się potwierdzić konta dla prezentu. Spróbuj ponownie.',
    }));
    return 'redeem_failed';
  }

  try {
    const result = await callFlashcardPackGiftRedeem({
      buyerStableId,
      packId: pack.id,
      packType: 'community',
      studyTarget: storageStudyTarget(studyTarget),
      voucherId: trial.voucherId,
      voucherOccurrenceId: trial.occurrenceId,
    });
    if (result.alreadyOwned) return 'already_owned';
    if (!result.gifted) return 'redeem_failed';

    // Серверный entitlement уже создан. Если локальная запись упадёт, ваучер
    // останется и идемпотентный повтор завершит сохранение на устройстве.
    await bindPackGiftVoucherSelection(trial.localVoucherId, {
      packId: pack.id, packType: 'community', studyTarget: storageStudyTarget(studyTarget), confirmedAt: Date.now(),
    });
    await addCommunityOwnedPackId(pack.id, studyTarget);
    await consumePackGiftTrial(trial.localVoucherId);
    void trackCardPackAcquiredAchievement(studyTarget);
    const titleEs = pack.titleEs.trim() || pack.titleUk.trim() || pack.titleRu.trim() || pack.id;
    emitAppEvent('action_toast', actionToastTri('success', {
      ru: `Набор «${pack.titleRu}» навсегда добавлен в «Карточки».`,
      uk: `Набір «${pack.titleUk}» назавжди додано в «Картки».`,
      es: `El pack «${titleEs}» se añadió para siempre a Tarjetas.`,
      'pt-BR': `O pacote “${pack.titlePtBr || titleEs}” foi adicionado para sempre aos Cartões.`,
      vi: `Bộ thẻ “${pack.titleVi || titleEs}” đã được thêm vĩnh viễn vào Thẻ.`,
      id: `Paket “${pack.titleId || titleEs}” ditambahkan permanen ke Kartu.`,
      tr: `“${pack.titleTr || titleEs}” paketi Kartlara kalıcı olarak eklendi.`,
      pl: `Zestaw „${pack.titlePl || titleEs}” dodano na stałe do Kart.`,
    }));
    return 'ok';
  } catch (error) {
    emitAppEvent('action_toast', actionToastTri('error', formatCommunityPurchaseError(error)));
    return 'redeem_failed';
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
