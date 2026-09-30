import { ACHIEVEMENT_COPY_RU_V2 } from './achievement_copy_ru_v2';

export type AchievementCategory = 'streak' | 'lessons' | 'combo' | 'special' | 'medal';
export type FoundationAchievementGroup =
  | 'streak'
  | 'shards'
  | 'time'
  | 'access'
  | 'legend'
  | 'retired';

export interface AchievementDefinitionV2 {
  id: string;
  icon: string;
  category: AchievementCategory;
  foundationGroup: FoundationAchievementGroup;
  nameRu: string;
  nameUk: string;
  nameEs?: string;
  conditionRu: string;
  conditionUk: string;
  conditionEs?: string;
  descRu: string;
  descUk: string;
  descEs?: string;
  secret?: boolean;
  retired?: boolean;
}

type ActiveDefinitionInput = Omit<
  AchievementDefinitionV2,
  'nameUk' | 'conditionRu' | 'conditionUk' | 'descUk'
>;

// RU is the approved canonical copy. Other locale files can override these fields;
// until then the existing localization fallback shows the canonical wording instead
// of a technical placeholder.
const active = (row: ActiveDefinitionInput): AchievementDefinitionV2 => {
  const approvedCopy = ACHIEVEMENT_COPY_RU_V2[row.id];
  if (!approvedCopy) throw new Error(`achievement_copy_ru_v2_missing:${row.id}`);
  return {
    ...row,
    nameRu: approvedCopy.title,
    nameUk: approvedCopy.title,
    conditionRu: approvedCopy.condition,
    conditionUk: approvedCopy.condition,
    descRu: approvedCopy.description,
    descUk: approvedCopy.description,
  };
};

const retired = (
  id: string,
  icon: string,
  nameRu: string,
): AchievementDefinitionV2 => ({
  id,
  icon,
  category: 'combo',
  foundationGroup: 'retired',
  nameRu,
  nameUk: nameRu,
  conditionRu: 'Больше не выдаётся.',
  conditionUk: 'Більше не видається.',
  descRu: 'Историческая награда удалённого раздела.',
  descUk: 'Історична нагорода видаленого розділу.',
  secret: true,
  retired: true,
});

export const ACHIEVEMENT_CATALOG_V2: readonly AchievementDefinitionV2[] = [
  // Серия — 14
  active({ id:'streak_3', icon:'🔥', category:'streak', foundationGroup:'streak', nameRu:'Разогрев пошёл', descRu:'Три активных дня подряд. Лень пока делает вид, что это случайность.' }),
  active({ id:'streak_7', icon:'🥇', category:'streak', foundationGroup:'streak', nameRu:'Неделя без переговоров', descRu:'Семь дней подряд. С ленью диалог не сложился — и прекрасно.' }),
  active({ id:'streak_14', icon:'🥈', category:'streak', foundationGroup:'streak', nameRu:'Лень взяла больничный', descRu:'Две недели занятий подряд. Похоже, она надолго.' }),
  active({ id:'streak_30', icon:'📅', category:'streak', foundationGroup:'streak', nameRu:'Случайностью уже не пахнет', descRu:'Месяц подряд. Это официально привычка, а не удачная неделя.' }),
  active({ id:'streak_60', icon:'📆', category:'streak', foundationGroup:'streak', nameRu:'Два месяца на характере', descRu:'Шестьдесят дней. Мотивация могла уйти, характер остался.' }),
  active({ id:'streak_100', icon:'💯', category:'streak', foundationGroup:'streak', nameRu:'Трёхзначная привычка', descRu:'Сто дней подряд. У серии теперь больше цифр, чем оправданий.' }),
  active({ id:'streak_150', icon:'🔥', category:'streak', foundationGroup:'streak', nameRu:'Серьёзные отношения', descRu:'Сто пятьдесят дней вместе. Пора знакомить серию с родителями.' }),
  active({ id:'streak_200', icon:'⭐', category:'streak', foundationGroup:'streak', nameRu:'Уже поздно останавливаться', descRu:'Двести дней подряд. Назад далеко, вперёд интереснее.' }),
  active({ id:'streak_250', icon:'🏔️', category:'streak', foundationGroup:'streak', nameRu:'Четверть тысячи без отмазок', descRu:'Двести пятьдесят дней. Календарь устал раньше тебя.' }),
  active({ id:'streak_365', icon:'🎉', category:'streak', foundationGroup:'streak', nameRu:'Годовой абонемент к себе', descRu:'Полный год занятий каждый день. Продление произошло автоматически.' }),
  active({ id:'streak_500', icon:'👑', category:'streak', foundationGroup:'streak', nameRu:'Полтысячи. Кто тебя остановит', descRu:'Пятьсот дней подряд. Вопрос уже чисто теоретический.' }),
  active({ id:'streak_750', icon:'🗿', category:'streak', foundationGroup:'streak', nameRu:'Монумент дисциплине', descRu:'Семьсот пятьдесят дней. Где-то уже проектируют постамент.' }),
  active({ id:'streak_1000', icon:'👑', category:'streak', foundationGroup:'streak', nameRu:'Тысяча дней, ноль объяснений', descRu:'Четыре цифры серии. Комментарии закончились примерно на семисотом.' }),
  active({ id:'streak_clean_365', icon:'🛡️', category:'streak', foundationGroup:'streak', nameRu:'Без страховочного троса', descRu:'Год без починки и заморозки. Красиво, сложно и слегка подозрительно.' }),

  // Исторический максимум баланса — 7
  active({ id:'shards_100', icon:'◉', category:'special', foundationGroup:'shards', nameRu:'Перламутровая заначка', descRu:'Сто жемчужин на балансе. Маленькая подушка финансовой важности.' }),
  active({ id:'shards_250', icon:'◉', category:'special', foundationGroup:'shards', nameRu:'Карман подозрительно звенит', descRu:'Двести пятьдесят. Идти стало тяжелее, но приятнее.' }),
  active({ id:'shards_500', icon:'◉', category:'special', foundationGroup:'shards', nameRu:'Жемчужный хомяк', descRu:'Пятьсот жемчужин. Щёки не проверяли, но всё понятно.' }),
  active({ id:'shards_1000', icon:'◉', category:'special', foundationGroup:'shards', nameRu:'Тысяча и ни одной ракушки', descRu:'Четыре цифры жемчужин. Море официально завидует.' }),
  active({ id:'shards_2500', icon:'◉', category:'special', foundationGroup:'shards', nameRu:'Сундук перестал закрываться', descRu:'Две с половиной тысячи. Крышка держится на честном слове.' }),
  active({ id:'shards_5000', icon:'◉', category:'special', foundationGroup:'shards', nameRu:'Личный жемчужный фонд', descRu:'Пять тысяч. Можно выпускать квартальный отчёт.' }),
  active({ id:'shards_10000', icon:'◉', category:'special', foundationGroup:'shards', nameRu:'Центробанк нервничает', descRu:'Десять тысяч жемчужин. Экономисты просят ничего резко не покупать.' }),

  // Foreground-время — 6
  active({ id:'time_foreground_10h', icon:'⏱', category:'special', foundationGroup:'time', nameRu:'Десять часов куда-то делись', descRu:'Мы нашли их здесь. Выглядели занятыми.' }),
  active({ id:'time_foreground_50h', icon:'⏱', category:'special', foundationGroup:'time', nameRu:'Рабочая неделя, но полезная', descRu:'Пятьдесят часов в приложении. Начальник не звонил.' }),
  active({ id:'time_foreground_100h', icon:'⏱', category:'special', foundationGroup:'time', nameRu:'Трёхзначное время', descRu:'Сто часов. Таймер теперь обращается к тебе на «вы».' }),
  active({ id:'time_foreground_250h', icon:'⏱', category:'special', foundationGroup:'time', nameRu:'Четверть тысячи на связи', descRu:'Двести пятьдесят часов. Экран знает тебя слишком хорошо.' }),
  active({ id:'time_foreground_500h', icon:'⏱', category:'special', foundationGroup:'time', nameRu:'Полтысячи часов спустя', descRu:'Пятьсот часов. В заставке можно ставить твоё имя.' }),
  active({ id:'time_foreground_1000h', icon:'⏱', category:'special', foundationGroup:'time', nameRu:'Ты жил здесь, но аренду не платил', descRu:'Тысяча часов в foreground. Ключи от приложения уже твои.' }),

  // Подтверждённые покупки — 2
  active({ id:'access_plus_paid', icon:'🔑', category:'special', foundationGroup:'access', nameRu:'Ключи от второго этажа', descRu:'Plus куплен честно. Лифт работает, лестница тоже была вариантом.' }),
  active({ id:'access_pro_paid', icon:'🔐', category:'special', foundationGroup:'access', nameRu:'Купил и забыл про продление', descRu:'Pro навсегда. Календарь подписок может спокойно выдохнуть.' }),

  // Составные легенды.
  active({ id:'legend_second_wind', icon:'🪽', category:'combo', foundationGroup:'legend', secret:true, nameRu:'Меня рано списали', descRu:'Вернулся после долгой паузы и сразу набрал ход. Камбэк без пресс-конференции.' }),
  active({ id:'legend_patient_capital', icon:'⚖', category:'combo', foundationGroup:'legend', secret:true, nameRu:'Жемчужины пережили искушение', descRu:'Баланс огромный, палец спокойный. Финансовая дисциплина обнаружена.' }),
  active({ id:'legend_founder_era', icon:'🏺', category:'combo', foundationGroup:'legend', secret:true, nameRu:'Ты помнишь старую иконку', descRu:'Три года истории и пятьсот активных дней. Археологи уже едут.' }),

  // Девять исторических наград удалённого Daily Tasks. Новым пользователям не создаются.
  retired('daily_task_first', '📋', 'Первое задание'),
  retired('all_daily', '✅', 'Всё за день'),
  retired('daily_all_3', '📌', 'Три дня порядка'),
  retired('daily_all_7', '📌', 'Неделя порядка'),
  retired('daily_no_reroll', '🎯', 'Без замены'),
  retired('daily_all_14', '📌', 'Две недели порядка'),
  retired('daily_all_30', '🗓️', '30 дней без хвостов'),
  retired('daily_no_reroll_7', '🎯', 'Неделя без замен'),
  retired('daily_no_reroll_30', '🏆', 'Без торга'),
] as const;

export const ACTIVE_FOUNDATION_IDS = ACHIEVEMENT_CATALOG_V2
  .filter((row) => !row.retired)
  .map((row) => row.id);

export const SECRET_FOUNDATION_IDS = ACHIEVEMENT_CATALOG_V2
  .filter((row) => !row.retired && row.secret)
  .map((row) => row.id);
