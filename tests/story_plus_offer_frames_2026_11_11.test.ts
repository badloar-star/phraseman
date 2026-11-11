// story_plus_offer_frames_2026_11_11.test.ts — три кадра-предложения Plus для «Историй» (макет docs/design/v2-app/stories-plus-offers.html).
// зачем (владелец 11.11: «карточки предложения переместить в истории», затем «Писать отдельно»): кадры и тексты лежат в новых файлах и
// ещё не подключены — этот сторож держит одобренные тексты, честность чисел в них и ключевые размеры макета, пока кадры не видны в приложении.
import fs from 'node:fs';
import path from 'node:path';
import type { Lang } from '../constants/i18n';
import { PREMIUM_FREE_FREEZES_PER_MONTH } from '../app/premium_freeze_allowance';
import { REVENUE_MONTHLY_LIMITS } from '../app/revenue_daily_limits';
import { plusOfferText, STORY_PLUS_OFFER_STRING_KEYS } from '../components/stories/templates/story_plus_offer_strings';

const LANGS: readonly Lang[] = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
/** Число и слово склеены неразрывным пробелом — для сравнения глазами заменяем его на обычный. */
const plain = (s: string): string => s.replace(/ /g, ' ');

describe('тексты кадров-предложений Plus', () => {
  it('русские тексты — слово в слово те, что одобрил владелец', () => {
    expect(plain(plusOfferText('ru', 'ctaSeePlus'))).toBe('Посмотреть Plus');
    expect(plain(plusOfferText('ru', 'streakText'))).toBe('С Plus серия не сгорит, если пропустишь день: три защиты в месяц.');
    expect(plain(plusOfferText('ru', 'weekTitle'))).toBe('Итог недели на одной странице');
    expect(plain(plusOfferText('ru', 'weekText'))).toBe('Что укрепилось, где проседает и с чего начать новую неделю.');
    expect(plain(plusOfferText('ru', 'dialogTitle'))).toBe('Второй диалог за плечами');
    expect(plain(plusOfferText('ru', 'dialogText'))).toBe('Бесплатно — 30 ответов в месяц. С Plus счётчика нет.');
  });

  it('у каждого текста есть перевод на все 9 языков, без пустых и без незаполненных подстановок', () => {
    for (const key of STORY_PLUS_OFFER_STRING_KEYS) {
      for (const lang of LANGS) {
        const text = plusOfferText(lang, key);
        expect(text.trim().length).toBeGreaterThan(0);
        expect(text).not.toMatch(/[{}]/u);
      }
    }
  });

  it('неизвестный язык получает английский текст, а не пустоту', () => {
    expect(plusOfferText('xx' as Lang, 'weekTitle')).toBe(plusOfferText('en', 'weekTitle'));
  });

  it('числа в текстах совпадают с правилами приложения — иначе кадр врал бы', () => {
    // «три защиты в месяц» и «30 ответов в месяц» написаны в тексте; изменится правило — менять тексты на 9 языках
    expect(PREMIUM_FREE_FREEZES_PER_MONTH).toBe(3);
    expect(REVENUE_MONTHLY_LIMITS.ai_dialog_replies).toBe(30);
    for (const lang of LANGS) {
      expect(plain(plusOfferText(lang, 'dialogText'))).toContain('30');
      if (lang !== 'ru' && lang !== 'uk') expect(plain(plusOfferText(lang, 'streakText'))).toContain('3');
    }
  });

  it('тексты не обещают лишнего: ни скидок, ни сроков, ни слова «навсегда»', () => {
    const all = STORY_PLUS_OFFER_STRING_KEYS.flatMap((key) => LANGS.map((lang) => plusOfferText(lang, key))).join(' ').toLocaleLowerCase();
    for (const banned of ['скидк', 'discount', 'навсегда', 'forever', '%']) expect(all).not.toContain(banned);
  });
});

describe('кадры-предложения Plus — разметка по макету', () => {
  const frames = read('components/stories/templates/frames_plus.tsx');

  it('три кадра со своими метками и знак Plus', () => {
    for (const id of ['story-tpl-plus-streak', 'story-tpl-plus-week', 'story-tpl-plus-dialog']) expect(frames).toContain(`testID="${id}"`);
    for (const name of ['PlusStreakFrame', 'PlusWeekFrame', 'PlusDialogFrame', 'PlusMark']) expect(frames).toContain(`export const ${name} = memo(`);
    // шестиугольник макета .pmark и градиент уровня из пейвола «Два пути»
    expect(frames).toContain("const HEX_POINTS = '50,0 93,25 93,75 50,100 7,75 7,25';");
    expect(frames).toContain("const PLUS_GRADIENT = ['#FF7A59', '#FF5F8F', '#FF4FD0'] as const;");
  });

  it('задержки появления — как в макете', () => {
    // серия: огонь 120, счёт 300/800, обзор 380, заголовок 460, текст 640, знак 900, день под защитой 1250
    expect(frames).toContain('<CountUp to={tpl.days} d={300} dur={800}');
    expect(frames).toContain("d={shield ? 1250 : 700 + i * 80}");
    expect(frames).toContain('<Enter kind="pop" d={900} style={f.markAtFlame}>');
    // неделя: знак 950, обзор 800, заголовок 860, текст 1200
    expect(frames).toContain('<Enter kind="pop" d={950} style={f.markAtWeek}>');
    expect(frames).toContain("<H1 text={plusOfferText(lang, 'weekTitle')} d0={860} />");
    // диалог: реплики 200 и 600, счётчик 950, знак 1150, обзор 1200, заголовок 1260, текст 1480
    expect(frames).toContain('d={200 + i * 400}');
    expect(frames).toContain('<Enter d={950} style={f.quota}>');
    expect(frames).toContain("<P text={plusOfferText(lang, 'dialogText')} d={1480} />");
  });

  it('число лимита на кадре приходит из данных, а не написано руками', () => {
    expect(frames).toContain('{tplNumber(tpl.repliesLimit)}');
    expect(frames).not.toMatch(/>\s*30\s*</u);
  });

  it('запреты владельца: без обводок контейнеров и без ужатия шрифта', () => {
    expect(frames).not.toContain('borderWidth');
    expect(frames).not.toContain('borderColor');
    expect(frames).not.toContain('adjustsFontSizeToFit');
  });

  it('файл пока никем не подключён — раздел историй правит другая сессия', () => {
    // зачем: если кадры подключат, этот тест обязан уступить место проверке показа «только бесплатному аккаунту»
    const slide = read('components/stories/templates/StoryTemplateSlide.tsx');
    expect(slide).not.toContain('frames_plus');
  });
});
