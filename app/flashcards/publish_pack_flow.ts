/**
 * «Открыть сообществу» — отправка своего набора на публикацию с понятным тостом на каждый исход.
 *
 * зачем (cards-section «Действия с набором»: пункт «Открыть сообществу» у набора в списке «Мои наборы»): та же отправка, что
 * кнопка «Опубликовать» внутри набора (flashcards_collection onPublishPack), но без открытия самого набора. Тексты и исходы
 * совпадают; сюда вынесено, чтобы список не тянул за собой экран набора.
 */
import type { Lang } from '../../constants/i18n';
import { actionToastTri, emitAppEvent } from '../events';
import { publishLocalAuthorPack } from '../community_packs/publishLocalPack';
import { PACK_PUBLISH_DAILY_LIMIT_COPY } from '../community_packs/publish_limit_copy';
import type { RuntimeStudyTarget } from '../target_storage_keys';

export type PublishPackFlowResult = 'submitted' | 'daily_limit' | 'invalid' | 'failed';

export async function runPublishPackFlow(packId: string, lang: Lang, studyTarget?: RuntimeStudyTarget): Promise<PublishPackFlowResult> {
  console.log(`[PACK-PUBLISH] список «Мои наборы»: старт packId=${packId} lang=${lang} target=${studyTarget ?? 'нет'}`);
  let res: Awaited<ReturnType<typeof publishLocalAuthorPack>>;
  try {
    res = await publishLocalAuthorPack(packId, lang, studyTarget);
  } catch (error) {
    console.warn(`[PACK-PUBLISH] список «Мои наборы»: исключение packId=${packId}`, error instanceof Error ? error.message : String(error));
    res = 'error' as never;
  }
  console.log(`[PACK-PUBLISH] список «Мои наборы»: итог packId=${packId} res=${String(res)}`);
  if (res === 'submitted') {
    emitAppEvent('action_toast', actionToastTri('success', {
      ru: 'Набор отправлен на публикацию.',
      uk: 'Набір надіслано на публікацію.',
      en: 'Pack submitted for publishing.',
      es: 'El pack se ha enviado para publicarse.',
      'pt-BR': 'O pacote foi enviado para publicação.',
      vi: 'Bộ thẻ đã được gửi để đăng.',
      id: 'Paket dikirim untuk dipublikasikan.',
      tr: 'Paket yayınlanmak üzere gönderildi.',
      pl: 'Zestaw wysłany do publikacji.',
    }));
    return 'submitted';
  }
  if (res === 'daily_limit') {
    emitAppEvent('action_toast', actionToastTri('info', PACK_PUBLISH_DAILY_LIMIT_COPY));
    return 'daily_limit';
  }
  if (res === 'invalid') {
    emitAppEvent('action_toast', actionToastTri('error', {
      ru: 'Для публикации нужны название, описание и достаточное число карточек.',
      uk: 'Для публікації потрібні назва, опис і достатня кількість карток.',
      en: 'Publishing needs a title, a description and enough cards.',
      es: 'Para publicar hacen falta título, descripción y suficientes tarjetas.',
      'pt-BR': 'Para publicar são necessários título, descrição e cartões suficientes.',
      vi: 'Để đăng cần có tiêu đề, mô tả và đủ số thẻ.',
      id: 'Untuk publikasi perlu judul, deskripsi, dan cukup kartu.',
      tr: 'Yayınlamak için başlık, açıklama ve yeterli kart gerekir.',
      pl: 'Do publikacji potrzebny jest tytuł, opis i wystarczająca liczba kart.',
    }));
    return 'invalid';
  }
  emitAppEvent('action_toast', actionToastTri('error', {
    ru: 'Не удалось отправить набор на публикацию.',
    uk: 'Не вдалося надіслати набір на публікацію.',
    en: 'Couldn’t submit the pack for publishing.',
    es: 'No se pudo enviar el pack para publicarse.',
    'pt-BR': 'Não foi possível enviar o pacote para publicação.',
    vi: 'Không thể gửi bộ thẻ để đăng.',
    id: 'Gagal mengirim paket untuk dipublikasikan.',
    tr: 'Paket yayına gönderilemedi.',
    pl: 'Nie udało się wysłać zestawu do publikacji.',
  }));
  return 'failed';
}
