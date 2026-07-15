import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import SkeletonBlock from './SkeletonShimmer';
import { triLang, type Lang } from '../constants/i18n';
import { useTheme } from './ThemeContext';
import ExplainReportButton from './ExplainReportButton';
import AiLimitUpsellCard from './AiLimitUpsellCard';
import { aiErrorToast, aiPersonalLimitToast } from '../app/ai_kill_switch_copy';
import LearningSemanticBlock from './LearningSemanticBlock';
import { buildMistakeExplanationBlocks } from '../app/explanation_presentation';

export type AiMistakeCardState = 'hidden' | 'idle' | 'loading' | 'ready' | 'error' | 'limit';

type AiMistakeCardProps = {
  lang: Lang;
  state: AiMistakeCardState;
  explanation?: string | null;
  /** Kept for back-compat; no longer rendered (no daily cap). */
  remaining?: number | null;
  onExplain: () => void;
  /**
   * Правильный (целевой) ответ и неправильный ответ юзера. Нужны кнопке «Непонятно объяснили»,
   * чтобы жалоба попала в ТУ ЖЕ кэш-запись разбора (mistake_explanations per-(target,userAnswer,lang)).
   * Если не переданы — кнопка репорта не показывается (старые вызовы остаются как были).
   */
  targetAnswer?: string;
  userAnswer?: string;
};

function buildLocalMistakeFallback(lang: Lang, targetAnswer?: string, userAnswer?: string): string {
  const intro = triLang(lang, {
    ru: 'Сравни ответы:',
    uk: 'Порівняй відповіді:',
    es: 'Compara las respuestas:',
    'pt-BR': 'Compare as respostas:',
    vi: 'So sánh các câu trả lời:',
    id: 'Bandingkan jawabannya:',
    tr: 'Yanıtları karşılaştır:',
    pl: 'Porównaj odpowiedzi:',
  });
  const yourAnswerLabel = triLang(lang, {
    ru: 'Твой ответ',
    uk: 'Твоя відповідь',
    es: 'Tu respuesta',
    'pt-BR': 'Sua resposta',
    vi: 'Câu trả lời của bạn',
    id: 'Jawabanmu',
    tr: 'Yanıtın',
    pl: 'Twoja odpowiedź',
  });
  const correctAnswerLabel = triLang(lang, {
    ru: 'Правильно',
    uk: 'Правильно',
    es: 'Correcto',
    'pt-BR': 'Correto',
    vi: 'Đáp án đúng',
    id: 'Jawaban benar',
    tr: 'Doğru cevap',
    pl: 'Poprawnie',
  });

  return `${intro}\n${yourAnswerLabel}: ${userAnswer?.trim() || '-'}\n${correctAnswerLabel}: ${targetAnswer?.trim() || '-'}`;
}

export default function AiMistakeCard({
  lang,
  state,
  explanation,
  onExplain,
  targetAnswer,
  userAnswer,
}: AiMistakeCardProps) {
  const { theme: t, f } = useTheme();
  const isBusy = state === 'loading';

  // Забавные заглушки. Выбираем один вариант на всё время показа состояния —
  // иначе рандом «прыгал» бы при каждом ре-рендере. Личный лимит: заголовок +
  // сообщение сливаем в один текст, кнопку Plus рисует AiLimitUpsellCard.
  const limitCopy = React.useMemo(
    () => (state === 'limit' ? aiPersonalLimitToast(lang) : null),
    [state, lang],
  );
  const errorCopy = React.useMemo(
    () => (state === 'error' ? aiErrorToast(lang) : null),
    [state, lang],
  );

  const title = triLang(lang, {
    ru: 'Разбор промаха',
    uk: 'Розбір промаху',
    es: 'Análisis del error',
    'pt-BR': 'Análise do erro',
    vi: 'Phân tích lỗi',
    id: 'Analisis kesalahan',
    tr: 'Hata analizi',
    pl: 'Analiza błędu',
  });

  const isReadyExplanation = state === 'ready' && Boolean(explanation);

  const body = (() => {
    if (state === 'ready' && explanation) return explanation;
    if (state === 'limit') return '';
    if (state === 'error') {
      // Готовый текст от хука (напр. глобальный бюджет ИИ иссяк) имеет приоритет;
      // иначе — забавная плашка обычной ошибки.
      if (explanation) return explanation;
      if (targetAnswer?.trim() || userAnswer?.trim()) {
        return buildLocalMistakeFallback(lang, targetAnswer, userAnswer);
      }
      if (errorCopy) return `${errorCopy.title}\n${errorCopy.message}`;
    }
    return triLang(lang, {
      ru: 'Разбираю именно твой ответ: где сбилось и как сказать правильно.',
      uk: 'Розбираю саме твою відповідь: де збилося і як сказати правильно.',
      es: 'Analizo tu respuesta exacta: qué falló y cómo decirlo bien.',
      'pt-BR': 'Analiso sua resposta exata: onde errou e como dizer certo.',
      vi: 'Phân tích đúng câu trả lời của bạn: sai ở đâu và nói sao cho đúng.',
      id: 'Menganalisis jawabanmu: bagian yang salah dan cara yang benar.',
      tr: 'Tam cevabını inceliyorum: nerede hata var ve doğrusu nasıl.',
      pl: 'Analizuję dokładnie Twoją odpowiedź: co poszło źle i jak poprawnie.',
    });
  })();
  const readyBlocks = React.useMemo(
    () => buildMistakeExplanationBlocks({ lang, explanation: body, userAnswer, targetAnswer }),
    [lang, body, userAnswer, targetAnswer],
  );

  if (state === 'hidden') return null;

  return (
    <View
      testID="ai-mistake-card"
      style={styles.card}
    >
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: t.accent + '18' }]}>
          <Ionicons name="bulb-outline" size={20} color={t.accent} />
        </View>
        <View style={styles.headerText}>
          <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </View>

      {isBusy ? (
        <View style={styles.busyCol}>
          <SkeletonBlock width="94%" height={13} borderRadius={6} />
          <SkeletonBlock width="80%" height={13} borderRadius={6} />
          <SkeletonBlock width="88%" height={13} borderRadius={6} />
        </View>
      ) : isReadyExplanation && readyBlocks.length ? (
        <View style={styles.semanticBlocks}>
          {readyBlocks.map((block, idx) => (
            <LearningSemanticBlock key={`${block.tone}-${idx}`} block={block} />
          ))}
        </View>
      ) : state === 'limit' && limitCopy ? (
        <AiLimitUpsellCard
          lang={lang}
          title={`${limitCopy.title}\n${limitCopy.message}`}
          paywallContext="ai_explain"
          testID="ai-mistake-limit-card"
        />
      ) : (
        <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: 20 }}>
          {body}
        </Text>
      )}

      {/* «Непонятно объяснили» — только на ГОТОВОМ разборе и если есть оба ответа (нужны для хэша).
          Жалоба летит в админку и удаляется из кэша mistake_explanations кнопкой там. */}
      {isReadyExplanation && targetAnswer && userAnswer ? (
        <View style={styles.reportRow}>
          <ExplainReportButton
            kind="mistake"
            phraseEn={targetAnswer}
            userAnswer={userAnswer}
            lang={lang}
          />
        </View>
      ) : null}

      {state === 'error' ? (
        <Pressable
          testID="ai-mistake-explain-button"
          accessibilityRole="button"
          onPress={onExplain}
          style={({ pressed }) => [styles.simpleButton, { borderColor: t.border, backgroundColor: t.bgSurface2 }, pressed && { opacity: 0.78 }]}
        >
          <Ionicons name="refresh" size={16} color={t.accent} />
          <Text style={{ color: t.textPrimary, fontSize: f.label, fontWeight: '900' }} numberOfLines={1}>
            {triLang(lang, {
              ru: 'Попробовать снова',
              uk: 'Спробувати знову',
              es: 'Reintentar',
              'pt-BR': 'Tentar de novo',
              vi: 'Thử lại',
              id: 'Coba lagi',
              tr: 'Tekrar dene',
              pl: 'Spróbuj ponownie',
            })}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    gap: 10,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  icon: {
    alignItems: 'center',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  busyCol: {
    alignSelf: 'stretch',
    paddingVertical: 4,
    gap: 8,
  },
  semanticBlocks: {
    alignSelf: 'stretch',
    gap: 8,
    width: '100%',
  },
  reportRow: {
    alignItems: 'flex-start',
    marginTop: 12, // отделяем кнопку-репорт от текста разбора (теперь это кнопка с контейнером)
  },
  simpleButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 0,
    flexDirection: 'row',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
