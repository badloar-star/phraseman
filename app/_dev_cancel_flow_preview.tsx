// ════════════════════════════════════════════════════════════════════════════
// _dev_cancel_flow_preview — витрина сценариев ОТПИСКИ (только DEV).
//
// зачем (владелец, 2026-08-24): шаг удержания при отмене подписки нельзя
// проверить руками, не имея настоящей платной подписки и не проходя опрос
// заново ради каждой ветки. Здесь все состояния открываются в один тап —
// включая те, что в бою встречаются редко (пустой прогресс, длинные подписи,
// огромные числа).
//
// ⛔ ЦЕНЫ НЕ ТРОГАЕМ (владелец): ни в одном сценарии нет тарифов, скидок и сумм.
//
// Экран показывает ТУ ЖЕ вёрстку, что и боевой шит в manage_subscription.tsx.
// Расхождение вёрстки — известный риск витрин: если правишь боевой шит,
// поправь и здесь, иначе витрина начнёт врать. Общий источник — данные и
// resolveSaveOffer, а не копия логики.
// ════════════════════════════════════════════════════════════════════════════
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { LinearGradient } from '../components/SafeLinearGradient';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { usePaywallChrome, PaywallCloseButton } from '../components/paywall/paywallShared';
import { hapticTap } from '../hooks/use-haptics';
import { safeRouterBack } from './navigation_back';
import {
  resolveSaveOffer,
  type SaveOfferKind,
  type SaveOfferProgress,
} from './manage_subscription_save_offer';

/** Наборы прогресса: обычный, пустой и «ломающий вёрстку». */
const PROGRESS_PRESETS = {
  typical: { streak: 12, totalXP: 3400, lessonsCompleted: 7 },
  fresh: { streak: 1, totalXP: 40, lessonsCompleted: 1 },
  huge: { streak: 365, totalXP: 128400, lessonsCompleted: 512 },
  empty: { streak: 0, totalXP: 0, lessonsCompleted: 0 },
} as const satisfies Record<string, SaveOfferProgress>;

type PresetKey = keyof typeof PROGRESS_PRESETS;

const PRESET_LABEL: Record<PresetKey, string> = {
  typical: 'Обычный',
  fresh: 'Новичок',
  huge: 'Рекордный',
  empty: 'Пусто',
};

/** Причины ровно как в CANCEL_REASONS боевого экрана. */
const SCENARIOS: readonly { key: string; title: string; note: string }[] = [
  { key: 'too_expensive', title: 'Слишком дорого', note: 'Про цену не говорим — показываем прогресс' },
  { key: 'not_using', title: 'Не пользуюсь достаточно', note: 'Прогресс' },
  { key: 'temporary', title: 'Временно, вернусь позже', note: 'Прогресс' },
  { key: 'missing_features', title: 'Не хватает функций', note: 'Поддержка' },
  { key: 'technical', title: 'Технические проблемы', note: 'Поддержка' },
  { key: 'other', title: 'Другое', note: 'Уходим молча, шаг не показывается' },
];

export default function DevCancelFlowPreview() {
  const router = useRouter();
  const { lang } = useLang();
  const L = lang as Lang;
  const chrome = usePaywallChrome();
  const LP = (
    ru: string, uk: string, es: string, ptBR: string,
    vi: string, id: string, tr: string, pl: string,
  ) => triLang(L, { ru, uk, es, 'pt-BR': ptBR, vi, id, tr, pl });

  const [preset, setPreset] = useState<PresetKey>('typical');
  const [openedReason, setOpenedReason] = useState<string | null>(null);
  /** Сквозной прогон: индекс сценария, который показываем сейчас. */
  const [runIndex, setRunIndex] = useState<number | null>(null);
  /** Показать, что в бою здесь был бы выход в системный экран магазина. */
  const [storeNotice, setStoreNotice] = useState(false);
  /** Замок навигации: двойной тап не должен открывать экран обращения дважды. */
  const navBusyRef = useRef(false);

  const progress = PROGRESS_PRESETS[preset];

  /** Сценарии, у которых при текущем прогрессе есть что показать. */
  const runnableScenarios = useMemo(
    () => SCENARIOS.filter((s) => resolveSaveOffer({ reason: s.key, progress }) !== 'none'),
    [progress],
  );

  const activeReason = runIndex !== null
    ? runnableScenarios[runIndex]?.key ?? null
    : openedReason;

  const offer: SaveOfferKind = activeReason
    ? resolveSaveOffer({ reason: activeReason, progress })
    : 'none';

  const closeSheet = useCallback(() => {
    setOpenedReason(null);
    setRunIndex(null);
  }, []);

  const stepNext = useCallback(() => {
    setRunIndex((current) => {
      if (current === null) return null;
      const next = current + 1;
      return next < runnableScenarios.length ? next : null;
    });
  }, [runnableScenarios.length]);

  /**
   * Главная кнопка — ровно то же, что в бою (acceptSaveOffer):
   * «Написать нам» открывает настоящий экран обращения, «Остаться» закрывает шит.
   *
   * зачем (владелец, 24.08): в первой версии витрины ОБЕ кнопки просто закрывали
   * шит — «Написать нам» никуда не вело, и проверить переход было нельзя, хотя
   * витрина делалась именно для этого.
   */
  const acceptOffer = useCallback(() => {
    if (navBusyRef.current) return;
    hapticTap();
    if (offer === 'support') {
      // Тот же замок, что в боевом экране: двойной тап открывал бы экран
      // обращения двумя слоями. Снимаем при следующем открытии сценария.
      navBusyRef.current = true;
      setOpenedReason(null);
      setRunIndex(null);
      router.push('/ideas_submit');
      return;
    }
    if (runIndex !== null) stepNext();
    else closeSheet();
  }, [offer, runIndex, router, stepNext, closeSheet]);

  /**
   * «Всё равно отменить» — в бою это уход в системный экран магазина. Открывать
   * его из витрины нельзя (увёл бы из приложения и ничего не показал), поэтому
   * говорим словами, что именно произошло бы.
   */
  const declineOffer = useCallback(() => {
    hapticTap();
    setStoreNotice(true);
    if (runIndex !== null) stepNext();
    else closeSheet();
  }, [runIndex, stepNext, closeSheet]);

  const startRun = useCallback(() => {
    hapticTap();
    // Пометка с прошлого прогона сбивала бы с толку: гасим на старте нового.
    setStoreNotice(false);
    navBusyRef.current = false;
    setOpenedReason(null);
    setRunIndex(runnableScenarios.length > 0 ? 0 : null);
  }, [runnableScenarios.length]);

  const isMax = false;

  return (
    <LinearGradient colors={chrome.bgColors} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={S.root}>
      <SafeAreaView style={S.safe}>
        <ScrollView decelerationRate="fast" contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>
          <PaywallCloseButton onPress={() => { hapticTap(); safeRouterBack(router, '/(tabs)/settings'); }} chrome={chrome} />

          <Text style={[S.title, { color: chrome.textPrimary }]}>Отписка</Text>
          <Text style={[S.lead, { color: chrome.textMuted }]}>
            Шаг удержания при отмене подписки. Причина решает, что увидит человек. Цены и тарифы здесь не участвуют.
          </Text>

          {storeNotice && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Скрыть пометку об уходе в магазин"
              onPress={() => { hapticTap(); setStoreNotice(false); }}
              style={[S.notice, { backgroundColor: `${chrome.tc.heroAccent}1A` }]}
            >
              <Ionicons name="exit-outline" size={18} color={chrome.tc.heroAccent} />
              <Text style={[S.noticeText, { color: chrome.textPrimary }]}>
                В бою здесь открылся бы системный экран отмены подписки. Из витрины не открываем — нажми, чтобы скрыть.
              </Text>
            </TouchableOpacity>
          )}

          <Text style={[S.groupLabel, { color: chrome.textMuted }]}>ПРОГРЕСС</Text>
          <View style={S.presetRow}>
            {(Object.keys(PROGRESS_PRESETS) as PresetKey[]).map((key) => {
              const active = preset === key;
              return (
                <TouchableOpacity
                  key={key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => { hapticTap(); setPreset(key); }}
                  style={[S.preset, { backgroundColor: active ? chrome.tc.ctaBg : `${chrome.tc.heroAccent}14` }]}
                >
                  <Text style={[S.presetText, { color: active ? chrome.tc.ctaText : chrome.textPrimary }]}>
                    {PRESET_LABEL[key]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[S.presetDetail, { color: chrome.textMuted }]}>
            {`Серия ${progress.streak} · уроков ${progress.lessonsCompleted} · опыта ${progress.totalXP}`}
          </Text>

          <Text style={[S.groupLabel, { color: chrome.textMuted }]}>СЦЕНАРИИ</Text>
          {SCENARIOS.map((scenario) => {
            const kind = resolveSaveOffer({ reason: scenario.key, progress });
            return (
              <TouchableOpacity
                key={scenario.key}
                accessibilityRole="button"
                onPress={() => { hapticTap(); navBusyRef.current = false; setStoreNotice(false); setRunIndex(null); setOpenedReason(scenario.key); }}
                style={[S.card, { backgroundColor: `${chrome.tc.heroAccent}10` }]}
              >
                <View style={S.cardText}>
                  <Text style={[S.cardTitle, { color: chrome.textPrimary }]}>{scenario.title}</Text>
                  <Text style={[S.cardNote, { color: chrome.textMuted }]}>{scenario.note}</Text>
                </View>
                <View style={[S.kindChip, { backgroundColor: `${chrome.tc.heroAccent}1F` }]}>
                  <Text style={[S.kindChipText, { color: chrome.tc.heroAccent }]}>
                    {kind === 'progress' ? 'прогресс' : kind === 'support' ? 'поддержка' : 'нет шага'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={chrome.textMuted} />
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            accessibilityRole="button"
            onPress={startRun}
            disabled={runnableScenarios.length === 0}
            accessibilityState={{ disabled: runnableScenarios.length === 0 }}
            style={[S.runBtn, { backgroundColor: chrome.tc.ctaBg, opacity: runnableScenarios.length === 0 ? 0.5 : 1 }]}
          >
            <Text style={[S.runBtnText, { color: chrome.tc.ctaText }]}>
              {runnableScenarios.length === 0
                ? 'Сквозной прогон — нечего показывать'
                : `Сквозной прогон — ${runnableScenarios.length} шт.`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => { hapticTap(); router.push('/manage_subscription?source=dev_hub' as never); }}
            style={[S.secondaryBtn, { backgroundColor: `${chrome.tc.heroAccent}14` }]}
          >
            <Text style={[S.secondaryBtnText, { color: chrome.textPrimary }]}>Открыть живой экран подписки</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Шаг удержания — вёрстка повторяет боевой шит manage_subscription. */}
        {activeReason && offer !== 'none' && (
          <View style={S.sheetOverlay}>
            <View style={[S.sheet, { backgroundColor: chrome.bgColors[1] ?? '#11151a' }]}>
              {runIndex !== null && (
                <Text style={[S.runCounter, { color: chrome.textMuted }]}>
                  {`${runIndex + 1} / ${runnableScenarios.length} · ${runnableScenarios[runIndex]?.title ?? ''}`}
                </Text>
              )}
              <Text style={[S.sheetTitle, { color: chrome.textPrimary }]}>
                {offer === 'support'
                  ? LP('Расскажи, что пошло не так', 'Розкажи, що пішло не так', 'Cuéntanos qué salió mal', 'Conte o que deu errado', 'Hãy cho chúng tôi biết vấn đề', 'Ceritakan apa yang salah', 'Neyin yanlış gittiğini anlat', 'Napisz, co poszło nie tak')
                  : LP('Ты уже многого добился', 'Ти вже багато чого досяг', 'Ya has logrado mucho', 'Você já conquistou muito', 'Bạn đã đạt được rất nhiều', 'Kamu sudah mencapai banyak hal', 'Şimdiden çok şey başardın', 'Już wiele osiągnąłeś')}
              </Text>
              <Text style={[S.sheetSub, { color: chrome.textMuted }]}>
                {offer === 'support'
                  ? LP('Мы читаем каждое обращение и чиним то, что мешает.', 'Ми читаємо кожне звернення і лагодимо те, що заважає.', 'Leemos cada mensaje y arreglamos lo que molesta.', 'Lemos cada mensagem e corrigimos o que atrapalha.', 'Chúng tôi đọc mọi phản hồi và sửa những gì gây cản trở.', 'Kami membaca setiap pesan dan memperbaiki yang mengganggu.', 'Her mesajı okuyoruz ve engel olan şeyi düzeltiyoruz.', 'Czytamy każde zgłoszenie i naprawiamy to, co przeszkadza.')
                  : LP('Прогресс останется с тобой, но занятия придётся продолжать без Plus.', 'Прогрес залишиться з тобою, але заняття доведеться продовжувати без Plus.', 'Tu progreso se queda, pero seguirás sin Plus.', 'Seu progresso fica, mas você seguirá sem o Plus.', 'Tiến trình vẫn còn, nhưng bạn sẽ học tiếp mà không có Plus.', 'Progresmu tetap ada, tetapi kamu akan lanjut tanpa Plus.', 'İlerlemen kalır, ama Plus olmadan devam edeceksin.', 'Twoje postępy zostaną, ale będziesz uczyć się bez Plus.')}
              </Text>

              {offer === 'progress' && (
                <View style={S.offerStats}>
                  {progress.streak > 0 && (
                    <View style={[S.offerStat, { backgroundColor: `${chrome.tc.heroAccent}14` }]}>
                      <Text style={[S.offerStatNum, { color: chrome.tc.heroAccent }]}>{progress.streak}</Text>
                      <Text style={[S.offerStatLabel, { color: chrome.textMuted }]} maxFontSizeMultiplier={1.2}>
                        {LP('дней подряд', 'днів поспіль', 'días seguidos', 'dias seguidos', 'ngày liên tiếp', 'hari berturut', 'gün üst üste', 'dni z rzędu')}
                      </Text>
                    </View>
                  )}
                  {progress.lessonsCompleted > 0 && (
                    <View style={[S.offerStat, { backgroundColor: `${chrome.tc.heroAccent}14` }]}>
                      <Text style={[S.offerStatNum, { color: chrome.tc.heroAccent }]}>{progress.lessonsCompleted}</Text>
                      <Text style={[S.offerStatLabel, { color: chrome.textMuted }]} maxFontSizeMultiplier={1.2}>
                        {LP('уроков', 'уроків', 'lecciones', 'aulas', 'bài học', 'pelajaran', 'ders', 'lekcji')}
                      </Text>
                    </View>
                  )}
                  {progress.totalXP > 0 && (
                    <View style={[S.offerStat, { backgroundColor: `${chrome.tc.heroAccent}14` }]}>
                      <Text style={[S.offerStatNum, { color: chrome.tc.heroAccent }]}>{progress.totalXP}</Text>
                      <Text style={[S.offerStatLabel, { color: chrome.textMuted }]} maxFontSizeMultiplier={1.2}>
                        {LP('опыта', 'досвіду', 'de experiencia', 'de experiência', 'kinh nghiệm', 'pengalaman', 'deneyim', 'doświadczenia')}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <TouchableOpacity
                accessibilityRole="button"
                onPress={acceptOffer}
                style={[S.sheetPrimary, { backgroundColor: chrome.tc.ctaBg }]}
              >
                <Text style={[S.sheetPrimaryText, { color: chrome.tc.ctaText }]}>
                  {offer === 'support'
                    ? LP('Написать нам', 'Написати нам', 'Escríbenos', 'Fale conosco', 'Nhắn cho chúng tôi', 'Hubungi kami', 'Bize yaz', 'Napisz do nas')
                    : (isMax
                        ? LP('Остаться в MAX', 'Залишитися в MAX', 'Quedarme en MAX', 'Ficar no MAX', 'Ở lại MAX', 'Tetap di MAX', "MAX'te kal", 'Zostań w MAX')
                        : LP('Остаться в Plus', 'Залишитися в Plus', 'Quedarme en Plus', 'Ficar no Plus', 'Ở lại Plus', 'Tetap di Plus', "Plus'da kal", 'Zostań w Plus'))}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                onPress={declineOffer}
                style={S.sheetSecondary}
              >
                <Text style={[S.sheetSecondaryText, { color: chrome.textMuted }]}>
                  {LP('Всё равно отменить', 'Все одно скасувати', 'Cancelar de todos modos', 'Cancelar mesmo assim', 'Vẫn hủy', 'Tetap batalkan', 'Yine de iptal et', 'Anuluj mimo to')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const S = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, marginTop: 8 },
  lead: { fontSize: 14, marginTop: 6, marginBottom: 22, lineHeight: 20 },
  groupLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginTop: 18, marginBottom: 10 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18 },
  presetRow: { flexDirection: 'row', gap: 8 },
  preset: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  presetText: { fontSize: 13, fontWeight: '700' },
  presetDetail: { fontSize: 13, marginTop: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 8 },
  cardText: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardNote: { fontSize: 12 },
  kindChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  kindChipText: { fontSize: 11, fontWeight: '700' },
  runBtn: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  runBtnText: { fontSize: 15, fontWeight: '700' },
  secondaryBtn: { minHeight: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  secondaryBtnText: { fontSize: 15, fontWeight: '700' },
  sheetOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 34 },
  runCounter: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8 },
  sheetTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },
  sheetSub: { fontSize: 13, marginTop: 4, marginBottom: 14 },
  offerStats: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 4 },
  offerStat: { flex: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', gap: 2 },
  offerStatNum: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  offerStatLabel: { fontSize: 12, fontWeight: '400', textAlign: 'center' },
  sheetPrimary: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  sheetPrimaryText: { fontSize: 16, fontWeight: '700' },
  sheetSecondary: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  sheetSecondaryText: { fontSize: 14, fontWeight: '700' },
});
