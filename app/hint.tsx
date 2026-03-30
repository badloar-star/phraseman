import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';

function TableHeader({ cols, t, f }: { cols: string[]; t: any; f: any }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.bgSurface, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
      {cols.map((col, i) => (
        <View key={i} style={[
          { flex: 1, paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center' },
          i < cols.length - 1 && { borderRightWidth: 0.5, borderRightColor: t.border },
        ]}>
          <Text style={{ color: t.textSecond, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center' }} maxFontSizeMultiplier={1}>
            {col}
          </Text>
        </View>
      ))}
    </View>
  );
}

function TableRow({ cells, isEven, t, f, firstBold }: { cells: string[]; isEven: boolean; t: any; f: any; firstBold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: isEven ? t.bgCard : t.bgSurface, borderTopWidth: 0.5, borderTopColor: t.border }}>
      {cells.map((cell, i) => (
        <View key={i} style={[
          { flex: 1, paddingVertical: 10, paddingHorizontal: 8, justifyContent: 'center' },
          i < cells.length - 1 && { borderRightWidth: 0.5, borderRightColor: t.border },
        ]}>
          <Text style={{ color: t.textPrimary, fontSize: 11, fontWeight: (i === 0 && firstBold) ? '700' : '400', lineHeight: 17 }} maxFontSizeMultiplier={1}>
            {cell}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Table({ label, headers, rows, t, f, firstBold }: {
  label?: string; headers: string[]; rows: string[][]; t: any; f: any; firstBold?: boolean;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      {label && (
        <Text style={{ color: t.textSecond, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }} maxFontSizeMultiplier={1}>
          {label}
        </Text>
      )}
      <View style={{ borderWidth: 0.5, borderColor: t.border, borderRadius: 12, overflow: 'hidden' }}>
        <TableHeader cols={headers} t={t} f={f} />
        {rows.map((row, i) => (
          <TableRow key={i} cells={row} isEven={i % 2 === 0} t={t} f={f} firstBold={firstBold} />
        ))}
      </View>
    </View>
  );
}

type HintContent = {
  titleRU: string;
  titleUK: string;
  render: (t: any, isUK: boolean, f: any) => React.ReactNode;
};

const HINTS: Record<number, HintContent> = {
  1: {
    titleRU: 'To Be — am / is / are',
    titleUK: 'To Be — am / is / are',
    render: (t, isUK, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[isUK?'Підмет':'Подлежащее', isUK?'Ствердження':'Утверждение', isUK?'Заперечення':'Отрицание', isUK?'Питання':'Вопрос']}
        rows={[
          ['I',    "I am / I'm",       "I'm not",      'Am I?'    ],
          ['You',  "You are / You're", "You aren't",   'Are you?' ],
          ['He',   "He is / He's",     "He isn't",     'Is he?'   ],
          ['She',  "She is / She's",   "She isn't",    'Is she?'  ],
          ['It',   "It is / It's",     "It isn't",     'Is it?'   ],
          ['We',   "We are / We're",   "We aren't",    'Are we?'  ],
          ['They', 'They are',         "They aren't",  'Are they?'],
        ]}
      />,
    ],
  },
  2: {
    titleRU: 'To Be — отрицание и вопросы',
    titleUK: 'To Be — заперечення і питання',
    render: (t, isUK, f) => [
      <Table key="t1" t={t} f={f} firstBold
        label={isUK ? 'Заперечення (не є)' : 'Отрицание (не является)'}
        headers={[isUK?'Підмет':'Подлежащее', isUK?'Повна форма':'Полная форма', isUK?'Скорочення':'Сокращение']}
        rows={[
          ['I',         'I am not',     "I'm not"    ],
          ['He/She/It', 'He is not',    "He isn't"   ],
          ['You/We/They','You are not', "You aren't" ],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={isUK ? 'Питання та короткі відповіді' : 'Вопросы и краткие ответы'}
        headers={[isUK?'Питання':'Вопрос', isUK?'Так':'Да', isUK?'Ні':'Нет']}
        rows={[
          ['Am I right?',      'Yes, you are.',  "No, you aren't."  ],
          ['Is he a doctor?',  'Yes, he is.',    "No, he isn't."    ],
          ['Are they at home?','Yes, they are.', "No, they aren't." ],
        ]}
      />,
    ],
  },
  3: {
    titleRU: 'Present Simple — утверждение',
    titleUK: 'Present Simple — ствердження',
    render: (t, isUK, f) => [
      <Table key="t1" t={t} f={f} firstBold
        label="I / You / We / They"
        headers={[isUK?'Дієслово':'Глагол', isUK?'Приклад':'Пример']}
        rows={[['work','I work every day.'],['go','We go to school.'],['study','They study English.'],['like','You like coffee.']]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label="He / She / It → +s / +es"
        headers={[isUK?'Правило':'Правило', isUK?'Приклад':'Пример']}
        rows={isUK ? [
          ['Більшість + s',        'work → works, read → reads'    ],
          ['-o/-sh/-ch/-x + es',   'go → goes, watch → watches'    ],
          ['Приголосна + y → ies', 'study → studies, fly → flies'  ],
          ['have → has',           'She has a car.'                ],
        ] : [
          ['Большинство + s',      'work → works, read → reads'    ],
          ['-o/-sh/-ch/-x + es',   'go → goes, watch → watches'    ],
          ['Согл. + y → ies',      'study → studies, fly → flies'  ],
          ['have → has',           'She has a car.'                ],
        ]}
      />,
    ],
  },
  4: {
    titleRU: 'Present Simple — отрицание и вопрос',
    titleUK: 'Present Simple — заперечення і питання',
    render: (t, isUK, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[isUK?'Підмет':'Подлежащее', isUK?'Заперечення':'Отрицание', isUK?'Питання':'Вопрос']}
        rows={[
          ['I / You / We / They', "don't + V",   'Do + ... + V?'  ],
          ['He / She / It',       "doesn't + V", 'Does + ... + V?'],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={isUK?'Приклади':'Примеры'}
        headers={[isUK?'Ствердження':'Утверждение', isUK?'Заперечення':'Отрицание']}
        rows={[
          ['I work here.',       "I don't work here."    ],
          ['She reads books.',   "She doesn't read."     ],
          ['They play tennis.',  "They don't play."      ],
        ]}
      />,
    ],
  },
  5: {
    titleRU: 'Present Simple — вопросы',
    titleUK: 'Present Simple — питання',
    render: (t, isUK, f) => [
      <Table key="t1" t={t} f={f} firstBold
        label={isUK?'Загальні питання':'Общие вопросы'}
        headers={[isUK?'Підмет':'Подлежащее', isUK?'Питання':'Вопрос', isUK?'Відповідь':'Ответ']}
        rows={[
          ['I / You / We', 'Do you work?',   "Yes, I do. / No, I don't."        ],
          ['He / She',     'Does she work?', "Yes, she does. / No, she doesn't."],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={isUK?'Спеціальні питання (Wh-)':'Специальные вопросы (Wh-)'}
        headers={['Wh-', isUK?'Приклад':'Пример']}
        rows={[
          ['What',  'What do you do?'     ],
          ['Where', 'Where does she live?'],
          ['When',  'When do they eat?'   ],
          ['Why',   'Why does he work?'   ],
          ['How',   'How do you feel?'    ],
        ]}
      />,
    ],
  },
  6: {
    titleRU: 'Специальные вопросы',
    titleUK: 'Спеціальні питання',
    render: (t, isUK, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={['Wh-', isUK?'Значення':'Значение', isUK?'Приклад':'Пример']}
        rows={isUK ? [
          ['What',  'Що / Який',    'What do you want?'       ],
          ['Who',   'Хто',          'Who lives here?'         ],
          ['Where', 'Де / Куди',    'Where are you going?'    ],
          ['When',  'Коли',         'When does it start?'     ],
          ['Why',   'Чому',         'Why are you late?'       ],
          ['How',   'Як',           'How do you feel?'        ],
          ['Which', 'Який (вибір)', 'Which book do you like?' ],
          ['Whose', 'Чий',          'Whose bag is this?'      ],
        ] : [
          ['What',  'Что / Какой',  'What do you want?'       ],
          ['Who',   'Кто',          'Who lives here?'         ],
          ['Where', 'Где / Куда',   'Where are you going?'    ],
          ['When',  'Когда',        'When does it start?'     ],
          ['Why',   'Почему',       'Why are you late?'       ],
          ['How',   'Как',          'How do you feel?'        ],
          ['Which', 'Который',      'Which book do you like?' ],
          ['Whose', 'Чей',          'Whose bag is this?'      ],
        ]}
      />,
    ],
  },
  7: {
    titleRU: 'To Have — иметь',
    titleUK: 'To Have — мати',
    render: (t, isUK, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[isUK?'Підмет':'Подлежащее', isUK?'Ствердження':'Утверждение', isUK?'Заперечення':'Отрицание', isUK?'Питання':'Вопрос']}
        rows={[
          ['I / You / We / They', 'have', "don't have",   'Do ... have?'  ],
          ['He / She / It',       'has',  "doesn't have", 'Does ... have?'],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={isUK?'Приклади':'Примеры'}
        headers={[isUK?'Речення':'Предложение']}
        rows={[
          ['I have a car.'],['She has two cats.'],["He doesn't have a phone."],
          ['Do you have a pen?'],['Does she have time?'],
        ]}
      />,
    ],
  },
  8: {
    titleRU: 'Предлоги времени: at / in / on',
    titleUK: 'Прийменники часу: at / in / on',
    render: (t, isUK, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[isUK?'Прийменник':'Предлог', isUK?'Вживається з':'Употребляется с', isUK?'Приклади':'Примеры']}
        rows={isUK ? [
          ['AT', 'Точний час, полудень, ніч',    'at 7:00, at noon, at night'       ],
          ['IN', 'Місяць, рік, сезон, час доби', 'in May, in 2024, in the morning'  ],
          ['ON', 'День тижня, дата, свято',       'on Monday, on 5th March'          ],
        ] : [
          ['AT', 'Точное время, полдень, ночь',  'at 7:00, at noon, at night'       ],
          ['IN', 'Месяц, год, сезон, часть дня', 'in May, in 2024, in the morning'  ],
          ['ON', 'День недели, дата, праздник',   'on Monday, on 5th March'          ],
        ]}
      />,
    ],
  },
  9: {
    titleRU: 'There is / There are',
    titleUK: 'There is / There are',
    render: (t, isUK, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[isUK?'Число':'Число', isUK?'Ствердження':'Утверждение', isUK?'Заперечення':'Отрицание', isUK?'Питання':'Вопрос']}
        rows={[
          [isUK?'Одн.':'Ед.ч.', 'There is a book.',  "There isn't a book.",   'Is there a book?'  ],
          [isUK?'Мн.':'Мн.ч.',  'There are chairs.', "There aren't chairs.",  'Are there chairs?' ],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={isUK?'Прийменники місця':'Предлоги места'}
        headers={[isUK?'Прийменник':'Предлог', isUK?'Значення':'Значение', isUK?'Приклад':'Пример']}
        rows={isUK ? [
          ['in',          'всередині',  'The cat is in the box.'          ],
          ['on',          'на',         'The book is on the table.'       ],
          ['under',       'під',        'The bag is under the desk.'      ],
          ['next to',     'поряд з',    'She sits next to me.'            ],
          ['between',     'між',        'He stands between us.'           ],
          ['behind',      'позаду',     'The park is behind us.'          ],
          ['in front of', 'перед',      'The car is in front of the house.'],
          ['opposite',    'навпроти',   'The bank is opposite the school.'],
        ] : [
          ['in',          'внутри',     'The cat is in the box.'          ],
          ['on',          'на',         'The book is on the table.'       ],
          ['under',       'под',        'The bag is under the desk.'      ],
          ['next to',     'рядом с',    'She sits next to me.'            ],
          ['between',     'между',      'He stands between us.'           ],
          ['behind',      'позади',     'The park is behind us.'          ],
          ['in front of', 'перед',      'The car is in front of the house.'],
          ['opposite',    'напротив',   'The bank is opposite the school.'],
        ]}
      />,
    ],
  },
  10: {
    titleRU: 'Модальные глаголы',
    titleUK: 'Модальні дієслова',
    render: (t, isUK, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[isUK?'Дієслово':'Глагол', isUK?'Значення':'Значение', isUK?'Приклад':'Пример']}
        rows={isUK ? [
          ['can',     'вміти / мати змогу',   'I can swim.'             ],
          ["can't",   'не вміти / не можна',  "You can't park here."    ],
          ['must',    'мусити (внутрішня потреба)',   'I must finish this.'     ],
          ["mustn't", 'заборона',                    "You mustn't smoke here." ],
          ['should',  'слід / варто',                'You should sleep more.'  ],
          ['may',     'можна (дозвіл)',               'May I come in?'          ],
          ['might',   'можливо (невпевненість)',      'It might rain today.'    ],
          ['have to', 'мусити (зовнішня необхідність)', 'I have to work tomorrow.'],
        ] : [
          ['can',     'уметь / мочь',         'I can swim.'             ],
          ["can't",   'не уметь / нельзя',    "You can't park here."    ],
          ['must',    'должен (внутреннее)',  'I must finish this.'     ],
          ["mustn't", 'запрет',               "You mustn't smoke here." ],
          ['should',  'следует / стоит',       'You should sleep more.'  ],
          ['may',     'можно (разрешение)',   'May I come in?'          ],
          ['might',   'возможно (неуверенность)', 'It might rain today.'    ],
          ['have to', 'должен (внешнее)',     'I have to work tomorrow.'],
        ]}
      />,
    ],
  },
  11: {
    titleRU: 'Past Simple — правильные глаголы',
    titleUK: 'Past Simple — правильні дієслова',
    render: (t, isUK, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[isUK?'Форма':'Форма', isUK?'Структура':'Структура', isUK?'Приклад':'Пример']}
        rows={[
          ['+', 'Subject + V-ed',       'She worked yesterday.' ],
          ['−', "Subject + didn't + V", "She didn't work."      ],
          ['?', 'Did + subject + V?',   'Did she work?'         ],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={isUK?'Правила написання':'Правила написания'}
        headers={[isUK?'Правило':'Правило', isUK?'Приклад':'Пример']}
        rows={isUK ? [
          ['Більшість + ed',         'work → worked, play → played'   ],
          ['Закінч. на -e',          'like → liked, live → lived'     ],
          ['Приголосна + y → ied',   'study → studied, cry → cried'   ],
          ['CVC → подвоїти',         'stop → stopped, plan → planned' ],
        ] : [
          ['Большинство + ed',       'work → worked, play → played'   ],
          ['Оканч. на -e',           'like → liked, live → lived'     ],
          ['Согл. + y → ied',        'study → studied, cry → cried'   ],
          ['CVC → удвоить',          'stop → stopped, plan → planned' ],
        ]}
      />,
    ],
  },
  12: {
    titleRU: 'Past Simple — неправильные глаголы',
    titleUK: 'Past Simple — неправильні дієслова',
    render: (t, isUK, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[isUK?'Форма':'Форма', isUK?'Структура':'Структура', isUK?'Приклад':'Пример']}
        rows={[
          ['+', 'Subject + V2',          'He went home.'   ],
          ['−', "Subject + didn't + V1", "He didn't go."   ],
          ['?', 'Did + subject + V1?',   'Did he go?'      ],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={isUK?'Часті дієслова':'Частые глаголы'}
        headers={['V1', 'V2', isUK?'Значення':'Значение']}
        rows={isUK ? [
          ['go',    'went',   'іти / їхати'],
          ['come',  'came',   'приходити'  ],
          ['see',   'saw',    'бачити'     ],
          ['get',   'got',    'отримувати' ],
          ['have',  'had',    'мати'       ],
          ['say',   'said',   'говорити'   ],
          ['take',  'took',   'брати'      ],
          ['know',  'knew',   'знати'      ],
          ['think', 'thought','думати'     ],
          ['buy',   'bought', 'купувати'   ],
        ] : [
          ['go',    'went',   'идти / ехать'],
          ['come',  'came',   'приходить'   ],
          ['see',   'saw',    'видеть'      ],
          ['get',   'got',    'получать'    ],
          ['have',  'had',    'иметь'       ],
          ['say',   'said',   'говорить'    ],
          ['take',  'took',   'брать'       ],
          ['know',  'knew',   'знать'       ],
          ['think', 'thought','думать'      ],
          ['buy',   'bought', 'покупать'    ],
        ]}
      />,
    ],
  },
  13: {
    titleRU: 'Future Simple — will',
    titleUK: 'Future Simple — will',
    render: (t, isUK, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[isUK?'Форма':'Форма', isUK?'Структура':'Структура', isUK?'Приклад':'Пример']}
        rows={[
          ['+',                  'Subject + will + V',  'I will call you.'      ],
          ['−',                  "Subject + won't + V", "She won't be late."    ],
          ['?',                  'Will + subj + V?',    'Will you help me?'     ],
          [isUK?'Скор.':'Сокр.', "I'll / You'll",       "I'll do it tomorrow."  ],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={isUK?'Коли вживати':'Когда использовать'}
        headers={[isUK?'Ситуація':'Ситуация', isUK?'Приклад':'Пример']}
        rows={isUK ? [
          ['Рішення зараз',          "It's cold — I'll close the window."],
          ['Обіцянка',               "I'll help you tomorrow."           ],
          ['Передбачення (думаю)',    'I think it will rain.'             ],
          ['Прохання / пропозиція',  'Will you open the door?'           ],
        ] : [
          ['Решение прямо сейчас',   "It's cold — I'll close the window."],
          ['Обещание',               "I'll help you tomorrow."           ],
          ['Предсказание (думаю)',    'I think it will rain.'             ],
          ['Просьба / предложение',  'Will you open the door?'           ],
        ]}
      />,
    ],
  },
  14: {
    titleRU: 'Степени сравнения',
    titleUK: 'Ступені порівняння',
    render: (t, isUK, f) => [
      <Table key="t1" t={t} f={f} firstBold
        label={isUK?'Короткі прикметники':'Короткие прилагательные'}
        headers={[isUK?'Звичайне':'Обычное', isUK?'Порівняльне':'Сравнит.', isUK?'Найвищий':'Превосх.']}
        rows={[
          ['old',  'older',   'the oldest'  ],
          ['tall', 'taller',  'the tallest' ],
          ['big',  'bigger',  'the biggest' ],
          ['easy', 'easier',  'the easiest' ],
          ['hot',  'hotter',  'the hottest' ],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={isUK?'Довгі прикметники':'Длинные прилагательные'}
        headers={[isUK?'Звичайне':'Обычное', isUK?'Порівняльне':'Сравнит.', isUK?'Найвищий':'Превосх.']}
        rows={[
          ['beautiful',   'more beautiful',   'the most beautiful'  ],
          ['expensive',   'more expensive',   'the most expensive'  ],
          ['interesting', 'more interesting', 'the most interesting'],
        ]}
      />,
      <Table key="t3" t={t} f={f} firstBold
        label={isUK?'Винятки':'Исключения'}
        headers={[isUK?'Звичайне':'Обычное', isUK?'Порівняльне':'Сравнит.', isUK?'Найвищий':'Превосх.']}
        rows={[
          ['good', 'better',  'the best'    ],
          ['bad',  'worse',   'the worst'   ],
          ['far',  'farther', 'the farthest'],
          ['much', 'more',    'the most'    ],
        ]}
      />,
    ],
  },
  15: {
    titleRU: 'Притяжательные местоимения',
    titleUK: 'Присвійні займенники',
    render: (t, isUK, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[isUK?'Особа':'Лицо', isUK?'Перед іменником':'Перед сущ.', isUK?'Самостійно':'Самостоятельно', isUK?'Приклад':'Пример']}
        rows={[
          ['I',    'my',    'mine',   "This is my bag. — It's mine."    ],
          ['You',  'your',  'yours',  "It's yours."                     ],
          ['He',   'his',   'his',    "His name is Alex."               ],
          ['She',  'her',   'hers',   "That's hers."                    ],
          ['It',   'its',   '—',      "The dog ate its food."           ],
          ['We',   'our',   'ours',   "Our house is big."               ],
          ['They', 'their', 'theirs', "The keys are theirs."            ],
        ]}
      />,
    ],
  },
  16: {
    titleRU: 'Фразовые глаголы',
    titleUK: 'Фразові дієслова',
    render: (t, isUK, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[isUK?'Дієслово':'Глагол', isUK?'Значення':'Значение', isUK?'Приклад':'Пример']}
        rows={isUK ? [
          ['get up',    'вставати',          'I get up at 7.'              ],
          ['turn on',   'вмикати',           'Turn on the light.'          ],
          ['turn off',  'вимикати',          'Turn off the TV.'            ],
          ['look for',  'шукати',            "I'm looking for my keys."    ],
          ['give up',   'кидати / здаватись',"Don't give up!"              ],
          ['find out',  'дізнатися',         'I found out the truth.'      ],
          ['come back', 'повертатися',       'Come back soon.'             ],
          ['put on',    'одягати',           'Put on your coat.'           ],
          ['take off',  'знімати / злітати', 'Take off your shoes.'        ],
          ['go on',     'продовжувати',      'Go on, please.'              ],
        ] : [
          ['get up',    'вставать',          'I get up at 7.'              ],
          ['turn on',   'включать',          'Turn on the light.'          ],
          ['turn off',  'выключать',         'Turn off the TV.'            ],
          ['look for',  'искать',            "I'm looking for my keys."    ],
          ['give up',   'бросать / сдаться', "Don't give up!"              ],
          ['find out',  'узнать',            'I found out the truth.'      ],
          ['come back', 'возвращаться',      'Come back soon.'             ],
          ['put on',    'надевать',          'Put on your coat.'           ],
          ['take off',  'снимать / взлетать','Take off your shoes.'        ],
          ['go on',     'продолжать',        'Go on, please.'              ],
        ]}
      />,
    ],
  },
  17: {
    titleRU: 'Present Continuous',
    titleUK: 'Present Continuous',
    render: (t, isUK, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[isUK?'Форма':'Форма', isUK?'Структура':'Структура', isUK?'Приклад':'Пример']}
        rows={[
          ['+', 'am/is/are + V-ing',         "She's working now."    ],
          ['−', "am/is/are + not + V-ing",   "He isn't sleeping."    ],
          ['?', 'Am/Is/Are + subj + V-ing?', 'Are they coming?'      ],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={isUK?'Правила написання -ing':'Правила написания -ing'}
        headers={[isUK?'Правило':'Правило', isUK?'Приклад':'Пример']}
        rows={isUK ? [
          ['Більшість + ing',          'work → working, read → reading' ],
          ['На -e → прибрати e',       'come → coming, write → writing' ],
          ['CVC (коротка) → подвоїти', 'run → running, sit → sitting'   ],
          ['На -ie → ying',            'lie → lying, die → dying'       ],
        ] : [
          ['Большинство + ing',        'work → working, read → reading' ],
          ['На -e → убрать e',         'come → coming, write → writing' ],
          ['CVC (короткое) → удвоить', 'run → running, sit → sitting'   ],
          ['На -ie → ying',            'lie → lying, die → dying'       ],
        ]}
      />,
    ],
  },
  18: {
    titleRU: 'Повелительное наклонение',
    titleUK: 'Наказовий спосіб',
    render: (t, isUK, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[isUK?'Форма':'Форма', isUK?'Структура':'Структура', isUK?'Приклади':'Примеры']}
        rows={isUK ? [
          ['Наказ +',   'V (основна форма)', 'Come here! Open the door!'     ],
          ['Наказ −',   "Don't + V",         "Don't run! Don't be late!"     ],
          ["Let's",     "Let's + V",         "Let's go! Let's start."        ],
          ['Ввічливо',  'Please + V',        'Please sit down.'              ],
        ] : [
          ['Команда +', 'V (основная форма)','Come here! Open the door!'     ],
          ['Команда −', "Don't + V",         "Don't run! Don't be late!"     ],
          ["Let's",     "Let's + V",         "Let's go! Let's start."        ],
          ['Вежливо',   'Please + V',        'Please sit down.'              ],
        ]}
      />,
    ],
  },
  19: {
    titleRU: 'Предлоги места',
    titleUK: 'Прийменники місця',
    render: (t, isUK, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[isUK?'Прийменник':'Предлог', isUK?'Значення':'Значение', isUK?'Приклад':'Пример']}
        rows={isUK ? [
          ['in',          'всередині',    'The keys are in the bag.'          ],
          ['on',          'на поверхні',  'The phone is on the table.'        ],
          ['under',       'під',          'The cat is under the chair.'       ],
          ['above',       'над',          'The lamp is above the desk.'       ],
          ['next to',     'поряд з',      'She sits next to the window.'      ],
          ['between',     'між',          'The shop is between the two cafes.'],
          ['behind',      'позаду',       'He is standing behind the door.'   ],
          ['in front of', 'перед',        'The car is in front of the house.' ],
          ['opposite',    'навпроти',     'The school is opposite the park.'  ],
          ['at',          'біля / на',    "I'm at the station."               ],
        ] : [
          ['in',          'внутри',       'The keys are in the bag.'          ],
          ['on',          'на',           'The phone is on the table.'        ],
          ['under',       'под',          'The cat is under the chair.'       ],
          ['above',       'над',          'The lamp is above the desk.'       ],
          ['next to',     'рядом с',      'She sits next to the window.'      ],
          ['between',     'между',        'The shop is between the two cafes.'],
          ['behind',      'позади',       'He is standing behind the door.'   ],
          ['in front of', 'перед',        'The car is in front of the house.' ],
          ['opposite',    'напротив',     'The school is opposite the park.'  ],
          ['at',          'у / на',       "I'm at the station."               ],
        ]}
      />,
    ],
  },
  20: {
    titleRU: 'Артикли: a / an / the / —',
    titleUK: 'Артиклі: a / an / the / —',
    render: (t, isUK, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[isUK?'Артикль':'Артикль', isUK?'Коли вживати':'Когда использовать', isUK?'Приклад':'Пример']}
        rows={isUK ? [
          ['a',   'Перед приголосним звуком, вперше',    'I saw a dog.'         ],
          ['an',  'Перед голосним звуком, вперше',       'She has an umbrella.' ],
          ['the', 'Конкретний / вже відомий предмет',    'The dog was big.'     ],
          ['—',   'Власні назви, мови, спорт, їжа',      'I play tennis.'       ],
        ] : [
          ['a',   'Перед согл. звуком, впервые',         'I saw a dog.'         ],
          ['an',  'Перед гласным звуком, впервые',       'She has an umbrella.' ],
          ['the', 'Конкретный / уже известный предмет',  'The dog was big.'     ],
          ['—',   'Имена, языки, спорт, еда',            'I play tennis.'       ],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={isUK?'Без артикля':'Без артикля'}
        headers={[isUK?'Правило':'Правило', isUK?'Приклад':'Пример']}
        rows={isUK ? [
          ['Власні назви',           'London, Ukraine, Mary'        ],
          ['Мови та національності',  'English, French, Ukrainian'   ],
          ['Спорт та ігри',          'football, chess, tennis'      ],
          ['Їжа в загальному',       'I like coffee.'               ],
          ['Транспорт після by',     'by car, by bus, by train'     ],
        ] : [
          ['Имена и география',      'London, Ukraine, Mary'        ],
          ['Языки и национальности',  'English, French, Ukrainian'   ],
          ['Спорт и игры',           'football, chess, tennis'      ],
          ['Еда в общем смысле',     'I like coffee.'               ],
          ['Транспорт после by',     'by car, by bus, by train'     ],
        ]}
      />,
    ],
  },
  21: {
    titleRU: 'Неопределённые местоимения',
    titleUK: 'Неозначені займенники',
    render: (t, isUK, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[isUK?'Корінь':'Корень', isUK?'Особа':'Лицо', isUK?'Предмет':'Предмет', isUK?'Місце':'Место']}
        rows={[
          ['some-',  'somebody / someone',  'something',  'somewhere' ],
          ['any-',   'anybody / anyone',    'anything',   'anywhere'  ],
          ['no-',    'nobody / no one',     'nothing',    'nowhere'   ],
          ['every-', 'everybody / everyone','everything', 'everywhere'],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={isUK?'Коли вживати':'Когда использовать'}
        headers={[isUK?'Займенник':'Местоимение', isUK?'Вживання':'Употребление', isUK?'Приклад':'Пример']}
        rows={isUK ? [
          ['some-', 'Ствердні речення, прохання', 'Someone called you.'    ],
          ['any-',  'Питання і заперечення',      "Is anyone there?"       ],
          ['no-',   'Заперечний зміст',           'Nobody came.'           ],
          ['every-','Всі без винятку',             'Everyone was happy.'    ],
        ] : [
          ['some-', 'Утверждения, просьбы',   'Someone called you.'         ],
          ['any-',  'Вопросы и отрицания',    "Is anyone there?"            ],
          ['no-',   'Отрицательный смысл',    'Nobody came.'                ],
          ['every-','Все без исключения',      'Everyone was happy.'         ],
        ]}
      />,
    ],
  },
  22: {
    titleRU: 'Герундий (-ing)',
    titleUK: 'Герундій (-ing)',
    render: (t, isUK, f) => [
      <Table key="t1" t={t} f={f} firstBold
        label={isUK?'Після цих слів — Герундій (-ing)':'После этих слов — Герундий (-ing)'}
        headers={[isUK?'Дієслово':'Глагол', isUK?'Приклад':'Пример']}
        rows={[
          ['enjoy',   'She enjoys reading.'           ],
          ['like',    'I like swimming.'              ],
          ['love',    'He loves cooking.'             ],
          ['hate',    "She hates waiting."            ],
          ['stop',    'Stop talking!'                 ],
          ['finish',  'I finished working.'           ],
          ['mind',    "Do you mind opening the door?" ],
          ['suggest', 'He suggested going there.'     ],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={isUK?'Після цих слів — Інфінітив (to + V)':'После этих слов — Инфинитив (to + V)'}
        headers={[isUK?'Дієслово':'Глагол', isUK?'Приклад':'Пример']}
        rows={[
          ['want',   'I want to go.'      ],
          ['need',   'She needs to rest.' ],
          ['hope',   'I hope to see you.' ],
          ['plan',   'We plan to travel.' ],
          ['decide', 'He decided to stay.'],
          ['agree',  'She agreed to help.'],
        ]}
      />,
    ],
  },
  23: {
    titleRU: 'Passive Voice',
    titleUK: 'Passive Voice',
    render: (t, isUK, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[isUK?'Час':'Время', isUK?'Структура':'Структура', isUK?'Приклад':'Пример']}
        rows={[
          ['Present Simple',   'am/is/are + V3',        'English is spoken here.'    ],
          ['Past Simple',      'was/were + V3',          'The letter was written.'    ],
          ['Future Simple',    'will be + V3',           'It will be done tomorrow.'  ],
          ['Present Perfect',  'has/have + been + V3',   'It has been finished.'      ],
          ['Present Cont.',    'am/is/are + being + V3', 'It is being fixed.'         ],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={isUK?'Активний → Пасивний':'Активный → Пассивный'}
        headers={[isUK?'Активний':'Активный', isUK?'Пасивний':'Пассивный']}
        rows={[
          ['She wrote the letter.',  'The letter was written by her.' ],
          ['They built this house.', 'This house was built by them.'  ],
          ['Someone stole my phone.','My phone was stolen.'           ],
        ]}
      />,
    ],
  },
  24: {
    titleRU: 'Present Perfect',
    titleUK: 'Present Perfect',
    render: (t, isUK, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[isUK?'Форма':'Форма', isUK?'Структура':'Структура', isUK?'Приклад':'Пример']}
        rows={[
          ['+', 'have/has + V3',        'I have seen this film.'       ],
          ['−', "haven't/hasn't + V3",  "She hasn't called yet."       ],
          ['?', 'Have/Has + subj + V3?','Have you ever been to Paris?'],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={isUK?'Ключові слова':'Ключевые слова'}
        headers={[isUK?'Слово':'Слово', isUK?'Значення':'Значение', isUK?'Приклад':'Пример']}
        rows={isUK ? [
          ['ever',   'коли-небудь',   'Have you ever tried sushi?'    ],
          ['never',  'ніколи',        "I've never been to Japan."     ],
          ['already','вже',           "She's already finished."       ],
          ['yet',    'ще / вже (?)',  "Have you eaten yet?"           ],
          ['just',   'щойно',         "He's just arrived."            ],
          ['for',    'протягом',      "I've lived here for 5 years."  ],
          ['since',  'з (часу)',      "She's worked here since 2020." ],
        ] : [
          ['ever',   'когда-нибудь',  'Have you ever tried sushi?'    ],
          ['never',  'никогда',       "I've never been to Japan."     ],
          ['already','уже',           "She's already finished."       ],
          ['yet',    'ещё / уже (?)', "Have you eaten yet?"           ],
          ['just',   'только что',    "He's just arrived."            ],
          ['for',    'в течение',     "I've lived here for 5 years."  ],
          ['since',  'с (времени)',   "She's worked here since 2020." ],
        ]}
      />,
    ],
  },
  25: {
    titleRU: 'Past Continuous',
    titleUK: 'Past Continuous',
    render: (t, isUK, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[isUK?'Форма':'Форма', isUK?'Структура':'Структура', isUK?'Приклад':'Пример']}
        rows={[
          ['+', 'was/were + V-ing',         'She was working at 8pm.'       ],
          ['−', "wasn't/weren't + V-ing",   "He wasn't sleeping."           ],
          ['?', 'Was/Were + subj + V-ing?', 'Were they watching TV?'        ],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={isUK?'Коли вживати':'Когда использовать'}
        headers={[isUK?'Ситуація':'Ситуация', isUK?'Приклад':'Пример']}
        rows={isUK ? [
          ['Дія тривала в певний момент',    'At 9pm I was reading.'              ],
          ['Дія перервалась (when)',          'I was reading when she called.'     ],
          ['Дві паралельні дії (while)',      'While he cooked, she was cleaning.' ],
        ] : [
          ['Действие длилось в момент',      'At 9pm I was reading.'              ],
          ['Действие прервалось (when)',      'I was reading when she called.'     ],
          ['Два параллельных действия',       'While he cooked, she was cleaning.' ],
        ]}
      />,
    ],
  },
  26: {
    titleRU: 'Условные предложения',
    titleUK: 'Умовні речення',
    render: (t, isUK, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[isUK?'Тип':'Тип', isUK?'If-частина':'If-часть', isUK?'Результат':'Результат', isUK?'Приклад':'Пример']}
        rows={isUK ? [
          ['0 (факт)',       'Present Simple', 'Present Simple', 'If you heat water, it boils.'            ],
          ['1 (реальне)',    'Present Simple', 'will + V',       'If it rains, I will stay home.'          ],
          ['2 (нереальне)',  'Past Simple',    'would + V',      "If I had money, I'd travel."             ],
          ['3 (минуле)',     'Past Perfect',   'would have + V3','If she had studied, she would have passed.'],
        ] : [
          ['0 (факт)',       'Present Simple', 'Present Simple', 'If you heat water, it boils.'            ],
          ['1 (реальное)',   'Present Simple', 'will + V',       'If it rains, I will stay home.'          ],
          ['2 (нереальное)', 'Past Simple',    'would + V',      "If I had money, I'd travel."             ],
          ['3 (прошлое)',    'Past Perfect',   'would have + V3','If she had studied, she would have passed.'],
        ]}
      />,
    ],
  },
  27: {
    titleRU: 'Косвенная речь',
    titleUK: 'Непряма мова',
    render: (t, isUK, f) => [
      <Table key="t1" t={t} f={f} firstBold
        label={isUK?'Зміщення часів':'Сдвиг времён'}
        headers={[isUK?'Пряма мова':'Прямая речь', isUK?'Непряма мова':'Косвенная речь']}
        rows={[
          ['Present Simple',     '→  Past Simple'    ],
          ['Present Continuous', '→  Past Continuous'],
          ['Past Simple',        '→  Past Perfect'   ],
          ['will',               '→  would'          ],
          ['can',                '→  could'          ],
          ['am / is / are',      '→  was / were'     ],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={isUK?'Приклади':'Примеры'}
        headers={[isUK?'Пряма':'Прямая', isUK?'Непряма':'Косвенная']}
        rows={[
          ['"I am tired."',       'He said he was tired.'         ],
          ['"I will call you."',  'She said she would call me.'   ],
          ['"I can swim."',       'He said he could swim.'        ],
          ['"Do you work here?"', 'She asked if I worked there.'  ],
        ]}
      />,
    ],
  },
  28: {
    titleRU: 'Возвратные местоимения',
    titleUK: 'Зворотні займенники',
    render: (t, isUK, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[isUK?'Підмет':'Подлежащее', isUK?'Зворотне':'Возвратное', isUK?'Приклад':'Пример']}
        rows={[
          ['I',    'myself',     'I hurt myself.'            ],
          ['You',  'yourself',   'Did you enjoy yourself?'   ],
          ['He',   'himself',    'He introduced himself.'    ],
          ['She',  'herself',    'She did it herself.'       ],
          ['It',   'itself',     'The door opened by itself.'],
          ['We',   'ourselves',  'We cooked it ourselves.'   ],
          ['You',  'yourselves', 'Help yourselves!'          ],
          ['They', 'themselves', 'They built it themselves.' ],
        ]}
      />,
    ],
  },
  29: {
    titleRU: 'Used to',
    titleUK: 'Used to',
    render: (t, isUK, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[isUK?'Форма':'Форма', isUK?'Структура':'Структура', isUK?'Приклад':'Пример']}
        rows={[
          ['+', 'used to + V',        'I used to play football.'          ],
          ['−', "didn't use to + V",  "She didn't use to drink coffee."   ],
          ['?', 'Did ... use to + V?','Did you use to live here?'         ],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={isUK?'Порівняння конструкцій':'Сравнение конструкций'}
        headers={[isUK?'Конструкція':'Конструкция', isUK?'Значення':'Значение', isUK?'Приклад':'Пример']}
        rows={isUK ? [
          ['used to + V',      'Звичка в минулому',    'I used to smoke.'            ],
          ['be used to + -ing','Звичний до чогось',    "I'm used to waking up early."],
          ['get used to + -ing','Звикати до чогось',   "I'm getting used to the cold."],
        ] : [
          ['used to + V',      'Привычка в прошлом',   'I used to smoke.'            ],
          ['be used to + -ing','Привыкший к чему-то',  "I'm used to waking up early."],
          ['get used to + -ing','Привыкать к чему-то', "I'm getting used to the cold."],
        ]}
      />,
    ],
  },
  30: {
    titleRU: 'Relative Clauses',
    titleUK: 'Relative Clauses',
    render: (t, isUK, f) => [
      <Table key="t1" t={t} f={f} firstBold
        headers={[isUK?'Слово':'Слово', isUK?'Для чого':'Для чего', isUK?'Приклад':'Пример']}
        rows={isUK ? [
          ['who',   'людей',                 'The man who called is my friend.'  ],
          ['which', 'предметів і тварин',    'The book which I read was great.'  ],
          ['that',  'людей або предметів',   'The car that she drives is red.'   ],
          ['whose', 'присвійне',             'The girl whose bag was stolen...'  ],
          ['where', 'місця',                 'The city where I was born.'        ],
          ['when',  'часу',                  'The day when we met.'              ],
        ] : [
          ['who',   'людей',                 'The man who called is my friend.'  ],
          ['which', 'предметов и животных',  'The book which I read was great.'  ],
          ['that',  'людей или предметов',   'The car that she drives is red.'   ],
          ['whose', 'притяжательное',        'The girl whose bag was stolen...'  ],
          ['where', 'места',                 'The city where I was born.'        ],
          ['when',  'времени',               'The day when we met.'              ],
        ]}
      />,
    ],
  },
  31: {
    titleRU: 'Complex Object',
    titleUK: 'Complex Object',
    render: (t, isUK, f) => [
      <Table key="t1" t={t} f={f} firstBold
        label={isUK?'Дієслово + об\'єкт + to + V':'Глагол + объект + to + V'}
        headers={[isUK?'Дієслово':'Глагол', isUK?'Приклад':'Пример']}
        rows={[
          ['want',   'I want you to stay.'         ],
          ['expect', 'She expects him to call.'    ],
          ['ask',    'I asked her to help me.'     ],
          ['tell',   'He told me to stop.'         ],
          ['allow',  'She allowed me to go.'       ],
          ['need',   'I need you to understand.'   ],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={isUK?'Дієслово + об\'єкт + V (без to)':'Глагол + объект + V (без to)'}
        headers={[isUK?'Дієслово':'Глагол', isUK?'Приклад':'Пример']}
        rows={[
          ['make',  'She made me laugh.'           ],
          ['let',   'Let him speak.'               ],
          ['hear',  'I heard him sing.'            ],
          ['see',   'I saw him running.'           ],
          ['watch', 'She watched them play.'       ],
        ]}
      />,
    ],
  },
  32: {
    titleRU: 'Повторение всех тем',
    titleUK: 'Повторення всіх тем',
    render: (t, isUK, f) => [
      <Table key="t1" t={t} f={f} firstBold
        label={isUK?'Часи — огляд':'Времена — обзор'}
        headers={[isUK?'Час':'Время', isUK?'Приклад':'Пример', isUK?'Ключові слова':'Ключевые слова']}
        rows={[
          ['Present Simple',     'She works.',       'always, every day'      ],
          ['Present Continuous', "She's working.",   'now, at the moment'     ],
          ['Past Simple',        'She worked.',      'yesterday, ago, last'   ],
          ['Past Continuous',    'She was working.', 'at 8pm, when, while'    ],
          ['Present Perfect',    "She's worked.",    'ever, never, already'   ],
          ['Future Simple',      'She will work.',   'tomorrow, next week'    ],
        ]}
      />,
      <Table key="t2" t={t} f={f} firstBold
        label={isUK?'Важливі конструкції':'Важные конструкции'}
        headers={[isUK?'Конструкція':'Конструкция', isUK?'Приклад':'Пример']}
        rows={[
          ['can / could',          'I can swim. She could drive.'   ],
          ['must / have to',       'I must go. You have to work.'   ],
          ['should',               'You should rest.'               ],
          ['was/were + V3',        'It was built in 1990.'          ],
          ['If + PS → will',       'If it rains, I will stay.'      ],
          ['used to + V',          'I used to play tennis.'         ],
          ['have/has + V3',        "She's already finished."        ],
          ['want you to + V',      'I want you to stay.'            ],
        ]}
      />,
    ],
  },
};

export default function HintScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme: t , f } = useTheme();
  const { lang } = useLang();
  const isUK = lang === 'uk';
  const lessonId = parseInt(id || '1', 10);
  const hint = HINTS[lessonId] || HINTS[1];

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex: 1 }}>
      <ContentWrap>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.textMuted, fontSize: f.label, textTransform: 'uppercase', letterSpacing: 0.7 }}>
            {isUK ? `Урок ${lessonId} · Шпаргалка` : `Урок ${lessonId} · Шпаргалка`}
          </Text>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700' }}>
            {isUK ? hint.titleUK : hint.titleRU}
          </Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {hint.render(t, isUK, f)}
        <TouchableOpacity
          style={{ backgroundColor: t.bgSurface, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '600' }}>
            {isUK ? 'Закрити' : 'Закрыть'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
      </ContentWrap>
    </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  cell: { paddingVertical: 9, paddingHorizontal: 8, justifyContent: 'center' },
});
