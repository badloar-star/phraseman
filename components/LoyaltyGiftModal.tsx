import { Ionicons } from '@expo/vector-icons';
import React, { memo, useEffect } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from './SafeLinearGradient';
import { useLang } from './LangContext';
import { useTheme } from './ThemeContext';
import {
  RewardModalBackdrop,
  RewardModalPanelBackdrop,
  rewardModalAccentColor,
  rewardModalPanelBorder,
  rewardModalPanelColors,
  rewardModalPrimaryButtonColors,
  rewardModalPrimaryButtonText,
  rewardModalSoftSurface,
} from './RewardModalBackdrop';

// 'gift'     — существующий free-юзер: текст обновления + блок подарка + кнопка «Получить 3 дня».
// 'announce' — премиум/VIP-юзер: ТОЛЬКО текст обновления, без подарка и без кнопки получения.
export type LoyaltyGiftModalVariant = 'gift' | 'announce';

type Props = {
  visible: boolean;
  variant?: LoyaltyGiftModalVariant;
  onPrimaryPress: () => void;
  onSecondaryPress?: () => void;
  // Тап по блоку «год доступа за идею» — ведёт в Настройки → Идеи (закрывает модал).
  onIdeasPress?: () => void;
};

type HighlightCopy = { icon: keyof typeof Ionicons.glyphMap; title: string; body: string };

type ModalCopy = {
  eyebrow: string;
  title: string;
  intro: string;
  highlightsTitle: string;
  highlights: HighlightCopy[];
  giftEyebrow: string;
  giftTitle: string;
  giftBody: string;
  giftChips: string[];
  primaryCta: string;
  secondaryCta: string;
  footer: string;
  // Тексты для премиум/VIP (без подарка) — благодарим и закрываем.
  announcePrimaryCta: string;
  announceFooter: string;
  // Личная заметка от автора (одиночный разработчик за «мы»).
  personalNoteTitle: string;
  personalNoteBody: string;
  // Блок «год полного доступа за идею» (раздел Идеи в настройках).
  ideasTitle: string;
  ideasBody: string;
};

// Текст обновления + подарок за лояльность. Намеренно «мощный»: сначала вау-фичи,
// затем эмоциональный подарок «спасибо за то, что ты с нами с самого начала».
const COPY: Record<'ru' | 'uk' | 'es', ModalCopy> = {
  ru: {
    eyebrow: 'Новая версия',
    title: 'Phraseman, которого ты ещё не видел',
    intro: 'Половина приложения переписана заново. Стало понятнее, живее и приятнее учиться. Вот что ты почувствуешь сразу:',
    highlightsTitle: 'Что изменилось',
    highlights: [
      { icon: 'compass', title: 'Подскажет, что учить сегодня', body: 'Больше не надо думать, с чего начать. Приложение само смотрит, что у тебя получается, а что ещё хромает — и каждый день предлагает именно то, что нужно тебе.' },
      { icon: 'sparkles', title: 'Очень много новых занятий', body: 'Добавлены тысячи новых фраз на каждый день: работа, дом, здоровье, путешествия, чувства. Хватит надолго — и всё про реальную жизнь, а не из учебника.' },
      { icon: 'chatbubbles', title: 'Живое общение, как в чате', body: 'Теперь можно переписываться с собеседником прямо в приложении — как в обычном мессенджере. Он отвечает по-разному, с характером. Отличный способ заговорить без страха.' },
      { icon: 'volume-high', title: 'Приятный живой голос', body: 'Фразы озвучивает приятный голос, а не робот. Не успел расслышать? Замедли — и повтори в удобном темпе.' },
      { icon: 'trophy', title: 'Соревнуйся с другими', body: 'Хочешь азарта — сыграй против реального соперника. Подбор за секунды, таблица лучших и красивые награды за победы.' },
      { icon: 'bulb', title: 'Понятно объясняет промахи', body: 'Ответил неправильно — приложение спокойно покажет, почему. А если что-то всё ещё непонятно, одна кнопка объяснит совсем простыми словами.' },
      { icon: 'diamond', title: 'Коллекция красивых карточек', body: 'За занятия выпадают красивые карточки с картинками — как маленькие награды. Приятно собирать и приятно открывать новые.' },
    ],
    personalNoteTitle: 'Честно, по-настоящему',
    personalNoteBody: 'Я говорю «мы» — хотя за всем этим стоит один человек. Просто в одиночку такой объём звучит неправдоподобно. Но это так: ночи без сна и личное время — чтобы это обновление дошло до тебя. Спасибо, что ты здесь.',
    ideasTitle: 'Год полного доступа — за идею',
    ideasBody: 'У тебя есть мысль, как сделать Phraseman лучше? Поделись — и за яркую, живую идею открою тебе целый год полного доступа. Настройки → «Идеи». Серьёзно, это того стоит.',
    giftEyebrow: 'Спасибо, что ты с самого начала',
    giftTitle: 'Держи 3 дня — всё открыто',
    giftBody: 'Ты был с Phraseman ещё до этого обновления, и это дорогого стоит. В благодарность дарю тебе 3 дня, когда открыто всё — без единого замка и без ограничений. Просто подарок: ничего не спишется, подписка не включится. Зайди и почувствуй обновление во всю силу.',
    giftChips: ['Все занятия', 'Без замков', 'Без ограничений', 'Все темы', 'Подсказки', 'Тёмные стили'],
    primaryCta: 'Забрать 3 дня',
    secondaryCta: 'Может позже',
    footer: 'Это подарок. Ничего не спишется, подписка не включится.',
    announcePrimaryCta: 'Посмотреть, что нового',
    announceFooter: 'Спасибо, что остаёшься рядом. Всё новое уже открыто в твоём Premium.',
  },
  uk: {
    eyebrow: 'Нова версія',
    title: 'Phraseman, якого ти ще не бачив',
    intro: 'Половину застосунку переписано наново. Стало зрозуміліше, живіше й приємніше вчитися. Ось що ти відчуєш одразу:',
    highlightsTitle: 'Що змінилося',
    highlights: [
      { icon: 'compass', title: 'Підкаже, що вчити сьогодні', body: 'Більше не треба думати, з чого почати. Застосунок сам бачить, що в тебе виходить, а що ще кульгає — і щодня пропонує саме те, що потрібно тобі.' },
      { icon: 'sparkles', title: 'Дуже багато нових занять', body: 'Додано тисячі нових фраз на щодень: робота, дім, здоров’я, подорожі, почуття. Вистачить надовго — і все про реальне життя, а не з підручника.' },
      { icon: 'chatbubbles', title: 'Живе спілкування, як у чаті', body: 'Тепер можна листуватися зі співрозмовником прямо в застосунку — як у звичайному месенджері. Він відповідає по-різному, з характером. Чудовий спосіб заговорити без страху.' },
      { icon: 'volume-high', title: 'Приємний живий голос', body: 'Фрази озвучує приємний голос, а не робот. Не встиг розчути? Сповільни — і повтори у зручному темпі.' },
      { icon: 'trophy', title: 'Змагайся з іншими', body: 'Хочеш азарту — зіграй проти реального суперника. Підбір за секунди, таблиця найкращих і гарні нагороди за перемоги.' },
      { icon: 'bulb', title: 'Зрозуміло пояснює промахи', body: 'Відповів неправильно — застосунок спокійно покаже, чому. А якщо щось усе ще незрозуміло, одна кнопка пояснить зовсім простими словами.' },
      { icon: 'diamond', title: 'Колекція гарних карток', body: 'За заняття випадають гарні картки з малюнками — наче маленькі нагороди. Приємно збирати й приємно відкривати нові.' },
    ],
    personalNoteTitle: 'Чесно, по-справжньому',
    personalNoteBody: 'Я кажу «ми» — хоча за всім цим стоїть одна людина. Просто наодинці такий обсяг звучить неправдоподібно. Та це так: ночі без сну й особистий час — щоб це оновлення дійшло до тебе. Дякую, що ти тут.',
    ideasTitle: 'Рік повного доступу — за ідею',
    ideasBody: 'Маєш думку, як зробити Phraseman кращим? Поділись — і за яскраву, живу ідею відкрию тобі цілий рік повного доступу. Налаштування → «Ідеї». Серйозно, воно того варте.',
    giftEyebrow: 'Дякую, що ти від самого початку',
    giftTitle: 'Тримай 3 дні — все відкрито',
    giftBody: 'Ти був з Phraseman ще до цього оновлення, і це дорогого варте. На знак подяки дарую тобі 3 дні, коли відкрито все — без жодного замка й без обмежень. Просто подарунок: нічого не спишеться, підписка не ввімкнеться. Зайди й відчуй оновлення на повну силу.',
    giftChips: ['Усі заняття', 'Без замків', 'Без обмежень', 'Усі теми', 'Підказки', 'Темні стилі'],
    primaryCta: 'Забрати 3 дні',
    secondaryCta: 'Можливо пізніше',
    footer: 'Це подарунок. Нічого не спишеться, підписка не ввімкнеться.',
    announcePrimaryCta: 'Подивитися, що нового',
    announceFooter: 'Дякую, що залишаєшся поруч. Усе нове вже відкрите у твоєму Premium.',
  },
  es: {
    eyebrow: 'Nueva versión',
    title: 'El Phraseman que aún no conocías',
    intro: 'Media app reescrita desde cero. Ahora es más clara, más viva y más agradable para aprender. Esto es lo que notarás enseguida:',
    highlightsTitle: 'Qué cambió',
    highlights: [
      { icon: 'compass', title: 'Te dice qué estudiar hoy', body: 'Ya no tienes que pensar por dónde empezar. La app ve qué se te da bien y qué aún cojea — y cada día te propone justo lo que necesitas.' },
      { icon: 'sparkles', title: 'Muchísimas prácticas nuevas', body: 'Miles de frases nuevas para el día a día: trabajo, casa, salud, viajes, sentimientos. Da para rato — y todo de la vida real, no de un libro de texto.' },
      { icon: 'chatbubbles', title: 'Conversación viva, como un chat', body: 'Ahora puedes chatear con un interlocutor dentro de la app — como en tu mensajería de siempre. Responde distinto, con carácter. Ideal para soltarte a hablar sin miedo.' },
      { icon: 'volume-high', title: 'Una voz humana y agradable', body: 'Las frases las dice una voz agradable, no un robot. ¿No la pillaste? Bájala — y repite a tu ritmo.' },
      { icon: 'trophy', title: 'Compite con otros', body: '¿Quieres emoción? Juega contra un rival real. Te emparejan en segundos, con tabla de mejores y bonitos premios al ganar.' },
      { icon: 'bulb', title: 'Explica los fallos con claridad', body: 'Si respondes mal, la app te muestra con calma por qué. Y si aún no lo ves, un botón te lo explica con palabras muy simples.' },
      { icon: 'diamond', title: 'Colección de cartas bonitas', body: 'Al practicar caen cartas bonitas con dibujos — como pequeños premios. Da gusto coleccionarlas y abrir nuevas.' },
    ],
    personalNoteTitle: 'Con honestidad',
    personalNoteBody: 'Digo «nosotros», aunque detrás de todo esto hay una sola persona. En solitario este volumen suena increíble. Pero es así: noches sin dormir y tiempo propio para que esta actualización llegue a ti. Gracias por estar aquí.',
    ideasTitle: 'Un año de acceso completo — por una idea',
    ideasBody: '¿Tienes una idea para mejorar Phraseman? Cuéntamela — y por una idea original y viva te abro un año entero de acceso completo. Ajustes → «Ideas». En serio, vale la pena.',
    giftEyebrow: 'Gracias por estar desde el inicio',
    giftTitle: 'Toma 3 días — todo abierto',
    giftBody: 'Estuviste con Phraseman antes de esta actualización, y eso vale mucho. En agradecimiento te regalo 3 días con todo abierto — sin ni un candado y sin límites. Solo un regalo: no se cobra nada, la suscripción no se activa. Entra y siente la app renovada al máximo.',
    giftChips: ['Todo abierto', 'Sin candados', 'Sin límites', 'Todos los temas', 'Pistas', 'Estilos oscuros'],
    primaryCta: 'Quiero mis 3 días',
    secondaryCta: 'Quizá luego',
    footer: 'Es un regalo. No se cobra nada, la suscripción no se activa.',
    announcePrimaryCta: 'Ver las novedades',
    announceFooter: 'Gracias por seguir aquí. Todo lo nuevo ya está abierto en tu Premium.',
  },
};

function LoyaltyGiftModal({ visible, variant = 'gift', onPrimaryPress, onSecondaryPress, onIdeasPress }: Props) {
  const { lang } = useLang();
  const { theme, themeMode } = useTheme();
  const copy = lang === 'uk' ? COPY.uk : lang === 'es' ? COPY.es : COPY.ru;
  // Премиум/VIP видят ТОЛЬКО текст обновления: без блока подарка и без кнопки получения.
  const isGift = variant === 'gift';

  // Воронка: показ модала — разные события для подарка и для анонса (премиум/VIP).
  useEffect(() => {
    if (!visible) return;
    void import('../app/analytics').then(({ trackEvent }) =>
      trackEvent(isGift ? 'loyalty_gift_offer_shown' : 'loyalty_update_announce_shown', {}),
    );
  }, [visible, isGift]);

  const accent = rewardModalAccentColor(themeMode, theme);
  const border = rewardModalPanelBorder(themeMode, theme);
  const softSurface = rewardModalSoftSurface(themeMode, theme);
  const textPrimary = '#FFFFFF';
  const textSecondary = 'rgba(255,255,255,0.78)';
  const textTertiary = 'rgba(255,255,255,0.62)';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onSecondaryPress ?? onPrimaryPress}
    >
      <View style={styles.overlay}>
        <RewardModalBackdrop themeMode={themeMode} intensity="strong" />
        <SafeAreaView style={styles.safe}>
          <View style={[styles.panel, { borderColor: border }]}>
            <RewardModalPanelBackdrop themeMode={themeMode} intensity="strong" opacity={0.72} />
            <LinearGradient
              pointerEvents="none"
              colors={rewardModalPanelColors(themeMode, theme)}
              style={StyleSheet.absoluteFill}
            />
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={[styles.iconWrap, { backgroundColor: softSurface, borderColor: border }]}>
                <Ionicons name="rocket" size={28} color={accent} />
              </View>
              <Text style={[styles.eyebrow, { color: accent }]}>{copy.eyebrow}</Text>
              <Text style={[styles.title, { color: textPrimary }]}>{copy.title}</Text>
              <Text style={[styles.body, { color: textSecondary }]}>{copy.intro}</Text>

              <Text style={[styles.sectionLabel, { color: accent }]}>{copy.highlightsTitle}</Text>
              <View style={styles.highlights}>
                {copy.highlights.map((h) => (
                  <View key={h.title} style={[styles.highlightRow, { borderColor: border }]}>
                    <View style={[styles.highlightIcon, { backgroundColor: softSurface, borderColor: border }]}>
                      <Ionicons name={h.icon} size={18} color={accent} />
                    </View>
                    <View style={styles.highlightTextWrap}>
                      <Text style={[styles.highlightTitle, { color: textPrimary }]}>{h.title}</Text>
                      <Text style={[styles.highlightBody, { color: textTertiary }]}>{h.body}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={[styles.noteCard, { borderColor: border, backgroundColor: softSurface }]}>
                <View style={styles.noteHeader}>
                  <Ionicons name="heart" size={16} color={accent} />
                  <Text style={[styles.noteTitle, { color: textPrimary }]}>{copy.personalNoteTitle}</Text>
                </View>
                <Text style={[styles.noteBody, { color: textSecondary }]}>{copy.personalNoteBody}</Text>
              </View>

              <Pressable
                testID="loyalty-ideas-block"
                accessibilityRole="button"
                onPress={() => {
                  void import('../app/analytics').then(({ trackEvent }) => trackEvent('loyalty_ideas_block_tapped', {}));
                  onIdeasPress?.();
                }}
                style={[styles.ideasCard, { borderColor: accent, backgroundColor: softSurface }]}
              >
                <View style={styles.ideasHeader}>
                  <Ionicons name="bulb" size={17} color={accent} />
                  <Text style={[styles.ideasTitle, { color: textPrimary }]}>{copy.ideasTitle}</Text>
                </View>
                <Text style={[styles.ideasBody, { color: textSecondary }]}>{copy.ideasBody}</Text>
                <View style={styles.ideasArrowRow}>
                  <Ionicons name="arrow-forward" size={15} color={accent} />
                </View>
              </Pressable>

              {isGift ? (
                <View style={[styles.giftCard, { borderColor: accent, backgroundColor: softSurface }]}>
                  <Text style={[styles.giftEyebrow, { color: accent }]}>{copy.giftEyebrow}</Text>
                  <Text style={[styles.giftTitle, { color: textPrimary }]}>{copy.giftTitle}</Text>
                  <Text style={[styles.giftBody, { color: textSecondary }]}>{copy.giftBody}</Text>
                  <View style={styles.chips}>
                    {copy.giftChips.map((label) => (
                      <View key={label} style={[styles.chip, { backgroundColor: softSurface, borderColor: border }]}>
                        <Ionicons name="lock-open-outline" size={15} color={accent} />
                        <Text style={[styles.chipText, { color: textPrimary }]}>{label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </ScrollView>

            <View style={[styles.footerBar, { borderTopColor: border }]}>
              <Pressable
                testID={isGift ? 'loyalty-gift-primary' : 'loyalty-announce-primary'}
                accessibilityRole="button"
                onPress={() => {
                  void import('../app/analytics').then(({ trackEvent }) =>
                    trackEvent(isGift ? 'loyalty_gift_offer_cta' : 'loyalty_update_announce_cta', {}),
                  );
                  onPrimaryPress();
                }}
                style={styles.primaryButton}
              >
                <LinearGradient
                  colors={rewardModalPrimaryButtonColors(themeMode)}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryGradient}
                >
                  <Ionicons
                    name={isGift ? 'gift' : 'sparkles'}
                    size={19}
                    color={rewardModalPrimaryButtonText(themeMode)}
                  />
                  <Text style={[styles.primaryText, { color: rewardModalPrimaryButtonText(themeMode) }]}>
                    {isGift ? copy.primaryCta : copy.announcePrimaryCta}
                  </Text>
                </LinearGradient>
              </Pressable>
              {isGift ? (
                <Pressable
                  testID="loyalty-gift-secondary"
                  accessibilityRole="button"
                  onPress={() => {
                    void import('../app/analytics').then(({ trackEvent }) => trackEvent('loyalty_gift_offer_dismiss', {}));
                    onSecondaryPress?.();
                  }}
                  style={styles.secondaryButton}
                >
                  <Text style={[styles.secondaryText, { color: textSecondary }]}>{copy.secondaryCta}</Text>
                </Pressable>
              ) : null}
              <Text style={[styles.footer, { color: textTertiary }]}>
                {isGift ? copy.footer : copy.announceFooter}
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export default memo(LoyaltyGiftModal);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  safe: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  panel: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '92%',
    alignSelf: 'center',
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
  },
  scroll: {
    flexGrow: 0,
  },
  content: {
    padding: 22,
    gap: 12,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: 0,
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
    letterSpacing: 0,
  },
  sectionLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
    marginTop: 6,
  },
  highlights: {
    gap: 10,
  },
  highlightRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  highlightIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightTextWrap: {
    flex: 1,
    gap: 3,
  },
  highlightTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
    letterSpacing: 0,
  },
  highlightBody: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
    letterSpacing: 0,
  },
  noteCard: {
    marginTop: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noteTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
    letterSpacing: 0,
  },
  noteBody: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    letterSpacing: 0,
  },
  ideasCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    gap: 8,
  },
  ideasHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ideasTitle: {
    flex: 1,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
    letterSpacing: 0,
  },
  ideasBody: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    letterSpacing: 0,
  },
  ideasArrowRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  giftCard: {
    marginTop: 12,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 10,
  },
  giftEyebrow: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  giftTitle: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
    letterSpacing: 0,
  },
  giftBody: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: 0,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  chip: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
    letterSpacing: 0,
  },
  footerBar: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 18,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    overflow: 'hidden',
  },
  primaryGradient: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 18,
  },
  primaryText: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
    letterSpacing: 0,
    textAlign: 'center',
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
    letterSpacing: 0,
  },
  footer: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    letterSpacing: 0,
    textAlign: 'center',
  },
});
