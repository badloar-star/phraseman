import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import ContentWrap from '../components/ContentWrap';
import PremiumCard from '../components/PremiumCard';
import ReportErrorButton from '../components/ReportErrorButton';
import AccordionChevronIonicons from '../components/AccordionChevronIonicons';
import { configureAccordionLayout } from '../constants/layoutAnimation';
import { hapticTap } from '../hooks/use-haptics';
import { useAccordionAnswerReveal } from '../hooks/useAccordionFaqStyle';

type FaqItemData = {
  icon: string;
  section: string;
  question: string;
  answer: string;
};

const FAQ_RU: FaqItemData[] = [
  {
    icon: '🔋',
    section: 'Срочные проблемы',
    question: 'Не хватает энергии для урока — что делать?',
    answer: `Твоя энергия — это лимит попыток на ошибки.

Пока отвечаешь верно, энергия не тратится. Каждый промах стоит 1 заряд.

Как восстановиться: 1 заряд возвращается за 30 минут. Если подождать, можно продолжить урок с того же места.

Если нужно без пауз: в Премиуме энергия безлимитная, и можно тренироваться без ожидания.`,
  },
  {
    icon: '🔓',
    section: 'Срочные проблемы',
    question: 'Урок под замком — как открыть следующий?',
    answer: `Замки нужны, чтобы ты не перескакивал через базу.

Следующий урок открывается, когда текущий пройден минимум на Бронзу (оценка 2.5 из 5).

Что делать: открой прошлый урок и подтяни результат до порога. После этого следующий уровень откроется автоматически.`,
  },
  {
    icon: '📈',
    section: 'Срочные проблемы',
    question: 'Прогресс не засчитался — что проверить?',
    answer: `Сначала проверь интернет и перезапусти экран урока.

Иногда синхронизация срабатывает с небольшой задержкой, и XP обновляется не мгновенно.

Если прогресс не появился через несколько минут, нажми «Сообщить о проблеме» и укажи, что делал и во сколько.`,
  },
  {
    icon: '🔥',
    section: 'Прогресс и рейтинг',
    question: 'Как не потерять свою серию занятий?',
    answer: `Серия держится, если каждый день делать хотя бы одну активность с XP.

Даже короткая сессия в уроке уже сохраняет день.

Если день пропущен, зайди сегодня и сделай любую активность — сработает «Ремонт» серии (если доступен). Для Премиума есть «Заморозка».`,
  },
  {
    icon: '🏆',
    section: 'Прогресс и рейтинг',
    question: 'Как подняться в клубе недели и не вылететь вниз?',
    answer: `Рейтинг в клубе недели растёт от твоего недельного XP.

Уроки, квизы и повторение идут в общий зачёт.

Каждую неделю идёт пересчёт: активные поднимаются выше, пассивные могут опуститься. Лучший способ расти — короткие ежедневные сессии без пропусков.`,
  },
  {
    icon: '🧠',
    section: 'Прогресс и рейтинг',
    question: 'Что дает раздел «Повторить сегодня»?',
    answer: `Этот раздел защищает от забывания.

Система собирает фразы, где ты чаще ошибался, и возвращает их в правильный момент.

Если видишь цифру в «Повторить», не откладывай: 5 минут повторения обычно дают больше пользы, чем новый длинный урок.`,
  },
  {
    icon: '🛟',
    section: 'Поддержка',
    question: 'Как правильно сообщить о проблеме?',
    answer: `Нажми «Сообщить о проблеме» на нужном экране и выбери тип.

В комментарии кратко укажи: что нажал, что ожидал и что получил.

Чем точнее шаги, тем быстрее мы воспроизведем баг и исправим его.`,
  },
];

const FAQ_UK: FaqItemData[] = [
  {
    icon: '🔋',
    section: 'Термінові проблеми',
    question: 'Не вистачає енергії для уроку — що робити?',
    answer: `Твоя енергія — це ліміт спроб на помилки.

Поки відповідаєш правильно, енергія не витрачається. Кожен промах коштує 1 заряд.

Як відновитися: 1 заряд повертається за 30 хвилин. Якщо зачекати, можна продовжити урок з того ж місця.

Якщо потрібно без пауз: у Преміумі енергія безлімітна, і можна тренуватися без очікування.`,
  },
  {
    icon: '🔓',
    section: 'Термінові проблеми',
    question: 'Урок під замком — як відкрити наступний?',
    answer: `Замки потрібні, щоб ти не перескакував базу.

Наступний урок відкривається, коли поточний пройдено мінімум на Бронзу (оцінка 2.5 з 5).

Що робити: відкрий попередній урок і підтягни результат до порогу. Після цього наступний рівень відкриється автоматично.`,
  },
  {
    icon: '📈',
    section: 'Термінові проблеми',
    question: 'Прогрес не зарахувався — що перевірити?',
    answer: `Спочатку перевір інтернет і перезапусти екран уроку.

Іноді синхронізація спрацьовує із затримкою, і XP оновлюється не миттєво.

Якщо прогрес не з'явився за кілька хвилин, натисни «Повідомити про проблему» та опиши, що робив і коли.`,
  },
  {
    icon: '🔥',
    section: 'Прогрес і рейтинг',
    question: 'Як не втратити свою серію занять?',
    answer: `Серія тримається, якщо щодня робити хоча б одну активність з XP.

Навіть коротка сесія в уроці вже зберігає день.

Якщо день пропущено, зайди сьогодні й зроби будь-яку активність — спрацює «Ремонт» серії (якщо доступний). Для Преміуму є «Заморозка».`,
  },
  {
    icon: '🏆',
    section: 'Прогрес і рейтинг',
    question: 'Як піднятися в клубі тижня й не вилетіти вниз?',
    answer: `Рейтинг у клубі тижня зростає від твого тижневого XP.

Уроки, квізи та повторення йдуть у спільний залік.

Щотижня йде перерахунок: активні піднімаються вище, пасивні можуть опуститися. Найкраща стратегія — короткі щоденні сесії без пропусків.`,
  },
  {
    icon: '🧠',
    section: 'Прогрес і рейтинг',
    question: 'Що дає розділ «Повторити сьогодні»?',
    answer: `Цей розділ захищає від забування.

Система збирає фрази, де ти частіше помилявся, і повертає їх у правильний момент.

Якщо бачиш цифру в «Повторити», не відкладай: 5 хвилин повторення зазвичай дають більше користі, ніж новий довгий урок.`,
  },
  {
    icon: '🛟',
    section: 'Підтримка',
    question: 'Як правильно повідомити про проблему?',
    answer: `Натисни «Повідомити про проблему» на потрібному екрані та вибери тип.

У коментарі коротко вкажи: що натискав, що очікував і що отримав.

Чим точніші кроки, тим швидше ми відтворимо баг і виправимо його.`,
  },
];

const FAQ_ES: FaqItemData[] = [
  {
    icon: '🔋',
    section: 'Problemas urgentes',
    question: 'No me alcanza la energía para la lección: ¿qué hago?',
    answer: `La energía limita cuántos errores puedes cometer antes de esperar.

Si aciertas, no se gasta; cada fallo consume 1 carga.

Recuperación: recuperas 1 carga cada 30 minutos. Si esperas, puedes seguir la lección donde la dejaste.

Sin esperas: con Premium la energía es ilimitada y practicas al momento.`,
  },
  {
    icon: '🔓',
    section: 'Problemas urgentes',
    question: 'La lección está bloqueada: ¿cómo desbloqueo la siguiente?',
    answer: `Los candados evitan que te saltes pasos sin afianzar lo básico.

La siguiente se desbloquea cuando la actual queda al menos en bronce (nota 2,5 de 5).

Qué hacer: entra en la lección anterior y sube el resultado hasta ese mínimo; después la siguiente se abrirá sola.`,
  },
  {
    icon: '📈',
    section: 'Problemas urgentes',
    question: 'No se guardó el progreso: ¿qué reviso?',
    answer: `Primero comprueba la conexión y vuelve a abrir la pantalla de la lección.

A veces la sincronización tarda y la experiencia (XP) no aparece al instante.

Si tras unos minutos no ves el progreso, usa «Informar de un problema», indica qué hiciste y a qué hora.`,
  },
  {
    icon: '🔥',
    section: 'Progreso y club',
    question: '¿Cómo no pierdo la racha?',
    answer: `La racha se mantiene si cada día haces al menos una actividad que sume XP.

Aunque sea una sesión corta en una lección, cuenta como día activo.

¿Saltaste un día? Entra hoy y haz cualquier actividad: si está disponible, podrás recuperar la racha. Con Premium también tienes la congelación de la racha.`,
  },
  {
    icon: '🏆',
    section: 'Progreso y club',
    question: '¿Cómo subo en el club semanal sin perder posiciones?',
    answer: `En el club semanal cuenta tu XP de esa semana.

Lecciones, cuestionarios y «Repasar hoy» van al mismo total.

Cada domingo se reclasifica: quien practica sube; quien no, puede bajar. Lo más efectivo son sesiones cortas cada día, sin dejar huecos.`,
  },
  {
    icon: '🧠',
    section: 'Progreso y club',
    question: '¿Para qué sirve «Repasar hoy»?',
    answer: `Te ayuda a fijar lo que ya estudiaste.

La app selecciona frases en las que te equivocaste más y las devuelve en el momento oportuno.

Si ves un número en «Repasar hoy», no lo pospongas: 5 minutos de repaso suelen rendir más que empezar una lección nueva muy larga.`,
  },
  {
    icon: '🛟',
    section: 'Soporte',
    question: '¿Cómo informar bien de un problema?',
    answer: `Toca «Informar de un problema» en esa pantalla y elige la categoría.

En el comentario, en pocas líneas: qué pulsaste, qué esperabas y qué pasó.

Cuanto más claro sea el paso a paso, antes podremos reproducir el fallo y corregirlo.`,
  },
];

function FaqItem({
  item,
  t,
  f,
  isOpen,
  onToggle,
}: {
  item: FaqItemData;
  t: any;
  f: any;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { answerOpacity, answerTranslateY } = useAccordionAnswerReveal(isOpen);

  return (
    <PremiumCard level={2} style={{ marginBottom: 10 }} innerStyle={{ padding: 0 }}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onToggle}
        style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}
      >
        <Text style={{ fontSize: f.numMd }}>{item.icon}</Text>
        <Text style={{ flex: 1, fontSize: f.body, fontWeight: '600', color: t.textPrimary, lineHeight: f.body * 1.4 }}>
          {item.question}
        </Text>
        <AccordionChevronIonicons isOpen={isOpen} size={20} color={t.textMuted} openColor={t.accent} />
      </TouchableOpacity>
      {isOpen && (
        <Animated.View
          style={{
            paddingHorizontal: 16,
            paddingBottom: 16,
            borderTopWidth: 0.5,
            borderTopColor: t.border,
            opacity: answerOpacity,
            transform: [{ translateY: answerTranslateY }],
          }}
        >
          <Text style={{ fontSize: f.sub, color: t.textSecond, lineHeight: f.sub * 1.7, marginTop: 14 }}>
            {item.answer}
          </Text>
        </Animated.View>
      )}
    </PremiumCard>
  );
}

export default function HelpFaq() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const isUK = lang === 'uk';
  const isES = lang === 'es';
  const items = isUK ? FAQ_UK : isES ? FAQ_ES : FAQ_RU;
  const sections = Array.from(new Set(items.map(i => i.section)));
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const itemYRef = useRef<Record<string, number>>({});

  const handleToggleItem = (itemId: string) => {
    void hapticTap();
    configureAccordionLayout();
    if (openItemId === itemId) {
      setOpenItemId(null);
      return;
    }
    setOpenItemId(itemId);
    const y = itemYRef.current[itemId];
    if (typeof y === 'number') {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 10), animated: true });
      }, 140);
    }
  };

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          {/* Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: 16, paddingVertical: 14,
            borderBottomWidth: 0.5, borderBottomColor: t.border,
          }}>
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}>
              <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
            </TouchableOpacity>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700' }}>
              {isUK ? 'Допомога' : isES ? 'Ayuda' : 'Помощь'}
            </Text>
          </View>

          <ScrollView
            ref={scrollRef}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={{ fontSize: f.sub, color: t.textMuted, marginBottom: 16, lineHeight: f.sub * 1.5 }}>
              {isUK
                ? 'Натисни на запитання, щоб побачити відповідь'
                : isES
                  ? 'Toca una pregunta para ver la respuesta'
                  : 'Нажми на вопрос, чтобы увидеть ответ'}
            </Text>

            {sections.map((section) => (
              <View key={section} style={{ marginBottom: 6 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700', marginBottom: 10 }}>
                  {section}
                </Text>
                {items
                  .filter(item => item.section === section)
                  .map((item, i) => (
                    <View
                      key={`${section}-${i}`}
                      onLayout={(e) => {
                        itemYRef.current[`${section}-${i}`] = e.nativeEvent.layout.y;
                      }}
                    >
                      <FaqItem
                        item={item}
                        t={t}
                        f={f}
                        isOpen={openItemId === `${section}-${i}`}
                        onToggle={() => handleToggleItem(`${section}-${i}`)}
                      />
                    </View>
                  ))}
              </View>
            ))}

            <ReportErrorButton
              screen="faq"
              dataId="faq_content"
              dataText={isUK ? 'Розділ FAQ' : isES ? 'Ayuda · FAQ' : 'Раздел FAQ'}
              style={{ alignSelf: 'center', marginTop: 16 }}
            />
          </ScrollView>
        </ContentWrap>
      </SafeAreaView>
    </ScreenGradient>
  );
}
