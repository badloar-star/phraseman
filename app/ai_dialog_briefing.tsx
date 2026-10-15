import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AiDialogBriefingScreen from '../components/AiDialogBriefingScreen';
import DialogueTargetBoundary from '../components/dialogs/DialogueTargetBoundary';
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
import { dialogScenarioRankAccess, isScenarioUnlockedForAccount } from './ai_dialog_level_lock';
import { useMyCoinRank } from '../hooks/use_my_coin_rank';
import { getScenarioById } from './ai_dialog_scenarios';
import { dialogueScenarioPresentation } from './dialogue_scenario_presentation';
import { resolveDialogueStudyTarget } from './dialogue_language_registry';
import {
  aiDialogContentAvailableForTarget,
  aiDialogTargetGateCopy,
} from './ai_dialog_target_gate';
import { markNextNavigationAsReplace, safeRouterBack } from './navigation_back';

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
            <Text style={{ color: t.textOnGold, fontSize: f.bodyLg, fontWeight: '700' }}>{action}</Text>
          </PressableScale>
        </View>
      </SafeAreaView>
    </ScreenGradient>
  );
}


export function MissingDialogueScreen() {
  const { lang } = useLang();
  const router = useRouter();
  const goBack = () => safeRouterBack(router, '/(tabs)/lessons' as never);
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
          ru: 'Этот диалог не открылся. Вернись к урокам и выбери ситуацию снова.',
          uk: 'Цей діалог не відкрився. Повернися до уроків і вибери ситуацію знову.',
          en: 'This dialogue didn’t open. Go back to lessons and pick a situation again.',
          es: 'Este diálogo no se abrió. Vuelve a las lecciones y elige la situación otra vez.',
          'pt-BR': 'Este diálogo não abriu. Volte às lições e escolha a situação de novo.',
          vi: 'Hội thoại này chưa mở được. Hãy quay lại bài học và chọn lại tình huống.',
          id: 'Dialog ini tidak terbuka. Kembali ke pelajaran dan pilih situasi lagi.',
          tr: 'Bu diyalog açılmadı. Derslere dönüp durumu tekrar seç.',
          pl: 'Ten dialog się nie otworzył. Wróć do lekcji i wybierz sytuację ponownie.',
        })}
        action={triLang(lang, {
          ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Volver',
          'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
        })}
        onBack={goBack}
      />
    );
}

export default function AiDialogBriefingRoute() {
  const { studyTarget } = useStudyTarget();
  return <DialogueTargetBoundary target={studyTarget}><AiDialogBriefingBody /></DialogueTargetBoundary>;
}

function AiDialogBriefingBody() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    scenarioId?: string | string[];
    forceBriefing?: string | string[];
  }>();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const aiDialogGateOpen = aiDialogContentAvailableForTarget(studyTarget);
  const goBack = () => safeRouterBack(router, '/(tabs)/lessons' as never);

  const rawScenarioId = params.scenarioId;
  const scenarioId = (Array.isArray(rawScenarioId) ? rawScenarioId[0] : rawScenarioId)?.trim() ?? '';
  const candidateScenario = getScenarioById(scenarioId);
  // Missing native content must stop before purchases, warmup or navigation.
  const scenario = candidateScenario && dialogueScenarioPresentation(candidateScenario, studyTarget, lang)
    ? candidateScenario : null;
  /**
   * ЭКРАН-ЗАДАНИЕ ВИДЕН ВСЕГДА (владелец 2026-09-17).
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
   * Поэтому никакого состояния «показывать или нет» в этом файле больше нет:
   * ниже идут только экраны отказа (гейт языка, сценарий не найден, замок ещё
   * не решён), а в остальных случаях — само задание.
   *
   * Флаг «видел» продолжает писаться (см. onStart) — он ничего не решает, но
   * пригодится, если владелец захочет «короткий повтор» вместо полного экрана.
   * `params.forceBriefing` (долгий тап по плитке) по той же причине больше не
   * читается: параметр оставлен в маршруте как безвредный, его удаление
   * тронуло бы три точки вызова в DialogsTabContent ради нулевого выигрыша.
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
   * ⛔ ЗАМОК СИНХРОННЫЙ. НИКАКОГО await ПЕРЕД ПОКАЗОМ ЭКРАНА.
   *
   * зачем (владелец 2026-09-17: «ДИАЛОГИ НЕ ОТКРЫВАЮТСЯ» → после первого фикса
   * «ОТКРЫВАЮТСЯ ТОЛЬКО ПЕРВЫЕ ТРИ»). Три — это ровно FREE_DIALOG_SCENARIO_IDS,
   * то есть замок считал, что премиума НЕТ, хотя он есть.
   *
   * Здесь стояла асинхронная проверка доступа, ходившая в сеть за реальным
   * премиумом и VIP. Пока брифинг пропускался на повторном входе, её молчание
   * никого не держало. Как только показ задания стал обязательным, КАЖДЫЙ её
   * способ не ответить стал отказом:
   *  • молчащая сеть / холодный старт → вечное «Готовим разговор…»;
   *  • getVerifiedPremiumAccessStatus при смене «поколения аккаунта»
   *    возвращает false ВНЕ catch — это «ответ неизвестен», а читалось как
   *    «премиума нет» → пейвол → открытыми оставались только три бесплатных.
   *
   * Таймаут-предохранитель лечил симптом (ожидание), а не причину (ложный
   * отказ). Сеть тут не нужна ВООБЩЕ: useFeatureAccess('ai_dialog') — тот же
   * синхронный хук, которым решает каталог, а бесплатный список лежит в
   * бандле. Вердикт известен в первом кадре: экран открывается мгновенно, и
   * плитка с экраном физически не могут разойтись — у них одна функция.
   *
   * Инвариант аудита 2026-09-14 сохранён: прямой роут по id платный сценарий
   * не открывает. Реальную оплату всё равно проверяет сервер на первой реплике.
   */
  /**
   * D124 (владелец 2026-09-30): доступ — только монетный ранг для всех, то же
   * правило, что у Dialogue V2. Plus и купленное за руны сценарий больше НЕ
   * открывают, поэтому ни подписка, ни владение здесь не читаются.
   *
   * Замок по-прежнему СИНХРОННЫЙ: ранг приходит из кэша в памяти/диска через
   * тот же хук, что у каталога V2 (useMyCoinRank), без сети. Пока ранг не
   * прочитан (null), сценарий считается закрытым — как в V2 — но на пейвол мы
   * НЕ уводим: Plus его всё равно не откроет, а экран честно называет ранг.
   */
  const coinRank = useMyCoinRank();
  const rankAccess = scenario ? dialogScenarioRankAccess(scenario, coinRank) : null;
  const scenarioUnlocked = !scenario || isScenarioUnlockedForAccount(scenario, coinRank);
  const rankRequired = rankAccess?.status === 'locked_by_rank' ? rankAccess.rankRequired : null;

  // Отказ — единственный ранний выход этого экрана, поэтому логируем его всегда.
  useEffect(() => {
    if (!scenario || scenarioUnlocked) return;
    console.log(`[DIALOG-GATE] briefing:access denied scenario=${scenario.id} cefr=${scenario.cefr} rank=${String(coinRank)} rankRequired=${String(rankRequired)} → экран ранга`); // guard-ok: ранний выход обязан логироваться и в релизе (правило «сперва логи»)
    void trackAiDialogEvent('ai_dialog_locked_scenario_tapped', {
      scenarioId: scenario.id, cefr: scenario.cefr, reason: 'rank_required',
    });
  }, [coinRank, rankRequired, scenario, scenarioUnlocked]);

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
    warmPremiumDialog(studyTarget);
    warmPremiumDialogStream(studyTarget);
  }, [aiDialogGateOpen, scenario, studyTarget]);

  if (!aiDialogGateOpen) {
    const gateCopy = aiDialogTargetGateCopy(lang, studyTarget);
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

  if (!scenario) return <MissingDialogueScreen />;
  // зачем D130: итальянский (и любой язык без диалогов) сюда не доходит — плитки нет;
  // если всё же пришёл по старой ссылке, показываем «нет диалога», а не английский.
  const dialogueTarget = resolveDialogueStudyTarget(studyTarget);
  if (!dialogueTarget) {
    console.warn('[LANG-SURFACE] ai_dialog_briefing:unsupported_target → missing', { studyTarget });
    return <MissingDialogueScreen />;
  }

  if (!scenarioUnlocked) {
    // D124: сценарий закрыт рангом. Экран-задание рисовать нельзя (мигнула бы
    // кнопка «Начать»), пейвол врал бы (Plus ранг не заменяет) — поэтому честная
    // причина с тем же текстом, что у Dialogue V2, и выход назад.
    const rankLabel = rankRequired ?? 1;
    return (
      <RecoveryScreen
        icon="lock-closed-outline"
        title={triLang(lang, {
          ru: 'Этот диалог пока закрыт',
          uk: 'Цей діалог поки закритий',
          en: 'This dialogue is locked for now',
          es: 'Este diálogo aún está bloqueado',
          'pt-BR': 'Este diálogo ainda está bloqueado',
          vi: 'Hội thoại này đang khóa',
          id: 'Dialog ini masih terkunci',
          tr: 'Bu diyalog şimdilik kilitli',
          pl: 'Ten dialog jest na razie zablokowany',
        })}
        body={triLang(lang, {
          ru: `Откроется на ранге ${rankLabel}`,
          uk: `Відкриється на ранзі ${rankLabel}`,
          en: `Unlocks at rank ${rankLabel}`,
          es: `Se desbloquea en el rango ${rankLabel}`,
          'pt-BR': `Desbloqueia no nível ${rankLabel}`,
          vi: `Mở ở hạng ${rankLabel}`,
          id: `Terbuka di peringkat ${rankLabel}`,
          tr: `${rankLabel}. rütbede açılır`,
          pl: `Odblokuje się na randze ${rankLabel}`,
        })}
        action={triLang(lang, {
          ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar',
          vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
        })}
        onBack={goBack}
      />
    );
  }

  const openSession = () => {
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
  };

  return (
    <>
      <AiDialogBriefingScreen
        scenario={scenario}
        studyTarget={dialogueTarget}
        onBack={goBack}
        onStart={openSession}
        // Режим покупки — только когда сценарий платный и ещё не куплен.
        // Куплен или открыт подпиской → обычная кнопка «Начать диалог».
        // Direct dialog purchases are retired; access is resolved by the rank/Plus gate.
        purchase={null /* Direct purchases retired; rank/Plus gate decides access. */}
      />
    </>
  );
}
