import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useStableSafeAreaInsets } from "../../app/stable_safe_area_metrics";
import { triLang } from "../../constants/i18n";
import { useReduceMotionPreference } from "../../hooks/use_reduce_motion";
import { LinearGradient } from "../SafeLinearGradient";
import { useLang } from "../LangContext";
import { useTheme } from "../ThemeContext";

type Props = Readonly<{
  visible: boolean;
  // зачем: владелец 20.09 — «1 раз каждый юзер при входе может увидеть модал».
  // Ник обязательным быть не может: у человека без имени в профиле его просто
  // нет, а раньше это навсегда гасило модал (гейт ждал nicknameReady).
  // null = имени нет, строку с ником не рисуем, сам пропуск показываем.
  nickname: string | null;
  onDismiss: () => void;
}>;

export default function LearningV2FounderPassModal({
  visible,
  nickname,
  onDismiss,
}: Props) {
  const { lang } = useLang();
  const { theme: t, f } = useTheme();
  const insets = useStableSafeAreaInsets();
  const reduceMotion = useReduceMotionPreference() !== false;
  const entrance = useRef(new Animated.Value(0)).current;
  const passEntrance = useRef(new Animated.Value(0)).current;
  const sheen = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);

  const copy = useMemo(
    () => ({
      close: triLang(lang, {
        ru: "Закрыть",
        uk: "Закрити",
        en: "Close",
        es: "Cerrar",
        "pt-BR": "Fechar",
        vi: "Đóng",
        id: "Tutup",
        tr: "Kapat",
        pl: "Zamknij",
      }),
      pass: triLang(lang, {
        ru: "ПРОПУСК ОСНОВАТЕЛЯ",
        uk: "ПЕРЕПУСТКА ЗАСНОВНИКА",
        en: "FOUNDER PASS",
        es: "PASE DE FUNDADOR",
        "pt-BR": "PASSE DE FUNDADOR",
        vi: "THẺ NHÀ SÁNG LẬP",
        id: "KARTU PENDIRI",
        tr: "KURUCU KARTI",
        pl: "KARTA ZAŁOŻYCIELA",
      }),
      access: triLang(lang, {
        ru: "Ранний доступ",
        uk: "Ранній доступ",
        en: "Early access",
        es: "Acceso anticipado",
        "pt-BR": "Acesso antecipado",
        vi: "Truy cập sớm",
        id: "Akses awal",
        tr: "Erken erişim",
        pl: "Wczesny dostęp",
      }),
      kicker: triLang(lang, {
        ru: "КУРС СОЗДАЁТСЯ СЕЙЧАС",
        uk: "КУРС СТВОРЮЄТЬСЯ ЗАРАЗ",
        en: "THE COURSE IS BEING BUILT",
        es: "EL CURSO ESTÁ EN DESARROLLO",
        "pt-BR": "O CURSO ESTÁ EM DESENVOLVIMENTO",
        vi: "KHÓA HỌC ĐANG ĐƯỢC XÂY DỰNG",
        id: "KURSUS SEDANG DIBUAT",
        tr: "KURS ŞİMDİ HAZIRLANIYOR",
        pl: "KURS JEST W TRAKCIE TWORZENIA",
      }),
      title: triLang(lang, {
        ru: "Войдите раньше остальных",
        uk: "Увійдіть раніше за інших",
        en: "Come in before everyone else",
        es: "Entra antes que los demás",
        "pt-BR": "Entre antes de todo mundo",
        vi: "Trải nghiệm trước mọi người",
        id: "Masuk lebih awal dari yang lain",
        tr: "Herkesten önce içeri gir",
        pl: "Wejdź przed innymi",
      }),
      body: triLang(lang, {
        ru: "Мы открыли курс до завершения работ, потому что очень хотим узнать ваше мнение. Попробуйте готовые сессии и помогите нам сделать следующие лучше.",
        uk: "Ми відкрили курс до завершення робіт, бо дуже хочемо дізнатися вашу думку. Спробуйте готові сесії та допоможіть нам зробити наступні кращими.",
        en: "We opened the course before it is finished because we truly want your opinion. Try the ready sessions and help us make the next ones better.",
        es: "Abrimos el curso antes de terminarlo porque queremos conocer de verdad tu opinión. Prueba las sesiones listas y ayúdanos a mejorar las siguientes.",
        "pt-BR": "Abrimos o curso antes de concluí-lo porque queremos muito saber a sua opinião. Experimente as sessões prontas e ajude a melhorar as próximas.",
        vi: "Chúng tôi mở khóa học trước khi hoàn thiện vì rất muốn nghe ý kiến của bạn. Hãy thử các buổi đã sẵn sàng và giúp chúng tôi cải thiện phần tiếp theo.",
        id: "Kami membuka kursus sebelum selesai karena benar-benar ingin mendengar pendapatmu. Coba sesi yang siap dan bantu kami menyempurnakan sesi berikutnya.",
        tr: "Kursu tamamlanmadan açtık çünkü fikrini gerçekten duymak istiyoruz. Hazır oturumları dene ve sonrakileri iyileştirmemize yardım et.",
        pl: "Otwieramy kurs przed ukończeniem, bo naprawdę chcemy poznać Twoją opinię. Wypróbuj gotowe sesje i pomóż nam ulepszyć kolejne.",
      }),
      feedback: triLang(lang, {
        ru: "В конце каждой сессии можно поставить оценку и оставить комментарий.",
        uk: "Наприкінці кожної сесії можна поставити оцінку й залишити коментар.",
        en: "At the end of every session, you can rate it and leave a comment.",
        es: "Al final de cada sesión puedes valorarla y dejar un comentario.",
        "pt-BR": "Ao final de cada sessão, você pode avaliar e deixar um comentário.",
        vi: "Cuối mỗi buổi, bạn có thể chấm điểm và để lại bình luận.",
        id: "Di akhir setiap sesi, kamu dapat memberi nilai dan menulis komentar.",
        tr: "Her oturumun sonunda puan verebilir ve yorum bırakabilirsin.",
        pl: "Po każdej sesji możesz wystawić ocenę i zostawić komentarz.",
      }),
      cta: triLang(lang, {
        ru: "Начать знакомство",
        uk: "Почати знайомство",
        en: "Start exploring",
        es: "Empezar a explorar",
        "pt-BR": "Começar a explorar",
        vi: "Bắt đầu khám phá",
        id: "Mulai menjelajah",
        tr: "Keşfetmeye başla",
        pl: "Zacznij odkrywać",
      }),
    }),
    [lang],
  );

  useEffect(() => {
    if (!visible) return;
    closingRef.current = false;
    if (reduceMotion) {
      entrance.setValue(1);
      passEntrance.setValue(1);
      sheen.setValue(1);
      return;
    }
    entrance.setValue(0);
    passEntrance.setValue(0);
    sheen.setValue(0);
    Animated.parallel([
      Animated.timing(entrance, {
        toValue: 1,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(passEntrance, {
        toValue: 1,
        delay: 90,
        speed: 15,
        bounciness: 5,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.timing(sheen, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    });
  }, [entrance, passEntrance, reduceMotion, sheen, visible]);

  const dismiss = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (reduceMotion) {
      onDismiss();
      return;
    }
    // зачем: владелец 20.09 — «кнопка Начать знакомство блокируется».
    // Раньше onDismiss ждал КОНЦА анимации: 180мс тап выглядел мёртвым, а
    // если анимацию прерывали (быстрый повторный тап, уход приложения в фон),
    // onDismiss не вызывался вовсе и модал залипал.
    // Optimistic UI: закрываем сразу, анимация догоняет фоном.
    onDismiss();
    Animated.timing(entrance, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [entrance, onDismiss, reduceMotion]);

  const cardStyle = {
    opacity: entrance,
    transform: [
      {
        translateY: entrance.interpolate({
          inputRange: [0, 1],
          outputRange: [34, 0],
        }),
      },
      {
        scale: entrance.interpolate({
          inputRange: [0, 1],
          outputRange: [0.975, 1],
        }),
      },
    ],
  } as const;
  const passStyle = {
    opacity: passEntrance,
    transform: [
      {
        translateY: passEntrance.interpolate({
          inputRange: [0, 1],
          outputRange: [16, 0],
        }),
      },
      {
        scale: passEntrance.interpolate({
          inputRange: [0, 1],
          outputRange: [0.94, 1],
        }),
      },
    ],
  } as const;

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={dismiss}
    >
      <View
        testID="learning-v2-founder-pass-modal"
        accessibilityViewIsModal
        importantForAccessibility="yes"
        style={[
          styles.root,
          {
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: Math.max(insets.bottom, 20),
          },
        ]}
      >
        <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: entrance }]} />
        <Animated.View style={[styles.card, { backgroundColor: t.bgCard }, cardStyle]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.close}
            hitSlop={10}
            onPress={dismiss}
            style={({ pressed }) => [
              styles.close,
              { backgroundColor: t.bgSurface2, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="close" size={22} color={t.textPrimary} />
          </Pressable>

          <Animated.View style={[styles.pass, { borderColor: `${t.gold}55` }, passStyle]}>
            <LinearGradient
              colors={[`${t.gold}28`, `${t.accent}1F`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.sheen,
                {
                  opacity: sheen.interpolate({ inputRange: [0, 0.2, 0.75, 1], outputRange: [0, 0.25, 0.2, 0] }),
                  transform: [{ translateX: sheen.interpolate({ inputRange: [0, 1], outputRange: [-220, 260] }) }, { rotate: "18deg" }],
                },
              ]}
            />
            <LinearGradient
              colors={["#FFF0B8", t.gold, "#C89435"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.seal}
            >
              <Ionicons name="star-outline" size={28} color={t.textOnGold} />
            </LinearGradient>
            <View style={styles.passCopy}>
              <Text style={[styles.passLabel, { color: t.gold }]}>{copy.pass}</Text>
              {nickname ? (
                <Text style={[styles.passName, { color: t.textPrimary, fontSize: f.bodyLg }]}>
                  @{nickname}
                </Text>
              ) : null}
              <Text style={[styles.passMeta, { color: t.textMuted }]}>{copy.access}</Text>
            </View>
          </Animated.View>

          <Text style={[styles.kicker, { color: t.accent }]}>{copy.kicker}</Text>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.h1 }]}>{copy.title}</Text>
          <Text style={[styles.body, { color: t.textSecond, fontSize: f.body }]}>{copy.body}</Text>

          <View style={[styles.feedback, { backgroundColor: t.accentBg }]}>
            <Ionicons name="options-outline" size={21} color={t.accent} />
            <Text style={[styles.feedbackText, { color: t.textPrimary }]}>{copy.feedback}</Text>
          </View>

          <Pressable
            testID="learning-v2-founder-pass-continue"
            accessibilityRole="button"
            onPress={dismiss}
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: t.accent, opacity: pressed ? 0.82 : 1 },
            ]}
          >
            <Text style={[styles.ctaText, { color: t.correctText }]}>{copy.cta}</Text>
            <Ionicons name="arrow-forward" size={20} color={t.correctText} />
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  scrim: { backgroundColor: "rgba(2,4,8,0.78)" },
  card: {
    width: "100%",
    maxWidth: 410,
    alignSelf: "center",
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 54,
    paddingBottom: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.48,
    shadowRadius: 30,
    elevation: 24,
  },
  close: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  pass: {
    minHeight: 112,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
    overflow: "hidden",
    paddingHorizontal: 18,
    paddingVertical: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  sheen: {
    position: "absolute",
    top: -70,
    bottom: -70,
    width: 54,
    backgroundColor: "#FFFFFF",
  },
  seal: {
    width: 62,
    height: 62,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#E2AA42",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 7,
  },
  passCopy: { flex: 1, minWidth: 0 },
  passLabel: { fontSize: 10, lineHeight: 14, fontWeight: "900", letterSpacing: 1.2 },
  passName: { marginTop: 4, lineHeight: 25, fontWeight: "900" },
  passMeta: { marginTop: 8, fontSize: 10, lineHeight: 14, fontWeight: "700", letterSpacing: 1 },
  kicker: { marginTop: 22, fontSize: 11, lineHeight: 15, fontWeight: "900", letterSpacing: 1.2 },
  title: { marginTop: 8, lineHeight: 34, fontWeight: "900", letterSpacing: -0.6 },
  body: { marginTop: 11, lineHeight: 22, fontWeight: "500" },
  feedback: {
    marginTop: 17,
    minHeight: 68,
    borderRadius: 19,
    paddingHorizontal: 15,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  feedbackText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: "600" },
  cta: {
    marginTop: 18,
    minHeight: 52,
    borderRadius: 18,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaText: { fontSize: 15, lineHeight: 20, fontWeight: "900" },
});
