// ЗАМОК ВЛАДЕЛЬЦА 28.10: «все должны быть добавлены в админку и работать корректно в приложении точно так же, как на макете. Это требование
// максимально строгое! Гейт на точное соответствие макетам» — объявления = макет docs/design/v2-app/stories-announcements-v1.html (v2.1).
//
// Сторож гейта (критерий координатора 28.10): (а) порядок и id 36 шаблонов в приложении = TPL макета; (б) каждый design рисуется своим
// кадром (общего кадра не осталось); (в) результат сравнения «эмулятор против макета» в конечном состоянии — docs/work/announcements_gate/
// results.json: снят с ТЕКУЩЕГО макета (sha256 совпадает), порог = замок, 432 кадра (36 × короткий/длинный × 3 темы × тёмное/светлое),
// 0 расхождений и 0 пропусков; (г) подписи кадров есть для всех кнопок и строк. Порог меняет ТОЛЬКО владелец — ни сессия, ни координатор.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ANNOUNCEMENT_DESIGNS, ANNOUNCEMENT_ART_DEFAULTS, ANNOUNCEMENT_CTA_BY_DESIGN } from '../modules/story_events/story_announcements_contract';

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const MOCKUP = 'docs/design/v2-app/stories-announcements-v1.html';
const RESULTS = 'docs/work/announcements_gate/results.json';
/** ЗАМОК ВЛАДЕЛЬЦА 28.10: порог средней разницы кадра (settle, область кадра, 1/4), %. Калибруется один раз на первых 6 кадрах; дальше меняет только владелец. */
const LOCKED_THRESHOLD_PCT = 4;
const GATE_THEMES = ['graphite', 'ink', 'grad_lilac'];
const EXPECTED_FRAMES = 36 * 2 * GATE_THEMES.length * 2;

describe('замок владельца 28.10 — объявления = макет (36 шаблонов)', () => {
  const mockup = read(MOCKUP);
  const mockupIds = [...mockup.matchAll(/\{ id: '([a-z0-9]+)', name: '/g)].map((m) => m[1]);

  it('порядок и id 36 шаблонов приложения = TPL макета', () => {
    expect(mockupIds).toHaveLength(36);
    expect([...ANNOUNCEMENT_DESIGNS]).toEqual(mockupIds);
  });

  it('каждый design рисуется своим кадром, общего кадра не осталось', () => {
    const slide = read('components/stories/announcements_v2/AnnouncementV2Slide.tsx');
    for (const id of ANNOUNCEMENT_DESIGNS) expect(slide).toContain(`case '${id}':`);
    expect(slide).not.toContain('GenericFrame');
  });

  it('арт и кнопка — строго как в макете (арт у 8 design, кнопка у plus / invite / theme)', () => {
    expect(Object.keys(ANNOUNCEMENT_ART_DEFAULTS).sort()).toEqual(['ai', 'dialogs', 'exam', 'holiday', 'lessons', 'maintenance', 'mistakes', 'phrase']);
    expect(ANNOUNCEMENT_CTA_BY_DESIGN).toEqual({ plus: 'open_plus', invite: 'share_invite', theme: 'use_theme' });
    // зачем (Моменты 28.10): в TPL макета «cta: { label» стоит на второй строке записи (после s: { … }), поэтому запись разбираем целиком —
    // от её «{ id: '…', name: '» до начала следующей
    const starts = [...mockup.matchAll(/\{ id: '([a-z0-9]+)', name: '/g)].map((m) => ({ id: m[1], at: m.index ?? 0 }));
    const ctaInMockup = starts.filter((s, i) => mockup.slice(s.at, starts[i + 1]?.at ?? s.at + 20000).includes('cta: { label')).map((s) => s.id).sort();
    expect(ctaInMockup).toEqual(['invite', 'plus', 'theme']);
  });

  it('подписи кнопок и строк кадров есть (ключи announcement_v2_strings)', () => {
    const strings = read('components/stories/announcements_v2/announcement_v2_strings.ts');
    for (const key of ['ctaOpenPlus', 'ctaShareInvite', 'ctaUseTheme', 'countdownLeft', 'hours24', 'cardsTapToFlip', 'vs', 'was', 'became', 'plus', 'yourCode', 'fixed', 'howTo', 'soon', 'todayOnly', 'dialogsHint1', 'dialogsHint2', 'dialogsHint3', 'cardsSampleMeaning']) expect(strings).toContain(`${key}:`);
  });

  it('геометрия по testID: метка, заголовок и блоки помечены одинаково в приложении и в макете (ST.rects)', () => {
    const text = read('components/stories/announcements_v2/announcement_v2_text.tsx');
    expect(text).toContain('testID="story-ann-badge"');
    expect(text).toContain('testID="story-ann-title"');
    expect(text).toContain('testID={`story-ann-block-${i}`}');
    expect(mockup).toContain('const rects = (k) =>');
    for (const id of ['story-ann-badge', 'story-ann-title', 'story-ann-block-']) expect(mockup).toContain(id);
  });

  it('гейт: results.json снят с текущего макета, порог = замок, 432 кадра, 0 расхождений, 0 пропусков, геометрия по testID ±2 dp', () => {
    expect(fs.existsSync(path.join(ROOT, RESULTS))).toBe(true);
    const results = JSON.parse(read(RESULTS)) as {
      mockupSha256: string; threshold: number | null; frames: number; compared: number; missing: number; mismatches: number;
      geometry?: { tolDp: number; checked: number; mismatches: number; skippedFrames: number }; results: { ok: boolean | null }[];
    };
    // зачем (критерий (а) координатора 28.10): рамки метки/заголовка/блоков макета (ST.rects) против узлов story-ann-* эмулятора — допуск 2 dp,
    // проверено хотя бы по одной рамке на кадр (432), расхождений 0
    expect(results.geometry).toBeDefined();
    expect(results.geometry?.tolDp).toBe(2);
    expect(results.geometry?.checked).toBeGreaterThanOrEqual(EXPECTED_FRAMES);
    expect(results.geometry?.mismatches).toBe(0);
    expect(results.geometry?.skippedFrames).toBe(0);
    // зачем: хэш по тексту с LF — как в ann_v2_gate_refs.cjs; autocrlf на Windows не должен ломать сторож
    const sha = crypto.createHash('sha256').update(read(MOCKUP)).digest('hex');
    expect(results.mockupSha256).toBe(sha);
    expect(results.threshold).toBe(LOCKED_THRESHOLD_PCT);
    expect(results.frames).toBe(EXPECTED_FRAMES);
    expect(results.compared).toBe(EXPECTED_FRAMES);
    expect(results.missing).toBe(0);
    expect(results.mismatches).toBe(0);
    expect(results.results.every((r) => r.ok === true)).toBe(true);
  });
});
