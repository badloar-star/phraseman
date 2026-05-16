// ════════════════════════════════════════════════════════════════════════════
// ReportPackModal.tsx — Скарга на UGC (community) пак карток.
//
// Apple Guideline 1.2 (User-Generated Content): додатки з UGC мають надати
// користувачу простий механізм поскаржитися на контент. Виклик з paywall
// набору, коли набір помічений як community (isCommunityUgc).
//
// Логіка:
//   • Запит причини (одна з 6 категорій).
//   • Опціональний коментар (до 500 символів).
//   • Запис у `community_pack_reports` через submitPackReport().
//   • Throttle 30 c (спільний з user_reports).
// ════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from './ThemeContext';
import { hideCommunityPackOnDevice } from '../app/community_packs/communityPackHiddenStorage';
import { submitPackReport, type PackReportReason } from '../app/user_report';
import { triLang, type Lang } from '../constants/i18n';
import { hapticError, hapticSuccess, hapticTap } from '../hooks/use-haptics';

interface Props {
  visible: boolean;
  packId: string;
  packTitle: string;
  authorStableId?: string | null;
  lang: Lang;
  onClose: () => void;
  /** Після приховування набору на цьому пристрої (оновити список у батьківському екрані). */
  onPackHiddenOnDevice?: () => void;
}

const REASONS_RU: { id: PackReportReason; label: string; sub: string }[] = [
  { id: 'offensive',         label: 'Образа / ненависть',  sub: 'Оскорбления, дискриминация, hate speech.' },
  { id: 'sexual',            label: 'Откровенный контент', sub: 'Сексуальный или 18+ контент.' },
  { id: 'spam',              label: 'Спам / бессмыслица',  sub: 'Реклама, повторы, нерелевантные карточки.' },
  { id: 'copyright',         label: 'Авторское право',     sub: 'Контент скопирован без разрешения.' },
  { id: 'wrong_translation', label: 'Неправильный перевод', sub: 'Грубые ошибки, искажение смысла.' },
  { id: 'other',             label: 'Другое',              sub: 'Не подходит под перечисленные причины.' },
];

const REASONS_UK: { id: PackReportReason; label: string; sub: string }[] = [
  { id: 'offensive',         label: 'Образа / ненависть',   sub: 'Образи, дискримінація, hate speech.' },
  { id: 'sexual',            label: 'Відвертий контент',    sub: 'Сексуальний або 18+ контент.' },
  { id: 'spam',              label: 'Спам / нісенітниця',   sub: 'Реклама, повтори, нерелевантні картки.' },
  { id: 'copyright',         label: 'Авторське право',      sub: 'Контент скопійовано без дозволу.' },
  { id: 'wrong_translation', label: 'Неправильний переклад', sub: 'Грубі помилки, спотворення сенсу.' },
  { id: 'other',             label: 'Інше',                 sub: 'Не підходить під перелічені причини.' },
];

const REASONS_ES: { id: PackReportReason; label: string; sub: string }[] = [
  { id: 'offensive', label: 'Insultos u odio', sub: 'Lenguaje ofensivo, discriminación u odio.' },
  { id: 'sexual', label: 'Contenido sexual', sub: 'Contenido explícito o solo para adultos.' },
  { id: 'spam', label: 'Spam', sub: 'Publicidad, repeticiones o tarjetas irrelevantes.' },
  { id: 'copyright', label: 'Derechos de autor', sub: 'Contenido copiado sin permiso.' },
  { id: 'wrong_translation', label: 'Traducción incorrecta', sub: 'Errores graves o sentido distorsionado.' },
  { id: 'other', label: 'Otro', sub: 'No encaja en las categorías anteriores.' },
];

export default function ReportPackModal({
  visible,
  packId,
  packTitle,
  authorStableId,
  lang,
  onClose,
  onPackHiddenOnDevice,
}: Props) {
  const { theme: t, themeMode, f } = useTheme();
  const reasons = lang === 'uk' ? REASONS_UK : lang === 'es' ? REASONS_ES : REASONS_RU;

  const [selected, setSelected] = useState<PackReportReason | null>(null);
  const [comment, setComment]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [throttled, setThrottled] = useState(false);
  const [hiding, setHiding]     = useState(false);

  const reset = () => {
    setSelected(null);
    setComment('');
    setLoading(false);
    setDone(false);
    setThrottled(false);
    setHiding(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSend = async () => {
    if (!selected) return;
    try {
      hapticTap();
      setLoading(true);
      const r = await submitPackReport({
        packId,
        packTitle,
        authorStableId,
        reason: selected,
        comment: comment.trim(),
      });
      setLoading(false);
      if (r === 'throttled') {
        setThrottled(true);
        hapticError();
        return;
      }
      setDone(true);
      hapticSuccess();
    } catch {
      setLoading(false);
      hapticError();
    }
  };

  const overlayBg = 'rgba(0,0,0,0.55)';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: overlayBg,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 18,
        }}
        activeOpacity={1}
        onPress={handleClose}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ width: '100%', maxWidth: 460 }}>
          <View
            style={{
              backgroundColor: t.bgCard,
              borderColor: t.border,
              borderWidth: 1,
              borderRadius: 18,
              padding: 22,
              maxHeight: '85%',
            }}
          >
            {done ? (
              <View style={{ alignItems: 'stretch', paddingVertical: 8 }}>
                <Text style={{ fontSize: 48, marginBottom: 6, textAlign: 'center' }}>✅</Text>
                <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', textAlign: 'center' }}>
                  {triLang(lang, { uk: 'Скаргу надіслано', ru: 'Жалоба отправлена', es: 'Denuncia enviada' })}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.body, marginTop: 10, textAlign: 'center', lineHeight: f.body * 1.45 }}>
                  {triLang(lang, {
                    uk: 'Ваша скарга збережена. Ми розглянемо її найближчим часом. Дякуємо, що допомагаєте зробити каталог безпечнішим.',
                    ru: 'Ваша жалоба сохранена. Мы рассмотрим её в ближайшее время. Спасибо, что помогаете сделать каталог безопаснее.',
                    es: 'Tu reporte quedó registrado. Lo revisaremos pronto. Gracias por ayudar a mantener el catálogo seguro.',
                  })}
                </Text>
                <TouchableOpacity
                  disabled={hiding}
                  onPress={async () => {
                    try {
                      hapticTap();
                      setHiding(true);
                      await hideCommunityPackOnDevice(packId);
                      onPackHiddenOnDevice?.();
                      hapticSuccess();
                      handleClose();
                    } catch {
                      hapticError();
                      setHiding(false);
                    }
                  }}
                  style={{
                    marginTop: 16,
                    backgroundColor: t.bgSurface,
                    borderColor: t.border,
                    borderWidth: 1,
                    borderRadius: 12,
                    paddingVertical: 14,
                    paddingHorizontal: 12,
                    alignItems: 'center',
                    opacity: hiding ? 0.6 : 1,
                  }}
                >
                  {false && hiding ? (
                    <View />
                  ) : (
                    <Text style={{ color: t.textPrimary, fontWeight: '800', fontSize: f.body, textAlign: 'center' }}>
                      {triLang(lang, {
                        uk: 'Не показувати мені цей набір',
                        ru: 'Не показывать мне этот набор',
                        es: 'No volver a mostrarme este pack',
                      })}
                    </Text>
                  )}
                </TouchableOpacity>
                <Text style={{ color: t.textGhost, fontSize: 11, marginTop: 8, textAlign: 'center' }}>
                  {triLang(lang, {
                    uk: 'Лише на цьому пристрої. Можна скинути, перевстановивши застосунок.',
                    ru: 'Только на этом устройстве. Сброс при удалении приложения.',
                    es: 'Solo en este dispositivo. Se restablece si borras la app.',
                  })}
                </Text>
                <TouchableOpacity
                  onPress={handleClose}
                  style={{
                    marginTop: 12,
                    backgroundColor: t.accent,
                    borderRadius: 12,
                    paddingVertical: 14,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: t.correctText, fontWeight: '800' }}>
                    {triLang(lang, { uk: 'Закрити', ru: 'Закрыть', es: 'Cerrar' })}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : throttled ? (
              <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                <Text style={{ fontSize: 48, marginBottom: 8 }}>⏳</Text>
                <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', textAlign: 'center' }}>
                  {triLang(lang, { uk: 'Зачекай 30 секунд', ru: 'Подожди 30 секунд', es: 'Espera 30 segundos' })}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 8, textAlign: 'center' }}>
                  {triLang(lang, {
                    uk: 'Можна надсилати скарги не частіше за раз на 30 с.',
                    ru: 'Можно отправлять жалобы не чаще раза в 30 с.',
                    es: 'Solo se puede enviar una denuncia cada 30 s.',
                  })}
                </Text>
                <TouchableOpacity
                  onPress={handleClose}
                  style={{
                    backgroundColor: t.bgSurface,
                    borderRadius: 12,
                    paddingHorizontal: 22,
                    paddingVertical: 10,
                    marginTop: 16,
                    borderWidth: 1,
                    borderColor: t.border,
                  }}
                >
                  <Text style={{ color: t.textPrimary, fontWeight: '700' }}>OK</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800', marginBottom: 6 }}>
                  {triLang(lang, { uk: 'Поскаржитися на набір', ru: 'Пожаловаться на набор', es: 'Reportar el pack' })}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.caption, marginBottom: 14 }} numberOfLines={2}>
                  {packTitle}
                </Text>

                <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                  {reasons.map((r) => {
                    const active = selected === r.id;
                    return (
                      <TouchableOpacity
                        key={r.id}
                        onPress={() => { hapticTap(); setSelected(r.id); }}
                        style={{
                          backgroundColor: active ? `${t.accent}25` : t.bgSurface,
                          borderColor: active ? t.accent : t.border,
                          borderWidth: 1,
                          borderRadius: 12,
                          padding: 12,
                          marginBottom: 8,
                        }}
                      >
                        <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                          {r.label}
                        </Text>
                        <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 2 }}>
                          {r.sub}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 8, marginBottom: 6 }}>
                    {triLang(lang, {
                      uk: 'Коментар (необов\'язково):',
                      ru: 'Комментарий (необязательно):',
                      es: 'Comentario (opcional):',
                    })}
                  </Text>
                  <TextInput
                    value={comment}
                    onChangeText={setComment}
                    multiline
                    maxLength={500}
                    placeholder={triLang(lang, {
                      uk: 'Опиши проблему...',
                      ru: 'Опиши проблему...',
                      es: 'Describe el problema…',
                    })}
                    placeholderTextColor={t.textGhost}
                    style={{
                      color: t.textPrimary,
                      backgroundColor: t.bgSurface,
                      borderColor: t.border,
                      borderWidth: 1,
                      borderRadius: 12,
                      padding: 12,
                      fontSize: f.body,
                      minHeight: 70,
                      textAlignVertical: 'top',
                    }}
                  />
                  <Text style={{ color: t.textGhost, fontSize: 11, marginTop: 4, textAlign: 'right' }}>
                    {comment.length}/500
                  </Text>
                </ScrollView>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                  <TouchableOpacity
                    onPress={handleClose}
                    style={{
                      flex: 1,
                      backgroundColor: t.bgSurface,
                      borderColor: t.border,
                      borderWidth: 1,
                      borderRadius: 12,
                      paddingVertical: 14,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: t.textPrimary, fontWeight: '700' }}>
                      {triLang(lang, { uk: 'Скасувати', ru: 'Отмена', es: 'Cancelar' })}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={!selected || loading}
                    onPress={handleSend}
                    style={{
                      flex: 1.4,
                      backgroundColor: !selected || loading ? t.bgSurface : t.accent,
                      borderRadius: 12,
                      paddingVertical: 14,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: !selected || loading ? t.border : t.accent,
                      opacity: !selected || loading ? 0.65 : 1,
                    }}
                  >
                    {false && loading ? (
                      <View />
                    ) : (
                      <Text style={{ color: !selected ? t.textMuted : t.correctText, fontWeight: '800' }}>
                        {triLang(lang, { uk: 'Надіслати скаргу', ru: 'Отправить жалобу', es: 'Enviar denuncia' })}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
