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
 * Валюта лиги зовётся «рунами» — так решил владелец 2026-08-24, и так же
 * теперь подписана строка таблицы (LeagueLeaderboardRow показывает ассет руны
 * вместо букв «XP»). Прежняя редакция этой шапки ссылалась на константу
 * RUNES_LEAGUE_START_WEEK_ID и «неделю перехода» — в коде такой константы нет
 * и не было, переход не поэтапный. Слова «очки» в текстах лиги быть не должно.
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
 * потом призы, потом тонкости.
 *
 * зачем (владелец, 2026-08-24): «"очко" — фу, нельзя» и «сделай премиально,
 * как у Apple тексты». Первая правка ушла в панибратство («зашёл посмотреть —
 * ноль», «камбэк — законный жанр») — это не тот тон. Новый регистр: спокойная
 * уверенность, одна фраза на раздел, без подмигиваний и восклицаний. Тёплая
 * нота допускается ровно одна на всю шторку — последняя строка про вид с
 * вершины; всё остальное — чистые утверждения.
 *
 * Валюта названа «рунами» (решение владельца): именно они копятся в лиге, и
 * строка таблицы теперь показывает ассет руны вместо букв «XP». Слово «очки»
 * из UI лиги вычищено целиком — оно и грубовато, и называло несуществующую
 * сущность.
 *
 * Цифры сверены с кодом, не выдуманы: зона 15% — LEAGUE_RESULT_ZONE_RATIO,
 * два часа и ×2 — LEAGUE_HOT_HOURS_WINDOW_MS и LEAGUE_HOT_HOURS_MULTIPLIER,
 * «неделя без рун = спуск» — ветки iScored/inZeroZone в league_engine.
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
      ru: 'Каждый понедельник вы с десятками других начинаете неделю с нуля. Счёт ведут руны.',
      uk: 'Щопонеділка ви з десятками інших починаєте тиждень з нуля. Рахунок ведуть руни.',
      es: 'Cada lunes empiezas la semana desde cero junto a decenas de personas. Las runas llevan la cuenta.',
      'pt-BR': 'Toda segunda você recomeça a semana do zero com dezenas de pessoas. As runas fazem a contagem.',
      vi: 'Mỗi thứ Hai, bạn cùng hàng chục người khác bắt đầu lại từ đầu. Rune giữ điểm số.',
      id: 'Setiap Senin kamu dan puluhan orang lain memulai pekan dari nol. Rune yang menghitung.',
      tr: 'Her pazartesi onlarca kişiyle birlikte haftaya sıfırdan başlarsınız. Skoru rünler tutar.',
      pl: 'W każdy poniedziałek razem z dziesiątkami innych zaczynasz tydzień od zera. Liczą runy.',
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
      ru: 'Верхние 15% поднимаются в следующую лигу, нижние 15% опускаются. Неделя без единой руны — тоже спуск.',
      uk: 'Верхні 15% піднімаються в наступну лігу, нижні 15% опускаються. Тиждень без жодної руни — теж спуск.',
      es: 'El 15% superior asciende de liga y el 15% inferior desciende. Una semana sin una sola runa también baja.',
      'pt-BR': 'Os 15% do topo sobem de liga e os 15% de baixo descem. Uma semana sem nenhuma runa também desce.',
      vi: 'Top 15% lên hạng, 15% cuối xuống hạng. Một tuần không có rune nào cũng là xuống hạng.',
      id: 'Peringkat 15% teratas naik liga, 15% terbawah turun. Sepekan tanpa satu rune pun juga berarti turun.',
      tr: 'İlk %15 bir üst lige çıkar, son %15 iner. Tek bir rün kazanılmayan hafta da düşüş demektir.',
      pl: 'Górne 15% awansuje do wyższej ligi, dolne 15% spada. Tydzień bez ani jednej runy również oznacza spadek.',
    }),
  },
  {
    id: 'chest',
    icon: 'cube-outline',
    title: (lang) => triLang(lang, {
      ru: 'Общая цель',
      uk: 'Спільна мета',
      es: 'Una meta común',
      'pt-BR': 'Uma meta comum',
      vi: 'Mục tiêu chung',
      id: 'Target bersama',
      tr: 'Ortak hedef',
      pl: 'Wspólny cel',
    }),
    body: (lang) => triLang(lang, {
      ru: 'Руны всей комнаты идут в общий счёт. Когда цель недели взята, сундук открывается каждому.',
      uk: 'Руни всієї кімнати йдуть у спільний рахунок. Щойно мету тижня взято, скриня відкривається кожному.',
      es: 'Las runas de toda la sala suman a un marcador común. Alcanzada la meta semanal, el cofre se abre para todos.',
      'pt-BR': 'As runas de toda a sala somam num placar comum. Alcançada a meta da semana, o baú abre para todos.',
      vi: 'Rune của cả phòng dồn vào một chỉ số chung. Đạt mục tiêu tuần, rương mở cho tất cả mọi người.',
      id: 'Rune seluruh ruangan masuk ke satu hitungan bersama. Begitu target pekan tercapai, peti terbuka untuk semua.',
      tr: 'Tüm odanın rünleri ortak bir sayaca işler. Haftanın hedefi tutunca sandık herkese açılır.',
      pl: 'Runy całego pokoju sumują się we wspólnym liczniku. Gdy cel tygodnia zostaje osiągnięty, skrzynia otwiera się dla każdego.',
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
      ru: 'В последние два часа недели руны в зоне вылета удваиваются. Неделя решается в воскресенье вечером.',
      uk: 'В останні дві години тижня руни в зоні вильоту подвоюються. Тиждень вирішується в неділю ввечері.',
      es: 'En las dos últimas horas de la semana, las runas en zona de descenso se duplican. La semana se decide el domingo por la noche.',
      'pt-BR': 'Nas duas últimas horas da semana, as runas na zona de rebaixamento dobram. A semana se decide no domingo à noite.',
      vi: 'Trong hai giờ cuối tuần, rune ở nhóm xuống hạng được nhân đôi. Cả tuần được định đoạt vào tối Chủ nhật.',
      id: 'Pada dua jam terakhir pekan, rune di zona degradasi digandakan. Pekan ini ditentukan pada Minggu malam.',
      tr: 'Haftanın son iki saatinde küme hattındaki rünler ikiye katlanır. Hafta pazar akşamı belli olur.',
      pl: 'W ostatnich dwóch godzinach tygodnia runy w strefie spadkowej się podwajają. Tydzień rozstrzyga się w niedzielny wieczór.',
    }),
  },
  {
    id: 'bonus',
    icon: 'ribbon-outline',
    title: (lang) => triLang(lang, {
      ru: 'Что даёт высота',
      uk: 'Що дає висота',
      es: 'Lo que da la altura',
      'pt-BR': 'O que a altura dá',
      vi: 'Lên cao được gì',
      id: 'Apa yang diberi ketinggian',
      tr: 'Yükseklik ne kazandırır',
      pl: 'Co daje wysokość',
    }),
    body: (lang) => triLang(lang, {
      ru: 'Каждая лига навсегда прибавляет опыт: от 10% в бронзе до 110% на вершине. И вид оттуда лучше.',
      uk: 'Кожна ліга назавжди додає досвід: від 10% у бронзі до 110% на вершині. Та й краєвид звідти кращий.',
      es: 'Cada liga añade experiencia para siempre: del 10% en bronce al 110% en la cima. Y las vistas son mejores.',
      'pt-BR': 'Cada liga acrescenta experiência para sempre: de 10% no bronze a 110% no topo. E a vista lá de cima é melhor.',
      vi: 'Mỗi hạng cộng thêm kinh nghiệm vĩnh viễn: từ 10% ở Đồng đến 110% trên đỉnh. Và cảnh từ trên đó cũng đẹp hơn.',
      id: 'Setiap liga menambah pengalaman selamanya: dari 10% di perunggu hingga 110% di puncak. Pemandangan dari atas pun lebih baik.',
      tr: 'Her lig kalıcı olarak deneyim ekler: bronzda %10, zirvede %110. Üstelik yukarıdan manzara da güzeldir.',
      pl: 'Każda liga na stałe dodaje doświadczenie: od 10% w brązie do 110% na szczycie. A widok stamtąd jest lepszy.',
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
