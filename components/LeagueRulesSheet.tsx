/**
 * LeagueRulesSheet — шторка «Как устроена лига».
 *
 * зачем (владелец, 2026-08-24): «когда юзер заходит в лигу, надо модал-лист
 * снизу, который расскажет что такое лига, как тут повышаться и понижаться и
 * всё остальное; текст продуман и взвешен, с юморком, красивый стиль; кнопка
 * вопрос кругленькая в правом верхнем углу его вызывает».
 *
 * Показ: автоматически ОДИН раз (feature_intro_registry — ключ живёт по
 * аккаунту и переживает перезапуск) и в любой момент по кнопке «?».
 *
 * Стиль строго по дому: RN Modal + reanimated drag-to-dismiss по паттерну
 * ExplainSheet (тяга вниз 1:1, вверх резина ×0.12, закрытие 88px/velocity 900),
 * тон вместо обводки, никаких подписей-расшифровок мелким шрифтом.
 * Движение: кривая 0.32/0.72/0/1 (та же, что у остальных листов дома).
 *
 * Текст сознательно НЕ называет валюту очков «опытом»: с недели перехода
 * (RUNES_LEAGUE_START_WEEK_ID) очки лиги — заработанные руны, и формулировки
 * подобраны так, чтобы пережить переключение без переписывания.
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing as REasing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from './ThemeContext';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import TonalSurface from './TonalSurface';

const SHEET_HIDDEN = 340;

type RuleSection = Readonly<{
  id: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: (lang: Lang) => string;
  body: (lang: Lang) => string;
}>;

/**
 * Разделы объяснялки. Порядок — от «что это» к деталям: сначала правила игры,
 * потом призы, потом тонкости. Тон: дружелюбный взрослый с лёгкой иронией,
 * без сюсюканья и без слова «рулетка» (запреты владельца).
 *
 * зачем (владелец, 2026-08-24): «тексты объяснений вообще не игровые, очень
 * много написано — надо сжато и с юморком, а не так распинаться». Аудит той
 * версии: 950 знаков на пять разделов, по 27–37 слов в абзаце — стена, которую
 * в нижней шторке дочитывают до третьего предложения единицы, а шутка как раз
 * и жила в третьем. Правило нового тона: факт в первой строке, шутка сразу за
 * ним, 12–18 слов на раздел. Цифры сверены с кодом, не выдуманы: зона 15% —
 * LEAGUE_RESULT_ZONE_RATIO, два часа и ×2 — LEAGUE_HOT_HOURS_WINDOW_MS и
 * LEAGUE_HOT_HOURS_MULTIPLIER, «ноль очков = спуск» — ветки iScored/inZeroZone
 * в league_engine. Про личные усиления клуба ×2/×3 намеренно не пишем: они
 * живут на своём экране и в объяснялке лиги были пятым фактом в четвёртом
 * абзаце — ровно тем перегрузом, который владелец и просил убрать.
 */
const SECTIONS: readonly RuleSection[] = [
  {
    id: 'what',
    icon: 'people-outline',
    title: (lang) => triLang(lang, {
      ru: 'Комната на неделю',
      uk: 'Кімната на тиждень',
      es: 'Una sala por semana',
      'pt-BR': 'Uma sala por semana',
      vi: 'Phòng đấu theo tuần',
      id: 'Satu ruang tiap pekan',
      tr: 'Haftalık bir oda',
      pl: 'Pokój na tydzień',
    }),
    body: (lang) => triLang(lang, {
      ru: 'В понедельник тебя селят к десяткам таких же упрямых. Очко — заработанная руна. Зашёл посмотреть — ноль.',
      uk: 'У понеділок тебе селять до десятків таких самих упертих. Очко — зароблена руна. Зайшов подивитися — нуль.',
      es: 'El lunes te meten con decenas de tercos como tú. Un punto es una runa ganada. Solo mirar: cero.',
      'pt-BR': 'Na segunda você cai num grupo de dezenas de teimosos. Um ponto é uma runa conquistada. Só olhar: zero.',
      vi: 'Thứ Hai bạn được xếp cùng hàng chục người lì như bạn. Một điểm là một rune kiếm được. Chỉ vào ngó: 0.',
      id: 'Tiap Senin kamu masuk ke ruang berisi puluhan orang sekeras kepala kamu. Satu poin sama dengan satu rune. Cuma menengok: nol.',
      tr: 'Pazartesi seni senin kadar inatçı onlarca kişiyle aynı odaya koyarız. Puan, kazanılmış rün demek. Sadece bakmak: sıfır.',
      pl: 'W poniedziałek trafiasz do kilkudziesięciu równie upartych. Punkt to zdobyta runa. Samo zajrzenie: zero.',
    }),
  },
  {
    id: 'promotion',
    icon: 'trending-up',
    title: (lang) => triLang(lang, {
      ru: 'Наверх и вниз',
      uk: 'Угору й донизу',
      es: 'Subir y bajar',
      'pt-BR': 'Subir e descer',
      vi: 'Lên và xuống',
      tr: 'Yukarı ve aşağı',
      id: 'Naik dan turun',
      pl: 'W górę i w dół',
    }),
    body: (lang) => triLang(lang, {
      ru: 'Верхние 15% — этажом выше, нижние 15% — этажом ниже. Неделя с нулём очков — спуск без обсуждения.',
      uk: 'Верхні 15% — поверхом вище, нижні 15% — поверхом нижче. Тиждень із нулем очок — спуск без обговорення.',
      es: 'El 15% de arriba sube un piso; el 15% de abajo baja. Semana con cero puntos: bajas, sin discusión.',
      'pt-BR': 'Os 15% de cima sobem um andar; os 15% de baixo descem. Semana com zero pontos: desce, sem discussão.',
      vi: 'Top 15% lên một tầng, 15% cuối xuống một tầng. Tuần 0 điểm là xuống hạng, khỏi bàn.',
      id: 'Atas 15% naik satu lantai, bawah 15% turun. Sepekan nol poin: turun, tanpa diskusi.',
      tr: 'Üstteki %15 bir kat yukarı, alttaki %15 bir kat aşağı. Sıfır puanlı hafta: düşersin, tartışmasız.',
      pl: 'Górne 15% piętro wyżej, dolne 15% piętro niżej. Tydzień z zerem punktów: spadek, bez dyskusji.',
    }),
  },
  {
    id: 'chest',
    icon: 'cube-outline',
    title: (lang) => triLang(lang, {
      ru: 'Сундук на всех',
      uk: 'Скриня на всіх',
      es: 'Un cofre para todos',
      'pt-BR': 'Um baú para todos',
      vi: 'Rương chung',
      id: 'Peti untuk semua',
      tr: 'Herkes için sandık',
      pl: 'Skrzynia dla wszystkich',
    }),
    body: (lang) => triLang(lang, {
      ru: 'Очки комнаты копятся в общий котёл. Заполнили — сундук открывается всем. Соперники внезапно коллеги.',
      uk: 'Очки кімнати збираються в спільний казан. Наповнили — скриня відкривається всім. Суперники раптом колеги.',
      es: 'Los puntos de la sala llenan un bote común. Lleno: el cofre se abre para todos. Rivales que resultan colegas.',
      'pt-BR': 'Os pontos da sala enchem um caldeirão comum. Cheio: o baú abre para todos. Rivais que viram colegas.',
      vi: 'Điểm cả phòng dồn vào một nồi chung. Đầy nồi là rương mở cho tất cả. Đối thủ bỗng thành đồng đội.',
      id: 'Poin seruangan mengisi satu wadah bersama. Penuh: peti terbuka untuk semua. Lawan mendadak jadi rekan.',
      tr: 'Odanın puanları ortak bir kazanda birikir. Dolunca sandık herkese açılır. Rakipler birden meslektaş olur.',
      pl: 'Punkty pokoju zbierają się we wspólnym kotle. Pełny: skrzynia otwiera się dla wszystkich. Rywale nagle współpracownikami.',
    }),
  },
  {
    id: 'boosts',
    icon: 'flame-outline',
    title: (lang) => triLang(lang, {
      ru: 'Горячие часы',
      uk: 'Гарячі години',
      es: 'Horas calientes',
      'pt-BR': 'Horas quentes',
      vi: 'Giờ nóng',
      id: 'Jam panas',
      tr: 'Kızgın saatler',
      pl: 'Gorące godziny',
    }),
    body: (lang) => triLang(lang, {
      ru: 'Последние два часа недели в зоне вылета очки идут вдвойне. Камбэк в воскресенье вечером — законный жанр.',
      uk: 'Останні дві години тижня в зоні вильоту очки йдуть удвічі. Камбек у неділю ввечері — цілком законний жанр.',
      es: 'En las últimas dos horas, en zona de descenso los puntos van dobles. La remontada del domingo es un género legítimo.',
      'pt-BR': 'Nas duas últimas horas, na zona de rebaixamento os pontos contam em dobro. A virada de domingo é gênero legítimo.',
      vi: 'Hai giờ cuối tuần, ai ở nhóm xuống hạng được nhân đôi điểm. Lội ngược dòng tối Chủ nhật là chuyện hợp lệ.',
      id: 'Dua jam terakhir, di zona degradasi poin dihitung ganda. Comeback Minggu malam itu genre yang sah.',
      tr: 'Haftanın son iki saatinde küme hattındakilere puanlar iki katı. Pazar akşamı geri dönüş meşru bir türdür.',
      pl: 'W ostatnie dwie godziny w strefie spadkowej punkty liczą się podwójnie. Powrót w niedzielny wieczór to legalny gatunek.',
    }),
  },
  {
    id: 'bonus',
    icon: 'ribbon-outline',
    title: (lang) => triLang(lang, {
      ru: 'Зачем лезть выше',
      uk: 'Навіщо лізти вище',
      es: 'Para qué subir',
      'pt-BR': 'Para que subir',
      vi: 'Leo cao để làm gì',
      id: 'Untuk apa naik',
      tr: 'Neden yükselmeli',
      pl: 'Po co piąć się wyżej',
    }),
    body: (lang) => triLang(lang, {
      ru: 'Каждая лига добавляет опыт навсегда: от +10% в бронзе до +110% на вершине. И вид оттуда приятнее.',
      uk: 'Кожна ліга додає досвід назавжди: від +10% у бронзі до +110% на вершині. Та й краєвид звідти приємніший.',
      es: 'Cada liga suma experiencia para siempre: de +10% en bronce a +110% en la cima. Y las vistas son mejores.',
      'pt-BR': 'Cada liga soma experiência para sempre: de +10% no bronze a +110% no topo. E a vista lá de cima é melhor.',
      vi: 'Mỗi hạng cộng kinh nghiệm vĩnh viễn: từ +10% ở Đồng đến +110% trên đỉnh. Cảnh trên đó cũng đẹp hơn.',
      id: 'Tiap liga menambah pengalaman selamanya: dari +10% di perunggu sampai +110% di puncak. Pemandangannya juga lebih bagus.',
      tr: 'Her lig kalıcı deneyim ekler: bronzda +%10, zirvede +%110. Üstelik yukarıdan manzara da güzel.',
      pl: 'Każda liga dodaje doświadczenie na stałe: od +10% w brązie do +110% na szczycie. I widok stamtąd ładniejszy.',
    }),
  },
];

type Props = Readonly<{
  visible: boolean;
  onClose: () => void;
  lang: Lang;
}>;

export default function LeagueRulesSheet({ visible, onClose, lang }: Props) {
  const { theme: t, f } = useTheme();
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const { height: viewportHeight } = useWindowDimensions();

  const backdropO = useSharedValue(0);
  const sheetY = useSharedValue(SHEET_HIDDEN);
  const sheetOpacity = useSharedValue(0);
  const dragTranslateY = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    dragTranslateY.value = 0;
    backdropO.value = withTiming(1, { duration: 200, easing: REasing.out(REasing.cubic) });
    sheetY.value = SHEET_HIDDEN;
    sheetOpacity.value = withTiming(1, { duration: 220 });
    sheetY.value = withTiming(0, { duration: 380, easing: REasing.bezier(0.32, 0.72, 0, 1) });
  }, [visible, backdropO, sheetY, sheetOpacity, dragTranslateY]);

  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const dismissSheet = useCallback(() => {
    void hapticTap();
    backdropO.value = withTiming(0, { duration: 200 });
    sheetOpacity.value = withTiming(0, { duration: 180 });
    sheetY.value = withTiming(SHEET_HIDDEN, { duration: 240, easing: REasing.out(REasing.cubic) }, (finished) => {
      if (finished) runOnJS(closeRef.current)();
    });
  }, [backdropO, sheetOpacity, sheetY]);

  const closeAfterSwipe = useCallback(() => {
    closeRef.current();
  }, []);

  const swipeOffDistance = useMemo(() => Math.max(480, viewportHeight * 0.6), [viewportHeight]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(10)
        .failOffsetX([-32, 32])
        .onUpdate((e) => {
          'worklet';
          const ty = e.translationY;
          dragTranslateY.value = ty < 0 ? ty * 0.12 : ty;
        })
        .onEnd((e) => {
          'worklet';
          const shouldClose = dragTranslateY.value > 88 || e.velocityY > 900;
          if (shouldClose) {
            dragTranslateY.value = withTiming(swipeOffDistance, { duration: 260 }, (finished) => {
              if (finished) runOnJS(closeAfterSwipe)();
            });
          } else {
            dragTranslateY.value = withSpring(0, { damping: 22, stiffness: 300 });
          }
        }),
    [closeAfterSwipe, dragTranslateY, swipeOffDistance],
  );

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropO.value * (1 - Math.min(Math.max(dragTranslateY.value, 0) / 600, 0.5)),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: sheetOpacity.value,
    transform: [{ translateY: sheetY.value + dragTranslateY.value }],
  }));

  const closeLabel = triLang(lang, {
    ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', 'pt-BR': 'Fechar',
    vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij',
  });

  const title = triLang(lang, {
    ru: 'Как устроена лига',
    uk: 'Як влаштована ліга',
    es: 'Cómo funciona la liga',
    'pt-BR': 'Como a liga funciona',
    vi: 'Giải đấu hoạt động thế nào',
    id: 'Cara kerja liga',
    tr: 'Lig nasıl işler',
    pl: 'Jak działa liga',
  });

  const ctaLabel = triLang(lang, {
    ru: 'Понятно', uk: 'Зрозуміло', es: 'Entendido', 'pt-BR': 'Entendi',
    vi: 'Đã hiểu', id: 'Paham', tr: 'Anladım', pl: 'Jasne',
  });

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={dismissSheet}>
      <GestureHandlerRootView style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissSheet} accessibilityLabel={closeLabel}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </Pressable>

        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: t.bgCard,
                shadowColor: t.accent,
                maxHeight: viewportHeight * 0.86,
                paddingBottom: 16 + bottomInset,
              },
              sheetStyle,
            ]}
          >
            <TonalSurface pointerEvents="none" radius={24} tone="raised" style={StyleSheet.absoluteFillObject} />

            <View style={[styles.grab, { backgroundColor: t.border }]} />

            <Text style={[styles.title, { color: t.textPrimary, fontSize: f.numMd }]}>
              {title}
            </Text>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* guard-ok: ровно 5 статичных секций, список не растёт — FlatList здесь дороже самой отрисовки */}
              {SECTIONS.map((section) => (
                <View key={section.id} style={styles.row}>
                  <View style={[styles.medal, { backgroundColor: t.bgPrimary }]}>
                    <Ionicons name={section.icon} size={20} color={t.gold} />
                  </View>
                  <View style={styles.rowBody}>
                    {/* зачем: f.body и f.sub в шкале равны (14), поэтому иерархию
                        внутри секции держат вес и тон, а не кегль: заголовок —
                        bodyLg/900 основным цветом, текст — body/500 вторичным. */}
                    <Text style={[styles.rowTitle, { color: t.textPrimary, fontSize: f.bodyLg }]}>
                      {section.title(lang)}
                    </Text>
                    <Text
                      style={[
                        styles.rowText,
                        // guard-ok: тело раздела объяснялки, а не подпись-расшифровка под названием пункта
                        { color: t.textSecond, fontSize: f.body, lineHeight: f.body * 1.55 },
                      ]}
                    >
                      {section.body(lang)}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ctaLabel}
              onPress={dismissSheet}
              style={({ pressed }) => [
                styles.cta,
                {
                  backgroundColor: t.accent,
                  // Тактильный отклик нажатия — правило дома (кнопка обязана «слышать» палец).
                  transform: [{ scale: pressed ? 0.975 : 1 }],
                },
              ]}
            >
              {/* зачем: t.correctText — домовой токен текста НА акценте (см. AiConsentSheetModal);
                  хардкод белого проваливал бы контраст в светлых темах. */}
              <Text style={[styles.ctaText, { color: t.correctText, fontSize: f.body }]}>
                {ctaLabel}
              </Text>
            </Pressable>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(6,8,18,0.68)' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    shadowOpacity: 0.18,
    shadowRadius: 18, // мягкая тень листа; ниже — уже не читается край шторки на тёмной подложке
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
  grab: { width: 34, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  title: { fontWeight: '900', textAlign: 'center', marginBottom: 16 },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: 6 },
  row: { flexDirection: 'row', gap: 13, marginBottom: 18 },
  medal: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitle: { fontWeight: '800', marginBottom: 4 },
  rowText: { fontWeight: '500' },
  cta: {
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  ctaText: { fontWeight: '900' },
});
