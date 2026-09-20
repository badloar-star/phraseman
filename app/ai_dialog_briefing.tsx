import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AiDialogBriefingScreen from '../components/AiDialogBriefingScreen';
import DialogueTargetBoundary from '../components/dialogs/DialogueTargetBoundary';
import { useLang } from '../components/LangContext';
import { useFeatureAccess } from '../components/PremiumContext';
import ScreenGradient from '../components/ScreenGradient';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useTheme } from '../components/ThemeContext';
import PressableScale from '../components/feedback/PressableScale';
import { triLang } from '../constants/i18n';
import { markAiDialogIntroSeen } from './ai_dialog_intro_seen';
import { warmPremiumDialog } from './ai_dialog_client';
import { warmPremiumDialogStream } from './ai_dialog_stream_client';
import { trackEvent as trackAiDialogEvent } from './analytics';
import { isScenarioUnlockedForAccount } from './ai_dialog_level_lock';
import { getScenarioById, scenarioPriceRunes } from './ai_dialog_scenarios';
import { dialogueScenarioPresentation } from './dialogue_scenario_presentation';
import {
  buyDialogAccessLocally,
  getOwnedDialogIds,
  syncDialogPurchases,
} from './ai_dialog_ownership';
import { captureAccountGeneration } from './account_generation';
import { readUnifiedLevelSpinStars } from './level_spin_star_grants';
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
            <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '700' }}>{action}</Text>
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
  // Тот же источник правды, что и у плиток каталога (DialogsTabContent):
  // премиум + «Пульт» + бонус дня. Синхронно, из контекста, без сети.
  const hasDialogAccess = useFeatureAccess('ai_dialog');

  /**
   * Владение, купленное за руны (владелец 2026-09-17, экран 3 макета).
   *
   * ⛔ ПРАВИЛО ЭТОГО ФАЙЛА СОХРАНЕНО: экран по-прежнему НЕ ждёт. Владение
   * читается с диска (AsyncStorage, не сеть), и пока оно не прочитано,
   * `ownedLoaded === false` — в этот момент мы НЕ уводим на пейвол. Иначе
   * купленный диалог на один кадр выбрасывал бы человека на платный экран:
   * ровно тот класс бага, из-за которого замок здесь сделали синхронным
   * («молчание — не отказ»).
   */
  const [ownedIds, setOwnedIds] = useState<ReadonlySet<string> | null>(null);
  useEffect(() => {
    let cancelled = false;
    // зачем эта трасса (владелец 2026-09-17, «ВСЁ ВЫЛЕТАЕТ ПРИ ПОПЫТКЕ
    // ОТКРЫТЬ»): экран правят две сессии сразу, и краш не оставлял JS-трейса в
    // бандлере. Печатаем ВХОД экрана целиком — что за сценарий, цена, владение,
    // премиум — чтобы по логу было видно, на каком звене рвётся, а не гадать.
    let stableId = '';
    try {
      stableId = captureAccountGeneration().stableId ?? '';
    } catch (error: unknown) {
      // Немой catch запрещён. Без личности владение не прочитать — считаем, что
      // купленного нет, но экран НЕ роняем и не закрываем.
      console.warn('[RUNES-BUY] briefing:generation_failed', // guard-ok: ранний выход обязан логироваться и в релизе
        error instanceof Error ? `${error.name}: ${error.message}` : String(error));
      setOwnedIds(new Set());
      return () => { cancelled = true; };
    }
    console.log('[RUNES-BUY] briefing:in', JSON.stringify({ // guard-ok: временная трасса краша (владелец 2026-09-17), снять после починки
      scenarioId: scenario?.id ?? null,
      priceRunes: scenario ? scenarioPriceRunes(scenario) : 0,
      hasDialogAccess,
      stableId: stableId ? stableId.slice(0, 8) : null,
    }));
    void getOwnedDialogIds(studyTarget, stableId).then((ids) => {
      if (!cancelled) setOwnedIds(ids);
    }).catch((error: unknown) => {
      // Немой catch запрещён: без лога «купленный диалог просит оплату снова»
      // выглядело бы как потеря покупки, а не как сбой чтения хранилища.
      console.warn('[RUNES-BUY] briefing:owned_read_failed', // guard-ok: ранний выход обязан логироваться и в релизе
        error instanceof Error ? `${error.name}: ${error.message}` : String(error));
      if (!cancelled) setOwnedIds(new Set());
    });
    return () => { cancelled = true; };
  }, [hasDialogAccess, scenario, studyTarget]);

  const price = scenario ? scenarioPriceRunes(scenario) : 0;
  const ownsScenario = !!scenario && !!ownedIds?.has(scenario.id);

  // Баланс рун для кнопки покупки. Локальная проекция, 0 чтений Firestore —
  // та же, что рисует счётчик «Руны» в шапке.
  const [runeBalance, setRuneBalance] = useState(0);
  useEffect(() => {
    if (price <= 0 || ownsScenario) {
      console.log(`[RUNES-BUY] briefing:balance_skip price=${price} owns=${ownsScenario}`); // guard-ok: ранний выход обязан логироваться и в релизе
      return;
    }
    let cancelled = false;
    const startedAt = Date.now();
    console.log(`[RUNES-BUY] briefing:balance_start price=${price}`); // guard-ok: вход обязан логироваться и в релизе
    void readUnifiedLevelSpinStars(captureAccountGeneration()).then(({ balance }) => {
      console.log(`[RUNES-BUY] briefing:balance_done balance=${balance} price=${price} enough=${balance >= price} tookMs=${Date.now() - startedAt} cancelled=${cancelled}`); // guard-ok: результат обязан логироваться и в релизе
      if (!cancelled) setRuneBalance(balance);
    }).catch((error: unknown) => {
      // Немой catch запрещён: баланс 0 при живых рунах показал бы «не хватает».
      console.warn('[RUNES-BUY] briefing:balance_read_failed', // guard-ok: ранний выход обязан логироваться и в релизе
        error instanceof Error ? `${error.name}: ${error.message}` : String(error));
    });
    return () => { cancelled = true; };
  }, [price, ownsScenario]);

  /**
   * Покупка доступа. Всё решается на телефоне и МГНОВЕННО (прямое требование
   * владельца: «сервер не принимает участия, он только синхронизация»).
   * Поэтому здесь нет ни крутилки, ни ожидания ответа: списали, открыли,
   * вошли в диалог — а синхронизация догоняет фоном.
   *
   * Защита от двойного тапа — ref, а не состояние: второй тап в том же кадре
   * не успел бы увидеть новое состояние и списал бы цену второй раз.
   */
  /**
   * Не хватает рун — ведём туда, где их берут.
   *
   * зачем (владелец 2026-09-20: «нажимаю купить диалог — он не
   * покупается и не открывается»): при балансе 523 и цене 5000 кнопка
   * стояла `disabled` и тап не делал НИЧЕГО — экран читался как сломанный.
   * Замок НЕ ослаблен: без оплаты в сессию по-прежнему не уйти
   * (дыра 17.09, когда тап при нехватке звал `onStart`, не возвращается).
   */
  const handleTopUp = useCallback(() => {
    console.log(`[RUNES-BUY] briefing:top_up scenario=${scenario?.id ?? 'null'} price=${price} balance=${runeBalance} short=${Math.max(0, price - runeBalance)}`); // guard-ok: ветка решения обязана логироваться и в релизе
    router.push('/runes_wallet' as never);
  }, [price, router, runeBalance, scenario]);

  // Причина неудачной покупки для человека: тап не смеет уходить в тишину.
  const [buyError, setBuyError] = useState<string | null>(null);
  const buyingRef = useRef(false);
  const handleBuy = useCallback(() => {
    console.log(`[RUNES-BUY] briefing:tap_buy scenario=${scenario?.id ?? 'null'} price=${price} balance=${runeBalance} busy=${buyingRef.current}`); // guard-ok: вход обязан логироваться и в релизе
    if (!scenario || buyingRef.current) {
      console.log(`[RUNES-BUY] briefing:tap_ignored scenario=${scenario?.id ?? 'null'} busy=${buyingRef.current}`); // guard-ok: ранний выход обязан логироваться и в релизе
      return;
    }
    buyingRef.current = true;
    const token = captureAccountGeneration();
    void buyDialogAccessLocally(studyTarget, token, scenario.id, price).then((result) => {
      // The grant belongs to the captured target even if its screen closed.
      if (result.ok) void syncDialogPurchases(studyTarget, token);
      // зачем: флаг снимаем ДО проверки монтирования — иначе при уходе
      // с экрана он залипал в `true` и кнопка оставалась мёртвой навсегда.
      buyingRef.current = false;
      if (!briefingMountedRef.current) {
        console.log(`[RUNES-BUY] briefing:late_result scenario=${scenario.id} ok=${result.ok} — экран закрыт`); // guard-ok: ранний выход обязан логироваться и в релизе
        return;
      }
      if (!result.ok) {
        console.log(`[RUNES-BUY] briefing:denied scenario=${scenario.id} reason=${result.reason}`); // guard-ok: отказ обязан логироваться и в релизе
        if (result.reason === 'insufficient_runes') {
          setRuneBalance((prev) => prev); // причина уже видна под кнопкой
        } else {
          // Молчание не отказ: человек обязан увидеть причину и мочь повторить.
          setBuyError(result.reason);
        }
        return;
      }
      setBuyError(null);
      console.log(`[RUNES-BUY] briefing:bought scenario=${scenario.id} already=${result.alreadyOwned} balance=${result.balance} → open`); // guard-ok: финальный результат обязан логироваться и в релизе
      setOwnedIds((prev) => new Set([...(prev ?? []), scenario.id]));
      setRuneBalance(result.balance);
      // Синхронизация фоном — экран её НЕ ждёт.
      openSessionRef.current?.();
    }).catch((error: unknown) => {
      buyingRef.current = false;
      console.warn('[RUNES-BUY] briefing:buy_failed', // guard-ok: сбой покупки обязан логироваться и в релизе
        error instanceof Error ? `${error.name}: ${error.message}` : String(error));
      if (briefingMountedRef.current) setBuyError('failed');
    });
  }, [price, runeBalance, scenario, studyTarget]);
  // Открытие сессии живёт ниже по файлу — держим ссылку, чтобы покупка могла
  // сразу войти в диалог, не дублируя навигацию.
  const openSessionRef = useRef<(() => void) | null>(null);
  const briefingMountedRef = useRef(true);
  useEffect(() => {
    briefingMountedRef.current = true;
    return () => {
      briefingMountedRef.current = false;
      openSessionRef.current = null;
    };
  }, []);
  const scenarioUnlocked = !scenario
    // Владение ещё не прочитано — молчание не отказ, ждём и не гоним на пейвол.
    || ownedIds === null
    || ownsScenario
    || isScenarioUnlockedForAccount(scenario.id, hasDialogAccess, ownedIds);

  // Отказ — единственный ранний выход этого экрана, поэтому логируем его всегда
  // и уводим на пейвол. Навигация в эффекте (во время рендера роутер трогать
  // нельзя), но экран при этом НЕ ждёт: вердикт уже известен, ниже сразу рисуем.
  useEffect(() => {
    if (!scenario || scenarioUnlocked) return;
    // зачем (владелец 2026-09-17): у сценария есть ЦЕНА В РУНАХ — значит это не
    // тупик, а предложение купить. Пейвол Plus тут врал бы: доступ продаётся за
    // руны, и человек может открыть диалог прямо на этом экране.
    if (price > 0) {
      console.log(`[RUNES-BUY] briefing:offer scenario=${scenario.id} price=${price}`); // guard-ok: ветка решения обязана логироваться и в релизе
      return;
    }
    console.log(`[DIALOG-GATE] briefing:access denied scenario=${scenario.id} cefr=${scenario.cefr} premium=${hasDialogAccess} → пейвол`); // guard-ok: ранний выход обязан логироваться и в релизе (правило «сперва логи»)
    void trackAiDialogEvent('ai_dialog_locked_scenario_tapped', {
      scenarioId: scenario.id, cefr: scenario.cefr, reason: 'direct_route_blocked',
    });
    void trackAiDialogEvent('paywall_shown', { context: 'dialog_locked_level', source: 'ai_dialog_briefing_direct' });
    markNextNavigationAsReplace();
    router.replace({ pathname: '/premium_modal', params: { context: 'dialog_locked_level', source: 'ai_dialog_briefing_direct' } } as never);
  }, [router, scenario, scenarioUnlocked, hasDialogAccess, price]);

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

  /**
   * ⛔ ПЛАТНЫЙ ЗА РУНЫ — НЕ ТУПИК (владелец 2026-09-17, экран 3 макета рун).
   *
   * зачем эта ветка ВЫШЕ экрана отказа: найдено на живом эмуляторе 17.09 —
   * в каталоге цена «ᚱ 5 000» показывалась, тап доходил до брифинга, а здесь
   * человек упирался в экран «Этот диалог в Plus» с единственной кнопкой
   * «Назад». Купить диалог за руны было НЕВОЗМОЖНО: экран покупки недостижим,
   * а сам отказ ещё и врал — доступ продаётся за руны, не только за Plus.
   *
   * Показываем афишу: на ней кнопка покупки (см. purchase ниже). Замок при
   * этом не ослаблен — без оплаты в сессию не уйти.
   */
  if (!scenarioUnlocked && price > 0) {
    console.log(`[RUNES-BUY] briefing:show_offer scenario=${scenario.id} price=${price}`); // guard-ok: ветка решения обязана логироваться и в релизе
  } else if (!scenarioUnlocked) {
    // Сценарий закрыт: эффект выше уже отправил на пейвол. Экран-задание в этот
    // кадр рисовать нельзя (мигнуло бы задание платного сценария с кнопкой
    // «Начать»), но и ЖДАТЬ здесь больше нечего — вердикт синхронный. Поэтому
    // не спиннер «Готовим разговор…», а понятная причина и выход: если переход
    // почему-то не случится, человек не останется в тупике.
    return (
      <RecoveryScreen
        icon="lock-closed-outline"
        title={triLang(lang, {
          ru: 'Этот диалог в Plus',
          uk: 'Цей діалог у Plus',
          en: 'This dialogue is in Plus',
          es: 'Este diálogo está en Plus',
          'pt-BR': 'Este diálogo está no Plus',
          vi: 'Hội thoại này thuộc Plus',
          id: 'Dialog ini ada di Plus',
          tr: 'Bu diyalog Plus içinde',
          pl: 'Ten dialog jest w Plus',
        })}
        body={triLang(lang, {
          ru: 'Откройте Plus, чтобы говорить во всех ситуациях. Три диалога доступны всегда.',
          uk: 'Відкрийте Plus, щоб говорити в усіх ситуаціях. Три діалоги доступні завжди.',
          en: 'Get Plus to talk in every situation. Three dialogues are always open.',
          es: 'Consigue Plus para hablar en todas las situaciones. Tres diálogos están siempre abiertos.',
          'pt-BR': 'Assine o Plus para falar em todas as situações. Três diálogos ficam sempre abertos.',
          vi: 'Mở Plus để trò chuyện trong mọi tình huống. Ba hội thoại luôn mở.',
          id: 'Buka Plus untuk berbicara di semua situasi. Tiga dialog selalu terbuka.',
          tr: 'Her durumda konuşmak için Plus al. Üç diyalog her zaman açık.',
          pl: 'Włącz Plus, aby rozmawiać w każdej sytuacji. Trzy dialogi są zawsze otwarte.',
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
  openSessionRef.current = openSession;

  return (
    <>
      <AiDialogBriefingScreen
        scenario={scenario}
        studyTarget={studyTarget}
        onBack={goBack}
        onStart={openSession}
        // Режим покупки — только когда сценарий платный и ещё не куплен.
        // Куплен или открыт подпиской → обычная кнопка «Начать диалог».
        purchase={price > 0 && !ownsScenario && !isScenarioUnlockedForAccount(scenario.id, hasDialogAccess, ownedIds)
          ? {
              priceRunes: price,
              balanceRunes: runeBalance,
              onBuy: handleBuy,
              onTopUp: handleTopUp,
              errorReason: buyError,
            }
          : null}
      />
    </>
  );
}
