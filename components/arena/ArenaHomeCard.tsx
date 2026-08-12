import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { triLang } from '../../constants/i18n';
import { hapticTap } from '../../hooks/use-haptics';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';

/** Static Home entry: no listener, timer or looping animation before Arena opens. */
function ArenaHomeCard() {
  const router = useRouter();
  const { lang } = useLang();
  const { f } = useTheme();
  const title = triLang(lang, {
    ru: 'Арена', uk: 'Арена', es: 'Arena', 'pt-BR': 'Arena',
    vi: 'Đấu trường', id: 'Arena', tr: 'Arena', pl: 'Arena',
  });
  const body = triLang(lang, {
    ru: 'Дуэль на знание языка', uk: 'Дуель на знання мови', es: 'Un duelo de idiomas',
    'pt-BR': 'Um duelo de idiomas', vi: 'Đấu kiến thức ngôn ngữ',
    id: 'Duel kemampuan bahasa', tr: 'Dil bilgisi düellosu', pl: 'Pojedynek językowy',
  });
  const questions = triLang(lang, {
    ru: '10 вопросов', uk: '10 запитань', es: '10 preguntas', 'pt-BR': '10 perguntas',
    vi: '10 câu hỏi', id: '10 soal', tr: '10 soru', pl: '10 pytań',
  });
  const duration = triLang(lang, {
    ru: '2–3 минуты', uk: '2–3 хвилини', es: '2–3 minutos', 'pt-BR': '2–3 minutos',
    vi: '2–3 phút', id: '2–3 menit', tr: '2–3 dakika', pl: '2–3 minuty',
  });

  return (
    <Pressable
      testID="home-arena-open"
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${body}. ${questions}. ${duration}`}
      accessibilityHint={triLang(lang, {
        ru: 'Открыть режимы Арены', uk: 'Відкрити режими Арени', es: 'Abrir los modos de Arena',
        'pt-BR': 'Abrir os modos da Arena', vi: 'Mở các chế độ Đấu trường',
        id: 'Buka mode Arena', tr: 'Arena modlarını aç', pl: 'Otwórz tryby Areny',
      })}
      onPress={() => {
        void hapticTap();
        router.push('/arena' as never);
      }}
      style={({ pressed }) => [styles.shell, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={['#C7FF4A', '#72E86E', '#43C9A5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View pointerEvents="none" style={styles.glow} />
        <View style={styles.iconPlate}>
          <Ionicons name="shield-half" size={30} color="#07110A" />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, { fontSize: Math.max(20, f.bodyLg + 2) }]}>{title}</Text>
          <Text style={[styles.body, { fontSize: Math.max(13, f.label) }]}>{body}</Text>
          <View style={styles.chips}>
            <View style={styles.chip}>
              <Ionicons name="help-circle" size={15} color="#07110A" />
              <Text style={styles.chipText}>{questions}</Text>
            </View>
            <View style={styles.chip}>
              <Ionicons name="time" size={15} color="#07110A" />
              <Text style={styles.chipText}>{duration}</Text>
            </View>
          </View>
        </View>
        <View style={styles.arrow}>
          <Ionicons name="arrow-forward" size={22} color="#07110A" />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginHorizontal: 8,
    marginBottom: 14,
    minHeight: 136,
    borderRadius: 24,
    shadowColor: '#07110A',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  pressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },
  card: {
    minHeight: 136,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    right: -48,
    top: -92,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  iconPlate: {
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  copy: { flex: 1, minWidth: 0 },
  title: { color: '#07110A', fontWeight: '900', lineHeight: 27 },
  body: { color: 'rgba(7,17,10,0.72)', fontWeight: '800', marginTop: 2, lineHeight: 19 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: {
    minHeight: 28,
    borderRadius: 999,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.32)',
  },
  chipText: { color: '#07110A', fontSize: 11, lineHeight: 15, fontWeight: '900' },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});

export default memo(ArenaHomeCard);
