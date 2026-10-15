import Ionicons from '@expo/vector-icons/Ionicons';
import { actionToastTri, emitAppEvent } from './events';
import { switchOffTrackTone, switchOnTone } from '../components/settings/switch_chrome';
import Slider from '@react-native-community/slider';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import BouncyScrollView from '../components/BouncyScrollView';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import PressableHybrid from '../components/PressableHybrid';
import { nestedBoxShadow, PlateFill, plateBoxShadow } from '../components/v2/ShadowSurface';
import { useAudio } from '../hooks/use-audio';
import {
  isFcAutoSpeakEnabled,
  isFcSfxEnabled,
  setFcAutoSpeakEnabled,
  setFcSfxEnabled,
} from './flashcards/SoundService';
import {
  applyUserSettingsNow,
  getUserSettingsSnapshot,
  loadSettings,
  normalizeSpeechRate,
  type UserSettings,
} from './user_settings_store';
import { safeRouterBack } from './navigation_back';
import { getVoiceIdForLang, peekVoiceIdForLocale, voiceStudyLangOf, type VoiceStudyLang } from './flashcards/voice_prefs';
import { useStudyTarget } from '../components/StudyTargetContext';
import { getVoicesOnce, voiceTitle } from './flashcards/tts_voices';
import { voicePlaybackPolicy } from '../modules/audio/voice_playback_policy';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';

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
  const offTone = switchOffTrackTone(glass);
  // зачем (координатор 13.10, Темы 4801981d8; образец settings-gap-013/014/015/034 `.gs-sw.on`): включённый — дорожка цвета акцента
  // и «чернильный» бегунок из общего токена switchOnTone, а не тёмная дорожка glass.selected с белым бегунком.
  const onTone = switchOnTone(glass);
  return (
    <PressableHybrid
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      withHaptic={false}
      withSound={false}
      variant="chip"
      style={{ width: 48, minWidth: 48, minHeight: 48, alignSelf: 'center' }}
      contentStyle={{ width: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' }}
    >
      <View
        style={{
          width: 48,
          height: 29,
          borderRadius: 16,
          padding: 3,
          justifyContent: 'center',
          // зачем (координатор 12.10, «Тень»): без обводки — дорожка выключенного отделяется тоном (switchOffTrackTone)
          backgroundColor: value ? onTone.track : offTone.track,
        }}
      >
        <View
          style={{
            width: 21,
            height: 21,
            borderRadius: 11,
            backgroundColor: value ? onTone.knob : offTone.knob,
            transform: [{ translateX: value ? 19 : 0 }],
          }}
        />
      </View>
    </PressableHybrid>
  );
}

// зачем: последнее показанное значение строки «Голос озвучки (EN)» живёт в памяти модуля —
// повторный вход на экран рисует его с первого кадра (Performance Bible: первый кадр = последнее известное).
// undefined — ещё ни разу не вычисляли; null — системный голос; строка — имя выбранного голоса.
// с 15.10 значение помнится вместе с языком: смена изучаемого языка не должна показать чужой голос
let lastShownVoice: Readonly<{ lang: VoiceStudyLang; value: string | null }> | undefined;

export default function SettingsEdu() {
  const router = useRouter();
  const { theme: t, liquidGlassThemeId } = useTheme();
  const { lang, s: loc } = useLang();
  const { speak: speakAudio, stop: stopAudio } = useAudio();
  const insets = useStableSafeAreaInsets();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const [s, setS] = useState<UserSettings>(() => getUserSettingsSnapshot());
  // E9: тумблеры раздела карточек — «Звуковые эффекты» (fc_sfx_on) и
  // «Автопроизношение» (fc_autospeak_on), оба дефолт true (SoundService).
  const [fcSfx, setFcSfx] = useState(() => isFcSfxEnabled());
  const [fcAutoSpeak, setFcAutoSpeak] = useState(() => isFcAutoSpeakEnabled());
  // зачем: паритет profile.html PRF-05 (13.10): у строки «Голос озвучки (EN)» справа значение — «Системный»
  // или имя выбранного голоса. Первый кадр: последнее показанное значение; если его нет, но голос выбран
  // (синхронный снимок peekEnVoiceId) — пустое место вместо неверного «Системный». Имя догружается фоном
  // из локального списка голосов телефона (без сети).
  // зачем (Ревизор 15.10): голос выбирается для ИЗУЧАЕМОГО языка — строка и её значение тоже по нему, а не всегда (EN)
  const { studyTarget } = useStudyTarget();
  const voiceLang: VoiceStudyLang = voiceStudyLangOf(studyTarget) ?? 'en';
  const [voiceValue, setVoiceValue] = useState<string | null>(() => (
    lastShownVoice?.lang === voiceLang ? lastShownVoice.value : (peekVoiceIdForLocale(voiceLang) ? '' : null)
  ));

  // зачем (координатор 12.10, 🟡 Ядра по 59ba4d58d): подпись голоса зависит от ЯЗЫКА ИНТЕРФЕЙСА и списка голосов (voiceTitle), а useFocusEffect с пустыми deps читал `lang` только при входе
  // на экран — при смене языка подпись обновлялась лишь при следующем открытии. Загрузка подписи вынесена в колбэк с зависимостью [lang]: он зовётся из фокус-эффекта (вход на экран)
  // и отдельным эффектом при смене языка — остальные чтения (настройки, переключатели) на смену языка НЕ перезапускаются.
  const voiceRequestRef = useRef(0);
  const voiceLoadedLangRef = useRef<string | null>(null);
  const loadVoiceValue = useCallback((reason: 'focus' | 'lang_changed') => {
    const request = ++voiceRequestRef.current;
    voiceLoadedLangRef.current = lang;
    console.log(`[SETTINGS-EDU] voice_value:load reason=${reason} lang=${lang} voiceLang=${voiceLang} request=${request}`);
    void getVoiceIdForLang(voiceLang)
      .then(async (chosenId) => {
        if (!chosenId) {
          if (request !== voiceRequestRef.current) { console.log(`[SETTINGS-EDU] voice_value:stale request=${request} (системный голос)`); return; }
          lastShownVoice = { lang: voiceLang, value: null };
          setVoiceValue(null);
          return;
        }
        const voices = await getVoicesOnce();
        const match = voices.find((v) => v.identifier === chosenId);
        // голос выбран, но в телефоне его больше нет — озвучка уйдёт в системный фолбэк, так и показываем
        // зачем (settings-gap-034): язык интерфейса и список голосов — чтобы технический id стал «English (Australia) · 2»
        // compact (settings-gap-034, 13.10): язык уже в названии строки «(EN)» — справа только регион и номер, название не переносится
        const next = match ? voiceTitle(match, lang, voices, { compact: true }) : null;
        if (request !== voiceRequestRef.current) { console.log(`[SETTINGS-EDU] voice_value:stale request=${request} (ушёл с экрана или язык сменился ещё раз)`); return; }
        lastShownVoice = { lang: voiceLang, value: next };
        setVoiceValue((prev) => (prev === next ? prev : next));
        console.log(`[SETTINGS-EDU] voice_value:shown reason=${reason} lang=${lang} voices=${voices.length} matched=${match ? 'yes' : 'no'} value=${next ?? 'system'}`);
      })
      .catch((error: unknown) => {
        console.warn(`[SETTINGS-EDU] voice_value_load_failed reason=${error instanceof Error ? error.message : String(error)}`);
      });
  }, [lang, voiceLang]);
  const loadVoiceValueRef = useRef(loadVoiceValue);
  loadVoiceValueRef.current = loadVoiceValue;

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
      loadVoiceValueRef.current('focus');
      return () => {
        // уход с экрана снимает ожидающий ответ подписи голоса (раньше это делал флаг alive)
        voiceRequestRef.current += 1;
      };
    }, []),
  );
  // зачем (🟡 Ядра): язык интерфейса сменился при открытом экране — подпись голоса пересчитывается сразу; при первом входе фокус-эффект уже загрузил для этого языка — повтора нет
  useEffect(() => {
    if (voiceLoadedLangRef.current === lang) return;
    console.log(`[SETTINGS-EDU] voice_value:lang_effect prev=${voiceLoadedLangRef.current ?? 'none'} now=${lang}`);
    loadVoiceValue('lang_changed');
  }, [lang, loadVoiceValue]);

  // зачем (координатор 12.10, аудит Optimistic UI R1, E4/E6): запись больше не живёт внутри обновителя состояния (двойной вызов в StrictMode = двойная запись); при отказе хранилища откатывается ТОЛЬКО эта строка и только если её не успели изменить снова.
  const latestSettingsRef = useRef(s);
  latestSettingsRef.current = s;
  // зачем (аудит Optimistic UI Дизайна 15.10, №4): ползунок скорости озвучки пишет промежуточные значения в состояние, и откат при сбое брал промежуточное,
  // а не то, что было до жеста. Значение на начало жеста запоминается в onSlidingStart и передаётся как baseline.
  const speechRateStartRef = useRef<number | null>(null);
  const update = (key: keyof UserSettings, val: boolean | number, baseline?: boolean | number | null) => {
    editVersionRef.current += 1;
    const previous = baseline !== undefined && baseline !== null ? { ...latestSettingsRef.current, [key]: baseline } : latestSettingsRef.current;
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
        ru: 'Не удалось сохранить настройку. Попробуй ещё раз.', uk: 'Не вдалося зберегти налаштування. Спробуй ще раз.', en: "Couldn't save the setting. Try again.", es: 'No se pudo guardar el ajuste. Inténtalo de nuevo.',
        'pt-BR': 'Não foi possível salvar a configuração. Tente de novo.', vi: 'Không lưu được cài đặt. Hãy thử lại.', id: 'Pengaturan tidak bisa disimpan. Coba lagi.', tr: 'Ayar kaydedilemedi. Tekrar dene.', pl: 'Nie udało się zapisać ustawienia. Spróbuj ponownie.',
      }));
    });
  };

  const L = (m: Record<string, string>): string => m[lang] ?? m.ru;
  const voiceRowTitle = `${L({ ru: 'Голос озвучки', uk: 'Голос озвучення', en: 'Voice', es: 'Voz', 'pt-BR': 'Voz', vi: 'Giọng đọc', id: 'Suara', tr: 'Ses', pl: 'Głos' })} (${voiceLang.toUpperCase()})`;

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
        ru: 'Не удалось сохранить настройку. Попробуй ещё раз.', uk: 'Не вдалося зберегти налаштування. Спробуй ще раз.', en: "Couldn't save the setting. Try again.", es: 'No se pudo guardar el ajuste. Inténtalo de nuevo.',
        'pt-BR': 'Não foi possível salvar a configuração. Tente de novo.', vi: 'Không lưu được cài đặt. Hãy thử lại.', id: 'Pengaturan tidak bisa disimpan. Coba lagi.', tr: 'Ayar kaydedilemedi. Tekrar dene.', pl: 'Nie udało się zapisać ustawienia. Spróbuj ponownie.',
      }));
    }
  };

  const soundRows = [
    {
      testID: 'fc-sfx-toggle',
      value: fcSfx,
      label: L({ ru: 'Звуковые эффекты', uk: 'Звукові ефекти', en: 'Sound effects', es: 'Efectos de sonido', 'pt-BR': 'Efeitos sonoros', vi: 'Hiệu ứng âm thanh', id: 'Efek suara', tr: 'Ses efektleri', pl: 'Efekty dźwiękowe' }),
      sub: L({ ru: 'Короткие звуки в карточках и тренировках', uk: 'Короткі звуки у картках і тренуваннях', en: 'Brief sounds in cards and training', es: 'Sonidos breves en tarjetas y entrenamientos', 'pt-BR': 'Sons curtos em cartões e treinos', vi: 'Âm thanh ngắn trong thẻ và luyện tập', id: 'Suara singkat di kartu dan latihan', tr: 'Kartlarda ve antrenmanlarda kısa sesler', pl: 'Krótkie dźwięki w fiszkach i ćwiczeniach' }),
      icon: 'volume-high-outline' as const,
      onValueChange: (value: boolean) => { setFcSfx(value); void Promise.resolve(setFcSfxEnabled(value)).catch(logToggleSaveFailure('fc_sfx', () => setFcSfx((current) => (current === value ? !value : current)))); },
    },
    {
      testID: 'fc-autospeak-toggle',
      value: fcAutoSpeak,
      label: L({ ru: 'Автопроизношение', uk: 'Автовимова', en: 'Auto pronunciation', es: 'Pronunciación automática', 'pt-BR': 'Pronúncia automática', vi: 'Tự động phát âm', id: 'Pelafalan otomatis', tr: 'Otomatik telaffuz', pl: 'Automatyczna wymowa' }),
      // зачем (D188-следствие, 14.10): озвучка работает для любого изучаемого языка — подпись не называет английский.
      sub: L({ ru: 'Озвучивать фразу после ответа', uk: 'Озвучувати вислів після відповіді', en: 'Read the phrase aloud after answering', es: 'Leer la frase después de responder', 'pt-BR': 'Ler a frase após responder', vi: 'Đọc câu sau khi trả lời', id: 'Bacakan frasa setelah menjawab', tr: 'Cevaptan sonra ifadeyi oku', pl: 'Odczytaj zdanie po odpowiedzi' }),
      icon: 'volume-high-outline' as const,
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
          <BouncyScrollView contentContainerStyle={{ paddingHorizontal: 20 /* зачем: паритет profile.html (13.10): поля экрана 20 */, paddingBottom: 20 }} decelerationRate="fast" showsVerticalScrollIndicator={false} scrollEventThrottle={16}>
            <PressableHybrid
              accessibilityLabel={L({ ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })}
              onPress={() => safeRouterBack(router, '/(tabs)/settings' as any)}
              variant="icon"
              withHaptic={false}
              withSound={false}
              style={{ width: 48, height: 44, alignSelf: 'flex-start', marginTop: 4 }}
              // зачем (profile.html `.rb.bare`): «назад» — голый шеврон слева, без круга и кромки; область нажатия 48×44.
              contentStyle={{ width: 48, height: 44, alignItems: 'flex-start', justifyContent: 'center' }}
            >
              {/* зачем: паритет с макетом profile.html — иконка «назад» это шеврон (kit.js back) */}
              <Ionicons name="chevron-back" size={21} color={glass.text} />
            </PressableHybrid>
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

            <View style={[rowStyle, { marginTop: 10, alignItems: 'flex-start' /* зачем (settings-gaps-states): в карточке скорости значок вверху, как в макете */ }]}>
              <PlateFill g={glass} radius={14} />
              <RowIcon name="volume-high-outline" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <Text style={[titleStyle, { flex: 1, minWidth: 0 }]}>{loc.edu.speed}</Text>
                  <Text style={[titleStyle, { color: glass.lightTint, flexShrink: 1 }]}>{normalizeSpeechRate(s.speechRate).toFixed(1)}x</Text>
                </View>
                <Text style={subStyle}>{loc.edu.speedHint}</Text>
                <Slider
                  style={{ width: '100%', height: 44 }}
                  minimumValue={0.8}
                  maximumValue={1.3}
                  step={0.1}
                  value={normalizeSpeechRate(s.speechRate)}
                  onSlidingStart={() => { speechRateStartRef.current = normalizeSpeechRate(latestSettingsRef.current.speechRate); }}
                  onValueChange={v => setS(prev => ({ ...prev, speechRate: normalizeSpeechRate(v) }))}
                  onSlidingComplete={v => {
                    const rate = normalizeSpeechRate(v);
                    const startRate = speechRateStartRef.current;
                    speechRateStartRef.current = null;
                    update('speechRate', rate, startRate);
                    stopAudio();
                    if (voicePlaybackPolicy.isEnabled()) speakAudio('a dark horse', rate, { language: 'en-US' });
                    else console.log(`[SETTINGS-EDU] speech_rate_preview_skipped reason=voice_disabled rate=${rate}`); // guard-ok: единичный лог на жест, причина тишины при отпускании ползунка
                  }}
                  minimumTrackTintColor={t.textSecond}
                  maximumTrackTintColor={t.border}
                  thumbTintColor={t.textSecond}
                />
              </View>
            </View>

            <PressableHybrid
            testID="fc-voice-picker-row"
            accessibilityLabel={voiceRowTitle}
            accessible
            withHaptic={false}
            withSound={false}
            onPress={() => {
            // зачем: вибрация только на управляющих кнопках, не на строках/плитках (правило владельца, FINAL_PHASE п.7).
            router.push('/flashcards_voice_picker' as any);
            }}
            variant="card"
            contentStyle={[rowStyle, { marginTop: 10 }]}
            >
            <PlateFill g={glass} radius={14} />
            <RowIcon name="person-outline" />
            {/* зачем (settings-gap-034, кадр 13.10 02:25Z): как в образце (.gs-tx flex:1 min-width:0 / .gs-vv flex:none max-width:120) — место
                уступает колонка названия (подпись под ним уходит на 2-ю строку), а значение держит одну строку до 120. Раньше колонка не
                сжималась, её ширину задавала подпись, и «Австралия · 2» складывалась в три строки. */}
            <View style={{ flexGrow: 1, flexShrink: 1, minWidth: 0 }}><Text style={titleStyle}>{voiceRowTitle}</Text><Text style={subStyle}>{L({ ru: 'Голос и скорость телефона', uk: 'Голос і швидкість телефона', en: 'Phone voice and speed', es: 'Voz y velocidad del teléfono', 'pt-BR': 'Voz e velocidade do telefone', vi: 'Giọng và tốc độ của điện thoại', id: 'Suara dan kecepatan ponsel', tr: 'Telefonun sesi ve hızı', pl: 'Głos i tempo telefonu' })}</Text></View>
            <Text style={{ color: t.textMuted, fontSize: 16, lineHeight: 21, flexShrink: 0, maxWidth: 120, textAlign: 'right' /* зачем: text-integrity — длинное имя голоса переносится внутри 120, без обрезки; отступ — только gap строки 14, как в образце */ }}>
              {voiceValue ?? L({ ru: 'Системный', uk: 'Системний', en: 'System', es: 'Del sistema', 'pt-BR': 'Do sistema', vi: 'Hệ thống', id: 'Sistem', tr: 'Sistem', pl: 'Systemowy' })}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={t.textMuted} />
            </PressableHybrid>
          </BouncyScrollView>
        </ContentWrap>
      </View>
    </ScreenGradient>
  );
}
