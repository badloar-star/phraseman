import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import ScreenGradient from '../components/ScreenGradient';
import { glassFill } from '../components/GlassSurface';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { hapticTap } from '../hooks/use-haptics';
import { triLang, type Lang } from '../constants/i18n';
import { safeRouterBack } from './navigation_back';
import type { TranscriptTurn } from './max_call_transcript';
import { computeVoiceCallMetrics } from './max_voice_metrics';
import { getScenarioById, dialogScenarioTitle } from './ai_dialog_scenarios';
import {
  callPremiumDialogReview,
  type PremiumDialogReviewCorrection,
} from './ai_dialog_client';

/**
 * Экран пост-разбора MAX-звонка (спека, раздел 8; МАКС ПЛАН §6.2).
 *
 * Композиция: транскрипт звонка, метрики computeVoiceCallMetrics, длительность
 * и остаток минут — считаются ЦЕЛИКОМ локально, мгновенно, без сети. Секция
 * «Разбор твоих фраз» — единственная часть, которая зовёт сервер
 * (premiumDialogReview, mode:'voice'): один вызов на звонок, при провале тихо
 * остаётся в состоянии «скоро появится» — отсутствие разбора не должно ронять
 * экран или пугать ошибкой посреди практики.
 */

/** Итог звонка, который экран сессии передаёт разбору. */
export interface MaxCallResult {
  history: TranscriptTurn[];
  durationSec: number;
  /** Секунды речи юзера (по speech_started/stopped) — вход метрик и XP-заявки. */
  speechSec: number;
  format: 'scenario' | 'companion' | 'trial';
  scenarioId?: string;
  /** CEFR звонка — прокидывается в «Позвонить ещё раз», чтобы не терять уровень. */
  cefr?: string;
  personaName: string;
  endReason: 'completed' | 'capped' | 'dropped' | 'background' | 'failed';
  /** Остаток дневных секунд MAX после звонка; null — сервер не сообщил. */
  dayRemainingSec: number | null;
}

// Передача результата между экранами через модульный стор, а не router-параметры:
// транскрипт звонка легко превышает лимиты URL-параметров expo-router, а
// глобальный стейт-менеджер ради одного хендофа — оверкилл. Экран сессии пишет
// сюда перед навигацией; повторный вход в разбор без нового звонка показывает
// последний результат (это желаемое поведение «вернуться к разбору»).
let lastMaxCallResult: MaxCallResult | null = null;

export function setLastMaxCallResult(result: MaxCallResult): void {
  lastMaxCallResult = result;
}

export function getLastMaxCallResult(): MaxCallResult | null {
  return lastMaxCallResult;
}

function formatDuration(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function minutesLeftLabel(lang: Lang, minutes: number): string {
  return triLang(lang, {
    ru: `Осталось сегодня: ${minutes} мин`,
    uk: `Залишилось сьогодні: ${minutes} хв`,
    es: `Te quedan hoy: ${minutes} min`,
    'pt-BR': `Restam hoje: ${minutes} min`,
    vi: `Còn lại hôm nay: ${minutes} phút`,
    id: `Sisa hari ini: ${minutes} mnt`,
    tr: `Bugün kalan: ${minutes} dk`,
    pl: `Zostało dzisiaj: ${minutes} min`,
  });
}

type ReviewFetchState = 'idle' | 'loading' | 'loaded' | 'error';

export default function MaxVoiceReview() {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const router = useRouter();
  const result = getLastMaxCallResult();
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [reviewState, setReviewState] = useState<ReviewFetchState>('idle');
  const [praise, setPraise] = useState('');
  const [corrections, setCorrections] = useState<PremiumDialogReviewCorrection[]>([]);
  // Один запрос на результат звонка: смена звонка (новый result) отпускает
  // защёлку, но StrictMode/ре-рендер того же result не должны дублировать вызов.
  const requestedForRef = useRef<TranscriptTurn[] | null>(null);

  const scenarioTitle = useMemo(() => {
    if (!result?.scenarioId) return '';
    const scenario = getScenarioById(result.scenarioId);
    return scenario ? dialogScenarioTitle(scenario, lang) : '';
  }, [result?.scenarioId, lang]);

  const metrics = useMemo(() => {
    if (!result) return null;
    // Weak words из SRS подключит серверная voice-ветка ревью; локальный разбор
    // честно считает без них (weakWordsUsed останется пустым, секции нет).
    return computeVoiceCallMetrics(result.history, {
      speechSec: result.speechSec,
      weakWords: [],
      durationSec: result.durationSec,
    });
  }, [result]);

  // Разбор фраз (premiumDialogReview, mode:'voice') — один вызов на звонок.
  // Молчаливые/однословные звонки (0 реплик юзера) не шлём: сервер всё равно
  // отклонит history_required, а тратить попытку незачем.
  useEffect(() => {
    if (!result) return;
    const userTurns = result.history.filter((turn) => turn.role === 'user');
    if (userTurns.length === 0) return;
    if (requestedForRef.current === result.history) return;
    requestedForRef.current = result.history;

    let cancelled = false;
    setReviewState('loading');
    const scenario = result.scenarioId ? getScenarioById(result.scenarioId) : undefined;

    callPremiumDialogReview({
      history: result.history.map((turn) => ({
        role: turn.role,
        content: turn.text,
      })),
      cefr: result.cefr,
      interfaceLang: lang,
      scenarioId: result.scenarioId,
      goalEn: scenario?.goalEn,
      mode: 'voice',
    })
      .then((res) => {
        if (cancelled) return;
        setPraise(res.praise);
        setCorrections(res.corrections);
        setReviewState('loaded');
      })
      .catch(() => {
        // Тихий фолбэк: секция остаётся в состоянии «скоро появится» ниже.
        if (!cancelled) setReviewState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [result, lang]);

  const goBack = () => {
    hapticTap();
    safeRouterBack(router, '/ai_dialog_home' as any);
  };

  const callAgain = () => {
    hapticTap();
    // Прокидываем параметры прошедшего звонка: без них prestart падал бы на
    // дефолты (format='scenario', scenarioId='coffee') и «ещё раз» звонил бы
    // не туда. Прямой заход без результата — честные дефолты prestart.
    const params: Record<string, string> = {};
    if (result) {
      params.format = result.format;
      if (result.scenarioId) params.scenarioId = result.scenarioId;
      if (result.cefr) params.cefr = result.cefr;
    }
    router.replace({ pathname: '/max_call_prestart', params } as any);
  };

  // Нет результата (прямой заход по маршруту/перезапуск процесса) — пустое
  // состояние без падения: разбор существует только после звонка.
  if (!result || !metrics) {
    return (
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Ionicons name="call-outline" size={34} color={t.textMuted} />
          <Text
            style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', marginTop: 12 }}
            maxFontSizeMultiplier={1.2}
          >
            {triLang(lang, {
              ru: 'Разбор появится после звонка',
              uk: 'Розбір з’явиться після дзвінка',
              es: 'El análisis aparecerá después de la llamada',
              'pt-BR': 'A análise aparecerá após a ligação',
              vi: 'Phân tích sẽ xuất hiện sau cuộc gọi',
              id: 'Ulasan akan muncul setelah panggilan',
              tr: 'Analiz aramadan sonra görünecek',
              pl: 'Analiza pojawi się po rozmowie',
            })}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={callAgain}
            style={{
              marginTop: 18,
              backgroundColor: t.accent,
              borderRadius: 14,
              paddingVertical: 12,
              paddingHorizontal: 22,
            }}
          >
            <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '800' }}>
              {triLang(lang, {
                ru: 'Позвонить',
                uk: 'Подзвонити',
                es: 'Llamar',
                'pt-BR': 'Ligar',
                vi: 'Gọi',
                id: 'Telepon',
                tr: 'Ara',
                pl: 'Zadzwoń',
              })}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </ScreenGradient>
    );
  }

  const dayRemainingMin =
    result.dayRemainingSec === null ? null : Math.max(0, Math.floor(result.dayRemainingSec / 60));

  const statCard = (icon: string, value: string, label: string) => (
    <View
      key={label}
      style={{
        flexBasis: '47%',
        flexGrow: 1,
        backgroundColor: glassFill(t.bgSurface, 0.46),
        borderRadius: 14,
        padding: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name={icon as any} size={14} color={t.accent} />
        <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '900' }} maxFontSizeMultiplier={1.2}>
          {value}
        </Text>
      </View>
      <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 4 }} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
    </View>
  );

  return (
    <ScreenGradient>
      <SafeAreaView testID="max-voice-review-screen" style={{ flex: 1 }}>
        {/* Шапка */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 }}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={goBack}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: t.bgCard,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}
          >
            <Ionicons name="chevron-back" size={22} color={t.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.numMd, fontWeight: '800' }}>
              {triLang(lang, {
                ru: 'Разбор звонка',
                uk: 'Розбір дзвінка',
                es: 'Análisis de la llamada',
                'pt-BR': 'Análise da ligação',
                vi: 'Phân tích cuộc gọi',
                id: 'Ulasan panggilan',
                tr: 'Arama analizi',
                pl: 'Analiza rozmowy',
              })}
            </Text>
            {(scenarioTitle !== '' || result.personaName !== '') && (
              <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 1 }}>
                {[result.personaName, scenarioTitle].filter(Boolean).join(' · ')}
              </Text>
            )}
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 28 }}>
          {/* Длительность + остаток минут дня */}
          <View
            style={{
              backgroundColor: glassFill(t.bgSurface, 0.46),
              borderRadius: 16,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: t.accentBg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="call" size={22} color={t.accent} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.numLg, fontWeight: '900' }} maxFontSizeMultiplier={1.2}>
                {formatDuration(result.durationSec)}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 2 }} maxFontSizeMultiplier={1.2}>
                {dayRemainingMin !== null
                  ? minutesLeftLabel(lang, dayRemainingMin)
                  : triLang(lang, {
                      ru: 'Разговор завершён',
                      uk: 'Розмову завершено',
                      es: 'Conversación terminada',
                      'pt-BR': 'Conversa encerrada',
                      vi: 'Cuộc trò chuyện đã kết thúc',
                      id: 'Percakapan selesai',
                      tr: 'Konuşma tamamlandı',
                      pl: 'Rozmowa zakończona',
                    })}
              </Text>
            </View>
          </View>

          {/* Метрики речи (локальные, computeVoiceCallMetrics) */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
            {statCard(
              'mic-outline',
              formatDuration(metrics.speechSec),
              triLang(lang, {
                ru: 'Ты говорил',
                uk: 'Ти говорив',
                es: 'Hablaste',
                'pt-BR': 'Você falou',
                vi: 'Bạn đã nói',
                id: 'Kamu bicara',
                tr: 'Konuştun',
                pl: 'Mówiłeś',
              }),
            )}
            {statCard(
              'chatbubbles-outline',
              String(metrics.userTurns),
              triLang(lang, {
                ru: 'Твоих реплик',
                uk: 'Твоїх реплік',
                es: 'Tus intervenciones',
                'pt-BR': 'Suas falas',
                vi: 'Lượt nói của bạn',
                id: 'Ucapanmu',
                tr: 'Konuşma sıran',
                pl: 'Twoich wypowiedzi',
              }),
            )}
            {statCard(
              'book-outline',
              String(metrics.uniqueWords),
              triLang(lang, {
                ru: 'Слов в речи',
                uk: 'Слів у мовленні',
                es: 'Palabras usadas',
                'pt-BR': 'Palavras usadas',
                vi: 'Từ đã dùng',
                id: 'Kata dipakai',
                tr: 'Kullanılan kelime',
                pl: 'Użytych słów',
              }),
            )}
            {statCard(
              'trending-up-outline',
              String(metrics.longestTurnWords),
              triLang(lang, {
                ru: 'Самая длинная фраза',
                uk: 'Найдовша фраза',
                es: 'Frase más larga',
                'pt-BR': 'Frase mais longa',
                vi: 'Câu dài nhất',
                id: 'Kalimat terpanjang',
                tr: 'En uzun cümle',
                pl: 'Najdłuższe zdanie',
              }),
            )}
          </View>

          {/* Разбор фраз — premiumDialogReview(mode:'voice'), МАКС ПЛАН §6.2 */}
          <View
            // Состояние в testID: смоук-тест (и скриншот) должны однозначно
            // отличать «сервер ответил» от «ещё грузится»/«отвалился», а не
            // угадывать по тексту, который переведён на 8 языков.
            testID={`max-voice-review-corrections-${reviewState}`}
            style={{
              backgroundColor: glassFill(t.bgSurface, 0.46),
              borderRadius: 16,
              padding: 14,
              marginTop: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="school-outline" size={15} color={t.accent} />
              <Text style={{ color: t.accent, fontSize: f.label, fontWeight: '900' }} maxFontSizeMultiplier={1.2}>
                {triLang(lang, {
                  ru: 'Разбор твоих фраз',
                  uk: 'Розбір твоїх фраз',
                  es: 'Análisis de tus frases',
                  'pt-BR': 'Análise das suas frases',
                  vi: 'Phân tích câu của bạn',
                  id: 'Ulasan kalimatmu',
                  tr: 'Cümlelerinin analizi',
                  pl: 'Analiza twoich zdań',
                })}
              </Text>
              {reviewState === 'loading' && (
                <ActivityIndicator size="small" color={t.accent} style={{ marginLeft: 4 }} />
              )}
            </View>

            {reviewState === 'loaded' ? (
              <View style={{ marginTop: 8 }}>
                {praise !== '' && (
                  <Text
                    style={{ color: t.textPrimary, fontSize: f.sub, lineHeight: Math.round(f.sub * 1.4) }}
                    maxFontSizeMultiplier={1.2}
                  >
                    {praise}
                  </Text>
                )}
                {corrections.map((c, i) => (
                  <View
                    key={`corr-${i}`}
                    style={{
                      marginTop: 10,
                      paddingTop: i === 0 && praise === '' ? 0 : 10,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: t.border,
                    }}
                  >
                    <Text
                      style={{ color: t.textMuted, fontSize: f.sub, textDecorationLine: 'line-through' }}
                      maxFontSizeMultiplier={1.2}
                    >
                      {c.original}
                    </Text>
                    <Text
                      style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '700', marginTop: 2 }}
                      maxFontSizeMultiplier={1.2}
                    >
                      {c.corrected}
                    </Text>
                    {c.note !== '' && (
                      <Text
                        style={{ color: t.textMuted, fontSize: f.caption, marginTop: 3 }}
                        maxFontSizeMultiplier={1.2}
                      >
                        {c.note}
                      </Text>
                    )}
                  </View>
                ))}
                {corrections.length === 0 && praise === '' && (
                  <Text
                    style={{ color: t.textMuted, fontSize: f.sub, marginTop: 4, lineHeight: Math.round(f.sub * 1.4) }}
                    maxFontSizeMultiplier={1.2}
                  >
                    {triLang(lang, {
                      ru: 'Ошибок не найдено — отличная речь!',
                      uk: 'Помилок не знайдено — чудова мова!',
                      es: '¡No se encontraron errores — muy bien!',
                      'pt-BR': 'Nenhum erro encontrado — muito bem!',
                      vi: 'Không tìm thấy lỗi — nói rất tốt!',
                      id: 'Tidak ada kesalahan ditemukan — bagus sekali!',
                      tr: 'Hata bulunamadı — harika konuştun!',
                      pl: 'Nie znaleziono błędów — świetna mowa!',
                    })}
                  </Text>
                )}
              </View>
            ) : (
              <Text
                style={{ color: t.textMuted, fontSize: f.sub, marginTop: 8, lineHeight: Math.round(f.sub * 1.4) }}
                maxFontSizeMultiplier={1.2}
              >
                {reviewState === 'loading'
                  ? triLang(lang, {
                      ru: 'Разбираем твою речь…',
                      uk: 'Розбираємо твою мову…',
                      es: 'Analizando tu conversación…',
                      'pt-BR': 'Analisando sua conversa…',
                      vi: 'Đang phân tích cuộc trò chuyện của bạn…',
                      id: 'Menganalisis percakapanmu…',
                      tr: 'Konuşman analiz ediliyor…',
                      pl: 'Analizujemy twoją rozmowę…',
                    })
                  : triLang(lang, {
                      ru: 'Подробный разбор фраз с исправлениями скоро появится здесь — после следующего обновления.',
                      uk: 'Докладний розбір фраз із виправленнями скоро з’явиться тут — після наступного оновлення.',
                      es: 'El análisis detallado con correcciones aparecerá aquí pronto, tras la próxima actualización.',
                      'pt-BR': 'A análise detalhada com correções aparecerá aqui em breve, após a próxima atualização.',
                      vi: 'Phân tích chi tiết kèm sửa lỗi sẽ sớm xuất hiện tại đây sau bản cập nhật tới.',
                      id: 'Ulasan terperinci dengan koreksi akan segera muncul di sini setelah pembaruan berikutnya.',
                      tr: 'Düzeltmelerle ayrıntılı analiz bir sonraki güncellemeden sonra burada olacak.',
                      pl: 'Szczegółowa analiza z poprawkami pojawi się tu wkrótce, po następnej aktualizacji.',
                    })}
              </Text>
            )}
          </View>

          {/* Полный транскрипт — раскрываемый */}
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => {
              hapticTap();
              setTranscriptOpen((v) => !v);
            }}
            style={{
              backgroundColor: glassFill(t.bgSurface, 0.46),
              borderRadius: 16,
              padding: 14,
              marginTop: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="document-text-outline" size={15} color={t.accent} />
              <Text
                style={{ color: t.accent, fontSize: f.label, fontWeight: '900', flex: 1, marginLeft: 6 }}
                maxFontSizeMultiplier={1.2}
              >
                {triLang(lang, {
                  ru: 'Полный транскрипт',
                  uk: 'Повний транскрипт',
                  es: 'Transcripción completa',
                  'pt-BR': 'Transcrição completa',
                  vi: 'Bản ghi đầy đủ',
                  id: 'Transkrip lengkap',
                  tr: 'Tam transkript',
                  pl: 'Pełny zapis rozmowy',
                })}
              </Text>
              <Ionicons name={transcriptOpen ? 'chevron-up' : 'chevron-down'} size={16} color={t.textMuted} />
            </View>
            {transcriptOpen && (
              <View style={{ marginTop: 10 }}>
                {result.history.map((turn, i) => (
                  <Text
                    key={`turn-${i}`}
                    style={{
                      color: turn.role === 'user' ? t.textPrimary : t.textMuted,
                      fontSize: f.sub,
                      marginTop: i === 0 ? 0 : 6,
                      lineHeight: Math.round(f.sub * 1.4),
                    }}
                    maxFontSizeMultiplier={1.2}
                  >
                    {`${turn.role === 'user' ? '· ' : ''}${turn.text}`}
                  </Text>
                ))}
              </View>
            )}
          </TouchableOpacity>

          {/* Позвонить ещё раз */}
          <TouchableOpacity
            accessibilityRole="button"
            onPress={callAgain}
            style={{
              marginTop: 18,
              backgroundColor: t.accent,
              borderRadius: 16,
              paddingVertical: 14,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Ionicons name="call" size={18} color={t.correctText} />
            <Text style={{ color: t.correctText, fontSize: f.bodyLg, fontWeight: '800' }} maxFontSizeMultiplier={1.2}>
              {triLang(lang, {
                ru: 'Позвонить ещё раз',
                uk: 'Подзвонити ще раз',
                es: 'Llamar otra vez',
                'pt-BR': 'Ligar de novo',
                vi: 'Gọi lại lần nữa',
                id: 'Telepon lagi',
                tr: 'Tekrar ara',
                pl: 'Zadzwoń jeszcze raz',
              })}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}
