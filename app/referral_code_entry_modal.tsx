/**
 * ReferralCodeEntryModal — ручной ввод РЕФЕРАЛЬНОГО кода на экране «Друзья».
 *
 * НЕ путать с AddFriendModal («По коду» — поиск друга по friend code): здесь
 * приглашённый вводит код из инвайт-ссылки, чтобы привязаться к пригласившему
 * (тот получит 7 дней доступа, когда этот пользователь пройдёт первый урок).
 *
 * Основной путь привязки — автоматический (deeplink / Play Install Referrer /
 * iOS-буфер). Модалка — фолбэк, прежде всего для iOS, где App Store не передаёт
 * параметры установки.
 *
 * Сетевыми вызовами управляет applyManualReferralCode (referral_bootstrap) —
 * компонент только мапит её статус в человекочитаемый фидбек.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ScreenGradient from '../components/ScreenGradient';
import TapScale from '../components/TapScale';
import { triLang, type Lang } from '../constants/i18n';
import { applyManualReferralCode, type ReferralApplyStatus } from './referral_bootstrap';

type L8 = (
  ru: string, uk: string, es: string, ptBr: string,
  vi: string, id: string, tr: string, pl: string,
) => string;

export interface ReferralCodeEntryModalProps {
  visible: boolean;
  onClose: () => void;
  /** Код успешно применён — родитель может обновить состояние рефералов. */
  onApplied: () => void;
  lang: string;
  // Тема/шрифты/chrome как в friends.tsx (нестрогая типизация объектов темы).
  t: any;
  f: any;
  chrome: any;
}

type Feedback = { kind: 'ok' | 'error'; text: string };

const AUTO_CLOSE_AFTER_APPLY_MS = 1600;

function feedbackForStatus(status: ReferralApplyStatus, L: L8): Feedback {
  switch (status) {
    case 'applied':
      return {
        kind: 'ok',
        text: L(
          'Код применён! Пройди первый урок — и друг получит свои 7 дней.',
          'Код застосовано! Пройди перший урок — і друг отримає свої 7 днів.',
          '¡Código aplicado! Completa la primera lección y tu amigo recibirá sus 7 días.',
          'Código aplicado! Conclua a primeira lição e seu amigo receberá os 7 dias.',
          'Đã áp dụng mã! Hoàn thành bài đầu — bạn của bạn sẽ nhận 7 ngày.',
          'Kode diterapkan! Selesaikan pelajaran pertama — temanmu dapat 7 hari.',
          'Kod uygulandı! İlk dersi bitir — arkadaşın 7 gününü alır.',
          'Kod zastosowany! Ukończ pierwszą lekcję — znajomy dostanie swoje 7 dni.',
        ),
      };
    case 'already':
      return {
        kind: 'ok',
        text: L(
          'Приглашение уже привязано к этому аккаунту.',
          'Запрошення вже привʼязане до цього акаунта.',
          'La invitación ya está vinculada a esta cuenta.',
          'O convite já está vinculado a esta conta.',
          'Lời mời đã được liên kết với tài khoản này.',
          'Undangan sudah terhubung ke akun ini.',
          'Davet zaten bu hesaba bağlı.',
          'Zaproszenie jest już powiązane z tym kontem.',
        ),
      };
    case 'invalid':
      return {
        kind: 'error',
        text: L(
          'Слишком короткий код — проверь и попробуй ещё раз.',
          'Закороткий код — перевір і спробуй ще раз.',
          'Código demasiado corto: revísalo e inténtalo de nuevo.',
          'Código curto demais — confira e tente de novo.',
          'Mã quá ngắn — kiểm tra rồi thử lại.',
          'Kode terlalu pendek — periksa lalu coba lagi.',
          'Kod çok kısa — kontrol edip tekrar dene.',
          'Kod jest za krótki — sprawdź i spróbuj ponownie.',
        ),
      };
    case 'unknown_code':
      return {
        kind: 'error',
        text: L(
          'Код не найден. Проверь, что это код из приглашения Phraseman.',
          'Код не знайдено. Перевір, що це код із запрошення Phraseman.',
          'Código no encontrado. Verifica que sea de una invitación de Phraseman.',
          'Código não encontrado. Confira se é de um convite do Phraseman.',
          'Không tìm thấy mã. Hãy chắc đó là mã từ lời mời Phraseman.',
          'Kode tidak ditemukan. Pastikan dari undangan Phraseman.',
          'Kod bulunamadı. Phraseman davet kodu olduğundan emin ol.',
          'Nie znaleziono kodu. Sprawdź, czy pochodzi z zaproszenia Phraseman.',
        ),
      };
    case 'too_old':
      return {
        kind: 'error',
        text: L(
          'Код приглашения можно применить только в первые 3 дня после начала учёбы.',
          'Код запрошення можна застосувати лише в перші 3 дні після початку навчання.',
          'El código solo puede aplicarse en los primeros 3 días tras empezar.',
          'O código só pode ser aplicado nos primeiros 3 dias após começar.',
          'Chỉ áp dụng được mã trong 3 ngày đầu sau khi bắt đầu học.',
          'Kode hanya bisa dipakai dalam 3 hari pertama setelah mulai.',
          'Kod yalnızca başladıktan sonraki ilk 3 gün içinde uygulanabilir.',
          'Kod można zastosować tylko w ciągu pierwszych 3 dni nauki.',
        ),
      };
    case 'self':
      return {
        kind: 'error',
        text: L(
          'Это твой собственный код — пригласи по нему друга 🙂',
          'Це твій власний код — запроси за ним друга 🙂',
          'Es tu propio código: úsalo para invitar a un amigo 🙂',
          'Esse é o seu próprio código — use-o para convidar um amigo 🙂',
          'Đây là mã của chính bạn — hãy dùng nó để mời bạn bè 🙂',
          'Ini kodemu sendiri — pakai untuk mengundang teman 🙂',
          'Bu senin kendi kodun — onunla bir arkadaşını davet et 🙂',
          'To twój własny kod — zaproś nim znajomego 🙂',
        ),
      };
    case 'needs_link':
      return {
        kind: 'error',
        text: L(
          'Не получилось подключиться к облаку. Код сохранён — попробуем позже автоматически.',
          'Не вдалося підключитися до хмари. Код збережено — спробуємо пізніше автоматично.',
          'No se pudo conectar a la nube. El código quedó guardado: lo reintentaremos automáticamente.',
          'Não foi possível conectar à nuvem. O código foi salvo — tentaremos de novo automaticamente.',
          'Không kết nối được đám mây. Mã đã được lưu — sẽ tự thử lại sau.',
          'Tidak bisa terhubung ke cloud. Kode tersimpan — akan dicoba lagi otomatis.',
          'Buluta bağlanılamadı. Kod kaydedildi — daha sonra otomatik deneyeceğiz.',
          'Nie udało się połączyć z chmurą. Kod zapisany — spróbujemy ponownie automatycznie.',
        ),
      };
    case 'disabled':
      return {
        kind: 'error',
        text: L(
          'Приглашения сейчас недоступны. Попробуй позже.',
          'Запрошення зараз недоступні. Спробуй пізніше.',
          'Las invitaciones no están disponibles ahora. Inténtalo más tarde.',
          'Os convites não estão disponíveis agora. Tente mais tarde.',
          'Lời mời hiện không khả dụng. Thử lại sau nhé.',
          'Undangan sedang tidak tersedia. Coba lagi nanti.',
          'Davetler şu anda kullanılamıyor. Daha sonra dene.',
          'Zaproszenia są teraz niedostępne. Spróbuj później.',
        ),
      };
    case 'error':
    default:
      return {
        kind: 'error',
        text: L(
          'Что-то пошло не так. Проверь интернет и попробуй снова.',
          'Щось пішло не так. Перевір інтернет і спробуй ще раз.',
          'Algo salió mal. Revisa tu conexión e inténtalo de nuevo.',
          'Algo deu errado. Verifique a internet e tente de novo.',
          'Có gì đó không ổn. Kiểm tra mạng rồi thử lại.',
          'Ada yang salah. Periksa internet lalu coba lagi.',
          'Bir şeyler ters gitti. İnterneti kontrol edip tekrar dene.',
          'Coś poszło nie tak. Sprawdź internet i spróbuj ponownie.',
        ),
      };
  }
}

export function ReferralCodeEntryModal({
  visible, onClose, onApplied, lang, t, f, chrome,
}: ReferralCodeEntryModalProps) {
  const L: L8 = (ru, uk, es, ptBr, vi, id, tr, pl) =>
    triLang(lang as Lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Сброс состояния при каждом открытии; чистка таймера автозакрытия.
  useEffect(() => {
    if (visible) {
      setCode('');
      setBusy(false);
      setFeedback(null);
    }
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [visible]);

  const submit = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const status = await applyManualReferralCode(code);
      setFeedback(feedbackForStatus(status, L));
      if (status === 'applied') {
        onApplied();
        closeTimerRef.current = setTimeout(onClose, AUTO_CLOSE_AFTER_APPLY_MS);
      }
    } finally {
      setBusy(false);
    }
  }, [busy, code, onApplied, onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  const canSubmit = code.trim().length >= 4 && !busy;
  const accent = t.accent ?? '#0A84FF';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ScreenGradient forceFullBleed artBackdrop="friends">
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'right', 'bottom', 'left']}>
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              {/* Хедер */}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
                <Text style={{ flex: 1, fontSize: f.h2 ?? 22, fontWeight: '800', color: t.textPrimary }}>
                  {L(
                    'Код приглашения', 'Код запрошення', 'Código de invitación', 'Código de convite',
                    'Mã mời', 'Kode undangan', 'Davet kodu', 'Kod zaproszenia',
                  )}
                </Text>
                <TapScale onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
                  <Ionicons name="close" size={26} color={t.textMuted} />
                </TapScale>
              </View>

              <View style={{ paddingHorizontal: 20, paddingTop: 4, gap: 14 }}>
                <Text style={{ color: t.textMuted, fontSize: f.sub ?? 13, lineHeight: Math.round((f.sub ?? 13) * 1.45) }}>
                  {L(
                    'Тебя пригласили в Phraseman? Введи код из ссылки-приглашения — когда пройдёшь первый урок, пригласивший получит 7 дней доступа. Это не код для добавления в друзья.',
                    'Тебе запросили у Phraseman? Введи код із посилання-запрошення — коли пройдеш перший урок, той, хто запросив, отримає 7 днів доступу. Це не код для додавання в друзі.',
                    '¿Te invitaron a Phraseman? Escribe el código del enlace de invitación: cuando completes la primera lección, quien te invitó recibirá 7 días de acceso. No es el código para agregar amigos.',
                    'Foi convidado para o Phraseman? Digite o código do link de convite: quando concluir a primeira lição, quem convidou recebe 7 dias de acesso. Não é o código de adicionar amigos.',
                    'Bạn được mời vào Phraseman? Nhập mã từ liên kết mời — khi bạn xong bài đầu, người mời sẽ nhận 7 ngày truy cập. Đây không phải mã kết bạn.',
                    'Diundang ke Phraseman? Masukkan kode dari tautan undangan — saat kamu selesai pelajaran pertama, pengundang dapat 7 hari akses. Ini bukan kode tambah teman.',
                    'Phraseman’e mi davet edildin? Davet bağlantısındaki kodu gir — ilk dersi bitirdiğinde davet eden 7 gün erişim kazanır. Bu, arkadaş ekleme kodu değildir.',
                    'Zaproszono cię do Phraseman? Wpisz kod z linku z zaproszeniem — gdy ukończysz pierwszą lekcję, zapraszający dostanie 7 dni dostępu. To nie kod do dodawania znajomych.',
                  )}
                </Text>

                <TextInput
                  testID="referral-code-input"
                  value={code}
                  onChangeText={(v) => {
                    setCode(v.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12));
                    if (feedback) setFeedback(null);
                  }}
                  placeholder={L('Например: K7M2PA', 'Наприклад: K7M2PA', 'Ejemplo: K7M2PA', 'Exemplo: K7M2PA', 'Ví dụ: K7M2PA', 'Contoh: K7M2PA', 'Örnek: K7M2PA', 'Np.: K7M2PA')}
                  placeholderTextColor={t.textMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoFocus
                  maxLength={12}
                  editable={!busy}
                  onSubmitEditing={() => { if (canSubmit) void submit(); }}
                  style={{
                    backgroundColor: chrome.surface,
                    borderWidth: 1,
                    borderColor: feedback?.kind === 'error' ? (t.wrong ?? '#FF453A') : chrome.border,
                    borderRadius: 14,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    color: t.textPrimary,
                    fontSize: 20,
                    fontWeight: '800',
                    letterSpacing: 4,
                    textAlign: 'center',
                  }}
                />

                {feedback && (
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                    <Ionicons
                      name={feedback.kind === 'ok' ? 'checkmark-circle' : 'alert-circle'}
                      size={17}
                      color={feedback.kind === 'ok' ? (t.correct ?? '#34C759') : (t.wrong ?? '#FF453A')}
                      style={{ marginTop: 1 }}
                    />
                    <Text
                      testID="referral-code-feedback"
                      style={{
                        flex: 1,
                        color: feedback.kind === 'ok' ? (t.correct ?? '#34C759') : (t.wrong ?? '#FF453A'),
                        fontSize: f.sub ?? 13,
                        fontWeight: '600',
                        lineHeight: Math.round((f.sub ?? 13) * 1.4),
                      }}
                    >
                      {feedback.text}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  testID="referral-code-submit"
                  onPress={() => { void submit(); }}
                  disabled={!canSubmit}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                    backgroundColor: accent,
                    borderRadius: 16, paddingVertical: 16,
                    opacity: canSubmit ? 1 : 0.55,
                  }}
                >
                  {busy
                    ? <ActivityIndicator color={t.correctText ?? '#fff'} />
                    : <Ionicons name="gift-outline" size={18} color={t.correctText ?? '#fff'} />}
                  <Text style={{ color: t.correctText ?? '#fff', fontSize: f.bodyLg ?? 16, fontWeight: '800' }}>
                    {L('Применить код', 'Застосувати код', 'Aplicar código', 'Aplicar código', 'Áp dụng mã', 'Terapkan kode', 'Kodu uygula', 'Zastosuj kod')}
                  </Text>
                </TouchableOpacity>

                <Text style={{ color: t.textMuted, fontSize: (f.xs ?? 11), textAlign: 'center', lineHeight: Math.round((f.xs ?? 11) * 1.45) }}>
                  {L(
                    'Работает в первые 3 дня после начала учёбы.',
                    'Працює в перші 3 дні після початку навчання.',
                    'Funciona durante los primeros 3 días tras empezar.',
                    'Funciona nos primeiros 3 dias após começar.',
                    'Có hiệu lực trong 3 ngày đầu sau khi bắt đầu.',
                    'Berlaku dalam 3 hari pertama setelah mulai.',
                    'Başladıktan sonraki ilk 3 gün geçerlidir.',
                    'Działa przez pierwsze 3 dni od rozpoczęcia nauki.',
                  )}
                </Text>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </ScreenGradient>
      </SafeAreaProvider>
    </Modal>
  );
}

/* expo-router shim: файл в app/, нужен default-экспорт. */
export default function __RouteShim() { return null; }
