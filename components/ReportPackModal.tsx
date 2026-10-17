// ════════════════════════════════════════════════════════════════════════════
// ReportPackModal.tsx — Скарга на UGC (community) пак карток.
//
// Apple Guideline 1.2 (User-Generated Content): додатки з UGC мають надати
// користувачу простий механізм поскаржитися на контент. Виклик з paywall
// набору, коли набір помічений як community (isCommunityUgc).
//
// зачем (решение владельца 13.10 09:20, реестр cards-020, образец cards-states.html `packReport`):
// «Пожаловаться на набор» — нижняя шторка с выбором причины и полем комментария, а не окно по центру.
// Отправка — тем же путём (submitPackReport), Optimistic UI: шторка закрывается сразу, тост «Жалоба отправлена»,
// при сбое/лимите — тост; ref-замок от двойного тапа. Журнал [PACK-REPORT] — вход, выбор, отправка, ответ, тосты.
// ════════════════════════════════════════════════════════════════════════════

import React, { memo, useEffect, useRef, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Keyboard,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from './ThemeContext';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import type { RuntimeStudyTarget } from '../app/target_storage_keys';
import { isReportThrottledNow, submitPackReport, type PackReportReason } from '../app/user_report';
import { isDevCommunityPackId } from '../app/dev_cards_state';
import { actionToastTri, emitAppEvent } from '../app/events';
import { DebugLogger } from '../app/debug-logger';
import { triLang, type Lang } from '../constants/i18n';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';
import HybridSheetShell from './modal_fx/HybridSheetShell';
import { useGlassSheetContentMaxHeight } from './modal_fx/useGlassSheetContentMaxHeight';

const LOG = '[PACK-REPORT]';

// зачем (ревью Авторизации 13.10): шторка закрывается сразу, а при сбое/лимите причина и комментарий пропадали — человек заполнял всё заново. Черновик по набору живёт в памяти процесса
// (не диск, не durable) до успешной отправки и возвращается в форму при следующем открытии.
const reportDrafts = new Map<string, Readonly<{ reason: PackReportReason; comment: string }>>();

interface Props {
  visible: boolean;
  packId: string;
  packTitle: string;
  authorStableId?: string | null;
  lang: Lang;
  studyTarget?: RuntimeStudyTarget;
  onClose: () => void;
  /** Після приховування набору на цьому пристрої (оновити список у батьківському екрані). Шторка-форма «Скарга» его больше не вызывает (решение 13.10: после отправки только тост). */
  onPackHiddenOnDevice?: (optimisticPackId?: string | null) => void | Promise<void>;
  /** dev-only: витрина движения передаёт вариант; у нижней шторки один вид. */
  motionVariant?: 'classic' | 'hybrid';
}

// зачем: подписи причин на всех 9 языках; образец cards-states `packReport` — шесть причин, радио слева, затем название.
function reasonsFor(lang: Lang): { id: PackReportReason; label: string }[] {
  return [
    { id: 'offensive', label: triLang(lang, { ru: 'Оскорбления / ненависть', uk: 'Образа / ненависть', en: 'Insults or hate', es: 'Insultos u odio', 'pt-BR': 'Insulto ou ódio', vi: 'Xúc phạm / thù ghét', id: 'Hinaan / kebencian', tr: 'Hakaret / nefret', pl: 'Obraza / nienawiść' }) },
    { id: 'sexual', label: triLang(lang, { ru: 'Откровенный контент', uk: 'Відвертий контент', en: 'Explicit content', es: 'Contenido sexual', 'pt-BR': 'Conteúdo explícito', vi: 'Nội dung nhạy cảm', id: 'Konten eksplisit', tr: 'Müstehcen içerik', pl: 'Treści dla dorosłych' }) },
    { id: 'spam', label: triLang(lang, { ru: 'Спам / бессмыслица', uk: 'Спам / нісенітниця', en: 'Spam or nonsense', es: 'Spam', 'pt-BR': 'Spam ou besteira', vi: 'Spam / vô nghĩa', id: 'Spam / tidak bermakna', tr: 'Spam / anlamsız', pl: 'Spam / bezsens' }) },
    { id: 'copyright', label: triLang(lang, { ru: 'Авторское право', uk: 'Авторське право', en: 'Copyright', es: 'Derechos de autor', 'pt-BR': 'Direitos autorais', vi: 'Bản quyền', id: 'Hak cipta', tr: 'Telif hakkı', pl: 'Prawa autorskie' }) },
    { id: 'wrong_translation', label: triLang(lang, { ru: 'Неправильный перевод', uk: 'Неправильний переклад', en: 'Wrong translation', es: 'Traducción incorrecta', 'pt-BR': 'Tradução errada', vi: 'Dịch sai', id: 'Terjemahan salah', tr: 'Yanlış çeviri', pl: 'Błędne tłumaczenie' }) },
    { id: 'other', label: triLang(lang, { ru: 'Другое', uk: 'Інше', en: 'Other', es: 'Otro', 'pt-BR': 'Outro', vi: 'Khác', id: 'Lainnya', tr: 'Diğer', pl: 'Inne' }) },
  ];
}

function ReportPackModal({
  visible,
  packId,
  packTitle,
  authorStableId,
  lang,
  studyTarget,
  onClose,
}: Props) {
  const { f, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const sheetContentMaxHeight = useGlassSheetContentMaxHeight(visible);
  const reasons = reasonsFor(lang);

  const [selected, setSelected] = useState<PackReportReason | null>(null);
  const [comment, setComment] = useState('');

  // зачем: сброс при ОТКРЫТИИ, а не при закрытии — иначе за время анимации ухода шторка мигнула бы пустой формой.
  useEffect(() => {
    if (!visible) return;
    const draft = reportDrafts.get(packId);
    setSelected(draft?.reason ?? null);
    setComment(draft?.comment ?? '');
    if (draft) DebugLogger.info(LOG, `черновик возвращён в форму: pack=${packId} причина=${draft.reason} комментарий=${draft.comment.length} знаков`);
    DebugLogger.info(LOG, `открыта шторка: pack=${packId} target=${String(studyTarget)} lang=${lang} автор=${authorStableId ? 'есть' : 'нет'}`);
  }, [visible, packId, studyTarget, lang, authorStableId]);

  const handleClose = () => {
    Keyboard.dismiss();
    DebugLogger.info(LOG, `шторка закрыта: pack=${packId}`);
    onClose();
  };

  // зачем: «Отправить» сразу закрывает шторку и показывает тост (Optimistic UI); ref-замок не даёт второму тапу
  // в том же кадре отправить жалобу дважды, а откат больше не молчит — человек видит причину тостом.
  const sendInFlightRef = useRef(false);
  const toastError = (reason: string) => {
    hapticError();
    DebugLogger.warn(LOG, `тост ошибки: ${reason}`);
    emitAppEvent('action_toast', actionToastTri('error', {
      ru: 'Жалоба не отправилась. Попробуй ещё раз', uk: 'Скаргу не надіслано. Спробуй ще раз', en: "Couldn't send the report. Try again",
      es: 'No se pudo enviar el reporte. Inténtalo de nuevo', 'pt-BR': 'Não foi possível enviar a denúncia. Tente de novo',
      vi: 'Không gửi được báo cáo. Hãy thử lại', id: 'Laporan gagal dikirim. Coba lagi', tr: 'Şikayet gönderilemedi. Tekrar dene',
      pl: 'Nie udało się wysłać zgłoszenia. Spróbuj ponownie',
    }));
  };
  const handleSend = async (requestDismiss: () => void) => {
    if (!selected) {
      DebugLogger.warn(LOG, 'отправка нажата без причины — пропуск');
      return;
    }
    if (sendInFlightRef.current) {
      DebugLogger.warn(LOG, 'отправка: уже в пути — повторный тап пропущен');
      return;
    }
    sendInFlightRef.current = true;
    const payload = { packId, packTitle, authorStableId, studyTarget, reason: selected, comment: comment.trim() };
    const startedAt = Date.now();
    // зачем (ревью Авторизации 13.10): лимит 30 с проверяем ДО оптимистичного «Жалоба отправлена» — иначе за успехом тут же шёл бы противоречащий тост «Подожди 30 секунд». Шторка остаётся открытой, форма цела.
    if (!isDevCommunityPackId(packId)) {
      let throttledNow = false;
      try {
        throttledNow = await isReportThrottledNow();
      } catch (error: unknown) {
        DebugLogger.warn(LOG, `проверка лимита не удалась (${error instanceof Error ? error.message : String(error)}) — отправляем, сервер решит`);
      }
      if (throttledNow) {
        hapticError();
        DebugLogger.warn(LOG, 'лимит 30 с по локальной отметке: отправка отложена, шторка открыта, тост «Подожди»');
        emitAppEvent('action_toast', actionToastTri('warning', {
          ru: 'Подожди 30 секунд перед следующей жалобой', uk: 'Зачекай 30 секунд перед наступною скаргою', en: 'Wait 30 seconds before the next report',
          es: 'Espera 30 segundos antes de la siguiente denuncia', 'pt-BR': 'Espere 30 segundos antes da próxima denúncia',
          vi: 'Chờ 30 giây trước báo cáo tiếp theo', id: 'Tunggu 30 detik sebelum laporan berikutnya', tr: 'Sonraki şikayetten önce 30 saniye bekle',
          pl: 'Poczekaj 30 sekund przed kolejnym zgłoszeniem',
        }));
        sendInFlightRef.current = false;
        return;
      }
    }
    reportDrafts.set(packId, { reason: selected, comment });
    // зачем (координатор 13.10, кадр cards-059): на демо-наборе (packcards=on) submitPackReport не ходит в сеть — сразу путь успеха; журнал называет это прямо
    const devSkipNetwork = isDevCommunityPackId(packId);
    DebugLogger.info(LOG, `отправка: pack=${packId} причина=${selected} комментарий=${payload.comment.length} знаков target=${String(studyTarget)}${devSkipNetwork ? ' dev=skip_network' : ''}`);
    hapticSuccess();
    emitAppEvent('action_toast', actionToastTri('success', {
      ru: 'Жалоба отправлена', uk: 'Скаргу надіслано', en: 'Report sent', es: 'Denuncia enviada', 'pt-BR': 'Denúncia enviada',
      vi: 'Đã gửi báo cáo', id: 'Laporan terkirim', tr: 'Şikayet gönderildi', pl: 'Zgłoszenie wysłane',
    }));
    requestDismiss();
    try {
      const r = await submitPackReport(payload);
      DebugLogger.info(LOG, `ответ: ${String(r)} за ${Date.now() - startedAt} мс`);
      if (r === 'sent') reportDrafts.delete(packId);
      else DebugLogger.info(LOG, `черновик сохранён для следующего открытия pack=${packId} (ответ ${String(r)})`);
      if (r === 'throttled') {
        hapticError();
        DebugLogger.warn(LOG, 'лимит 30 с: жалоба не принята, показан тост');
        emitAppEvent('action_toast', actionToastTri('warning', {
          ru: 'Подожди 30 секунд перед следующей жалобой', uk: 'Зачекай 30 секунд перед наступною скаргою', en: 'Wait 30 seconds before the next report',
          es: 'Espera 30 segundos antes de la siguiente denuncia', 'pt-BR': 'Espere 30 segundos antes da próxima denúncia',
          vi: 'Chờ 30 giây trước báo cáo tiếp theo', id: 'Tunggu 30 detik sebelum laporan berikutnya', tr: 'Sonraki şikayetten önce 30 saniye bekle',
          pl: 'Poczekaj 30 sekund przed kolejnym zgłoszeniem',
        }));
        return;
      }
      if (r === 'failed') toastError('server_returned_failed');
    } catch (error: unknown) {
      DebugLogger.info(LOG, `черновик сохранён для следующего открытия pack=${packId} (исключение)`);
      toastError(`exception: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      sendInFlightRef.current = false;
    }
  };

  const closeLabel = triLang(lang, { uk: 'Закрити', ru: 'Закрыть', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' });
  const canSend = !!selected;

  return (
    <HybridSheetShell
      visible={visible}
      onClose={handleClose}
      closeLabel={closeLabel}
      testID="report-pack-sheet"
      material="liquid-glass-opaque"
      backdropAccessible={false}
    >
      {({ requestDismiss }) => (
        <View style={{ maxHeight: sheetContentMaxHeight, minHeight: 0, flexShrink: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 }}>
            <Text accessibilityRole="header" maxFontSizeMultiplier={1.15} style={{ color: glass.text, fontSize: 22, fontWeight: '700', flex: 1 }}>
              {triLang(lang, { uk: 'Поскаржитися на набір', ru: 'Пожаловаться на набор', en: 'Report the pack', es: 'Reportar el pack', 'pt-BR': 'Denunciar o pacote', vi: 'Báo cáo bộ thẻ', id: 'Laporkan pack', tr: 'Paketi şikayet et', pl: 'Zgłoś pakiet' })}
            </Text>
            <TouchableOpacity
              testID="report-pack-close"
              onPress={requestDismiss}
              accessibilityRole="button"
              accessibilityLabel={closeLabel}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: glass.opaqueControl, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="close" size={18} color={glass.text} />
              </View>
            </TouchableOpacity>
          </View>

          <ScrollView
            decelerationRate="fast"
            style={{ flexShrink: 1, flexGrow: 0, marginTop: 14 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {reasons.map((r) => {
              const active = selected === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  testID={`report-pack-reason-${r.id}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  onPress={() => { hapticTap(); setSelected(r.id); DebugLogger.info(LOG, `выбрана причина ${r.id}`); }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    minHeight: 52,
                    paddingHorizontal: 16,
                    borderRadius: 16,
                    marginBottom: 8,
                    backgroundColor: active ? glass.selected : glass.buttonFill,
                  }}
                >
                  {/* макет `.opt2`: радио слева, затем название */}
                  <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? glass.cta : glass.opaqueSheet }}>
                    {active ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: glass.ctaInk }} /> : null}
                  </View>
                  <Text style={{ color: glass.text, fontSize: f.body, fontWeight: active ? '700' : '400', flexShrink: 1 }}>{r.label}</Text>
                </TouchableOpacity>
              );
            })}

            <TextInput
              testID="report-pack-comment"
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={500}
              accessibilityLabel={triLang(lang, {
                uk: 'Коментар (необов\'язково)', ru: 'Комментарий (необязательно)', en: 'Comment (optional)', es: 'Comentario (opcional)',
                'pt-BR': 'Comentário (opcional)', vi: 'Bình luận (không bắt buộc)', id: 'Komentar (opsional)', tr: 'Yorum (isteğe bağlı)', pl: 'Komentarz (opcjonalnie)',
              })}
              placeholder={triLang(lang, {
                uk: 'Опиши проблему...', ru: 'Опиши проблему...', en: 'Describe the issue...', es: 'Describe el problema…',
                'pt-BR': 'Descreva o problema...', vi: 'Mô tả vấn đề...', id: 'Jelaskan masalahnya...', tr: 'Sorunu açıkla...', pl: 'Opisz problem...',
              })}
              placeholderTextColor={glass.mutedText}
              style={{
                color: glass.text,
                backgroundColor: glass.opaqueControl,
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: f.body,
                minHeight: 74,
                marginTop: 6,
                textAlignVertical: 'top',
              }}
            />
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 18 }}>
            <TouchableOpacity
              testID="report-pack-cancel"
              onPress={requestDismiss}
              accessibilityRole="button"
              style={{ flex: 1, minHeight: 48, borderRadius: 24, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: glass.buttonFill }}
            >
              <Text style={{ color: glass.text, fontWeight: '700', fontSize: f.body, textAlign: 'center' }}>
                {triLang(lang, { uk: 'Скасувати', ru: 'Отмена', en: 'Cancel', es: 'Cancelar', 'pt-BR': 'Cancelar', vi: 'Hủy', id: 'Batal', tr: 'İptal', pl: 'Anuluj' })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="report-pack-send"
              disabled={!canSend}
              onPress={() => { void handleSend(requestDismiss); }}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSend }}
              style={{ flex: 1.4, minHeight: 48, borderRadius: 24, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: canSend ? glass.cta : glass.buttonFill }}
            >
              <Text style={{ color: canSend ? glass.ctaInk : glass.mutedText, fontWeight: '700', fontSize: f.body, textAlign: 'center' }}>
                {triLang(lang, { uk: 'Надіслати скаргу', ru: 'Отправить жалобу', en: 'Send report', es: 'Enviar denuncia', 'pt-BR': 'Enviar denúncia', vi: 'Gửi báo cáo', id: 'Kirim laporan', tr: 'Şikayeti gönder', pl: 'Wyślij zgłoszenie' })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </HybridSheetShell>
  );
}

export default memo(ReportPackModal);
