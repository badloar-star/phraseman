import Ionicons from '@expo/vector-icons/Ionicons';
import { actionToastTri, emitAppEvent } from './events';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import BouncyScrollView from '../components/BouncyScrollView';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import ScreenBackButton, { ScreenBackZone } from '../components/v2/ScreenBackButton';
import { useTheme } from '../components/ThemeContext';
import { GlassSwitch } from '../components/settings/GlassSwitch';
import { nestedBoxShadow, PlateFill, plateBoxShadow } from '../components/v2/ShadowSurface';
import {
  isFcAutoSpeakEnabled,
  isFcSfxEnabled,
  playSfx,
  setFcAutoSpeakEnabled,
  setFcSfxEnabled,
} from './flashcards/SoundService';
import {
  applyUserSettingsNow,
  getUserSettingsSnapshot,
  loadSettings,
  type UserSettings,
} from './user_settings_store';
import { safeRouterBack } from './navigation_back';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import BackGlyph from '../components/v2/BackGlyph';

export {
  DEFAULT_SETTINGS,
  applyUserSettingsNow,
  getUserSettingsSnapshot,
  hydrateUserSettingsFromStorage,
  loadSettings,
  normalizeSpeechRate,
  saveSettings,
  type UserSettings,
} from './user_settings_store';

type RowKey = Exclude<keyof UserSettings, 'speechRate' | 'speechVoiceId'>;

type LocalSwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  testID?: string;
  accessibilityLabel: string;
  glass: ReturnType<typeof liquidGlassTokens>;
};

function LocalSwitch({ value, onValueChange, testID, accessibilityLabel, glass }: LocalSwitchProps) {
  // зачем (ТОП-20 №3, 05.11): копия тумблера заменена общим GlassSwitch — плавный бегунок на UI-потоке, лёгкий хаптик, Reduce Motion.
  return <GlassSwitch testID={testID} accessibilityLabel={accessibilityLabel} value={value} onValueChange={onValueChange} glass={glass} />;
}


export default function SettingsEdu() {
  const router = useRouter();
  const { theme: t, liquidGlassThemeId } = useTheme();
  const { lang, s: loc } = useLang();
  const insets = useStableSafeAreaInsets();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const [s, setS] = useState<UserSettings>(() => getUserSettingsSnapshot());
  // E9: тумблеры раздела карточек — «Звуковые эффекты» (fc_sfx_on) и
  // «Автопроизношение» (fc_autospeak_on), оба дефолт true (SoundService).
  const [fcSfx, setFcSfx] = useState(() => isFcSfxEnabled());
  const [fcAutoSpeak, setFcAutoSpeak] = useState(() => isFcAutoSpeakEnabled());
  // зачем (владелец 11.11.2026: «убирай голос телефона из настроек вообще»; ползунок скорости — «убрать вместе с голосом»):
  // строка «Голос озвучки» и карточка скорости сняты с экрана вместе со своим состоянием. Курсы звучат записями,
  // а голос телефона (карточки и случаи без записи) — голосом по умолчанию с обычной скоростью.

  // зачем (координатор 12.10, аудит Optimistic UI R1): поздний ответ loadSettings() не имеет права затереть переключатель, который человек уже тронул — версия правок сверяется до применения.
  const editVersionRef = useRef(0);
  useFocusEffect(
    useCallback(() => {
      const loadStartedAtVersion = editVersionRef.current;
      void loadSettings().then((loaded) => {
        if (editVersionRef.current !== loadStartedAtVersion) {
          console.log(`[OPT-UI] settings_edu load ignored: пользователь уже менял настройки (v${loadStartedAtVersion}→v${editVersionRef.current})`); // guard-ok: ранний выход называет причину
          return;
        }
        setS(loaded);
      }).catch((error: unknown) => {
        // зачем (логи, settings-gaps-states): сбой чтения настроек оставлял значения снимка без причины в журнале
        console.warn(`[SETTINGS-EDU] load_settings_failed reason=${error instanceof Error ? error.message : String(error)}`);
      });
      setFcSfx(isFcSfxEnabled());
      setFcAutoSpeak(isFcAutoSpeakEnabled());
    }, []),
  );

  // зачем (координатор 12.10, аудит Optimistic UI R1, E4/E6): запись больше не живёт внутри обновителя состояния (двойной вызов в StrictMode = двойная запись); при отказе хранилища откатывается ТОЛЬКО эта строка и только если её не успели изменить снова.
  const latestSettingsRef = useRef(s);
  latestSettingsRef.current = s;
  const update = (key: RowKey, val: boolean) => {
    editVersionRef.current += 1;
    // зачем: отдельное «значение на начало жеста» было нужно только ползунку скорости (снят 11.11.2026) — у
    // переключателя промежуточных значений нет, откат берёт состояние до нажатия
    const previous = latestSettingsRef.current;
    const next = { ...latestSettingsRef.current, [key]: val };
    latestSettingsRef.current = next;
    setS(next);
    void applyUserSettingsNow(next).then((persisted) => {
      if (persisted) return;
      if (latestSettingsRef.current[key] !== val) {
        console.log(`[OPT-UI] settings_edu rollback skipped key=${String(key)}: значение уже изменено позже`); // guard-ok: ранний выход называет причину
        return;
      }
      console.warn(`[OPT-UI] settings_edu rollback key=${String(key)} ${String(val)} → ${String(previous[key])}: запись не удалась`); // guard-ok: откат называет причину
      const reverted = { ...latestSettingsRef.current, [key]: previous[key] };
      latestSettingsRef.current = reverted;
      setS(reverted);
      void applyUserSettingsNow(reverted);
      emitAppEvent('action_toast', actionToastTri('error', {
        ru: 'Настройка не сохранилась — попробуй ещё раз.', uk: 'Налаштування не збереглося — спробуй ще раз.', en: "The setting didn’t save — try again.", es: 'El ajuste no se guardó: inténtalo otra vez.',
        'pt-BR': 'A configuração não foi salva — tente de novo.', vi: 'Chưa lưu được cài đặt — thử lại nhé.', id: 'Pengaturan belum tersimpan — coba lagi.', tr: 'Ayar kaydedilmedi — tekrar dene.', pl: 'Ustawienie się nie zapisało — spróbuj jeszcze raz.',
      }));
    });
  };

  const L = (m: Record<string, string>): string => m[lang] ?? m.ru;

  const rows: { key: RowKey; label: string; sub: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    {
      key: 'autoCheck',
      icon: 'checkmark-outline', // зачем: паритет profile.html PRF-05 (13.10): значок «check» макета
      label: L({
        ru: 'Автопроверка',
        uk: 'Автоперевірка',
        en: 'Auto-check',
        es: 'Comprobación automática',
        'pt-BR': 'Verificação automática',
        vi: 'Tự động kiểm tra',
        id: 'Periksa otomatis',
        tr: 'Otomatik kontrol',
        pl: 'Automatyczne sprawdzanie',
      }),
      sub: L({
        ru: 'Проверять при наборе последнего слова',
        uk: 'Перевіряти при наборі останнього слова',
        en: 'Check when the last word is typed',
        es: 'Comprobar al escribir la última palabra',
        'pt-BR': 'Verificar ao digitar a última palavra',
        vi: 'Kiểm tra khi nhập từ cuối cùng',
        id: 'Periksa saat mengetik kata terakhir',
        tr: 'Son kelimeyi yazınca kontrol et',
        pl: 'Sprawdzaj po wpisaniu ostatniego słowa',
      }),
    },
    {
      key: 'autoAdvance',
      icon: 'arrow-forward-outline',
      label: L({
        ru: 'Автопереход после ответа',
        uk: 'Автоперехід після відповіді',
        en: 'Advance after answering',
        es: 'Siguiente automático',
        'pt-BR': 'Avançar automaticamente',
        vi: 'Tự động chuyển tiếp',
        id: 'Lanjut otomatis',
        tr: 'Otomatik ilerleme',
        pl: 'Automatyczne przejście dalej',
      }),
      // зачем (Сверка profile-007, profile.html education): подпись короткая, как в макете.
      sub: L({
        ru: 'Следующее задание откроется само',
        uk: 'Наступне завдання відкриється саме',
        en: 'The next task opens by itself',
        es: 'La siguiente tarea se abre sola',
        'pt-BR': 'A próxima tarefa abre sozinha',
        vi: 'Bài tiếp theo tự mở',
        id: 'Soal berikutnya terbuka sendiri',
        tr: 'Sonraki görev kendiliğinden açılır',
        pl: 'Kolejne zadanie otworzy się samo',
      }),
    },
    {
      key: 'hardMode',
      icon: 'create-outline', // зачем: паритет profile.html PRF-05 (13.10): значок «edit» макета
      label: L({
        ru: 'Ввод с клавиатуры',
        uk: 'Введення з клавіатури',
        en: 'Type with keyboard',
        es: 'Escribir con el teclado',
        'pt-BR': 'Digitar no teclado',
        vi: 'Nhập bằng bàn phím',
        id: 'Ketik dengan keyboard',
        tr: 'Klavyeyle yazma',
        pl: 'Wpisywanie z klawiatury',
      }),
      sub: L({
        ru: 'Вводить ответ вручную',
        uk: 'Вводити відповідь вручну',
        en: 'Type the answer yourself',
        es: 'Escribir la respuesta a mano',
        'pt-BR': 'Digitar a resposta',
        vi: 'Tự gõ câu trả lời',
        id: 'Ketik jawaban sendiri',
        tr: 'Cevabı elle yaz',
        pl: 'Wpisuj odpowiedź ręcznie',
      }),
    },
    {
      key: 'haptics',
      icon: 'flash-outline',
      label: L({
        ru: 'Вибрация при ошибке',
        uk: 'Вібрація при помилці',
        en: 'Vibrate on mistakes',
        es: 'Vibración al fallar',
        'pt-BR': 'Vibração ao errar',
        vi: 'Rung khi sai',
        id: 'Getar saat salah',
        tr: 'Hatada titreşim',
        pl: 'Wibracja przy błędzie',
      }),
      sub: L({
        // зачем: раздела «Внешний вид и отклик» больше нет — называем сам переключатель «Тактильный отклик» (он в Настройках, группа «Обучение»).
        ru: 'Работает при включённом тактильном отклике (Настройки → «Тактильный отклик»)',
        uk: 'Працює за увімкненого тактильного відгуку (Параметри → «Тактильний відгук»)',
        en: 'Works when haptic feedback is enabled (Settings → “Haptic feedback”)',
        es: 'Requiere la respuesta háptica activa (Ajustes → «Respuesta háptica»)',
        'pt-BR': 'Requer a resposta tátil ativa (Configurações → “Resposta tátil”)',
        vi: 'Cần bật phản hồi rung (Cài đặt → “Phản hồi rung”)',
        id: 'Perlu umpan balik haptik aktif (Pengaturan → “Umpan balik haptik”)',
        tr: 'Dokunsal geri bildirim açık olmalı (Ayarlar → “Dokunsal geri bildirim”)',
        pl: 'Wymaga włączonej reakcji haptycznej (Ustawienia → „Reakcja haptyczna”)',
      }),
    },
  ];

  // зачем (логи, settings-gaps-states): тумблер звука меняется сразу (Optimistic UI), а сбой записи раньше терялся молча
  const logToggleSaveFailure = (key: string, revert?: () => void) => (error: unknown) => {
    console.warn(`[SETTINGS-EDU] toggle_save_failed key=${key} reason=${error instanceof Error ? error.message : String(error)}`);
    // зачем (аудит Optimistic UI R1): переключатель показывал «включено», хотя запись не удалась и после перезапуска значение возвращалось молча — откат + сообщение.
    if (revert) {
      revert();
      emitAppEvent('action_toast', actionToastTri('error', {
        ru: 'Настройка не сохранилась — попробуй ещё раз.', uk: 'Налаштування не збереглося — спробуй ще раз.', en: "The setting didn’t save — try again.", es: 'El ajuste no se guardó: inténtalo otra vez.',
        'pt-BR': 'A configuração não foi salva — tente de novo.', vi: 'Chưa lưu được cài đặt — thử lại nhé.', id: 'Pengaturan belum tersimpan — coba lagi.', tr: 'Ayar kaydedilmedi — tekrar dene.', pl: 'Ustawienie się nie zapisało — spróbuj jeszcze raz.',
      }));
    }
  };

  const soundRows = [
    {
      testID: 'fc-sfx-toggle',
      value: fcSfx,
      label: L({ ru: 'Звуковые эффекты', uk: 'Звукові ефекти', en: 'Sound effects', es: 'Efectos de sonido', 'pt-BR': 'Efeitos sonoros', vi: 'Hiệu ứng âm thanh', id: 'Efek suara', tr: 'Ses efektleri', pl: 'Efekty dźwiękowe' }),
      sub: L({ ru: 'Короткие звуки в карточках и тренировках', uk: 'Короткі звуки у картках і тренуваннях', en: 'Brief sounds in cards and training', es: 'Sonidos breves en tarjetas y entrenamientos', 'pt-BR': 'Sons curtos em cartões e treinos', vi: 'Âm thanh ngắn trong thẻ và luyện tập', id: 'Suara singkat di kartu dan latihan', tr: 'Kartlarda ve antrenmanlarda kısa sesler', pl: 'Krótkie dźwięki w kartach i ćwiczeniach' }),
      icon: 'volume-high' as const, // зачем (Сверка settings-gap-015, макет settings-gaps-states): значок звука в макете залитый, не контурный
      onValueChange: (value: boolean) => {
        setFcSfx(value);
        void Promise.resolve(setFcSfxEnabled(value)).catch(logToggleSaveFailure('fc_sfx', () => setFcSfx((current) => (current === value ? !value : current))));
        // зачем (раунд 2, Настройки п.4, одобрено владельцем 05.11): при включении — короткий звук «верно», чтобы сразу слышать, что включилось (кэш флага ставится синхронно в setFcSfxEnabled)
        if (value) playSfx('correct');
      },
    },
    {
      testID: 'fc-autospeak-toggle',
      value: fcAutoSpeak,
      label: L({ ru: 'Автопроизношение', uk: 'Автовимова', en: 'Auto pronunciation', es: 'Pronunciación automática', 'pt-BR': 'Pronúncia automática', vi: 'Tự động phát âm', id: 'Pelafalan otomatis', tr: 'Otomatik telaffuz', pl: 'Automatyczna wymowa' }),
      // зачем (D188-следствие, 14.10): озвучка работает для любого изучаемого языка — подпись не называет английский.
      sub: L({ ru: 'Озвучивать фразу после ответа', uk: 'Озвучувати вислів після відповіді', en: 'Read the phrase aloud after answering', es: 'Leer la frase después de responder', 'pt-BR': 'Ler a frase após responder', vi: 'Đọc câu sau khi trả lời', id: 'Bacakan frasa setelah menjawab', tr: 'Cevaptan sonra ifadeyi oku', pl: 'Odczytaj zdanie po odpowiedzi' }),
      icon: 'volume-high' as const, // зачем (Сверка settings-gap-015, макет settings-gaps-states): значок звука в макете залитый, не контурный
      onValueChange: (value: boolean) => { setFcAutoSpeak(value); void Promise.resolve(setFcAutoSpeakEnabled(value)).catch(logToggleSaveFailure('fc_autospeak', () => setFcAutoSpeak((current) => (current === value ? !value : current)))); },
    },
  ];

  const RowIcon = ({ name }: { name: keyof typeof Ionicons.glyphMap }) => (
    <View style={{ width: 41, height: 41, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: glass.dividerTone, boxShadow: nestedBoxShadow(glass) }}>
      <Ionicons name={name} size={20} color={glass.lightTint} />
    </View>
  );
  const rowStyle = { minHeight: 64, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, gap: 14, flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: glass.plateFillFrom, boxShadow: plateBoxShadow(glass) }; // зачем (стиль «Тень», владелец 12.10): строка — плашка с тенью, без кромки; overflow убран, он резал бы тень
  const titleStyle = { color: t.textPrimary, fontSize: 16, lineHeight: 21, fontWeight: '700' as const };
  const subStyle = { color: t.textMuted, fontSize: 13, lineHeight: 18, fontWeight: '400' as const, marginTop: 3 };

  return (
    <ScreenGradient>
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }}>
        <ContentWrap>
          {/* зачем (ЗАМОК ВЛАДЕЛЬЦА 22.10 «кнопка в своём месте, не пересекается с другими элементами»): полоса кнопки до прокрутки — контент под круг не заезжает */}
          <ScreenBackZone />
          <BouncyScrollView contentContainerStyle={{ paddingHorizontal: 20 /* зачем: паритет profile.html (13.10): поля экрана 20 */, paddingBottom: 20 }} decelerationRate="fast" showsVerticalScrollIndicator={false} scrollEventThrottle={16}>
            <Text maxFontSizeMultiplier={1.15} style={{ color: t.textPrimary, fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5, marginTop: 10 }}>
              {loc.edu.title}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: 16, lineHeight: 22, marginTop: 7 }}>
              {L({ ru: 'Проверка ответа, ввод и единая озвучка', uk: 'Перевірка відповіді, введення та єдине озвучення', en: 'Answer checking, input, and voice', es: 'Comprobación, escritura y voz', 'pt-BR': 'Verificação, digitação e voz', vi: 'Kiểm tra câu trả lời, nhập và giọng nói', id: 'Pemeriksaan jawaban, input, dan suara', tr: 'Cevap kontrolü, giriş ve ses', pl: 'Sprawdzanie odpowiedzi, wpisywanie i głos' })}
            </Text>
            {/* зачем: паритет с макетом profile.html PRF-05 — eyebrow секции: secondary, разрядка 1.7 */}
            <Text style={{ color: glass.secondary, fontSize: 13, lineHeight: 18, fontWeight: '700', letterSpacing: 1.7, marginTop: 24, marginHorizontal: 4, marginBottom: 10 }}>
              {L({ ru: 'ОТВЕТ', uk: 'ВІДПОВІДЬ', en: 'ANSWER', es: 'RESPUESTA', 'pt-BR': 'RESPOSTA', vi: 'CÂU TRẢ LỜI', id: 'JAWABAN', tr: 'YANIT', pl: 'ODPOWIEDŹ' })}
            </Text>
            <View style={{ gap: 10 }}>
            {rows.map(row => {
              const isOn = !!s[row.key];
              return (
                <View key={row.key} style={rowStyle}>
                  <PlateFill g={glass} radius={14} />
                  <RowIcon name={row.icon} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={titleStyle}>{row.label}</Text>
                    <Text style={subStyle}>{row.sub}</Text>
                  </View>
                  <LocalSwitch value={isOn} onValueChange={val => update(row.key, val)} accessibilityLabel={row.label} glass={glass} />
                </View>
              );
            })}
            </View>

            {/* зачем: паритет с макетом profile.html PRF-05 — eyebrow секции: secondary, разрядка 1.7 */}
            <Text style={{ color: glass.secondary, fontSize: 13, lineHeight: 18, fontWeight: '700', letterSpacing: 1.7, marginTop: 24, marginHorizontal: 4, marginBottom: 10 }}>
              {L({ ru: 'ЗВУК', uk: 'ЗВУК', en: 'SOUND', es: 'SONIDO', 'pt-BR': 'SOM', vi: 'ÂM THANH', id: 'SUARA', tr: 'SES', pl: 'DŹWIĘK' })}
            </Text>
            <View style={{ gap: 10 }}>
            {soundRows.map(row => <View key={row.testID} testID={row.testID === 'fc-sfx-toggle' ? 'fc-sfx-row' : 'fc-autospeak-row'} style={rowStyle}>
              <PlateFill g={glass} radius={14} />
              <RowIcon name={row.icon} />
              <View style={{ flex: 1, minWidth: 0 }}><Text style={titleStyle}>{row.label}</Text><Text style={subStyle}>{row.sub}</Text></View>
              <LocalSwitch testID={row.testID} value={row.value} onValueChange={row.onValueChange} accessibilityLabel={row.label} glass={glass} />
            </View>)}
            </View>

          </BouncyScrollView>
        </ContentWrap>
      </View>
      <ScreenBackButton screen="settings_edu" accessibilityLabel={L({ ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })} onPress={() => safeRouterBack(router, '/(tabs)/settings' as any)} />
    </ScreenGradient>
  );
}
