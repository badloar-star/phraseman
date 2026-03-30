import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import ScreenGradient from '../components/ScreenGradient';
import { updateTaskProgress } from './daily_tasks';

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
function Table({ rows, t }: { rows: string[][]; t: any; f?: any }) {
  if (!rows.length) return null;
  const header = rows[0];
  const body = rows.slice(1);
  return (
    <View style={{ borderRadius: 10, borderWidth: 0.5, borderColor: t.border, marginVertical: 10, overflow: 'hidden' }}>
      {/* Заголовок */}
      <View style={{ flexDirection: 'row', backgroundColor: t.bgSurface }}>
        {header.map((cell, i) => (
          <View key={i} style={{ flex: 1, paddingHorizontal: 8, paddingVertical: 10, borderRightWidth: i < header.length - 1 ? 0.5 : 0, borderRightColor: t.border }}>
            <Text style={{ color: t.textPrimary, fontSize: 12, fontWeight: '700' }} maxFontSizeMultiplier={1}>{cell}</Text>
          </View>
        ))}
      </View>
      {/* Строки */}
      {body.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row', backgroundColor: ri % 2 === 0 ? t.bgCard : t.bgSurface, borderTopWidth: 0.5, borderTopColor: t.border }}>
          {row.map((cell, ci) => (
            <View key={ci} style={{ flex: 1, paddingHorizontal: 8, paddingVertical: 10, borderRightWidth: ci < row.length - 1 ? 0.5 : 0, borderRightColor: t.border }}>
              <Text style={{ color: t.textSecond, fontSize: 11, lineHeight: 17 }} maxFontSizeMultiplier={1}>{cell}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// ─── Контент уроков ───────────────────────────────────────────────────────────

type TheoryContent = {
  titleRU: string;
  titleUK: string;
  render: (t: any, isUK: boolean, f: any) => React.ReactNode[];
};


const THEORY: Record<number, TheoryContent> = {
  1: {
    titleRU: 'Глагол To Be — основа английского',
    titleUK: 'Дієслово To Be — основа англійської',
    render: (t, isUK, f) => [
      <Body key="intro" t={t} f={f} text={isUK
        ? 'В українській мові дієслово «бути» майже не вживається в теперішньому часі: ми говоримо «Я вчитель», «Він лікар». Але в англійській мові без To Be речення неможливе — воно є обов\'язковим зв\'язуючим елементом між підметом і присудком. Це перше і найважливіше правило англійської граматики.'
        : 'В русском языке глагол «быть» почти не используется в настоящем времени: мы говорим «Я учитель», «Он врач». Но в английском языке без To Be предложение невозможно — он является обязательным связующим элементом между подлежащим и сказуемым. Это первое и важнейшее правило английской грамматики.'} />,
      <Example key="e_intro" t={t} f={f} eng="I am a teacher. / He is a doctor. / They are students." rus={isUK ? 'Я вчитель. / Він лікар. / Вони студенти.' : 'Я учитель. / Он врач. / Они студенты.'} />,

      <Section key="s1" t={t} f={f} title={isUK ? '1. Три форми To Be у теперішньому часі' : '1. Три формы To Be в настоящем времени'} />,
      <Body key="b1a" t={t} f={f} text={isUK
        ? 'To Be має три форми: am (тільки з I), is (He/She/It), are (You/We/They). Без винятків!'
        : 'To Be имеет три формы: am (только с I), is (He/She/It), are (You/We/They). Без исключений!'} />,
      <Table key="t1" t={t} f={f} rows={[
        [isUK ? 'Займенник' : 'Местоимение', isUK ? 'Повна форма' : 'Полная форма', isUK ? 'Скорочення' : 'Сокращение', isUK ? 'Приклад' : 'Пример'],
        ['I', 'am', "I'm", "I'm a teacher."],
        ['You', 'are', "You're", "You're my friend."],
        ['He', 'is', "He's", "He's a doctor."],
        ['She', 'is', "She's", "She's very smart."],
        ['It', 'is', "It's", "It's cold today."],
        ['We', 'are', "We're", "We're students."],
        ['They', 'are', "They're", "They're at home."],
      ]} />,
      <Tip key="tip1" t={t} f={f} text={isUK
        ? 'Запам\'ятай формулу: I → am, He/She/It → is, все інші (You/We/They) → are. Це найважливіша таблиця англійської. Скорочення вживаються в розмовній мові та листуванні.'
        : 'Запомни формулу: I → am, He/She/It → is, все остальные (You/We/They) → are. Это важнейшая таблица английского. Сокращения используются в разговорной речи и переписке.'} />,

      <Section key="s2" t={t} f={f} title={isUK ? '2. Структура речень з To Be' : '2. Структура предложений с To Be'} />,
      <Table key="t2" t={t} f={f} rows={[
        [isUK ? 'Тип' : 'Тип', isUK ? 'Структура' : 'Структура', isUK ? 'Приклад' : 'Пример'],
        [isUK ? 'Ствердження' : 'Утверждение', isUK ? 'Підмет + am/is/are + ...' : 'Подлежащее + am/is/are + ...', 'He is a manager.'],
        [isUK ? 'Заперечення' : 'Отрицание', isUK ? 'Підмет + am/is/are + not + ...' : 'Подлежащее + am/is/are + not + ...', "She isn't ready."],
        [isUK ? 'Питання' : 'Вопрос', isUK ? 'Am/Is/Are + підмет + ...?' : 'Am/Is/Are + подлежащее + ...?', 'Are you tired?'],
        [isUK ? 'Короткі відповіді' : 'Краткие ответы', 'Yes, I am. / No, I\'m not.', 'Yes, she is. / No, he isn\'t.'],
      ]} />,

      <Section key="s3" t={t} f={f} title={isUK ? '3. To Be з різними типами присудка' : '3. To Be с разными типами сказуемого'} />,
      <Body key="b3a" t={t} f={f} text={isUK
        ? 'To Be вживається перед: іменником (професія, національність), прикметником (стан, якість), прислівником місця та інших обставин.'
        : 'To Be употребляется перед: существительным (профессия, национальность), прилагательным (состояние, качество), наречием места и других обстоятельств.'} />,
      <Example key="e1" t={t} f={f} eng="I am a programmer." rus={isUK ? 'Я програміст. (іменник)' : 'Я программист. (существительное)'} />,
      <Example key="e2" t={t} f={f} eng="She is very smart." rus={isUK ? 'Вона дуже розумна. (прикметник)' : 'Она очень умная. (прилагательное)'} />,
      <Example key="e3" t={t} f={f} eng="They are at home." rus={isUK ? 'Вони вдома. (місце)' : 'Они дома. (место)'} />,
      <Example key="e4" t={t} f={f} eng="It is Monday today." rus={isUK ? 'Сьогодні понеділок. (день тижня)' : 'Сегодня понедельник. (день недели)'} />,
      <Example key="e5" t={t} f={f} eng="The coffee is hot." rus={isUK ? 'Кава гаряча. (температура)' : 'Кофе горячий. (температура)'} />,

      <Section key="s4" t={t} f={f} title={isUK ? '4. To Be у питаннях' : '4. To Be в вопросах'} />,
      <Body key="b4a" t={t} f={f} text={isUK
        ? 'Для утворення питання am/is/are стає на перше місце. Порядок слів змінюється: дієслово → підмет → решта.'
        : 'Для образования вопроса am/is/are выходит на первое место. Порядок слов меняется: глагол → подлежащее → остальное.'} />,
      <Example key="e6" t={t} f={f} eng="Are you a doctor?" rus={isUK ? 'Ти лікар?' : 'Ты врач?'} />,
      <Example key="e7" t={t} f={f} eng="Is she ready?" rus={isUK ? 'Вона готова?' : 'Она готова?'} />,
      <Example key="e8" t={t} f={f} eng="Is it expensive?" rus={isUK ? 'Це дорого?' : 'Это дорого?'} />,
      <Example key="e9" t={t} f={f} eng="Are they students?" rus={isUK ? 'Вони студенти?' : 'Они студенты?'} />,

      <Section key="s5" t={t} f={f} title={isUK ? '5. To Be з національністю і мовами' : '5. To Be с национальностью и языками'} />,
      <Table key="t3" t={t} f={f} rows={[
        [isUK ? 'Запитання' : 'Вопрос', isUK ? 'Відповідь' : 'Ответ'],
        ['Where are you from?', "I'm from Ukraine / Russia."],
        ['What nationality are you?', "I'm Ukrainian / Russian."],
        ['What language do you speak?', "I speak Ukrainian and English."],
      ]} />,

      <Section key="s6" t={t} f={f} title={isUK ? '6. Часті помилки' : '6. Частые ошибки'} />,
      <Warn key="w1" t={t} f={f} text={isUK
        ? '❌ «I is a teacher» → ✅ «I am a teacher». З I — тільки am! Ніколи is або are!'
        : '❌ «I is a teacher» → ✅ «I am a teacher». С I — только am! Никогда is или are!'} />,
      <Warn key="w2" t={t} f={f} text={isUK
        ? '❌ «She are smart» → ✅ «She is smart». He/She/It — тільки is!'
        : '❌ «She are smart» → ✅ «She is smart». He/She/It — только is!'} />,
      <Warn key="w3" t={t} f={f} text={isUK
        ? '❌ «Are you teacher?» → ✅ «Are you a teacher?». Перед одиничними іменниками потрібен артикль a/an!'
        : '❌ «Are you teacher?» → ✅ «Are you a teacher?». Перед единственными существительными нужен артикль a/an!'} />,
      <Warn key="w4" t={t} f={f} text={isUK
        ? '❌ «I teacher» (без To Be) → ✅ «I am a teacher». В англійській TO BE обов\'язковий! Не можна пропускати як в українській/російській.'
        : '❌ «I teacher» (без To Be) → ✅ «I am a teacher». В английском TO BE обязателен! Нельзя пропускать как в русском/украинском.'} />,
      <Tip key="tip2" t={t} f={f} text={isUK
        ? 'Практична порада: перш ніж говорити будь-яке речення, запитай себе — чи є там дієслово? Якщо ні — потрібен To Be. «I am tired», «She is here», «We are ready».'
        : 'Практический совет: прежде чем говорить любое предложение, спроси себя — есть ли там глагол? Если нет — нужен To Be. «I am tired», «She is here», «We are ready».'} />,

      <Section key="s7" t={t} f={f} title={isUK ? '7. Присвійні займенники: my / your / his / her / our / their' : '7. Притяжательные местоимения: my / your / his / her / our / their'} />,
      <Body key="b7a" t={t} f={f} text={isUK
        ? 'Присвійні займенники вказують, кому щось належить. Вони стоять ПЕРЕД іменником і не змінюються — незалежно від роду та числа іменника.'
        : 'Притяжательные местоимения указывают, кому что-то принадлежит. Они стоят ПЕРЕД существительным и не изменяются — независимо от рода и числа существительного.'} />,
      <Table key="t7" t={t} f={f} rows={[
        [isUK ? 'Займенник' : 'Местоимение', isUK ? 'Присвійне' : 'Притяжательное', isUK ? 'Приклад' : 'Пример'],
        ['I', 'my', 'my manager / my colleagues'],
        ['you', 'your', 'your team / your project'],
        ['he', 'his', 'his partner / his office'],
        ['she', 'her', 'her report / her job'],
        ['we', 'our', 'our clients / our city'],
        ['they', 'their', 'their neighbours / their team'],
      ]} />,
      <Tip key="tip7" t={t} f={f} text={isUK
        ? 'my book = my books = my friend — завжди my! Жодних змін залежно від роду чи числа, як в українській «мій/моя/моє/мої».'
        : 'my book = my books = my friend — всегда my! Никаких изменений по роду или числу, как в русском «мой/моя/моё/мои».'} />,

      <Section key="s8" t={t} f={f} title={isUK ? '8. Множина іменників (-s / -es)' : '8. Множественное число существительных (-s / -es)'} />,
      <Body key="b8a" t={t} f={f} text={isUK
        ? 'В англійській немає відмінювання — для множини просто додається -s або -es. Рід іменника значення не має.'
        : 'В английском нет склонения — для множественного числа просто добавляется -s или -es. Род существительного значения не имеет.'} />,
      <Table key="t8" t={t} f={f} rows={[
        [isUK ? 'Правило' : 'Правило', isUK ? 'Однина' : 'Ед. число', isUK ? 'Множина' : 'Мн. число'],
        [isUK ? 'більшість іменників + -s' : 'большинство + -s', 'student, driver, teacher', 'students, drivers, teachers'],
        [isUK ? '-s/-x/-z/-ch/-sh + -es' : '-s/-x/-z/-ch/-sh + -es', 'boss, watch', 'bosses, watches'],
        [isUK ? 'приголосна + y → -ies' : 'согл. + y → -ies', 'city, company', 'cities, companies'],
        [isUK ? 'неправильні форми' : 'неправильные формы', 'man / woman / child', 'men / women / children'],
      ]} />,
      <Example key="e8a" t={t} f={f} eng="We are students. / They are drivers. / They are experienced specialists." rus={isUK ? 'Ми студенти. / Вони водії. / Вони досвідчені фахівці.' : 'Мы студенты. / Они водители. / Они опытные специалисты.'} />,

      <Section key="s9" t={t} f={f} title={isUK ? '9. Such та so — підсилення ознаки' : '9. Such и so — усиление признака'} />,
      <Body key="b9a" t={t} f={f} text={isUK
        ? 'Such і so обидва підсилюють значення прикметника, але вживаються по-різному. Ключове питання: є після прикметника іменник чи ні?'
        : 'Such и so оба усиливают значение прилагательного, но употребляются по-разному. Ключевой вопрос: есть ли после прилагательного существительное?'} />,
      <Table key="t9" t={t} f={f} rows={[
        [isUK ? 'Слово' : 'Слово', isUK ? 'Структура' : 'Структура', isUK ? 'Приклад' : 'Пример'],
        ['such', isUK ? 'such a/an + прикм. + іменник' : 'such a/an + прил. + сущ.', 'He is such a busy person.'],
        ['so', isUK ? 'so + прикметник (без іменника)' : 'so + прилагательное (без сущ.)', 'She is so kind.'],
      ]} />,
      <Example key="e9a" t={t} f={f} eng="He is such a busy person." rus={isUK ? 'Він такий зайнятий чоловік.' : 'Он такой занятой человек.'} />,
      <Example key="e9b" t={t} f={f} eng="She is so kind." rus={isUK ? 'Вона така добра.' : 'Она такая добрая.'} />,
      <Tip key="tip9" t={t} f={f} text={isUK
        ? 'Є іменник після прикметника? → such a/an. Немає іменника? → so. «such a beautiful city» / «so beautiful».'
        : 'Есть существительное после прилагательного? → such a/an. Нет существительного? → so. «such a beautiful city» / «so beautiful».'} />,
    ],
  },

  2: {
    titleRU: `Отрицание To Be: isn't / aren't / am not`,
    titleUK: `Заперечення To Be: isn't / aren't / am not`,
    render: (t, isUK, f) => [
      <Body key="intro" t={t} f={f} text={isUK
        ? 'Заперечення і питання з To Be будуються без допоміжних дієслів — просто додаємо not після am/is/are або переставляємо дієслово на початок. Це простіше, ніж у Present Simple, де потрібен do/does.'
        : 'Отрицание и вопросы с To Be строятся без вспомогательных глаголов — просто добавляем not после am/is/are или переставляем глагол в начало. Это проще, чем в Present Simple, где нужен do/does.'} />,
      <Example key="e_intro" t={t} f={f} eng="He is not young. / She isn't ready. / Are they here?" rus={isUK ? 'Він не молодий. / Вона не готова. / Вони тут?' : 'Он не молодой. / Она не готова. / Они здесь?'} />,

      <Section key="s1" t={t} f={f} title={isUK ? '1. Форми заперечення To Be' : '1. Формы отрицания To Be'} />,
      <Table key="t1" t={t} f={f} rows={[
        [isUK ? 'Займенник' : 'Местоимение', isUK ? 'Повна форма' : 'Полная форма', isUK ? 'Скорочення 1' : 'Сокращение 1', isUK ? 'Скорочення 2' : 'Сокращение 2'],
        ['I', 'am not', "I'm not", isUK ? '— (немає)' : '— (нет)'],
        ['You', 'are not', "aren't", "you're not"],
        ['He / She / It', 'is not', "isn't", "he's not / she's not"],
        ['We', 'are not', "aren't", "we're not"],
        ['They', 'are not', "aren't", "they're not"],
      ]} />,
      <Tip key="tip1" t={t} f={f} text={isUK
        ? 'ВАЖЛИВО: «am not» — єдина форма без скорочення. Не існує «amn\'t»! Для I вживається тільки «I\'m not».'
        : 'ВАЖНО: «am not» — единственная форма без сокращения. Не существует «amn\'t»! Для I используется только «I\'m not».'} />,

      <Section key="s2" t={t} f={f} title={isUK ? '2. Приклади заперечних речень' : '2. Примеры отрицательных предложений'} />,
      <Example key="e1" t={t} f={f} eng="I'm not tired." rus={isUK ? 'Я не втомлений.' : 'Я не устал.'} />,
      <Example key="e2" t={t} f={f} eng="He isn't at home right now." rus={isUK ? 'Він зараз не вдома.' : 'Он сейчас не дома.'} />,
      <Example key="e3" t={t} f={f} eng="They aren't ready for the exam." rus={isUK ? 'Вони не готові до іспиту.' : 'Они не готовы к экзамену.'} />,
      <Example key="e4" t={t} f={f} eng="She isn't a doctor — she's a nurse." rus={isUK ? 'Вона не лікар — вона медсестра.' : 'Она не врач — она медсестра.'} />,
      <Example key="e5" t={t} f={f} eng="It isn't cold today." rus={isUK ? 'Сьогодні не холодно.' : 'Сегодня не холодно.'} />,

      <Section key="s3" t={t} f={f} title={isUK ? '3. Структура питань з To Be' : '3. Структура вопросов с To Be'} />,
      <Body key="b3" t={t} f={f} text={isUK
        ? 'Для питання am/is/are виходить на перше місце перед підметом. Все інше залишається на своєму місці. Інтонація підвищується наприкінці.'
        : 'Для вопроса am/is/are выходит на первое место перед подлежащим. Всё остальное остаётся на месте. Интонация повышается в конце.'} />,
      <Table key="t2" t={t} f={f} rows={[
        [isUK ? 'Тип' : 'Тип', isUK ? 'Структура' : 'Структура', isUK ? 'Приклад' : 'Пример'],
        [isUK ? 'Ствердження' : 'Утверждение', 'Subject + am/is/are + ...', 'She is a teacher.'],
        [isUK ? 'Заперечення' : 'Отрицание', "Subject + isn't/aren't/am not + ...", "She isn't a teacher."],
        [isUK ? 'Питання' : 'Вопрос', 'Am/Is/Are + subject + ...?', 'Is she a teacher?'],
      ]} />,

      <Section key="s4" t={t} f={f} title={isUK ? '4. Короткі відповіді' : '4. Краткие ответы'} />,
      <Table key="t3" t={t} f={f} rows={[
        [isUK ? 'Питання' : 'Вопрос', isUK ? 'Так' : 'Да', isUK ? 'Ні' : 'Нет'],
        ['Am I...?', 'Yes, you are.', "No, you aren't."],
        ['Are you...?', 'Yes, I am.', "No, I'm not."],
        ['Is he/she/it...?', 'Yes, he/she/it is.', "No, he/she/it isn't."],
        ['Are we...?', 'Yes, we are.', "No, we aren't."],
        ['Are they...?', 'Yes, they are.', "No, they aren't."],
      ]} />,
      <Tip key="tip2" t={t} f={f} text={isUK
        ? 'У коротких відповідях НІКОЛИ не використовують скорочення для «Yes»: правильно «Yes, she IS» (не «Yes, she\'s»). Але в заперечних відповідях — можна: «No, she isn\'t».'
        : 'В кратких ответах НИКОГДА не используют сокращение для «Yes»: правильно «Yes, she IS» (не «Yes, she\'s»). Но в отрицательных ответах — можно: «No, she isn\'t».'} />,

      <Section key="s5" t={t} f={f} title={isUK ? '5. Wh-питання з To Be' : '5. Wh-вопросы с To Be'} />,
      <Body key="b5" t={t} f={f} text={isUK
        ? 'Wh-слово (What, Where, Who, How, Why, When) стає на початок речення, після нього — am/is/are, потім підмет.'
        : 'Wh-слово (What, Where, Who, How, Why, When) становится в начало предложения, после него — am/is/are, затем подлежащее.'} />,
      <Example key="e6" t={t} f={f} eng="Where are you from?" rus={isUK ? 'Звідки ти?' : 'Откуда ты?'} />,
      <Example key="e7" t={t} f={f} eng="What is your name?" rus={isUK ? 'Як тебе звати?' : 'Как тебя зовут?'} />,
      <Example key="e8" t={t} f={f} eng="How old are you?" rus={isUK ? 'Скільки тобі років?' : 'Сколько тебе лет?'} />,
      <Example key="e9" t={t} f={f} eng="Why is she late?" rus={isUK ? 'Чому вона запізнюється?' : 'Почему она опаздывает?'} />,

      <Section key="s6" t={t} f={f} title={isUK ? '6. Часті помилки' : '6. Частые ошибки'} />,
      <Warn key="w1" t={t} f={f} text={isUK
        ? '❌ «She not is ready» → ✅ «She isn\'t ready». Not стоїть ПІСЛЯ am/is/are, не перед!'
        : '❌ «She not is ready» → ✅ «She isn\'t ready». Not стоит ПОСЛЕ am/is/are, не перед!'} />,
      <Warn key="w2" t={t} f={f} text={isUK
        ? '❌ «Is she doctor?» → ✅ «Is she a doctor?». Перед назвами професій потрібен артикль a/an!'
        : '❌ «Is she doctor?» → ✅ «Is she a doctor?». Перед названиями профессий нужен артикль a/an!'} />,
      <Warn key="w3" t={t} f={f} text={isUK
        ? '❌ «Yes, she is a.» → ✅ «Yes, she is.». У коротких відповідях артикль не потрібен!'
        : '❌ «Yes, she is a.» → ✅ «Yes, she is.». В кратких ответах артикль не нужен!'} />,
      <Warn key="w4" t={t} f={f} text={isUK
        ? '❌ «I amn\'t ready» → ✅ «I\'m not ready». Форми «amn\'t» не існує в стандартній англійській!'
        : '❌ «I amn\'t ready» → ✅ «I\'m not ready». Формы «amn\'t» не существует в стандартном английском!'} />,

      <Section key="s7" t={t} f={f} title={isUK ? '7. Присвійні займенники: my / your / our' : '7. Притяжательные местоимения: my / your / our'} />,
      <Body key="b7" t={t} f={f} text={isUK
        ? 'В цьому уроці зустрічаються речення з присвійними займенниками. Вони стоять ПЕРЕД іменником і не змінюються за родом і числом.'
        : 'В этом уроке встречаются предложения с притяжательными местоимениями. Они стоят ПЕРЕД существительным и не изменяются по роду и числу.'} />,
      <Table key="t7" t={t} f={f} rows={[
        [isUK ? 'Займенник' : 'Местоимение', isUK ? 'Присвійне' : 'Притяжательное', isUK ? 'Приклад' : 'Пример'],
        ['I', 'my', isUK ? 'my colleague — мій колега' : 'my colleague — мой коллега'],
        ['you', 'your', isUK ? 'your phone — твій телефон' : 'your phone — твой телефон'],
        ['he', 'his', isUK ? 'his office — його офіс' : 'his office — его офис'],
        ['she', 'her', isUK ? 'her mistake — її помилка' : 'her mistake — её ошибка'],
        ['we', 'our', isUK ? 'our competitors — наші конкуренти' : 'our competitors — наши конкуренты'],
        ['they', 'their', isUK ? 'their partner — їхній партнер' : 'their partner — их партнёр'],
      ]} />,
      <Tip key="tip7" t={t} f={f} text={isUK
        ? 'my, your, our — не змінюються! «my mistake» і «my colleagues» — однаково my. Жодних «мій/моя/моє» як в українській.'
        : 'my, your, our — не изменяются! «my mistake» и «my colleagues» — одинаково my. Никаких «мой/моя/моё» как в русском.'} />,

      <Section key="s8" t={t} f={f} title={isUK ? '8. Множина: students / colleagues / partners' : '8. Множественное число: students / colleagues / partners'} />,
      <Body key="b8" t={t} f={f} text={isUK
        ? 'В уроці є іменники у множині. В англійській для множини просто додається -s або -es — без відмінювання.'
        : 'В уроке есть существительные во множественном числе. В английском для множественного числа просто добавляется -s или -es — без склонения.'} />,
      <Example key="e8a" t={t} f={f} eng="They are not students." rus={isUK ? 'Вони не студенти.' : 'Они не студенты.'} />,
      <Example key="e8b" t={t} f={f} eng="We are not neighbours." rus={isUK ? 'Ми не сусіди.' : 'Мы не соседи.'} />,
      <Example key="e8c" t={t} f={f} eng="They are not our competitors." rus={isUK ? 'Вони не наші конкуренти.' : 'Они не наши конкуренты.'} />,
      <Tip key="tip8" t={t} f={f} text={isUK
        ? 'student → students, colleague → colleagues, partner → partners. Просто +s! Запам\'ятай: немає закінчень відмінювання — лише -s для множини.'
        : 'student → students, colleague → colleagues, partner → partners. Просто +s! Запомни: нет падежных окончаний — только -s для множественного числа.'} />,
    ],
  },

  3: {
    titleRU: 'Present Simple — Утверждение',
    titleUK: 'Present Simple — Ствердження',
    render: (t, isUK, f) => [
      <Body key="intro" t={t} f={f} text={isUK
        ? 'Present Simple — це час для регулярних дій, звичок, розкладів і загальних фактів. Він описує те, що відбувається завжди, зазвичай або регулярно — а не прямо зараз. «Я п\'ю каву щоранку» — це Present Simple. «Я зараз п\'ю каву» — це вже Present Continuous.'
        : 'Present Simple — это время для регулярных действий, привычек, расписаний и общих фактов. Он описывает то, что происходит всегда, обычно или регулярно — а не прямо сейчас. «Я пью кофе каждое утро» — это Present Simple. «Я сейчас пью кофе» — это уже Present Continuous.'} />,
      <Example key="e_intro" t={t} f={f} eng="She works every day. / I drink coffee in the morning." rus={isUK ? 'Вона працює щодня. / Я п\'ю каву вранці.' : 'Она работает каждый день. / Я пью кофе по утрам.'} />,

      <Section key="s1" t={t} f={f} title={isUK ? '1. Форми дієслова у Present Simple' : '1. Формы глагола в Present Simple'} />,
      <Table key="t1" t={t} f={f} rows={[
        [isUK ? 'Підмет' : 'Подлежащее', isUK ? 'Форма' : 'Форма', isUK ? 'Приклад' : 'Пример'],
        ['I', isUK ? 'основна форма' : 'основная форма', 'I work. I live here.'],
        ['You', isUK ? 'основна форма' : 'основная форма', 'You work. You live here.'],
        ['We', isUK ? 'основна форма' : 'основная форма', 'We work. We live here.'],
        ['They', isUK ? 'основна форма' : 'основная форма', 'They work. They live here.'],
        ['He', isUK ? 'основна + -s / -es' : 'основная + -s / -es', 'He works. He goes.'],
        ['She', isUK ? 'основна + -s / -es' : 'основная + -s / -es', 'She works. She goes.'],
        ['It', isUK ? 'основна + -s / -es' : 'основная + -s / -es', 'It works. It costs.'],
      ]} />,
      <Tip key="tip1" t={t} f={f} text={isUK
        ? 'Головне правило: тільки He/She/It отримують закінчення -s/-es. Для всіх інших займенників дієслово залишається незмінним. Це найпоширеніша помилка початківців!'
        : 'Главное правило: только He/She/It получают окончание -s/-es. Для всех остальных местоимений глагол остаётся неизменным. Это самая частая ошибка начинающих!'} />,

      <Section key="s2" t={t} f={f} title={isUK ? '2. Правила додавання -s/-es для He/She/It' : '2. Правила добавления -s/-es для He/She/It'} />,
      <Table key="t2" t={t} f={f} rows={[
        [isUK ? 'Закінчення дієслова' : 'Окончание глагола', isUK ? 'Правило' : 'Правило', isUK ? 'Приклади' : 'Примеры'],
        [isUK ? 'Більшість дієслів' : 'Большинство глаголов', '+ s', 'work→works, play→plays, read→reads'],
        ['-s, -sh, -ch, -x, -o', '+ es', 'go→goes, watch→watches, fix→fixes, wash→washes'],
        [isUK ? 'Приголосна + y' : 'Согласная + y', 'y → ies', 'study→studies, try→tries, fly→flies'],
        [isUK ? 'Голосна + y' : 'Гласная + y', '+ s (звичайне)', 'play→plays, say→says, buy→buys'],
      ]} />,

      <Section key="s3" t={t} f={f} title={isUK ? '3. Коли використовувати Present Simple' : '3. Когда использовать Present Simple'} />,
      <Table key="t3" t={t} f={f} rows={[
        [isUK ? 'Ситуація' : 'Ситуация', isUK ? 'Маркери' : 'Маркеры', isUK ? 'Приклад' : 'Пример'],
        [isUK ? 'Звичка / регулярна дія' : 'Привычка / регулярное действие', 'always, every day, usually', 'She always comes on time.'],
        [isUK ? 'Постійна ситуація' : 'Постоянная ситуация', isUK ? 'немає маркера' : 'нет маркера', 'We live in London.'],
        [isUK ? 'Загальний факт, наука' : 'Общий факт, наука', isUK ? 'немає маркера' : 'нет маркера', 'The sun rises in the east.'],
        [isUK ? 'Розклад (транспорт, кіно)' : 'Расписание (транспорт, кино)', 'at 9, on Monday', 'The train leaves at 9.'],
        [isUK ? 'Інструкції, рецепти' : 'Инструкции, рецепты', 'first, then, next', 'First you add flour, then you mix.'],
      ]} />,

      <Section key="s4" t={t} f={f} title={isUK ? '4. Прислівники частоти' : '4. Наречия частотности'} />,
      <Body key="b4a" t={t} f={f} text={isUK
        ? 'Прислівники частоти показують, як часто відбувається дія. Вони стоять ПЕРЕД основним дієсловом, але ПІСЛЯ дієслова To Be.'
        : 'Наречия частотности показывают, как часто происходит действие. Они стоят ПЕРЕД основным глаголом, но ПОСЛЕ глагола To Be.'} />,
      <Table key="t4" t={t} f={f} rows={[
        [isUK ? 'Прислівник' : 'Наречие', '%', isUK ? 'Позиція в реченні' : 'Позиция в предложении', isUK ? 'Приклад' : 'Пример'],
        ['always', '100%', isUK ? 'перед основним дієсловом' : 'перед основным глаголом', 'She always drinks coffee.'],
        ['usually', '80%', isUK ? 'перед основним дієсловом' : 'перед основным глаголом', 'I usually walk to work.'],
        ['often', '60%', isUK ? 'перед основним дієсловом' : 'перед основным глаголом', 'They often go hiking.'],
        ['sometimes', '40%', isUK ? 'перед дієсловом або на початку' : 'перед глаголом или в начале', 'Sometimes I cook at home.'],
        ['rarely / seldom', '15%', isUK ? 'перед основним дієсловом' : 'перед основным глаголом', 'He rarely eats meat.'],
        ['never', '0%', isUK ? 'перед основним дієсловом' : 'перед основным глаголом', 'I never drink alcohol.'],
      ]} />,
      <Example key="e1" t={t} f={f} eng="She always drinks coffee in the morning." rus={isUK ? 'Вона завжди п\'є каву вранці.' : 'Она всегда пьёт кофе по утрам.'} />,
      <Example key="e2" t={t} f={f} eng="He usually walks to work." rus={isUK ? 'Він зазвичай ходить пішки на роботу.' : 'Он обычно ходит пешком на работу.'} />,
      <Example key="e3" t={t} f={f} eng="They sometimes eat out on Fridays." rus={isUK ? 'Іноді по п\'ятницях вони їдять у ресторані.' : 'Иногда по пятницам они едят в ресторане.'} />,
      <Example key="e4" t={t} f={f} eng="She is always late. (після To Be!)" rus={isUK ? 'Вона завжди запізнюється. (always після is!)' : 'Она всегда опаздывает. (always после is!)'} />,

      <Section key="s5" t={t} f={f} title={isUK ? '5. Часові вирази Present Simple' : '5. Временные выражения Present Simple'} />,
      <Body key="b5" t={t} f={f} text={isUK
        ? 'Слова-маркери: every day/week/month/year, on Mondays, in the morning/afternoon/evening, at the weekend, once/twice a week, three times a month.'
        : 'Слова-маркеры: every day/week/month/year, on Mondays, in the morning/afternoon/evening, at the weekend, once/twice a week, three times a month.'} />,

      <Warn key="w1" t={t} f={f} text={isUK
        ? '❌ «She work every day» → ✅ «She works every day». З he/she/it обов\'язкове -s!'
        : '❌ «She work every day» → ✅ «She works every day». С he/she/it обязательно -s!'} />,
      <Warn key="w2" t={t} f={f} text={isUK
        ? '❌ «I am work» → ✅ «I work». Present Simple не потребує am/is/are (крім To Be)!'
        : '❌ «I am work» → ✅ «I work». Present Simple не требует am/is/are (кроме To Be)!'} />,
      <Warn key="w3" t={t} f={f} text={isUK
        ? '❌ «He studys» → ✅ «He studies». Після приголосної + y → ies, не ys!'
        : '❌ «He studys» → ✅ «He studies». После согласной + y → ies, не ys!'} />,

      <Section key="s6" t={t} f={f} title={isUK ? '6. Прийменники часу: at / in / on' : '6. Предлоги времени: at / in / on'} />,
      <Body key="b6" t={t} f={f} text={isUK
        ? 'В реченнях уроку часто зустрічаються прийменники часу. Основне правило вибору:'
        : 'В предложениях урока часто встречаются предлоги времени. Основное правило выбора:'} />,
      <Table key="t6" t={t} f={f} rows={[
        [isUK ? 'Прийменник' : 'Предлог', isUK ? 'Використання' : 'Использование', isUK ? 'Приклади' : 'Примеры'],
        ['at', isUK ? 'точний час, певні вирази' : 'точное время, устойчивые выражения', 'at 7, at noon, at weekends, at work, on time'],
        ['in', isUK ? 'частина доби, місяць, сезон, рік' : 'часть суток, месяц, сезон, год', 'in the morning, in July, in summer, in 2024'],
        ['on', isUK ? 'день тижня, конкретна дата' : 'день недели, конкретная дата', 'on Monday, on Fridays, on 5 March'],
      ]} />,
      <Example key="e6a" t={t} f={f} eng="I usually get up at seven." rus={isUK ? 'Я зазвичай встаю о сьомій.' : 'Я обычно встаю в семь.'} />,
      <Example key="e6b" t={t} f={f} eng="We exercise in the mornings." rus={isUK ? 'Ми займаємося спортом вранці.' : 'Мы занимаемся спортом по утрам.'} />,
      <Example key="e6c" t={t} f={f} eng="He always comes on time." rus={isUK ? 'Він завжди приходить вчасно.' : 'Он всегда приходит вовремя.'} />,
      <Tip key="tip6" t={t} f={f} text={isUK
        ? 'Підказка: AT — для годин (at 7) і точних моментів; IN — для ранку/вечора (in the morning); ON — для днів (on Friday). Ці прийменники не перекладаються буквально!'
        : 'Подсказка: AT — для часов (at 7) и точных моментов; IN — для утра/вечера (in the morning); ON — для дней (on Friday). Эти предлоги не переводятся буквально!'} />,
    ],
  },

  4: {
    titleRU: 'Present Simple — Отрицание и вопросы',
    titleUK: 'Present Simple — Заперечення і питання',
    render: (t, isUK, f) => [
      <Body key="intro" t={t} f={f} text={isUK
        ? 'Для заперечень і питань у Present Simple потрібне допоміжне дієслово do або does. Це ключова відмінність від To Be. Головне дієслово при цьому завжди залишається в основній формі — без -s, навіть якщо підмет he/she/it!'
        : 'Для отрицаний и вопросов в Present Simple нужен вспомогательный глагол do или does. Это ключевое отличие от To Be. Основной глагол при этом всегда остаётся в основной форме — без -s, даже если подлежащее he/she/it!'} />,
      <Example key="e_intro" t={t} f={f} eng="She doesn't work here. / Do you speak English? — Yes, I do." rus={isUK ? 'Вона тут не працює. / Ти розмовляєш англійською? — Так.' : 'Она здесь не работает. / Ты говоришь по-английски? — Да.'} />,

      <Section key="s1" t={t} f={f} title={isUK ? '1. Do / Does — вибір допоміжного дієслова' : '1. Do / Does — выбор вспомогательного глагола'} />,
      <Table key="t1" t={t} f={f} rows={[
        [isUK ? 'Підмет' : 'Подлежащее', isUK ? 'Допоміжне' : 'Вспомогательное', isUK ? 'Заперечення' : 'Отрицание', isUK ? 'Питання' : 'Вопрос'],
        ['I', 'do', "don't + V", "Do I + V?"],
        ['You', 'do', "don't + V", "Do you + V?"],
        ['We', 'do', "don't + V", "Do we + V?"],
        ['They', 'do', "don't + V", "Do they + V?"],
        ['He', 'does', "doesn't + V", "Does he + V?"],
        ['She', 'does', "doesn't + V", "Does she + V?"],
        ['It', 'does', "doesn't + V", "Does it + V?"],
      ]} />,
      <Tip key="tip1" t={t} f={f} text={isUK
        ? 'Золоте правило: якщо є does/doesn\'t — основне дієслово БЕЗ -s. Наприклад: «She doesn\'t work» (не «works»). Закінчення -s «переходить» до допоміжного дієслова does.'
        : 'Золотое правило: если есть does/doesn\'t — основной глагол БЕЗ -s. Например: «She doesn\'t work» (не «works»). Окончание -s «переходит» к вспомогательному глаголу does.'} />,

      <Section key="s2" t={t} f={f} title={isUK ? '2. Структура заперечних речень' : '2. Структура отрицательных предложений'} />,
      <Example key="e1" t={t} f={f} eng="I don't eat meat." rus={isUK ? 'Я не їм м\'ясо.' : 'Я не ем мясо.'} />,
      <Example key="e2" t={t} f={f} eng="She doesn't work here." rus={isUK ? 'Вона тут не працює.' : 'Она здесь не работает.'} />,
      <Example key="e3" t={t} f={f} eng="They don't live in London." rus={isUK ? 'Вони не живуть у Лондоні.' : 'Они не живут в Лондоне.'} />,
      <Example key="e4" t={t} f={f} eng="He doesn't like coffee." rus={isUK ? 'Він не любить каву.' : 'Он не любит кофе.'} />,
      <Example key="e5" t={t} f={f} eng="We don't have a car." rus={isUK ? 'У нас немає машини.' : 'У нас нет машины.'} />,

      <Section key="s3" t={t} f={f} title={isUK ? '3. Структура питальних речень' : '3. Структура вопросительных предложений'} />,
      <Table key="t2" t={t} f={f} rows={[
        [isUK ? 'Тип' : 'Тип', isUK ? 'Структура' : 'Структура', isUK ? 'Приклад' : 'Пример'],
        [isUK ? 'Питання (I/You/We/They)' : 'Вопрос (I/You/We/They)', "Do + subject + V?", "Do you speak English?"],
        [isUK ? 'Питання (He/She/It)' : 'Вопрос (He/She/It)', "Does + subject + V?", "Does he live here?"],
        [isUK ? 'Коротка відповідь Так' : 'Краткий ответ Да', "Yes, I/you/we/they do.", "Yes, she/he/it does."],
        [isUK ? 'Коротка відповідь Ні' : 'Краткий ответ Нет', "No, I/you/we/they don't.", "No, she/he/it doesn't."],
      ]} />,
      <Example key="e6" t={t} f={f} eng="Do you drink coffee? — Yes, I do." rus={isUK ? 'Ти п\'єш каву? — Так.' : 'Ты пьёшь кофе? — Да.'} />,
      <Example key="e7" t={t} f={f} eng="Does she work on Saturdays? — No, she doesn't." rus={isUK ? 'Вона працює в суботи? — Ні.' : 'Она работает по субботам? — Нет.'} />,

      <Section key="s4" t={t} f={f} title={isUK ? '4. Wh-питання в Present Simple' : '4. Wh-вопросы в Present Simple'} />,
      <Body key="b4" t={t} f={f} text={isUK
        ? 'Структура: Wh-слово → do/does → підмет → основне дієслово (без -s)'
        : 'Структура: Wh-слово → do/does → подлежащее → основной глагол (без -s)'} />,
      <Example key="e8" t={t} f={f} eng="Where does she work?" rus={isUK ? 'Де вона працює?' : 'Где она работает?'} />,
      <Example key="e9" t={t} f={f} eng="What do they eat for breakfast?" rus={isUK ? 'Що вони їдять на сніданок?' : 'Что они едят на завтрак?'} />,
      <Example key="e10" t={t} f={f} eng="How often do you go to the gym?" rus={isUK ? 'Як часто ти ходиш до спортзалу?' : 'Как часто ты ходишь в спортзал?'} />,
      <Example key="e11" t={t} f={f} eng="Why does he study English?" rus={isUK ? 'Чому він вивчає англійську?' : 'Почему он учит английский?'} />,

      <Section key="s5" t={t} f={f} title={isUK ? '5. Do/Does vs To Be у питаннях — порівняння' : '5. Do/Does vs To Be в вопросах — сравнение'} />,
      <Table key="t3" t={t} f={f} rows={[
        [isUK ? 'To Be (без do/does)' : 'To Be (без do/does)', isUK ? 'Present Simple (з do/does)' : 'Present Simple (с do/does)'],
        ['Is she a doctor?', 'Does she work as a doctor?'],
        ['Are you tired?', 'Do you feel tired?'],
        ['Is he at home?', 'Does he stay at home?'],
      ]} />,

      <Warn key="w1" t={t} f={f} text={isUK
        ? '❌ «She doesn\'t works» → ✅ «She doesn\'t work». Після doesn\'t — основна форма без -s!'
        : '❌ «She doesn\'t works» → ✅ «She doesn\'t work». После doesn\'t — основная форма без -s!'} />,
      <Warn key="w2" t={t} f={f} text={isUK
        ? '❌ «Does she works here?» → ✅ «Does she work here?». Після does — теж основна форма!'
        : '❌ «Does she works here?» → ✅ «Does she work here?». После does — тоже основная форма!'} />,
      <Warn key="w3" t={t} f={f} text={isUK
        ? '❌ «Do he like music?» → ✅ «Does he like music?». Для he/she/it завжди does!'
        : '❌ «Do he like music?» → ✅ «Does he like music?». Для he/she/it всегда does!'} />,
    ],
  },

  5: {
    titleRU: 'Present Simple — вопросы (Do / Does)',
    titleUK: 'Present Simple — питання (Do / Does)',
    render: (t, isUK, f) => [
      <Body key="intro" t={t} f={f} text={isUK
        ? 'Питання в Present Simple мають кілька типів: yes/no питання, Wh-питання (хто, що, де, коли, чому, як), альтернативні питання (або... або) і розділові питання (правда ж?). Кожен тип має свою структуру.'
        : 'Вопросы в Present Simple имеют несколько типов: yes/no вопросы, Wh-вопросы (кто, что, где, когда, почему, как), альтернативные вопросы (или... или) и разделительные вопросы (не правда ли?). Каждый тип имеет свою структуру.'} />,
      <Example key="e_intro" t={t} f={f} eng="Do you speak English? / Where does she work? / He works, doesn't he?" rus={isUK ? 'Ти розмовляєш англійською? / Де вона працює? / Він працює, чи не так?' : 'Ты говоришь по-английски? / Где она работает? / Он работает, не правда ли?'} />,

      <Section key="s1" t={t} f={f} title={isUK ? '1. Структура yes/no питань' : '1. Структура yes/no вопросов'} />,
      <Table key="t1" t={t} f={f} rows={[
        [isUK ? 'Підмет' : 'Подлежащее', isUK ? 'Допоміжне' : 'Вспомогательное', isUK ? 'Структура' : 'Структура', isUK ? 'Приклад' : 'Пример'],
        ['I / You / We / They', 'Do', "Do + S + V?", "Do you work here?"],
        ['He / She / It', 'Does', "Does + S + V?", "Does she like tea?"],
      ]} />,

      <Section key="s2" t={t} f={f} title={isUK ? '2. Короткі відповіді' : '2. Краткие ответы'} />,
      <Table key="t2" t={t} f={f} rows={[
        [isUK ? 'Питання' : 'Вопрос', isUK ? 'Так' : 'Да', isUK ? 'Ні' : 'Нет'],
        ["Do you...?", "Yes, I do.", "No, I don't."],
        ["Do they...?", "Yes, they do.", "No, they don't."],
        ["Does he...?", "Yes, he does.", "No, he doesn't."],
        ["Does she...?", "Yes, she does.", "No, she doesn't."],
      ]} />,
      <Example key="e1" t={t} f={f} eng="— Do you speak English? — Yes, I do." rus={isUK ? '— Ти розмовляєш англійською? — Так.' : '— Ты говоришь по-английски? — Да.'} />,
      <Example key="e2" t={t} f={f} eng="— Does he play football? — No, he doesn't." rus={isUK ? '— Він грає у футбол? — Ні.' : '— Он играет в футбол? — Нет.'} />,
      <Example key="e3" t={t} f={f} eng="— Does she drive to work? — Yes, she does." rus={isUK ? '— Вона їздить на роботу на машині? — Так.' : '— Она ездит на работу на машине? — Да.'} />,

      <Section key="s3" t={t} f={f} title={isUK ? '3. Wh-питання — повна таблиця' : '3. Wh-вопросы — полная таблица'} />,
      <Table key="t3" t={t} f={f} rows={[
        [isUK ? 'Wh-слово' : 'Wh-слово', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
        ['What', isUK ? 'що / який' : 'что / какой', "What do you do for a living?"],
        ['Where', isUK ? 'де / куди' : 'где / куда', "Where does she work?"],
        ['When', isUK ? 'коли' : 'когда', "When does the film start?"],
        ['Why', isUK ? 'чому' : 'почему', "Why does he study so late?"],
        ['Who', isUK ? 'хто' : 'кто', "Who do you trust?"],
        ['How', isUK ? 'як' : 'как', "How do you get to the office?"],
        ['How often', isUK ? 'як часто' : 'как часто', "How often does she go to the gym?"],
        ['How long', isUK ? 'як довго' : 'как долго', "How long does it take?"],
        ['How much/many', isUK ? 'скільки' : 'сколько', "How much does it cost?"],
      ]} />,

      <Section key="s4" t={t} f={f} title={isUK ? '4. Альтернативні питання (or)' : '4. Альтернативные вопросы (or)'} />,
      <Body key="b4" t={t} f={f} text={isUK
        ? 'Пропонують вибір між двома варіантами. Відповідь — один із варіантів, не yes/no.'
        : 'Предлагают выбор между двумя вариантами. Ответ — один из вариантов, не yes/no.'} />,
      <Example key="e4" t={t} f={f} eng="Do you prefer tea or coffee?" rus={isUK ? 'Ти надаєш перевагу чаю чи каві? — Coffee, please.' : 'Ты предпочитаешь чай или кофе? — Coffee, please.'} />,
      <Example key="e5" t={t} f={f} eng="Does she work in London or Manchester?" rus={isUK ? 'Вона працює в Лондоні чи Манчестері?' : 'Она работает в Лондоне или Манчестере?'} />,

      <Section key="s5" t={t} f={f} title={isUK ? '5. Розділові питання (tag questions)' : '5. Разделительные вопросы (tag questions)'} />,
      <Body key="b5" t={t} f={f} text={isUK
        ? 'Додаються до кінця речення для підтвердження. Якщо речення стверджувальне — хвіст заперечний, і навпаки. Вживаються для уточнення або пошуку згоди.'
        : 'Добавляются в конец предложения для подтверждения. Если предложение утвердительное — хвост отрицательный, и наоборот. Используются для уточнения или поиска согласия.'} />,
      <Example key="e6" t={t} f={f} eng="You work here, don't you?" rus={isUK ? 'Ти тут працюєш, чи не так?' : 'Ты здесь работаешь, не правда ли?'} />,
      <Example key="e7" t={t} f={f} eng="She doesn't drive, does she?" rus={isUK ? 'Вона не водить, правда?' : 'Она не водит, правда?'} />,
      <Example key="e8" t={t} f={f} eng="He speaks Spanish, doesn't he?" rus={isUK ? 'Він говорить іспанською, правда?' : 'Он говорит по-испански, не правда ли?'} />,

      <Section key="s6" t={t} f={f} title={isUK ? '6. Who як підмет — без do/does' : '6. Who в роли подлежащего — без do/does'} />,
      <Body key="b6" t={t} f={f} text={isUK
        ? 'Коли Who є підметом (а не додатком) питання, do/does не потрібні. Дієслово у формі 3-ї особи однини.'
        : 'Когда Who является подлежащим (а не дополнением) вопроса, do/does не нужны. Глагол в форме 3-го лица единственного числа.'} />,
      <Example key="e9" t={t} f={f} eng="Who lives next door?" rus={isUK ? 'Хто живе поруч? (Who — підмет)' : 'Кто живёт рядом? (Who — подлежащее)'} />,
      <Example key="e10" t={t} f={f} eng="Who do you live with?" rus={isUK ? 'З ким ти живеш? (Who — додаток → потрібен do)' : 'С кем ты живёшь? (Who — дополнение → нужен do)'} />,

      <Warn key="w1" t={t} f={f} text={isUK
        ? '❌ «Does she works?» → ✅ «Does she work?» Після does — дієслово без -s!'
        : '❌ «Does she works?» → ✅ «Does she work?» После does — глагол без -s!'} />,
      <Warn key="w2" t={t} f={f} text={isUK
        ? '❌ «Do he like...?» → ✅ «Does he like...?» Для he/she/it завжди does!'
        : '❌ «Do he like...?» → ✅ «Does he like...?» Для he/she/it всегда does!'} />,
      <Tip key="tip1" t={t} f={f} text={isUK
        ? 'Практично: у питаннях «Do you...?» та «Does he...?» відповідь повторює допоміжне: «Yes, I DO», «No, he DOESN\'T». Ніколи не «Yes, I work» у відповіді.'
        : 'Практически: в вопросах «Do you...?» и «Does he...?» ответ повторяет вспомогательное: «Yes, I DO», «No, he DOESN\'T». Никогда не «Yes, I work» в ответе.'} />,
    ],
  },

  6: {
    titleRU: 'Специальные вопросы: What / Where / Who / How',
    titleUK: 'Спеціальні питання: What / Where / Who / How',
    render: (t, isUK, f) => [
      <Body key="intro" t={t} f={f} text={isUK
        ? 'Спеціальні (Wh-) питання запитують конкретну інформацію: місце, час, причину, спосіб, кількість. Вони вживаються у всіх часових формах. Структура: Wh-слово → допоміжне дієслово → підмет → основне дієслово.'
        : 'Специальные (Wh-) вопросы запрашивают конкретную информацию: место, время, причину, способ, количество. Они используются во всех временных формах. Структура: Wh-слово → вспомогательный глагол → подлежащее → основной глагол.'} />,
      <Example key="e_intro" t={t} f={f} eng="What do you do? / Where does she live? / How much does it cost?" rus={isUK ? 'Ким ти працюєш? / Де вона живе? / Скільки це коштує?' : 'Кем ты работаешь? / Где она живёт? / Сколько это стоит?'} />,

      <Section key="s1" t={t} f={f} title={isUK ? '1. Повна таблиця Wh-слів' : '1. Полная таблица Wh-слов'} />,
      <Table key="t1" t={t} f={f} rows={[
        [isUK ? 'Wh-слово' : 'Wh-слово', isUK ? 'Значення' : 'Значение', isUK ? 'Питається про' : 'Спрашивает о', isUK ? 'Приклад' : 'Пример'],
        ['What', isUK ? 'що / який' : 'что / какой', isUK ? 'предмет, дія' : 'предмет, действие', "What do you do?"],
        ['Where', isUK ? 'де / куди' : 'где / куда', isUK ? 'місце' : 'место', "Where does she work?"],
        ['When', isUK ? 'коли' : 'когда', isUK ? 'час' : 'время', "When do they meet?"],
        ['Why', isUK ? 'чому' : 'почему', isUK ? 'причина' : 'причина', "Why does he study English?"],
        ['Who', isUK ? 'хто' : 'кто', isUK ? 'особа' : 'лицо', "Who do you work with?"],
        ['Whose', isUK ? 'чий' : 'чей', isUK ? 'власник' : 'владелец', "Whose car is this?"],
        ['Which', isUK ? 'який / котрий' : 'какой / который', isUK ? 'вибір' : 'выбор', "Which one do you prefer?"],
        ['How', isUK ? 'як' : 'как', isUK ? 'спосіб' : 'способ', "How do you get to work?"],
        ['How often', isUK ? 'як часто' : 'как часто', isUK ? 'частота' : 'частота', "How often do you travel?"],
        ['How long', isUK ? 'як довго' : 'как долго', isUK ? 'тривалість' : 'длительность', "How long does it take?"],
        ['How far', isUK ? 'як далеко' : 'как далеко', isUK ? 'відстань' : 'расстояние', "How far is the station?"],
        ['How much', isUK ? 'скільки (незлічуване)' : 'сколько (неисчисляемое)', isUK ? 'кількість/ціна' : 'количество/цена', "How much does it cost?"],
        ['How many', isUK ? 'скільки (злічуване)' : 'сколько (исчисляемое)', isUK ? 'кількість' : 'количество', "How many people are here?"],
      ]} />,

      <Section key="s2" t={t} f={f} title={isUK ? '2. Структура Wh-питання' : '2. Структура Wh-вопроса'} />,
      <Body key="b2" t={t} f={f} text={isUK
        ? 'Present Simple: Wh-слово → do/does → підмет → основне дієслово (без -s)\nPast Simple: Wh-слово → did → підмет → основне дієслово\nTo Be: Wh-слово → am/is/are → підмет'
        : 'Present Simple: Wh-слово → do/does → подлежащее → основной глагол (без -s)\nPast Simple: Wh-слово → did → подлежащее → основной глагол\nTo Be: Wh-слово → am/is/are → подлежащее'} />,

      <Section key="s3" t={t} f={f} title={isUK ? '3. Особлива конструкція: What do you do?' : '3. Особая конструкция: What do you do?'} />,
      <Body key="b3" t={t} f={f} text={isUK
        ? '"What do you do?" = "Ким ти працюєш / Чим займаєшся?" — стандартне питання про професію або рід занять.'
        : '"What do you do?" = "Кем ты работаешь / Чем занимаешься?" — стандартный вопрос о профессии или занятии.'} />,
      <Example key="e1" t={t} f={f} eng="— What do you do? — I'm a teacher." rus={isUK ? '— Ким ти працюєш? — Я вчитель.' : '— Кем ты работаешь? — Я учитель.'} />,
      <Example key="e2" t={t} f={f} eng="— What does she do? — She works as a doctor." rus={isUK ? '— Ким вона працює? — Вона лікар.' : '— Кем она работает? — Она врач.'} />,
      <Example key="e3" t={t} f={f} eng="— What does your company do? — We develop software." rus={isUK ? '— Чим займається твоя компанія? — Ми розробляємо програмне забезпечення.' : '— Чем занимается твоя компания? — Мы разрабатываем программное обеспечение.'} />,

      <Section key="s4" t={t} f={f} title={isUK ? '4. Who як підмет (без do/does)' : '4. Who в роли подлежащего (без do/does)'} />,
      <Body key="b4" t={t} f={f} text={isUK
        ? 'Коли Who — підмет питання, do/does не потрібні. Дієслово вживається у формі 3-ї особи однини (+s для Present Simple).'
        : 'Когда Who — подлежащее вопроса, do/does не нужны. Глагол употребляется в форме 3-го лица единственного числа (+s для Present Simple).'} />,
      <Example key="e4" t={t} f={f} eng="Who lives next door?" rus={isUK ? 'Хто живе поруч? (Who = підмет, без do)' : 'Кто живёт рядом? (Who = подлежащее, без do)'} />,
      <Example key="e5" t={t} f={f} eng="Who knows the answer?" rus={isUK ? 'Хто знає відповідь?' : 'Кто знает ответ?'} />,
      <Example key="e6" t={t} f={f} eng="Who do you work with? (with = Who є додатком)" rus={isUK ? 'З ким ти працюєш? (Who = додаток, потрібен do)' : 'С кем ты работаешь? (Who = дополнение, нужен do)'} />,

      <Section key="s5" t={t} f={f} title={isUK ? '5. What + noun' : '5. What + существительное'} />,
      <Body key="b5" t={t} f={f} text={isUK
        ? 'What можна поєднувати з іменником: What time, What kind, What type, What colour, What size...'
        : 'What можно сочетать с существительным: What time, What kind, What type, What colour, What size...'} />,
      <Example key="e7" t={t} f={f} eng="What time does the meeting start?" rus={isUK ? 'О котрій починається зустріч?' : 'В котором часу начинается встреча?'} />,
      <Example key="e8" t={t} f={f} eng="What kind of music do you like?" rus={isUK ? 'Яку музику ти любиш?' : 'Какую музыку ты любишь?'} />,

      <Warn key="w1" t={t} f={f} text={isUK
        ? '❌ «Where she works?» → ✅ «Where does she work?» Потрібен does між Wh-словом і підметом!'
        : '❌ «Where she works?» → ✅ «Where does she work?» Нужен does между Wh-словом и подлежащим!'} />,
      <Warn key="w2" t={t} f={f} text={isUK
        ? '❌ «What does he does?» → ✅ «What does he do?» Після does — основна форма без -s!'
        : '❌ «What does he does?» → ✅ «What does he do?» После does — основная форма без -s!'} />,
      <Tip key="tip1" t={t} f={f} text={isUK
        ? 'Найуживаніші Wh-питання у повсякденному спілкуванні: What do you do? Where are you from? How are you? What time is it? How much is this?'
        : 'Самые употребимые Wh-вопросы в повседневном общении: What do you do? Where are you from? How are you? What time is it? How much is this?'} />,
    ],
  },

  7: {
    titleRU: 'Глагол To Have — владение и принадлежность',
    titleUK: 'Дієслово To Have — володіння і приналежність',
    render: (t, isUK, f) => [
      <Body key="intro" t={t} f={f} text={isUK
        ? 'To Have — одне з найуживаніших дієслів англійської. Воно використовується для вираження володіння (у мене є...), фізичних станів (болить голова), родинних зв\'язків і в багатьох стійких виразах. В американській англійській: «I have a car», в британській частіше: «I\'ve got a car».'
        : 'To Have — одно из самых употребимых глаголов английского. Оно используется для выражения владения (у меня есть...), физических состояний (болит голова), родственных связей и во многих устойчивых выражениях. В американском: «I have a car», в британском чаще: «I\'ve got a car».'} />,
      <Example key="e_intro" t={t} f={f} eng="I have a car. / She has a headache. / Do you have a passport?" rus={isUK ? 'У мене є машина. / У неї болить голова. / У тебе є паспорт?' : 'У меня есть машина. / У неё болит голова. / У тебя есть паспорт?'} />,

      <Section key="s1" t={t} f={f} title={isUK ? '1. Форми have / has' : '1. Формы have / has'} />,
      <Table key="t1" t={t} f={f} rows={[
        [isUK ? 'Підмет' : 'Подлежащее', isUK ? 'Форма' : 'Форма', isUK ? 'Скорочення' : 'Сокращение', isUK ? 'Приклад' : 'Пример'],
        ['I', 'have', "I've", 'I have a car.'],
        ['You', 'have', "You've", 'You have a dog.'],
        ['We', 'have', "We've", 'We have a problem.'],
        ['They', 'have', "They've", 'They have children.'],
        ['He', 'has', "He's", 'He has a flat.'],
        ['She', 'has', "She's", 'She has a headache.'],
        ['It', 'has', "It's", 'It has four legs.'],
      ]} />,

      <Section key="s2" t={t} f={f} title={isUK ? '2. Заперечення і питання з have' : '2. Отрицание и вопросы с have'} />,
      <Table key="t2" t={t} f={f} rows={[
        [isUK ? 'Тип' : 'Тип', isUK ? 'Структура (I/You/We/They)' : 'Структура (I/You/We/They)', isUK ? 'Структура (He/She/It)' : 'Структура (He/She/It)'],
        [isUK ? 'Ствердження' : 'Утверждение', 'I have a passport.', 'She has a passport.'],
        [isUK ? 'Заперечення' : 'Отрицание', "I don't have a car.", "She doesn't have a car."],
        [isUK ? 'Питання' : 'Вопрос', "Do you have a ticket?", "Does she have a ticket?"],
        [isUK ? 'Коротка відповідь' : 'Краткий ответ', "Yes, I do. / No, I don't.", "Yes, she does. / No, she doesn't."],
      ]} />,

      <Section key="s3" t={t} f={f} title={isUK ? '3. Have got — розмовна форма (британська)' : '3. Have got — разговорная форма (британская)'} />,
      <Body key="b3" t={t} f={f} text={isUK
        ? '«Have got» — розмовна альтернатива «have» у британській англійській. Значення однакове, але форма відрізняється.'
        : '«Have got» — разговорная альтернатива «have» в британском английском. Значение одинаковое, но форма отличается.'} />,
      <Table key="t3" t={t} f={f} rows={[
        [isUK ? 'Have (американське/нейтральне)' : 'Have (американское/нейтральное)', isUK ? 'Have got (британське/розмовне)' : 'Have got (британское/разговорное)'],
        ['I have a car.', "I've got a car."],
        ['She has a dog.', "She's got a dog."],
        ["I don't have a key.", "I haven't got a key."],
        ["She doesn't have a flat.", "She hasn't got a flat."],
        ['Do you have a phone?', "Have you got a phone?"],
        ['Does he have a passport?', "Has he got a passport?"],
      ]} />,
      <Tip key="tip1" t={t} f={f} text={isUK
        ? 'В американській англійській частіше «I have». В британській — «I\'ve got». Обидва варіанти правильні! У тестах IELTS/Cambridge зазвичай приймаються обидва.'
        : 'В американском английском чаще «I have». В британском — «I\'ve got». Оба варианта правильны! В тестах IELTS/Cambridge обычно принимаются оба.'} />,

      <Section key="s4" t={t} f={f} title={isUK ? '4. Що виражає have' : '4. Что выражает have'} />,
      <Table key="t4" t={t} f={f} rows={[
        [isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример', isUK ? 'Переклад' : 'Перевод'],
        [isUK ? 'Володіння (речі)' : 'Владение (вещи)', 'I have a new phone.', isUK ? 'У мене новий телефон.' : 'У меня новый телефон.'],
        [isUK ? 'Стан / хвороба' : 'Состояние / болезнь', 'She has a headache.', isUK ? 'У неї болить голова.' : 'У неё болит голова.'],
        [isUK ? 'Родинні стосунки' : 'Родственные отношения', 'He has two sisters.', isUK ? 'У нього дві сестри.' : 'У него две сестры.'],
        [isUK ? 'Документи / речі' : 'Документы / вещи', 'Do you have a passport?', isUK ? 'У тебе є паспорт?' : 'У тебя есть паспорт?'],
        [isUK ? 'Характеристика' : 'Характеристика', 'The house has a garden.', isUK ? 'Будинок має сад.' : 'Дом имеет сад.'],
      ]} />,

      <Section key="s5" t={t} f={f} title={isUK ? '5. Стійкі вирази з have' : '5. Устойчивые выражения с have'} />,
      <Table key="t5" t={t} f={f} rows={[
        [isUK ? 'Вираз' : 'Выражение', isUK ? 'Переклад' : 'Перевод', isUK ? 'Приклад' : 'Пример'],
        ['have breakfast/lunch/dinner', isUK ? 'снідати/обідати/вечеряти' : 'завтракать/обедать/ужинать', 'I have breakfast at 8.'],
        ['have a meeting', isUK ? 'мати зустріч' : 'провести встречу', 'We have a meeting at 10.'],
        ['have a shower/bath', isUK ? 'приймати душ/ванну' : 'принимать душ/ванну', 'She has a shower every morning.'],
        ['have a good time', isUK ? 'добре провести час' : 'хорошо провести время', 'Did you have a good time?'],
        ['have a look', isUK ? 'подивитися' : 'посмотреть', 'Can you have a look at this?'],
      ]} />,

      <Warn key="w1" t={t} f={f} text={isUK
        ? '❌ «She have a car» → ✅ «She has a car». З he/she/it — тільки has!'
        : '❌ «She have a car» → ✅ «She has a car». С he/she/it — только has!'} />,
      <Warn key="w2" t={t} f={f} text={isUK
        ? '❌ «Have you a car?» (стара форма) → ✅ «Do you have a car?» або «Have you got a car?». Сучасна американська норма — через do/does!'
        : '❌ «Have you a car?» (старая форма) → ✅ «Do you have a car?» или «Have you got a car?». Современная американская норма — через do/does!'} />,
      <Tip key="tip2" t={t} f={f} text={isUK
        ? 'Have у Present Perfect (I have done) — це допоміжне дієслово, це ІНШЕ вживання! Have для «мати» — смислове дієслово: «I have a car». Не плутай!'
        : 'Have в Present Perfect (I have done) — это вспомогательный глагол, это ДРУГОЕ употребление! Have для «иметь» — смысловой глагол: «I have a car». Не путай!'} />,
    ],
  },

  8: {
    titleRU: 'Предлоги времени: at / in / on',
    titleUK: 'Прийменники часу: at / in / on',
    render: (t, isUK, f) => [
      <Body key="intro" t={t} f={f} text={isUK
        ? 'Три прийменники часу — at, in, on — одна з найпоширеніших помилок. Кожен має свою логіку: AT — точна точка в часі, IN — великий відрізок (місяць, рік, сезон), ON — конкретний день (дата, день тижня). Вивчи логіку — і помилок стане менше.'
        : 'Три предлога времени — at, in, on — одна из самых частых ошибок. У каждого своя логика: AT — точная точка во времени, IN — большой отрезок (месяц, год, сезон), ON — конкретный день (дата, день недели). Пойми логику — и ошибок станет меньше.'} />,
      <Example key="e_intro" t={t} f={f} eng="The meeting is at 9. / I was born in June. / She calls on Mondays." rus={isUK ? 'Зустріч о 9. / Я народився в червні. / Вона телефонує по понеділках.' : 'Встреча в 9. / Я родился в июне. / Она звонит по понедельникам.'} />,

      <Section key="s1" t={t} f={f} title={isUK ? '1. Головна таблиця at / in / on' : '1. Главная таблица at / in / on'} />,
      <Table key="t1" t={t} f={f} rows={[
        [isUK ? 'Прийменник' : 'Предлог', isUK ? 'Логіка' : 'Логика', isUK ? 'Вживається з' : 'Используется с', isUK ? 'Приклади' : 'Примеры'],
        ['AT', isUK ? 'точна точка' : 'точная точка', isUK ? 'конкретний час, свята, певні вирази' : 'конкретное время, праздники, некоторые выражения', 'at 9 am, at noon, at midnight, at Christmas, at the weekend'],
        ['IN', isUK ? 'великий відрізок' : 'большой отрезок', isUK ? 'місяць, рік, сезон, частина дня' : 'месяц, год, сезон, часть дня', 'in May, in 2020, in summer, in the morning, in the 21st century'],
        ['ON', isUK ? 'конкретний день' : 'конкретный день', isUK ? 'день тижня, дата, особливий день' : 'день недели, дата, особый день', 'on Monday, on 5th March, on my birthday, on Christmas Day'],
      ]} />,

      <Section key="s2" t={t} f={f} title={isUK ? '2. AT — точний час та вирази' : '2. AT — точное время и выражения'} />,
      <Table key="t2" t={t} f={f} rows={[
        [isUK ? 'Вираз' : 'Выражение', isUK ? 'Тип' : 'Тип', isUK ? 'Приклад' : 'Пример'],
        ['at 9 am / at 6:30', isUK ? 'конкретний час' : 'конкретное время', 'The meeting is at 9 am.'],
        ['at noon / at midnight', isUK ? 'особливий момент дня' : 'особый момент дня', 'She arrives at noon.'],
        ['at Christmas / at Easter', isUK ? 'свята (загалом)' : 'праздники (в целом)', 'We celebrate at Christmas.'],
        ['at the weekend', isUK ? 'вихідні (BR)' : 'выходные (BR)', "What do you do at the weekend?"],
        ['at night', isUK ? 'вночі' : 'ночью', 'I study at night.'],
        ['at the moment', isUK ? 'зараз' : 'сейчас', 'He is busy at the moment.'],
      ]} />,
      <Example key="e1" t={t} f={f} eng="The meeting is at 9 am." rus={isUK ? 'Зустріч о 9 ранку.' : 'Встреча в 9 утра.'} />,
      <Example key="e2" t={t} f={f} eng="She arrives at noon." rus={isUK ? 'Вона приїжджає опівдні.' : 'Она приезжает в полдень.'} />,
      <Example key="e3" t={t} f={f} eng="We celebrate at Christmas." rus={isUK ? 'Ми святкуємо на Різдво.' : 'Мы празднуем на Рождество.'} />,

      <Section key="s3" t={t} f={f} title={isUK ? '3. IN — тривалі відрізки часу' : '3. IN — длительные периоды времени'} />,
      <Table key="t3" t={t} f={f} rows={[
        [isUK ? 'Вираз' : 'Выражение', isUK ? 'Тип' : 'Тип', isUK ? 'Приклад' : 'Пример'],
        ['in January, in June...', isUK ? 'місяць' : 'месяц', 'He was born in June 1990.'],
        ['in 2020, in the 1990s', isUK ? 'рік, десятиліття' : 'год, десятилетие', 'We moved in 2021.'],
        ['in summer, in winter', isUK ? 'сезон' : 'сезон', 'We rest in summer.'],
        ['in the morning/afternoon/evening', isUK ? 'частина дня' : 'часть дня', 'I study in the evening.'],
        ['in the 21st century', isUK ? 'епоха, вік' : 'эпоха, век', 'Technology changed in the 21st century.'],
      ]} />,
      <Example key="e4" t={t} f={f} eng="He was born in June 1990." rus={isUK ? 'Він народився у червні 1990 року.' : 'Он родился в июне 1990 года.'} />,
      <Example key="e5" t={t} f={f} eng="We rest in summer." rus={isUK ? 'Ми відпочиваємо влітку.' : 'Мы отдыхаем летом.'} />,
      <Example key="e6" t={t} f={f} eng="I study in the evening." rus={isUK ? 'Я вчуся ввечері.' : 'Я учусь вечером.'} />,

      <Section key="s4" t={t} f={f} title={isUK ? '4. ON — конкретний день або дата' : '4. ON — конкретный день или дата'} />,
      <Table key="t4" t={t} f={f} rows={[
        [isUK ? 'Вираз' : 'Выражение', isUK ? 'Тип' : 'Тип', isUK ? 'Приклад' : 'Пример'],
        ['on Monday, on Friday...', isUK ? 'день тижня' : 'день недели', 'The lesson is on Monday.'],
        ['on 5th March, on 25 December', isUK ? 'конкретна дата' : 'конкретная дата', 'She left on 3rd April.'],
        ['on my birthday', isUK ? 'особлива дата' : 'особая дата', "What are you doing on your birthday?"],
        ['on Christmas Day', isUK ? 'конкретний день свята' : 'конкретный день праздника', 'We open presents on Christmas Day.'],
        ['on the morning of 5th June', isUK ? 'ранок конкретного дня' : 'утро конкретного дня', 'She left on the morning of 5th June.'],
      ]} />,
      <Example key="e7" t={t} f={f} eng="The lesson is on Monday." rus={isUK ? 'Урок у понеділок.' : 'Урок в понедельник.'} />,
      <Example key="e8" t={t} f={f} eng="She left on 3rd April." rus={isUK ? 'Вона поїхала 3 квітня.' : 'Она уехала 3 апреля.'} />,

      <Section key="s5" t={t} f={f} title={isUK ? '5. Додаткові прийменники часу' : '5. Дополнительные предлоги времени'} />,
      <Table key="t5" t={t} f={f} rows={[
        [isUK ? 'Прийменник' : 'Предлог', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
        ['for', isUK ? 'протягом (тривалість)' : 'в течение (длительность)', 'I waited for 2 hours.'],
        ['since', isUK ? 'з певного моменту' : 'с определённого момента', 'She has lived here since 2019.'],
        ['during', isUK ? 'під час (одночасно)' : 'во время (одновременно)', 'He fell asleep during the meeting.'],
        ['by', isUK ? 'до (не пізніше)' : 'к (не позже)', 'Finish this by Friday.'],
        ['until / till', isUK ? 'до (кінець тривалості)' : 'до (конец длительности)', 'I worked until midnight.'],
        ['from...to', isUK ? 'від...до' : 'от...до', 'I work from 9 to 6.'],
        ['before', isUK ? 'до (раніше ніж)' : 'до (раньше чем)', 'Call me before 5 pm.'],
        ['after', isUK ? 'після' : 'после', 'I usually rest after lunch.'],
      ]} />,

      <Section key="s6" t={t} f={f} title={isUK ? '6. Без прийменника — важливі винятки' : '6. Без предлога — важные исключения'} />,
      <Body key="b6" t={t} f={f} text={isUK
        ? 'Ці вирази НЕ вимагають at/in/on: yesterday, today, tomorrow, last week/month/year, next week/month/year, this morning/evening, every day.'
        : 'Эти выражения НЕ требуют at/in/on: yesterday, today, tomorrow, last week/month/year, next week/month/year, this morning/evening, every day.'} />,
      <Example key="e9" t={t} f={f} eng="I called her yesterday. (не at yesterday)" rus={isUK ? 'Я зателефонував їй вчора.' : 'Я позвонил ей вчера.'} />,
      <Example key="e10" t={t} f={f} eng="She left last Monday. (не on last Monday)" rus={isUK ? 'Вона поїхала минулого понеділка.' : 'Она уехала в прошлый понедельник.'} />,

      <Warn key="w1" t={t} f={f} text={isUK
        ? '❌ «at Monday» → ✅ «on Monday». Дні тижня — on!\n❌ «on the morning» → ✅ «in the morning». Частини дня — in!\n❌ «in 9 am» → ✅ «at 9 am». Конкретний час — at!'
        : '❌ «at Monday» → ✅ «on Monday». Дни недели — on!\n❌ «on the morning» → ✅ «in the morning». Части дня — in!\n❌ «in 9 am» → ✅ «at 9 am». Конкретное время — at!'} />,
      <Tip key="tip1" t={t} f={f} text={isUK
        ? 'Трюк для запам\'ятовування: AT — маленька точка (стрілка годинника), IN — великий контейнер (місяць, рік), ON — плоска поверхня (сторінка календаря — день).'
        : 'Трюк для запоминания: AT — маленькая точка (стрелка часов), IN — большой контейнер (месяц, год), ON — плоская поверхность (страница календаря — день).'} />,
    ],
  },

  9: {
    titleRU: 'There is / There are — существование и наличие',
    titleUK: 'There is / There are — існування та наявність',
    render: (t, isUK, f) => [
      <Body key="intro" t={t} f={f} text={isUK
        ? 'Конструкція There is/are — це спосіб сказати «є» / «існує». В українській/російській ми говоримо «В кімнаті стіл», а в англійській потрібно: «There is a table in the room». Це одна з базових конструкцій для опису місць і ситуацій.'
        : 'Конструкция There is/are — это способ сказать «есть» / «существует». По-русски мы говорим «В комнате стол», а по-английски нужно: «There is a table in the room». Это одна из базовых конструкций для описания мест и ситуаций.'} />,
      <Example key="e_intro" t={t} f={f} eng="There is a book on the table. / There are no problems. / Is there a café near here?" rus={isUK ? 'На столі є книга. / Немає проблем. / Є тут поблизу кафе?' : 'На столе есть книга. / Нет проблем. / Есть здесь поблизости кафе?'} />,

      <Section key="s1" t={t} f={f} title={isUK ? '1. Основні форми' : '1. Основные формы'} />,
      <Table key="t1" t={t} f={f} rows={[
        [isUK ? 'Тип' : 'Тип', isUK ? 'Однина' : 'Единственное', isUK ? 'Множина' : 'Множественное'],
        [isUK ? 'Ствердження' : 'Утверждение', 'There is (There\'s)', 'There are'],
        [isUK ? 'Заперечення' : 'Отрицание', 'There isn\'t', 'There aren\'t'],
        [isUK ? 'Питання' : 'Вопрос', 'Is there...?', 'Are there...?'],
        [isUK ? 'Коротка відповідь' : 'Краткий ответ', 'Yes, there is. / No, there isn\'t.', 'Yes, there are. / No, there aren\'t.'],
      ]} />,

      <Section key="s2" t={t} f={f} title={isUK ? '2. Приклади речень' : '2. Примеры предложений'} />,
      <Example key="e1" t={t} f={f} eng="There is a cat on the sofa." rus={isUK ? 'На дивані є кіт.' : 'На диване есть кот.'} />,
      <Example key="e2" t={t} f={f} eng="There are three apples in the bowl." rus={isUK ? 'У мисці три яблука.' : 'В миске три яблока.'} />,
      <Example key="e3" t={t} f={f} eng="There isn't any milk in the fridge." rus={isUK ? 'У холодильнику немає молока.' : 'В холодильнике нет молока.'} />,
      <Example key="e4" t={t} f={f} eng="Are there any seats available?" rus={isUK ? 'Є вільні місця?' : 'Есть свободные места?'} />,
      <Example key="e5" t={t} f={f} eng="There's a problem with the system." rus={isUK ? 'З системою є проблема.' : 'С системой есть проблема.'} />,

      <Section key="s3" t={t} f={f} title={isUK ? '3. Some / Any у реченнях з There is/are' : '3. Some / Any в предложениях с There is/are'} />,
      <Body key="b3" t={t} f={f} text={isUK
        ? 'Some — у стверджувальних реченнях («є якась кількість»). Any — у запереченнях і питаннях («взагалі»).'
        : 'Some — в утвердительных предложениях («есть некоторое количество»). Any — в отрицаниях и вопросах («вообще»).'} />,
      <Example key="e6" t={t} f={f} eng="There are some books on the shelf." rus={isUK ? 'На полиці є кілька книжок.' : 'На полке есть несколько книг.'} />,
      <Example key="e7" t={t} f={f} eng="There aren't any eggs left." rus={isUK ? 'Яєць більше немає.' : 'Яиц больше нет.'} />,
      <Example key="e8" t={t} f={f} eng="Are there any questions?" rus={isUK ? 'Є запитання?' : 'Есть вопросы?'} />,

      <Warn key="w1" t={t} f={f} text={isUK
        ? '❌ «There are a problem» → ✅ «There is a problem». Узгоджуй з числом іменника! Один об\'єкт → is, декілька → are.'
        : '❌ «There are a problem» → ✅ «There is a problem». Согласуй с числом существительного! Один объект → is, несколько → are.'} />,
      <Tip key="tip1" t={t} f={f} text={isUK
        ? 'There is/are відповідає на питання «Що є у цьому місці?». Якщо тема вже відома — вживай звичайний підмет: «The cat is on the sofa» (ми знаємо, про якого кота мова).'
        : 'There is/are отвечает на вопрос «Что есть в этом месте?». Если тема уже известна — используй обычное подлежащее: «The cat is on the sofa» (мы знаем, о каком коте речь).'} />,
    ],
  },

  10: {
    titleRU: 'Модальные глаголы: can / must / should',
    titleUK: 'Модальні дієслова: can / must / should',
    render: (t, isUK, f) => [
      <Body key="intro" t={t} f={f} text={isUK
        ? 'Модальні дієслова — це особливий клас дієслів, які виражають можливість (can), обов\'язок (must), пораду (should) тощо. Вони ніколи не змінюються за особами, після них — завжди інфінітив без to.'
        : 'Модальные глаголы — особый класс глаголов, выражающих возможность (can), обязанность (must), совет (should) и т.д. Они никогда не изменяются по лицам, после них — всегда инфинитив без to.'} />,
      <Example key="e_intro" t={t} f={f} eng="I can speak English. / You must be careful. / You should sleep more." rus={isUK ? 'Я вмію розмовляти англійською. / Ти повинен бути обережним. / Тобі варто більше спати.' : 'Я умею говорить по-английски. / Ты должен быть осторожен. / Тебе стоит больше спать.'} />,

      <Section key="s1" t={t} f={f} title={isUK ? '1. Основна таблиця модальних дієслів' : '1. Основная таблица модальных глаголов'} />,
      <Table key="t1" t={t} f={f} rows={[
        [isUK ? 'Дієслово' : 'Глагол', isUK ? 'Значення' : 'Значение', isUK ? 'Заперечення' : 'Отрицание', isUK ? 'Питання' : 'Вопрос'],
        ['can', isUK ? 'можу / вмію' : 'могу / умею', 'can\'t / cannot', 'Can I...?'],
        ['could', isUK ? 'міг / міг би' : 'мог / мог бы', 'couldn\'t', 'Could you...?'],
        ['must', isUK ? 'мушу / необхідно' : 'должен / необходимо', 'mustn\'t', 'Must I...?'],
        ['should', isUK ? 'варто / слід' : 'следует / стоит', 'shouldn\'t', 'Should I...?'],
        ['may', isUK ? 'можливо / дозволяється' : 'возможно / разрешается', 'may not', 'May I...?'],
      ]} />,

      <Section key="s2" t={t} f={f} title={isUK ? '2. CAN — вміння та дозвіл' : '2. CAN — умение и разрешение'} />,
      <Example key="e1" t={t} f={f} eng="I can speak three languages." rus={isUK ? 'Я вмію розмовляти трьома мовами.' : 'Я умею говорить на трёх языках.'} />,
      <Example key="e2" t={t} f={f} eng="Can you help me?" rus={isUK ? 'Ти можеш мені допомогти?' : 'Ты можешь мне помочь?'} />,
      <Example key="e3" t={t} f={f} eng="She can't drive yet." rus={isUK ? 'Вона ще не вміє водити.' : 'Она пока не умеет водить.'} />,

      <Section key="s3" t={t} f={f} title={isUK ? '3. MUST — обов\'язок та заборона' : '3. MUST — обязанность и запрет'} />,
      <Example key="e4" t={t} f={f} eng="You must wear a seatbelt." rus={isUK ? 'Ви повинні пристебнути ремінь.' : 'Вы должны пристегнуть ремень.'} />,
      <Example key="e5" t={t} f={f} eng="You mustn't smoke here." rus={isUK ? 'Тут не можна курити.' : 'Здесь нельзя курить.'} />,
      <Warn key="w1" t={t} f={f} text={isUK
        ? 'Must not (mustn\'t) = ЗАБОРОНА (не можна). Don\'t have to = немає обов\'язку (не потрібно, але можна). Це різні речі!'
        : 'Must not (mustn\'t) = ЗАПРЕТ (нельзя). Don\'t have to = нет обязанности (не нужно, но можно). Это разные вещи!'} />,

      <Section key="s4" t={t} f={f} title={isUK ? '4. SHOULD — порада та рекомендація' : '4. SHOULD — совет и рекомендация'} />,
      <Example key="e6" t={t} f={f} eng="You should see a doctor." rus={isUK ? 'Тобі варто звернутися до лікаря.' : 'Тебе стоит обратиться к врачу.'} />,
      <Example key="e7" t={t} f={f} eng="She shouldn't eat so much sugar." rus={isUK ? 'Їй не варто їсти стільки цукру.' : 'Ей не стоит есть столько сахара.'} />,
      <Tip key="tip1" t={t} f={f} text={isUK
        ? 'Після модального дієслова — завжди базова форма (інфінітив без to): «She can swim», «He must go», «You should rest». Ніколи «She cans» або «He musts»!'
        : 'После модального глагола — всегда базовая форма (инфинитив без to): «She can swim», «He must go», «You should rest». Никогда «She cans» или «He musts»!'} />,
    ],
  },

  11: {
    titleRU: 'Past Simple: Правильные глаголы',
    titleUK: 'Past Simple: Правильні дієслова',
    render: (t, isUK, f) => [
      <Body key="intro" t={t} f={f} text={isUK
        ? 'Past Simple — минулий час, що описує завершені дії. Правильні дієслова утворюють минулий час за допомогою закінчення -ed. Це найпростіший спосіб говорити про минуле в англійській.'
        : 'Past Simple — прошедшее время, описывающее завершённые действия. Правильные глаголы образуют прошедшее время с помощью окончания -ed. Это самый простой способ говорить о прошлом в английском.'} />,
      <Example key="e_intro" t={t} f={f} eng="I worked yesterday. / She didn't call. / Did you study last night?" rus={isUK ? 'Я працював учора. / Вона не подзвонила. / Ти вчився вчора ввечері?' : 'Я работал вчера. / Она не позвонила. / Ты учился вчера вечером?'} />,

      <Section key="s1" t={t} f={f} title={isUK ? '1. Утворення -ed форм' : '1. Образование -ed форм'} />,
      <Table key="t1" t={t} f={f} rows={[
        [isUK ? 'Правило' : 'Правило', isUK ? 'Приклад' : 'Пример', isUK ? 'Past Simple' : 'Past Simple'],
        [isUK ? 'Звичайне + ed' : 'Обычное + ed', 'work, play, help', 'worked, played, helped'],
        [isUK ? 'На -e → + d' : 'На -e → + d', 'like, live, love', 'liked, lived, loved'],
        [isUK ? 'Приголосна + y → ied' : 'Согласная + y → ied', 'study, try, carry', 'studied, tried, carried'],
        [isUK ? 'Один склад, CVC → подвоєння' : 'Один слог, CVC → удвоение', 'stop, plan, drop', 'stopped, planned, dropped'],
      ]} />,

      <Section key="s2" t={t} f={f} title={isUK ? '2. Структура речень' : '2. Структура предложений'} />,
      <Table key="t2" t={t} f={f} rows={[
        [isUK ? 'Тип' : 'Тип', isUK ? 'Структура' : 'Структура', isUK ? 'Приклад' : 'Пример'],
        [isUK ? 'Ствердження' : 'Утверждение', 'Підмет + V-ed', 'She worked yesterday.'],
        [isUK ? 'Заперечення' : 'Отрицание', 'Підмет + didn\'t + V', 'She didn\'t work.'],
        [isUK ? 'Питання' : 'Вопрос', 'Did + підмет + V?', 'Did she work?'],
        [isUK ? 'Коротка відповідь' : 'Краткий ответ', 'Yes, she did. / No, she didn\'t.', ''],
      ]} />,

      <Example key="e1" t={t} f={f} eng="I watched a movie last night." rus={isUK ? 'Учора ввечері я дивився фільм.' : 'Вчера вечером я смотрел фильм.'} />,
      <Example key="e2" t={t} f={f} eng="She didn't call me." rus={isUK ? 'Вона мені не зателефонувала.' : 'Она мне не позвонила.'} />,
      <Example key="e3" t={t} f={f} eng="Did you study English yesterday?" rus={isUK ? 'Ти вчора вчив англійську?' : 'Ты вчера учил английский?'} />,
      <Example key="e4" t={t} f={f} eng="We played football on Saturday." rus={isUK ? 'У суботу ми грали у футбол.' : 'В субботу мы играли в футбол.'} />,

      <Warn key="w1" t={t} f={f} text={isUK
        ? '❌ «She didn\'t worked» → ✅ «She didn\'t work». Після didn\'t — завжди базова форма! Тільки одне допоміжне дієслово несе ознаку минулого часу.'
        : '❌ «She didn\'t worked» → ✅ «She didn\'t work». После didn\'t — всегда базовая форма! Только одно вспомогательное несёт признак прошедшего времени.'} />,
      <Tip key="tip1" t={t} f={f} text={isUK
        ? 'Сигнали Past Simple: yesterday, last week/month/year, ago, in 2020, when I was a child, in the morning (вчора).'
        : 'Сигналы Past Simple: yesterday, last week/month/year, ago, in 2020, when I was a child, in the morning (вчера).'} />,
    ],
  },

  12: {
    titleRU: 'Past Simple: Неправильные глаголы',
    titleUK: 'Past Simple: Неправильні дієслова',
    render: (t, isUK, f) => [
      <Body key="intro" t={t} f={f} text={isUK
        ? 'Неправильні дієслова не утворюють минулий час через -ed. Вони мають власні форми, які потрібно вивчити напам\'ять. Хороша новина: найуживаніших неправильних дієслів не так багато — близько 50-60.'
        : 'Неправильные глаголы не образуют прошедшее время через -ed. У них собственные формы, которые нужно выучить наизусть. Хорошая новость: самых употребимых неправильных глаголов не так много — около 50-60.'} />,
      <Example key="e_intro" t={t} f={f} eng="I went to Paris last year. / She saw him at the café. / We didn't find the keys." rus={isUK ? 'Минулого року я їздив до Парижа. / Вона побачила його в кафе. / Ми не знайшли ключі.' : 'В прошлом году я ездил в Париж. / Она увидела его в кафе. / Мы не нашли ключи.'} />,

      <Section key="s1" t={t} f={f} title={isUK ? '1. Найважливіші неправильні дієслова' : '1. Важнейшие неправильные глаголы'} />,
      <Table key="t1" t={t} f={f} rows={[
        [isUK ? 'Базова' : 'Базовая', isUK ? 'Past Simple' : 'Past Simple', isUK ? 'Значення' : 'Значение'],
        ['go', 'went', isUK ? 'іти/йти' : 'идти/ехать'],
        ['come', 'came', isUK ? 'приходити' : 'приходить'],
        ['see', 'saw', isUK ? 'бачити' : 'видеть'],
        ['do', 'did', isUK ? 'робити' : 'делать'],
        ['say', 'said', isUK ? 'казати' : 'говорить'],
        ['get', 'got', isUK ? 'отримувати/ставати' : 'получать/становиться'],
        ['make', 'made', isUK ? 'робити/виготовляти' : 'делать/изготавливать'],
        ['know', 'knew', isUK ? 'знати' : 'знать'],
        ['take', 'took', isUK ? 'брати' : 'брать'],
        ['think', 'thought', isUK ? 'думати' : 'думать'],
        ['give', 'gave', isUK ? 'давати' : 'давать'],
        ['find', 'found', isUK ? 'знаходити' : 'находить'],
        ['tell', 'told', isUK ? 'розповідати' : 'рассказывать'],
        ['buy', 'bought', isUK ? 'купувати' : 'покупать'],
        ['write', 'wrote', isUK ? 'писати' : 'писать'],
        ['have', 'had', isUK ? 'мати' : 'иметь'],
        ['leave', 'left', isUK ? 'залишати/від\'їжджати' : 'уходить/уезжать'],
      ]} />,

      <Section key="s2" t={t} f={f} title={isUK ? '2. Приклади у реченнях' : '2. Примеры в предложениях'} />,
      <Example key="e1" t={t} f={f} eng="I went to Paris last summer." rus={isUK ? 'Минулого літа я їздив до Парижа.' : 'Прошлым летом я ездил в Париж.'} />,
      <Example key="e2" t={t} f={f} eng="She saw him at the café." rus={isUK ? 'Вона побачила його в кафе.' : 'Она увидела его в кафе.'} />,
      <Example key="e3" t={t} f={f} eng="We didn't find the keys." rus={isUK ? 'Ми не знайшли ключі.' : 'Мы не нашли ключи.'} />,
      <Example key="e4" t={t} f={f} eng="Did they buy a new car?" rus={isUK ? 'Вони купили нову машину?' : 'Они купили новую машину?'} />,

      <Tip key="tip1" t={t} f={f} text={isUK
        ? 'У запереченнях і питаннях — did/didn\'t + BASE FORM (не V2!): «She didn\'t go» (не «didn\'t went»). Форма V2 використовується тільки в стверджувальних реченнях.'
        : 'В отрицаниях и вопросах — did/didn\'t + BASE FORM (не V2!): «She didn\'t go» (не «didn\'t went»). Форма V2 используется только в утвердительных предложениях.'} />,
    ],
  },

  13: {
    titleRU: 'Future Simple — будущее время (will)',
    titleUK: 'Future Simple — майбутній час (will)',
    render: (t, isUK, f) => [
      <Body key="intro" t={t} f={f} text={isUK
        ? 'Will — основний спосіб говорити про майбутнє. Він виражає рішення прямо зараз, обіцянки, передбачення. Для запланованих дій вживається «going to». Обидві форми важливі, але will — простіша.'
        : 'Will — основной способ говорить о будущем. Он выражает решения прямо сейчас, обещания, предсказания. Для запланированных действий используется «going to». Обе формы важны, но will — проще.'} />,
      <Example key="e_intro" t={t} f={f} eng="I'll call you tomorrow. / She won't be late. / Will you help me?" rus={isUK ? 'Я зателефоную тобі завтра. / Вона не запізниться. / Ти мені допоможеш?' : 'Я позвоню тебе завтра. / Она не опоздает. / Ты мне поможешь?'} />,

      <Section key="s1" t={t} f={f} title={isUK ? '1. Структура з will' : '1. Структура с will'} />,
      <Table key="t1" t={t} f={f} rows={[
        [isUK ? 'Тип' : 'Тип', isUK ? 'Структура' : 'Структура', isUK ? 'Приклад' : 'Пример'],
        [isUK ? 'Ствердження' : 'Утверждение', 'Підмет + will + V', "I'll call you tomorrow."],
        [isUK ? 'Заперечення' : 'Отрицание', 'Підмет + won\'t + V', "She won't be late."],
        [isUK ? 'Питання' : 'Вопрос', 'Will + підмет + V?', 'Will you come?'],
        [isUK ? 'Коротка відповідь' : 'Краткий ответ', 'Yes, I will. / No, I won\'t.', ''],
      ]} />,

      <Section key="s2" t={t} f={f} title={isUK ? '2. Коли вживати will' : '2. Когда использовать will'} />,
      <Example key="e1" t={t} f={f} eng="I'll help you." rus={isUK ? 'Я тобі допоможу. (рішення зараз)' : 'Я тебе помогу. (решение сейчас)'} />,
      <Example key="e2" t={t} f={f} eng="I promise I won't be late." rus={isUK ? 'Обіцяю, не запізнюся. (обіцянка)' : 'Обещаю, не опоздаю. (обещание)'} />,
      <Example key="e3" t={t} f={f} eng="I think it will rain tomorrow." rus={isUK ? 'Думаю, завтра буде дощ. (передбачення)' : 'Думаю, завтра будет дождь. (предсказание)'} />,
      <Example key="e4" t={t} f={f} eng="She won't eat meat." rus={isUK ? 'Вона не їсть м\'яса. (відмова)' : 'Она не ест мясо. (отказ)'} />,

      <Section key="s3" t={t} f={f} title={isUK ? '3. Will vs Going to' : '3. Will vs Going to'} />,
      <Table key="t2" t={t} f={f} rows={[
        ['Will', 'Going to'],
        [isUK ? 'Рішення в момент мовлення' : 'Решение в момент речи', isUK ? 'Завчасно запланована дія' : 'Заранее спланированное действие'],
        [isUK ? '«О, я тобі допоможу!»' : '«О, я тебе помогу!»', isUK ? '«Я планую поїхати до Лондона»' : '«Я планирую поехать в Лондон»'],
        ['Will you help me? — Sure, I will!', "I'm going to visit my parents next week."],
      ]} />,

      <Tip key="tip1" t={t} f={f} text={isUK
        ? 'Скорочення: I will → I\'ll, She will → She\'ll, will not → won\'t. Завжди вживай скорочення в розмові — повна форма звучить надто офіційно.'
        : 'Сокращения: I will → I\'ll, She will → She\'ll, will not → won\'t. Всегда используй сокращения в разговоре — полная форма звучит слишком официально.'} />,
    ],
  },

  14: {
    titleRU: 'Степени сравнения прилагательных',
    titleUK: 'Ступені порівняння прикметників',
    render: (t, isUK, f) => [
      <Body key="intro" t={t} f={f} text={isUK
        ? 'Порівняльний ступінь (cheaper, more interesting) говорить «A більше/менше B». Найвищий (the cheapest, the most interesting) — «найбільше з усіх». Правило вибору форми залежить від кількості складів у слові.'
        : 'Сравнительная степень (cheaper, more interesting) говорит «A больше/меньше B». Превосходная (the cheapest, the most interesting) — «больше всех». Правило выбора формы зависит от количества слогов в слове.'} />,
      <Example key="e_intro" t={t} f={f} eng="This car is cheaper. / She is the smartest in class. / English is easier than Chinese." rus={isUK ? 'Ця машина дешевша. / Вона найрозумніша в класі. / Англійська легша за китайську.' : 'Эта машина дешевле. / Она самая умная в классе. / Английский легче китайского.'} />,

      <Section key="s1" t={t} f={f} title={isUK ? '1. Правила утворення форм' : '1. Правила образования форм'} />,
      <Table key="t1" t={t} f={f} rows={[
        [isUK ? 'Тип прикметника' : 'Тип прилагательного', isUK ? 'Порівняльний' : 'Сравнительная', isUK ? 'Найвищий' : 'Превосходная'],
        [isUK ? '1 склад: + er/est' : '1 слог: + er/est', 'tall → taller', 'the tallest'],
        [isUK ? '1 склад на -e: + r/st' : '1 слог на -e: + r/st', 'nice → nicer', 'the nicest'],
        [isUK ? 'CVC: подвоєння + er/est' : 'CVC: удвоение + er/est', 'big → bigger', 'the biggest'],
        [isUK ? '2+ склади: more/most' : '2+ слога: more/most', 'beautiful → more beautiful', 'the most beautiful'],
        [isUK ? '2 склади на -y: → ier/iest' : '2 слога на -y: → ier/iest', 'happy → happier', 'the happiest'],
        [isUK ? 'Нерегулярні' : 'Нерегулярные', 'good → better, bad → worse', 'the best, the worst'],
      ]} />,

      <Section key="s2" t={t} f={f} title={isUK ? '2. Приклади речень' : '2. Примеры предложений'} />,
      <Example key="e1" t={t} f={f} eng="This car is cheaper than that one." rus={isUK ? 'Ця машина дешевша за ту.' : 'Эта машина дешевле той.'} />,
      <Example key="e2" t={t} f={f} eng="She is the smartest student in class." rus={isUK ? 'Вона найрозумніша студентка в класі.' : 'Она самая умная студентка в классе.'} />,
      <Example key="e3" t={t} f={f} eng="English is easier than Chinese." rus={isUK ? 'Англійська легша за китайську.' : 'Английский легче китайского.'} />,
      <Example key="e4" t={t} f={f} eng="This is the most interesting book I've read." rus={isUK ? 'Це найцікавіша книжка, яку я читав.' : 'Это самая интересная книга, которую я читал.'} />,

      <Warn key="w1" t={t} f={f} text={isUK
        ? '❌ «more better» → ✅ «better». Ніколи не поєднуй more/most з нерегулярними формами і односкладовими прикметниками з -er!'
        : '❌ «more better» → ✅ «better». Никогда не сочетай more/most с нерегулярными формами и односложными прилагательными с -er!'} />,
      <Tip key="tip1" t={t} f={f} text={isUK
        ? 'У порівняннях: Adj + than (не «then»!): «She is taller THAN me». Перед найвищим ступенем — завжди the: «the best», «the most beautiful».'
        : 'В сравнениях: Adj + than (не «then»!): «She is taller THAN me». Перед превосходной степенью — всегда the: «the best», «the most beautiful».'} />,
    ],
  },

  15: {
    titleRU: 'Притяжательные местоимения',
    titleUK: 'Присвійні займенники',
    render: (t, isUK, f) => [
      <Body key="intro" t={t} f={f} text={isUK
        ? 'В англійській є два типи присвійних займенників: ті, що стоять перед іменником (my, your...) і ті, що вживаються самостійно без іменника (mine, yours...). В українській/російській такого розмежування немає.'
        : 'В английском есть два типа притяжательных местоимений: стоящие перед существительным (my, your...) и употребляемые самостоятельно без существительного (mine, yours...). В русском/украинском такого разделения нет.'} />,
      <Example key="e_intro" t={t} f={f} eng="This is my book. / Is this yours? / Their house is bigger than ours." rus={isUK ? 'Це моя книжка. / Це твоя? / Їхній будинок більший за наш.' : 'Это моя книга. / Это твоя? / Их дом больше нашего.'} />,

      <Section key="s1" t={t} f={f} title={isUK ? '1. Таблиця присвійних займенників' : '1. Таблица притяжательных местоимений'} />,
      <Table key="t1" t={t} f={f} rows={[
        [isUK ? 'Особа' : 'Лицо', isUK ? 'Перед іменником' : 'Перед существительным', isUK ? 'Самостійний (без іменника)' : 'Самостоятельный (без существительного)'],
        ['I', 'my (мій/мій)', 'mine (мій/мій)'],
        ['You', 'your (твій/ваш)', 'yours (твій/ваш)'],
        ['He', 'his (його)', 'his (його)'],
        ['She', 'her (її)', 'hers (її)'],
        ['It', 'its (його/її)', '— (не вживається)'],
        ['We', 'our (наш)', 'ours (наш)'],
        ['They', 'their (їхній)', 'theirs (їхній)'],
      ]} />,

      <Section key="s2" t={t} f={f} title={isUK ? '2. Приклади використання' : '2. Примеры использования'} />,
      <Example key="e1" t={t} f={f} eng="This is my book." rus={isUK ? 'Це моя книжка. (перед іменником)' : 'Это моя книга. (перед существительным)'} />,
      <Example key="e2" t={t} f={f} eng="This book is mine." rus={isUK ? 'Ця книжка моя. (самостійний)' : 'Эта книга моя. (самостоятельный)'} />,
      <Example key="e3" t={t} f={f} eng="Is this your phone? — Yes, it's mine." rus={isUK ? 'Це твій телефон? — Так, мій.' : 'Это твой телефон? — Да, мой.'} />,
      <Example key="e4" t={t} f={f} eng="Their house is bigger than ours." rus={isUK ? 'Їхній будинок більший за наш.' : 'Их дом больше нашего.'} />,

      <Warn key="w1" t={t} f={f} text={isUK
        ? '❌ «It\'s» (it is) ≠ «its» (присвійний займенник). «It\'s cold» = «Холодно». «Its color is red» = «Його колір червоний». Апостроф — тільки для скорочень!'
        : '❌ «It\'s» (it is) ≠ «its» (притяжательное местоимение). «It\'s cold» = «Холодно». «Its color is red» = «Его цвет красный». Апостроф — только для сокращений!'} />,
      <Tip key="tip1" t={t} f={f} text={isUK
        ? 'Самостійні форми (mine, yours...) = «ця річ належить мені». Вживай їх, коли іменник вже зрозумілий: «Whose bag is this? — It\'s mine.»'
        : 'Самостоятельные формы (mine, yours...) = «эта вещь принадлежит мне». Используй их, когда существительное уже понятно: «Whose bag is this? — It\'s mine.»'} />,
    ],
  },

  16: {
    titleRU: 'Фразовые глаголы — базовые',
    titleUK: 'Фразові дієслова — базові',
    render: (t, isUK, f) => [
      <Body key="intro" t={t} f={f} text={isUK
        ? 'Фразові дієслова (phrasal verbs) — це дієслова з прийменником або прислівником, що разом дають нове значення. «Look» = дивитись, але «look up» = шукати в словнику. Без знання фразових дієслів розуміти природну англійську дуже важко.'
        : 'Фразовые глаголы — это глаголы с предлогом или наречием, которые вместе дают новое значение. «Look» = смотреть, но «look up» = искать в словаре. Без знания фразовых глаголов понять естественный английский очень сложно.'} />,
      <Example key="e_intro" t={t} f={f} eng="Turn off the TV. / I'm looking for my keys. / Don't give up!" rus={isUK ? 'Вимкни телевізор. / Я шукаю ключі. / Не здавайся!' : 'Выключи телевизор. / Я ищу ключи. / Не сдавайся!'} />,

      <Section key="s1" t={t} f={f} title={isUK ? '1. Найуживаніші фразові дієслова' : '1. Самые употребимые фразовые глаголы'} />,
      <Table key="t1" t={t} f={f} rows={[
        [isUK ? 'Фразове дієслово' : 'Фразовый глагол', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
        ['get up', isUK ? 'вставати (з ліжка)' : 'вставать (с кровати)', 'I get up at 7 every day.'],
        ['turn on / off', isUK ? 'вмикати / вимикати' : 'включать / выключать', 'Turn off the TV.'],
        ['look for', isUK ? 'шукати' : 'искать', "I'm looking for my keys."],
        ['look up', isUK ? 'шукати в словнику/інтернеті' : 'искать в словаре/интернете', 'Look it up online.'],
        ['give up', isUK ? 'здаватись, кидати' : 'сдаваться, бросать', "Don't give up!"],
        ['take off', isUK ? 'знімати (одяг); злітати' : 'снимать (одежду); взлетать', 'The plane took off at 9.'],
        ['put on', isUK ? 'вдягати' : 'надевать', 'Put on your coat.'],
        ['go on', isUK ? 'тривати, продовжувати' : 'продолжаться', 'Go on, I\'m listening.'],
        ['find out', isUK ? 'дізнатись' : 'узнать', 'I found out the truth.'],
        ['come back', isUK ? 'повертатись' : 'возвращаться', 'When will you come back?'],
        ['run out of', isUK ? 'закінчуватись (запас)' : 'заканчиваться (запас)', "We've run out of milk."],
        ['pick up', isUK ? 'підбирати; забирати' : 'подбирать; забирать', 'Can you pick me up at 5?'],
      ]} />,

      <Tip key="tip1" t={t} f={f} text={isUK
        ? 'Деякі фразові дієслова розривні (separable): «turn the TV off» або «turn off the TV». Але з займенником — тільки між: «turn it off» (НЕ «turn off it»).'
        : 'Некоторые фразовые глаголы разделяемые (separable): «turn the TV off» или «turn off the TV». Но с местоимением — только между: «turn it off» (НЕ «turn off it»).'} />,
    ],
  },

  17: {
    titleRU: 'Present Continuous — действие прямо сейчас',
    titleUK: 'Present Continuous — дія прямо зараз',
    render: (t, isUK, f) => [
      <Body key="intro" t={t} f={f} text={isUK
        ? 'Present Continuous описує те, що відбувається прямо зараз, у цей момент, або тимчасово в цей період. Він утворюється за допомогою am/is/are + дієслово з -ing. Це принципово відрізняється від Present Simple (постійних фактів).'
        : 'Present Continuous описывает то, что происходит прямо сейчас, в этот момент, или временно в этот период. Он образуется с помощью am/is/are + глагол с -ing. Это принципиально отличается от Present Simple (постоянных фактов).'} />,
      <Example key="e_intro" t={t} f={f} eng="I'm working right now. / She isn't sleeping. / Are you listening?" rus={isUK ? 'Я зараз працюю. / Вона не спить. / Ти слухаєш?' : 'Я сейчас работаю. / Она не спит. / Ты слушаешь?'} />,

      <Section key="s1" t={t} f={f} title={isUK ? '1. Структура Present Continuous' : '1. Структура Present Continuous'} />,
      <Table key="t1" t={t} f={f} rows={[
        [isUK ? 'Тип' : 'Тип', isUK ? 'Структура' : 'Структура', isUK ? 'Приклад' : 'Пример'],
        [isUK ? 'Ствердження' : 'Утверждение', 'am/is/are + V-ing', "I'm working now."],
        [isUK ? 'Заперечення' : 'Отрицание', 'am/is/are + not + V-ing', "She isn't sleeping."],
        [isUK ? 'Питання' : 'Вопрос', 'Am/Is/Are + підмет + V-ing?', 'Are you listening?'],
      ]} />,

      <Section key="s2" t={t} f={f} title={isUK ? '2. Правопис -ing форм' : '2. Правописание -ing форм'} />,
      <Table key="t2" t={t} f={f} rows={[
        [isUK ? 'Правило' : 'Правило', isUK ? 'Приклад' : 'Пример'],
        [isUK ? 'Звичайне + ing' : 'Обычное + ing', 'work → working, play → playing'],
        [isUK ? 'На -e: прибрати e + ing' : 'На -e: убрать e + ing', 'come → coming, write → writing'],
        [isUK ? 'CVC: подвоїти + ing' : 'CVC: удвоить + ing', 'run → running, sit → sitting, swim → swimming'],
        [isUK ? 'На -ie: → ying' : 'На -ie: → ying', 'lie → lying, die → dying'],
      ]} />,

      <Example key="e1" t={t} f={f} eng="I'm watching TV right now." rus={isUK ? 'Зараз я дивлюся телевізор.' : 'Сейчас я смотрю телевизор.'} />,
      <Example key="e2" t={t} f={f} eng="She's studying for her exam this week." rus={isUK ? 'Цього тижня вона готується до іспиту.' : 'На этой неделе она готовится к экзамену.'} />,
      <Example key="e3" t={t} f={f} eng="They aren't working today." rus={isUK ? 'Сьогодні вони не працюють.' : 'Сегодня они не работают.'} />,

      <Section key="s3" t={t} f={f} title={isUK ? '3. Стативні дієслова (без -ing!)' : '3. Статичные глаголы (без -ing!)'} />,
      <Body key="b3" t={t} f={f} text={isUK
        ? 'Деякі дієслова НЕ вживаються з -ing, бо виражають стан, а не дію: know, like, love, hate, want, need, believe, understand, remember, own, seem.'
        : 'Некоторые глаголы НЕ употребляются с -ing, так как выражают состояние, а не действие: know, like, love, hate, want, need, believe, understand, remember, own, seem.'} />,
      <Warn key="w1" t={t} f={f} text={isUK
        ? '❌ «I am knowing» → ✅ «I know». ❌ «She is liking it» → ✅ «She likes it». Ці дієслова завжди в Present Simple!'
        : '❌ «I am knowing» → ✅ «I know». ❌ «She is liking it» → ✅ «She likes it». Эти глаголы всегда в Present Simple!'} />,
      <Tip key="tip1" t={t} f={f} text={isUK
        ? 'Сигнали Present Continuous: now, right now, at the moment, currently, today, this week/month. Порівняй: «I work every day» (PS) vs «I\'m working now» (PC).'
        : 'Сигналы Present Continuous: now, right now, at the moment, currently, today, this week/month. Сравни: «I work every day» (PS) vs «I\'m working now» (PC).'} />,
    ],
  },

  18: {
    titleRU: 'Повелительное наклонение — команды и просьбы',
    titleUK: 'Наказовий спосіб — команди і прохання',
    render: (t, isUK, f) => [
      <Body key="intro" t={t} f={f} text={isUK
        ? 'Наказовий спосіб в англійській — один з найпростіших: просто базова форма дієслова без будь-якого підмета. «Open the door.», «Don\'t run.». Підмет you мається на увазі. Тон пом\'якшується словом please.'
        : 'Повелительное наклонение в английском — одно из простейших: просто базовая форма глагола без какого-либо подлежащего. «Open the door.», «Don\'t run.». Подлежащее you подразумевается. Тон смягчается словом please.'} />,
      <Example key="e_intro" t={t} f={f} eng="Open the door. / Don't be late. / Please sit down." rus={isUK ? 'Відчини двері. / Не запізнюйся. / Будь ласка, сідай.' : 'Открой дверь. / Не опаздывай. / Пожалуйста, садись.'} />,

      <Section key="s1" t={t} f={f} title={isUK ? '1. Утворення наказового способу' : '1. Образование повелительного наклонения'} />,
      <Table key="t1" t={t} f={f} rows={[
        [isUK ? 'Тип' : 'Тип', isUK ? 'Структура' : 'Структура', isUK ? 'Приклад' : 'Пример'],
        [isUK ? 'Позитивний' : 'Положительный', 'V (базова форма)', 'Come here. Sit down. Listen.'],
        [isUK ? 'Заперечний' : 'Отрицательный', 'Don\'t + V', 'Don\'t touch that! Don\'t be late.'],
        [isUK ? 'З ввічливістю' : 'С вежливостью', 'Please + V / V + please', 'Please open the window. / Sit down, please.'],
        [isUK ? 'Let\'s (пропозиція)' : 'Let\'s (предложение)', "Let's + V", "Let's go! Let's have lunch."],
      ]} />,

      <Section key="s2" t={t} f={f} title={isUK ? '2. Поширені команди та прохання' : '2. Распространённые команды и просьбы'} />,
      <Example key="e1" t={t} f={f} eng="Open your books to page 10." rus={isUK ? 'Відкрийте книжки на сторінці 10.' : 'Откройте книги на странице 10.'} />,
      <Example key="e2" t={t} f={f} eng="Don't worry about it." rus={isUK ? 'Не хвилюйся про це.' : 'Не беспокойся об этом.'} />,
      <Example key="e3" t={t} f={f} eng="Please wait a moment." rus={isUK ? 'Зачекайте хвилинку, будь ласка.' : 'Подождите минуту, пожалуйста.'} />,
      <Example key="e4" t={t} f={f} eng="Let's go to the cinema tonight." rus={isUK ? 'Ходімо сьогодні в кіно.' : 'Давай сегодня пойдём в кино.'} />,
      <Example key="e5" t={t} f={f} eng="Be careful!" rus={isUK ? 'Будь обережний!' : 'Будь осторожен!'} />,
      <Example key="e6" t={t} f={f} eng="Don't be shy." rus={isUK ? 'Не соромся.' : 'Не стесняйся.'} />,

      <Tip key="tip1" t={t} f={f} text={isUK
        ? 'Please на початку або в кінці робить наказ ввічливим проханням. «Please sit down» або «Sit down, please» — обидва варіанти правильні. «Please» на початку — трохи формальніше.'
        : 'Please в начале или в конце делает приказ вежливой просьбой. «Please sit down» или «Sit down, please» — оба варианта правильны. «Please» в начале — чуть формальнее.'} />,
    ],
  },

  19: {
    titleRU: 'Предлоги места: in / on / at / under / next to...',
    titleUK: 'Прийменники місця: in / on / at / under / next to...',
    render: (t, isUK, f) => [
      <Body key="intro" t={t} f={f} text={isUK
        ? 'Прийменники місця описують розташування. Три головні — in (всередині), on (на поверхні), at (в конкретному місці/точці). Решта уточнюють: під, поруч, між, навпроти тощо. Вивчати краще через образи та конкретні приклади.'
        : 'Предлоги места описывают расположение. Три главных — in (внутри), on (на поверхности), at (в конкретном месте/точке). Остальные уточняют: под, рядом, между, напротив и т.д. Лучше учить через образы и конкретные примеры.'} />,
      <Example key="e_intro" t={t} f={f} eng="The keys are in my bag. / The cat is on the table. / She's at the door." rus={isUK ? 'Ключі в моїй сумці. / Кіт на столі. / Вона біля дверей.' : 'Ключи в моей сумке. / Кот на столе. / Она у двери.'} />,

      <Section key="s1" t={t} f={f} title={isUK ? '1. Головна таблиця прийменників місця' : '1. Главная таблица предлогов места'} />,
      <Table key="t1" t={t} f={f} rows={[
        [isUK ? 'Прийменник' : 'Предлог', isUK ? 'Значення' : 'Значение', isUK ? 'Приклад' : 'Пример'],
        ['in', isUK ? 'всередині (3D)' : 'внутри (3D)', 'The cat is in the box.'],
        ['on', isUK ? 'на поверхні (2D)' : 'на поверхности (2D)', 'The book is on the table.'],
        ['at', isUK ? 'в конкретній точці' : 'в конкретной точке', 'She is at the door. / at school.'],
        ['under', isUK ? 'під' : 'под', 'The dog is under the bed.'],
        ['over', isUK ? 'над' : 'над', 'The lamp is over the table.'],
        ['next to / beside', isUK ? 'поруч, збоку' : 'рядом, сбоку', 'Sit next to me.'],
        ['between', isUK ? 'між (двома)' : 'между (двумя)', 'She sat between Tom and Jane.'],
        ['among', isUK ? 'серед (кількох)' : 'среди (многих)', 'He was among the crowd.'],
        ['in front of', isUK ? 'перед' : 'перед', 'There\'s a car in front of the house.'],
        ['behind', isUK ? 'позаду' : 'позади', 'The garden is behind the house.'],
        ['opposite', isUK ? 'навпроти' : 'напротив', 'The bank is opposite the hotel.'],
        ['near', isUK ? 'поблизу' : 'вблизи', 'Is there a café near here?'],
      ]} />,

      <Example key="e1" t={t} f={f} eng="The keys are in my bag." rus={isUK ? 'Ключі в моїй сумці.' : 'Ключи в моей сумке.'} />,
      <Example key="e2" t={t} f={f} eng="There's a supermarket next to the bank." rus={isUK ? 'Поруч із банком є супермаркет.' : 'Рядом с банком есть супермаркет.'} />,
      <Example key="e3" t={t} f={f} eng="She's sitting between her parents." rus={isUK ? 'Вона сидить між батьками.' : 'Она сидит между родителями.'} />,

      <Tip key="tip1" t={t} f={f} text={isUK
        ? 'In — для просторів із межами (кімната, місто, країна, коробка). On — для поверхонь (підлога, стіл, стіна). At — для точок і місць призначення (at the station, at work, at home).'
        : 'In — для пространств с границами (комната, город, страна, коробка). On — для поверхностей (пол, стол, стена). At — для точек и мест назначения (at the station, at work, at home).'} />,
    ],
  },

  20: {
    titleRU: 'Артикли: a / an / the / нулевой',
    titleUK: 'Артиклі: a / an / the / нульовий',
    render: (t, isUK, f) => [
      <Body key="intro" t={t} f={f} text={isUK
        ? 'Артиклі — одна з найскладніших тем для українців і росіян, бо в наших мовах їх немає. Але логіка проста: a/an — «якийсь один», the — «той самий, конкретний». Решта — без артикля.'
        : 'Артикли — одна из сложнейших тем для украинцев и русских, потому что в наших языках их нет. Но логика проста: a/an — «какой-то один», the — «тот самый, конкретный». Остальное — без артикля.'} />,
      <Example key="e_intro" t={t} f={f} eng="I saw a dog. / The dog was huge. / She speaks English." rus={isUK ? 'Я побачив собаку. / Собака була величезною. / Вона розмовляє англійською.' : 'Я увидел собаку. / Собака была огромной. / Она говорит по-английски.'} />,

      <Section key="s1" t={t} f={f} title={isUK ? '1. A / AN — невизначений артикль' : '1. A / AN — неопределённый артикль'} />,
      <Body key="b1" t={t} f={f} text={isUK
        ? 'A — перед приголосним звуком, AN — перед голосним звуком (a, e, i, o, u). Вживається: перша згадка, один із багатьох, визначення/професія.'
        : 'A — перед согласным звуком, AN — перед гласным звуком (a, e, i, o, u). Употребляется: первое упоминание, один из многих, определение/профессия.'} />,
      <Example key="e1" t={t} f={f} eng="I saw a dog in the park." rus={isUK ? 'Я побачив якогось пса в парку.' : 'Я увидел какую-то собаку в парке.'} />,
      <Example key="e2" t={t} f={f} eng="She is an engineer." rus={isUK ? 'Вона інженер.' : 'Она инженер.'} />,
      <Example key="e3" t={t} f={f} eng="It's an honour to meet you." rus={isUK ? 'Це честь — познайомитись з вами. (an перед h-звук!)' : 'Это честь — познакомиться с вами. (an перед h-звук!)'} />,

      <Section key="s2" t={t} f={f} title={isUK ? '2. THE — визначений артикль' : '2. THE — определённый артикль'} />,
      <Body key="b2" t={t} f={f} text={isUK
        ? 'The вживається, коли: повторна згадка, єдиний у своєму роді (the sun), обидва знають про що мова, з назвами рік/морів/гірських хребтів.'
        : 'The употребляется, когда: повторное упоминание, единственный в своём роде (the sun), оба знают о чём речь, с названиями рек/морей/горных цепей.'} />,
      <Example key="e4" t={t} f={f} eng="The dog I saw was huge." rus={isUK ? 'Той пес, якого я бачив, був величезним.' : 'Та собака, которую я видел, была огромной.'} />,
      <Example key="e5" t={t} f={f} eng="The sun rises in the east." rus={isUK ? 'Сонце сходить на сході. (єдиний об\'єкт)' : 'Солнце восходит на востоке. (единственный объект)'} />,
      <Example key="e6" t={t} f={f} eng="Pass me the salt, please." rus={isUK ? 'Передай мені сіль, будь ласка. (обидва знають яку)' : 'Передай мне соль, пожалуйста. (оба знают какую)'} />,

      <Section key="s3" t={t} f={f} title={isUK ? '3. Без артикля (нульовий)' : '3. Без артикля (нулевой)'} />,
      <Body key="b3" t={t} f={f} text={isUK
        ? 'Без артикля: власні імена, країни (більшість), мови, назви вулиць, їжа/напої загалом, абстрактні поняття загалом, спорт.'
        : 'Без артикля: имена собственные, страны (большинство), языки, названия улиц, еда/напитки в общем, абстрактные понятия в общем, спорт.'} />,
      <Example key="e7" t={t} f={f} eng="She speaks English." rus={isUK ? 'Вона розмовляє англійською. (мова — без the)' : 'Она говорит по-английски. (язык — без the)'} />,
      <Example key="e8" t={t} f={f} eng="I love music." rus={isUK ? 'Я люблю музику. (загалом — без the)' : 'Я люблю музыку. (в целом — без the)'} />,

      <Warn key="w1" t={t} f={f} text={isUK
        ? 'THE + назви гір/рік/морів: the Alps, the Amazon, the Pacific. Але БЕЗ the: Mount Everest, Lake Baikal. Країни: the USA, the UK, the Netherlands — але France, Germany, Ukraine (без the).'
        : 'THE + названия гор/рек/морей: the Alps, the Amazon, the Pacific. Но БЕЗ the: Mount Everest, Lake Baikal. Страны: the USA, the UK, the Netherlands — но France, Germany, Ukraine (без the).'} />,
    ],
  },

  21: {
    titleRU: 'Неопределённые местоимения: some / any / no / every',
    titleUK: 'Неозначені займенники: some / any / no / every',
    render: (t, isUK, f) => [
      <Body key="intro" t={t} f={f} text={isUK
        ? 'Some, any, no, every та їхні похідні (somebody, anyone, nothing, everywhere...) — група займенників для говоріння про невизначену кількість або осіб. Вибір між some і any залежить від типу речення.'
        : 'Some, any, no, every и их производные (somebody, anyone, nothing, everywhere...) — группа местоимений для разговора о неопределённом количестве или лицах. Выбор между some и any зависит от типа предложения.'} />,
      <Example key="e_intro" t={t} f={f} eng="I have some money. / I don't have any money. / Nobody called." rus={isUK ? 'У мене є гроші. / У мене немає грошей. / Ніхто не телефонував.' : 'У меня есть деньги. / У меня нет денег. / Никто не звонил.'} />,

      <Section key="s1" t={t} f={f} title={isUK ? '1. Таблиця похідних займенників' : '1. Таблица производных местоимений'} />,
      <Table key="t1" t={t} f={f} rows={[
        ['', isUK ? 'Особа' : 'Лицо', isUK ? 'Предмет' : 'Предмет', isUK ? 'Місце' : 'Место'],
        ['some-', 'somebody/someone', 'something', 'somewhere'],
        ['any-', 'anybody/anyone', 'anything', 'anywhere'],
        ['no-', 'nobody/no one', 'nothing', 'nowhere'],
        ['every-', 'everybody/everyone', 'everything', 'everywhere'],
      ]} />,

      <Section key="s2" t={t} f={f} title={isUK ? '2. Правило some / any' : '2. Правило some / any'} />,
      <Body key="b2" t={t} f={f} text={isUK
        ? 'SOME — в стверджувальних реченнях і пропозиціях/проханнях. ANY — в запереченнях і питаннях.'
        : 'SOME — в утвердительных предложениях и предложениях/просьбах. ANY — в отрицаниях и вопросах.'} />,
      <Example key="e1" t={t} f={f} eng="I have some money." rus={isUK ? 'У мене є якісь гроші.' : 'У меня есть какие-то деньги.'} />,
      <Example key="e2" t={t} f={f} eng="I don't have any money." rus={isUK ? 'У мене немає грошей.' : 'У меня нет денег.'} />,
      <Example key="e3" t={t} f={f} eng="Would you like some tea?" rus={isUK ? 'Хочеш чаю? (пропозиція → some)' : 'Хочешь чаю? (предложение → some)'} />,
      <Example key="e4" t={t} f={f} eng="Is there anything I can do?" rus={isUK ? 'Я можу чимось допомогти?' : 'Есть что-нибудь, что я могу сделать?'} />,
      <Example key="e5" t={t} f={f} eng="Nobody called while you were out." rus={isUK ? 'Поки тебе не було, ніхто не телефонував.' : 'Пока тебя не было, никто не звонил.'} />,
      <Example key="e6" t={t} f={f} eng="Everything is ready." rus={isUK ? 'Все готово.' : 'Всё готово.'} />,

      <Warn key="w1" t={t} f={f} text={isUK
        ? '❌ «I don\'t know nothing» → ✅ «I don\'t know anything». В англійській НЕ МОЖНА двох заперечень! «nothing» вже є запереченням: «I know nothing» = «I don\'t know anything».'
        : '❌ «I don\'t know nothing» → ✅ «I don\'t know anything». В английском НЕЛЬЗЯ двух отрицаний! «nothing» уже является отрицанием: «I know nothing» = «I don\'t know anything».'} />,
    ],
  },

  22: {
    titleRU: 'Герундий — глагол как существительное',
    titleUK: 'Герундій — дієслово як іменник',
    render: (t, isUK, f) => [
      <Body key="intro" t={t} f={f} text={isUK
        ? 'Герундій — це форма дієслова на -ing, яка функціонує як іменник. «Swimming is fun» (Плавати весело). Після певних дієслів і прийменників обов\'язково вживається герундій, а не інфінітив. Це одна з ключових граматичних відмінностей від слов\'янських мов.'
        : 'Герундий — это форма глагола на -ing, функционирующая как существительное. «Swimming is fun» (Плавать весело). После определённых глаголов и предлогов обязательно используется герундий, а не инфинитив. Это одно из ключевых грамматических отличий от славянских языков.'} />,
      <Example key="e_intro" t={t} f={f} eng="Swimming is fun. / I enjoy reading. / She's good at cooking." rus={isUK ? 'Плавати весело. / Мені подобається читати. / Вона добре готує.' : 'Плавать весело. / Мне нравится читать. / Она хорошо готовит.'} />,

      <Section key="s1" t={t} f={f} title={isUK ? '1. Функції герундія' : '1. Функции герундия'} />,
      <Example key="e1" t={t} f={f} eng="Swimming is good for your health." rus={isUK ? 'Плавання корисне для здоров\'я. (підмет)' : 'Плавание полезно для здоровья. (подлежащее)'} />,
      <Example key="e2" t={t} f={f} eng="I enjoy reading books." rus={isUK ? 'Мені подобається читати книжки. (після дієслова)' : 'Мне нравится читать книги. (после глагола)'} />,
      <Example key="e3" t={t} f={f} eng="She's good at cooking." rus={isUK ? 'Вона добре готує. (після прийменника)' : 'Она хорошо готовит. (после предлога)'} />,

      <Section key="s2" t={t} f={f} title={isUK ? '2. Дієслова + Герундій (не інфінітив!)' : '2. Глаголы + Герундий (не инфинитив!)'} />,
      <Table key="t1" t={t} f={f} rows={[
        [isUK ? 'Дієслово' : 'Глагол', isUK ? 'Приклад' : 'Пример'],
        ['enjoy', "I enjoy swimming."],
        ['finish', "Have you finished eating?"],
        ['avoid', "Avoid making mistakes."],
        ['keep', "Keep trying!"],
        ['mind', "Do you mind opening the window?"],
        ['suggest', "She suggested going out."],
        ['consider', "I'm considering changing jobs."],
        ['practise', "Practise speaking every day."],
      ]} />,

      <Section key="s3" t={t} f={f} title={isUK ? '3. Дієслова + Інфінітив (з to)' : '3. Глаголы + Инфинитив (с to)'} />,
      <Table key="t2" t={t} f={f} rows={[
        [isUK ? 'Дієслово' : 'Глагол', isUK ? 'Приклад' : 'Пример'],
        ['want', "I want to go."],
        ['need', "She needs to sleep."],
        ['decide', "He decided to leave."],
        ['hope', "I hope to see you."],
        ['plan', "We plan to travel."],
        ['forget / remember', "Don't forget to call!"],
      ]} />,

      <Warn key="w1" t={t} f={f} text={isUK
        ? 'ПІСЛЯ ПРИЙМЕННИКІВ — завжди герундій: interested IN doing, good AT speaking, before leaving, after eating, without saying. Інфінітив після прийменника — помилка!'
        : 'ПОСЛЕ ПРЕДЛОГОВ — всегда герундий: interested IN doing, good AT speaking, before leaving, after eating, without saying. Инфинитив после предлога — ошибка!'} />,
    ],
  },

  23: {
    titleRU: 'Passive Voice — страдательный залог',
    titleUK: 'Passive Voice — пасивний стан',
    render: (t, isUK, f) => [
      <Body key="intro" t={t} f={f} text={isUK
        ? 'Пасивний стан вживається, коли важлива дія, а не той, хто її робить: «The window was broken» (важливо що сталось, а не хто зробив). Утворюється: to be + V3 (третя форма дієслова / Past Participle).'
        : 'Пассивный залог употребляется, когда важно действие, а не тот, кто его совершает: «The window was broken» (важно что произошло, а не кто сделал). Образуется: to be + V3 (третья форма глагола / Past Participle).'} />,
      <Example key="e_intro" t={t} f={f} eng="The window was broken. / English is spoken here. / The letter will be sent." rus={isUK ? 'Вікно було розбите. / Тут розмовляють англійською. / Листа буде надіслано.' : 'Окно было разбито. / Здесь говорят по-английски. / Письмо будет отправлено.'} />,

      <Section key="s1" t={t} f={f} title={isUK ? '1. Passive у різних часах' : '1. Passive в разных временах'} />,
      <Table key="t1" t={t} f={f} rows={[
        [isUK ? 'Час' : 'Время', isUK ? 'Структура' : 'Структура', isUK ? 'Приклад' : 'Пример'],
        ['Present Simple', 'is/are + V3', 'English is spoken here.'],
        ['Past Simple', 'was/were + V3', 'The car was stolen.'],
        ['Future Simple', 'will be + V3', 'The letter will be sent.'],
        ['Present Continuous', 'is/are being + V3', 'The road is being repaired.'],
        ['Present Perfect', 'has/have been + V3', 'The report has been written.'],
      ]} />,

      <Section key="s2" t={t} f={f} title={isUK ? '2. Active → Passive перетворення' : '2. Active → Passive преобразование'} />,
      <Example key="e1" t={t} f={f} eng="Active: They clean the office every day." rus={isUK ? 'Активний: Вони прибирають офіс щодня.' : 'Активный: Они убирают офис каждый день.'} />,
      <Example key="e2" t={t} f={f} eng="Passive: The office is cleaned every day." rus={isUK ? 'Пасивний: Офіс прибирається щодня.' : 'Пассивный: Офис убирается каждый день.'} />,
      <Example key="e3" t={t} f={f} eng="Active: Shakespeare wrote Hamlet." rus={isUK ? 'Активний: Шекспір написав Гамлета.' : 'Активный: Шекспир написал Гамлета.'} />,
      <Example key="e4" t={t} f={f} eng="Passive: Hamlet was written by Shakespeare." rus={isUK ? 'Пасивний: Гамлет був написаний Шекспіром.' : 'Пассивный: Гамлет был написан Шекспиром.'} />,

      <Tip key="tip1" t={t} f={f} text={isUK
        ? 'By + виконавець — необов\'язковий: «The window was broken (by someone)». Якщо виконавець невідомий або неважливий — by не потрібен. Пасив часто вживається в наукових текстах, новинах, оголошеннях.'
        : 'By + исполнитель — необязателен: «The window was broken (by someone)». Если исполнитель неизвестен или неважен — by не нужен. Пассив часто используется в научных текстах, новостях, объявлениях.'} />,
    ],
  },

  24: {
    titleRU: 'Present Perfect — связь прошлого с настоящим',
    titleUK: 'Present Perfect — зв\'язок минулого з теперішнім',
    render: (t, isUK, f) => [
      <Body key="intro" t={t} f={f} text={isUK
        ? 'Present Perfect — один з найскладніших часів для слов\'яномовних. Він описує минулі дії, що мають зв\'язок із теперішнім: результат видно зараз, або дія відбулась у незакінченому часовому відрізку. Утворюється: have/has + V3.'
        : 'Present Perfect — один из сложнейших времён для славяноязычных. Он описывает прошлые действия, имеющие связь с настоящим: результат виден сейчас, или действие произошло в незаконченном временном отрезке. Образуется: have/has + V3.'} />,
      <Example key="e_intro" t={t} f={f} eng="I have finished. / She has never been to London. / Have you eaten?" rus={isUK ? 'Я закінчив. / Вона ніколи не була в Лондоні. / Ти їв?' : 'Я закончил. / Она никогда не была в Лондоне. / Ты ел?'} />,

      <Section key="s1" t={t} f={f} title={isUK ? '1. Структура Present Perfect' : '1. Структура Present Perfect'} />,
      <Table key="t1" t={t} f={f} rows={[
        [isUK ? 'Тип' : 'Тип', isUK ? 'Структура' : 'Структура', isUK ? 'Приклад' : 'Пример'],
        [isUK ? 'Ствердження' : 'Утверждение', 'have/has + V3', "I've finished my homework."],
        [isUK ? 'Заперечення' : 'Отрицание', 'haven\'t/hasn\'t + V3', "She hasn't arrived yet."],
        [isUK ? 'Питання' : 'Вопрос', 'Have/Has + підмет + V3?', 'Have you eaten?'],
      ]} />,

      <Section key="s2" t={t} f={f} title={isUK ? '2. Коли вживати Present Perfect' : '2. Когда использовать Present Perfect'} />,
      <Example key="e1" t={t} f={f} eng="I have lost my keys." rus={isUK ? 'Я загубив ключі. (результат: не можу відкрити)' : 'Я потерял ключи. (результат: не могу открыть)'} />,
      <Example key="e2" t={t} f={f} eng="She has never been to London." rus={isUK ? 'Вона ніколи не була в Лондоні. (досвід)' : 'Она никогда не была в Лондоне. (опыт)'} />,
      <Example key="e3" t={t} f={f} eng="I've lived here for 5 years." rus={isUK ? 'Я живу тут 5 років. (почалось в минулому, триває)' : 'Я живу здесь 5 лет. (началось в прошлом, продолжается)'} />,
      <Example key="e4" t={t} f={f} eng="Have you seen this film?" rus={isUK ? 'Ти дивився цей фільм? (досвід)' : 'Ты смотрел этот фильм? (опыт)'} />,

      <Section key="s3" t={t} f={f} title={isUK ? '3. Ключові слова' : '3. Ключевые слова'} />,
      <Table key="t2" t={t} f={f} rows={[
        [isUK ? 'PP (Present Perfect)' : 'PP (Present Perfect)', isUK ? 'PS (Past Simple)' : 'PS (Past Simple)'],
        ['just, already, yet, ever, never', 'yesterday, last year, in 2020, ago'],
        ['for, since, recently, lately', 'at 5 pm, when I was a child'],
        ["I've just eaten.", "I ate an hour ago."],
      ]} />,

      <Warn key="w1" t={t} f={f} text={isUK
        ? '❌ «I have seen him yesterday» → ✅ «I saw him yesterday». З конкретним часом у минулому (yesterday, last week, in 2020) — тільки Past Simple!'
        : '❌ «I have seen him yesterday» → ✅ «I saw him yesterday». С конкретным временем в прошлом (yesterday, last week, in 2020) — только Past Simple!'} />,
    ],
  },

  25: {
    titleRU: 'Past Continuous — действие в процессе в прошлом',
    titleUK: 'Past Continuous — дія в процесі в минулому',
    render: (t, isUK, f) => [
      <Body key="intro" t={t} f={f} text={isUK
        ? 'Past Continuous описує дію, що тривала в певний момент минулого. Найчастіше використовується разом з Past Simple: тривала дія (PC) перервалась короткою (PS). Утворюється: was/were + V-ing.'
        : 'Past Continuous описывает действие, которое продолжалось в определённый момент прошлого. Чаще всего используется вместе с Past Simple: длительное действие (PC) прерывалось коротким (PS). Образуется: was/were + V-ing.'} />,
      <Example key="e_intro" t={t} f={f} eng="I was watching TV when she called. / They were sleeping at 9 pm." rus={isUK ? 'Я дивився ТВ, коли вона зателефонувала. / О 9 вечора вони спали.' : 'Я смотрел ТВ, когда она позвонила. / В 9 вечера они спали.'} />,

      <Section key="s1" t={t} f={f} title={isUK ? '1. Структура Past Continuous' : '1. Структура Past Continuous'} />,
      <Table key="t1" t={t} f={f} rows={[
        [isUK ? 'Тип' : 'Тип', isUK ? 'Структура' : 'Структура', isUK ? 'Приклад' : 'Пример'],
        [isUK ? 'Ствердження' : 'Утверждение', 'was/were + V-ing', 'She was sleeping.'],
        [isUK ? 'Заперечення' : 'Отрицание', 'wasn\'t/weren\'t + V-ing', "I wasn't listening."],
        [isUK ? 'Питання' : 'Вопрос', 'Was/Were + підмет + V-ing?', 'Were you working?'],
      ]} />,

      <Section key="s2" t={t} f={f} title={isUK ? '2. PC + PS — класична комбінація' : '2. PC + PS — классическая комбинация'} />,
      <Example key="e1" t={t} f={f} eng="I was watching TV when she called." rus={isUK ? 'Я дивився ТВ, коли вона зателефонувала.' : 'Я смотрел ТВ, когда она позвонила.'} />,
      <Example key="e2" t={t} f={f} eng="While he was cooking, I was setting the table." rus={isUK ? 'Поки він готував, я накривав на стіл.' : 'Пока он готовил, я накрывал на стол.'} />,
      <Example key="e3" t={t} f={f} eng="We were walking in the park at 6 pm." rus={isUK ? 'О 6 вечора ми гуляли в парку.' : 'В 6 вечера мы гуляли в парке.'} />,
      <Example key="e4" t={t} f={f} eng="It was raining when I left the office." rus={isUK ? 'Коли я виходив з офісу, йшов дощ.' : 'Когда я выходил из офиса, шёл дождь.'} />,

      <Tip key="tip1" t={t} f={f} text={isUK
        ? 'When + Past Simple (короткий момент): «when she called». While + Past Continuous (тривала дія): «while I was watching». Ці слова підказують який час вживати.'
        : 'When + Past Simple (короткий момент): «when she called». While + Past Continuous (длительное действие): «while I was watching». Эти слова подсказывают какое время использовать.'} />,
    ],
  },

  26: {
    titleRU: 'Условные предложения (Conditionals)',
    titleUK: 'Умовні речення (Conditionals)',
    render: (t, isUK, f) => [
      <Body key="intro" t={t} f={f} text={isUK
        ? 'Умовні речення описують умови та їхні наслідки. Є кілька типів залежно від реальності та часу. Головне: кожен тип має чітку формулу, яку потрібно вивчити. Найчастіше вживаються типи 0, 1 і 2.'
        : 'Условные предложения описывают условия и их следствия. Есть несколько типов в зависимости от реальности и времени. Главное: каждый тип имеет чёткую формулу, которую нужно выучить. Чаще всего используются типы 0, 1 и 2.'} />,
      <Example key="e_intro" t={t} f={f} eng="If it rains, I will stay home. / If I had more money, I would travel." rus={isUK ? 'Якщо піде дощ, я залишуся вдома. / Якби у мене було більше грошей, я б подорожував.' : 'Если пойдёт дождь, я останусь дома. / Если бы у меня было больше денег, я бы путешествовал.'} />,

      <Section key="s1" t={t} f={f} title={isUK ? '1. Типи умовних речень' : '1. Типы условных предложений'} />,
      <Table key="t1" t={t} f={f} rows={[
        [isUK ? 'Тип' : 'Тип', isUK ? 'If-частина' : 'If-часть', isUK ? 'Головна частина' : 'Главная часть', isUK ? 'Значення' : 'Значение'],
        ['Type 0', 'If + Present Simple', 'Present Simple', isUK ? 'Завжди правда (факти)' : 'Всегда правда (факты)'],
        ['Type 1', 'If + Present Simple', 'will + V', isUK ? 'Реальна майбутня умова' : 'Реальное будущее условие'],
        ['Type 2', 'If + Past Simple', 'would + V', isUK ? 'Уявна/нереальна умова' : 'Воображаемое/нереальное условие'],
        ['Type 3', 'If + Past Perfect', 'would have + V3', isUK ? 'Нереальне в минулому' : 'Нереальное в прошлом'],
      ]} />,

      <Section key="s2" t={t} f={f} title={isUK ? '2. Приклади кожного типу' : '2. Примеры каждого типа'} />,
      <Example key="e1" t={t} f={f} eng="If you heat water to 100°C, it boils. (Type 0)" rus={isUK ? 'Якщо нагріти воду до 100°C, вона закипає. (факт)' : 'Если нагреть воду до 100°C, она кипит. (факт)'} />,
      <Example key="e2" t={t} f={f} eng="If it rains, I will stay home. (Type 1)" rus={isUK ? 'Якщо піде дощ, я залишуся вдома. (реально)' : 'Если пойдёт дождь, я останусь дома. (реально)'} />,
      <Example key="e3" t={t} f={f} eng="If I had more money, I would travel. (Type 2)" rus={isUK ? 'Якби у мене було більше грошей, я б подорожував. (нереально)' : 'Если бы у меня было больше денег, я бы путешествовал. (нереально)'} />,
      <Example key="e4" t={t} f={f} eng="If I had studied harder, I would have passed. (Type 3)" rus={isUK ? 'Якби я більше вчився, я б склав іспит. (минула нереальність)' : 'Если бы я больше учился, я бы сдал экзамен. (прошлая нереальность)'} />,

      <Warn key="w1" t={t} f={f} text={isUK
        ? '❌ «If I will go...» → ✅ «If I go...». Після if (у Type 1) — Present Simple, НЕ Future! Це класична помилка всіх слов\'яномовних учнів.'
        : '❌ «If I will go...» → ✅ «If I go...». После if (в Type 1) — Present Simple, НЕ Future! Это классическая ошибка всех славяноязычных учеников.'} />,
    ],
  },

  27: {
    titleRU: 'Косвенная речь — Reported Speech',
    titleUK: 'Непряма мова — Reported Speech',
    render: (t, isUK, f) => [
      <Body key="intro" t={t} f={f} text={isUK
        ? 'Непряма мова — це переказ слів іншої людини. Коли ми переказуємо, час зазвичай «зсувається назад»: Present → Past, Past → Past Perfect. Особисті займенники та вирази місця/часу також змінюються.'
        : 'Косвенная речь — это пересказ слов другого человека. При пересказе время обычно «сдвигается назад»: Present → Past, Past → Past Perfect. Личные местоимения и выражения места/времени тоже меняются.'} />,
      <Example key="e_intro" t={t} f={f} eng={'"I am tired." → She said she was tired. / "I will call." → He said he would call.'} rus={isUK ? '«Я втомлена» → Вона сказала, що втомлена. / «Я зателефоную» → Він сказав, що зателефонує.' : '«Я устала» → Она сказала, что устала. / «Я позвоню» → Он сказал, что позвонит.'} />,

      <Section key="s1" t={t} f={f} title={isUK ? '1. Зсув часів' : '1. Сдвиг времён'} />,
      <Table key="t1" t={t} f={f} rows={[
        [isUK ? 'Пряма мова' : 'Прямая речь', isUK ? 'Непряма мова' : 'Косвенная речь'],
        ['Present Simple → ', 'Past Simple'],
        ['Present Continuous → ', 'Past Continuous'],
        ['Past Simple → ', 'Past Perfect'],
        ['will → ', 'would'],
        ['can → ', 'could'],
        ['must → ', 'had to'],
      ]} />,

      <Section key="s2" t={t} f={f} title={isUK ? '2. Приклади перетворень' : '2. Примеры преобразований'} />,
      <Example key="e1" t={t} f={f} eng='"I am tired." → She said she was tired.' rus={isUK ? '«Я втомлена» → Вона сказала, що втомлена.' : '«Я устала» → Она сказала, что устала.'} />,
      <Example key="e2" t={t} f={f} eng='"I will call you." → He said he would call me.' rus={isUK ? '«Я зателефоную тобі» → Він сказав, що зателефонує мені.' : '«Я позвоню тебе» → Он сказал, что позвонит мне.'} />,
      <Example key="e3" t={t} f={f} eng='"Are you ready?" → She asked if I was ready.' rus={isUK ? '«Ти готовий?» → Вона запитала, чи я готовий.' : '«Ты готов?» → Она спросила, готов ли я.'} />,
      <Example key="e4" t={t} f={f} eng={"\"Don't be late!\" → He told me not to be late."} rus={isUK ? '«Не спізнюйся!» → Він сказав мені не спізнюватись.' : '«Не опаздывай!» → Он сказал мне не опаздывать.'} />,

      <Tip key="tip1" t={t} f={f} text={isUK
        ? 'Зміни виразів: now → then, here → there, today → that day, tomorrow → the next day, yesterday → the day before, this → that, these → those.'
        : 'Изменения выражений: now → then, here → there, today → that day, tomorrow → the next day, yesterday → the day before, this → that, these → those.'} />,
    ],
  },

  28: {
    titleRU: 'Возвратные местоимения: myself, yourself...',
    titleUK: 'Зворотні займенники: myself, yourself...',
    render: (t, isUK, f) => [
      <Body key="intro" t={t} f={f} text={isUK
        ? 'Зворотні займенники вживаються, коли підмет і додаток — одна й та сама особа («я зробив це сам»), або для підсилення («я особисто»). В слов\'янських мовах аналог — «себе/собі/самому».'
        : 'Возвратные местоимения употребляются, когда подлежащее и дополнение — одно и то же лицо («я сделал это сам»), или для усиления («я лично»). В славянских языках аналог — «себя/себе/самому».'} />,
      <Example key="e_intro" t={t} f={f} eng="She hurt herself. / I did it myself! / Help yourself!" rus={isUK ? 'Вона поранилась. / Я зробив це сам! / Пригощайся!' : 'Она ушиблась. / Я сделал это сам! / Угощайся!'} />,

      <Section key="s1" t={t} f={f} title={isUK ? '1. Таблиця зворотних займенників' : '1. Таблица возвратных местоимений'} />,
      <Table key="t1" t={t} f={f} rows={[
        [isUK ? 'Підмет' : 'Подлежащее', isUK ? 'Зворотний займенник' : 'Возвратное местоимение'],
        ['I', 'myself'],
        ['You (sing.)', 'yourself'],
        ['He', 'himself'],
        ['She', 'herself'],
        ['It', 'itself'],
        ['We', 'ourselves'],
        ['You (pl.)', 'yourselves'],
        ['They', 'themselves'],
      ]} />,

      <Section key="s2" t={t} f={f} title={isUK ? '2. Способи вживання' : '2. Способы употребления'} />,
      <Example key="e1" t={t} f={f} eng="She hurt herself." rus={isUK ? 'Вона поранилась. (підмет = додаток)' : 'Она ушиблась. (подлежащее = дополнение)'} />,
      <Example key="e2" t={t} f={f} eng="He taught himself English." rus={isUK ? 'Він сам вивчив англійську.' : 'Он сам выучил английский.'} />,
      <Example key="e3" t={t} f={f} eng="I did it myself!" rus={isUK ? 'Я зробив це сам! (підсилення)' : 'Я сделал это сам! (усиление)'} />,
      <Example key="e4" t={t} f={f} eng="The door opened by itself." rus={isUK ? 'Двері відчинились самі.' : 'Дверь открылась сама.'} />,
      <Example key="e5" t={t} f={f} eng="Help yourself!" rus={isUK ? 'Пригощайся! (загальне вираження)' : 'Угощайся! (общее выражение)'} />,

      <Tip key="tip1" t={t} f={f} text={isUK
        ? 'By + himself/herself/themselves = самостійно, без чужої допомоги: «She lives by herself» (живе сама). «I fixed it by myself» (полагодив без допомоги).'
        : 'By + himself/herself/themselves = самостоятельно, без чужой помощи: «She lives by herself» (живёт одна). «I fixed it by myself» (починил без помощи).'} />,
    ],
  },

  29: {
    titleRU: 'Used to — прошлые привычки',
    titleUK: 'Used to — минулі звички',
    render: (t, isUK, f) => [
      <Body key="intro" t={t} f={f} text={isUK
        ? '«Used to» виражає звичку або стан у минулому, якого вже немає. Це еквівалент «колись робив, але тепер не робить». Важливо не плутати з «be used to» (бути звиклим до) і «get used to» (звикати до).'
        : '«Used to» выражает привычку или состояние в прошлом, которых больше нет. Это эквивалент «раньше делал, но теперь нет». Важно не путать с «be used to» (быть привыкшим к) и «get used to» (привыкать к).'} />,
      <Example key="e_intro" t={t} f={f} eng="I used to live in Kyiv. / She used to be very shy." rus={isUK ? 'Колись я жив у Києві. / Раніше вона була дуже сором\'язливою.' : 'Раньше я жил в Киеве. / Раньше она была очень застенчивой.'} />,

      <Section key="s1" t={t} f={f} title={isUK ? '1. Структура used to' : '1. Структура used to'} />,
      <Table key="t1" t={t} f={f} rows={[
        [isUK ? 'Тип' : 'Тип', isUK ? 'Структура' : 'Структура', isUK ? 'Приклад' : 'Пример'],
        [isUK ? 'Ствердження' : 'Утверждение', 'used to + V', 'I used to smoke.'],
        [isUK ? 'Заперечення' : 'Отрицание', 'didn\'t use to + V', "She didn't use to like fish."],
        [isUK ? 'Питання' : 'Вопрос', 'Did + підмет + use to + V?', 'Did you use to play football?'],
      ]} />,

      <Example key="e1" t={t} f={f} eng="I used to live in Kyiv." rus={isUK ? 'Колись я жив у Києві. (тепер не живу)' : 'Раньше я жил в Киеве. (теперь нет)'} />,
      <Example key="e2" t={t} f={f} eng="She used to be very shy." rus={isUK ? 'Раніше вона була дуже сором\'язливою.' : 'Раньше она была очень застенчивой.'} />,
      <Example key="e3" t={t} f={f} eng="We didn't use to have smartphones." rus={isUK ? 'Колись у нас не було смартфонів.' : 'Раньше у нас не было смартфонов.'} />,
      <Example key="e4" t={t} f={f} eng="Did you use to play the piano?" rus={isUK ? 'Ти колись грав на піаніно?' : 'Ты раньше играл на пианино?'} />,

      <Section key="s2" t={t} f={f} title={isUK ? '2. Be used to vs Get used to' : '2. Be used to vs Get used to'} />,
      <Example key="e5" t={t} f={f} eng="I'm used to waking up early." rus={isUK ? 'Я звик прокидатись рано. (вже звик)' : 'Я привык вставать рано. (уже привык)'} />,
      <Example key="e6" t={t} f={f} eng="I'm getting used to the cold weather." rus={isUK ? 'Я звикаю до холодної погоди. (в процесі)' : 'Я привыкаю к холодной погоде. (в процессе)'} />,
      <Warn key="w1" t={t} f={f} text={isUK
        ? 'Be/get used to + герундій (-ing): «I\'m used to working late». Used to + інфінітив: «I used to work late» (раніше). Не плутай!'
        : 'Be/get used to + герундий (-ing): «I\'m used to working late». Used to + инфинитив: «I used to work late» (раньше). Не путай!'} />,
    ],
  },

  30: {
    titleRU: 'Relative Clauses — определительные придаточные',
    titleUK: 'Relative Clauses — означальні підрядні речення',
    render: (t, isUK, f) => [
      <Body key="intro" t={t} f={f} text={isUK
        ? 'Відносні підрядні речення уточнюють іменник за допомогою who, which, that, whose, where, when. Це спосіб поєднати два речення в одне: «The man is my teacher. He lives here.» → «The man who lives here is my teacher.»'
        : 'Определительные придаточные уточняют существительное с помощью who, which, that, whose, where, when. Это способ объединить два предложения в одно: «The man is my teacher. He lives here.» → «The man who lives here is my teacher.»'} />,
      <Example key="e_intro" t={t} f={f} eng="The man who lives here is my teacher. / The book which I read was great." rus={isUK ? 'Чоловік, який тут живе, — мій учитель. / Книжка, яку я читав, була чудовою.' : 'Мужчина, который здесь живёт, — мой учитель. / Книга, которую я читал, была великолепна.'} />,

      <Section key="s1" t={t} f={f} title={isUK ? '1. Відносні займенники' : '1. Относительные местоимения'} />,
      <Table key="t1" t={t} f={f} rows={[
        [isUK ? 'Слово' : 'Слово', isUK ? 'Вживається для' : 'Используется для', isUK ? 'Приклад' : 'Пример'],
        ['who', isUK ? 'людини (підмет/додаток)' : 'человека (подлежащее/дополнение)', 'The woman who called is my sister.'],
        ['which', isUK ? 'предмети та тварини' : 'предметы и животные', 'The book which I read was great.'],
        ['that', isUK ? 'людини і предмети' : 'человека и предметы', 'The car that he bought is red.'],
        ['whose', isUK ? 'присвійний (чий)' : 'притяжательный (чей)', "The girl whose bag was stolen..."],
        ['where', isUK ? 'місця' : 'места', 'The city where I was born...'],
        ['when', isUK ? 'часу' : 'времени', 'The day when we met...'],
      ]} />,

      <Section key="s2" t={t} f={f} title={isUK ? '2. Визначальні та пояснювальні підрядні' : '2. Определительные и пояснительные придаточные'} />,
      <Body key="b2" t={t} f={f} text={isUK
        ? 'Defining (без ком): необхідне для ідентифікації. Non-defining (з комами): додаткова інформація, можна прибрати.'
        : 'Defining (без запятых): необходимо для идентификации. Non-defining (с запятыми): дополнительная информация, можно убрать.'} />,
      <Example key="e1" t={t} f={f} eng="The man who is tall is my father. (defining)" rus={isUK ? 'Чоловік, що високий — мій батько. (ідентифікація)' : 'Высокий мужчина — мой отец. (идентификация)'} />,
      <Example key="e2" t={t} f={f} eng="My father, who is tall, is a doctor. (non-defining)" rus={isUK ? 'Мій батько, який є високим, лікар. (додатково)' : 'Мой отец, который высокий, — врач. (дополнительно)'} />,
      <Example key="e3" t={t} f={f} eng="This is the place where we first met." rus={isUK ? 'Це місце, де ми вперше зустрілись.' : 'Это место, где мы впервые встретились.'} />,

      <Tip key="tip1" t={t} f={f} text={isUK
        ? 'That замість who/which — тільки в defining clause (без ком). В non-defining — тільки who або which. «My cat, that is black» — неправильно! Тільки «My cat, which is black».'
        : 'That вместо who/which — только в defining clause (без запятых). В non-defining — только who или which. «My cat, that is black» — неправильно! Только «My cat, which is black».'} />,
    ],
  },

  31: {
    titleRU: 'Complex Object — сложное дополнение',
    titleUK: 'Complex Object — складний додаток',
    render: (t, isUK, f) => [
      <Body key="intro" t={t} f={f} text={isUK
        ? 'Complex Object (складний додаток) — конструкція, де після дієслова йде іменник/займенник + інфінітив або -ing. Наприклад: «I want him to go» (Я хочу, щоб він пішов). В українській/російській — підрядне речення зі «щоб/чтобы».'
        : 'Complex Object (сложное дополнение) — конструкция, где после глагола идёт существительное/местоимение + инфинитив или -ing. Например: «I want him to go» (Я хочу, чтобы он ушёл). В украинском/русском — придаточное предложение с «щоб/чтобы».'} />,
      <Example key="e_intro" t={t} f={f} eng="I want him to go. / She made me laugh. / Let me help you." rus={isUK ? 'Я хочу, щоб він пішов. / Вона змусила мене сміятись. / Дозволь мені допомогти тобі.' : 'Я хочу, чтобы он ушёл. / Она заставила меня смеяться. / Позволь мне помочь тебе.'} />,

      <Section key="s1" t={t} f={f} title={isUK ? '1. Дієслова + Object + Infinitive' : '1. Глаголы + Object + Infinitive'} />,
      <Table key="t1" t={t} f={f} rows={[
        [isUK ? 'Дієслово' : 'Глагол', isUK ? 'Приклад' : 'Пример', isUK ? 'Переклад' : 'Перевод'],
        ['want', 'I want you to stay.', isUK ? 'Я хочу, щоб ти залишився.' : 'Я хочу, чтобы ты остался.'],
        ['expect', 'She expects him to call.', isUK ? 'Вона очікує, що він зателефонує.' : 'Она ожидает, что он позвонит.'],
        ['ask', 'I asked her to help.', isUK ? 'Я попросив її допомогти.' : 'Я попросил её помочь.'],
        ['tell', 'He told me to stop.', isUK ? 'Він сказав мені зупинитись.' : 'Он сказал мне остановиться.'],
        ['allow', 'They allowed us to leave.', isUK ? 'Вони дозволили нам піти.' : 'Они разрешили нам уйти.'],
        ['make/let', 'She made me laugh.', isUK ? 'Вона змусила мене сміятись.' : 'Она заставила меня смеяться.'],
      ]} />,

      <Section key="s2" t={t} f={f} title={isUK ? '2. Make/Let/Help — без to!' : '2. Make/Let/Help — без to!'} />,
      <Example key="e1" t={t} f={f} eng="She made me clean the room." rus={isUK ? 'Вона змусила мене прибрати кімнату. (без to)' : 'Она заставила меня убрать комнату. (без to)'} />,
      <Example key="e2" t={t} f={f} eng="Let me help you." rus={isUK ? 'Дозволь мені допомогти тобі. (без to)' : 'Позволь мне помочь тебе. (без to)'} />,
      <Example key="e3" t={t} f={f} eng="She helped me carry the bags." rus={isUK ? 'Вона допомогла мені нести сумки.' : 'Она помогла мне нести сумки.'} />,

      <Warn key="w1" t={t} f={f} text={isUK
        ? '❌ «I want that he goes» → ✅ «I want him to go». Після want/expect/ask/tell — Complex Object, не підрядне речення! Make/let/help — без to: «make him go» (не «make him to go»).'
        : '❌ «I want that he goes» → ✅ «I want him to go». После want/expect/ask/tell — Complex Object, не придаточное предложение! Make/let/help — без to: «make him go» (не «make him to go»).'} />,
    ],
  },

  32: {
    titleRU: 'Финальное повторение — всё в одном',
    titleUK: 'Фінальне повторення — все в одному',
    render: (t, isUK, f) => [
      <Body key="intro" t={t} f={f} text={isUK
        ? 'Вітаємо! Ти пройшов усі 32 уроки. Цей урок — фінальне повторення ключових граматичних концепцій. Пам\'ятай: граматика — не мета, а інструмент для спілкування. Практикуй у реальних ситуаціях щодня!'
        : 'Поздравляем! Ты прошёл все 32 урока. Этот урок — финальное повторение ключевых грамматических концепций. Помни: грамматика — не цель, а инструмент для общения. Практикуй в реальных ситуациях каждый день!'} />,
      <Example key="e_intro" t={t} f={f} eng="I have been learning English. / If I practise every day, I will improve!" rus={isUK ? 'Я вчу англійську. / Якщо буду практикуватись щодня — стану кращим!' : 'Я учу английский. / Если буду практиковаться каждый день — стану лучше!'} />,

      <Section key="s1" t={t} f={f} title={isUK ? '1. Часи англійської мови' : '1. Времена английского языка'} />,
      <Table key="t1" t={t} f={f} rows={[
        [isUK ? 'Час' : 'Время', isUK ? 'Формула' : 'Формула', isUK ? 'Сигнальне слово' : 'Сигнальное слово'],
        ['Present Simple', 'V / V+s', 'every day, always, usually'],
        ['Present Continuous', 'am/is/are + V-ing', 'now, right now, at the moment'],
        ['Past Simple', 'V2 / did + V', 'yesterday, last year, ago'],
        ['Past Continuous', 'was/were + V-ing', 'while, when (+ PS)'],
        ['Future Simple', 'will + V', 'tomorrow, next week, soon'],
        ['Present Perfect', 'have/has + V3', 'just, already, yet, ever, never, for, since'],
        ['Passive Voice', 'be + V3', isUK ? 'коли предмет отримує дію' : 'когда предмет получает действие'],
      ]} />,

      <Section key="s2" t={t} f={f} title={isUK ? '2. Топ-10 частих помилок' : '2. Топ-10 частых ошибок'} />,
      <Warn key="w1" t={t} f={f} text="❌ «I am agree» → ✅ «I agree». (agree — звичайне дієслово, не прикметник)" />,
      <Warn key="w2" t={t} f={f} text="❌ «She don't know» → ✅ «She doesn't know». (he/she/it → doesn't)" />,
      <Warn key="w3" t={t} f={f} text="❌ «I didn't went» → ✅ «I didn't go». (після didn't — базова форма)" />,
      <Warn key="w4" t={t} f={f} text="❌ «If I will come...» → ✅ «If I come...». (після if — Present Simple)" />,
      <Warn key="w5" t={t} f={f} text="❌ «more better» → ✅ «better». (без подвійного порівняння)" />,
      <Warn key="w6" t={t} f={f} text="❌ «I have seen him yesterday» → ✅ «I saw him yesterday». (yesterday → Past Simple)" />,
      <Warn key="w7" t={t} f={f} text="❌ «He is knowing» → ✅ «He knows». (know — стативне дієслово)" />,
      <Warn key="w8" t={t} f={f} text="❌ «I want that he goes» → ✅ «I want him to go». (Complex Object)" />,

      <Section key="s3" t={t} f={f} title={isUK ? '3. Поради для подальшого розвитку' : '3. Советы для дальнейшего развития'} />,
      <Tip key="tip1" t={t} f={f} text={isUK
        ? 'Дивись серіали з субтитрами на двох мовах. Почни з простих: Friends, The Office, Modern Family. Зупиняйся на незрозумілих фразах і вчи їх.'
        : 'Смотри сериалы с субтитрами на двух языках. Начни с простых: Friends, The Office, Modern Family. Останавливайся на непонятных фразах и учи их.'} />,
      <Tip key="tip2" t={t} f={f} text={isUK
        ? 'Говори вголос щодня, навіть на самоті. Описуй, що бачиш навколо. Думай англійською хоча б 5 хвилин на день.'
        : 'Говори вслух каждый день, даже в одиночестве. Описывай, что видишь вокруг. Думай на английском хотя бы 5 минут в день.'} />,
      <Tip key="tip3" t={t} f={f} text={isUK
        ? 'Продовжуй вивчати нові слова через картки (Anki), читай прості тексти на рівні B1-B2, і головне — не бійся помилок. Помилки — це навчання!'
        : 'Продолжай учить новые слова через карточки (Anki), читай простые тексты уровня B1-B2, и главное — не бойся ошибок. Ошибки — это обучение!'} />,
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
  const isUK = lang === 'uk';

  useEffect(() => {
    updateTaskProgress('open_theory', 1).catch(() => {});
  }, []);

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
            {isUK ? `Урок ${lessonId} — Теорія` : `Урок ${lessonId} — Теория`}
          </Text>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700' }} numberOfLines={1}>
            {theory ? (isUK ? theory.titleUK : theory.titleRU) : (isUK ? `Урок ${lessonId}` : `Урок ${lessonId}`)}
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {theory ? (
          theory.render(t, isUK, f)
        ) : (
          <Body key="fallback" t={t} f={f} text={
            isUK
              ? `Теорія для уроку ${lessonId} незабаром з\'явиться. Продовжуй практикуватись!`
              : `Теория для урока ${lessonId} скоро появится. Продолжай практиковаться!`
          } />
        )}
      </ScrollView>
      </ContentWrap>
    </SafeAreaView>
    </ScreenGradient>
  );
}
