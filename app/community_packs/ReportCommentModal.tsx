/**
 * Жалоба на КОНКРЕТНЫЙ отклик под набором (не на весь набор — для этого уже
 * есть components/ReportPackModal.tsx, переиспользуем тот же паттерн и тот же
 * троттл 30с). Владелец 2026-09-17: «может пожаловаться» — про отдельный
 * комментарий, макет docs/design/pack-comments-and-edit/…html, раздел 2.
 */
import React, { memo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../components/ThemeContext';
import { submitPackCommentReport, type PackReportReason } from '../user_report';
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
  const { theme: t, f } = useTheme();
  const reasons = reasonsFor(lang);

  const [selected, setSelected] = useState<PackReportReason | null>(null);
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);
  const [throttled, setThrottled] = useState(false);

  const reset = () => {
    setSelected(null);
    setNote('');
    setDone(false);
    setThrottled(false);
  };

  const handleClose = () => {
    Keyboard.dismiss();
    reset();
    onClose();
  };

  const handleSend = async () => {
    if (!selected || !comment) return;
    hapticTap();
    setThrottled(false);
    setDone(true);
    hapticSuccess();
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
      setDone(false);
      hapticError();
    }
  };

  if (!comment) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} activeOpacity={1} onPress={handleClose}>
        <View style={{ flex: 1 }} />
      </TouchableOpacity>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
      >
        <View style={{ backgroundColor: t.bgPrimary, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 18, paddingBottom: Platform.OS === 'ios' ? 30 : 18 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: t.bgSurface2 ?? t.bgSurface, alignSelf: 'center', marginBottom: 14 }} />

          {done ? (
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <Ionicons name="checkmark-circle" size={46} color={t.accent} style={{ marginBottom: 8 }} />
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', textAlign: 'center' }}>
                {triLang(lang, { ru: 'Жалоба отправлена', uk: 'Скаргу надіслано', en: 'Report sent', es: 'Denuncia enviada', 'pt-BR': 'Denúncia enviada', vi: 'Đã gửi báo cáo', id: 'Laporan terkirim', tr: 'Şikayet gönderildi', pl: 'Zgłoszenie wysłane' })}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 8, textAlign: 'center' }}>
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
              <TouchableOpacity
                onPress={handleClose}
                accessibilityRole="button"
                style={{ marginTop: 18, backgroundColor: t.accent, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 30, alignSelf: 'stretch', alignItems: 'center' }}
              >
                <Text style={{ color: t.correctText, fontWeight: '800' }}>
                  {triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' })}
                </Text>
              </TouchableOpacity>
            </View>
          ) : throttled ? (
            <View style={{ alignItems: 'center', paddingVertical: 16 }}>
              <Ionicons name="hourglass-outline" size={44} color={t.textMuted} style={{ marginBottom: 8 }} />
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', textAlign: 'center' }}>
                {triLang(lang, { ru: 'Подожди 30 секунд', uk: 'Зачекай 30 секунд', en: 'Wait 30 seconds', es: 'Espera 30 segundos', 'pt-BR': 'Espere 30 segundos', vi: 'Chờ 30 giây', id: 'Tunggu 30 detik', tr: '30 saniye bekle', pl: 'Poczekaj 30 sekund' })}
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                accessibilityRole="button"
                style={{ marginTop: 16, backgroundColor: t.bgSurface, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 }}
              >
                <Text style={{ color: t.textPrimary, fontWeight: '700' }}>
                  {triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' })}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', marginBottom: 4 }}>
                {triLang(lang, { ru: 'Пожаловаться на комментарий', uk: 'Поскаржитися на коментар', en: 'Report this comment', es: 'Denunciar el comentario', 'pt-BR': 'Denunciar o comentário', vi: 'Báo cáo bình luận', id: 'Laporkan komentar', tr: 'Yorumu şikayet et', pl: 'Zgłoś komentarz' })}
              </Text>
              <View style={{ backgroundColor: t.bgSurface, borderRadius: 14, padding: 12, marginTop: 10, marginBottom: 14 }}>
                <Text style={{ color: t.textSecond, fontSize: f.caption }} numberOfLines={3}>
                  {comment.authorName}: «{comment.text}»
                </Text>
              </View>

              <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {reasons.map((r, idx) => {
                  const active = selected === r.id;
                  return (
                    <TouchableOpacity
                      key={`${r.id}_${idx}`}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      onPress={() => { hapticTap(); setSelected(r.id); }}
                      style={{
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        paddingVertical: 13, paddingHorizontal: 4,
                        borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: t.border,
                      }}
                    >
                      <Text style={{ color: t.textPrimary, fontSize: f.body }}>{r.label}</Text>
                      <View style={{
                        width: 20, height: 20, borderRadius: 10,
                        backgroundColor: active ? t.accent : t.bgSurface2 ?? t.bgSurface,
                      }} />
                    </TouchableOpacity>
                  );
                })}

                <TextInput
                  value={note}
                  onChangeText={setNote}
                  multiline
                  maxLength={500}
                  placeholder={triLang(lang, { ru: 'Комментарий (необязательно)…', uk: 'Коментар (необов\'язково)…', en: 'Comment (optional)…', es: 'Comentario (opcional)…', 'pt-BR': 'Comentário (opcional)…', vi: 'Bình luận (không bắt buộc)…', id: 'Komentar (opsional)…', tr: 'Yorum (isteğe bağlı)…', pl: 'Komentarz (opcjonalnie)…' })}
                  placeholderTextColor={t.textGhost}
                  accessibilityLabel={triLang(lang, { ru: 'Комментарий к жалобе', uk: 'Коментар до скарги', en: 'Report comment', es: 'Comentario de la denuncia', 'pt-BR': 'Comentário da denúncia', vi: 'Bình luận báo cáo', id: 'Komentar laporan', tr: 'Şikayet yorumu', pl: 'Komentarz zgłoszenia' })}
                  style={{ color: t.textPrimary, backgroundColor: t.bgSurface, borderRadius: 12, padding: 12, fontSize: f.body, minHeight: 60, marginTop: 10, textAlignVertical: 'top' }}
                />
              </ScrollView>

              <TouchableOpacity
                disabled={!selected}
                onPress={handleSend}
                accessibilityRole="button"
                accessibilityState={{ disabled: !selected }}
                style={{
                  marginTop: 14, backgroundColor: !selected ? t.bgSurface : t.wrong,
                  borderRadius: 14, paddingVertical: 14, alignItems: 'center', opacity: !selected ? 0.6 : 1,
                }}
              >
                <Text style={{ color: !selected ? t.textMuted : '#fff', fontWeight: '800', fontSize: f.body }}>
                  {triLang(lang, { ru: 'Отправить жалобу', uk: 'Надіслати скаргу', en: 'Send report', es: 'Enviar denuncia', 'pt-BR': 'Enviar denúncia', vi: 'Gửi báo cáo', id: 'Kirim laporan', tr: 'Şikayeti gönder', pl: 'Wyślij zgłoszenie' })}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default memo(ReportCommentModal);
