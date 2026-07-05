// ════════════════════════════════════════════════════════════════════════════
// constellation_intro.tsx — онбординг первого входа в «Созвездия» (F6, гибрид).
//
// Быстрый и понятный, БЕЗ воды (решение владельца): 2 слайда голосом Компаса
// («что это» + «как играть»), потом сразу в матч. Показывается ОДИН раз —
// флаг в AsyncStorage. Дальше вход ведёт прямо на поиск.
//
// Голос — маскот Компас (🧭). Космический тёмный тон, живой звёздный фон.
// ════════════════════════════════════════════════════════════════════════════

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConstellationStarfield } from './constellation_starfield';
import { hapticLightImpact } from '../hooks/use-haptics';

export const CONSTELLATION_INTRO_SEEN_KEY = 'constellation_intro_seen_v1';

interface Slide {
  art: 'capture' | 'answer';
  kicker: (l: Lang) => string;
  title: (l: Lang) => string;
  body: (l: Lang) => string;
}

const SLIDES: Slide[] = [
  {
    art: 'capture',
    kicker: (l) => triLang(l, { ru: 'СОЗВЕЗДИЯ', uk: 'СУЗІР’Я', es: 'CONSTELACIONES', 'pt-BR': 'CONSTELAÇÕES', vi: 'CHÒM SAO', id: 'RASI BINTANG', tr: 'TAKIMYILDIZLARI', pl: 'GWIAZDOZBIORY' }),
    title: (l) => triLang(l, { ru: 'Захватывай звёзды', uk: 'Захоплюй зірки', es: 'Captura estrellas', 'pt-BR': 'Capture estrelas', vi: 'Chiếm lấy các sao', id: 'Rebut bintang', tr: 'Yıldızları ele geçir', pl: 'Zdobywaj gwiazdy' }),
    body: (l) => triLang(l, { ru: 'Четверо игроков зажигают звёзды на небе. Чем больше твоё созвездие — тем больше очков. Кто набрал больше за 10 раундов, тот и победил.', uk: 'Четверо гравців запалюють зірки на небі. Що більше сузір’я — то більше очок. Хто набрав більше за 10 раундів, той переміг.', es: 'Cuatro jugadores encienden estrellas. Cuanto mayor tu constelación, más puntos. Gana quien más suma en 10 rondas.', 'pt-BR': 'Quatro jogadores acendem estrelas. Quanto maior sua constelação, mais pontos. Vence quem somar mais em 10 rodadas.', vi: 'Bốn người thắp sáng các sao. Chòm sao càng lớn, càng nhiều điểm. Ai nhiều điểm nhất sau 10 vòng sẽ thắng.', id: 'Empat pemain menyalakan bintang. Makin besar rasimu, makin banyak poin. Yang terbanyak dalam 10 ronde menang.', tr: 'Dört oyuncu yıldızları yakar. Takımyıldızın büyüdükçe puanın artar. 10 turda en çok toplayan kazanır.', pl: 'Czterej gracze zapalają gwiazdy. Im większy gwiazdozbiór, tym więcej punktów. Wygrywa ten, kto zbierze najwięcej w 10 rundach.' }),
  },
  {
    art: 'answer',
    kicker: (l) => triLang(l, { ru: 'КАК ЗАХВАТИТЬ', uk: 'ЯК ЗАХОПИТИ', es: 'CÓMO CAPTURAR', 'pt-BR': 'COMO CAPTURAR', vi: 'CÁCH CHIẾM', id: 'CARA MEREBUT', tr: 'NASIL ELE GEÇİRİLİR', pl: 'JAK ZDOBYĆ' }),
    title: (l) => triLang(l, { ru: 'Отвечай верно', uk: 'Відповідай вірно', es: 'Responde bien', 'pt-BR': 'Responda certo', vi: 'Trả lời đúng', id: 'Jawab benar', tr: 'Doğru cevapla', pl: 'Odpowiadaj dobrze' }),
    body: (l) => triLang(l, { ru: 'Тапни звезду рядом со своей и ответь на вопрос по‑английски. Верно — звезда твоя. Ошибся — покажем правило и запомнишь. Даже проиграв, ты учишься!', uk: 'Тапни зірку поруч і відповідай англійською. Вірно — зірка твоя. Помилився — покажемо правило. Навіть програвши, ти вчишся!', es: 'Toca una estrella cercana y responde en inglés. Aciertas y es tuya. Fallas y te mostramos la regla. ¡Hasta perdiendo, aprendes!', 'pt-BR': 'Toque numa estrela próxima e responda em inglês. Acertou, é sua. Errou, mostramos a regra. Até perdendo, você aprende!', vi: 'Chạm sao gần đó và trả lời bằng tiếng Anh. Đúng thì là của bạn. Sai thì hiện quy tắc. Thua vẫn học được!', id: 'Ketuk bintang di dekatmu dan jawab dalam bahasa Inggris. Benar jadi milikmu. Salah, kami tunjukkan aturannya. Kalah pun tetap belajar!', tr: 'Yakındaki yıldıza dokun ve İngilizce cevapla. Doğruysa senindir. Yanlışsa kuralı gösteririz. Kaybetsen bile öğrenirsin!', pl: 'Dotknij pobliskiej gwiazdy i odpowiedz po angielsku. Dobrze — jest twoja. Źle — pokażemy zasadę. Nawet przegrywając, uczysz się!' }),
  },
];

export default function ConstellationIntroScreen() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const insets = useSafeAreaInsets();
  const [idx, setIdx] = useState(0);
  const slide = SLIDES[idx];
  const last = idx === SLIDES.length - 1;

  const skyColors: [string, string, string] = [t.bgGradient?.[0] ?? '#0A1124', '#0E1734', '#080D1F'];

  const finish = useCallback(() => {
    void AsyncStorage.setItem(CONSTELLATION_INTRO_SEEN_KEY, '1');
    router.replace('/constellation_search' as any);
  }, [router]);

  const next = useCallback(() => {
    hapticLightImpact();
    if (last) finish();
    else setIdx((i) => i + 1);
  }, [last, finish]);

  return (
    <View style={styles.root}>
      <LinearGradient colors={skyColors} style={StyleSheet.absoluteFill} />
      <ConstellationStarfield count={40} />

      <TouchableOpacity style={[styles.skip, { top: insets.top + 14 }]} onPress={finish}>
        <Text style={{ color: t.textSecond, fontSize: f.body }}>
          {triLang(lang, { ru: 'Пропустить', uk: 'Пропустити', es: 'Saltar', 'pt-BR': 'Pular', vi: 'Bỏ qua', id: 'Lewati', tr: 'Atla', pl: 'Pomiń' })}
        </Text>
      </TouchableOpacity>

      <View style={styles.body}>
        {/* Компас ведёт */}
        <View style={styles.compassRow}>
          <View style={styles.compass}><Text style={styles.compassIcon}>🧭</Text></View>
          <Text style={[styles.compassName, { color: '#8B7BFF' }]}>{triLang(lang, {
            ru: 'Компас', uk: 'Компас', es: 'Brújula', 'pt-BR': 'Bússola', vi: 'La Bàn', id: 'Kompas', tr: 'Pusula', pl: 'Kompas',
          })}</Text>
        </View>

        <View style={styles.art}>
          <IntroArt kind={slide.art} />
        </View>

        <Text style={styles.kicker}>{slide.kicker(lang)}</Text>
        <Text style={[styles.title, { color: t.textPrimary }]}>{slide.title(lang)}</Text>
        <Text style={[styles.desc, { color: t.textSecond }]}>{slide.body(lang)}</Text>
      </View>

      <View style={[styles.foot, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === idx ? styles.dotOn : null]} />
          ))}
        </View>
        <TouchableOpacity style={styles.cta} onPress={next} activeOpacity={0.85}>
          <Text style={styles.ctaText}>
            {last
              ? triLang(lang, { ru: '⭐ Играть', uk: '⭐ Грати', es: '⭐ Jugar', 'pt-BR': '⭐ Jogar', vi: '⭐ Chơi', id: '⭐ Main', tr: '⭐ Oyna', pl: '⭐ Graj' })
              : triLang(lang, { ru: 'Дальше →', uk: 'Далі →', es: 'Siguiente →', 'pt-BR': 'Próximo →', vi: 'Tiếp →', id: 'Lanjut →', tr: 'İleri →', pl: 'Dalej →' })}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/** Мини-иллюстрация слайда (созвездие / вопрос). */
function IntroArt({ kind }: { kind: 'capture' | 'answer' }) {
  if (kind === 'capture') {
    const pts = [[40, 40], [95, 30], [120, 75], [80, 95], [45, 80]];
    return (
      <Svg width={150} height={130} viewBox="0 0 150 130">
        {pts.map((p, i) => {
          const n = pts[(i + 1) % pts.length];
          return <Line key={i} x1={p[0]} y1={p[1]} x2={n[0]} y2={n[1]} stroke="#8B7BFF" strokeOpacity={0.55} strokeWidth={1.4} />;
        })}
        {pts.map((p, i) => (
          <React.Fragment key={`s${i}`}>
            <Circle cx={p[0]} cy={p[1]} r={9} fill="#8B7BFF" opacity={0.25} />
            <Circle cx={p[0]} cy={p[1]} r={3.5} fill="#EAF2FF" />
          </React.Fragment>
        ))}
      </Svg>
    );
  }
  return (
    <Svg width={150} height={130} viewBox="0 0 150 130">
      <Circle cx={75} cy={55} r={26} fill="#37E0C8" opacity={0.2} />
      <Circle cx={75} cy={55} r={9} fill="#37E0C8" />
      <Line x1={40} y1={55} x2={110} y2={55} stroke="#37E0C8" strokeOpacity={0.5} strokeWidth={1.2} />
      <Line x1={75} y1={22} x2={75} y2={88} stroke="#37E0C8" strokeOpacity={0.4} strokeWidth={1.2} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  skip: { position: 'absolute', right: 20, zIndex: 10 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  compassRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  compass: {
    width: 34, height: 34, borderRadius: 12,
    backgroundColor: 'rgba(139,123,255,0.18)', borderWidth: 1, borderColor: 'rgba(139,123,255,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  compassIcon: { fontSize: 18 },
  compassName: { fontSize: 13, fontWeight: '800' },
  art: { height: 130, marginBottom: 24 },
  kicker: { fontSize: 11, letterSpacing: 3, color: '#F6A93B', fontWeight: '700' },
  title: { fontSize: 25, fontWeight: '800', marginTop: 10, textAlign: 'center' },
  desc: { fontSize: 14.5, lineHeight: 21, marginTop: 14, textAlign: 'center' },
  foot: { paddingHorizontal: 30, alignItems: 'center', gap: 18 },
  dots: { flexDirection: 'row', gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(150,170,230,0.28)' },
  dotOn: { width: 20, backgroundColor: '#FFD166' },
  cta: {
    width: '100%', height: 52, borderRadius: 15,
    backgroundColor: '#8B7BFF', alignItems: 'center', justifyContent: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
