import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { SpeakingPanelTheme } from './SpeakingPanel';
import type { WordDrillVerdict } from '../app/speaking_word_drill';

/** Card phase, mirrored from SpeakingPanel so the two stay in lockstep. */
export type WordCardPhase = 'idle' | 'listening' | 'scoring' | 'clean' | 'fuzzy' | 'no_speech';

export interface WordDrillCardProps {
  /** The single target word being drilled (display form). */
  word: string;
  lang: string;
  theme: SpeakingPanelTheme;
  warnColor: string;
  phase: WordCardPhase;
  verdict: WordDrillVerdict | null;
  /** Android+whisper → press-and-hold; otherwise tap-to-record. */
  holdMode: boolean;
  /** The phrase mic is live — the word mic is locked out (mutual exclusion). */
  micBusy: boolean;
  onRepeatTap: () => void;
  onHoldStart: () => void;
  onHoldEnd: () => void;
  /** «Моя запись» of the whole phrase, when one exists — extra ear reference. */
  onPlayMine?: () => void;
  onClose: () => void;
}

const L = (lang: string, map: Record<string, string>): string =>
  map[lang] ?? map.ru ?? Object.values(map)[0] ?? '';

/**
 * Inline word-drill card shown under the phrase map when a problem word is
 * tapped. Listen to the correct word, repeat it, and see whether it landed
 * clean. Purely presentational: all recognition/scoring lives in SpeakingPanel;
 * this renders state and forwards intents.
 */
export function WordDrillCard({
  word,
  lang,
  theme,
  warnColor,
  phase,
  verdict,
  holdMode,
  micBusy,
  onRepeatTap,
  onHoldStart,
  onHoldEnd,
  onPlayMine,
  onClose,
}: WordDrillCardProps) {
  const listening = phase === 'listening';
  const busy = phase === 'scoring';
  const clean = phase === 'clean';
  const accent = clean ? theme.correct : warnColor;

  const statusText = (() => {
    switch (phase) {
      case 'listening':
        return holdMode
          ? L(lang, {
              ru: 'Говори… отпусти, когда скажешь',
              uk: 'Говори… відпусти, коли скажеш',
              es: 'Habla… suelta al terminar',
              'pt-BR': 'Fale… solte ao terminar',
              vi: 'Nói… thả ra khi xong',
              id: 'Bicara… lepas saat selesai',
              tr: 'Söyle… bitince bırak',
              pl: 'Mów… puść, gdy powiesz',
            })
          : L(lang, {
              ru: 'Слушаю слово…',
              uk: 'Слухаю слово…',
              es: 'Escuchando la palabra…',
              'pt-BR': 'Escutando a palavra…',
              vi: 'Đang nghe từ…',
              id: 'Mendengarkan kata…',
              tr: 'Kelimeyi dinliyorum…',
              pl: 'Słucham słowa…',
            });
      case 'scoring':
        return L(lang, {
          ru: 'Проверяю…',
          uk: 'Перевіряю…',
          es: 'Comprobando…',
          'pt-BR': 'Verificando…',
          vi: 'Đang kiểm tra…',
          id: 'Memeriksa…',
          tr: 'Kontrol ediyorum…',
          pl: 'Sprawdzam…',
        });
      case 'clean':
        return L(lang, {
          ru: 'Чисто! Слово готово',
          uk: 'Чисто! Слово готове',
          es: '¡Limpio! Palabra lista',
          'pt-BR': 'Limpo! Palavra pronta',
          vi: 'Rõ ràng! Từ đã ổn',
          id: 'Jelas! Kata siap',
          tr: 'Temiz! Kelime tamam',
          pl: 'Czysto! Słowo gotowe',
        });
      case 'fuzzy':
        return L(lang, {
          ru: 'Ещё нечётко — послушай и повтори',
          uk: 'Ще нечітко — послухай і повтори',
          es: 'Aún poco claro: escucha y repite',
          'pt-BR': 'Ainda impreciso — ouça e repita',
          vi: 'Vẫn chưa rõ — nghe và lặp lại',
          id: 'Masih kurang jelas — dengar dan ulangi',
          tr: 'Hâlâ net değil — dinle ve tekrarla',
          pl: 'Wciąż niewyraźnie — posłuchaj i powtórz',
        });
      case 'no_speech':
        return L(lang, {
          ru: 'Не расслышал. Скажи чуть громче',
          uk: 'Не розчув. Скажи трохи гучніше',
          es: 'No te oí. Habla un poco más alto',
          'pt-BR': 'Não ouvi. Fale um pouco mais alto',
          vi: 'Không nghe rõ. Nói to hơn chút',
          id: 'Tidak terdengar. Bicara lebih keras',
          tr: 'Duyamadım. Biraz daha yüksek söyle',
          pl: 'Nie dosłyszałem. Powiedz głośniej',
        });
      default:
        return holdMode
          ? L(lang, {
              ru: 'Зажми «Повторить» и скажи слово',
              uk: 'Затисни «Повторити» і скажи слово',
              es: 'Mantén «Repetir» y di la palabra',
              'pt-BR': 'Segure «Repetir» e diga a palavra',
              vi: 'Giữ «Lặp lại» và nói từ',
              id: 'Tahan «Ulangi» dan ucapkan kata',
              tr: '«Tekrarla»ya basılı tut ve söyle',
              pl: 'Przytrzymaj «Powtórz» i powiedz słowo',
            })
          : L(lang, {
              ru: 'Послушай, затем повтори слово',
              uk: 'Послухай, потім повтори слово',
              es: 'Escucha y luego repite la palabra',
              'pt-BR': 'Ouça e depois repita a palavra',
              vi: 'Nghe rồi lặp lại từ',
              id: 'Dengar lalu ulangi kata',
              tr: 'Dinle, sonra kelimeyi tekrarla',
              pl: 'Posłuchaj, potem powtórz słowo',
            });
    }
  })();

  // Concrete sound contrast on a fuzzy verdict, when pinpointed.
  const soundHint = phase === 'fuzzy' ? verdict?.soundHints?.[0] : undefined;
  const heard = phase === 'fuzzy' ? verdict?.heard : undefined;

  const repeatLabel = L(lang, {
    ru: 'Повторить',
    uk: 'Повторити',
    es: 'Repetir',
    'pt-BR': 'Repetir',
    vi: 'Lặp lại',
    id: 'Ulangi',
    tr: 'Tekrarla',
    pl: 'Powtórz',
  });

  const repeatHandlers = holdMode
    ? { onPressIn: onHoldStart, onPressOut: onHoldEnd }
    : { onPress: onRepeatTap };

  return (
    <View style={[styles.card, { borderColor: accent, backgroundColor: theme.card }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.word, { color: clean ? theme.correct : theme.textPrimary }]}>
          {word}
          {clean ? '  ✓' : ''}
        </Text>
        <Pressable
          onPress={onClose}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={L(lang, {
            ru: 'Свернуть',
            uk: 'Згорнути',
            es: 'Cerrar',
            'pt-BR': 'Fechar',
            vi: 'Đóng',
            id: 'Tutup',
            tr: 'Kapat',
            pl: 'Zwiń',
          })}
        >
          <Ionicons name="close" size={20} color={theme.textMuted} />
        </Pressable>
      </View>

      <Text style={[styles.status, { color: clean ? theme.correct : theme.textSecond }]}>
        {statusText}
      </Text>

      {(heard || soundHint) && (
        <Text style={[styles.detail, { color: theme.textMuted }]}>
          {heard
            ? L(lang, {
                ru: `услышал «${heard}»`,
                uk: `почув «${heard}»`,
                es: `escuché «${heard}»`,
                'pt-BR': `ouvi «${heard}»`,
                vi: `nghe thành «${heard}»`,
                id: `terdengar «${heard}»`,
                tr: `«${heard}» duydum`,
                pl: `usłyszałem «${heard}»`,
              })
            : ''}
          {heard && soundHint ? ' · ' : ''}
          {soundHint ? `/${soundHint.expected}/ ↔ /${soundHint.said}/` : ''}
        </Text>
      )}

      <View style={styles.actionsRow}>
        <Pressable
          {...repeatHandlers}
          disabled={busy || micBusy}
          accessibilityRole="button"
          accessibilityLabel={repeatLabel}
          accessibilityState={{ disabled: busy || micBusy, busy: listening || busy }}
          style={[
            styles.pill,
            {
              borderColor: 'transparent',
              backgroundColor: listening ? theme.wrong : theme.accent,
              opacity: busy || micBusy ? 0.5 : 1,
            },
          ]}
        >
          {busy ? (
            <ActivityIndicator color={theme.onAccent} size="small" />
          ) : (
            <Ionicons
              name={listening ? 'stop' : 'mic'}
              size={16}
              color={theme.onAccent}
            />
          )}
          <Text style={[styles.pillText, { color: theme.onAccent }]}>{repeatLabel}</Text>
        </Pressable>
      </View>

      {phase === 'no_speech' && onPlayMine && (
        <Pressable onPress={onPlayMine} hitSlop={6} style={styles.mineLink}>
          <Text style={[styles.mineText, { color: theme.accent }]}>
            {L(lang, {
              ru: 'Послушать свою запись',
              uk: 'Послухати свій запис',
              es: 'Escuchar mi grabación',
              'pt-BR': 'Ouvir minha gravação',
              vi: 'Nghe bản ghi của tôi',
              id: 'Dengar rekamanku',
              tr: 'Kaydımı dinle',
              pl: 'Posłuchaj mojego nagrania',
            })}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  word: { fontSize: 20, fontWeight: '700' },
  status: { fontSize: 13, marginBottom: 6 },
  detail: { fontSize: 12, marginBottom: 10 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  pillText: { fontSize: 13, fontWeight: '600' },
  mineLink: { marginTop: 10, alignSelf: 'flex-start' },
  mineText: { fontSize: 13, fontWeight: '600' },
});

export default WordDrillCard;
