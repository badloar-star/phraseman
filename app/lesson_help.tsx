import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import { triLang } from '../constants/i18n';
import { lessonNamesForLang } from '../constants/lessons';
import { useTheme } from '../components/ThemeContext';
import ScreenGradient from '../components/ScreenGradient';
import XpGainBadge from '../components/XpGainBadge';
import { updateTaskProgress } from './daily_tasks';
import { registerXP, getCurrentMultiplier } from './xp_manager';
import ReportErrorButton from '../components/ReportErrorButton';

// ─── UI компоненты ────────────────────────────────────────────────────────────

function Section({ title, t, f }: { title: string; t: any; f: any }) {
  return (
    <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginTop: 22, marginBottom: 8, borderBottomWidth: 0.5, borderBottomColor: t.border, paddingBottom: 6 }}>
      {title}
    </Text>
  );
}

function Body({ text, t, f }: { text: string; t: any; f: any }) {
  return <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: 24, marginBottom: 8 }} maxFontSizeMultiplier={1.2}>{text}</Text>;
}

function Example({ eng, rus, t, f }: { eng: string; rus: string; t: any; f: any }) {
  return (
    <View style={{ marginLeft: 12, marginBottom: 5 }}>
      <Text style={{ fontSize: f.body, lineHeight: 22 }} maxFontSizeMultiplier={1.2}>
        <Text style={{ color: t.textPrimary, fontWeight: '600' }}>{eng}</Text>
        <Text style={{ color: t.textMuted, fontSize: f.sub }}>{'  — ' + rus}</Text>
      </Text>
    </View>
  );
}

function Warn({ text, t, f }: { text: string; t: any; f: any }) {
  return (
    <View style={{ backgroundColor: t.bgCard, borderRadius: 12, padding: 14, borderLeftWidth: 3, borderLeftColor: '#B8860B', marginVertical: 8 }}>
      <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: 22 }} maxFontSizeMultiplier={1.2}>
        <Text style={{ fontSize: f.body }}>⚠️  </Text>{text}
      </Text>
    </View>
  );
}

function Tip({ text, t, f }: { text: string; t: any; f: any }) {
  return (
    <View style={{ backgroundColor: t.bgCard, borderRadius: 12, padding: 14, borderLeftWidth: 3, borderLeftColor: '#2E7D52', marginVertical: 8 }}>
      <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: 22 }} maxFontSizeMultiplier={1.2}>
        <Text style={{ fontSize: f.body }}>💡  </Text>{text}
      </Text>
    </View>
  );
}

// Таблица: массив строк, каждая строка — массив ячеек
const COL_MIN_W = 110;

function Table({ rows, t }: { rows: string[][]; t: any; f?: any }) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const [containerW, setContainerW] = useState(0);

  if (!rows.length) return null;
  const header = rows[0];
  const body = rows.slice(1);
  const numCols = header.length;
  const contentW = numCols * COL_MIN_W;
  const canScroll = containerW > 0 && contentW > containerW;

  // thumb width proportional, min 32px
  const thumbW = canScroll ? Math.max(32, (containerW / contentW) * containerW) : 0;
  const trackW = containerW - 8; // 4px padding each side
  const thumbTranslate = canScroll
    ? scrollX.interpolate({ inputRange: [0, contentW - containerW], outputRange: [0, trackW - thumbW], extrapolate: 'clamp' })
    : new Animated.Value(0);

  return (
    <View
      style={{ marginVertical: 10 }}
      onLayout={e => setContainerW(e.nativeEvent.layout.width)}
    >
      <View style={{ borderRadius: 10, borderWidth: 0.5, borderColor: t.border, overflow: 'hidden' }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        >
          <View style={{ minWidth: contentW }}>
            {/* Заголовок */}
            <View style={{ flexDirection: 'row', backgroundColor: t.bgSurface }}>
              {header.map((cell, i) => (
                <View key={i} style={{ width: COL_MIN_W, paddingHorizontal: 8, paddingVertical: 10, borderRightWidth: i < numCols - 1 ? 0.5 : 0, borderRightColor: t.border }}>
                  <Text style={{ color: t.textPrimary, fontSize: 12, fontWeight: '700' }} maxFontSizeMultiplier={1}>{cell}</Text>
                </View>
              ))}
            </View>
            {/* Строки */}
            {body.map((row, ri) => (
              <View key={ri} style={{ flexDirection: 'row', backgroundColor: ri % 2 === 0 ? t.bgCard : t.bgSurface, borderTopWidth: 0.5, borderTopColor: t.border }}>
                {row.map((cell, ci) => (
                  <View key={ci} style={{ width: COL_MIN_W, paddingHorizontal: 8, paddingVertical: 10, borderRightWidth: ci < row.length - 1 ? 0.5 : 0, borderRightColor: t.border }}>
                    <Text style={{ color: t.textSecond, fontSize: 11, lineHeight: 17 }} maxFontSizeMultiplier={1}>{cell}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Кастомный индикатор горизонтального скролла */}
      {canScroll && (
        <View style={{ height: 4, marginTop: 4, marginHorizontal: 4, backgroundColor: t.border, borderRadius: 2, overflow: 'hidden' }}>
          <Animated.View style={{ height: 4, width: thumbW, borderRadius: 2, backgroundColor: '#4A90E2', transform: [{ translateX: thumbTranslate }] }} />
        </View>
      )}
    </View>
  );
}

// ─── Контент уроков ───────────────────────────────────────────────────────────

/** Урок 1 — To Be (утверждения): полная теория на испанском. */
function renderLesson1TheoryEs(t: any, f: any): React.ReactNode[] {
  return [
    <Section key="s1" t={t} f={f} title="1. Por qué no basta con decir «I here»" />,
    <Body
      key="b1a"
      t={t}
      f={f}
      text="En español dices con naturalidad «Estoy aquí»: el verbo (estar, ser…) suele ir explícito. En inglés también necesitas am, is o are cuando expresas estado, lugar o cualidad sobre alguien o algo."
    />,
    <Body
      key="b1b"
      t={t}
      f={f}
      text="Si en inglés faltan am, is o are donde gramaticalmente los pide la frase, el enunciado suena incompleto o incorrecto."
    />,
    <Body
      key="b1c"
      t={t}
      f={f}
      text="Piensa en am, is y are como el pegamento entre el sujeto y lo que afirmas (adjetivo, lugar…). Sin ellos la oración pierde forma."
    />,
    <Warn
      key="w1"
      t={t}
      f={f}
      text="❌ «I here» → ✅ «I am here». Sin am, is o are la oración no es correcta en inglés."
    />,

    <Section key="s2" t={t} f={f} title="2. Tres formas: am, is, are" />,
    <Body key="b2a" t={t} f={f} text="«To be» cambia de forma según la persona gramatical sobre la que hablas." />,
    <Table
      key="t1"
      t={t}
      f={f}
      rows={[
        ['Pronombre', 'Forma', 'Ejemplo'],
        ['I', 'am', 'I am here'],
        ['He / She / It', 'is', 'He is busy / She is at home'],
        ['You / We / They', 'are', 'You are ready / We are safe'],
      ]}
    />,
    <Body key="b2b" t={t} f={f} text="Con I solo am. Nunca is ni are." />,
    <Example key="e1" t={t} f={f} eng="I am here" rus="Estoy aquí" />,
    <Example key="e2" t={t} f={f} eng="I am okay" rus="Estoy bien" />,
    <Example key="e3" t={t} f={f} eng="I am at work" rus="Estoy en el trabajo" />,
    <Body key="b2c" t={t} f={f} text="Con he, she o it solo is." />,
    <Example key="e4" t={t} f={f} eng="He is busy" rus="Él está ocupado" />,
    <Example key="e5" t={t} f={f} eng="She is at home" rus="Ella está en casa" />,
    <Example key="e6" t={t} f={f} eng="It is important" rus="Es importante" />,
    <Body key="b2d" t={t} f={f} text="Con you, we o they solo are." />,
    <Example key="e7" t={t} f={f} eng="You are ready" rus="Estás listo (tú, informal)" />,
    <Example key="e8" t={t} f={f} eng="We are safe" rus="Estamos a salvo" />,
    <Example key="e9" t={t} f={f} eng="They are here" rus="Están aquí" />,

    <Section key="s3" t={t} f={f} title="3. Contracciones" />,
    <Body
      key="b3a"
      t={t}
      f={f}
      text="En el inglés coloquial, am, is y are suelen ir en forma contraída (I'm, she's…); así suena más natural."
    />,
    <Table
      key="t2"
      t={t}
      f={f}
      rows={[
        ['Forma completa', 'Contracción'],
        ['I am', "I'm"],
        ['He is', "He's"],
        ['She is', "She's"],
        ['It is', "It's"],
        ['You are', "You're"],
        ['We are', "We're"],
        ['They are', "They're"],
      ]}
    />,
    <Tip
      key="tip1"
      t={t}
      f={f}
      text="El apóstrofo marca la letra que «desapareció»: I'm = I am, He's = He is."
    />,

    <Section key="s4" t={t} f={f} title="4. Lo que puede ir después de «to be»" />,
    <Body key="b4a" t={t} f={f} text="Opción 1 — adjetivo: describe estado o cualidad." />,
    <Example key="e10" t={t} f={f} eng="He is busy" rus="Él está ocupado" />,
    <Example key="e11" t={t} f={f} eng="She is upset" rus="Ella está molesta / enfadada" />,
    <Body key="b4b" t={t} f={f} text="Opción 2 — adverbio de lugar: here, home, outside…" />,
    <Example key="e12" t={t} f={f} eng="I am here" rus="Estoy aquí" />,
    <Example key="e13" t={t} f={f} eng="They are outside" rus="Están fuera" />,
    <Body key="b4c" t={t} f={f} text="Opción 3 — preposición + nombre o lugar típico: at, in, on + nombre." />,
    <Table
      key="t3"
      t={t}
      f={f}
      rows={[
        ['Preposición', 'Ideas que cubre', 'Ejemplo'],
        ['at', 'punto / edificio o actividad (trabajo, aeropuerto)', 'at work / at the airport'],
        ['in', 'interior cerrado', 'in the car / in a taxi'],
        ['on', 'trayecto o medio de transporte', 'on our way / on the train'],
      ]}
    />,
    <Example key="e14" t={t} f={f} eng="I am at work" rus="Estoy en el trabajo" />,
    <Example key="e15" t={t} f={f} eng="They are in the car" rus="Están en el coche / el auto" />,
    <Example key="e16" t={t} f={f} eng="We are on our way" rus="Ya vamos / vamos en camino" />,
    <Example key="e17" t={t} f={f} eng="I am in line" rus="Estoy en la cola (también: haciendo cola)" />,
    <Example key="e18" t={t} f={f} eng="It is near here" rus="Está cerca de aquí" />,
    <Tip
      key="tip_transport"
      t={t}
      f={f}
      text="«in a taxi»: taxi genérico o ir en taxi. «in the taxi»: el taxi concreto del que ya hablabas."
    />,

    <Section key="s5" t={t} f={f} title="5. Errores frecuentes" />,
    <Warn key="w2" t={t} f={f} text="❌ «He am busy» → ✅ «He is busy». Con he, she o it solo is." />,
    <Warn key="w3" t={t} f={f} text="❌ «They is here» → ✅ «They are here». Con they, we o you solo are." />,
    <Warn key="w4" t={t} f={f} text="❌ «I are okay» → ✅ «I am okay». Con I solo am, siempre." />,
    <Tip
      key="tip2"
      t={t}
      f={f}
      text="I → am. He / she / it → is. You / we / they → are."
    />,
  ];
}

type TheoryContent = {
  titleRU: string;
  titleUK: string;
  render: (t: any, isUK: boolean, f: any) => React.ReactNode[];
};


const THEORY: Record<number, TheoryContent> = {
1: {
  titleRU: 'To Be: утверждения',
  titleUK: 'To Be: стверджування',
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Чому не можна сказати «I here»' : '1. Почему нельзя сказать «I here»'} />,
    <Body key="b1a" t={t} f={f} text={isUK ? 'В українській мові можна сказати «Я тут» — і все зрозуміло. Дієслово «є» просто опускається. В англійській так не працює.' : 'В русском языке можно сказать «Я здесь» — и всё понятно. Глагол «есть» просто опускается. В английском так не работает.'} />,
    <Body key="b1b" t={t} f={f} text={isUK ? 'В англійській реченні без дієслова — зламане речення. Там, де ми мовчимо, англійці обов\'язково кажуть am, is або are.' : 'В английском предложение без глагола — сломанное предложение. Там, где мы молчим, англичане обязательно говорят am, is или are.'} />,
    <Body key="b1c" t={t} f={f} text={isUK ? 'Запам\'ятай одну річ: am / is / are — це як клей, що скріплює слова в реченні. Без нього фраза розсипається.' : 'Запомни одну вещь: am / is / are — это как клей, который скрепляет слова в предложении. Без него фраза рассыпается.'} />,
    <Warn key="w1" t={t} f={f} text={isUK ? '❌ «I here» → ✅ «I am here». Без am/is/are речення не існує.' : '❌ «I here» → ✅ «I am here». Без am/is/are предложения не существует.'} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Три форми: am, is, are' : '2. Три формы: am, is, are'} />,
    <Body key="b2a" t={t} f={f} text={isUK ? 'Дієслово To Be змінює форму залежно від того, про кого ти говориш.' : 'Глагол To Be меняет форму в зависимости от того, о ком ты говоришь.'} />,
    <Table key="t1" t={t} f={f} rows={[
      [isUK ? 'Займенник' : 'Местоимение', isUK ? 'Форма' : 'Форма', isUK ? 'Приклад' : 'Пример'],
      ['I', 'am', 'I am here'],
      ['He / She / It', 'is', 'He is busy / She is at home'],
      ['You / We / They', 'are', 'You are ready / We are safe'],
    ]} />,
    <Body key="b2b" t={t} f={f} text={isUK ? 'З I — тільки am. Ніколи не is, ніколи не are.' : 'С I — только am. Никогда не is, никогда не are.'} />,
    <Example key="e1" t={t} f={f} eng="I am here" rus={isUK ? 'Я тут' : 'Я здесь'} />,
    <Example key="e2" t={t} f={f} eng="I am okay" rus={isUK ? 'Я в порядку' : 'Я в порядке'} />,
    <Example key="e3" t={t} f={f} eng="I am at work" rus={isUK ? 'Я на роботі' : 'Я на работе'} />,
    <Body key="b2c" t={t} f={f} text={isUK ? 'З he / she / it — тільки is.' : 'С he / she / it — только is.'} />,
    <Example key="e4" t={t} f={f} eng="He is busy" rus={isUK ? 'Він зайнятий' : 'Он занят'} />,
    <Example key="e5" t={t} f={f} eng="She is at home" rus={isUK ? 'Вона вдома' : 'Она дома'} />,
    <Example key="e6" t={t} f={f} eng="It is important" rus={isUK ? 'Це важливо' : 'Это важно'} />,
    <Body key="b2d" t={t} f={f} text={isUK ? 'З you / we / they — тільки are.' : 'С you / we / they — только are.'} />,
    <Example key="e7" t={t} f={f} eng="You are ready" rus={isUK ? 'Ти готовий' : 'Ты готов'} />,
    <Example key="e8" t={t} f={f} eng="We are safe" rus={isUK ? 'Ми в безпеці' : 'Мы в безопасности'} />,
    <Example key="e9" t={t} f={f} eng="They are here" rus={isUK ? 'Вони тут' : 'Они здесь'} />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Скорочення' : '3. Сокращения'} />,
    <Body key="b3a" t={t} f={f} text={isUK ? 'У розмові am/is/are майже завжди скорочуються. Це звучить природніше і швидше.' : 'В разговоре am/is/are почти всегда сокращаются. Это звучит естественнее и быстрее.'} />,
    <Table key="t2" t={t} f={f} rows={[
      [isUK ? 'Повна форма' : 'Полная форма', isUK ? 'Скорочення' : 'Сокращение'],
      ['I am', "I'm"], ['He is', "He's"], ['She is', "She's"], ['It is', "It's"],
      ['You are', "You're"], ['We are', "We're"], ['They are', "They're"],
    ]} />,
    <Tip key="tip1" t={t} f={f} text={isUK ? 'Апостроф стоїть рівно там, де «зникла» літера: I\'m = I am, He\'s = He is.' : 'Апостроф стоит ровно там, где «пропала» буква: I\'m = I am, He\'s = He is.'} />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. Що стоїть після To Be' : '4. Что стоит после To Be'} />,
    <Body key="b4a" t={t} f={f} text={isUK ? 'Варіант 1 — прикметник. Описує стан або якість.' : 'Вариант 1 — прилагательное. Описывает состояние или качество.'} />,
    <Example key="e10" t={t} f={f} eng="He is busy" rus={isUK ? 'Він зайнятий' : 'Он занят'} />,
    <Example key="e11" t={t} f={f} eng="She is upset" rus={isUK ? 'Вона засмучена' : 'Она расстроена'} />,
    <Body key="b4b" t={t} f={f} text={isUK ? 'Варіант 2 — прислівник місця: here, home, outside.' : 'Вариант 2 — наречие места: here, home, outside.'} />,
    <Example key="e12" t={t} f={f} eng="I am here" rus={isUK ? 'Я тут' : 'Я здесь'} />,
    <Example key="e13" t={t} f={f} eng="They are outside" rus={isUK ? 'Вони надворі' : 'Они снаружи'} />,
    <Body key="b4c" t={t} f={f} text={isUK ? 'Варіант 3 — прийменник + місце: at, in, on + іменник.' : 'Вариант 3 — предлог + место: at, in, on + существительное.'} />,
    <Table key="t3" t={t} f={f} rows={[
      [isUK ? 'Прийменник' : 'Предлог', isUK ? 'Коли' : 'Когда', isUK ? 'Приклад' : 'Пример'],
      ['at', isUK ? 'точка, будівля' : 'точка, здание', 'at work / at the airport'],
      ['in', isUK ? 'всередині' : 'внутри', 'in the car / in a taxi'],
      ['on', isUK ? 'транспорт, шлях' : 'транспорт, путь', 'on our way / on the train'],
    ]} />,
    <Example key="e14" t={t} f={f} eng="I am at work" rus={isUK ? 'Я на роботі' : 'Я на работе'} />,
    <Example key="e15" t={t} f={f} eng="They are in the car" rus={isUK ? 'Вони в машині' : 'Они в машине'} />,
    <Example key="e16" t={t} f={f} eng="We are on our way" rus={isUK ? 'Ми вже в дорозі' : 'Мы уже в пути'} />,
    <Example key="e17" t={t} f={f} eng="I am in line" rus={isUK ? 'Я в черзі' : 'Я в очереди'} />,
    <Example key="e18" t={t} f={f} eng="It is near here" rus={isUK ? 'Це поруч' : 'Это рядом'} />,
    <Tip key="tip_transport" t={t} f={f} text={isUK ? 'in a taxi = у будь-якому таксі; in the taxi = у конкретному таксі, про яке вже йдеться.' : 'in a taxi = в любом такси; in the taxi = в конкретном такси, о котором уже говорили.'} />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. Часті помилки' : '5. Частые ошибки'} />,
    <Warn key="w2" t={t} f={f} text={isUK ? '❌ «He am busy» → ✅ «He is busy». З he/she/it — тільки is.' : '❌ «He am busy» → ✅ «He is busy». С he/she/it — только is.'} />,
    <Warn key="w3" t={t} f={f} text={isUK ? '❌ «They is here» → ✅ «They are here». З they/we/you — тільки are.' : '❌ «They is here» → ✅ «They are here». С they/we/you — только are.'} />,
    <Warn key="w4" t={t} f={f} text={isUK ? '❌ «I are okay» → ✅ «I am okay». З I — тільки am. Завжди.' : '❌ «I are okay» → ✅ «I am okay». С I — только am. Всегда.'} />,
    <Tip key="tip2" t={t} f={f} text={isUK ? 'I → am (особлива). He/She/It → is (один). You/We/They → are (всі інші).' : 'I → am (особая). He/She/It → is (один). You/We/They → are (все остальные).'} />,
  ],
},

// ── УРОК 2 ──────────────────────────────────────────────────
2: {
  titleRU: 'To Be: отрицания и вопросы',
  titleUK: 'To Be: заперечення та питання',
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Як сказати «не»' : '1. Как сказать «не»'} />,
    <Body key="b1a" t={t} f={f} text={isUK ? 'Щоб сказати «не», просто постав слово not після am, is або are. Більше нічого не змінюється.' : 'Чтобы сказать «не», просто поставь слово not после am, is или are. Больше ничего не меняется.'} />,
    <Example key="e1" t={t} f={f} eng="I am not hungry" rus={isUK ? 'Я не голодний' : 'Я не голоден'} />,
    <Example key="e2" t={t} f={f} eng="He is not here" rus={isUK ? 'Його тут немає' : 'Его здесь нет'} />,
    <Example key="e3" t={t} f={f} eng="We are not ready" rus={isUK ? 'Ми не готові' : 'Мы не готовы'} />,
    <Example key="e4" t={t} f={f} eng="They are not home / They are not at home" rus={isUK ? 'Їх немає вдома (обидві форми правильні)' : 'Их нет дома (обе формы правильны)'} />,
    <Body key="b1b" t={t} f={f} text={isUK ? 'Is not і are not можна скоротити: isn\'t і aren\'t. Це звучить природніше в розмові.' : 'Is not и are not можно сократить: isn\'t и aren\'t. Это звучит естественнее в разговоре.'} />,
    <Example key="e5" t={t} f={f} eng="She isn't married" rus={isUK ? 'Вона не одружена' : 'Она не замужем'} />,
    <Example key="e6" t={t} f={f} eng="It isn't scary" rus={isUK ? 'Це не страшно' : 'Это не страшно'} />,
    <Body key="b1c" t={t} f={f} text={isUK ? 'З I — тільки I\'m not. Скорочення «amn\'t» не існує в англійській мові.' : 'С I — только I\'m not. Сокращения «amn\'t» не существует в английском.'} />,
    <Warn key="w1" t={t} f={f} text={isUK ? '❌ «I amn\'t alone» → ✅ «I\'m not alone». Для I немає скороченої форми з not.' : '❌ «I amn\'t alone» → ✅ «I\'m not alone». Для I нет сокращённой формы с not.'} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Як поставити питання' : '2. Как задать вопрос'} />,
    <Body key="b2a" t={t} f={f} text={isUK ? 'Щоб поставити питання, переставляємо am/is/are на початок — перед підметом. Нічого більше не змінюється.' : 'Чтобы задать вопрос, переставляем am/is/are в начало — перед подлежащим. Больше ничего не меняется.'} />,
    <Body key="b2b" t={t} f={f} text={isUK ? 'Схема: Am / Is / Are + підмет + решта?' : 'Схема: Am / Is / Are + подлежащее + остальное?'} />,
    <Example key="e7" t={t} f={f} eng="Are you sure?" rus={isUK ? 'Ти впевнений?' : 'Ты уверен?'} />,
    <Example key="e8" t={t} f={f} eng="Is it expensive?" rus={isUK ? 'Це дорого?' : 'Это дорого?'} />,
    <Example key="e9" t={t} f={f} eng="Is she a doctor?" rus={isUK ? 'Вона лікар?' : 'Она врач?'} />,
    <Example key="e10" t={t} f={f} eng="Are they here?" rus={isUK ? 'Вони тут?' : 'Они здесь?'} />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Питання з not — «хіба не»' : '3. Вопрос с not — «разве не»'} />,
    <Body key="b3a" t={t} f={f} text={isUK ? 'Іноді питання звучить як «Хіба я не правий?» — це Am I not...? або Are we not...? Not стоїть після підмета.' : 'Иногда вопрос звучит как «Разве я не прав?» — это Am I not...? или Are we not...? Not стоит после подлежащего.'} />,
    <Example key="e11" t={t} f={f} eng="Am I not right?" rus={isUK ? 'Хіба я не правий?' : 'Разве я не прав?'} />,
    <Example key="e12" t={t} f={f} eng="Are we not on the list?" rus={isUK ? 'Хіба нас немає у списку?' : 'Разве нас нет в списке?'} />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. Короткі відповіді' : '4. Краткие ответы'} />,
    <Body key="b4a" t={t} f={f} text={isUK ? 'На питання з To Be не кажуть просто «yes» або «no». Додають am/is/are (або isn\'t/aren\'t).' : 'На вопрос с To Be не говорят просто «yes» или «no». Добавляют am/is/are (или isn\'t/aren\'t).'} />,
    <Table key="t1" t={t} f={f} rows={[
      [isUK ? 'Питання' : 'Вопрос', isUK ? 'Так' : 'Да', isUK ? 'Ні' : 'Нет'],
      ['Are you sure?', 'Yes, I am.', 'No, I\'m not.'],
      ['Is it open?', 'Yes, it is.', 'No, it isn\'t.'],
      ['Are they busy?', 'Yes, they are.', 'No, they aren\'t.'],
    ]} />,
    <Tip key="tip1" t={t} f={f} text={isUK ? 'У короткій стверджувальній відповіді ніколи не скорочуй: «Yes, I\'m» — неправильно. Тільки «Yes, I am».' : 'В краткой утвердительной ответе никогда не сокращай: «Yes, I\'m» — неверно. Только «Yes, I am».'} />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. Артикль a у питаннях про професію' : '5. Артикль a в вопросах о профессии'} />,
    <Body key="b5a" t={t} f={f} text={isUK ? 'Коли говориш про професію або роль людини, перед іменником потрібен артикль a/an. Це правило діє навіть у питанні.' : 'Когда говоришь о профессии или роли человека, перед существительным нужен артикль a/an. Это правило работает даже в вопросе.'} />,
    <Example key="e13" t={t} f={f} eng="Is she a doctor?" rus={isUK ? 'Вона лікар?' : 'Она врач?'} />,
    <Example key="e14" t={t} f={f} eng="Is he a teacher?" rus={isUK ? 'Він вчитель?' : 'Он учитель?'} />,
    <Warn key="w_art" t={t} f={f} text={isUK ? '❌ «Is she doctor?» → ✅ «Is she a doctor?» — перед назвою професії артикль обов\'язковий.' : '❌ «Is she doctor?» → ✅ «Is she a doctor?» — перед названием профессии артикль обязателен.'} />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. Стійкі вирази з in' : '6. Устойчивые выражения с in'} />,
    <Body key="b6a" t={t} f={f} text={isUK ? 'Деякі поєднання слів в англійській — стійкі. Вони завжди вживаються разом і з певним прийменником. Їх треба запам\'ятовувати як єдине ціле.' : 'Некоторые сочетания слов в английском — устойчивые. Они всегда употребляются вместе и с определённым предлогом. Их нужно запоминать как единое целое.'} />,
    <Example key="e15" t={t} f={f} eng="We are not in danger" rus={isUK ? 'Ми не в небезпеці' : 'Мы не в опасности'} />,
    <Example key="e16" t={t} f={f} eng="He is in trouble" rus={isUK ? 'Він у біді' : 'Он в беде'} />,
    <Example key="e17" t={t} f={f} eng="She is in a hurry" rus={isUK ? 'Вона поспішає' : 'Она торопится'} />,
    <Tip key="tip_in" t={t} f={f} text={isUK ? 'in danger, in trouble, in a hurry — запам\'ятай ці три вирази одразу. Вони дуже поширені.' : 'in danger, in trouble, in a hurry — запомни эти три выражения сразу. Они очень распространены.'} />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. Часті помилки' : '7. Частые ошибки'} />,
    <Warn key="w2" t={t} f={f} text={isUK ? '❌ «Are you not sure?» (в розмові звучить незграбно) → ✅ «Aren\'t you sure?» — так природніше.' : '❌ «Are you not sure?» (в разговоре звучит тяжело) → ✅ «Aren\'t you sure?» — так естественнее.'} />,
    <Warn key="w3" t={t} f={f} text={isUK ? '❌ «Is it not dangerous» без знака питання — завжди став «?» наприкінці питання.' : '❌ «Is it not dangerous» без знака вопроса — всегда ставь «?» в конце вопроса.'} />,
  ],
},

// ── УРОК 3 ──────────────────────────────────────────────────
3: {
  titleRU: 'Present Simple: утверждения',
  titleUK: 'Present Simple: стверджування',
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що таке Present Simple' : '1. Что такое Present Simple'} />,
    <Body key="b1a" t={t} f={f} text={isUK ? 'Present Simple — це час для того, що відбувається регулярно, постійно або взагалі є правдою. Не те, що зараз у процесі — а те, що є твоєю звичкою, фактом, розпорядком.' : 'Present Simple — это время для того, что происходит регулярно, постоянно или вообще является правдой. Не то, что сейчас в процессе — а то, что является твоей привычкой, фактом, распорядком.'} />,
    <Example key="e1" t={t} f={f} eng="I work here" rus={isUK ? 'Я тут працюю (це моя робота)' : 'Я здесь работаю (это моя работа)'} />,
    <Example key="e2" t={t} f={f} eng="She speaks English" rus={isUK ? 'Вона розмовляє англійською (взагалі)' : 'Она говорит по-английски (вообще)'} />,
    <Example key="e3" t={t} f={f} eng="They live here" rus={isUK ? 'Вони тут живуть (постійно)' : 'Они здесь живут (постоянно)'} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Форма з I / You / We / They' : '2. Форма с I / You / We / They'} />,
    <Body key="b2a" t={t} f={f} text={isUK ? 'З I, You, We, They — дієслово стоїть у базовій формі. Нічого не змінюється.' : 'С I, You, We, They — глагол стоит в базовой форме. Ничего не меняется.'} />,
    <Example key="e4" t={t} f={f} eng="I work here" rus={isUK ? 'Я тут працюю' : 'Я здесь работаю'} />,
    <Example key="e5" t={t} f={f} eng="You understand me" rus={isUK ? 'Ти мене розумієш' : 'Ты меня понимаешь'} />,
    <Example key="e6" t={t} f={f} eng="We drink coffee" rus={isUK ? 'Ми п\'ємо каву' : 'Мы пьем кофе'} />,
    <Example key="e7" t={t} f={f} eng="They watch the news" rus={isUK ? 'Вони дивляться новини' : 'Они смотрят новости'} />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Форма з He / She / It — додаємо -s' : '3. Форма с He / She / It — добавляем -s'} />,
    <Body key="b3a" t={t} f={f} text={isUK ? 'З He, She, It — до дієслова додається -s або -es. Це головне правило Present Simple, яке найчастіше забувають.' : 'С He, She, It — к глаголу добавляется -s или -es. Это главное правило Present Simple, которое чаще всего забывают.'} />,
    <Example key="e8" t={t} f={f} eng="He lives in London" rus={isUK ? 'Він живе в Лондоні' : 'Он живет в Лондоне'} />,
    <Example key="e9" t={t} f={f} eng="She speaks English" rus={isUK ? 'Вона розмовляє англійською' : 'Она говорит по-английски'} />,
    <Example key="e10" t={t} f={f} eng="It costs a dollar" rus={isUK ? 'Це коштує долар' : 'Это стоит доллар'} />,
    <Body key="b3b" t={t} f={f} text={isUK ? 'Глаголи на -sh, -ch, -x, -o, -s отримують -es: wash → washes, teach → teaches.' : 'Глаголы на -sh, -ch, -x, -o, -s получают -es: wash → washes, teach → teaches.'} />,
    <Example key="e11" t={t} f={f} eng="She washes the dishes" rus={isUK ? 'Вона миє посуд' : 'Она моет посуду'} />,
    <Example key="e12" t={t} f={f} eng="She teaches math" rus={isUK ? 'Вона викладає математику' : 'Она преподает математику'} />,
    <Warn key="w1" t={t} f={f} text={isUK ? '❌ «He live here» → ✅ «He lives here». З he/she/it завжди -s.' : '❌ «He live here» → ✅ «He lives here». С he/she/it всегда -s.'} />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. Маркери часу' : '4. Маркеры времени'} />,
    <Body key="b4a" t={t} f={f} text={isUK ? 'Present Simple часто йде разом з такими словами: always, usually, often, sometimes, rarely, never. Вони показують наскільки часто.' : 'Present Simple часто идет вместе с такими словами: always, usually, often, sometimes, rarely, never. Они показывают насколько часто.'} />,
    <Table key="t1" t={t} f={f} rows={[
      [isUK ? 'Слово' : 'Слово', isUK ? 'Значення' : 'Значение'],
      ['always', isUK ? 'завжди' : 'всегда'],
      ['usually', isUK ? 'зазвичай' : 'обычно'],
      ['often', isUK ? 'часто' : 'часто'],
      ['sometimes', isUK ? 'іноді' : 'иногда'],
      ['rarely', isUK ? 'рідко' : 'редко'],
      ['never', isUK ? 'ніколи' : 'никогда'],
    ]} />,
    <Example key="e13" t={t} f={f} eng="He often calls" rus={isUK ? 'Він часто телефонує' : 'Он часто звонит'} />,
    <Example key="e14" t={t} f={f} eng="They travel often" rus={isUK ? 'Вони часто подорожують' : 'Они часто путешествуют'} />,
    <Tip key="tip1" t={t} f={f} text={isUK ? 'Ці слова зазвичай стоять перед основним дієсловом, але після to be: She is always late / She always comes late.' : 'Эти слова обычно стоят перед основным глаголом, но после to be: She is always late / She always comes late.'} />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. Об\'єктні займенники: me, him, her...' : '5. Объектные местоимения: me, him, her...'} />,
    <Body key="b5a" t={t} f={f} text={isUK ? 'Після дієслова ставимо не «I/he/she», а об\'єктну форму. Це займенник у ролі доповнення — той, на кого спрямована дія.' : 'После глагола ставим не «I/he/she», а объектную форму. Это местоимение в роли дополнения — тот, на кого направлено действие.'} />,
    <Table key="t2" t={t} f={f} rows={[
      [isUK ? 'Підмет' : 'Подлежащее', isUK ? 'Після дієслова' : 'После глагола'],
      ['I', 'me'],
      ['he', 'him'],
      ['she', 'her'],
      ['we', 'us'],
      ['they', 'them'],
    ]} />,
    <Example key="e15" t={t} f={f} eng="You understand me" rus={isUK ? 'Ти розумієш мене' : 'Ты понимаешь меня'} />,
    <Example key="e16" t={t} f={f} eng="I believe him" rus={isUK ? 'Я йому вірю' : 'Я ему верю'} />,
    <Warn key="w_pron" t={t} f={f} text={isUK ? '❌ «You understand I» → ✅ «You understand me». Після дієслова — об\'єктна форма.' : '❌ «You understand I» → ✅ «You understand me». После глагола — объектная форма.'} />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. Listen to — чому потрібен прийменник' : '6. Listen to — почему нужен предлог'} />,
    <Body key="b6a" t={t} f={f} text={isUK ? 'Дієслово listen завжди вживається з прийменником to. Без нього речення незакінчене. Запам\'ятай: listen — слухати взагалі, listen to — слухати щось конкретне.' : 'Глагол listen всегда употребляется с предлогом to. Без него предложение незаконченное. Запомни: listen — слушать вообще, listen to — слушать что-то конкретное.'} />,
    <Example key="e17" t={t} f={f} eng="We listen to music" rus={isUK ? 'Ми слухаємо музику' : 'Мы слушаем музыку'} />,
    <Example key="e18" t={t} f={f} eng="She listens to the radio" rus={isUK ? 'Вона слухає радіо' : 'Она слушает радио'} />,
    <Warn key="w_listen" t={t} f={f} text={isUK ? '❌ «We listen music» → ✅ «We listen to music». Прийменник to обов\'язковий.' : '❌ «We listen music» → ✅ «We listen to music». Предлог to обязателен.'} />,

    <Section key="s7" t={t} f={f} title={isUK ? '7. Артикль перед іменником в однині' : '7. Артикль перед существительным в единственном числе'} />,
    <Body key="b7a" t={t} f={f} text={isUK ? 'Якщо іменник в однині і не конкретний — потрібен артикль a або an. a — перед приголосним звуком, an — перед голосним.' : 'Если существительное в единственном числе и не конкретное — нужен артикль a или an. a — перед согласным звуком, an — перед гласным.'} />,
    <Example key="e19" t={t} f={f} eng="They drive a car" rus={isUK ? 'Вони їздять на машині' : 'Они ездят на машине'} />,
    <Example key="e20" t={t} f={f} eng="You deserve a rest" rus={isUK ? 'Ти заслуговуєш на відпочинок' : 'Ты заслуживаешь отдыха'} />,
    <Example key="e21" t={t} f={f} eng="It costs a dollar" rus={isUK ? 'Це коштує долар' : 'Это стоит доллар'} />,
    <Tip key="tip_art" t={t} f={f} text={isUK ? 'a rest, a car, a dollar — перед кожним іменником в однині, якщо він не конкретний, стоїть a/an.' : 'a rest, a car, a dollar — перед каждым существительным в единственном числе, если оно не конкретное, стоит a/an.'} />,

    <Section key="s8" t={t} f={f} title={isUK ? '8. Стійкі вирази з the' : '8. Устойчивые выражения с the'} />,
    <Body key="b8a" t={t} f={f} text={isUK ? 'Деякі вирази завжди вживаються з артиклем the, бо ми маємо на увазі конкретну, загальновідому річ.' : 'Некоторые выражения всегда употребляются с артиклем the, потому что мы имеем в виду конкретную, общеизвестную вещь.'} />,
    <Example key="e22" t={t} f={f} eng="She washes the dishes" rus={isUK ? 'Вона миє посуд (свій, домашній)' : 'Она моет посуду (свою, домашнюю)'} />,
    <Example key="e23" t={t} f={f} eng="They watch the news" rus={isUK ? 'Вони дивляться новини' : 'Они смотрят новости'} />,
    <Example key="e24" t={t} f={f} eng="She uses the internet" rus={isUK ? 'Вона користується інтернетом' : 'Она пользуется интернетом'} />,
    <Tip key="tip_the" t={t} f={f} text={isUK ? 'the dishes, the news, the internet — стійкі вирази. Артикль the тут завжди.' : 'the dishes, the news, the internet — устойчивые выражения. Артикль the здесь всегда.'} />,

    <Section key="s9" t={t} f={f} title={isUK ? '9. Seem + прикметник' : '9. Seem + прилагательное'} />,
    <Body key="b9a" t={t} f={f} text={isUK ? 'Дієслово seem (здаватися) вживається як to be — після нього стоїть прикметник, а не прислівник.' : 'Глагол seem (казаться) употребляется как to be — после него стоит прилагательное, а не наречие.'} />,
    <Example key="e25" t={t} f={f} eng="It seems strange" rus={isUK ? 'Це здається дивним' : 'Это кажется странным'} />,
    <Example key="e26" t={t} f={f} eng="She seems tired" rus={isUK ? 'Вона здається втомленою' : 'Она кажется уставшей'} />,
    <Warn key="w_seem" t={t} f={f} text={isUK ? '❌ «It seems strangely» → ✅ «It seems strange». Після seem — прикметник, не прислівник.' : '❌ «It seems strangely» → ✅ «It seems strange». После seem — прилагательное, не наречие.'} />,
  ],
},

// ── УРОК 4 ──────────────────────────────────────────────────
4: {
  titleRU: 'Present Simple: отрицания',
  titleUK: 'Present Simple: заперечення',
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Як побудувати заперечення' : '1. Как построить отрицание'} />,
    <Body key="b1a" t={t} f={f} text={isUK ? 'Для заперечення у Present Simple використовуємо do not (don\'t) або does not (doesn\'t). Самостійно дієслово НЕ змінюємо — воно стоїть у базовій формі.' : 'Для отрицания в Present Simple используем do not (don\'t) или does not (doesn\'t). Сам глагол НЕ меняем — он стоит в базовой форме.'} />,
    <Body key="b1b" t={t} f={f} text={isUK ? 'Підмет I, you, we, they: don\'t + дієслово.' : 'Подлежащее I, you, we, they: don\'t + глагол.'} />,
    <Example key="e1" t={t} f={f} eng="I do not drink milk" rus={isUK ? 'Я не п\'ю молоко' : 'Я не пью молоко'} />,
    <Example key="e2" t={t} f={f} eng="You do not listen" rus={isUK ? 'Ти не слухаєш' : 'Ты не слушаешь'} />,
    <Example key="e3" t={t} f={f} eng="We do not understand" rus={isUK ? 'Ми не розуміємо' : 'Мы не понимаем'} />,
    <Example key="e4" t={t} f={f} eng="They do not live here" rus={isUK ? 'Вони тут не живуть' : 'Они здесь не живут'} />,
    <Body key="b1c" t={t} f={f} text={isUK ? 'Підмет he, she, it: doesn\'t + дієслово. Зверни увагу: -s вже є в doesn\'t, тож дієслово без -s.' : 'Подлежащее he, she, it: doesn\'t + глагол. Важно: -s уже есть в doesn\'t, поэтому глагол без -s.'} />,
    <Example key="e5" t={t} f={f} eng="He does not smoke" rus={isUK ? 'Він не курить' : 'Он не курит'} />,
    <Example key="e6" t={t} f={f} eng="She does not eat sugar" rus={isUK ? 'Вона не їсть цукор' : 'Она не ест сахар'} />,
    <Example key="e7" t={t} f={f} eng="It does not work" rus={isUK ? 'Це не працює' : 'Это не работает'} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Головна пастка' : '2. Главная ловушка'} />,
    <Body key="b2a" t={t} f={f} text={isUK ? 'Коли є doesn\'t — дієслово повертається до базової форми. Без -s, без -es.' : 'Когда есть doesn\'t — глагол возвращается к базовой форме. Без -s, без -es.'} />,
    <Warn key="w1" t={t} f={f} text={isUK ? '❌ «She doesn\'t eats sugar» → ✅ «She doesn\'t eat sugar». -s вже в doesn\'t.' : '❌ «She doesn\'t eats sugar» → ✅ «She doesn\'t eat sugar». -s уже в doesn\'t.'} />,
    <Warn key="w2" t={t} f={f} text={isUK ? '❌ «He don\'t smoke» → ✅ «He doesn\'t smoke». Для he, she, it — doesn\'t, не don\'t.' : '❌ «He don\'t smoke» → ✅ «He doesn\'t smoke». Для he, she, it пиши doesn\'t, а не don\'t.'} />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Таблиця' : '3. Таблица'} />,
    <Table key="t1" t={t} f={f} rows={[
      [isUK ? 'Підмет' : 'Подлежащее', isUK ? 'Заперечення' : 'Отрицание', isUK ? 'Приклад' : 'Пример'],
      ['I / You / We / They', "don't + V", "I don't drink milk"],
      ['He / She / It', "doesn't + V", "She doesn't eat sugar"],
    ]} />,
    <Tip key="tip1" t={t} f={f} text={isUK ? 'Лайфхак: doesn\'t = does + not. «Does» вже містить -s за he/she/it, тому дієслово чисте.' : 'Лайфхак: doesn\'t = does + not. «Does» уже содержит -s за he/she/it, поэтому глагол чистый.'} />,
  ],
},

// ── УРОК 5 ──────────────────────────────────────────────────
5: {
  titleRU: 'Present Simple: вопросы',
  titleUK: 'Present Simple: питання',
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Як побудувати питання' : '1. Как построить вопрос'} />,
    <Body key="b1a" t={t} f={f} text={isUK ? 'У Present Simple питання будується за допомогою Do або Does на початку. Саме дієслово стоїть у базовій формі.' : 'В Present Simple вопрос строится с помощью Do или Does в начале. Само действие стоит в базовой форме.'} />,
    <Body key="b1b" t={t} f={f} text={isUK ? 'З I / You / We / They → Do + підмет + дієслово?' : 'С I / You / We / They → Do + подлежащее + глагол?'} />,
    <Example key="e1" t={t} f={f} eng="Do you drink coffee?" rus={isUK ? 'Ти п\'єш каву?' : 'Ты пьёшь кофе?'} />,
    <Example key="e2" t={t} f={f} eng="Do we work tomorrow?" rus={isUK ? 'Ми завтра працюємо?' : 'Мы работаем завтра?'} />,
    <Example key="e3" t={t} f={f} eng="Do they know the password?" rus={isUK ? 'Вони знають пароль?' : 'Они знают пароль?'} />,
    <Body key="b1c" t={t} f={f} text={isUK ? 'З He / She / It → Does + підмет + дієслово? Дієслово — без -s.' : 'С He / She / It → Does + подлежащее + глагол? Глагол — без -s.'} />,
    <Example key="e4" t={t} f={f} eng="Does he live here?" rus={isUK ? 'Він тут живе?' : 'Он здесь живет?'} />,
    <Example key="e5" t={t} f={f} eng="Does she understand English?" rus={isUK ? 'Вона розуміє англійську?' : 'Она понимает английский?'} />,
    <Example key="e6" t={t} f={f} eng="Does it cost much?" rus={isUK ? 'Це коштує багато?' : 'Это стоит много?'} />,
    <Warn key="w1" t={t} f={f} text={isUK ? '❌ «Does he lives here?» → ✅ «Does he live here?». Після Does — базова форма без -s.' : '❌ «Does he lives here?» → ✅ «Does he live here?». После Does — базовая форма без -s.'} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Короткі відповіді' : '2. Краткие ответы'} />,
    <Table key="t1" t={t} f={f} rows={[
      [isUK ? 'Питання' : 'Вопрос', isUK ? 'Так' : 'Да', isUK ? 'Ні' : 'Нет'],
      ['Do you drink coffee?', 'Yes, I do.', "No, I don't."],
      ['Does he live here?', 'Yes, he does.', "No, he doesn't."],
      ['Do they know?', 'Yes, they do.', "No, they don't."],
    ]} />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Питання з Do I...' : '3. Вопрос с Do I...'} />,
    <Body key="b3a" t={t} f={f} text={isUK ? 'Do I...? — питання про себе. Звучить трохи незвично, але граматично вірно.' : 'Do I...? — вопрос о себе. Звучит немного непривычно, но грамматически верно.'} />,
    <Example key="e7" t={t} f={f} eng="Do I write correctly?" rus={isUK ? 'Я правильно пишу?' : 'Я правильно пишу?'} />,
    <Example key="e8" t={t} f={f} eng="Do I look tired?" rus={isUK ? 'Я виглядаю втомленим?' : 'Я выгляжу уставшим?'} />,
    <Tip key="tip1" t={t} f={f} text={isUK ? 'Do/Does — це службові слова. Вони несуть питання, а основне дієслово несе сенс. Розділяй ці ролі.' : 'Do/Does — это служебные слова. Они несут вопрос, а основной глагол несёт смысл. Разделяй эти роли.'} />,
  ],
},

// ── УРОК 6 ──────────────────────────────────────────────────
6: {
  titleRU: 'Вопросительные слова',
  titleUK: 'Питальні слова',
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Питальні слова + Do/Does' : '1. Вопросительные слова + Do/Does'} />,
    <Body key="b1a" t={t} f={f} text={isUK ? 'Щоб спитати «де», «коли», «чому» тощо — ставимо питальне слово на перше місце, а потім Do/Does + підмет + дієслово.' : 'Чтобы спросить «где», «когда», «почему» — ставим вопросительное слово на первое место, а потом Do/Does + подлежащее + глагол.'} />,
    <Body key="b1b" t={t} f={f} text={isUK ? 'Схема: Питальне слово + do/does + підмет + дієслово?' : 'Схема: Вопросительное слово + do/does + подлежащее + глагол?'} />,
    <Table key="t1" t={t} f={f} rows={[
      [isUK ? 'Слово' : 'Слово', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
      ['Where', isUK ? 'де / куди' : 'где / куда', 'Where do you live?'],
      ['What', isUK ? 'що / який' : 'что / какой', 'What does he eat?'],
      ['When', isUK ? 'коли' : 'когда', 'When do we start?'],
      ['Why', isUK ? 'чому' : 'почему', 'Why does she cry?'],
      ['How', isUK ? 'як' : 'как', 'How do they work?'],
      ['How much', isUK ? 'скільки (гроші)' : 'сколько (деньги)', 'How much does it cost?'],
    ]} />,
    <Example key="e1" t={t} f={f} eng="Where do you live?" rus={isUK ? 'Де ти живеш?' : 'Где ты живёшь?'} />,
    <Example key="e2" t={t} f={f} eng="What does he eat?" rus={isUK ? 'Що він їсть?' : 'Что он ест?'} />,
    <Example key="e3" t={t} f={f} eng="When does she call?" rus={isUK ? 'Коли вона дзвонить?' : 'Когда она звонит?'} />,
    <Example key="e4" t={t} f={f} eng="How much does it cost?" rus={isUK ? 'Скільки це коштує?' : 'Сколько это стоит?'} />,
    <Example key="e5" t={t} f={f} eng="Why do we wait?" rus={isUK ? 'Чому ми чекаємо?' : 'Почему мы ждём?'} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Як звучить відповідь' : '2. Как звучит ответ'} />,
    <Body key="b2a" t={t} f={f} text={isUK ? 'На питання з питальним словом не кажуть «yes» або «no» — дають повну відповідь.' : 'На вопрос с вопросительным словом не говорят «yes» или «no» — дают полный ответ.'} />,
    <Example key="e6" t={t} f={f} eng="Where does he go? — He goes to work." rus={isUK ? 'Куди він іде? — Він іде на роботу.' : 'Куда он идёт? — Он идёт на работу.'} />,
    <Warn key="w1" t={t} f={f} text={isUK ? '❌ «Where does she goes?» → ✅ «Where does she go?». Після does — базова форма.' : '❌ «Where does she goes?» → ✅ «Where does she go?». После does — базовая форма.'} />,
    <Tip key="tip1" t={t} f={f} text={isUK ? 'How do you pronounce it? — дуже корисна фраза. Запам\'ятай її цілою.' : 'How do you pronounce it? — очень полезная фраза. Запомни её целиком.'} />,
  ],
},

// ── УРОК 7 ──────────────────────────────────────────────────
7: {
  titleRU: 'Have / Has',
  titleUK: 'Have / Has',
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Have і Has — що це' : '1. Have и Has — что это'} />,
    <Body key="b1a" t={t} f={f} text={isUK ? 'Have / Has означає «мати» — щось належить тобі або є у тебе. Це не дія, а стан.' : 'Have / Has означает «иметь» — что-то принадлежит тебе или есть у тебя. Это не действие, а состояние.'} />,
    <Body key="b1b" t={t} f={f} text={isUK ? 'З I / You / We / They → have. З He / She / It → has.' : 'С I / You / We / They → have. С He / She / It → has.'} />,
    <Example key="e1" t={t} f={f} eng="I have insurance" rus={isUK ? 'У мене є страховка' : 'У меня есть страховка'} />,
    <Example key="e2" t={t} f={f} eng="He has a driver's license" rus={isUK ? 'У нього є права' : 'У него есть права'} />,
    <Example key="e3" t={t} f={f} eng="We have free time" rus={isUK ? 'У нас є вільний час' : 'У нас есть свободное время'} />,
    <Example key="e4" t={t} f={f} eng="She has a tablet" rus={isUK ? 'У неї є планшет' : 'У неё есть планшет'} />,
    <Example key="e5" t={t} f={f} eng="They have a reservation" rus={isUK ? 'У них є бронь' : 'У них есть бронь'} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Заперечення і питання' : '2. Отрицание и вопрос'} />,
    <Body key="b2a" t={t} f={f} text={isUK ? 'Заперечення: don\'t have / doesn\'t have або haven\'t got / hasn\'t got. Питання: Do you have...? / Does she have...?' : 'Отрицание: don\'t have / doesn\'t have или haven\'t got / hasn\'t got. Вопрос: Do you have...? / Does she have...?'} />,
    <Example key="e6" t={t} f={f} eng="They do not have chargers" rus={isUK ? 'У них немає зарядок' : 'У них нет зарядок'} />,
    <Warn key="w1" t={t} f={f} text={isUK ? '❌ «He have a pass» → ✅ «He has a pass». З he/she/it — has, не have.' : '❌ «He have a pass» → ✅ «He has a pass». С he/she/it — has, не have.'} />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Артикль a / an перед тим що маєш' : '3. Артикль a / an перед тем что имеешь'} />,
    <Body key="b3a" t={t} f={f} text={isUK ? 'Коли ти кажеш що в тебе є щось одне — перед словом стоїть a або an. Перед голосним звуком — an.' : 'Когда говоришь что у тебя есть что-то одно — перед словом стоит a или an. Перед гласным звуком — an.'} />,
    <Example key="e7" t={t} f={f} eng="I have a passport" rus={isUK ? 'У мене є паспорт' : 'У меня есть паспорт'} />,
    <Example key="e8" t={t} f={f} eng="He has a first-aid kit" rus={isUK ? 'У нього є аптечка' : 'У него есть аптечка'} />,
    <Example key="e9" t={t} f={f} eng="She has an allergy" rus={isUK ? 'У неї алергія' : 'У неё аллергия'} />,
    <Tip key="tip1" t={t} f={f} text={isUK ? 'an — перед словами що починаються з голосного ЗВУКУ: an allergy, an umbrella, an hour (h тут не вимовляється).' : 'an — перед словами начинающимися с гласного ЗВУКА: an allergy, an umbrella, an hour (h здесь не произносится).'} />,
  ],
},

// ── УРОК 8 ──────────────────────────────────────────────────
8: {
  titleRU: 'Предлоги времени: at, in, on',
  titleUK: 'Прийменники часу: at, in, on',
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Три прийменники — три рівні часу' : '1. Три предлога — три уровня времени'} />,
    <Body key="b1a" t={t} f={f} text={isUK ? 'at, in, on — кожен відповідає за свій «рівень» часу. Запам\'ятай просту логіку: at — точка, in — великий період, on — конкретний день.' : 'at, in, on — каждый отвечает за свой «уровень» времени. Запомни простую логику: at — точка, in — большой период, on — конкретный день.'} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. AT — точний час і особливі моменти' : '2. AT — точное время и особые моменты'} />,
    <Body key="b2a" t={t} f={f} text={isUK ? 'at — для точного часу на годиннику і для особливих точок доби.' : 'at — для точного времени на часах и для особых точек дня.'} />,
    <Example key="e1" t={t} f={f} eng="She leaves at eight o'clock" rus={isUK ? 'Вона виходить о восьмій' : 'Она уходит в восемь часов'} />,
    <Example key="e2" t={t} f={f} eng="He has a meeting at noon" rus={isUK ? 'У нього нарада опівдні' : 'У него встреча в полдень'} />,
    <Example key="e3" t={t} f={f} eng="I drink coffee at noon" rus={isUK ? 'Я п\'ю каву опівдні' : 'Я пью кофе в полдень'} />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. IN — місяці, сезони, частини доби, роки' : '3. IN — месяцы, сезоны, части суток, годы'} />,
    <Body key="b3a" t={t} f={f} text={isUK ? 'in — для великих проміжків: місяців, сезонів, частин доби (morning/evening), років.' : 'in — для больших промежутков: месяцев, сезонов, частей суток (morning/evening), лет.'} />,
    <Example key="e4" t={t} f={f} eng="We rest in July" rus={isUK ? 'Ми відпочиваємо в липні' : 'Мы отдыхаем в июле'} />,
    <Example key="e5" t={t} f={f} eng="We travel in winter" rus={isUK ? 'Ми подорожуємо взимку' : 'Мы путешествуем зимой'} />,
    <Example key="e6" t={t} f={f} eng="They call in the morning" rus={isUK ? 'Вони телефонують вранці' : 'Они звонят утром'} />,
    <Example key="e7" t={t} f={f} eng="They walk in the evening" rus={isUK ? 'Вони гуляють ввечері' : 'Они гуляют вечером'} />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. ON — дні тижня і конкретні дати' : '4. ON — дни недели и конкретные даты'} />,
    <Body key="b4a" t={t} f={f} text={isUK ? 'on — для днів тижня і конкретних дат.' : 'on — для дней недели и конкретных дат.'} />,
    <Example key="e8" t={t} f={f} eng="I work on Monday" rus={isUK ? 'Я працюю в понеділок' : 'Я работаю в понедельник'} />,
    <Example key="e9" t={t} f={f} eng="He pays on the weekend" rus={isUK ? 'Він платить у вихідні' : 'Он платит в выходные'} />,
    <Example key="e10" t={t} f={f} eng="We do sport on Tuesdays" rus={isUK ? 'Ми займаємось спортом по вівторках' : 'Мы занимаемся спортом по вторникам'} />,
    <Table key="t1" t={t} f={f} rows={[
      [isUK ? 'Прийменник' : 'Предлог', isUK ? 'Коли використовувати' : 'Когда использовать', isUK ? 'Приклад' : 'Пример'],
      ['at', isUK ? 'точний час, noon, midnight, night' : 'точное время, noon, midnight, night', 'at 8, at noon'],
      ['in', isUK ? 'місяць, сезон, рік, ранок/вечір' : 'месяц, сезон, год, утро/вечер', 'in July, in winter, in the morning'],
      ['on', isUK ? 'день тижня, дата, вихідні' : 'день недели, дата, выходные', 'on Monday, on the weekend'],
    ]} />,
    <Warn key="w1" t={t} f={f} text={isUK ? '❌ «in Monday» / «at July» → ✅ «on Monday» / «in July». Запам\'ятай: on для днів, in для місяців.' : '❌ «in Monday» / «at July» → ✅ «on Monday» / «in July». Запомни: on для дней, in для месяцев.'} />,
  ],
},

// ── УРОК 9 ──────────────────────────────────────────────────
9: {
  titleRU: 'There is / There are',
  titleUK: 'There is / There are',
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що означає There is / There are' : '1. Что означает There is / There are'} />,
    <Body key="b1a" t={t} f={f} text={isUK ? 'There is / There are — це спосіб сказати що щось існує або знаходиться десь. По-українськи/По-російськи: «є», «існує», «знаходиться».' : 'There is / There are — это способ сказать что что-то существует или находится где-то. По-русски: «есть», «существует», «находится».'} />,
    <Body key="b1b" t={t} f={f} text={isUK ? 'There is — з одниною (один предмет). There are — з множиною (кілька предметів).' : 'There is — с единственным числом (один предмет). There are — с множественным числом (несколько предметов).'} />,
    <Example key="e1" t={t} f={f} eng="There is a bed in my room" rus={isUK ? 'У моїй кімнаті є ліжко' : 'В моей комнате есть кровать'} />,
    <Example key="e2" t={t} f={f} eng="There are some keys in the bag" rus={isUK ? 'У сумці є якісь ключі' : 'В сумке есть ключи'} />,
    <Example key="e3" t={t} f={f} eng="There is a pharmacy at the airport" rus={isUK ? 'В аеропорту є аптека' : 'В аэропорту есть аптека'} />,
    <Example key="e4" t={t} f={f} eng="There are many cars on the street" rus={isUK ? 'На вулиці багато машин' : 'На улице много машин'} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Some і Many / Much' : '2. Some и Many / Much'} />,
    <Body key="b2a" t={t} f={f} text={isUK ? 'some — «кілька, деякі» (стверджувальні речення). many — «багато» для лічильних предметів. much — «багато» для нелічильних.' : 'some — «несколько, некоторые» (утвердительные). many — «много» для счётных предметов. much — «много» для несчётных.'} />,
    <Example key="e5" t={t} f={f} eng="There are some photos on my wall" rus={isUK ? 'На моїй стіні є кілька фото' : 'На моей стене есть несколько фото'} />,
    <Example key="e6" t={t} f={f} eng="There are many trees in our street" rus={isUK ? 'На нашій вулиці багато дерев' : 'На нашей улице много деревьев'} />,
    <Example key="e7" t={t} f={f} eng="There is some milk in the fridge" rus={isUK ? 'У холодильнику є молоко' : 'В холодильнике есть молоко'} />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Заперечення і питання' : '3. Отрицание и вопрос'} />,
    <Body key="b3a" t={t} f={f} text={isUK ? 'Заперечення: There is not (isn\'t) / There are not (aren\'t). Питання: Is there...? / Are there...?' : 'Отрицание: There is not (isn\'t) / There are not (aren\'t). Вопрос: Is there...? / Are there...?'} />,
    <Example key="e8" t={t} f={f} eng="Is there a gym in our hotel?" rus={isUK ? 'У нашому готелі є спортзал?' : 'В нашем отеле есть спортзал?'} />,
    <Tip key="tip1" t={t} f={f} text={isUK ? 'There на початку — це не «там». Це службове слово. «There» у значенні місця: «He is over there» — ось там.' : 'There в начале — это не «там». Это служебное слово. «There» в значении места: «He is over there» — вон там.'} />,
    <Warn key="w1" t={t} f={f} text={isUK ? '❌ «There are a bed» → ✅ «There is a bed». Одне ліжко — is, не are.' : '❌ «There are a bed» → ✅ «There is a bed». Одна кровать — is, не are.'} />,
  ],
},

// ── УРОК 10 ──────────────────────────────────────────────────
10: {
  titleRU: 'Модальные глаголы: can / must',
  titleUK: 'Модальні дієслова: can / must',
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що таке модальні дієслова' : '1. Что такое модальные глаголы'} />,
    <Body key="b1a" t={t} f={f} text={isUK ? 'Can і must — особливі дієслова. Вони не описують дію, а говорять про можливість або обов\'язок. Після них завжди стоїть базова форма дієслова.' : 'Can и must — особые глаголы. Они не описывают действие, а говорят о возможности или обязанности. После них всегда стоит базовая форма глагола.'} />,
    <Body key="b1b" t={t} f={f} text={isUK ? 'Головне правило: can і must не змінюються. Ніякого -s для he/she/it.' : 'Главное правило: can и must не меняются. Никакого -s для he/she/it.'} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. CAN — можу, вмію' : '2. CAN — могу, умею'} />,
    <Example key="e1" t={t} f={f} eng="I can translate this document" rus={isUK ? 'Я можу перекласти цей документ' : 'Я могу перевести этот документ'} />,
    <Example key="e2" t={t} f={f} eng="He can fix my computer" rus={isUK ? 'Він може полагодити мій комп\'ютер' : 'Он может починить мой компьютер'} />,
    <Example key="e3" t={t} f={f} eng="She can drive a truck" rus={isUK ? 'Вона вміє водити вантажівку' : 'Она умеет водить грузовик'} />,
    <Example key="e4" t={t} f={f} eng="You can use my password" rus={isUK ? 'Ти можеш використовувати мій пароль' : 'Ты можешь использовать мой пароль'} />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. MUST — мушу, треба' : '3. MUST — должен, нужно'} />,
    <Example key="e5" t={t} f={f} eng="You must sign these papers" rus={isUK ? 'Ти мусиш підписати ці папери' : 'Ты должен подписать эти бумаги'} />,
    <Example key="e6" t={t} f={f} eng="We must come on time" rus={isUK ? 'Ми повинні прийти вчасно' : 'Мы должны прийти вовремя'} />,
    <Example key="e7" t={t} f={f} eng="She must check her email" rus={isUK ? 'Вона повинна перевірити пошту' : 'Она должна проверить почту'} />,
    <Example key="e8" t={t} f={f} eng="They must pay rent every month" rus={isUK ? 'Вони мусять платити оренду щомісяця' : 'Они должны платить аренду каждый месяц'} />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. Заперечення і питання' : '4. Отрицание и вопрос'} />,
    <Body key="b4a" t={t} f={f} text={isUK ? 'Can not (can\'t) = не можу. Must not (mustn\'t) = не можна (заборона). Питання: Can you...? / Must we...?' : 'Can not (can\'t) = не могу. Must not (mustn\'t) = нельзя (запрет). Вопрос: Can you...? / Must we...?'} />,
    <Warn key="w1" t={t} f={f} text={isUK ? '❌ «She cans drive» → ✅ «She can drive». Can ніколи не отримує -s.' : '❌ «She cans drive» → ✅ «She can drive». Can никогда не получает -s.'} />,
    <Warn key="w2" t={t} f={f} text={isUK ? '❌ «I can to fix it» → ✅ «I can fix it». Після can — базова форма БЕЗ to.' : '❌ «I can to fix it» → ✅ «I can fix it». После can — базовая форма БЕЗ to.'} />,
    <Tip key="tip1" t={t} f={f} text={isUK ? 'Can\'t must — це заборона і обов\'язок разом? Ні. Це два різних слова: can\'t = не можу, mustn\'t = не можна.' : 'Can\'t must — это запрет и обязанность вместе? Нет. Это два разных слова: can\'t = не могу, mustn\'t = нельзя.'} />,
  ],
},

// ── УРОК 11 ──────────────────────────────────────────────────
11: {
  titleRU: 'Past Simple: правильные глаголы',
  titleUK: 'Past Simple: правильні дієслова',
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Past Simple — що це' : '1. Past Simple — что это'} />,
    <Body key="b1a" t={t} f={f} text={isUK ? 'Past Simple — це час для завершених дій у минулому. Важливо: дія вже закінчена. Часто є маркер часу: yesterday, last week, two hours ago, this morning.' : 'Past Simple — это время для завершённых действий в прошлом. Важно: действие уже закончено. Часто есть маркер времени: yesterday, last week, two hours ago, this morning.'} />,
    <Example key="e1" t={t} f={f} eng="I booked this table two hours ago" rus={isUK ? 'Я забронював цей стіл дві години тому' : 'Я забронировал этот стол два часа назад'} />,
    <Example key="e2" t={t} f={f} eng="We visited our friends last week" rus={isUK ? 'Ми відвідали друзів минулого тижня' : 'Мы навестили друзей на прошлой неделе'} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Як утворити: додаємо -ed' : '2. Как образовать: добавляем -ed'} />,
    <Body key="b2a" t={t} f={f} text={isUK ? 'Правильні дієслова отримують -ed для всіх осіб. Форма однакова — без змін для he/she/it.' : 'Правильные глаголы получают -ed для всех лиц. Форма одинакова — без изменений для he/she/it.'} />,
    <Table key="t1" t={t} f={f} rows={[
      [isUK ? 'Базова форма' : 'Базовая форма', 'Past Simple', isUK ? 'Приклад' : 'Пример'],
      ['book', 'booked', 'I booked this table'],
      ['visit', 'visited', 'We visited our friends'],
      ['clean', 'cleaned', 'I cleaned my shoes'],
      ['finish', 'finished', 'They finished this report'],
      ['check', 'checked', 'She checked our order'],
    ]} />,
    <Body key="b2b" t={t} f={f} text={isUK ? 'Якщо дієслово закінчується на -e — просто додаємо -d: save → saved, delete → deleted.' : 'Если глагол оканчивается на -e — просто добавляем -d: save → saved, delete → deleted.'} />,
    <Example key="e3" t={t} f={f} eng="You saved this document five minutes ago" rus={isUK ? 'Ти зберіг цей документ п\'ять хвилин тому' : 'Ты сохранил этот документ пять минут назад'} />,
    <Example key="e4" t={t} f={f} eng="He deleted that file two hours ago" rus={isUK ? 'Він видалив той файл дві години тому' : 'Он удалил тот файл два часа назад'} />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Заперечення і питання' : '3. Отрицание и вопрос'} />,
    <Body key="b3a" t={t} f={f} text={isUK ? 'Заперечення: did not (didn\'t) + базова форма. Питання: Did + підмет + базова форма?' : 'Отрицание: did not (didn\'t) + базовая форма. Вопрос: Did + подлежащее + базовая форма?'} />,
    <Body key="b3b" t={t} f={f} text={isUK ? 'Важливо: після did/didn\'t — базова форма БЕЗ -ed.' : 'Важно: после did/didn\'t — базовая форма БЕЗ -ed.'} />,
    <Warn key="w1" t={t} f={f} text={isUK ? '❌ «Did you booked it?» → ✅ «Did you book it?». Після Did — базова форма.' : '❌ «Did you booked it?» → ✅ «Did you book it?». После Did — базовая форма.'} />,
    <Tip key="tip1" t={t} f={f} text={isUK ? 'Маркери Past Simple: yesterday, last (week/month/year), ago, this morning, on Monday — шукай їх у реченні.' : 'Маркеры Past Simple: yesterday, last (week/month/year), ago, this morning, on Monday — ищи их в предложении.'} />,
  ],
},

// ── УРОК 12 ──────────────────────────────────────────────────
12: {
  titleRU: 'Past Simple: неправильные глаголы',
  titleUK: 'Past Simple: неправильні дієслова',
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Чому є неправильні дієслова' : '1. Почему есть неправильные глаголы'} />,
    <Body key="b1a" t={t} f={f} text={isUK ? 'Деякі дієслова в минулому часі не беруть -ed — вони просто змінюють свою форму. Ці форми треба запам\'ятати — логіки немає, є тільки практика.' : 'Некоторые глаголы в прошедшем времени не берут -ed — они просто меняют свою форму. Эти формы нужно запомнить — логики нет, есть только практика.'} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Дієслова з цього уроку' : '2. Глаголы из этого урока'} />,
    <Table key="t1" t={t} f={f} rows={[
      [isUK ? 'Базова форма' : 'Базовая форма', 'Past Simple', isUK ? 'Приклад' : 'Пример'],
      ['buy', 'bought', 'I bought this fresh bread yesterday'],
      ['find', 'found', 'We found your keys this morning'],
      ['sell', 'sold', 'They sold that old boat last month'],
      ['send', 'sent', 'You sent that important parcel'],
      ['eat', 'ate', 'They ate that delicious cake'],
      ['see', 'saw', 'You saw that old photo'],
      ['build', 'built', 'We built this new fence'],
      ['write', 'wrote', 'I wrote that long letter'],
      ['bring', 'brought', 'She brought your blue bag'],
      ['give', 'gave', 'They gave me that useful advice'],
      ['drink', 'drank', 'You drank that cold juice'],
      ['forget', 'forgot', 'She forgot her new umbrella'],
      ['hear', 'heard', 'We heard that strange noise'],
      ['spend', 'spent', 'They spent all their money'],
      ['lose', 'lost', 'She lost her old wallet'],
      ['tell', 'told', 'You told me that funny story'],
      ['read', 'read', 'You read that interesting article'],
    ]} />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Заперечення і питання — тільки базова форма' : '3. Отрицание и вопрос — только базовая форма'} />,
    <Body key="b3a" t={t} f={f} text={isUK ? 'З didn\'t і Did — завжди базова форма. Не bought, не found — а buy, find.' : 'С didn\'t и Did — всегда базовая форма. Не bought, не found — а buy, find.'} />,
    <Warn key="w1" t={t} f={f} text={isUK ? '❌ «I didn\'t bought it» → ✅ «I didn\'t buy it». Після didn\'t — чиста форма.' : '❌ «I didn\'t bought it» → ✅ «I didn\'t buy it». После didn\'t — чистая форма.'} />,
    <Warn key="w2" t={t} f={f} text={isUK ? '❌ «Did she found it?» → ✅ «Did she find it?». Після Did — базова форма.' : '❌ «Did she found it?» → ✅ «Did she find it?». После Did — базовая форма.'} />,
    <Tip key="tip1" t={t} f={f} text={isUK ? 'read в минулому часі пишеться однаково — read, але вимовляється [red], а не [riːd].' : 'read в прошедшем времени пишется одинаково — read, но произносится [red], а не [riːd].'} />,
  ],
},

// ── УРОК 13 ──────────────────────────────────────────────────
13: {
  titleRU: 'Future Simple: will',
  titleUK: 'Future Simple: will',
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Will — майбутнє рішення або передбачення' : '1. Will — решение о будущем или предсказание'} />,
    <Body key="b1a" t={t} f={f} text={isUK ? 'Will використовується коли ми приймаємо рішення в момент мовлення, або говоримо про те що точно буде. Це найпростіший спосіб говорити про майбутнє.' : 'Will используется когда мы принимаем решение в момент речи, или говорим о том что точно будет. Это самый простой способ говорить о будущем.'} />,
    <Body key="b1b" t={t} f={f} text={isUK ? 'Will + базова форма дієслова. Для всіх осіб однаково — ніяких змін.' : 'Will + базовая форма глагола. Для всех лиц одинаково — никаких изменений.'} />,
    <Example key="e1" t={t} f={f} eng="I will call you tomorrow morning" rus={isUK ? 'Я подзвоню тобі завтра вранці' : 'Я позвоню тебе завтра утром'} />,
    <Example key="e2" t={t} f={f} eng="She will help us next week" rus={isUK ? 'Вона допоможе нам наступного тижня' : 'Она поможет нам на следующей неделе'} />,
    <Example key="e3" t={t} f={f} eng="They will buy that old house next year" rus={isUK ? 'Вони куплять той старий будинок наступного року' : 'Они купят тот старый дом в следующем году'} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Скорочення і маркери' : '2. Сокращения и маркеры'} />,
    <Body key="b2a" t={t} f={f} text={isUK ? 'Will скорочується до \'ll: I\'ll, She\'ll, They\'ll. Маркери майбутнього: tomorrow, next week/month/year, soon, later, in ten minutes.' : 'Will сокращается до \'ll: I\'ll, She\'ll, They\'ll. Маркеры будущего: tomorrow, next week/month/year, soon, later, in ten minutes.'} />,
    <Example key="e4" t={t} f={f} eng="He will send that long message in ten minutes" rus={isUK ? 'Він надішле те довге повідомлення за десять хвилин' : 'Он отправит то длинное сообщение через десять минут'} />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Заперечення і питання' : '3. Отрицание и вопрос'} />,
    <Body key="b3a" t={t} f={f} text={isUK ? 'Заперечення: will not = won\'t + базова форма. Питання: Will + підмет + базова форма?' : 'Отрицание: will not = won\'t + базовая форма. Вопрос: Will + подлежащее + базовая форма?'} />,
    <Warn key="w1" t={t} f={f} text={isUK ? '❌ «She will calls» → ✅ «She will call». Після will — завжди базова форма без -s.' : '❌ «She will calls» → ✅ «She will call». После will — всегда базовая форма без -s.'} />,
    <Tip key="tip1" t={t} f={f} text={isUK ? 'Will — для спонтанних рішень («Я допоможу тобі!»). Going to — для планів. В цьому уроці вчимо will.' : 'Will — для спонтанных решений («Я помогу тебе!»). Going to — для планов. В этом уроке учим will.'} />,
  ],
},

// ── УРОК 14 ──────────────────────────────────────────────────
14: {
  titleRU: 'Сравнительная и превосходная степень',
  titleUK: 'Порівняльний і найвищий ступінь',
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Порівняльний ступінь — «більш, ніж»' : '1. Сравнительная степень — «более, чем»'} />,
    <Body key="b1a" t={t} f={f} text={isUK ? 'Щоб порівняти два предмети — додаємо -er або ставимо more. Короткі прикметники (1-2 склади) → -er. Довгі (3+ склади) → more + прикметник.' : 'Чтобы сравнить два предмета — добавляем -er или ставим more. Короткие прилагательные (1-2 слога) → -er. Длинные (3+ слога) → more + прилагательное.'} />,
    <Example key="e1" t={t} f={f} eng="That old computer is much slower" rus={isUK ? 'Той старий комп\'ютер набагато повільніший' : 'Тот старый компьютер намного медленнее'} />,
    <Example key="e2" t={t} f={f} eng="You chose a more expensive car" rus={isUK ? 'Ти обрав дорожчу машину' : 'Ты выбрал более дорогую машину'} />,
    <Example key="e3" t={t} f={f} eng="She looks happier today" rus={isUK ? 'Вона виглядає щасливішою сьогодні' : 'Она выглядит счастливее сегодня'} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Найвищий ступінь — «найбільш»' : '2. Превосходная степень — «самый»'} />,
    <Body key="b2a" t={t} f={f} text={isUK ? 'Для найвищого ступеня: the + -est або the most + прикметник. Артикль the обов\'язковий.' : 'Для превосходной степени: the + -est или the most + прилагательное. Артикль the обязателен.'} />,
    <Example key="e4" t={t} f={f} eng="We bought the cheapest ticket" rus={isUK ? 'Ми купили найдешевший квиток' : 'Мы купили самый дешёвый билет'} />,
    <Example key="e5" t={t} f={f} eng="We found the shortest way" rus={isUK ? 'Ми знайшли найкоротший шлях' : 'Мы нашли самый короткий путь'} />,
    <Example key="e6" t={t} f={f} eng="She chose the most beautiful dress today" rus={isUK ? 'Вона обрала найкрасивішу сукню сьогодні' : 'Она выбрала самое красивое платье сегодня'} />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Неправильні форми' : '3. Неправильные формы'} />,
    <Table key="t1" t={t} f={f} rows={[
      [isUK ? 'Базова' : 'Базовая', isUK ? 'Порівняльна' : 'Сравнительная', isUK ? 'Найвища' : 'Превосходная'],
      ['good', 'better', 'the best'],
      ['bad', 'worse', 'the worst'],
      ['far', 'farther / further', 'the farthest / furthest'],
    ]} />,
    <Example key="e7" t={t} f={f} eng="I feel much better today" rus={isUK ? 'Я почуваюся набагато краще сьогодні' : 'Я чувствую себя намного лучше сегодня'} />,
    <Warn key="w1" t={t} f={f} text={isUK ? '❌ «more cheaper» / «the most cheapest» → ✅ «cheaper» / «the cheapest». Не подвоюй ступінь.' : '❌ «more cheaper» / «the most cheapest» → ✅ «cheaper» / «the cheapest». Не удваивай степень.'} />,
    <Tip key="tip1" t={t} f={f} text={isUK ? 'much + порівняльний = набагато: much better, much slower, much more interesting.' : 'much + сравнительная = намного: much better, much slower, much more interesting.'} />,
  ],
},

// ── УРОК 15 ──────────────────────────────────────────────────
15: {
  titleRU: 'Притяжательные местоимения',
  titleUK: 'Присвійні займенники',
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Два типи присвійних займенників' : '1. Два типа притяжательных местоимений'} />,
    <Body key="b1a" t={t} f={f} text={isUK ? 'Тип 1 — стоять перед іменником: my, your, his, her, its, our, their. Тип 2 — стоять самостійно, без іменника: mine, yours, his, hers, ours, theirs.' : 'Тип 1 — стоят перед существительным: my, your, his, her, its, our, their. Тип 2 — стоят самостоятельно, без существительного: mine, yours, his, hers, ours, theirs.'} />,
    <Table key="t1" t={t} f={f} rows={[
      [isUK ? 'Перед іменником' : 'Перед существительным', isUK ? 'Самостійно' : 'Самостоятельно'],
      ['my', 'mine'],
      ['your', 'yours'],
      ['his', 'his'],
      ['her', 'hers'],
      ['our', 'ours'],
      ['their', 'theirs'],
    ]} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Самостійні форми — без іменника після' : '2. Самостоятельные формы — без существительного после'} />,
    <Body key="b2a" t={t} f={f} text={isUK ? 'Самостійні форми використовуються коли зрозуміло про що мова і не треба повторювати іменник.' : 'Самостоятельные формы используются когда понятно о чём речь и не нужно повторять существительное.'} />,
    <Example key="e1" t={t} f={f} eng="That big black umbrella is mine" rus={isUK ? 'Той великий чорний парасоль — мій' : 'Тот большой чёрный зонт — мой'} />,
    <Example key="e2" t={t} f={f} eng="Those new leather gloves are hers" rus={isUK ? 'Ті нові шкіряні рукавички — її' : 'Те новые кожаные перчатки — её'} />,
    <Example key="e3" t={t} f={f} eng="This empty glass is yours" rus={isUK ? 'Цей порожній стакан — твій' : 'Этот пустой стакан — твой'} />,
    <Example key="e4" t={t} f={f} eng="This bright cozy house is ours" rus={isUK ? 'Цей світлий затишний будинок — наш' : 'Этот светлый уютный дом — наш'} />,
    <Warn key="w1" t={t} f={f} text={isUK ? '❌ «It\'s mine bag» → ✅ «It\'s my bag» або «The bag is mine». Mine — тільки самостійно.' : '❌ «It\'s mine bag» → ✅ «It\'s my bag» или «The bag is mine». Mine — только самостоятельно.'} />,
    <Tip key="tip1" t={t} f={f} text={isUK ? 'his однакова в обох типах: his car (перед іменником) і The car is his (самостійно).' : 'his одинакова в обоих типах: his car (перед существительным) и The car is his (самостоятельно).'} />,
  ],
},

// ── УРОК 16 ──────────────────────────────────────────────────
16: {
  titleRU: 'Фразовые глаголы',
  titleUK: 'Фразові дієслова',
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що таке фразове дієслово' : '1. Что такое фразовый глагол'} />,
    <Body key="b1a" t={t} f={f} text={isUK ? 'Фразове дієслово — це дієслово + прийменник або прислівник. Разом вони утворюють нове значення, яке часто не можна зрозуміти зі значення окремих слів.' : 'Фразовый глагол — это глагол + предлог или наречие. Вместе они образуют новое значение, которое часто нельзя понять из значений отдельных слов.'} />,
    <Body key="b1b" t={t} f={f} text={isUK ? 'Наприклад: wake + up = прокидатись. Turn + on = вмикати. Turn + off = вимикати. Частинка змінює все.' : 'Например: wake + up = просыпаться. Turn + on = включать. Turn + off = выключать. Частица меняет всё.'} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Фразові дієслова з цього уроку' : '2. Фразовые глаголы из этого урока'} />,
    <Table key="t1" t={t} f={f} rows={[
      [isUK ? 'Дієслово' : 'Глагол', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
      ['wake up', isUK ? 'прокидатись' : 'просыпаться', 'I usually wake up early'],
      ['put on', isUK ? 'надягати' : 'надевать', 'You always put on that warm coat'],
      ['take off', isUK ? 'знімати' : 'снимать', 'She takes off these shoes'],
      ['turn on', isUK ? 'вмикати' : 'включать', 'You often turn on that bright light'],
      ['turn off', isUK ? 'вимикати' : 'выключать', 'She always turns off this computer'],
      ['get up', isUK ? 'вставати' : 'вставать', 'We usually get up from this sofa'],
      ['look for', isUK ? 'шукати' : 'искать', 'He often looks for his lost keys'],
      ['get into', isUK ? 'сідати в (транспорт)' : 'садиться в (транспорт)', 'They sometimes get into that taxi'],
      ['get out of', isUK ? 'виходити з' : 'выходить из', 'I rarely get out of this building'],
      ['throw away', isUK ? 'викидати' : 'выбрасывать', 'We seldom throw away old magazines'],
    ]} />,
    <Example key="e1" t={t} f={f} eng="I usually wake up early in this bright room" rus={isUK ? 'Я зазвичай прокидаюся рано в цій світлій кімнаті' : 'Я обычно просыпаюсь рано в этой светлой комнате'} />,
    <Example key="e2" t={t} f={f} eng="She always turns off this noisy computer on time" rus={isUK ? 'Вона завжди вчасно вимикає цей шумний комп\'ютер' : 'Она всегда вовремя выключает этот шумный компьютер'} />,
    <Tip key="tip1" t={t} f={f} text={isUK ? 'Якщо об\'єкт — займенник (it, them), він стоїть між дієсловом і частинкою: turn it off, put them on.' : 'Если объект — местоимение (it, them), оно стоит между глаголом и частицей: turn it off, put them on.'} />,
  ],
},

// ── УРОК 17 ──────────────────────────────────────────────────
17: {
  titleRU: 'Present Continuous',
  titleUK: 'Present Continuous',
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що таке Present Continuous' : '1. Что такое Present Continuous'} />,
    <Body key="b1a" t={t} f={f} text={isUK ? 'Present Continuous — це час для дій які відбуваються прямо зараз, у цей момент. Не взагалі, не завжди — а саме зараз.' : 'Present Continuous — это время для действий которые происходят прямо сейчас, в этот момент. Не вообще, не всегда — а именно сейчас.'} />,
    <Body key="b1b" t={t} f={f} text={isUK ? 'Формула: am / is / are + дієслово-ing.' : 'Формула: am / is / are + глагол-ing.'} />,
    <Example key="e1" t={t} f={f} eng="I am cooking this delicious dinner in the kitchen now" rus={isUK ? 'Я зараз готую цю смачну вечерю на кухні' : 'Я сейчас готовлю этот вкусный ужин на кухне'} />,
    <Example key="e2" t={t} f={f} eng="He is repairing his old bicycle in the garage now" rus={isUK ? 'Він зараз ремонтує свій старий велосипед у гаражі' : 'Он сейчас ремонтирует свой старый велосипед в гараже'} />,
    <Example key="e3" t={t} f={f} eng="We are watching that new show on TV now" rus={isUK ? 'Ми зараз дивимося те нове шоу по телевізору' : 'Мы сейчас смотрим то новое шоу по телевизору'} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Як додати -ing' : '2. Как добавить -ing'} />,
    <Body key="b2a" t={t} f={f} text={isUK ? 'Зазвичай просто додаємо -ing. Якщо дієслово закінчується на -e — прибираємо -e і додаємо -ing: write → writing, cook → cooking.' : 'Обычно просто добавляем -ing. Если глагол оканчивается на -e — убираем -e и добавляем -ing: write → writing, cook → cooking.'} />,
    <Table key="t1" t={t} f={f} rows={[
      [isUK ? 'Дієслово' : 'Глагол', '-ing форма'],
      ['cook', 'cooking'], ['write', 'writing'], ['repair', 'repairing'],
      ['discuss', 'discussing'], ['watch', 'watching'], ['translate', 'translating'],
    ]} />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Маркери і заперечення/питання' : '3. Маркеры и отрицание/вопрос'} />,
    <Body key="b3a" t={t} f={f} text={isUK ? 'Маркери: now, at the moment, at this moment, right now. Заперечення: am/is/are not + -ing. Питання: Am/Is/Are + підмет + -ing?' : 'Маркеры: now, at the moment, at this moment, right now. Отрицание: am/is/are not + -ing. Вопрос: Am/Is/Are + подлежащее + -ing?'} />,
    <Example key="e4" t={t} f={f} eng="She is writing this important email to her boss now" rus={isUK ? 'Вона зараз пише цього важливого листа своєму начальнику' : 'Она сейчас пишет это важное письмо своему начальнику'} />,
    <Warn key="w1" t={t} f={f} text={isUK ? '❌ «I am cook dinner» → ✅ «I am cooking dinner». Після am/is/are — тільки -ing форма.' : '❌ «I am cook dinner» → ✅ «I am cooking dinner». После am/is/are — только -ing форма.'} />,
    <Tip key="tip1" t={t} f={f} text={isUK ? 'Present Simple = факт/звичка (She cooks dinner every day). Present Continuous = зараз (She is cooking dinner now).' : 'Present Simple = факт/привычка (She cooks dinner every day). Present Continuous = сейчас (She is cooking dinner now).'} />,
  ],
},

// ── УРОК 18 ──────────────────────────────────────────────────
18: {
  titleRU: 'Повелительное наклонение',
  titleUK: 'Наказовий спосіб',
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Як давати команди і прохання' : '1. Как давать команды и просьбы'} />,
    <Body key="b1a" t={t} f={f} text={isUK ? 'Наказовий спосіб — це дуже просто. Береш базову форму дієслова і кажеш її без підмета. Підмет «ти/ви» зрозумілий з контексту.' : 'Повелительное наклонение — это очень просто. Берёшь базовую форму глагола и говоришь её без подлежащего. Подлежащее «ты/вы» понятно из контекста.'} />,
    <Example key="e1" t={t} f={f} eng="Pass that sharp knife to this young chef" rus={isUK ? 'Передай той гострий ніж цьому молодому кухарю' : 'Передай тот острый нож этому молодому повару'} />,
    <Example key="e2" t={t} f={f} eng="Pour that fresh orange juice into this clean glass" rus={isUK ? 'Налий той свіжий апельсиновий сік у цей чистий стакан' : 'Налей тот свежий апельсиновый сок в этот чистый стакан'} />,
    <Example key="e3" t={t} f={f} eng="Check that important information on this official page" rus={isUK ? 'Перевір ту важливу інформацію на цій офіційній сторінці' : 'Проверь ту важную информацию на этой официальной странице'} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Заперечення: Do not + дієслово' : '2. Отрицание: Do not + глагол'} />,
    <Body key="b2a" t={t} f={f} text={isUK ? 'Щоб заборонити дію: Do not (Don\'t) + базова форма.' : 'Чтобы запретить действие: Do not (Don\'t) + базовая форма.'} />,
    <Example key="e4" t={t} f={f} eng="Do not press that red button on this old panel" rus={isUK ? 'Не натискай ту червону кнопку на цій старій панелі' : 'Не нажимай ту красную кнопку на этой старой панели'} />,
    <Example key="e5" t={t} f={f} eng="Do not leave your heavy bags in that narrow corridor" rus={isUK ? 'Не залишай своїх важких сумок у тому вузькому коридорі' : 'Не оставляй свои тяжёлые сумки в том узком коридоре'} />,
    <Example key="e6" t={t} f={f} eng="Do not close that big window in this stuffy room" rus={isUK ? 'Не закривай те велике вікно в цій задушливій кімнаті' : 'Не закрывай то большое окно в этой душной комнате'} />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Let us — разом' : '3. Let us — вместе'} />,
    <Body key="b3a" t={t} f={f} text={isUK ? 'Let us (Let\'s) + базова форма — пропозиція зробити щось разом.' : 'Let us (Let\'s) + базовая форма — предложение сделать что-то вместе.'} />,
    <Example key="e7" t={t} f={f} eng="Let us discuss this new plan in that quiet office" rus={isUK ? 'Давайте обговоримо цей новий план у тому тихому офісі' : 'Давайте обсудим этот новый план в том тихом офисе'} />,
    <Example key="e8" t={t} f={f} eng="Let us buy that convenient map in this small shop" rus={isUK ? 'Давайте купимо ту зручну карту в цьому маленькому магазині' : 'Давайте купим ту удобную карту в этом маленьком магазине'} />,
    <Tip key="tip1" t={t} f={f} text={isUK ? 'Please робить прохання ввічливішим: Please, pass that knife. Please, do not close the window.' : 'Please делает просьбу вежливее: Please, pass that knife. Please, do not close the window.'} />,
  ],
},

// ── УРОК 19 ──────────────────────────────────────────────────
19: {
  titleRU: 'Предлоги места',
  titleUK: 'Прийменники місця',
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Прийменники місця — що це' : '1. Предлоги места — что это'} />,
    <Body key="b1a" t={t} f={f} text={isUK ? 'Прийменники місця показують де знаходиться предмет відносно іншого. В цьому уроці — повна карта: in, on, at, above, under, behind, in front of, between, among, opposite, near, inside.' : 'Предлоги места показывают где находится предмет относительно другого. В этом уроке — полная карта: in, on, at, above, under, behind, in front of, between, among, opposite, near, inside.'} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Основні прийменники' : '2. Основные предлоги'} />,
    <Table key="t1" t={t} f={f} rows={[
      [isUK ? 'Прийменник' : 'Предлог', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
      ['on', isUK ? 'на поверхні' : 'на поверхности', 'on that soft pillow'],
      ['in', isUK ? 'всередині' : 'внутри', 'in that wicker basket'],
      ['above', isUK ? 'над (без контакту)' : 'над (без контакта)', 'above this table'],
      ['under', isUK ? 'під' : 'под', 'under that wooden armchair'],
      ['behind', isUK ? 'позаду' : 'позади', 'behind that black door'],
      ['in front of', isUK ? 'перед' : 'перед', 'in front of that old garage'],
      ['between', isUK ? 'між (двома)' : 'между (двумя)', 'between that bank and that cafe'],
      ['among', isUK ? 'серед (багатьох)' : 'среди (многих)', 'among those green hills'],
      ['opposite', isUK ? 'навпроти' : 'напротив', 'opposite this big pharmacy'],
      ['near', isUK ? 'біля' : 'рядом, около', 'near that tall mirror'],
      ['inside', isUK ? 'всередині (акцент)' : 'внутри (акцент)', 'inside that leather briefcase'],
    ]} />,
    <Example key="e1" t={t} f={f} eng="That gray cat sleeps on that soft pillow in this corner" rus={isUK ? 'Той сірий кіт спить на тій м\'якій подушці в цьому кутку' : 'Тот серый кот спит на той мягкой подушке в этом углу'} />,
    <Example key="e2" t={t} f={f} eng="Those important documents lie inside that leather briefcase" rus={isUK ? 'Ті важливі документи лежать всередині того шкіряного портфеля' : 'Те важные документы лежат внутри того кожаного портфеля'} />,
    <Example key="e3" t={t} f={f} eng="Our new office is between that bank and that cafe" rus={isUK ? 'Наш новий офіс знаходиться між тим банком і тим кафе' : 'Наш новый офис находится между тем банком и тем кафе'} />,
    <Warn key="w1" t={t} f={f} text={isUK ? 'between — між ДВОМА речами. among — серед ТРЬОХ і більше. Не плутай.' : 'between — между ДВУМЯ вещами. among — среди ТРЁХ и более. Не путай.'} />,
  ],
},

// ── УРОК 20 ──────────────────────────────────────────────────
20: {
  titleRU: 'Артикли: a, an, the, —',
  titleUK: 'Артиклі: a, an, the, —',
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Навіщо артикль' : '1. Зачем артикль'} />,
    <Body key="b1a" t={t} f={f} text={isUK ? 'Артикль — це маленьке слово перед іменником яке показує: це щось нове для слухача (a/an) чи вже відоме (the), чи це взагалі без артикля (загальне поняття).' : 'Артикль — это маленькое слово перед существительным которое показывает: это что-то новое для слушателя (a/an) или уже известное (the), или это вообще без артикля (общее понятие).'} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. A / AN — вперше, один з багатьох' : '2. A / AN — впервые, один из многих'} />,
    <Body key="b2a" t={t} f={f} text={isUK ? 'a/an — коли згадуємо щось вперше або кажемо що це один з багатьох. a — перед приголосним звуком, an — перед голосним.' : 'a/an — когда упоминаем что-то впервые или говорим что это один из многих. a — перед согласным звуком, an — перед гласным.'} />,
    <Example key="e1" t={t} f={f} eng="I bought a new phone" rus={isUK ? 'Я купив новий телефон (якийсь, один)' : 'Я купил новый телефон (какой-то, один)'} />,
    <Example key="e2" t={t} f={f} eng="Do you see an enormous eagle?" rus={isUK ? 'Ти бачиш величезного орла?' : 'Ты видишь огромного орла?'} />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. THE — конкретний, вже відомий' : '3. THE — конкретный, уже известный'} />,
    <Body key="b3a" t={t} f={f} text={isUK ? 'the — коли обидва знають про що мова, коли це єдиний у своєму роді, або коли тільки-но згадали про щось і тепер уточнюємо.' : 'the — когда оба знают о чём речь, когда это единственное в своём роде, или когда только что упомянули что-то и теперь уточняем.'} />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. Нульовий артикль — загальні поняття' : '4. Нулевой артикль — общие понятия'} />,
    <Body key="b4a" t={t} f={f} text={isUK ? 'Без артикля — з власними назвами, мовами, матеріалами, їжею в загальному сенсі.' : 'Без артикля — с именами собственными, языками, материалами, едой в общем смысле.'} />,
    <Example key="e3" t={t} f={f} eng="We usually drink hot coffee without any sugar" rus={isUK ? 'Ми зазвичай п\'ємо гарячу каву без цукру (кава взагалі)' : 'Мы обычно пьём горячий кофе без сахара (кофе вообще)'} />,
    <Warn key="w1" t={t} f={f} text={isUK ? 'an — перед ЗВУКОМ, не буквою: an hour (h не вимовляється), a university (звук [j] — приголосний).' : 'an — перед ЗВУКОМ, не буквой: an hour (h не произносится), a university (звук [j] — согласный).'} />,
    <Tip key="tip1" t={t} f={f} text={isUK ? 'Перший раз — a. Вдруге — the: I saw a cat. The cat was black. Логіка проста: a = незнайомець, the = вже знайомий.' : 'Первый раз — a. Второй раз — the: I saw a cat. The cat was black. Логика проста: a = незнакомец, the = уже знакомый.'} />,
  ],
},

// ── УРОК 21 ──────────────────────────────────────────────────
21: {
  titleRU: 'Неопределённые местоимения',
  titleUK: 'Неозначені займенники',
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Навіщо ці займенники' : '1. Зачем эти местоимения'} />,
    <Body key="b1a" t={t} f={f} text={isUK ? 'Somebody, nobody, everybody, anybody — коли говоримо про людей не називаючи їх конкретно. Something, nothing, everything, anything — те саме для речей.' : 'Somebody, nobody, everybody, anybody — когда говорим о людях не называя их конкретно. Something, nothing, everything, anything — то же самое для вещей.'} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. SOMEBODY / SOMEONE — хтось' : '2. SOMEBODY / SOMEONE — кто-то'} />,
    <Example key="e1" t={t} f={f} eng="Somebody knocked on my door late at night" rus={isUK ? 'Хтось постукав у мої двері пізно вночі' : 'Кто-то постучал в мою дверь поздно ночью'} />,
    <Example key="e2" t={t} f={f} eng="I found something interesting in your garden" rus={isUK ? 'Я знайшов щось цікаве у твоєму саду' : 'Я нашёл кое-что интересное в твоём саду'} />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. NOBODY / NO ONE — ніхто' : '3. NOBODY / NO ONE — никто'} />,
    <Body key="b3a" t={t} f={f} text={isUK ? 'Важливо: nobody/nothing самі по собі несуть заперечення — дієслово залишається стверджувальним.' : 'Важно: nobody/nothing сами по себе несут отрицание — глагол остаётся утвердительным.'} />,
    <Example key="e3" t={t} f={f} eng="No one knows this secret code" rus={isUK ? 'Ніхто не знає цей секретний код' : 'Никто не знает этот секретный код'} />,
    <Example key="e4" t={t} f={f} eng="We heard nothing about that incident" rus={isUK ? 'Ми нічого не чули про ту подію' : 'Мы ничего не слышали об этом инциденте'} />,
    <Warn key="w1" t={t} f={f} text={isUK ? '❌ «Nobody didn\'t come» → ✅ «Nobody came». Nobody = заперечення. Не подвоюй його.' : '❌ «Nobody didn\'t come» → ✅ «Nobody came». Nobody = отрицание. Не удваивай его.'} />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. EVERYBODY / EVERYONE — всі' : '4. EVERYBODY / EVERYONE — все'} />,
    <Body key="b4a" t={t} f={f} text={isUK ? 'Everybody/everyone означає «кожен, всі» — але дієслово після нього стоїть в ОДНИНІ.' : 'Everybody/everyone означает «каждый, все» — но глагол после него стоит в ЕДИНСТВЕННОМ числе.'} />,
    <Example key="e5" t={t} f={f} eng="Everyone brought their laptops to the meeting" rus={isUK ? 'Усі принесли свої ноутбуки на зустріч' : 'Все принесли свои ноутбуки на встречу'} />,
    <Example key="e6" t={t} f={f} eng="Everyone wants to know the truth about this situation" rus={isUK ? 'Кожен хоче знати правду про цю ситуацію' : 'Все хотят знать правду об этой ситуации'} />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. ANYBODY / ANYONE — хто-небудь (питання і заперечення)' : '5. ANYBODY / ANYONE — кто-нибудь (вопросы и отрицания)'} />,
    <Example key="e7" t={t} f={f} eng="Did you see anyone in that empty office?" rus={isUK ? 'Ти бачив кого-небудь у тому порожньому офісі?' : 'Ты видел кого-нибудь в том пустом офисе?'} />,
    <Example key="e8" t={t} f={f} eng="Did you find anything useful in that old book?" rus={isUK ? 'Ви знайшли що-небудь корисне в тій старій книзі?' : 'Вы нашли что-нибудь полезное в той старой книге?'} />,
    <Tip key="tip1" t={t} f={f} text={isUK ? 'somebody = хтось є (ти впевнений). anybody = хто-небудь (питання, сумнів). nobody = ніхто. everybody = усі.' : 'somebody = кто-то есть (ты уверен). anybody = кто-нибудь (вопрос, сомнение). nobody = никто. everybody = все.'} />,
  ],
},

// ── УРОК 22 ──────────────────────────────────────────────────
22: {
  titleRU: 'Герундий (V-ing как существительное)',
  titleUK: 'Герундій (V-ing як іменник)',
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що таке герундій' : '1. Что такое герундий'} />,
    <Body key="b1a" t={t} f={f} text={isUK ? 'Герундій — це коли дієслово з -ing стає іменником. Воно може бути підметом речення або стояти після певних дієслів.' : 'Герундий — это когда глагол с -ing становится существительным. Он может быть подлежащим предложения или стоять после определённых глаголов.'} />,
    <Example key="e1" t={t} f={f} eng="Swimming in the cold ocean is very refreshing" rus={isUK ? 'Плавання в холодному океані дуже бадьорить' : 'Плавание в холодном океане очень бодрит'} />,
    <Example key="e2" t={t} f={f} eng="Learning foreign languages opens new opportunities" rus={isUK ? 'Вивчення іноземних мов відкриває нові можливості' : 'Изучение иностранных языков открывает новые возможности'} />,
    <Example key="e3" t={t} f={f} eng="Riding a bicycle in the park is his favorite activity" rus={isUK ? 'Їзда на велосипеді в парку — його улюблене заняття' : 'Езда на велосипеде в парке — его любимое занятие'} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Дієслова після яких завжди -ing' : '2. Глаголы после которых всегда -ing'} />,
    <Body key="b2a" t={t} f={f} text={isUK ? 'Після цих дієслів не можна вживати to-infinitive — тільки герундій.' : 'После этих глаголов нельзя использовать to-infinitive — только герундий.'} />,
    <Table key="t1" t={t} f={f} rows={[
      [isUK ? 'Дієслово' : 'Глагол', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
      ['finish', isUK ? 'закінчити' : 'закончить', 'She finished writing that report'],
      ['enjoy', isUK ? 'отримувати задоволення' : 'получать удовольствие', 'My brother enjoys cooking'],
      ['stop', isUK ? 'припинити' : 'прекратить', 'They stopped discussing that problem'],
      ['avoid', isUK ? 'уникати' : 'избегать', 'We avoid buying cheap toys'],
      ['suggest', isUK ? 'пропонувати' : 'предлагать', 'Our manager suggested rescheduling'],
      ['keep', isUK ? 'продовжувати' : 'продолжать', 'He keeps ignoring my messages'],
      ['prefer', isUK ? 'надавати перевагу' : 'предпочитать', 'Do you prefer traveling by train?'],
    ]} />,
    <Warn key="w1" t={t} f={f} text={isUK ? '❌ «She finished to write» → ✅ «She finished writing». Після finish — тільки -ing.' : '❌ «She finished to write» → ✅ «She finished writing». После finish — только -ing.'} />,
    <Warn key="w2" t={t} f={f} text={isUK ? '❌ «I enjoy to swim» → ✅ «I enjoy swimming». Після enjoy — тільки -ing.' : '❌ «I enjoy to swim» → ✅ «I enjoy swimming». После enjoy — только -ing.'} />,
    <Tip key="tip1" t={t} f={f} text={isUK ? 'Для порівняння: want, decide, plan, hope — після них to-infinitive: I want to go, She decided to stay.' : 'Для сравнения: want, decide, plan, hope — после них to-infinitive: I want to go, She decided to stay.'} />,
  ],
},

// ── УРОК 23 ──────────────────────────────────────────────────
23: {
  titleRU: 'Пассивный залог — Present Simple',
  titleUK: 'Пасивний стан — Present Simple',
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Навіщо пасивний стан' : '1. Зачем пассивный залог'} />,
    <Body key="b1a" t={t} f={f} text={isUK ? 'Пасивний стан — коли важливий предмет (що відбувається), а не той хто діє. Наприклад: не «кухар готує їжу», а «їжа готується».' : 'Пассивный залог — когда важен предмет (что происходит), а не тот кто действует. Например: не «повар готовит еду», а «еда готовится».'} />,
    <Body key="b1b" t={t} f={f} text={isUK ? 'Формула: am / is / are + третя форма дієслова (V3).' : 'Формула: am / is / are + третья форма глагола (V3).'} />,
    <Example key="e1" t={t} f={f} eng="This fresh food is cooked by chef every evening" rus={isUK ? 'Ця свіжа їжа готується кухарем кожного вечора' : 'Эта свежая еда готовится поваром каждый вечер'} />,
    <Example key="e2" t={t} f={f} eng="Those important letters are sent by our secretaries on time" rus={isUK ? 'Ті важливі листи надсилаються нашими секретарями вчасно' : 'Те важные письма отправляются нашими секретарями вовремя'} />,
    <Example key="e3" t={t} f={f} eng="Her new book is read by many people in this city" rus={isUK ? 'Її нова книга читається багатьма людьми в цьому місті' : 'Её новая книга читается многими людьми в этом городе'} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Третя форма дієслова (V3)' : '2. Третья форма глагола (V3)'} />,
    <Body key="b2a" t={t} f={f} text={isUK ? 'Правильні дієслова: V3 = -ed (як Past Simple). Неправильні — своя форма.' : 'Правильные глаголы: V3 = -ed (как Past Simple). Неправильные — своя форма.'} />,
    <Table key="t2" t={t} f={f} rows={[
      [isUK ? 'Дієслово' : 'Глагол', 'V3', isUK ? 'Приклад у пасиві' : 'Пример в пассиве'],
      ['cook', 'cooked', 'is cooked'],
      ['send', 'sent', 'are sent'],
      ['pay', 'paid', 'are paid'],
      ['check', 'checked', 'is checked'],
      ['read', 'read', 'is read'],
      ['write', 'written', 'is written'],
    ]} />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. By — хто робить' : '3. By — кто делает'} />,
    <Body key="b3a" t={t} f={f} text={isUK ? 'Якщо хочемо вказати хто виконує дію — додаємо by + виконавець. Якщо виконавець очевидний або неважливий — by можна опустити.' : 'Если хотим указать кто выполняет действие — добавляем by + исполнитель. Если исполнитель очевиден или неважен — by можно опустить.'} />,
    <Example key="e4" t={t} f={f} eng="Your personal data is always protected by this reliable system" rus={isUK ? 'Твої персональні дані завжди захищаються цією надійною системою' : 'Твои личные данные всегда защищаются этой надёжной системой'} />,
    <Warn key="w1" t={t} f={f} text={isUK ? '❌ «The food is cook» → ✅ «The food is cooked». Після is/are — обов\'язково V3.' : '❌ «The food is cook» → ✅ «The food is cooked». После is/are — обязательно V3.'} />,
  ],
},

// ── УРОК 24 ──────────────────────────────────────────────────
24: {
  titleRU: 'Present Perfect (have/has + V3)',
  titleUK: 'Present Perfect (have/has + V3)',
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Навіщо Present Perfect' : '1. Зачем Present Perfect'} />,
    <Body key="b1a" t={t} f={f} text={isUK ? 'Present Perfect — коли дія відбулась у минулому, але результат важливий ЗАРАЗ. Ти не говориш коли саме — важливо що вже є результат.' : 'Present Perfect — когда действие произошло в прошлом, но результат важен СЕЙЧАС. Ты не говоришь когда именно — важно что уже есть результат.'} />,
    <Body key="b1b" t={t} f={f} text={isUK ? 'Формула: have / has + V3. Have — з I/You/We/They. Has — з He/She/It.' : 'Формула: have / has + V3. Have — с I/You/We/They. Has — с He/She/It.'} />,
    <Example key="e1" t={t} f={f} eng="I have just found my old passport in this drawer" rus={isUK ? 'Я щойно знайшов свій старий паспорт у цій шухляді' : 'Я только что нашёл свой старый паспорт в этом ящике'} />,
    <Example key="e2" t={t} f={f} eng="She has already cooked tasty dinner for whole family" rus={isUK ? 'Вона вже приготувала смачну вечерю для всієї родини' : 'Она уже приготовила вкусный ужин для всей семьи'} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Маркери Present Perfect' : '2. Маркеры Present Perfect'} />,
    <Table key="t1" t={t} f={f} rows={[
      [isUK ? 'Маркер' : 'Маркер', isUK ? 'Де стоїть' : 'Где стоит', isUK ? 'Приклад' : 'Пример'],
      ['just', isUK ? 'після have/has' : 'после have/has', 'I have just found my passport'],
      ['already', isUK ? 'після have/has' : 'после have/has', 'She has already cooked dinner'],
      ['yet', isUK ? 'наприкінці (питання/заперечення)' : 'в конце (вопрос/отрицание)', 'We have not seen that movie yet'],
      ['ever', isUK ? 'після підмета у питанні' : 'после подлежащего в вопросе', 'Have you ever tasted this dish?'],
      ['never', isUK ? 'після have/has' : 'после have/has', 'This student has never made such mistake'],
    ]} />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Present Perfect vs Past Simple' : '3. Present Perfect vs Past Simple'} />,
    <Body key="b3a" t={t} f={f} text={isUK ? 'Є конкретний час (yesterday, two days ago, last week) → Past Simple. Немає конкретного часу або є just/already/yet → Present Perfect.' : 'Есть конкретное время (yesterday, two days ago, last week) → Past Simple. Нет конкретного времени или есть just/already/yet → Present Perfect.'} />,
    <Warn key="w1" t={t} f={f} text={isUK ? '❌ «I have seen him yesterday» → ✅ «I saw him yesterday». З yesterday — Past Simple.' : '❌ «I have seen him yesterday» → ✅ «I saw him yesterday». С yesterday — Past Simple.'} />,
    <Tip key="tip1" t={t} f={f} text={isUK ? 'Підказка: Present Perfect — про досвід або свіжий результат. Past Simple — про конкретну подію у конкретний час.' : 'Подсказка: Present Perfect — об опыте или свежем результате. Past Simple — о конкретном событии в конкретное время.'} />,
  ],
},

// ── УРОК 25 ──────────────────────────────────────────────────
25: {
  titleRU: 'Past Continuous',
  titleUK: 'Past Continuous',
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Навіщо Past Continuous' : '1. Зачем Past Continuous'} />,
    <Body key="b1a" t={t} f={f} text={isUK ? 'Past Continuous — дія була в процесі в конкретний момент минулого. Не «я зробив», а «я саме робив» коли щось сталося або в певний момент.' : 'Past Continuous — действие было в процессе в конкретный момент прошлого. Не «я сделал», а «я как раз делал» когда что-то произошло или в определённый момент.'} />,
    <Body key="b1b" t={t} f={f} text={isUK ? 'Формула: was / were + дієслово-ing. Was — з I/He/She/It. Were — з You/We/They.' : 'Формула: was / were + глагол-ing. Was — с I/He/She/It. Were — с You/We/They.'} />,
    <Example key="e1" t={t} f={f} eng="I was listening to that important lecture at ten o'clock" rus={isUK ? 'Я слухав ту важливу лекцію о десятій годині' : 'Я слушал ту важную лекцию в десять часов'} />,
    <Example key="e2" t={t} f={f} eng="She was not cooking that spicy dinner at midnight" rus={isUK ? 'Вона не готувала ту гостру вечерю опівночі' : 'Она не готовила тот острый ужин в полночь'} />,
    <Example key="e3" t={t} f={f} eng="Were you still repairing your old bicycle in the garage yesterday at noon?" rus={isUK ? 'Ти все ще ремонтував свій старий велосипед у гаражі вчора опівдні?' : 'Ты всё ещё чинил свой старый велосипед в гараже вчера в полдень?'} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Маркери Past Continuous' : '2. Маркеры Past Continuous'} />,
    <Body key="b2a" t={t} f={f} text={isUK ? 'at noon / at midnight / at ten o\'clock — у конкретний момент. all morning / all evening / during / whole — весь цей час.' : 'at noon / at midnight / at ten o\'clock — в конкретный момент. all morning / all evening / during / whole — всё это время.'} />,
    <Example key="e4" t={t} f={f} eng="We were discussing this secret plan during whole yesterday evening" rus={isUK ? 'Ми обговорювали цей секретний план протягом усього вчорашнього вечора' : 'Мы обсуждали этот секретный план в течение всего вчерашнего вечера'} />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Головний паттерн: довга дія + коротка дія' : '3. Главный паттерн: длинное действие + короткое'} />,
    <Body key="b3a" t={t} f={f} text={isUK ? 'Past Continuous — довга фонова дія. Past Simple — коротка дія що перервала. З\'єднуємо через when або while.' : 'Past Continuous — длинное фоновое действие. Past Simple — короткое действие которое прервало. Соединяем через when или while.'} />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. Past Continuous vs Past Simple' : '4. Past Continuous vs Past Simple'} />,
    <Table key="t1" t={t} f={f} rows={[
      ['Past Simple', 'Past Continuous'],
      [isUK ? 'Дія завершена' : 'Действие завершено', isUK ? 'Дія в процесі' : 'Действие в процессе'],
      ['I cooked dinner', 'I was cooking dinner'],
      [isUK ? 'Я приготував вечерю' : 'Я приготовил ужин', isUK ? 'Я готував вечерю (в той момент)' : 'Я готовил ужин (в тот момент)'],
    ]} />,
    <Warn key="w1" t={t} f={f} text={isUK ? '❌ «I was cook dinner» → ✅ «I was cooking dinner». Після was/were — тільки -ing.' : '❌ «I was cook dinner» → ✅ «I was cooking dinner». После was/were — только -ing.'} />,
  ],
},

// ── УРОК 26 ──────────────────────────────────────────────────
26: {
  titleRU: 'Условные предложения: 0 и 1 тип',
  titleUK: 'Умовні речення: 0 і 1 тип',
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що таке умовне речення' : '1. Что такое условное предложение'} />,
    <Body key="b1a" t={t} f={f} text={isUK ? 'Умовне речення — одна подія залежить від іншої. Завжди є дві частини: умова (if-частина) і результат.' : 'Условное предложение — одно событие зависит от другого. Всегда есть две части: условие (if-часть) и результат.'} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Тип 0 — закони природи і факти' : '2. Тип 0 — законы природы и факты'} />,
    <Body key="b2a" t={t} f={f} text={isUK ? 'Тип 0: If + Present Simple → Present Simple. Це завжди правда, без винятків. If можна замінити на when.' : 'Тип 0: If + Present Simple → Present Simple. Это всегда правда, без исключений. If можно заменить на when.'} />,
    <Example key="e1" t={t} f={f} eng="Iron always melts if someone heats it to high temperature" rus={isUK ? 'Залізо завжди плавиться якщо його нагріти до високої температури' : 'Железо всегда плавится если его нагреть до высокой температуры'} />,
    <Example key="e2" t={t} f={f} eng="Ice always turns into water if someone leaves it in a warm place" rus={isUK ? 'Лід завжди перетворюється на воду якщо залишити його в теплому місці' : 'Лёд всегда превращается в воду если оставить его в тёплом месте'} />,
    <Example key="e3" t={t} f={f} eng="Paper always burns if someone brings this open fire too close to it" rus={isUK ? 'Папір завжди горить якщо піднести до нього відкритий вогонь' : 'Бумага всегда горит если поднести к ней открытый огонь'} />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Тип 1 — реальне майбутнє' : '3. Тип 1 — реальное будущее'} />,
    <Body key="b3a" t={t} f={f} text={isUK ? 'Тип 1: If + Present Simple → will + дієслово. Це конкретна ситуація — реальна умова і реальний результат у майбутньому.' : 'Тип 1: If + Present Simple → will + глагол. Это конкретная ситуация — реальное условие и реальный результат в будущем.'} />,
    <Example key="e4" t={t} f={f} eng="If this experienced specialist signs the contract, we will get profit" rus={isUK ? 'Якщо цей досвідчений фахівець підпише контракт, ми отримаємо прибуток' : 'Если этот опытный специалист подпишет контракт, мы получим прибыль'} />,
    <Example key="e5" t={t} f={f} eng="If that reliable courier comes on time, I will send this urgent packet" rus={isUK ? 'Якщо той надійний кур\'єр прийде вчасно, я відправлю цей терміновий пакет' : 'Если тот надёжный курьер придёт вовремя, я отправлю этот срочный пакет'} />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. Головна пастка: після IF — ніколи не will' : '4. Главная ловушка: после IF — никогда не will'} />,
    <Body key="b4a" t={t} f={f} text={isUK ? 'Це найважливіше правило. В if-частині завжди Present Simple — навіть якщо мова про майбутнє.' : 'Это самое важное правило. В if-части всегда Present Simple — даже если речь о будущем.'} />,
    <Warn key="w1" t={t} f={f} text={isUK ? '❌ «If she will come, I will be happy» → ✅ «If she comes, I will be happy». Після if — Present Simple.' : '❌ «If she will come, I will be happy» → ✅ «If she comes, I will be happy». После if — Present Simple.'} />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. Порядок частин і кома' : '5. Порядок частей и запятая'} />,
    <Body key="b5a" t={t} f={f} text={isUK ? 'If-частина може бути першою або другою. Кома — тільки коли if-частина стоїть першою.' : 'If-часть может быть первой или второй. Запятая — только когда if-часть стоит первой.'} />,
    <Table key="t1" t={t} f={f} rows={[
      [isUK ? 'Порядок' : 'Порядок', isUK ? 'Приклад' : 'Пример'],
      [isUK ? 'If першою (кома)' : 'If первым (запятая)', 'If she comes, I will be happy.'],
      [isUK ? 'If другою (без коми)' : 'If второй (без запятой)', 'I will be happy if she comes.'],
    ]} />,
  ],
},

// ── УРОК 27 ──────────────────────────────────────────────────
27: {
  titleRU: 'Косвенная речь',
  titleUK: 'Непряма мова',
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що таке непряма мова' : '1. Что такое косвенная речь'} />,
    <Body key="b1a" t={t} f={f} text={isUK ? 'Непряма мова — коли ми переказуємо чужі слова, а не цитуємо їх дослівно. Головна зміна: час дієслова зсувається назад.' : 'Косвенная речь — когда мы пересказываем чужие слова, а не цитируем дословно. Главное изменение: время глагола сдвигается назад.'} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Зсув часів' : '2. Сдвиг времён'} />,
    <Table key="t1" t={t} f={f} rows={[
      [isUK ? 'Пряма мова' : 'Прямая речь', isUK ? 'Непряма мова' : 'Косвенная речь'],
      ['Present Simple → ', 'Past Simple'],
      ['will → ', 'would'],
      ['can → ', 'could'],
      ['Present Perfect → ', 'Past Perfect'],
    ]} />,
    <Example key="e1" t={t} f={f} eng="That experienced manager said that he would sign this important contract next day" rus={isUK ? 'Той досвідчений менеджер сказав що підпише цей важливий контракт наступного дня' : 'Тот опытный менеджер сказал что подпишет этот важный контракт на следующий день'} />,
    <Example key="e2" t={t} f={f} eng="She mentioned that she could not find those old documents in her office" rus={isUK ? 'Вона згадала що не може знайти ті старі документи у своєму офісі' : 'Она упомянула что не может найти те старые документы в своём офисе'} />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Зміна займенників' : '3. Изменение местоимений'} />,
    <Body key="b3a" t={t} f={f} text={isUK ? 'I → he/she. We → they. My → his/her. Займенники змінюються відповідно до того хто кому говорить.' : 'I → he/she. We → they. My → his/her. Местоимения меняются в зависимости от того кто кому говорит.'} />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. Зміна маркерів часу' : '4. Изменение маркеров времени'} />,
    <Table key="t2" t={t} f={f} rows={[
      [isUK ? 'Пряма мова' : 'Прямая речь', isUK ? 'Непряма мова' : 'Косвенная речь'],
      ['now', 'then'],
      ['today', 'that day'],
      ['tomorrow', 'the next day'],
      ['yesterday', 'the day before'],
    ]} />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. Дієслова введення: said vs told' : '5. Глаголы введения: said vs told'} />,
    <Body key="b5a" t={t} f={f} text={isUK ? 'said — без об\'єкта: He said that... told — з об\'єктом (кому): He told me that...' : 'said — без объекта: He said that... told — с объектом (кому): He told me that...'} />,
    <Example key="e3" t={t} f={f} eng="We replied that we would finish this complex task in two hours" rus={isUK ? 'Ми відповіли що закінчимо це складне завдання за дві години' : 'Мы ответили что закончим это сложное задание за два часа'} />,
    <Warn key="w1" t={t} f={f} text={isUK ? '❌ «He told that he would come» → ✅ «He said that he would come» / «He told me that he would come».' : '❌ «He told that he would come» → ✅ «He said that he would come» / «He told me that he would come».'} />,
  ],
},

// ── УРОК 28 ──────────────────────────────────────────────────
28: {
  titleRU: 'Возвратные местоимения',
  titleUK: 'Зворотні займенники',
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що таке зворотний займенник' : '1. Что такое возвратное местоимение'} />,
    <Body key="b1a" t={t} f={f} text={isUK ? 'Зворотний займенник — коли підмет і об\'єкт речення одна і та сама особа. Він сам зробив щось собі.' : 'Возвратное местоимение — когда подлежащее и объект предложения — одно и то же лицо. Он сам сделал что-то себе.'} />,
    <Table key="t1" t={t} f={f} rows={[
      [isUK ? 'Підмет' : 'Подлежащее', isUK ? 'Зворотний займенник' : 'Возвратное местоимение'],
      ['I', 'myself'], ['you (один)', 'yourself'], ['he', 'himself'],
      ['she', 'herself'], ['it', 'itself'], ['we', 'ourselves'], ['they', 'themselves'],
    ]} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Значення 1 — об\'єкт той самий що підмет' : '2. Значение 1 — объект тот же что подлежащее'} />,
    <Example key="e1" t={t} f={f} eng="He accidentally hurt himself with that sharp knife in kitchen" rus={isUK ? 'Він випадково порізався тим гострим ножем на кухні' : 'Он случайно порезался тем острым ножом на кухне'} />,
    <Example key="e2" t={t} f={f} eng="She bought herself that expensive leather dress last month" rus={isUK ? 'Вона купила собі ту дорогу шкіряну сукню минулого місяця' : 'Она купила себе то дорогое кожаное платье в прошлом месяце'} />,
    <Example key="e3" t={t} f={f} eng="You must protect yourself in that dangerous situation today" rus={isUK ? 'Ти мусиш захищати себе в тій небезпечній ситуації' : 'Ты должен защищать себя в той опасной ситуации'} />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Значення 2 — підсилення «сам/сама»' : '3. Значение 2 — усиление «сам/сама»'} />,
    <Example key="e4" t={t} f={f} eng="I often cook this healthy breakfast myself in mornings" rus={isUK ? 'Я часто готую цей корисний сніданок сам вранці' : 'Я часто готовлю этот полезный завтрак сам по утрам'} />,
    <Example key="e5" t={t} f={f} eng="They built that wooden fence around their garden themselves" rus={isUK ? 'Вони самі побудували той дерев\'яний паркан навколо свого саду' : 'Они сами построили тот деревянный забор вокруг своего сада'} />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. Вирази зі зворотними займенниками' : '4. Выражения с возвратными местоимениями'} />,
    <Example key="e6" t={t} f={f} eng="Please, feel yourselves at home and help yourselves to those fresh fruits" rus={isUK ? 'Будь ласка, почувайтеся як вдома і пригощайтеся тими свіжими фруктами' : 'Пожалуйста, чувствуйте себя как дома и угощайтесь теми свежими фруктами'} />,
    <Warn key="w1" t={t} f={f} text={isUK ? '❌ «I hurt me» → ✅ «I hurt myself». Коли підмет і об\'єкт — одна особа, потрібен зворотний займенник.' : '❌ «I hurt me» → ✅ «I hurt myself». Когда подлежащее и объект — одно лицо, нужно возвратное местоимение.'} />,
  ],
},

// ── УРОК 29 ──────────────────────────────────────────────────
29: {
  titleRU: 'Used to',
  titleUK: 'Used to',
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що означає used to' : '1. Что означает used to'} />,
    <Body key="b1a" t={t} f={f} text={isUK ? 'Used to — щось регулярно відбувалось у минулому, але зараз вже ні. Є дистанція між минулим і теперішнім.' : 'Used to — что-то регулярно происходило в прошлом, но сейчас уже нет. Есть дистанция между прошлым и настоящим.'} />,
    <Body key="b1b" t={t} f={f} text={isUK ? 'Формула: used to + базова форма. Для всіх підметів однаково — ніяких змін.' : 'Формула: used to + базовая форма. Для всех подлежащих одинаково — никаких изменений.'} />,
    <Example key="e1" t={t} f={f} eng="I used to live in that quiet suburb before moving to this noisy metropolis" rus={isUK ? 'Я колись жив у тому тихому передмісті перш ніж переїхати до цього шумного мегаполісу' : 'Я раньше жил в том тихом пригороде до переезда в этот шумный мегаполис'} />,
    <Example key="e2" t={t} f={f} eng="You used to read those classical novels every free minute in childhood" rus={isUK ? 'Ти колись читав ті класичні романи кожну вільну хвилину в дитинстві' : 'Ты раньше читал те классические романы каждую свободную минуту в детстве'} />,
    <Example key="e3" t={t} f={f} eng="She used to wear those long dresses to those solemn events" rus={isUK ? 'Вона колись носила ті довгі сукні на ті урочисті заходи' : 'Она раньше носила те длинные платья на те торжественные мероприятия'} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Заперечення і питання' : '2. Отрицание и вопрос'} />,
    <Body key="b2a" t={t} f={f} text={isUK ? 'Заперечення: didn\'t use to (НЕ «didn\'t used to»). Питання: Did you use to...?' : 'Отрицание: didn\'t use to (НЕ «didn\'t used to»). Вопрос: Did you use to...?'} />,
    <Warn key="w1" t={t} f={f} text={isUK ? '❌ «I didn\'t used to smoke» → ✅ «I didn\'t use to smoke». Після didn\'t — use to без -d.' : '❌ «I didn\'t used to smoke» → ✅ «I didn\'t use to smoke». После didn\'t — use to без -d.'} />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Три важливі відмінності' : '3. Три важных отличия'} />,
    <Body key="b3a" t={t} f={f} text={isUK ? 'used to do ≠ usually do. Used to — тільки про минуле. Usually — звичка яка є зараз.' : 'used to do ≠ usually do. Used to — только о прошлом. Usually — привычка которая есть сейчас.'} />,
    <Body key="b3b" t={t} f={f} text={isUK ? 'used to do ≠ be used to doing. Used to do — звичка у минулому. Be used to doing — звик робити (урок 32).' : 'used to do ≠ be used to doing. Used to do — привычка в прошлом. Be used to doing — привык делать (урок 32).'} />,
    <Body key="b3c" t={t} f={f} text={isUK ? 'used to існує тільки в минулому. Немає форми «use to» для теперішнього часу.' : 'used to существует только в прошлом. Нет формы «use to» для настоящего времени.'} />,
    <Tip key="tip1" t={t} f={f} text={isUK ? 'Хочеш сказати «я звик робити» (зараз)? Це be used to + -ing: I am used to waking up early.' : 'Хочешь сказать «я привык делать» (сейчас)? Это be used to + -ing: I am used to waking up early.'} />,
  ],
},

// ── УРОК 30 ──────────────────────────────────────────────────
30: {
  titleRU: 'Относительные предложения',
  titleUK: 'Відносні речення',
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Навіщо відносні речення' : '1. Зачем относительные предложения'} />,
    <Body key="b1a" t={t} f={f} text={isUK ? 'Відносне речення додає інформацію про людину або предмет прямо всередину основного речення. Замість двох речень — одне.' : 'Относительное предложение добавляет информацию о человеке или предмете прямо внутрь основного предложения. Вместо двух предложений — одно.'} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. WHO — для людей' : '2. WHO — для людей'} />,
    <Example key="e1" t={t} f={f} eng="I know that talented manager who organized that successful conference yesterday" rus={isUK ? 'Я знаю того талановитого менеджера який організував ту успішну конференцію вчора' : 'Я знаю того талантливого менеджера который организовал ту успешную конференцию вчера'} />,
    <Example key="e2" t={t} f={f} eng="That qualified lawyer who won that complex case yesterday is resting now" rus={isUK ? 'Той кваліфікований юрист який виграв ту складну справу вчора відпочиває зараз' : 'Тот квалифицированный юрист который выиграл то сложное дело вчера отдыхает сейчас'} />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. WHICH — для предметів і тварин' : '3. WHICH — для предметов и животных'} />,
    <Example key="e3" t={t} f={f} eng="We visited that ancient city which is famous for that unique architecture" rus={isUK ? 'Ми відвідали те стародавнє місто яке славиться тою унікальною архітектурою' : 'Мы посетили тот древний город который знаменит той уникальной архитектурой'} />,
    <Example key="e4" t={t} f={f} eng="You chose that modern laptop which has that powerful graphics card" rus={isUK ? 'Ти обрав той сучасний ноутбук який має ту потужну відеокарту' : 'Ты выбрал тот современный ноутбук который имеет ту мощную видеокарту'} />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. WHOSE — чий (присвійне)' : '4. WHOSE — чей (притяжательное)'} />,
    <Body key="b4a" t={t} f={f} text={isUK ? 'Whose замінює his/her/their. Воно показує належність — чий цей предмет.' : 'Whose заменяет his/her/their. Оно показывает принадлежность — чей этот предмет.'} />,
    <Example key="e5" t={t} f={f} eng="You met that experienced guide whose knowledge impressed that tourist group" rus={isUK ? 'Ти зустрів того досвідченого гіда чиї знання вразили ту туристичну групу' : 'Ты встретил того опытного гида чьи знания впечатлили ту туристическую группу'} />,
    <Example key="e6" t={t} f={f} eng="My sister works in that large company whose offices are all over the world" rus={isUK ? 'Моя сестра працює в тій великій компанії офіси якої є по всьому світу' : 'Моя сестра работает в той крупной компании офисы которой есть по всему миру'} />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. WHERE — для місць' : '5. WHERE — для мест'} />,
    <Example key="e7" t={t} f={f} eng="They bought that country house where that famous writer wrote that popular book" rus={isUK ? 'Вони купили той заміський будинок де той відомий письменник написав ту популярну книгу' : 'Они купили тот загородный дом где тот известный писатель написал ту популярную книгу'} />,

    <Section key="s6" t={t} f={f} title={isUK ? '6. THAT — універсальне' : '6. THAT — универсальное'} />,
    <Example key="e8" t={t} f={f} eng="She lost those important documents that lay on that work desk" rus={isUK ? 'Вона загубила ті важливі документи що лежали на тому робочому столі' : 'Она потеряла те важные документы что лежали на том рабочем столе'} />,
    <Table key="t1" t={t} f={f} rows={[
      [isUK ? 'Займенник' : 'Местоимение', isUK ? 'Для кого/чого' : 'Для кого/чего'],
      ['who', isUK ? 'люди' : 'люди'],
      ['which', isUK ? 'предмети, тварини' : 'предметы, животные'],
      ['that', isUK ? 'люди і предмети' : 'люди и предметы'],
      ['whose', isUK ? 'чий (присвійне)' : 'чей (притяжательное)'],
      ['where', isUK ? 'місце' : 'место'],
    ]} />,
  ],
},

// ── УРОК 31 ──────────────────────────────────────────────────
31: {
  titleRU: 'Complex Object',
  titleUK: 'Complex Object',
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Що таке Complex Object' : '1. Что такое Complex Object'} />,
    <Body key="b1a" t={t} f={f} text={isUK ? 'Complex Object — конструкція коли після дієслова стоїть особа + її дія. Замість «I want that he checks» кажемо «I want him to check».' : 'Complex Object — конструкция когда после глагола стоит лицо + его действие. Вместо «I want that he checks» говорим «I want him to check».'} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Дієслова з to-infinitive' : '2. Глаголы с to-infinitive'} />,
    <Body key="b2a" t={t} f={f} text={isUK ? 'Схема: дієслово + особа + to + базова форма.' : 'Схема: глагол + лицо + to + базовая форма.'} />,
    <Table key="t1" t={t} f={f} rows={[
      [isUK ? 'Дієслово' : 'Глагол', isUK ? 'Приклад' : 'Пример'],
      ['want', 'I do not want you to check that annual financial report immediately'],
      ['expect', 'Does she expect him to sign that important legal contract tomorrow?'],
      ['ask', 'Did we ask that polite waiter to bring that additional menu?'],
      ['tell', 'She told him to finish the report'],
      ['would like', 'We would like this reliable supplier to deliver those necessary construction materials'],
      ['allow', 'They let that foreign delegation inspect that modern chemical laboratory'],
    ]} />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. MAKE і LET — без to' : '3. MAKE и LET — без to'} />,
    <Body key="b3a" t={t} f={f} text={isUK ? 'make і let — особливі. Після них базова форма БЕЗ to. make = примусити, let = дозволити.' : 'make и let — особые. После них базовая форма БЕЗ to. make = заставить, let = позволить.'} />,
    <Example key="e1" t={t} f={f} eng="They made that inexperienced driver pay that huge fine" rus={isUK ? 'Вони змусили того недосвідченого водія заплатити той величезний штраф' : 'Они заставили того неопытного водителя заплатить тот огромный штраф'} />,
    <Example key="e2" t={t} f={f} eng="They let that foreign delegation inspect that modern chemical laboratory" rus={isUK ? 'Вони дозволили тій іноземній делегації оглянути ту сучасну хімічну лабораторію' : 'Они позволили той иностранной делегации осмотреть ту современную химическую лабораторию'} />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. Дієслова сприйняття — see, hear, notice, feel' : '4. Глаголы восприятия — see, hear, notice, feel'} />,
    <Body key="b4a" t={t} f={f} text={isUK ? 'Після see, hear, notice, feel — базова форма без to (або -ing якщо підкреслюємо процес).' : 'После see, hear, notice, feel — базовая форма без to (или -ing если подчёркиваем процесс).'} />,
    <Example key="e3" t={t} f={f} eng="Did you see that famous actor enter that building?" rus={isUK ? 'Ти бачив як той відомий актор входив у ту будівлю?' : 'Ты видел как тот известный актёр входил в то здание?'} />,
    <Example key="e4" t={t} f={f} eng="I heard that experienced pilot explain that complex flight procedure" rus={isUK ? 'Я чув як той досвідчений пілот пояснював ту складну процедуру польоту' : 'Я слышал как тот опытный пилот объяснял ту сложную процедуру полёта'} />,
    <Warn key="w1" t={t} f={f} text={isUK ? '❌ «I want that he goes» → ✅ «I want him to go». ❌ «make him to go» → ✅ «make him go».' : '❌ «I want that he goes» → ✅ «I want him to go». ❌ «make him to go» → ✅ «make him go».'} />,
  ],
},

// ── УРОК 32 ──────────────────────────────────────────────────
32: {
  titleRU: 'Финальный смешанный урок',
  titleUK: 'Фінальний змішаний урок',
  render: (t, isUK, f) => [

    <Section key="s1" t={t} f={f} title={isUK ? '1. Be used to + V-ing — звик робити (зараз)' : '1. Be used to + V-ing — привык делать (сейчас)'} />,
    <Body key="b1a" t={t} f={f} text={isUK ? 'Be used to + -ing = звик робити щось (це нормально для тебе). Не плутай з used to do (звичка у минулому).' : 'Be used to + -ing = привык делать что-то (это нормально для тебя). Не путай с used to do (привычка в прошлом).'} />,
    <Example key="e1" t={t} f={f} eng="I am not used to my strict boss making us redo those tedious monthly reports" rus={isUK ? 'Я не звик до того що мій суворий начальник змушує нас переробляти ті нудні місячні звіти' : 'Я не привык к тому что мой строгий начальник заставляет нас переделывать те нудные ежемесячные отчёты'} />,
    <Example key="e2" t={t} f={f} eng="That cautious driver is not used to other people driving so aggressively on these narrow streets" rus={isUK ? 'Той обережний водій не звик до того що інші люди їздять так агресивно на цих вузьких вулицях' : 'Тот осторожный водитель не привык к тому что другие люди ездят так агрессивно на этих узких улицах'} />,
    <Table key="t1" t={t} f={f} rows={[
      ['used to do', 'be used to doing'],
      [isUK ? 'звичка в минулому' : 'привычка в прошлом', isUK ? 'звик зараз' : 'привык сейчас'],
      ['I used to smoke', 'I am used to working late'],
    ]} />,

    <Section key="s2" t={t} f={f} title={isUK ? '2. Умовні 2 типу — нереальне' : '2. Условные 2 типа — нереальное'} />,
    <Body key="b2a" t={t} f={f} text={isUK ? 'Тип 2: If + Past Simple → would + базова форма. Умова нереальна або малоймовірна.' : 'Тип 2: If + Past Simple → would + базовая форма. Условие нереально или маловероятно.'} />,
    <Example key="e3" t={t} f={f} eng="If she had that necessary equipment, she would finish that important work on time" rus={isUK ? 'Якби вона мала те необхідне обладнання, вона б закінчила ту важливу роботу вчасно' : 'Если бы у неё было то необходимое оборудование, она бы закончила ту важную работу вовремя'} />,
    <Example key="e4" t={t} f={f} eng="If you had heard that important news earlier, you would not have made that stupid mistake" rus={isUK ? 'Якби ти почув ті важливі новини раніше, ти б не зробив тієї дурної помилки' : 'Если бы ты услышал те важные новости раньше, ты бы не сделал той глупой ошибки'} />,

    <Section key="s3" t={t} f={f} title={isUK ? '3. Present Perfect Passive' : '3. Present Perfect Passive'} />,
    <Body key="b3a" t={t} f={f} text={isUK ? 'Формула: have/has + been + V3. Пасивний стан у Present Perfect.' : 'Формула: have/has + been + V3. Пассивный залог в Present Perfect.'} />,
    <Example key="e5" t={t} f={f} eng="We were told that this complex legal problem was solved by that experienced lawyer" rus={isUK ? 'Нам сказали що та складна юридична проблема була вирішена тим досвідченим юристом' : 'Нам сказали что та сложная юридическая проблема была решена тем опытным юристом'} />,

    <Section key="s4" t={t} f={f} title={isUK ? '4. Дієслова сприйняття в складних реченнях' : '4. Глаголы восприятия в сложных предложениях'} />,
    <Example key="e6" t={t} f={f} eng="Have you ever seen that rare bird build that unusual nest on that steep cliff?" rus={isUK ? 'Ти коли-небудь бачив як та рідкісна пташка будує те незвичне гніздо на тій крутій скелі?' : 'Ты когда-нибудь видел как та редкая птица строит то необычное гнездо на той крутой скале?'} />,
    <Example key="e7" t={t} f={f} eng="We felt that strong vibration shake that old bridge which was built many years ago" rus={isUK ? 'Ми відчули як та сильна вібрація трясла той старий міст що був побудований багато років тому' : 'Мы почувствовали как та сильная вибрация трясла тот старый мост который был построен много лет назад'} />,

    <Section key="s5" t={t} f={f} title={isUK ? '5. Складні відносні з whose/whom' : '5. Сложные относительные с whose/whom'} />,
    <Example key="e8" t={t} f={f} eng="That talented woman whose innovative idea we discussed is that very expert whom we need" rus={isUK ? 'Та талановита жінка чию інноваційну ідею ми обговорили є саме тим експертом якого нам потрібно' : 'Та талантливая женщина чью инновационную идею мы обсуждали является именно тем экспертом который нам нужен'} />,

    <Tip key="tip1" t={t} f={f} text={isUK ? 'Граматика — це інструмент. Ти вже пройшов 32 уроки. Тепер практикуй: читай, слухай, говори — і все стане автоматичним.' : 'Грамматика — это инструмент. Ты прошёл 32 урока. Теперь практикуй: читай, слушай, говори — и всё станет автоматическим.'} />,
  ],
},
};

// ─── Главный компонент ────────────────────────────────────────────────────────

export default function LessonHelp() {
  const router = useRouter();
  const { id, lessonId: lessonIdParam } = useLocalSearchParams<{ id: string | string[]; lessonId: string | string[] }>();
  const rawId = Array.isArray(id) ? id[0] : id;
  const rawLessonId = Array.isArray(lessonIdParam) ? lessonIdParam[0] : lessonIdParam;
  const lessonId = Number(rawId || rawLessonId) || 1;
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const theoryTitleEs =
    lessonId >= 1 && lessonId <= 32
      ? lessonNamesForLang('es')[lessonId - 1] ?? `Lección ${lessonId}`
      : `Lección ${lessonId}`;
  const isUK = lang === 'uk';
  const [xpClaimed, setXpClaimed] = useState(false);
  const [xpShown, setXpShown] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);
  const [previewXP, setPreviewXP] = useState(25);
  const xpAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    updateTaskProgress('open_theory', 1).catch(() => {});
    const key = `theory_xp_claimed_${lessonId}`;
    AsyncStorage.getItem(key).then(v => { if (v === '1') setXpClaimed(true); }).catch(() => {});
    getCurrentMultiplier().then(m => {
      setPreviewXP(Math.round(25 * m));
    }).catch(() => {});
  }, [lessonId]);

  const handleClaimXP = async () => {
    if (xpClaimed) return;
    const key = `theory_xp_claimed_${lessonId}`;
    await AsyncStorage.setItem(key, '1');
    setXpClaimed(true);
    // Показываем previewXP сразу, потом обновим на реальный finalDelta
    setEarnedXP(previewXP);
    const userName = await AsyncStorage.getItem('user_name') ?? '';
    registerXP(25, 'vocabulary_learned', userName, lang, lessonId)
      .then(result => {
        setEarnedXP(result.finalDelta);
        setXpShown(true);
        xpAnim.setValue(0);
        Animated.sequence([
          Animated.timing(xpAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.delay(1500),
          Animated.timing(xpAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => setXpShown(false));
      })
      .catch(() => {
        // Показать с previewXP если registerXP упал
        setXpShown(true);
        xpAnim.setValue(0);
        Animated.sequence([
          Animated.timing(xpAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.delay(1500),
          Animated.timing(xpAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => setXpShown(false));
      });
  };

  const theory = THEORY[lessonId];

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex: 1 }}>
      <ContentWrap>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: t.border,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={t.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.textMuted, fontSize: f.caption }} numberOfLines={1} maxFontSizeMultiplier={1.2}>
            {triLang(lang, {
              uk: `Урок ${lessonId} — Теорія`,
              ru: `Урок ${lessonId} — Теория`,
              es: `Lección ${lessonId} — Teoría`,
            })}
          </Text>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700' }} numberOfLines={1}>
            {theory
              ? triLang(lang, { uk: theory.titleUK, ru: theory.titleRU, es: theoryTitleEs })
              : triLang(lang, {
                  uk: `Урок ${lessonId}`,
                  ru: `Урок ${lessonId}`,
                  es: `Lección ${lessonId}`,
                })}
          </Text>
          <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 2 }} numberOfLines={1}>
            {triLang(lang, {
              uk: 'Коротко: правило + приклади + 25 XP',
              ru: 'Коротко: правило + примеры + 25 XP',
              es: 'Resumen: regla + ejemplos + 25 XP',
            })}
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={true}
      >
        {lang === 'es' && theory && lessonId !== 1 ? (
          <Warn
            t={t}
            f={f}
            text="La teoría detallada está, por ahora, solo en ruso o en ucraniano; los ejemplos en inglés no cambian. Poco a poco añadiremos estas explicaciones también en español."
          />
        ) : null}
        {theory ? (
          lessonId === 1 && lang === 'es' ? renderLesson1TheoryEs(t, f) : theory.render(t, isUK, f)
        ) : (
          <Body
            key="fallback"
            t={t}
            f={f}
            text={triLang(lang, {
              uk: `Теорія для уроку ${lessonId} незабаром з'явиться. Продовжуй практикуватись!`,
              ru: `Теория для урока ${lessonId} скоро появится. Продолжай практиковаться!`,
              es: `La teoría de la lección ${lessonId} estará disponible pronto. ¡Sigue practicando!`,
            })}
          />
        )}

        <ReportErrorButton
          screen="theory"
          dataId={`theory_lesson_${lessonId}`}
          dataText={`Теория урока ${lessonId}`}
          style={{ alignSelf: 'flex-end', marginTop: 16 }}
        />

        {/* XP reward button at the bottom of theory */}
        <View style={{ marginTop: 32, marginBottom: 8, alignItems: 'center' }}>
          <TouchableOpacity
            onPress={handleClaimXP}
            disabled={xpClaimed}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: xpClaimed ? t.border : '#F5A623',
              borderRadius: 16,
              paddingVertical: 14,
              paddingHorizontal: 28,
              gap: 8,
              opacity: xpClaimed ? 0.6 : 1,
            }}
          >
            <Ionicons name={xpClaimed ? 'checkmark-circle' : 'star'} size={22} color="#fff" />
            <Text style={{ color: '#fff', fontSize: f.body, fontWeight: '700' }}>
              {xpClaimed
                ? triLang(lang, {
                    uk: `XP отримано (+${earnedXP})`,
                    ru: `XP получено (+${earnedXP})`,
                    es: `Has obtenido +${earnedXP} XP`,
                  })
                : triLang(lang, {
                    uk: `Отримати ${previewXP} XP`,
                    ru: `Получить ${previewXP} XP`,
                    es: `Reclamar ${previewXP} XP`,
                  })}
            </Text>
          </TouchableOpacity>
          {xpShown && (
            <Animated.View style={{
              marginTop: 10,
              opacity: xpAnim,
              transform: [{ translateY: xpAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
            }}>
              <XpGainBadge amount={earnedXP} visible={xpShown} style={{ color: '#F5A623', fontSize: f.h2, fontWeight: '700' }} />
            </Animated.View>
          )}
        </View>
      </ScrollView>
      </ContentWrap>
    </SafeAreaView>
    </ScreenGradient>
  );
}
