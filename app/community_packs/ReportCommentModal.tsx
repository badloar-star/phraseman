/**
 * Жалоба на КОНКРЕТНЫЙ отклик под набором (не на весь набор — для этого уже
 * есть components/ReportPackModal.tsx, переиспользуем тот же паттерн и тот же
 * троттл 30с). Владелец 2026-09-17: «может пожаловаться» — про отдельный
 * комментарий, макет docs/design/pack-comments-and-edit/…html, раздел 2.
 */
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
import HybridSheetShell from '../../components/modal_fx/HybridSheetShell';
import { useGlassSheetContentMaxHeight } from '../../components/modal_fx/useGlassSheetContentMaxHeight';
import { useTheme } from '../../components/ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { submitPackCommentReport, type PackReportReason } from '../user_report';
import { actionToastTri, emitAppEvent } from '../events';
import { triLang, type Lang } from '../../constants/i18n';
import { hapticError, hapticSuccess, hapticTap } from '../../hooks/use-haptics';
import type { PackComment } from './packComments';

interface Props {
  visible: boolean;
  packId: string;
  packTitle: string;
  comment: PackComment | null;
  lang: Lang;
  onClose: () => void;
}

function reasonsFor(lang: Lang): { id: PackReportReason; label: string }[] {
  return [
    { id: 'spam', label: triLang(lang, { ru: 'Спам или реклама', uk: 'Спам або реклама', en: 'Spam or ads', es: 'Spam o publicidad', 'pt-BR': 'Spam ou anúncio', vi: 'Spam hoặc quảng cáo', id: 'Spam atau iklan', tr: 'Spam veya reklam', pl: 'Spam lub reklama' }) },
    { id: 'offensive', label: triLang(lang, { ru: 'Оскорбление', uk: 'Образа', en: 'Insult', es: 'Insulto', 'pt-BR': 'Insulto', vi: 'Xúc phạm', id: 'Penghinaan', tr: 'Hakaret', pl: 'Obraza' }) },
    { id: 'wrong_translation', label: triLang(lang, { ru: 'Не по теме набора', uk: 'Не по темі набору', en: 'Off-topic', es: 'Fuera de tema', 'pt-BR': 'Fora do tema', vi: 'Lạc chủ đề', id: 'Di luar topik', tr: 'Konu dışı', pl: 'Nie na temat' }) },
    { id: 'other', label: triLang(lang, { ru: 'Другое', uk: 'Інше', en: 'Other', es: 'Otro', 'pt-BR': 'Outro', vi: 'Khác', id: 'Lainnya', tr: 'Diğer', pl: 'Inne' }) },
  ];
}

function ReportCommentModal({ visible, packId, packTitle, comment, lang, onClose }: Props) {
  const { f, liquidGlassThemeId } = useTheme();
  // зачем: Liquid Glass 1 в 1 с макета cards.html (reportCm) и overlays-runtime.html
  // (OR-INLINE-REPORT-THROTTLED): непрозрачная шторка, светлая нейтральная CTA темы,
  // радио-строки на тональных плашках без толстых рамок. Логика жалобы не менялась.
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const sheetContentMaxHeight = useGlassSheetContentMaxHeight(visible);
  const reasons = reasonsFor(lang);

  const [selected, setSelected] = useState<PackReportReason | null>(null);
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);
  const [throttled, setThrottled] = useState(false);
  // зачем: родитель обнуляет comment одновременно с visible=false — без запомненного
  // отклика шторка исчезала бы без анимации ухода (раньше возвращали null).
  const lastCommentRef = useRef<PackComment | null>(comment);
  if (comment) lastCommentRef.current = comment;
  const shownComment = comment ?? lastCommentRef.current;

  const reset = () => {
    setSelected(null);
    setNote('');
    setDone(false);
    setThrottled(false);
  };

  // зачем сброс при ОТКРЫТИИ, а не при закрытии: иначе за время анимации ухода
  // шторка мигнула бы пустой формой вместо «Жалоба отправлена».
  useEffect(() => {
    if (visible) reset();
  }, [visible]);

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  const closeLabel = triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' });

  // зачем: «Отправить» сразу показывает «готово» (Optimistic UI); ref-замок не даёт второму тапу
  // в том же кадре отправить жалобу дважды, а откат больше не молчит — человек видит причину.
  const sendInFlightRef = useRef(false);
  const handleSend = async () => {
    if (!selected || !comment) return;
    if (sendInFlightRef.current) {
      console.warn('[REPORT-COMMENT] send: уже в пути — повторный тап пропущен');
      return;
    }
    sendInFlightRef.current = true;
    hapticTap();
    setThrottled(false);
    setDone(true);
    hapticSuccess();
    try {
      const r = await submitPackCommentReport({
        packId,
        packTitle,
        commentId: comment.id,
        commentAuthorStableId: comment.authorId,
        commentText: comment.text,
        reason: selected,
        comment: note.trim(),
      });
      if (r === 'throttled') {
        setDone(false);
        setThrottled(true);
        hapticError();
        return;
      }
      if (r === 'failed') {
        console.warn('[REPORT-COMMENT] send: сервер вернул failed — откат');
        setDone(false);
        hapticError();
        emitAppEvent('action_toast', actionToastTri('error', {
  ru: 'Жалоба не отправилась. Попробуй ещё раз', uk: 'Скаргу не надіслано. Спробуй ще раз', en: "Couldn't send the report. Try again",
  es: 'No se pudo enviar el reporte. Inténtalo de nuevo', 'pt-BR': 'Não foi possível enviar a denúncia. Tente de novo',
  vi: 'Không gửi được báo cáo. Hãy thử lại', id: 'Laporan gagal dikirim. Coba lagi', tr: 'Şikayet gönderilemedi. Tekrar dene',
  pl: 'Nie udało się wysłać zgłoszenia. Spróbuj ponownie',
}));
      }
    } catch (error: unknown) {
      console.warn('[REPORT-COMMENT] send: исключение — откат', error instanceof Error ? error.message : String(error));
      setDone(false);
      hapticError();
      emitAppEvent('action_toast', actionToastTri('error', {
  ru: 'Жалоба не отправилась. Попробуй ещё раз', uk: 'Скаргу не надіслано. Спробуй ще раз', en: "Couldn't send the report. Try again",
  es: 'No se pudo enviar el reporte. Inténtalo de nuevo', 'pt-BR': 'Não foi possível enviar a denúncia. Tente de novo',
  vi: 'Không gửi được báo cáo. Hãy thử lại', id: 'Laporan gagal dikirim. Coba lagi', tr: 'Şikayet gönderilemedi. Tekrar dene',
  pl: 'Nie udało się wysłać zgłoszenia. Spróbuj ponownie',
}));
    } finally {
      sendInFlightRef.current = false;
    }
  };

  if (!shownComment) return null;

  const primaryCta = (label: string, onPress: () => void) => (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      style={{ marginTop: 18, alignSelf: 'stretch', minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, backgroundColor: glass.accent }}
    >
      <Text style={{ color: glass.accentInk, fontWeight: '700', fontSize: f.body }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <HybridSheetShell
      visible={visible}
      onClose={handleClose}
      closeLabel={closeLabel}
      testID="report-comment-sheet"
      material="liquid-glass-opaque"
      glowColor={glass.cta}
      backdropAccessible={false}
    >
      {({ requestDismiss }) => (
        <View style={{ maxHeight: sheetContentMaxHeight, minHeight: 0, flexShrink: 1 }}>
          {done ? (
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <View style={{ width: 55, height: 55, borderRadius: 16, backgroundColor: glass.opaqueControl, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <Ionicons name="checkmark" size={26} color={glass.text} />
              </View>
              <Text accessibilityRole="header" style={{ color: glass.text, fontSize: 23, fontWeight: '700', textAlign: 'center' }}>
                {triLang(lang, { ru: 'Жалоба отправлена', uk: 'Скаргу надіслано', en: 'Report sent', es: 'Denuncia enviada', 'pt-BR': 'Denúncia enviada', vi: 'Đã gửi báo cáo', id: 'Laporan terkirim', tr: 'Şikayet gönderildi', pl: 'Zgłoszenie wysłane' })}
              </Text>
              <Text style={{ color: glass.secondary, fontSize: f.body, marginTop: 8, textAlign: 'center' }}>
                {triLang(lang, {
                  ru: 'Автор набора решит, что делать. Комментарий пока останется виден остальным.',
                  uk: 'Автор набору вирішить, що робити. Коментар поки залишиться видимим іншим.',
                  en: 'The pack author will decide what to do. The comment stays visible to others for now.',
                  es: 'El autor del pack decidirá qué hacer. El comentario sigue visible para los demás por ahora.',
                  'pt-BR': 'O autor do pacote vai decidir o que fazer. O comentário continua visível para os outros por enquanto.',
                  vi: 'Tác giả bộ thẻ sẽ quyết định. Bình luận vẫn hiển thị với người khác trong lúc này.',
                  id: 'Penulis paket akan memutuskan. Komentar tetap terlihat oleh yang lain untuk saat ini.',
                  tr: 'Paket yazarı ne yapılacağına karar verecek. Yorum şimdilik diğerlerine görünür kalır.',
                  pl: 'Autor zestawu zdecyduje, co dalej. Komentarz na razie pozostaje widoczny dla innych.',
                })}
              </Text>
              {primaryCta(closeLabel, requestDismiss)}
            </View>
          ) : throttled ? (
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <View style={{ width: 68, height: 68, borderRadius: 23, backgroundColor: glass.opaqueControl, alignItems: 'center', justifyContent: 'center', marginBottom: 15 }}>
                <Ionicons name="flag-outline" size={26} color={glass.text} />
              </View>
              <Text accessibilityRole="header" style={{ color: glass.text, fontSize: 23, fontWeight: '700', textAlign: 'center' }}>
                {triLang(lang, { ru: 'Подожди 30 секунд', uk: 'Зачекай 30 секунд', en: 'Wait 30 seconds', es: 'Espera 30 segundos', 'pt-BR': 'Espere 30 segundos', vi: 'Chờ 30 giây', id: 'Tunggu 30 detik', tr: '30 saniye bekle', pl: 'Poczekaj 30 sekund' })}
              </Text>
              {primaryCta(closeLabel, requestDismiss)}
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 }}>
                <Text accessibilityRole="header" style={{ color: glass.text, fontSize: 22, fontWeight: '700', flex: 1 }}>
                  {triLang(lang, { ru: 'Пожаловаться на комментарий', uk: 'Поскаржитися на коментар', en: 'Report this comment', es: 'Denunciar el comentario', 'pt-BR': 'Denunciar o comentário', vi: 'Báo cáo bình luận', id: 'Laporkan komentar', tr: 'Yorumu şikayet et', pl: 'Zgłoś komentarz' })}
                </Text>
                <TouchableOpacity
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

              <ScrollView style={{ flexShrink: 1, flexGrow: 0 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" decelerationRate="fast">
                <View style={{ backgroundColor: glass.opaqueControl, borderRadius: 16, padding: 14, marginTop: 6, marginBottom: 14 }}>
                  <Text style={{ color: glass.secondary, fontSize: f.body }}>
                    {shownComment.authorName}: «{shownComment.text}»
                  </Text>
                </View>

                {reasons.map((r, idx) => {
                  const active = selected === r.id;
                  return (
                    <TouchableOpacity
                      key={`${r.id}_${idx}`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      onPress={() => { hapticTap(); setSelected(r.id); }}
                      style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                        minHeight: 52, paddingHorizontal: 16, borderRadius: 16, marginBottom: 8,
                        backgroundColor: active ? glass.selected : glass.buttonFill,
                      }}
                    >
                      <Text style={{ color: glass.text, fontSize: f.body, fontWeight: active ? '700' : '400', flexShrink: 1 }}>{r.label}</Text>
                      <View style={{
                        width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
                        backgroundColor: active ? glass.cta : glass.opaqueSheet,
                      }}>
                        {active ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: glass.ctaInk }} /> : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}

                <TextInput
                  value={note}
                  onChangeText={setNote}
                  multiline
                  maxLength={500}
                  placeholder={triLang(lang, { ru: 'Комментарий (необязательно)…', uk: 'Коментар (необов\'язково)…', en: 'Comment (optional)…', es: 'Comentario (opcional)…', 'pt-BR': 'Comentário (opcional)…', vi: 'Bình luận (không bắt buộc)…', id: 'Komentar (opsional)…', tr: 'Yorum (isteğe bağlı)…', pl: 'Komentarz (opcjonalnie)…' })}
                  placeholderTextColor={glass.mutedText}
                  accessibilityLabel={triLang(lang, { ru: 'Комментарий к жалобе', uk: 'Коментар до скарги', en: 'Report comment', es: 'Comentario de la denuncia', 'pt-BR': 'Comentário da denúncia', vi: 'Bình luận báo cáo', id: 'Komentar laporan', tr: 'Şikayet yorumu', pl: 'Komentarz zgłoszenia' })}
                  style={{ color: glass.text, backgroundColor: glass.opaqueControl, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: f.body, minHeight: 64, marginTop: 4, textAlignVertical: 'top' }}
                />
              </ScrollView>

              <TouchableOpacity
                disabled={!selected}
                onPress={handleSend}
                accessibilityRole="button"
                accessibilityState={{ disabled: !selected }}
                style={{
                  marginTop: 16, minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: selected ? glass.cta : glass.buttonFill,
                }}
              >
                <Text style={{ color: selected ? glass.ctaInk : glass.mutedText, fontWeight: '700', fontSize: f.body }}>
                  {triLang(lang, { ru: 'Отправить жалобу', uk: 'Надіслати скаргу', en: 'Send report', es: 'Enviar denuncia', 'pt-BR': 'Enviar denúncia', vi: 'Gửi báo cáo', id: 'Kirim laporan', tr: 'Şikayeti gönder', pl: 'Wyślij zgłoszenie' })}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </HybridSheetShell>
  );
}

export default memo(ReportCommentModal);
