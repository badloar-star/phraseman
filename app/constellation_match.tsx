// ════════════════════════════════════════════════════════════════════════════
// constellation_match.tsx — живой матч «Созвездий» (спек F3/A3/A11, v1).
//
// Экран = проекция серверного матча: подписка на constellation_matches/{id}
// и свой constellation_players-док; ЛЮБОЙ ход — только callable (никаких
// прямых записей). Фазы сервера: choose (выбор цели/щит) → answer (цепочка
// вопросов с правилом после каждого ответа) → резолв (сервер перерисовывает
// stars/roundEvents). Матч живёт на сервере — экран можно убить/вернуться.
//
// Performance Bible: секундный тик дедлайна — ≥1000мс, гейт фокусом, очистка
// (внесён в owner-контракт); вечных анимаций нет; freezeOnBlur:false —
// осознанное realtime-исключение (perf_freeze_contract).
// v1-хвосты (осознанно, добавятся полировкой): pan/pinch карты, зрительская
// live-трансляция чужой дуэли (F3a), резолв-синематик (сейчас — вспышка+хаптика).
// ════════════════════════════════════════════════════════════════════════════

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DuoPressable from '../components/DuoPressable';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';
import { hapticError, hapticMediumImpact, hapticSuccess } from '../hooks/use-haptics';
import {
  submitAnswer,
  submitChooseTarget,
  submitEmote,
  submitPhaseTick,
  submitUseShield,
  subscribeConstellationMatch,
  subscribeMyConstellationPlayer,
} from './services/constellations_db';
import { ensureArenaAuthUid } from './user_id_policy';
import {
  ConstellationSkyMap,
  CONSTELLATION_SLOT_COLORS,
} from './constellation_sky_map';
import { hexKey, neighborsInMap, parseHexKey, ringOf } from './constellations_hex';
import type {
  ConstellationMatch,
  ConstellationMatchPlayer,
  ConstellationPlayerPrivate,
} from './types/constellations';

/** Эмоуты F10: id серверные, тексты — на языке матча (studyTarget en v1). */
const EMOTES: ReadonlyArray<{ id: string; text: string }> = [
  { id: 'well_played', text: 'Well played!' },
  { id: 'not_bad', text: 'Not bad…' },
  { id: 'too_easy', text: 'Too easy!' },
  { id: 'gg', text: 'GG' },
];
const EMOTE_SHOW_MS = 3000;

export default function ConstellationMatchScreen() {
  const router = useRouter();
  const { matchId: rawMatchId } = useLocalSearchParams<{ matchId?: string }>();
  const matchId = typeof rawMatchId === 'string' ? rawMatchId : '';
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const focused = useIsScreenFocused();
  const insets = useSafeAreaInsets();

  const [uid, setUid] = useState<string | null>(null);
  const [match, setMatch] = useState<ConstellationMatch | null>(null);
  const [me, setMe] = useState<ConstellationPlayerPrivate | null>(null);
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  const [sheetKey, setSheetKey] = useState<string | null>(null);
  const [shieldMode, setShieldMode] = useState(false);
  const [lastRule, setLastRule] = useState<{ correct: boolean; rule: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const navigatedRef = useRef(false);
  const prevRoundRef = useRef(0);

  useEffect(() => { void ensureArenaAuthUid().then(setUid); }, []);

  // Подписки на матч и свой док.
  useEffect(() => {
    if (!matchId || !uid) return;
    const unsubMatch = subscribeConstellationMatch(matchId, setMatch);
    const unsubMe = subscribeMyConstellationPlayer(matchId, uid, setMe);
    return () => { unsubMatch(); unsubMe(); };
  }, [matchId, uid]);

  // Секундный тик дедлайна фазы (гейт фокусом, очистка — owner-контракт).
  useEffect(() => {
    if (!focused) return;
    const id = setInterval(() => setNowSec(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, [focused]);

  // Анти-зависание: когда дедлайн фазы истёк, клиент сам просит сервер
  // форсировать переход раунда — не ждём минутный watchdog-cron (иначе фаза
  // «висит» до ~60с для одинокого игрока против ботов). Идемпотентно по
  // раунду+фазе; сервер проверяет дедлайн сам. Дёргаем один раз на фазу.
  const tickSentRef = useRef<string>('');
  useEffect(() => {
    if (!focused || !match || !uid) return;
    if (match.stage !== 'active') return;
    const deadlineSec = Math.ceil(match.phaseDeadlineAt / 1000);
    if (nowSec < deadlineSec) return;
    const tickKey = `${match.round}:${match.phase}`;
    if (tickSentRef.current === tickKey) return;
    tickSentRef.current = tickKey;
    void submitPhaseTick(matchId, uid, match.round, match.phase).catch(() => {
      // Не вышло — сбросим маркер, чтобы следующий тик повторил попытку.
      tickSentRef.current = '';
    });
  }, [focused, match, uid, matchId, nowSec]);

  const myPublic: ConstellationMatchPlayer | null = useMemo(
    () => match?.players.find((p) => p.uid === uid) ?? null,
    [match, uid],
  );
  const mySlot = myPublic?.slot ?? null;

  // Резолв: новый раунд → вспышка последнего захвата + хаптика + сброс локального UI.
  useEffect(() => {
    if (!match) return;
    if (match.round !== prevRoundRef.current) {
      prevRoundRef.current = match.round;
      setSheetKey(null);
      setShieldMode(false);
      setLastRule(null);
      const capture = match.roundEvents.find(
        (e) => (e.type === 'capture' || e.type === 'duel_capture') && e.starKey,
      );
      if (capture?.starKey) {
        setFlashKey(capture.starKey);
        setTimeout(() => setFlashKey(null), 1100);
      }
      if (match.roundEvents.length > 0) hapticMediumImpact();
    }
  }, [match]);

  // Финиш → экран результатов.
  useEffect(() => {
    if (!match || navigatedRef.current) return;
    if (match.stage === 'finished') {
      navigatedRef.current = true;
      router.replace({ pathname: '/constellation_results', params: { matchId } } as any);
    }
  }, [match, matchId, router]);

  // Легальные цели фазы выбора: соседи моих звёзд (сервер валидирует повторно).
  const legalTargets = useMemo(() => {
    if (!match || mySlot === null || myPublic?.status !== 'alive') return [];
    if (match.phase !== 'choose') return [];
    const out = new Set<string>();
    for (const [key, star] of Object.entries(match.stars)) {
      if (star.owner !== mySlot) continue;
      const h = parseHexKey(key);
      if (!h) continue;
      for (const n of neighborsInMap(h)) {
        const nKey = hexKey(n);
        if (match.stars[nKey]?.owner !== mySlot) out.add(nKey);
      }
    }
    return [...out];
  }, [match, mySlot, myPublic]);

  const secondsLeft = match ? Math.max(0, Math.ceil(match.phaseDeadlineAt / 1000) - nowSec) : 0;

  const onStarPress = useCallback((key: string) => {
    if (!match || !uid || mySlot === null) return;
    if (match.phase !== 'choose' || myPublic?.status !== 'alive') return;
    if (shieldMode) {
      if (match.stars[key]?.owner === mySlot && !myPublic.shieldUsed) {
        setShieldMode(false);
        setBusy(true);
        void submitUseShield(matchId, uid, key)
          .then(() => hapticSuccess())
          .catch(() => hapticError())
          .finally(() => setBusy(false));
      }
      return;
    }
    if (legalTargets.includes(key)) setSheetKey(key);
  }, [match, uid, mySlot, myPublic, shieldMode, legalTargets, matchId]);

  const confirmTarget = useCallback(() => {
    if (!sheetKey || !uid || busy) return;
    setBusy(true);
    void submitChooseTarget(matchId, uid, sheetKey)
      .then(() => { hapticMediumImpact(); setSheetKey(null); })
      .catch(() => hapticError())
      .finally(() => setBusy(false));
  }, [sheetKey, uid, busy, matchId]);

  const onAnswer = useCallback((answerIndex: number) => {
    if (!me || !uid || busy) return;
    const qIndex = me.answers.length;
    setBusy(true);
    void submitAnswer(matchId, uid, qIndex, answerIndex)
      .then((res) => {
        if (res.correct) hapticSuccess(); else hapticError();
        setLastRule({ correct: !!res.correct, rule: res.rule ?? '' });
      })
      .catch(() => hapticError())
      .finally(() => setBusy(false));
  }, [me, uid, busy, matchId]);

  const onEmote = useCallback((emoteId: string) => {
    if (!uid) return;
    void submitEmote(matchId, uid, emoteId).catch(() => {});
  }, [matchId, uid]);

  // Последний свежий эмоут для пузыря.
  const activeEmote = useMemo(() => {
    if (!match || match.emotes.length === 0) return null;
    const last = match.emotes[match.emotes.length - 1];
    if (Date.now() - last.at > EMOTE_SHOW_MS) return null;
    const def = EMOTES.find((e) => e.id === last.emoteId);
    if (!def) return null;
    const sender = match.players.find((p) => p.slot === last.slot);
    return { text: def.text, name: sender?.name ?? '', slot: last.slot };
  }, [match, nowSec]); // nowSec — чтобы пузырь сам гас

  const skyColors = useMemo(
    (): [string, string, string] => [t.bgGradient?.[0] ?? '#0A1124', '#0E1734', '#080D1F'],
    [t],
  );

  if (!match || !myPublic) {
    // Мгновенный первый кадр: финальная геометрия неба, без спиннера (Библия).
    return <LinearGradient colors={skyColors} style={styles.root} />;
  }

  const isChoose = match.phase === 'choose';
  const iAmOut = myPublic.status === 'out';
  const iAmFalling = myPublic.status === 'falling';
  const currentQuestion = !isChoose && me && me.round === match.round && me.answers.length < me.questions.length
    ? me.questions[me.answers.length]
    : null;
  const answeredAll = !isChoose && me && me.round === match.round
    && me.questions.length > 0 && me.answers.length >= me.questions.length;
  const myTargetThisRound = me && me.round === match.round ? me.target : null;
  const isDuel = me?.kind === 'duel' && me.round === match.round;

  return (
    <View style={styles.root}>
      <LinearGradient colors={skyColors} style={StyleSheet.absoluteFill} />

      {/* HUD: раунд, таймер фазы, фаза */}
      <View style={[styles.hud, { paddingTop: insets.top + 8 }]}>
        <View style={[styles.roundBox, { borderColor: t.border }]}>
          <Text style={[styles.roundText, { color: t.textSecond, fontSize: f.caption }]}>
            {triLang(lang, {
              ru: 'раунд', uk: 'раунд', es: 'ronda', 'pt-BR': 'rodada',
              vi: 'vòng', id: 'ronde', tr: 'tur', pl: 'runda',
            })}{' '}
            <Text style={{ color: t.textPrimary, fontWeight: '800' }}>{match.round}</Text>
            /{match.roundsTotal}
          </Text>
        </View>
        <View style={[styles.timerPill, { borderColor: t.border }]}>
          <Ionicons name="time" size={13} color={secondsLeft <= 5 ? '#FF8080' : t.accent} />
          <Text style={[styles.timerText, {
            color: secondsLeft <= 5 ? '#FF8080' : t.textPrimary, fontSize: f.caption,
          }]}>
            {secondsLeft}s
          </Text>
        </View>
        {match.starfall.golden ? (
          <View style={styles.goldChip}>
            <Text style={styles.goldChipText}>◆ {myPublic.starfallEarned}</Text>
          </View>
        ) : null}
        <View style={[styles.phaseTag, { backgroundColor: isChoose ? t.accent : '#FFC65C' }]}>
          <Text style={styles.phaseTagText}>
            {isChoose
              ? triLang(lang, {
                ru: 'ВЫБОР ЦЕЛИ', uk: 'ВИБІР ЦІЛІ', es: 'ELIGE OBJETIVO', 'pt-BR': 'ESCOLHA ALVO',
                vi: 'CHỌN MỤC TIÊU', id: 'PILIH TARGET', tr: 'HEDEF SEÇ', pl: 'WYBIERZ CEL',
              })
              : triLang(lang, {
                ru: 'ОТВЕЧАЙ!', uk: 'ВІДПОВІДАЙ!', es: '¡RESPONDE!', 'pt-BR': 'RESPONDA!',
                vi: 'TRẢ LỜI!', id: 'JAWAB!', tr: 'CEVAPLA!', pl: 'ODPOWIADAJ!',
              })}
          </Text>
        </View>
      </View>

      {/* Полоса игроков */}
      <View style={styles.playersRow}>
        {match.players.map((p) => (
          <View key={p.slot} style={[styles.playerChip, { borderColor: t.border }]}>
            <View style={[styles.playerAva, { backgroundColor: CONSTELLATION_SLOT_COLORS[p.slot] }]}>
              <Text style={styles.playerAvaText}>{(p.name[0] ?? '?').toUpperCase()}</Text>
            </View>
            <View style={styles.playerInfo}>
              <Text numberOfLines={1} style={[styles.playerName, { color: t.textSecond }]}>
                {p.uid === uid ? triLang(lang, {
                  ru: 'Ты', uk: 'Ти', es: 'Tú', 'pt-BR': 'Você',
                  vi: 'Bạn', id: 'Kamu', tr: 'Sen', pl: 'Ty',
                }) : p.name}
              </Text>
              <Text style={[styles.playerScore, { color: t.textPrimary }]}>{p.bonusPoints}</Text>
            </View>
            <View style={[styles.playerDot, p.roundDone && styles.playerDotDone]} />
          </View>
        ))}
      </View>

      {/* Карта: объём нарисован внутри SVG (грани/высоты) — без RN-perspective,
          он смещал и обрезал проекцию на устройстве. Геометрия — по aspect viewBox. */}
      <View style={styles.mapBox}>
        <View style={styles.mapFrame}>
          <ConstellationSkyMap
            stars={match.stars}
            homes={match.homes}
            players={match.players}
            highlightKeys={isChoose && !shieldMode ? legalTargets : undefined}
            myTargetKey={myTargetThisRound}
            mySlot={mySlot}
            onStarPress={onStarPress}
            flashKey={flashKey}
          />
        </View>
        {activeEmote ? (
          <View style={[styles.emoteBubble, { borderColor: CONSTELLATION_SLOT_COLORS[activeEmote.slot] }]}>
            <Text style={styles.emoteText}>{activeEmote.text}</Text>
            <Text style={[styles.emoteName, { color: t.textSecond }]}>{activeEmote.name}</Text>
          </View>
        ) : null}
      </View>

      {/* Нижняя зона: щит + эмоуты в choose; статусы */}
      {isChoose && myPublic.status === 'alive' ? (
        <View style={styles.bottomRow}>
          {!myPublic.shieldUsed ? (
            <TouchableOpacity
              testID="constellation-shield"
              style={[styles.shieldBtn, {
                borderColor: shieldMode ? t.accent : t.border,
                backgroundColor: shieldMode ? `${t.accent}22` : 'transparent',
              }]}
              onPress={() => { setShieldMode((v) => !v); setSheetKey(null); }}
            >
              <Ionicons name="shield" size={16} color={shieldMode ? t.accent : t.textSecond} />
              <Text style={{ color: shieldMode ? t.accent : t.textSecond, fontSize: f.caption, fontWeight: '700' }}>
                {shieldMode
                  ? triLang(lang, {
                    ru: 'Тапни свою звезду', uk: 'Тапни свою зірку', es: 'Toca tu estrella',
                    'pt-BR': 'Toque sua estrela', vi: 'Chạm sao của bạn', id: 'Ketuk bintangmu',
                    tr: 'Yıldızına dokun', pl: 'Dotknij swojej gwiazdy',
                  })
                  : triLang(lang, {
                    ru: 'Щит сияния', uk: 'Щит сяйва', es: 'Escudo', 'pt-BR': 'Escudo',
                    vi: 'Khiên', id: 'Perisai', tr: 'Kalkan', pl: 'Tarcza',
                  })}
              </Text>
            </TouchableOpacity>
          ) : null}
          <View style={styles.emoteRow}>
            {EMOTES.map((e) => (
              <TouchableOpacity key={e.id} style={[styles.emoteBtn, { borderColor: t.border }]}
                onPress={() => onEmote(e.id)}>
                <Text style={{ color: t.textSecond, fontSize: f.caption - 1 }}>{e.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      {/* Шторка цели (choose) */}
      {sheetKey && isChoose ? (
        <TargetSheet
          lang={lang}
          starKey={sheetKey}
          match={match}
          busy={busy}
          onConfirm={confirmTarget}
          onClose={() => setSheetKey(null)}
        />
      ) : null}

      {/* Квиз-оверлей (answer) */}
      {currentQuestion ? (
        <QuizOverlay
          lang={lang}
          isDuel={!!isDuel}
          qIndex={me?.answers.length ?? 0}
          total={me?.questions.length ?? 0}
          question={currentQuestion.question}
          options={currentQuestion.options}
          busy={busy}
          lastRule={lastRule}
          onAnswer={onAnswer}
          onRuleSeen={() => setLastRule(null)}
        />
      ) : null}

      {/* Ответил всё — ждём резолв (микро-обучение уже показано) */}
      {answeredAll && !currentQuestion && !iAmOut ? (
        <View style={[styles.waitCard, { borderColor: t.border, backgroundColor: 'rgba(8,13,30,0.92)' }]}>
          <Ionicons name="checkmark-done" size={18} color={t.accent} />
          <Text style={{ color: t.textSecond, fontSize: f.caption }}>
            {triLang(lang, {
              ru: 'Готово — ждём остальных…', uk: 'Готово — чекаємо інших…',
              es: 'Listo — esperando al resto…', 'pt-BR': 'Pronto — esperando os outros…',
              vi: 'Xong — chờ người khác…', id: 'Selesai — menunggu yang lain…',
              tr: 'Tamam — diğerleri bekleniyor…', pl: 'Gotowe — czekamy na innych…',
            })}
          </Text>
        </View>
      ) : null}

      {/* Падающая звезда (A11) */}
      {iAmFalling ? (
        <View style={[styles.fallingBanner, { borderColor: '#FF7A9E' }]}>
          <Text style={styles.fallingTitle}>
            {triLang(lang, {
              ru: '💫 Ты — Падающая звезда', uk: '💫 Ти — Падаюча зірка',
              es: '💫 Eres una estrella fugaz', 'pt-BR': '💫 Você é uma estrela cadente',
              vi: '💫 Bạn là sao băng', id: '💫 Kamu bintang jatuh',
              tr: '💫 Kayan yıldızsın', pl: '💫 Jesteś spadającą gwiazdą',
            })}
          </Text>
          <Text style={[styles.fallingSub, { color: t.textSecond, fontSize: f.caption }]}>
            {triLang(lang, {
              ru: `Свет: ${myPublic.fallingLight}/2 · отвечай верно, чтобы возродиться`,
              uk: `Світло: ${myPublic.fallingLight}/2 · відповідай вірно, щоб відродитись`,
              es: `Luz: ${myPublic.fallingLight}/2 · responde bien para renacer`,
              'pt-BR': `Luz: ${myPublic.fallingLight}/2 · responda certo para renascer`,
              vi: `Ánh sáng: ${myPublic.fallingLight}/2`,
              id: `Cahaya: ${myPublic.fallingLight}/2`,
              tr: `Işık: ${myPublic.fallingLight}/2`,
              pl: `Światło: ${myPublic.fallingLight}/2`,
            })}
          </Text>
        </View>
      ) : null}

      {/* Выбит окончательно (A11): «Звезда погасла» */}
      {iAmOut ? (
        <View style={[styles.outOverlay]}>
          <Text style={styles.outTitle}>
            {triLang(lang, {
              ru: 'Звезда погасла', uk: 'Зірка згасла', es: 'La estrella se apagó',
              'pt-BR': 'A estrela se apagou', vi: 'Ngôi sao đã tắt', id: 'Bintang padam',
              tr: 'Yıldız söndü', pl: 'Gwiazda zgasła',
            })}
          </Text>
          <Text style={[styles.outSub, { fontSize: f.caption }]}>
            {triLang(lang, {
              ru: 'Награды за место уже начислены. Знания — с собой.',
              uk: 'Нагороди за місце вже нараховано.',
              es: 'Las recompensas ya son tuyas.',
              'pt-BR': 'As recompensas já são suas.',
              vi: 'Phần thưởng đã được cộng.',
              id: 'Hadiah sudah masuk.',
              tr: 'Ödüller hesabında.',
              pl: 'Nagrody już przyznane.',
            })}
          </Text>
          <DuoPressable
            testID="constellation-out-requeue"
            onPress={() => router.replace('/constellation_search' as any)}
            edgeColor={t.accent}
            style={[styles.outBtn, { backgroundColor: t.accent }]}
          >
            <Text style={{ color: t.correctText, fontWeight: '800', fontSize: f.sub }}>
              {triLang(lang, {
                ru: '⭐ Играть снова', uk: '⭐ Грати знову', es: '⭐ Jugar otra vez',
                'pt-BR': '⭐ Jogar de novo', vi: '⭐ Chơi lại', id: '⭐ Main lagi',
                tr: '⭐ Tekrar oyna', pl: '⭐ Zagraj znów',
              })}
            </Text>
          </DuoPressable>
          <TouchableOpacity onPress={() => router.back()} style={[styles.outGhost, { borderColor: t.border }]}>
            <Text style={{ color: t.textSecond, fontSize: f.body }}>
              {triLang(lang, {
                ru: 'В арену', uk: 'До арени', es: 'A la arena', 'pt-BR': 'Para a arena',
                vi: 'Về đấu trường', id: 'Ke arena', tr: 'Arenaya', pl: 'Do areny',
              })}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

// ── Шторка цели ──────────────────────────────────────────────────────────────

interface TargetSheetProps {
  lang: Lang;
  starKey: string;
  match: ConstellationMatch;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const TargetSheet = memo(function TargetSheet({
  lang, starKey, match, busy, onConfirm, onClose,
}: TargetSheetProps) {
  const { theme: t, f } = useTheme();
  const star = match.stars[starKey];
  const hex = parseHexKey(starKey);
  if (!star || !hex) return null;
  const ring = ringOf(hex);
  const owner = star.owner !== null ? match.players.find((p) => p.slot === star.owner) : null;
  const isHome = owner ? match.homes[owner.slot] === starKey : false;
  const baseQuestions = isHome
    ? (owner && owner.cores === 1 ? 3 : 2)
    : ring === 'polar' ? 3 : ring === 'outer' ? 1 : 2;
  const questions = isHome && owner && owner.cores === 1
    ? 3
    : Math.min(4, baseQuestions + star.radiance);

  const ringName = triLang(lang, {
    ru: { outer: 'Внешнее кольцо', middle: 'Среднее кольцо', inner: 'Внутреннее кольцо', polar: 'Полярная звезда' }[ring],
    uk: { outer: 'Зовнішнє кільце', middle: 'Середнє кільце', inner: 'Внутрішнє кільце', polar: 'Полярна зірка' }[ring],
    es: { outer: 'Anillo exterior', middle: 'Anillo medio', inner: 'Anillo interior', polar: 'Estrella Polar' }[ring],
    'pt-BR': { outer: 'Anel externo', middle: 'Anel médio', inner: 'Anel interno', polar: 'Estrela Polar' }[ring],
    vi: { outer: 'Vòng ngoài', middle: 'Vòng giữa', inner: 'Vòng trong', polar: 'Sao Bắc Cực' }[ring],
    id: { outer: 'Cincin luar', middle: 'Cincin tengah', inner: 'Cincin dalam', polar: 'Bintang Kutub' }[ring],
    tr: { outer: 'Dış halka', middle: 'Orta halka', inner: 'İç halka', polar: 'Kutup Yıldızı' }[ring],
    pl: { outer: 'Zewnętrzny pierścień', middle: 'Środkowy pierścień', inner: 'Wewnętrzny pierścień', polar: 'Gwiazda Polarna' }[ring],
  });

  return (
    <View style={[sheetStyles.sheet, { backgroundColor: 'rgba(8,13,30,0.96)', borderColor: '#2A3A6A' }]}>
      <View style={sheetStyles.head}>
        <Text style={[sheetStyles.title, { color: t.textPrimary, fontSize: f.sub + 1 }]}>
          {isHome && owner && owner.cores === 1 ? '🔥 ' : '⭐ '}{ringName}
        </Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={20} color={t.textSecond} />
        </TouchableOpacity>
      </View>
      <View style={sheetStyles.meta}>
        {owner ? (
          <View style={[sheetStyles.chip, { borderColor: t.border }]}>
            <Text style={{ color: CONSTELLATION_SLOT_COLORS[owner.slot], fontSize: f.caption, fontWeight: '700' }}>
              {owner.name}
            </Text>
          </View>
        ) : (
          <View style={[sheetStyles.chip, { borderColor: t.border }]}>
            <Text style={{ color: t.textSecond, fontSize: f.caption }}>
              {triLang(lang, {
                ru: 'нейтральная', uk: 'нейтральна', es: 'neutral', 'pt-BR': 'neutra',
                vi: 'trung lập', id: 'netral', tr: 'nötr', pl: 'neutralna',
              })}
            </Text>
          </View>
        )}
        {star.radiance > 0 ? (
          <View style={[sheetStyles.chip, { borderColor: t.border }]}>
            <Text style={{ color: '#EAF2FF', fontSize: f.caption }}>✦ {star.radiance}</Text>
          </View>
        ) : null}
        <View style={[sheetStyles.chip, { borderColor: t.border }]}>
          <Text style={{ color: t.textSecond, fontSize: f.caption }}>
            {triLang(lang, {
              ru: `вопросов: ${questions}`, uk: `питань: ${questions}`, es: `preguntas: ${questions}`,
              'pt-BR': `perguntas: ${questions}`, vi: `câu hỏi: ${questions}`, id: `soal: ${questions}`,
              tr: `soru: ${questions}`, pl: `pytań: ${questions}`,
            })}
          </Text>
        </View>
        {isHome && owner ? (
          <View style={[sheetStyles.chip, { borderColor: t.border }]}>
            <Text style={{ color: CONSTELLATION_SLOT_COLORS[owner.slot], fontSize: f.caption }}>
              {'●'.repeat(Math.max(0, owner.cores))}
            </Text>
          </View>
        ) : null}
      </View>
      <DuoPressable
        testID="constellation-attack"
        onPress={onConfirm}
        edgeColor={t.accent}
        wrapStyle={{ opacity: busy ? 0.6 : 1 }}
        style={[sheetStyles.cta, { backgroundColor: t.accent }]}
      >
        <Text style={{ color: t.correctText, fontWeight: '800', fontSize: f.sub }}>
          {triLang(lang, {
            ru: '⭐ Зажечь звезду', uk: '⭐ Запалити зірку', es: '⭐ Encender estrella',
            'pt-BR': '⭐ Acender estrela', vi: '⭐ Thắp sao', id: '⭐ Nyalakan bintang',
            tr: '⭐ Yıldızı yak', pl: '⭐ Zapal gwiazdę',
          })}
        </Text>
      </DuoPressable>
    </View>
  );
});

// ── Квиз-оверлей ────────────────────────────────────────────────────────────

interface QuizOverlayProps {
  lang: Lang;
  isDuel: boolean;
  qIndex: number;
  total: number;
  question: string;
  options: string[];
  busy: boolean;
  lastRule: { correct: boolean; rule: string } | null;
  onAnswer: (index: number) => void;
  onRuleSeen: () => void;
}

const QuizOverlay = memo(function QuizOverlay({
  lang, isDuel, qIndex, total, question, options, busy, lastRule, onAnswer, onRuleSeen,
}: QuizOverlayProps) {
  const { theme: t, f } = useTheme();
  return (
    <View style={[quizStyles.box, { backgroundColor: 'rgba(8,13,30,0.97)', borderColor: isDuel ? '#FFD166' : '#2A3A6A' }]}>
      {isDuel ? (
        <Text style={quizStyles.duelBadge}>
          ⚡ {triLang(lang, {
            ru: 'СТОЛКНОВЕНИЕ — одинаковые вопросы, решают точность и скорость',
            uk: 'ЗІТКНЕННЯ — однакові питання',
            es: 'CHOQUE — mismas preguntas',
            'pt-BR': 'CHOQUE — mesmas perguntas',
            vi: 'VA CHẠM', id: 'BENTROKAN', tr: 'ÇARPIŞMA', pl: 'STARCIE',
          })}
        </Text>
      ) : null}
      <Text style={[quizStyles.meta, { color: t.textSecond, fontSize: f.caption - 1 }]}>
        {qIndex + 1}/{total}
      </Text>
      <Text style={[quizStyles.question, { color: t.textPrimary, fontSize: f.sub + 2 }]}>
        {question}
      </Text>
      {lastRule ? (
        <View style={[quizStyles.rule, {
          borderLeftColor: lastRule.correct ? '#63E6A4' : '#FF8080',
          backgroundColor: lastRule.correct ? 'rgba(99,230,164,0.08)' : 'rgba(255,128,128,0.08)',
        }]}>
          <Text style={{ color: lastRule.correct ? '#63E6A4' : '#FF8080', fontWeight: '800', fontSize: f.caption }}>
            {lastRule.correct
              ? triLang(lang, { ru: 'Верно!', uk: 'Вірно!', es: '¡Correcto!', 'pt-BR': 'Certo!', vi: 'Đúng!', id: 'Benar!', tr: 'Doğru!', pl: 'Dobrze!' })
              : triLang(lang, { ru: 'Мимо', uk: 'Повз', es: 'Fallo', 'pt-BR': 'Errou', vi: 'Sai', id: 'Salah', tr: 'Yanlış', pl: 'Pudło' })}
          </Text>
          {lastRule.rule ? (
            <Text style={{ color: t.textSecond, fontSize: f.caption, marginTop: 2 }}>{lastRule.rule}</Text>
          ) : null}
          <TouchableOpacity onPress={onRuleSeen} style={quizStyles.ruleNext}>
            <Text style={{ color: t.accent, fontSize: f.caption, fontWeight: '700' }}>
              {triLang(lang, { ru: 'Дальше →', uk: 'Далі →', es: 'Sigue →', 'pt-BR': 'Próx →', vi: 'Tiếp →', id: 'Lanjut →', tr: 'Devam →', pl: 'Dalej →' })}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={quizStyles.opts}>
          {options.map((opt, i) => (
            <TouchableOpacity
              key={i}
              testID={`constellation-opt-${i}`}
              style={[quizStyles.opt, { borderColor: '#1E2A4A', opacity: busy ? 0.55 : 1 }]}
              disabled={busy}
              onPress={() => onAnswer(i)}
              activeOpacity={0.85}
            >
              <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '600' }}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
});

// ── Стили ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  roundBox: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: 'rgba(13,20,44,0.9)',
  },
  roundText: { fontVariant: ['tabular-nums'] },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: 'rgba(13,20,44,0.9)',
  },
  timerText: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  goldChip: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,209,102,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,209,102,0.4)',
  },
  goldChipText: { color: '#FFD166', fontWeight: '800', fontSize: 11 },
  phaseTag: {
    marginLeft: 'auto',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  phaseTagText: { color: '#06122B', fontWeight: '800', fontSize: 9, letterSpacing: 1.2 },
  playersRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  playerChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 6,
    paddingVertical: 5,
    backgroundColor: 'rgba(5,9,20,0.45)',
  },
  playerAva: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerAvaText: { color: '#06122B', fontWeight: '800', fontSize: 9 },
  playerInfo: { flex: 1 },
  playerName: { fontSize: 9, lineHeight: 11 },
  playerScore: { fontSize: 11, fontWeight: '800', fontVariant: ['tabular-nums'] },
  playerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#5E6B8F',
  },
  playerDotDone: { backgroundColor: '#63E6A4' },
  mapBox: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapFrame: {
    // Геометрия строго по viewBox карты (360×400): вписываемся без обрезки.
    width: '100%',
    maxWidth: 430,
    aspectRatio: 360 / 400,
    maxHeight: '100%',
  },
  emoteBubble: {
    position: 'absolute',
    top: 8,
    left: 16,
    backgroundColor: '#EAF2FF',
    borderRadius: 14,
    borderBottomLeftRadius: 4,
    borderWidth: 1.5,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  emoteText: { color: '#0A1024', fontWeight: '800', fontSize: 12 },
  emoteName: { fontSize: 9 },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 18,
  },
  shieldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emoteRow: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 'auto',
  },
  emoteBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  waitCard: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
  },
  fallingBanner: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 18,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(8,13,30,0.95)',
    alignItems: 'center',
    gap: 4,
  },
  fallingTitle: { color: '#FF7A9E', fontWeight: '800', fontSize: 15 },
  fallingSub: { textAlign: 'center' },
  outOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4,6,14,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 32,
  },
  outTitle: { color: '#F4F7FF', fontSize: 26, fontWeight: '900' },
  outSub: { color: '#A7B4D6', textAlign: 'center' },
  outBtn: {
    borderRadius: 14,
    paddingHorizontal: 30,
    paddingVertical: 14,
  },
  outGhost: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
});

const sheetStyles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 14,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontWeight: '800' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 },
  chip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cta: {
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 13,
  },
});

const quizStyles = StyleSheet.create({
  box: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 14,
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
  },
  duelBadge: {
    color: '#FFD166',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  meta: { marginBottom: 6, fontVariant: ['tabular-nums'] },
  question: { fontWeight: '800', lineHeight: 24, marginBottom: 12 },
  opts: { gap: 8 },
  opt: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(20,31,66,0.5)',
  },
  rule: {
    borderLeftWidth: 3,
    borderRadius: 10,
    padding: 12,
  },
  ruleNext: { alignSelf: 'flex-end', marginTop: 8 },
});
