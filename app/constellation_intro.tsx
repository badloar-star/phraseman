// ════════════════════════════════════════════════════════════════════════════
// constellation_intro.tsx — онбординг первого входа в «Созвездия» (F6, гибрид).
//
// Быстрый и понятный, БЕЗ воды (решение владельца): 3 слайда голосом Компаса
// («что это» + «как играть» + «щит/дуэль/второй шанс»), потом сразу в матч.
// Показывается ОДИН раз — флаг в AsyncStorage. Дальше вход ведёт на поиск.
//
// Голос — маскот Компас (🧭). Космический тёмный тон, живой звёздный фон.
// ════════════════════════════════════════════════════════════════════════════

import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

// Маскот-Компас — настоящий ассет (золото-бирюзовый компас в пузыре речи).
const COMPASS_IMG = require('../assets/images/theo/theo-phrase-compass-v1.webp');
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConstellationStarfield } from './constellation_starfield';
import { hapticLightImpact } from '../hooks/use-haptics';

export const CONSTELLATION_INTRO_SEEN_KEY = 'constellation_intro_seen_v1';

interface Slide {
  art: 'capture' | 'answer' | 'rescue';
  kicker: (l: Lang) => string;
  title: (l: Lang) => string;
  body: (l: Lang) => string;
}

const SLIDES: Slide[] = [
  {
    art: 'capture',
    kicker: (l) => triLang(l, { ru: 'Привет! Я Компас', uk: 'Привіт! Я Компас', es: '¡Hola! Soy la Brújula', 'pt-BR': 'Oi! Sou a Bússola', vi: 'Chào! Tôi là La Bàn', id: 'Hai! Aku Kompas', tr: 'Merhaba! Ben Pusula', pl: 'Cześć! Jestem Kompas' }),
    title: (l) => triLang(l, { ru: 'Зажигай звёзды', uk: 'Запалюй зірки', es: 'Enciende estrellas', 'pt-BR': 'Acenda estrelas', vi: 'Thắp sáng các sao', id: 'Nyalakan bintang', tr: 'Yıldızları yak', pl: 'Zapalaj gwiazdy' }),
    body: (l) => triLang(l, { ru: 'Вас четверо на ночном небе. Отвечай на вопросы — и звёзды загораются твоим цветом. Кто зажёг больше за игру, тот и звезда вечера.', uk: 'Вас четверо на нічному небі. Відповідай на питання — і зірки загоряються твоїм кольором. Хто запалив більше, той і зірка вечора.', es: 'Sois cuatro en el cielo nocturno. Responde y las estrellas brillan con tu color. Quien encienda más, gana la noche.', 'pt-BR': 'São quatro no céu noturno. Responda e as estrelas brilham na sua cor. Quem acender mais ganha a noite.', vi: 'Bốn người trên bầu trời đêm. Trả lời đúng và sao sáng lên màu của bạn. Ai thắp nhiều nhất sẽ thắng.', id: 'Kalian berempat di langit malam. Jawab dan bintang menyala warnamu. Yang paling banyak menang.', tr: 'Gece göğünde dördünüz varsınız. Cevapla, yıldızlar senin renginle parlasın. En çok yakan kazanır.', pl: 'Jest was czworo na nocnym niebie. Odpowiadaj, a gwiazdy zapłoną twoim kolorem. Kto zapali więcej, wygrywa.' }),
  },
  {
    art: 'answer',
    kicker: (l) => triLang(l, { ru: 'Как это работает', uk: 'Як це працює', es: 'Cómo funciona', 'pt-BR': 'Como funciona', vi: 'Cách chơi', id: 'Cara mainnya', tr: 'Nasıl oluyor', pl: 'Jak to działa' }),
    title: (l) => triLang(l, { ru: 'Отвечай — забирай', uk: 'Відповідай — забирай', es: 'Responde y conquista', 'pt-BR': 'Responda e conquiste', vi: 'Trả lời và chiếm', id: 'Jawab dan rebut', tr: 'Cevapla ve al', pl: 'Odpowiadaj i zdobywaj' }),
    body: (l) => triLang(l, { ru: 'Выбери звезду рядом со своей, ответь по‑английски — и она твоя. Ошибёшься? Не страшно: я подскажу правило, и в следующий раз получится. Тут учишься, даже когда проигрываешь.', uk: 'Обери зірку поруч, відповідай англійською — і вона твоя. Помилився? Не біда: я підкажу правило. Тут вчишся, навіть коли програєш.', es: 'Elige una estrella cercana, responde en inglés y será tuya. ¿Fallaste? Tranquilo, te soplo la regla. Aquí aprendes incluso perdiendo.', 'pt-BR': 'Escolha uma estrela ao lado, responda em inglês e ela é sua. Errou? Calma, eu te dou a regra. Aqui você aprende até perdendo.', vi: 'Chọn sao gần bạn, trả lời tiếng Anh và nó là của bạn. Sai ư? Đừng lo, tôi nhắc quy tắc. Ở đây thua vẫn học được.', id: 'Pilih bintang di sebelahmu, jawab Inggris, jadi milikmu. Salah? Santai, kubisikkan aturannya. Di sini kalah pun belajar.', tr: 'Yanındaki yıldızı seç, İngilizce cevapla, senin olsun. Yanıldın mı? Merak etme, kuralı fısıldarım. Burada kaybederken bile öğrenirsin.', pl: 'Wybierz gwiazdę obok, odpowiedz po angielsku i jest twoja. Błąd? Spokojnie, podpowiem zasadę. Tu uczysz się nawet przegrywając.' }),
  },
  {
    art: 'rescue',
    kicker: (l) => triLang(l, { ru: 'Не бойся проиграть', uk: 'Не бійся програти', es: 'No temas perder', 'pt-BR': 'Não tema perder', vi: 'Đừng sợ thua', id: 'Jangan takut kalah', tr: 'Kaybetmekten korkma', pl: 'Nie bój się przegrać' }),
    title: (l) => triLang(l, { ru: 'Щит, дуэль и второй шанс', uk: 'Щит, дуель і другий шанс', es: 'Escudo, duelo y revancha', 'pt-BR': 'Escudo, duelo e revanche', vi: 'Khiên, đấu và cơ hội hai', id: 'Perisai, duel, kesempatan kedua', tr: 'Kalkan, düello, ikinci şans', pl: 'Tarcza, pojedynek i druga szansa' }),
    body: (l) => triLang(l, { ru: 'Раз за игру можно поставить щит — звезду не отнимут. Если двое метят в одну звезду — быстрый блиц-поединок решит, чья она. А выбьют тебя — станешь падающей звездой: ответь верно и вернись в игру.', uk: 'Раз за гру постав щит — зірку не заберуть. Якщо двоє цілять в одну зірку — швидкий бліц вирішить, чия вона. Виб’ють тебе — станеш падаючою зіркою: відповідай вірно і повертайся.', es: 'Una vez por partida pon un escudo: nadie te quita esa estrella. Si dos van por la misma, un duelo rápido decide. ¿Te eliminan? Serás estrella fugaz: acierta y vuelves.', 'pt-BR': 'Uma vez por partida use um escudo: ninguém tira essa estrela. Se dois querem a mesma, um duelo rápido decide. Foi eliminado? Vira estrela cadente: acerte e volte.', vi: 'Mỗi ván được đặt một khiên — không ai lấy được sao đó. Hai người cùng nhắm một sao? Đấu nhanh phân thắng bại. Bị loại? Thành sao băng: trả lời đúng để trở lại.', id: 'Sekali per game pasang perisai — bintang itu aman. Kalau dua orang incar bintang sama, duel cepat menentukan. Tersingkir? Jadi bintang jatuh: jawab benar dan kembali.', tr: 'Oyun başına bir kalkan koy — o yıldız alınmaz. İkisi aynı yıldızı isterse hızlı düello karar verir. Elendin mi? Kayan yıldız olursun: doğru cevapla ve dön.', pl: 'Raz na grę postaw tarczę — nikt nie zabierze tej gwiazdy. Dwóch celuje w tę samą? Szybki pojedynek rozstrzyga. Wybito cię? Zostajesz spadającą gwiazdą: odpowiedz dobrze i wróć.' }),
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
        {/* Компас-маскот ведёт онбординг — настоящий ассет, крупно в центре.
            На 1-м слайде он представляется, на 2-м — рядом иллюстрация действия. */}
        {idx === 0 ? (
          <Image source={COMPASS_IMG} style={styles.compassHero} contentFit="contain" transition={160} />
        ) : (
          <View style={styles.art}><IntroArt kind={slide.art} /></View>
        )}

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

/** Мини-иллюстрация слайда (созвездие / вопрос / щит-возрождение). */
function IntroArt({ kind }: { kind: 'capture' | 'answer' | 'rescue' }) {
  if (kind === 'rescue') {
    // Звезда под щитом (кольцо) + падающий след — «защита и второй шанс».
    return (
      <Svg width={150} height={130} viewBox="0 0 150 130">
        {/* защитное кольцо-щит */}
        <Circle cx={75} cy={62} r={34} fill="none" stroke="#FFD166" strokeOpacity={0.55} strokeWidth={2} />
        <Circle cx={75} cy={62} r={34} fill="#FFD166" opacity={0.08} />
        {/* звезда в центре */}
        <Circle cx={75} cy={62} r={18} fill="#8B7BFF" opacity={0.25} />
        <Circle cx={75} cy={62} r={7} fill="#EAF2FF" />
        {/* падающий след (возрождение) */}
        <Line x1={112} y1={20} x2={92} y2={44} stroke="#37E0C8" strokeOpacity={0.7} strokeWidth={2} strokeLinecap="round" />
        <Circle cx={92} cy={44} r={3} fill="#37E0C8" />
      </Svg>
    );
  }
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
  compassHero: { width: 150, height: 150, marginBottom: 24 },
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
