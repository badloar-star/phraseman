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
      ru: 'В понедельник тебя подселяют к десяткам таких же упрямых. Всю неделю вы соревнуетесь очками: очко — это заработанная руна. Просто зашёл посмотреть — очков не прибавилось, увы.',
      uk: 'У понеділок тебе підселяють до десятків таких самих упертих. Цілий тиждень ви змагаєтесь очками: очко — це зароблена руна. Просто зайшов подивитися — очок не побільшало, на жаль.',
      es: 'El lunes te agrupan con decenas de personas igual de tercas. Toda la semana competís por puntos: un punto es una runa ganada. Entrar solo a mirar no suma nada.',
      'pt-BR': 'Na segunda você entra num grupo com dezenas de pessoas igualmente teimosas. A semana toda vocês competem por pontos: um ponto é uma runa conquistada. Entrar só para olhar não soma nada.',
      vi: 'Thứ Hai, bạn được xếp vào nhóm với hàng chục người cũng lì lợm như vậy. Cả tuần các bạn đua điểm: một điểm là một rune kiếm được. Chỉ vào ngó thôi thì không cộng gì cả.',
      id: 'Setiap Senin kamu ditempatkan bersama puluhan orang yang sama keras kepalanya. Sepekan penuh kalian beradu poin: satu poin adalah satu rune yang kamu peroleh. Sekadar membuka aplikasi tidak menambah apa pun.',
      tr: 'Pazartesi seni, senin kadar inatçı onlarca kişiyle aynı odaya koyarız. Tüm hafta puanlarla yarışırsınız: bir puan, kazanılmış bir rün demek. Sadece bakmak için girmek hiçbir şey eklemez.',
      pl: 'W poniedziałek trafiasz do grupy kilkudziesięciu równie upartych osób. Przez cały tydzień rywalizujecie punktami: punkt to zdobyta runa. Samo zajrzenie nic nie doda.',
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
      ru: 'В ночь на понедельник комната закрывается. Верхние 15% уезжают в лигу выше, нижние 15% — этажом ниже. И отдельное правило для наблюдателей: неделя с нулём очков — это спуск, даже если все вокруг тоже ленились не сильно.',
      uk: 'У ніч на понеділок кімната зачиняється. Верхні 15% їдуть у лігу вище, нижні 15% — поверхом нижче. І окреме правило для спостерігачів: тиждень із нулем очок — це спуск, навіть якщо всі навколо теж не надто старалися.',
      es: 'La noche del domingo al lunes la sala se cierra. El 15% de arriba sube de liga y el 15% de abajo baja un piso. Y una regla aparte para los espectadores: una semana con cero puntos significa bajar, aunque los demás tampoco se hayan esforzado mucho.',
      'pt-BR': 'Na virada para segunda a sala fecha. Os 15% de cima sobem de liga e os 15% de baixo descem um andar. E uma regra à parte para os espectadores: uma semana com zero pontos significa descer, mesmo que os outros também tenham feito pouco.',
      vi: 'Rạng sáng thứ Hai, phòng đấu đóng lại. Top 15% lên hạng, 15% cuối xuống một bậc. Và một luật riêng cho người chỉ đứng xem: một tuần với 0 điểm là xuống hạng, kể cả khi những người khác cũng chẳng chăm chỉ hơn.',
      id: 'Menjelang Senin ruang ditutup. 15% teratas naik liga, 15% terbawah turun satu tingkat. Ada aturan khusus untuk penonton: sepekan dengan nol poin berarti turun, meski yang lain juga tidak terlalu rajin.',
      tr: 'Pazartesiye geçerken oda kapanır. Üstteki %15 bir üst lige çıkar, alttaki %15 bir kat aşağı iner. İzleyiciler için ayrı bir kural var: sıfır puanlı bir hafta düşüş demektir, etraftakiler de pek çabalamamış olsa bile.',
      pl: 'W nocy z niedzieli na poniedziałek pokój się zamyka. Górne 15% awansuje, dolne 15% spada piętro niżej. I osobna zasada dla obserwatorów: tydzień z zerem punktów oznacza spadek, nawet jeśli inni też się nie przemęczali.',
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
      ru: 'У комнаты есть общая цель недели. Очки всех участников идут в один котёл, и когда он заполнится — сундук открывается для всей комнаты. Редкий случай, когда соперники внезапно оказываются коллегами.',
      uk: 'У кімнати є спільна ціль тижня. Очки всіх учасників ідуть в один казан, і коли він наповниться — скриня відкривається для всієї кімнати. Рідкісний випадок, коли суперники раптом виявляються колегами.',
      es: 'La sala tiene una meta común para la semana. Los puntos de todos van a un mismo bote y, cuando se llena, el cofre se abre para toda la sala. Uno de esos raros momentos en que los rivales resultan ser colegas.',
      'pt-BR': 'A sala tem uma meta comum da semana. Os pontos de todos vão para o mesmo caldeirão e, quando ele enche, o baú abre para a sala inteira. Um daqueles raros momentos em que os rivais viram colegas.',
      vi: 'Cả phòng có một mục tiêu chung cho tuần. Điểm của mọi người dồn vào một nồi, và khi đầy thì rương mở ra cho cả phòng. Một dịp hiếm hoi khi đối thủ bỗng thành đồng đội.',
      id: 'Ruangan punya target bersama tiap pekan. Poin semua orang masuk ke satu wadah, dan begitu penuh, peti terbuka untuk seluruh ruangan. Momen langka ketika lawan tiba-tiba menjadi rekan.',
      tr: 'Odanın haftalık ortak bir hedefi var. Herkesin puanı aynı kazana gider ve kazan dolduğunda sandık tüm odaya açılır. Rakiplerin birden meslektaşa dönüştüğü o nadir anlardan biri.',
      pl: 'Pokój ma wspólny cel tygodnia. Punkty wszystkich trafiają do jednego kotła, a gdy się zapełni, skrzynia otwiera się dla całego pokoju. Rzadki moment, gdy rywale okazują się współpracownikami.',
    }),
  },
  {
    id: 'boosts',
    icon: 'flame-outline',
    title: (lang) => triLang(lang, {
      ru: 'Горячие часы и усиления',
      uk: 'Гарячі години та підсилення',
      es: 'Horas calientes y refuerzos',
      'pt-BR': 'Horas quentes e reforços',
      vi: 'Giờ nóng và tăng cường',
      id: 'Jam panas dan penguat',
      tr: 'Kızgın saatler ve güçlendirmeler',
      pl: 'Gorące godziny i wzmocnienia',
    }),
    body: (lang) => triLang(lang, {
      ru: 'Последние два часа недели — горячие: тем, кто висит в зоне вылета, очки идут вдвойне. Плюс личные усиления клуба множат твои очки на ×2 или ×3. Камбэк в воскресенье вечером — законный жанр.',
      uk: 'Останні дві години тижня — гарячі: тим, хто висить у зоні вильоту, очки йдуть удвічі. Плюс особисті підсилення клубу множать твої очки на ×2 або ×3. Камбек у неділю ввечері — цілком законний жанр.',
      es: 'Las últimas dos horas de la semana son calientes: quien está en zona de descenso suma puntos dobles. Además, los refuerzos personales del club multiplican tus puntos por ×2 o ×3. La remontada del domingo por la noche es un género legítimo.',
      'pt-BR': 'As duas últimas horas da semana são quentes: quem está na zona de rebaixamento soma pontos em dobro. Além disso, os reforços pessoais do clube multiplicam seus pontos por ×2 ou ×3. A virada no domingo à noite é um gênero legítimo.',
      vi: 'Hai giờ cuối tuần là giờ nóng: ai đang ở nhóm xuống hạng sẽ được nhân đôi điểm. Ngoài ra, các gói tăng cường cá nhân của câu lạc bộ nhân điểm của bạn lên ×2 hoặc ×3. Lội ngược dòng tối Chủ nhật là chuyện hoàn toàn hợp lệ.',
      id: 'Dua jam terakhir pekan itu panas: yang berada di zona degradasi mendapat poin ganda. Ditambah penguat pribadi klub yang mengalikan poinmu ×2 atau ×3. Comeback pada Minggu malam adalah genre yang sah.',
      tr: 'Haftanın son iki saati kızgındır: küme düşme hattındakiler puanları iki katı alır. Ayrıca kulübün kişisel güçlendirmeleri puanlarını ×2 ya da ×3 yapar. Pazar akşamı geri dönüş, gayet meşru bir tür.',
      pl: 'Ostatnie dwie godziny tygodnia są gorące: kto wisi w strefie spadkowej, zdobywa podwójne punkty. Do tego osobiste wzmocnienia klubu mnożą twoje punkty ×2 lub ×3. Powrót w niedzielny wieczór to w pełni legalny gatunek.',
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
      ru: 'Каждая лига добавляет постоянный бонус к опыту — от +10% в бронзе до +110% в высшей. Уровень растёт быстрее просто потому, что ты забрался повыше. Ну и вид оттуда приятнее.',
      uk: 'Кожна ліга додає постійний бонус до досвіду — від +10% у бронзі до +110% у вищій. Рівень росте швидше просто тому, що ти забрався вище. Та й краєвид звідти приємніший.',
      es: 'Cada liga añade una bonificación permanente de experiencia: desde +10% en bronce hasta +110% en la suprema. Tu nivel sube más rápido solo por haber escalado. Y las vistas desde arriba son mejores.',
      'pt-BR': 'Cada liga adiciona um bônus permanente de experiência: de +10% no bronze até +110% na suprema. Seu nível sobe mais rápido só por você ter escalado. E a vista lá de cima é melhor.',
      vi: 'Mỗi hạng đấu cộng thêm phần thưởng kinh nghiệm cố định: từ +10% ở Đồng đến +110% ở hạng cao nhất. Cấp độ tăng nhanh hơn chỉ vì bạn đã leo cao hơn. Với lại, cảnh từ trên đó cũng đẹp hơn.',
      id: 'Setiap liga menambah bonus pengalaman permanen: dari +10% di perunggu sampai +110% di liga tertinggi. Levelmu naik lebih cepat hanya karena kamu memanjat lebih tinggi. Lagi pula, pemandangan dari atas lebih bagus.',
      tr: 'Her lig kalıcı bir deneyim bonusu ekler: bronzda +%10’dan en üst ligde +%110’a kadar. Seviyen sırf yukarı tırmandığın için daha hızlı yükselir. Üstelik yukarıdan manzara da güzel.',
      pl: 'Każda liga daje stały bonus do doświadczenia: od +10% w brązie do +110% w najwyższej. Poziom rośnie szybciej tylko dlatego, że wspiąłeś się wyżej. No i widok z góry jest ładniejszy.',
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
