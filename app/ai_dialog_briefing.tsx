import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AiDialogBriefingScreen from '../components/AiDialogBriefingScreen';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useTheme } from '../components/ThemeContext';
import PressableScale from '../components/feedback/PressableScale';
import { triLang } from '../constants/i18n';
import { markAiDialogIntroSeen } from './ai_dialog_intro_seen';
import { warmPremiumDialog } from './ai_dialog_client';
import { warmPremiumDialogStream } from './ai_dialog_stream_client';
import { trackEvent as trackAiDialogEvent } from './analytics';
import { resolveDialogScenarioAccess } from './ai_dialog_level_lock';
import { getScenarioById } from './ai_dialog_scenarios';
import {
  aiDialogContentAvailableForTarget,
  frenchAiDialogGateCopy,
} from './ai_dialog_target_gate';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';

// Голый __DEV__ падает в тестах (память project_dev_guard_bare_dev_global_jest):
// читаем через globalThis, как в соседних экранах диалогов.
const IS_DEV_RUNTIME: boolean = (globalThis as { __DEV__?: boolean }).__DEV__ === true;

type RecoveryScreenProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  action: string;
  onBack: () => void;
};

function RecoveryScreen({ icon, title, body, action, onBack }: RecoveryScreenProps) {
  const { theme: t, f, ds } = useTheme();

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: ds.spacing.xl }}>
        <View style={{ alignItems: 'center', maxWidth: 520 }}>
          <Ionicons name={icon} size={40} color={t.textMuted} />
          <Text
            accessibilityRole="header"
            style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', textAlign: 'center', marginTop: ds.spacing.md }}
          >
            {title}
          </Text>
          <Text
            style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', lineHeight: f.body + 8, marginTop: ds.spacing.sm }}
          >
            {body}
          </Text>
          <PressableScale
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={action}
            style={{
              minHeight: ds.buttonHeight,
              minWidth: 180,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: t.accent,
              borderRadius: ds.radius.lg,
              paddingHorizontal: ds.spacing.xl,
              marginTop: ds.spacing.xl,
            }}
          >
            <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '700' }}>{action}</Text>
          </PressableScale>
        </View>
      </SafeAreaView>
    </ScreenGradient>
  );
}

export default function AiDialogBriefingRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    scenarioId?: string | string[];
    forceBriefing?: string | string[];
  }>();
  const { lang } = useLang();
  // Тема нужна экрану ожидания ниже: раньше он был голым градиентом и цвета
  // ему не требовались.
  const { theme: t, f } = useTheme();
  const { studyTarget } = useStudyTarget();
  const aiDialogGateOpen = aiDialogContentAvailableForTarget(studyTarget);
  const goBack = () => safeRouterBack(router, '/(tabs)/lessons' as never);

  const rawScenarioId = params.scenarioId;
  const scenarioId = (Array.isArray(rawScenarioId) ? rawScenarioId[0] : rawScenarioId)?.trim() ?? '';
  const scenario = getScenarioById(scenarioId);
  // forceBriefing прилетает от долгого тапа по плитке («показать задание»).
  // Читать его больше НЕ нужно: экран и так показывается всегда (см. ниже).
  // Параметр оставлен в маршруте осознанно — он безвреден, а его удаление
  // тронуло бы три точки вызова в DialogsTabContent ради нулевого выигрыша.
  /**
   * Экран-задание виден ВСЕГДА (владелец 2026-09-17).
   *
   * зачем: раньше брифинг показывался только при ПЕРВОМ прохождении сценария —
   * флаг `ai_dialog_intro_seen` уводил повторный вход прямо в сессию. Со стороны
   * это выглядело как случайная поломка: «кофе и продуктовый открывают экран, а
   * магазин одежды — нет» (кофе не пройден, одежда пройдена). Правило владельца:
   * все диалоги ведут себя одинаково — сначала показать, что нужно сделать.
   *
   * Вторая причина держать экран всегда: здесь же висит цена входа (энергия) и
   * проверка платного доступа. Пропуская экран, повторный вход пропускал и то,
   * и другое.
   *
   * Флаг «видел» продолжает писаться (см. onStart) — он ничего не решает, но
   * пригодится, если владелец захочет «короткий повтор» вместо полного экрана.
   */

  /**
   * Замок платного сценария — на САМОМ ЭКРАНЕ, а не только в каталоге.
   *
   * зачем (аудит 2026-09-14): правило «фри видит ровно три сценария» стояло
   * лишь в плитках каталога (DialogsTabContent). Экран брифинга доступа не
   * проверял вовсе, поэтому прямой роут
   * `/ai_dialog_briefing?scenarioId=pharmacy` открывал любой платный сценарий
   * целиком и бесплатно — id лежат в клиентском бандле. Брифинг обязателен
   * перед сессией (он же резолвер холодного старта), поэтому правило живёт
   * здесь: это горло, через которое проходят все входы в диалог.
   *
   * Проверка стоит ПЕРЕД эффектом автоперехода в сессию: иначе повторный вход
   * (интро уже просмотрено) уводил бы в сессию мимо замка.
   */
  const [accessGate, setAccessGate] = useState<'checking' | 'ok' | 'denied'>('checking');
  useEffect(() => {
    if (!scenario) { setAccessGate('ok'); return; } // нет сценария — свой экран ошибки ниже
    let cancelled = false;
    void resolveDialogScenarioAccess(scenario.id).then((allowed) => {
      if (cancelled) return;
      if (allowed) {
        // Разрешение — рутина, в релизе шуметь незачем.
        if (IS_DEV_RUNTIME) console.log('[DIALOG-GATE] briefing:access allowed', scenario.id);
        setAccessGate('ok');
        return;
      }
      // ОТКАЗ логируем всегда: это ранний выход, уводящий человека с экрана.
      console.log(`[DIALOG-GATE] briefing:access denied scenario=${scenario.id} cefr=${scenario.cefr} → пейвол`); // guard-ok: ранний выход обязан логироваться и в релизе (правило «сперва логи»)
      setAccessGate('denied');
      void trackAiDialogEvent('ai_dialog_locked_scenario_tapped', {
        scenarioId: scenario.id, cefr: scenario.cefr, reason: 'direct_route_blocked',
      });
      void trackAiDialogEvent('paywall_shown', { context: 'dialog_locked_level', source: 'ai_dialog_briefing_direct' });
      markNextNavigationAsReplace();
      router.replace({ pathname: '/premium_modal', params: { context: 'dialog_locked_level', source: 'ai_dialog_briefing_direct' } } as never);
    }).catch((error: unknown) => {
      if (cancelled) return;
      // Немой catch запрещён. Пускаем: наша ошибка чтения премиума не повод
      // отнимать доступ у того, кто, возможно, за него заплатил.
      console.warn('[DIALOG-GATE] briefing:access failed → пускаем:', // guard-ok: немой catch запрещён правилом владельца
        error instanceof Error ? `${error.name}: ${error.message}` : String(error));
      setAccessGate('ok');
    });
    return () => { cancelled = true; };
  }, [router, scenario]);

  /**
   * Будим спящий инстанс, пока человек читает задание.
   *
   * зачем (владелец 2026-09-17, «ждёшь 15 секунд, пока ответят»): у
   * premiumDialogSend/Stream стоит minInstances: 0 (осознанная экономия, сторож
   * ai_functions_warm_instance_contract) — владелец не платит за постоянно
   * тёплый инстанс. Раньше будильник стоял ТОЛЬКО на экране сессии, то есть
   * срабатывал ровно тогда, когда человек уже печатал первую реплику: холодный
   * старт попадал в его ожидание целиком.
   *
   * Чтение задания — это 5–15 секунд, за которые инстанс успевает проснуться.
   * Дубль с прогревом раздела Диалогов бесплатен: warmAiFunction держит TTL
   * 9 минут и склеивает параллельные вызовы, поэтому сеть трогается максимум
   * один раз. Сам ping отвечает ДО Firestore, гейтов и OpenAI — ни чтений, ни
   * денег он не стоит.
   */
  useEffect(() => {
    if (!aiDialogGateOpen || !scenario) return;
    warmPremiumDialog();
    warmPremiumDialogStream();
  }, [aiDialogGateOpen, scenario]);

  if (!aiDialogGateOpen) {
    const gateCopy = frenchAiDialogGateCopy(lang);
    return (
      <RecoveryScreen
        icon="lock-closed-outline"
        title={gateCopy.title}
        body={gateCopy.body}
        action={gateCopy.action}
        onBack={goBack}
      />
    );
  }

  if (!scenario) {
    return (
      <RecoveryScreen
        icon="alert-circle-outline"
        title={triLang(lang, {
          ru: 'Диалог не найден',
          uk: 'Діалог не знайдено',
          en: 'Dialogue not found',
          es: 'No se encontró el diálogo',
          'pt-BR': 'Diálogo não encontrado',
          vi: 'Không tìm thấy hội thoại',
          id: 'Dialog tidak ditemukan',
          tr: 'Diyalog bulunamadı',
          pl: 'Nie znaleziono dialogu',
        })}
        body={triLang(lang, {
          ru: 'Ссылка на этот диалог недоступна. Вернитесь к урокам и выберите ситуацию снова.',
          uk: 'Посилання на цей діалог недоступне. Поверніться до уроків і виберіть ситуацію знову.',
          en: 'This dialogue’s link is unavailable. Go back to lessons and pick a situation again.',
          es: 'El enlace a este diálogo no está disponible. Vuelve a las lecciones y elige otra situación.',
          'pt-BR': 'O link para este diálogo está indisponível. Volte às lições e escolha a situação novamente.',
          vi: 'Liên kết đến hội thoại này không khả dụng. Hãy quay lại bài học và chọn tình huống khác.',
          id: 'Tautan ke dialog ini tidak tersedia. Kembali ke pelajaran dan pilih situasi lagi.',
          tr: 'Bu diyaloğun bağlantısı kullanılamıyor. Derslere dönüp durumu tekrar seç.',
          pl: 'Link do tego dialogu jest niedostępny. Wróć do lekcji i wybierz sytuację ponownie.',
        })}
        action={triLang(lang, {
          ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Volver',
          'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
        })}
        onBack={goBack}
      />
    );
  }

  if (accessGate === 'checking') {
    // Ждём вердикт замка платного сценария, а не «видел ли интро» (автопропуск
    // снят 2026-09-17). Показать задание раньше вердикта нельзя: у закрытого
    // сценария экран мигнул бы на кадр и тут же сменился пейволом.
    //
    // зачем не пустой экран: раньше здесь висел голый градиент без единого
    // элемента. При любой заминке человек видел абсолютную пустоту и читал её
    // как «приложение сломалось» — выхода с экрана тоже не было. Теперь виден
    // смысл ожидания и кнопка «Назад».
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <ActivityIndicator color={t.accent} />
          <Text
            style={{ color: t.textSecond, fontSize: f.body, textAlign: 'center', paddingHorizontal: 32 }}
            maxFontSizeMultiplier={1.2}
          >
            {triLang(lang, {
              ru: 'Готовим разговор…',
              uk: 'Готуємо розмову…',
              en: 'Getting the conversation ready…',
              es: 'Preparando la conversación…',
              'pt-BR': 'Preparando a conversa…',
              vi: 'Đang chuẩn bị cuộc trò chuyện…',
              id: 'Menyiapkan percakapan…',
              tr: 'Konuşma hazırlanıyor…',
              pl: 'Przygotowujemy rozmowę…',
            })}
          </Text>
          <TouchableOpacity
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel={triLang(lang, {
              ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar',
              vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
            })}
            style={{ minHeight: 44, paddingHorizontal: 20, justifyContent: 'center' }}
          >
            <Text style={{ color: t.textMuted, fontSize: f.sub, fontWeight: '700' }} maxFontSizeMultiplier={1.2}>
              {triLang(lang, {
                ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar',
                vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
              })}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  return (
    <>
      <AiDialogBriefingScreen
        scenario={scenario}
        onBack={goBack}
        onStart={() => {
          // зачем: здесь энергия НЕ списывается — только показывается цена
          // (значок на кнопке «Начать»). Списание живёт в самой сессии
          // (ai_dialog_session): одна точка оплаты вместо двух, иначе диалог
          // стоил бы 2 ⚡ вместо одной.
          void markAiDialogIntroSeen(studyTarget, scenario.id);
          markNextNavigationAsReplace();
          router.replace({
            pathname: '/ai_dialog_session',
            params: { scenarioId: scenario.id },
          } as never);
        }}
      />
    </>
  );
}
