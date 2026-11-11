// story_instead_frames_2026_11_11.test.ts — 17 кадров «истории вместо окон» (макет docs/design/v2-app/stories-instead-of-modals.html).
// зачем (владелец 11.11: «никаких модальных окон совсем, всё отображается только в историях», затем «Да, в приложение»): кадры и тексты
// лежат в новых файлах и ещё не подключены — этот сторож держит русские тексты макета, полноту переводов и ключевые задержки, пока кадры
// не видны в приложении.
import fs from 'node:fs';
import path from 'node:path';
import type { Lang } from '../constants/i18n';
import { insteadText, STORY_INSTEAD_STRING_KEYS } from '../components/stories/templates/story_instead_strings';

const LANGS: readonly Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
/** Число и слово склеены неразрывным пробелом — для сравнения глазами заменяем его на обычный. */
const plain = (s: string): string => s.replace(/[  ]/g, ' ');
/** Значения для всех подстановок сразу — как в примерах макета. */
const VARS = { lessonNo: 12, coins: 2400, days: 9, cards: 24, lessons: 12, rank: 4, next: 5, price: 2000, left: 400, version: '2.1', date: '10 ноября', n: 3, name: 'Анна', plusDays: 7, topic: 'планы на выходные', monthIn: 'за октябрь', place: 2, pack: 'Фразы для кафе', count: 214 } as const;
const ru = (key: Parameters<typeof insteadText>[1], vars: Record<string, string | number> = VARS): string => plain(insteadText('ru', key, vars));

describe('тексты кадров «истории вместо окон»', () => {
  it('русские тексты — слово в слово как в макете', () => {
    expect(ru('helloTitle')).toBe('Добро пожаловать в PhraseMan');
    expect(ru('backOverline')).toBe('9 дней перерыва');
    expect(ru('backCardsLabel')).toBe('карточки на повтор');
    expect(ru('backPhrasesLabel')).toBe('фраз выучено');
    expect(ru('legacyTitle')).toBe('Бонусы стали монетами');
    expect(ru('rankTitle')).toBe('Хватает на ранг 5');
    expect(ru('rankText')).toBe('На счёте 2 400 монет. Ранг 5 стоит 2 000.');
    expect(ru('rankLeft')).toBe('останется 400');
    expect(ru('updateOverline')).toBe('Версия 2.1');
    expect(ru('msgTitle')).toBe('Ответ от команды');
    expect(ru('nudgeTitle', { days: 3 })).toBe('3 дня без занятий');
    expect(ru('expiredTitle')).toBe('Plus закончился');
    expect(ru('perkShield')).toBe('Защита серии, 3 в месяц');
    // текст реферального окна — дословно
    expect(ru('refTitle')).toBe('Тебя пригласили');
    expect(ru('refText')).toBe('Тебя позвал друг. Начни учиться — мы рады, что ты с нами.');
    expect(ru('ctaEnterCode')).toBe('У меня есть код приглашения');
    // текст окна «реферальный доступ закончился» — дословно
    expect(ru('refEndedTitle')).toBe('Доступ можно открыть снова');
    expect(ru('refEndedKeep')).toBe('Всё, что ты открыл — осталось с тобой.');
    expect(ru('refEndedRestore')).toBe('Позови ещё друга — и доступ вернётся.');
    expect(ru('perfectTitle')).toBe('Без единой ошибки');
    expect(ru('plusCoins', { coins: 120 })).toBe('+120 монет');
    expect(ru('openTitle', { next: 13 })).toBe('Открыт урок 13');
    expect(ru('ctaStartLesson', { lessonNo: 13 })).toBe('Начать урок 13');
    expect(ru('prizeOverline')).toBe('Набор месяца за октябрь');
    expect(ru('prizeTitle')).toBe('Твой набор на 2-м месте');
    expect(ru('prizeText')).toBe('«Фразы для кафе» · сохранений: 214');
    expect(ru('ctaClaim', { coins: 500 })).toBe('Забрать 500 монет');
    expect(ru('plusOnTitle')).toBe('Plus подключён');
  });

  it('слово к числу согласуется само — подписи годятся для любого числа', () => {
    expect(ru('backOverline', { days: 1 })).toBe('1 день перерыва');
    expect(ru('backOverline', { days: 21 })).toBe('21 день перерыва');
    expect(ru('backCardsLabel', { cards: 1 })).toBe('карточка на повтор');
    expect(ru('backCardsLabel', { cards: 5 })).toBe('карточек на повтор');
    expect(plain(insteadText('en', 'backOverline', { days: 1 }))).toBe('1 day away');
  });

  it('у каждого текста есть перевод на все 9 языков, без пустых и без незаполненных подстановок', () => {
    for (const key of STORY_INSTEAD_STRING_KEYS) {
      for (const lang of LANGS) {
        const text = insteadText(lang, key, VARS);
        expect({ key, lang, empty: text.trim().length === 0 }).toEqual({ key, lang, empty: false });
        expect({ key, lang, text: /[{}]/u.test(text) ? text : 'ok' }).toEqual({ key, lang, text: 'ok' });
      }
    }
  });

  it('неизвестный язык получает английский текст, а не пустоту', () => {
    expect(insteadText('xx' as Lang, 'backTitle')).toBe(insteadText('en', 'backTitle'));
  });

  it('тексты не обещают лишнего: ни скидок, ни слова «навсегда», ни процентов', () => {
    const all = STORY_INSTEAD_STRING_KEYS.flatMap((key) => LANGS.map((lang) => insteadText(lang, key, VARS))).join(' ').toLocaleLowerCase();
    for (const banned of ['скидк', 'discount', 'навсегда', 'forever', '%']) expect(all).not.toContain(banned);
  });
});

describe('кадры «истории вместо окон» — разметка по макету', () => {
  const a = read('components/stories/templates/frames_instead_a.tsx');
  const b = read('components/stories/templates/frames_instead_b.tsx');
  const parts = read('components/stories/templates/story_instead_parts.tsx');
  const all = `${a}\n${b}\n${parts}`;

  it('17 кадров со своими метками', () => {
    const ids = ['hello', 'back', 'legacy', 'rank', 'update', 'message', 'nudge', 'plus-expired', 'plus-on',
      'ref-welcome', 'ref-ended', 'perfect', 'lesson-open', 'rate', 'pack-prize', 'first-dialog', 'peak-overtake'];
    expect(ids).toHaveLength(17);
    for (const id of ids) expect(all).toContain(`testID="story-tpl-instead-${id}"`);
    expect((all.match(/testID="story-tpl-instead-/g) ?? [])).toHaveLength(17);
  });

  it('задержки появления — как в макете', () => {
    // приветствие: монета 120, обзор 380, заголовок 460, текст 760
    expect(a).toContain("<H1 text={insteadText(lang, 'helloTitle')} d0={460} small />");
    expect(a).toContain("<P text={insteadText(lang, 'helloText')} d={760} />");
    // с возвращением: плитки 800 и 880, счёт 900 и 980 за 800 мс
    expect(a).toContain('<CountUp to={tpl.dueCards} d={900} dur={800}');
    expect(a).toContain('<CountUp to={tpl.phrasesLearned} d={980} dur={800}');
    // бонусы: сумма 500 за 1100 мс, плитки 1250 и 1330
    expect(a).toContain('<CountUp to={tpl.coins} d={500} dur={1100}');
    // хватает на ранг: обзор 500, заголовок 580, текст 800, плашка 950
    expect(a).toContain("d={950} />");
    // напоминания: дни 160 + 80·i, обзор 760, заголовок 840, текст 1080
    expect(a).toContain('d={160 + i * 80}');
    expect(a).toContain("<P text={insteadText(lang, 'nudgeText')} d={1080} />");
    // идеальный урок: звёзды 160 / 280 / 400, счёт 520, конфетти 18 с 700
    expect(b).toContain('<Confetti n={18} d0={700} />');
    expect(b).toContain('<Enter d={520}>');
    // строки возможностей: вход d0 + 90·i, отметка ещё через 260 мс
    expect(parts).toContain('const d = d0 + i * 90;');
    expect(parts).toContain('<CheckFill d={d + 260}>');
  });

  it('числа на кадрах приходят из данных события, а не написаны руками', () => {
    for (const src of [a, b]) expect(src).not.toMatch(/>\s*\d{2,}\s*</u);
    expect(a).toContain("insteadText(lang, 'perkShield', { n: freezesPerMonth })");
  });

  it('запреты владельца: без обводок контейнеров и без ужатия шрифта', () => {
    for (const banned of ['borderWidth', 'borderColor', 'adjustsFontSizeToFit']) expect(all).not.toContain(banned);
  });

  it('шаг 1: все 17 кадров подключены к просмотру и стоят в конце общего списка', () => {
    const slide = read('components/stories/templates/StoryTemplateSlide.tsx');
    const registry = read('components/stories/templates/story_template_registry.ts');
    const own = read('components/stories/templates/story_instead_registry.ts');
    const unique = [...new Set([...own.matchAll(/'(instead_[a-z_]+)'/g)].map((m) => m[1]))];
    expect(unique).toHaveLength(17);
    for (const id of unique) expect(slide).toContain(`case '${id}':`);
    // новые кадры — строго в конце общего списка: номера прежних 31 в фотостудии не сдвигаются
    // зачем (11.11, правка разрешена автором сторожа): после кадров «вместо окон» в тот же массив дописаны три кадра-предложения Plus —
    // проверяем порядок (лесенка → «вместо окон»), а не конец массива
    expect(registry).toContain('...STORY_LADDER_TEMPLATE_IDS, ...STORY_INSTEAD_TEMPLATE_IDS, ');
    expect(registry).toContain('...STORY_INSTEAD_TEMPLATE_SAMPLES,');
  });

  it('шаг 2: у восьми кадров есть источник — событие instead; остальные 9 ждут своих партий', () => {
    const fromEvent = read('components/stories/templates/story_template_from_event.ts');
    expect(fromEvent).toContain("case 'instead': return insteadTemplateFromPayload(p);");
    const own = read('components/stories/templates/story_instead_from_event.ts');
    expect(own).toContain("export const STORY_INSTEAD_EVENT_KINDS = ['back', 'rank_enough', 'legacy', 'plus_expired', 'ref_ended', 'ref_welcome', 'first_dialog', 'rate'] as const;");
  });
});

describe('макет и код говорят одно и то же', () => {
  const mock = read('docs/design/v2-app/stories-instead-of-modals.frames.js');

  it('в макете 17 кадров и тексты, приведённые к коду', () => {
    expect((mock.match(/\{ id: '/g) ?? [])).toHaveLength(17);
    for (const text of ['карточки на повтор', 'фраз выучено', '100%. Ты вообще оставил уроку шанс?', 'Оценить в Google Play', 'Тебя пригласили', 'Первый разговор по-английски — есть!', 'Доступ можно открыть снова', 'Набор месяца за октябрь', 'сохранений: 214', 'Марк обходит тебя']) {
      expect(mock).toContain(text);
    }
  });
});
