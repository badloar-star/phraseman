// зачем (владелец 05.11 дословно «это не то что я одобрял … В ТОЧНОСТИ 1 К 1 КАК БЫЛО НА МАКЕТЕ … С АНИМАЦИЕЙ КОТОРУЮ Я ОДОБРИЛ»): сторож паритета окна «Открытие раздела» с макетом approved-rev8
// (openings.js / openings.css / motion.js): нет круга за героем, арты как в макете, надзаголовок и «На главную» на 9 языках, 14 искр, ключи анимации макета.
import fs from 'node:fs';
import path from 'node:path';
import { sectionOpeningHome, sectionOpeningOverline } from '../modules/section_openings/section_opening_strings';
import { parseOpeningQueue } from '../modules/section_openings/section_opening_queue';
import { SECTION_OPENING_IDS } from '../modules/section_openings/section_opening_core';

const src = fs.readFileSync(path.join(__dirname, '..', 'components/section_openings/SectionOpeningCeremony.tsx'), 'utf8').replace(/\r\n/g, '\n');
const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('окно «Открытие раздела» = макет approved-rev8', () => {
  it('круга за героем нет; свечение — белая копия героя; герой с поворотом/масштабом из starts макета', () => {
    expect(src).not.toMatch(/haloStyle|styles\.halo|halo:/u);
    expect(src).toContain('tintColor="#FFFFFF"');
    expect(src).toContain("rank: { x: 0, y: 50, r: -5, s: 1 }");
    expect(src).toContain("cards: { x: -35, y: 0, r: -4, s: 1 }");
    expect(src).toContain("plus: { x: 0, y: 24, r: 0, s: 0.94 }");
  });

  it('арты как в макете: видео intro_videos, Пик spire_tile, у «Ранга» монета, у диалогов/карточек/Plus арта нет', () => {
    expect(src).toContain("{ video: 'intro_videos', peak: 'spire_tile' }");
    expect(src).toContain("id === 'rank' ?");
    expect(src).toContain('<MyRankCoin size={coinSize}'); // монета строго по рангу пользователя (c2af034df)
    expect(src).not.toContain('SpireRankCoin');
    for (const old of ['chat_bubbles', 'notecard_stack', 'spiral_notepad', 'cards_hub_saved']) expect(src).not.toContain(old);
  });

  it('14 искр, кнопка «На главную», надзаголовок; ключи арта .22/.58/.8 и таймлайн 3600 / 61→82 %', () => {
    expect(src).toContain('Array.from({ length: 14 }');
    expect(src).toContain('testID="section-opening-home"');
    expect(src).toContain('sectionOpeningOverline(lang, id)');
    expect(src).toContain('[0, 0.22, 0.58, 0.8], [0.92, 0.92, 1.06, 1]');
    expect(src).toContain('SECTION_OPENING_DURATION_MS = 3600');
    expect(src).toContain('COPY_FROM = 0.61');
    expect(src).toContain('COPY_FULL = 0.82');
  });

  it('надзаголовок «РАНГ N · НОВЫЙ РАЗДЕЛ» и «На главную» есть на 9 языках; у Plus — «все разделы доступны»', () => {
    for (const lang of LANGS) {
      expect(sectionOpeningHome(lang).length).toBeGreaterThan(2);
      for (const id of SECTION_OPENING_IDS) {
        const line = sectionOpeningOverline(lang, id);
        expect(line.length).toBeGreaterThan(5);
        expect(line).not.toContain('{n}');
        if (id !== 'plus') expect(line).toMatch(/[123]/u);
      }
    }
    expect(sectionOpeningOverline('ru', 'peak')).toBe('РАНГ 2 · НОВЫЙ РАЗДЕЛ');
    expect(sectionOpeningOverline('ru', 'plus')).toBe('ВСЕ РАЗДЕЛЫ ДОСТУПНЫ');
    expect(sectionOpeningHome('ru')).toBe('На главную');
  });
  // зачем (владелец 05.11 «НЕ МОДАЛ, НЕ ЭКРАН, А ИСТОРИЯ»): окно ведёт себя как история — сегментная полоска по очереди, тап справа/слева, удержание — пауза, свайп вниз — закрыть
  it('история: сегменты очереди, тап справа/слева, удержание = пауза, свайп вниз = закрыть; CTA и хаптик привязаны к прогрессу, а не к таймеру', () => {
    expect(src).toContain('segments = 1, segmentIndex = 0');
    expect(src).toContain('i < segmentIndex');
    expect(src).toContain('testID="section-opening-gesture-zone"');
    expect(src).toContain('Gesture.Race(');
    expect(src).toContain('Gesture.LongPress().minDuration(180)');
    expect(src).toContain('Gesture.Tap().maxDistance(15)');
    expect(src).toContain("build: 'gestures-v3'");
    expect(src).toContain('cancelAnimation(progress)');
    expect(src).toContain('Gesture.Pan()');
    expect(src).toContain('event.translationY > 90');
    expect(src).toContain('useAnimatedReaction');
    expect(src).not.toMatch(/setTimeout\(enableCta|setTimeout\(celebrate/u);
    const slots = fs.readFileSync(path.join(__dirname, '..', 'components/home/home_moment_slots.tsx'), 'utf8');
    expect(slots).toContain('segments={segments}');
    expect(slots).toContain('segmentIndex={segmentIndex}');
    const store = fs.readFileSync(path.join(__dirname, '..', 'modules/section_openings/section_opening_store.ts'), 'utf8');
    expect(store).toContain('pending: pending.length');
    // тап слева — ПРЕДЫДУЩИЙ кадр истории (координатор 05.11): стор хранит закрытые кадры, хост отдаёт back(), слот передаёт onPrev, кадр зовёт его при segmentIndex > 0
    expect(store).toContain('export function goBackSectionOpening(): boolean');
    expect(store).toContain('history.push(closed)');
    expect(fs.readFileSync(path.join(__dirname, '..', 'modules/section_openings/use_section_opening_host.ts'), 'utf8')).toContain('back: () => goBackSectionOpening()');
    expect(slots).toContain('onPrev={() => sectionOpening.back()}');
    expect(src).toContain('segmentIndex > 0 && onPrev?.() === true');
  });
  // зачем (координатор 06.11, 🔴 блокер сборки: старт истории ждал героя 2,5–11 с): прогрев в простое, потолок ожидания 300 мс, журнал hero_wait_ms
  it('старт истории: прогрев героев, потолок ожидания 300 мс, журнал hero_wait_ms', () => {
    expect(src).toContain('HERO_WAIT_CEILING_MS = 300');
    expect(src).toContain("begin('ceiling_300ms', null)");
    expect(src).toContain("begin(ok ? 'hero_loaded' : 'hero_failed', waited)");
    expect(src).toContain('hero_wait_ms');
    const prewarm = fs.readFileSync(path.join(__dirname, '..', 'modules/section_openings/section_opening_prewarm.ts'), 'utf8');
    expect(prewarm).toContain('export async function prewarmSectionOpeningAssets');
    expect(prewarm).toContain('Image.loadAsync(SECTION_OPENING_HERO[id]');
    expect(prewarm).toContain('export function getPrewarmedHero');
    expect(prewarm).toContain("'prewarm_failed'");
    const slots = fs.readFileSync(path.join(__dirname, '..', 'components/home/home_moment_slots.tsx'), 'utf8');
    expect(slots).toContain('InteractionManager.runAfterInteractions');
    expect(slots).toContain('section_opening_prewarm');
    const assets = fs.readFileSync(path.join(__dirname, '..', 'modules/section_openings/section_opening_assets.ts'), 'utf8');
    for (const id of SECTION_OPENING_IDS) expect(assets).toContain(`${id}: require(`);
  });
  // зачем (координатор 06.11, OTA1): жесты истории проверяются на dev-маршруте с очередью, каждый жест пишет [STORY-GESTURE]; тап справа на последнем/единственном кадре НЕ закрывает историю
  it('жесты истории: журнал [STORY-GESTURE], правый тап не закрывает последний кадр, dev-очередь rank,video,dialogs', () => {
    for (const marker of ["'tap_next'", "'tap_prev'", "'hold_start'", "'hold_end'", "'swipe_down_close'", "action: 'noop_last_frame'", "action: 'next_frame'", "action: 'finish_frame'", "action: 'prev_frame'", "action: 'restart_frame'"]) expect(src).toContain(marker);
    expect(src).toContain('runOnJS(swipeClose)()');
    expect(src).toContain('getPrewarmedHero(id) ?? HERO[id]');
    expect(parseOpeningQueue('rank,video,dialogs')).toEqual(['rank', 'video', 'dialogs']);
    expect(parseOpeningQueue('rank, nope ,plus')).toEqual(['rank', 'plus']);
    expect(parseOpeningQueue(undefined)).toEqual([]);
    expect(parseOpeningQueue('rank,video,dialogs,peak,cards,plus,rank,video')).toHaveLength(6);
  });
});
