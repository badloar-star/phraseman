import { ACHIEVEMENT_COPY_RU_V2 } from './achievement_copy_ru_v2';

export type AchievementCategory = 'streak' | 'lessons' | 'xp' | 'combo' | 'special' | 'medal';
export type FoundationAchievementGroup =
  | 'streak'
  | 'xp'
  | 'shards'
  | 'league'
  | 'leagueLegend'
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
  xp: number;
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
  xp: number,
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
  xp,
  secret: true,
  retired: true,
});

export const ACHIEVEMENT_CATALOG_V2: readonly AchievementDefinitionV2[] = [
  // Серия — 14
  active({ id:'streak_3', icon:'🔥', category:'streak', foundationGroup:'streak', xp:30, nameRu:'Разогрев пошёл', descRu:'Три дня подряд с XP. Лень пока делает вид, что это случайность.' }),
  active({ id:'streak_7', icon:'🥇', category:'streak', foundationGroup:'streak', xp:75, nameRu:'Неделя без переговоров', descRu:'Семь дней подряд. С ленью диалог не сложился — и прекрасно.' }),
  active({ id:'streak_14', icon:'🥈', category:'streak', foundationGroup:'streak', xp:120, nameRu:'Лень взяла больничный', descRu:'Две недели с XP каждый день. Похоже, она надолго.' }),
  active({ id:'streak_30', icon:'📅', category:'streak', foundationGroup:'streak', xp:200, nameRu:'Случайностью уже не пахнет', descRu:'Месяц подряд. Это официально привычка, а не удачная неделя.' }),
  active({ id:'streak_60', icon:'📆', category:'streak', foundationGroup:'streak', xp:350, nameRu:'Два месяца на характере', descRu:'Шестьдесят дней. Мотивация могла уйти, характер остался.' }),
  active({ id:'streak_100', icon:'💯', category:'streak', foundationGroup:'streak', xp:500, nameRu:'Трёхзначная привычка', descRu:'Сто дней подряд. У серии теперь больше цифр, чем оправданий.' }),
  active({ id:'streak_150', icon:'🔥', category:'streak', foundationGroup:'streak', xp:650, nameRu:'Серьёзные отношения', descRu:'Сто пятьдесят дней вместе. Пора знакомить серию с родителями.' }),
  active({ id:'streak_200', icon:'⭐', category:'streak', foundationGroup:'streak', xp:750, nameRu:'Уже поздно останавливаться', descRu:'Двести дней подряд. Назад далеко, вперёд интереснее.' }),
  active({ id:'streak_250', icon:'🏔️', category:'streak', foundationGroup:'streak', xp:900, nameRu:'Четверть тысячи без отмазок', descRu:'Двести пятьдесят дней. Календарь устал раньше тебя.' }),
  active({ id:'streak_365', icon:'🎉', category:'streak', foundationGroup:'streak', xp:1200, nameRu:'Годовой абонемент к себе', descRu:'Полный год с XP каждый день. Продление произошло автоматически.' }),
  active({ id:'streak_500', icon:'👑', category:'streak', foundationGroup:'streak', xp:2000, nameRu:'Полтысячи. Кто тебя остановит', descRu:'Пятьсот дней подряд. Вопрос уже чисто теоретический.' }),
  active({ id:'streak_750', icon:'🗿', category:'streak', foundationGroup:'streak', xp:3000, nameRu:'Монумент дисциплине', descRu:'Семьсот пятьдесят дней. Где-то уже проектируют постамент.' }),
  active({ id:'streak_1000', icon:'👑', category:'streak', foundationGroup:'streak', xp:5000, nameRu:'Тысяча дней, ноль объяснений', descRu:'Четыре цифры серии. Комментарии закончились примерно на семисотом.' }),
  active({ id:'streak_clean_365', icon:'🛡️', category:'streak', foundationGroup:'streak', xp:1800, nameRu:'Без страховочного троса', descRu:'Год без починки и заморозки. Красиво, сложно и слегка подозрительно.' }),

  // Цепочка опыта — 17
  active({ id:'xp_100', icon:'⚡', category:'xp', foundationGroup:'xp', xp:20, nameRu:'Искра пошла', descRu:'Первая сотня XP. Двигатель завёлся, соседи пока не жалуются.' }),
  active({ id:'xp_250', icon:'✨', category:'xp', foundationGroup:'xp', xp:30, nameRu:'Первые обороты', descRu:'Двести пятьдесят XP. Уже не старт, но ещё можно притвориться новичком.' }),
  active({ id:'xp_500', icon:'💫', category:'xp', foundationGroup:'xp', xp:50, nameRu:'Разогнался незаметно', descRu:'Пятьсот XP. Педаль опыта явно кто-то прижал.' }),
  active({ id:'xp_1000', icon:'⭐', category:'xp', foundationGroup:'xp', xp:75, nameRu:'Первая тысяча без кредита', descRu:'Тысяча XP полностью твоя. Банк тут ни при чём.' }),
  active({ id:'xp_2500', icon:'🌟', category:'xp', foundationGroup:'xp', xp:100, nameRu:'Опыт имеет вес', descRu:'Две с половиной тысячи. Полка пока держится.' }),
  active({ id:'xp_5000', icon:'💎', category:'xp', foundationGroup:'xp', xp:150, nameRu:'Пять тысяч причин', descRu:'Пять тысяч XP и ни одной убедительной причины бросать.' }),
  active({ id:'xp_10000', icon:'🏅', category:'xp', foundationGroup:'xp', xp:200, nameRu:'Пятизначный человек', descRu:'XP перешёл на пять цифр. Звучит почти как должность.' }),
  active({ id:'xp_20000', icon:'🎖️', category:'xp', foundationGroup:'xp', xp:300, nameRu:'Опытный экземпляр', descRu:'Двадцать тысяч XP. Редкий, устойчивый, домашний.' }),
  active({ id:'xp_50000', icon:'🏆', category:'xp', foundationGroup:'xp', xp:500, nameRu:'Пятьдесят оттенков упорства', descRu:'Пятьдесят тысяч XP. Все оттенки — рабочие.' }),
  active({ id:'xp_75000', icon:'🚀', category:'xp', foundationGroup:'xp', xp:700, nameRu:'До сотки без навигатора', descRu:'Семьдесят пять тысяч. Поворот назад давно пропущен.' }),
  active({ id:'xp_100000', icon:'👑', category:'xp', foundationGroup:'xp', xp:1000, nameRu:'Шесть цифр, мама', descRu:'Сто тысяч XP. Теперь это можно произносить с паузой.' }),
  active({ id:'xp_150000', icon:'⚡', category:'xp', foundationGroup:'xp', xp:1200, nameRu:'Опыт пошёл оптом', descRu:'Сто пятьдесят тысяч. Розничные масштабы закончились.' }),
  active({ id:'xp_250000', icon:'🚀', category:'xp', foundationGroup:'xp', xp:1800, nameRu:'Четверть миллиона без чит-кода', descRu:'Двести пятьдесят тысяч XP. Только время, характер и подозрительно крепкий палец.' }),
  active({ id:'xp_500000', icon:'💎', category:'xp', foundationGroup:'xp', xp:3000, nameRu:'Полмиллиона в голове', descRu:'Полмиллиона XP. Голова держится молодцом.' }),
  active({ id:'xp_750000', icon:'🏆', category:'xp', foundationGroup:'xp', xp:4200, nameRu:'Миллион уже нервничает', descRu:'Три четверти миллиона. Следующий ноль начал собирать вещи.' }),
  active({ id:'xp_1000000', icon:'👑', category:'xp', foundationGroup:'xp', xp:6000, nameRu:'Миллионер без яхты', descRu:'Миллион XP. Яхты нет, зато есть очень убедительная статистика.' }),
  active({ id:'xp_2000000', icon:'♾️', category:'xp', foundationGroup:'xp', xp:9000, nameRu:'Калькулятор сдался', descRu:'Два миллиона XP. Дальше считаем уважением.' }),

  // Исторический максимум баланса — 7
  active({ id:'shards_100', icon:'◉', category:'special', foundationGroup:'shards', xp:100, nameRu:'Перламутровая заначка', descRu:'Сто жемчужин на балансе. Маленькая подушка финансовой важности.' }),
  active({ id:'shards_250', icon:'◉', category:'special', foundationGroup:'shards', xp:180, nameRu:'Карман подозрительно звенит', descRu:'Двести пятьдесят. Идти стало тяжелее, но приятнее.' }),
  active({ id:'shards_500', icon:'◉', category:'special', foundationGroup:'shards', xp:300, nameRu:'Жемчужный хомяк', descRu:'Пятьсот жемчужин. Щёки не проверяли, но всё понятно.' }),
  active({ id:'shards_1000', icon:'◉', category:'special', foundationGroup:'shards', xp:500, nameRu:'Тысяча и ни одной ракушки', descRu:'Четыре цифры жемчужин. Море официально завидует.' }),
  active({ id:'shards_2500', icon:'◉', category:'special', foundationGroup:'shards', xp:800, nameRu:'Сундук перестал закрываться', descRu:'Две с половиной тысячи. Крышка держится на честном слове.' }),
  active({ id:'shards_5000', icon:'◉', category:'special', foundationGroup:'shards', xp:1200, nameRu:'Личный жемчужный фонд', descRu:'Пять тысяч. Можно выпускать квартальный отчёт.' }),
  active({ id:'shards_10000', icon:'◉', category:'special', foundationGroup:'shards', xp:2000, nameRu:'Центробанк нервничает', descRu:'Десять тысяч жемчужин. Экономисты просят ничего резко не покупать.' }),

  // Лиги — 12
  active({ id:'league_reached_copper', icon:'🏅', category:'special', foundationGroup:'league', xp:80, nameRu:'Медь не окислилась', descRu:'Первая настоящая неделя с очками. Медь блестит, пользователь тоже.' }),
  active({ id:'league_reached_bronze', icon:'🏅', category:'special', foundationGroup:'league', xp:120, nameRu:'Бронза без загара', descRu:'Бронза получена честно. Солнце для этого не понадобилось.' }),
  active({ id:'league_reached_silver', icon:'🏅', category:'special', foundationGroup:'league', xp:180, nameRu:'Серебро без ложки', descRu:'Серебряная лига. Ложку не дали, пришлось брать место целиком.' }),
  active({ id:'league_reached_gold', icon:'🏅', category:'special', foundationGroup:'league', xp:260, nameRu:'Золото, но без зубов', descRu:'Золотая лига. Улыбаться можно своими.' }),
  active({ id:'league_reached_platinum', icon:'🏅', category:'special', foundationGroup:'league', xp:360, nameRu:'Платина принимает', descRu:'Платиновая лига приняла заявку. Собеседование явно прошло удачно.' }),
  active({ id:'league_reached_emerald', icon:'🏅', category:'special', foundationGroup:'league', xp:480, nameRu:'Зелёный свет элите', descRu:'Изумрудная лига. Свет зелёный, путь подозрительно дорогой.' }),
  active({ id:'league_reached_sapphire', icon:'🏅', category:'special', foundationGroup:'league', xp:620, nameRu:'Синий период', descRu:'Сапфировая лига. Пикассо бы понял, конкуренты — не сразу.' }),
  active({ id:'league_reached_ruby', icon:'🏅', category:'special', foundationGroup:'league', xp:780, nameRu:'Красный диплом без диплома', descRu:'Рубиновая лига. Красное есть, диплом оформим позже.' }),
  active({ id:'league_reached_diamond', icon:'🏅', category:'special', foundationGroup:'league', xp:1000, nameRu:'Давление выдержано', descRu:'Алмазная лига. Давление было настоящим, огранка тоже.' }),
  active({ id:'league_reached_black_diamond', icon:'🏅', category:'special', foundationGroup:'league', xp:1300, nameRu:'Темнее только дедлайн', descRu:'Лига Чёрного Алмаза. Редко, дорого и слегка пугает соседей.' }),
  active({ id:'league_reached_ether', icon:'🏅', category:'special', foundationGroup:'league', xp:1700, nameRu:'Физика вышла из чата', descRu:'Эфирная лига. Законы природы попросили не вмешивать их в это.' }),
  active({ id:'league_reached_supreme', icon:'🏅', category:'special', foundationGroup:'league', xp:2200, nameRu:'Потолок оказался полом', descRu:'Высшая лига. Оказалось, потолок был просто следующим этажом.' }),

  // Лиговые легенды — 4
  active({ id:'league_champion', icon:'👑', category:'special', foundationGroup:'leagueLegend', xp:250, nameRu:'Стул номер один', descRu:'Первое место занято. Табличку с именем уже прикручивают.' }),
  active({ id:'league_champion_5', icon:'👑', category:'special', foundationGroup:'leagueLegend', xp:850, nameRu:'Абонемент на первое место', descRu:'Пять побед. Кажется, этот стул теперь твой.' }),
  active({ id:'league_champion_10', icon:'🏆', category:'special', foundationGroup:'leagueLegend', xp:1600, nameRu:'Опять ты?', descRu:'Десять первых мест. Лига делает удивлённое лицо по привычке.' }),
  active({ id:'league_diamond_4_weeks', icon:'◆', category:'special', foundationGroup:'leagueLegend', xp:1000, nameRu:'Давление прописано врачом', descRu:'Месяц в Алмазе или выше. Организм адаптировался к давлению.' }),

  // Foreground-время — 6
  active({ id:'time_foreground_10h', icon:'⏱', category:'special', foundationGroup:'time', xp:100, nameRu:'Десять часов куда-то делись', descRu:'Мы нашли их здесь. Выглядели занятыми.' }),
  active({ id:'time_foreground_50h', icon:'⏱', category:'special', foundationGroup:'time', xp:300, nameRu:'Рабочая неделя, но полезная', descRu:'Пятьдесят часов в приложении. Начальник не звонил.' }),
  active({ id:'time_foreground_100h', icon:'⏱', category:'special', foundationGroup:'time', xp:500, nameRu:'Трёхзначное время', descRu:'Сто часов. Таймер теперь обращается к тебе на «вы».' }),
  active({ id:'time_foreground_250h', icon:'⏱', category:'special', foundationGroup:'time', xp:900, nameRu:'Четверть тысячи на связи', descRu:'Двести пятьдесят часов. Экран знает тебя слишком хорошо.' }),
  active({ id:'time_foreground_500h', icon:'⏱', category:'special', foundationGroup:'time', xp:1500, nameRu:'Полтысячи часов спустя', descRu:'Пятьсот часов. В заставке можно ставить твоё имя.' }),
  active({ id:'time_foreground_1000h', icon:'⏱', category:'special', foundationGroup:'time', xp:2500, nameRu:'Ты жил здесь, но аренду не платил', descRu:'Тысяча часов в foreground. Ключи от приложения уже твои.' }),

  // Подтверждённые покупки — 2
  active({ id:'access_plus_paid', icon:'🔑', category:'special', foundationGroup:'access', xp:300, nameRu:'Ключи от второго этажа', descRu:'Plus куплен честно. Лифт работает, лестница тоже была вариантом.' }),
  active({ id:'access_pro_paid', icon:'🔐', category:'special', foundationGroup:'access', xp:800, nameRu:'Купил и забыл про продление', descRu:'Pro навсегда. Календарь подписок может спокойно выдохнуть.' }),

  // Составные легенды — 8; только они скрыты.
  active({ id:'legend_second_wind', icon:'🪽', category:'combo', foundationGroup:'legend', xp:1000, secret:true, nameRu:'Меня рано списали', descRu:'Вернулся после долгой паузы и сразу набрал ход. Камбэк без пресс-конференции.' }),
  active({ id:'legend_long_game', icon:'♟', category:'combo', foundationGroup:'legend', xp:1800, secret:true, nameRu:'Не быстро, зато навсегда', descRu:'Год активных дней и шесть цифр XP. Спринтеры уже ушли домой.' }),
  active({ id:'legend_every_league', icon:'🛂', category:'combo', foundationGroup:'legend', xp:2200, secret:true, nameRu:'Пропуск везде', descRu:'Все лиги отмечены. Охрана больше даже не спрашивает документы.' }),
  active({ id:'legend_supreme_champion', icon:'🏛', category:'combo', foundationGroup:'legend', xp:3000, secret:true, nameRu:'Хозяин потолка', descRu:'Первое место там, где выше уже некуда. Потолок оформлен в собственность.' }),
  active({ id:'legend_full_cabinet', icon:'🗄', category:'combo', foundationGroup:'legend', xp:1500, secret:true, nameRu:'Полка попросила отпуск', descRu:'Пятьдесят артефактов. Мебель официально работает сверхурочно.' }),
  active({ id:'legend_one_more_zero', icon:'∞', category:'combo', foundationGroup:'legend', xp:4000, secret:true, nameRu:'Нули закончились', descRu:'Тысяча дней и миллион XP. Следующий ноль ушёл прятаться.' }),
  active({ id:'legend_patient_capital', icon:'⚖', category:'combo', foundationGroup:'legend', xp:2500, secret:true, nameRu:'Жемчужины пережили искушение', descRu:'Баланс огромный, палец спокойный. Финансовая дисциплина обнаружена.' }),
  active({ id:'legend_founder_era', icon:'🏺', category:'combo', foundationGroup:'legend', xp:5000, secret:true, nameRu:'Ты помнишь старую иконку', descRu:'Три года истории и пятьсот активных дней. Археологи уже едут.' }),

  // Девять исторических наград удалённого Daily Tasks. Новым пользователям не создаются.
  retired('daily_task_first', '📋', 'Первое задание', 30),
  retired('all_daily', '✅', 'Всё за день', 100),
  retired('daily_all_3', '📌', 'Три дня порядка', 140),
  retired('daily_all_7', '📌', 'Неделя порядка', 300),
  retired('daily_no_reroll', '🎯', 'Без замены', 120),
  retired('daily_all_14', '📌', 'Две недели порядка', 600),
  retired('daily_all_30', '🗓️', '30 дней без хвостов', 1200),
  retired('daily_no_reroll_7', '🎯', 'Неделя без замен', 450),
  retired('daily_no_reroll_30', '🏆', 'Без торга', 1400),
] as const;

export const ACTIVE_FOUNDATION_IDS = ACHIEVEMENT_CATALOG_V2
  .filter((row) => !row.retired)
  .map((row) => row.id);

export const SECRET_FOUNDATION_IDS = ACHIEVEMENT_CATALOG_V2
  .filter((row) => !row.retired && row.secret)
  .map((row) => row.id);
