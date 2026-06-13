import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { triLang, type Lang } from '../constants/i18n';
import { compassIconSource } from '../constants/weeklyCompassIcons';
import { useTheme } from './ThemeContext';

export type AiMistakeCardState = 'idle' | 'loading' | 'ready' | 'error' | 'limit';

type AiMistakeCardProps = {
  lang: Lang;
  state: AiMistakeCardState;
  explanation?: string | null;
  remaining?: number | null;
  onExplain: () => void;
};

function quotaLine(lang: Lang, remaining: number | null | undefined): string {
  if (remaining == null) {
    return triLang(lang, {
      ru: '3 объяснения ошибки в день',
      uk: '3 пояснення помилки на день',
      es: '3 explicaciones de error al día',
      'pt-BR': '3 explicações de erro por dia',
      vi: '3 lượt giải thích lỗi mỗi ngày',
      id: '3 penjelasan kesalahan per hari',
      tr: 'Günde 3 hata açıklaması',
      pl: '3 wyjaśnienia błędów dziennie',
    });
  }
  return triLang(lang, {
    ru: `Осталось сегодня: ${remaining}`,
    uk: `Залишилось сьогодні: ${remaining}`,
    es: `Quedan hoy: ${remaining}`,
    'pt-BR': `Restam hoje: ${remaining}`,
    vi: `Còn hôm nay: ${remaining}`,
    id: `Sisa hari ini: ${remaining}`,
    tr: `Bugün kalan: ${remaining}`,
    pl: `Zostało dziś: ${remaining}`,
  });
}

export default function AiMistakeCard({
  lang,
  state,
  explanation,
  remaining,
  onExplain,
}: AiMistakeCardProps) {
  const { theme: t, f, themeMode } = useTheme();
  const isBusy = state === 'loading';
  const isBlocked = state === 'limit';
  const canPress = !isBusy && !isBlocked;
  const aiCompassIcon = compassIconSource(themeMode);

  const title = triLang(lang, {
    ru: 'Разобрать ошибку',
    uk: 'Розібрати помилку',
    es: 'Revisar el error',
    'pt-BR': 'Revisar o erro',
    vi: 'Xem lỗi sai',
    id: 'Bahas kesalahan',
    tr: 'Hatayı incele',
    pl: 'Omów błąd',
  });
  const body = (() => {
    if (state === 'ready' && explanation) return explanation;
    if (state === 'error') {
      return triLang(lang, {
        ru: 'Не получилось получить умное объяснение. Попробуй ещё раз позже.',
        uk: 'Не вдалося отримати розумне пояснення. Спробуй ще раз пізніше.',
        es: 'No se pudo obtener la explicación. Inténtalo más tarde.',
        'pt-BR': 'Não foi possível obter a explicação. Tente de novo mais tarde.',
        vi: 'Chưa lấy được giải thích. Thử lại sau nhé.',
        id: 'Penjelasan belum bisa dimuat. Coba lagi nanti.',
        tr: 'Açıklama alınamadı. Daha sonra tekrar dene.',
        pl: 'Nie udało się pobrać wyjaśnienia. Spróbuj później.',
      });
    }
    if (state === 'limit') {
      return triLang(lang, {
        ru: 'Лимит AI-объяснений на сегодня закончился.',
        uk: 'Ліміт AI-пояснень на сьогодні закінчився.',
        es: 'Se acabó el límite de explicaciones AI por hoy.',
        'pt-BR': 'O limite de explicações de IA acabou por hoje.',
        vi: 'Hôm nay đã hết lượt giải thích AI.',
        id: 'Batas penjelasan AI hari ini sudah habis.',
        tr: 'Bugünkü AI açıklama hakkı bitti.',
        pl: 'Dzisiejszy limit wyjaśnień AI został wykorzystany.',
      });
    }
    return triLang(lang, {
      ru: 'ИИ объяснит именно твой ответ: где сбилось и как сказать правильно.',
      uk: 'AI пояснить саме твою відповідь: де збилося і як сказати правильно.',
      es: 'La IA explica tu respuesta exacta: qué falló y cómo decirlo bien.',
      'pt-BR': 'A IA explica sua resposta exata: onde errou e como dizer certo.',
      vi: 'AI giải thích đúng câu trả lời của bạn: sai ở đâu và nói sao cho đúng.',
      id: 'AI menjelaskan jawabanmu: bagian yang salah dan cara yang benar.',
      tr: 'AI tam cevabını açıklar: nerede hata var ve doğru nasıl söylenir.',
      pl: 'AI wyjaśni dokładnie Twoją odpowiedź: co poszło źle i jak powiedzieć poprawnie.',
    });
  })();

  return (
    <View
      testID="ai-mistake-card"
      style={[styles.card, { backgroundColor: t.bgCard, borderColor: state === 'ready' ? t.correct : t.border }]}
    >
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: t.accent + '18' }]}>
          <Image source={aiCompassIcon} style={styles.iconImage} contentFit="contain" />
        </View>
        <View style={styles.headerText}>
          <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }} numberOfLines={1}>
            {title}
          </Text>
          <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700' }} numberOfLines={1}>
            {quotaLine(lang, remaining)}
          </Text>
        </View>
      </View>
      <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: 20 }}>
        {body}
      </Text>
      {state !== 'ready' ? (
        <Pressable
          testID="ai-mistake-explain-button"
          accessibilityRole="button"
          disabled={!canPress}
          onPress={onExplain}
          style={[styles.button, { backgroundColor: canPress ? t.accent : t.textMuted, opacity: canPress ? 1 : 0.45 }]}
        >
          {isBusy ? (
            <ActivityIndicator size="small" color={t.correctText} />
          ) : (
            <Ionicons name={isBlocked ? 'lock-closed-outline' : 'bulb-outline'} size={16} color={t.correctText} />
          )}
          <Text style={{ color: t.correctText, fontSize: f.label, fontWeight: '900' }} numberOfLines={1}>
            {triLang(lang, {
              ru: isBlocked ? 'Лимит' : 'Объяснить',
              uk: isBlocked ? 'Ліміт' : 'Пояснити',
              es: isBlocked ? 'Límite' : 'Explicar',
              'pt-BR': isBlocked ? 'Limite' : 'Explicar',
              vi: isBlocked ? 'Hết lượt' : 'Giải thích',
              id: isBlocked ? 'Batas' : 'Jelaskan',
              tr: isBlocked ? 'Limit' : 'Açıkla',
              pl: isBlocked ? 'Limit' : 'Wyjaśnij',
            })}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12,
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
  iconImage: {
    height: 30,
    width: 30,
  },
  button: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
