import React, { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import type { Lang } from '../../constants/i18n';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useTheme } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette'; // зачем: реплей диалога в интро на палитре стекла

type Replay = readonly [string, string, string];

/** Prepared examples only: this surface never starts a dialogue or sends a request. */
const REPLAYS: Record<Lang, readonly Replay[]> = {
  ru: [
    ['Привет! Соберём планы?', 'Да, я свободен после шести.', 'Отлично, я создам общий чат.'],
    ['Ты уже выбрал место?', 'Давай сравним два варианта.', 'Хорошо, пришлю детали.'],
    ['Кто возьмёт первую задачу?', 'Я могу начать сегодня.', 'Супер, держим связь здесь.'],
  ],
  uk: [
    ['Привіт! Зберемо плани?', 'Так, я вільний після шостої.', 'Чудово, я створю спільний чат.'],
    ['Ти вже вибрав місце?', 'Давай порівняємо два варіанти.', 'Добре, надішлю деталі.'],
    ['Хто візьме перше завдання?', 'Я можу почати сьогодні.', 'Супер, тримаємо зв’язок тут.'],
  ],
  en: [
    ['Hi! Shall we make plans?', 'Yes, I am free after six.', 'Great, I will start a group chat.'],
    ['Have you picked a place?', 'Let us compare two options.', 'Okay, I will send the details.'],
    ['Who can take the first task?', 'I can start today.', 'Perfect, let us stay in touch here.'],
  ],
  es: [
    ['¡Hola! ¿Hacemos planes?', 'Sí, estoy libre después de las seis.', 'Genial, crearé un chat de grupo.'],
    ['¿Ya elegiste un lugar?', 'Comparemos dos opciones.', 'Vale, enviaré los detalles.'],
    ['¿Quién toma la primera tarea?', 'Puedo empezar hoy.', 'Perfecto, seguimos en contacto aquí.'],
  ],
  'pt-BR': [
    ['Oi! Vamos fazer planos?', 'Sim, estou livre depois das seis.', 'Ótimo, vou criar um chat em grupo.'],
    ['Você já escolheu um lugar?', 'Vamos comparar duas opções.', 'Certo, vou enviar os detalhes.'],
    ['Quem pega a primeira tarefa?', 'Eu posso começar hoje.', 'Perfeito, falamos por aqui.'],
  ],
  vi: [
    ['Chào! Mình lên kế hoạch nhé?', 'Được, tôi rảnh sau sáu giờ.', 'Tuyệt, tôi sẽ tạo một nhóm chat.'],
    ['Bạn đã chọn địa điểm chưa?', 'Mình so sánh hai lựa chọn nhé.', 'Được, tôi sẽ gửi chi tiết.'],
    ['Ai nhận việc đầu tiên?', 'Tôi có thể bắt đầu hôm nay.', 'Hay lắm, mình giữ liên lạc ở đây nhé.'],
  ],
  id: [
    ['Hai! Kita buat rencana?', 'Ya, aku bebas setelah jam enam.', 'Bagus, aku akan membuat grup chat.'],
    ['Kamu sudah memilih tempat?', 'Mari bandingkan dua pilihan.', 'Oke, aku akan mengirim detailnya.'],
    ['Siapa yang mengambil tugas pertama?', 'Aku bisa mulai hari ini.', 'Sip, kita tetap terhubung di sini.'],
  ],
  tr: [
    ['Merhaba! Plan yapalım mı?', 'Evet, altıdan sonra müsaitim.', 'Harika, bir grup sohbeti açacağım.'],
    ['Bir yer seçtin mi?', 'İki seçeneği karşılaştıralım.', 'Tamam, ayrıntıları göndereceğim.'],
    ['İlk görevi kim alır?', 'Bugün başlayabilirim.', 'Süper, buradan iletişimde kalalım.'],
  ],
  pl: [
    ['Cześć! Ustalimy plany?', 'Tak, mam czas po szóstej.', 'Świetnie, założę czat grupowy.'],
    ['Wybrałeś już miejsce?', 'Porównajmy dwie opcje.', 'Dobrze, wyślę szczegóły.'],
    ['Kto weźmie pierwsze zadanie?', 'Mogę zacząć dzisiaj.', 'Super, zostańmy tu w kontakcie.'],
  ],
};

function ReplayBubble({ index, text, phase }: { index: number; text: string; phase: SharedValue<number> }) {
  const { f, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const reply = index === 1;
  const style = useAnimatedStyle(() => {
    const start = index * 0.3;
    const progress = interpolate(phase.value, [start, start + 0.22], [0, 1], 'clamp');
    return {
      opacity: progress,
      transform: [{ translateY: (1 - progress) * 10 }],
    };
  });
  return (
    <Animated.View style={[styles.bubble, reply ? styles.reply : styles.incoming, { backgroundColor: reply ? glass.cta : glass.opaqueControl }, style]}>
      <Text style={[styles.text, { color: reply ? glass.ctaInk : glass.text, fontSize: f.body }]}>{text}</Text>
    </Animated.View>
  );
}

function DialogueConsentChatReplay({ lang, variant = 0 }: { lang: Lang; variant?: number }) {
  const reduceMotion = useReduceMotion();
  const phase = useSharedValue(reduceMotion ? 1 : 0);
  const replay = REPLAYS[lang][variant % REPLAYS[lang].length];

  useEffect(() => {
    phase.value = reduceMotion ? 1 : 0;
    if (!reduceMotion) phase.value = withTiming(1, { duration: 2200, easing: Easing.out(Easing.cubic) });
    return () => cancelAnimation(phase);
  }, [phase, reduceMotion]);

  return (
    <View
      style={styles.stage}
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="ai-dialog-consent-replay"
    >
      {replay.map((text, index) => <ReplayBubble key={`${variant}-${index}`} index={index} text={text} phase={phase} />)}
    </View>
  );
}

export default memo(DialogueConsentChatReplay);

const styles = StyleSheet.create({
  stage: { gap: 8, marginBottom: 14 },
  bubble: { alignSelf: 'flex-start', borderRadius: 16, maxWidth: '84%', paddingHorizontal: 14, paddingVertical: 10 },
  incoming: { borderBottomLeftRadius: 5 },
  reply: { alignSelf: 'flex-end', borderBottomRightRadius: 5 },
  text: { fontWeight: '400', lineHeight: 20 },
});
