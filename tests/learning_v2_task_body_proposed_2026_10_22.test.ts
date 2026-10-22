// зачем (владелец 22.10 через координатора, колонка «Предлагаем» learning-v2-tasks-review.html, реестр №23): общее тело заданий V2 — «что сделать» со значком, ситуация отдельной карточкой,
// цель крупно; режимы собирают экран из этих кирпичей. Контракт данных (разделение строки), текстов (9 языков) и исходников режимов.
import fs from 'node:fs';
import path from 'node:path';

import { LEARNING_V2_TASK_BODY_COPY, learningV2TaskBodyCopy } from '../components/learning-v2/learning_v2_task_body_copy';
import { splitLearningV2TaskPromptV1 } from '../modules/learning-v2/runtime/task_prompt_parts_v1';

const ROOT = path.join(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const code = (src: string): string => src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/ \/\/ .*$/gm, '');
const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

describe('части строки задания (правила Learning V2)', () => {
  it('«Собери фразу»: «что сделать», ситуация и цель — как в колонке «Предлагаем»', () => {
    const parts = splitLearningV2TaskPromptV1({
      family: 'phrase_builder',
      prompt: 'Соберите фразу — коллега ищет вас, а вы уже в комнате',
      interfaceLocale: 'ru',
      modePayload: { explanationV1: { phrase: { meaningByLocale: { ru: 'Я здесь.' } } } },
    });
    expect(parts.instruction).toBe('Собери фразу');
    expect(parts.icon).toBe('puzzle');
    expect(parts.situation).toBe('Коллега ищет вас, а вы уже в комнате.');
    expect(parts.goal).toEqual({ label: 'Скажите по-английски', text: 'Я здесь.' });
  });

  it('«Найди пары»: без ситуации и цели (один заголовок + таймер)', () => {
    const parts = splitLearningV2TaskPromptV1({ family: 'speed_match', prompt: 'Найди пару быстро', interfaceLocale: 'ru' });
    expect(parts.situation).toBeNull();
    expect(parts.goal).toBeNull();
  });
});

describe('тексты тела задания', () => {
  it('каждый ключ на 9 языках и не пустой', () => {
    for (const [key, nine] of Object.entries(LEARNING_V2_TASK_BODY_COPY)) {
      expect(nine).toHaveLength(9);
      for (const text of nine) expect(text.trim().length).toBeGreaterThan(0);
      for (const lang of LANGS) expect(learningV2TaskBodyCopy(lang, key as keyof typeof LEARNING_V2_TASK_BODY_COPY).length).toBeGreaterThan(0);
    }
    expect(learningV2TaskBodyCopy('ru', 'situation')).toBe('Ситуация');
  });
});

describe('исходники тела задания', () => {
  const body = code(read('components/learning-v2/LearningV2TaskBody.tsx'));

  it('без обводок и сжатия шрифта; межстрочный растёт с системным шрифтом; нет фиксированной высоты карточек', () => {
    expect(body).not.toMatch(/borderWidth|borderColor|adjustsFontSizeToFit|numberOfLines/);
    expect(body).toContain('useScaledTextStyles(baseStyles)');
    expect(body).not.toMatch(/\bheight: \d+,?\s*\}/);
  });

  it('размеры из CSS макета: .sit 14/18/13-16-14, .goal 18 и 30/36, .say 16/18/16', () => {
    expect(body).toContain('situation: { marginTop: 14, radius: 18, padTop: 13, padH: 16, padBottom: 14,');
    expect(body).toContain('goal: { marginTop: 18, valueSize: 30, valueLine: 36,');
    expect(body).toContain('say: { marginTop: 16, radius: 18, pad: 16 }');
  });
});

describe('«Собери фразу»', () => {
  const pb = code(read('modules/learning-v2/modes/phrase_builder_mode_v1.tsx'));

  it('начало тела — общее: «Собери фразу» со значком, карточка ситуации, цель «Скажите по-английски» крупно', () => {
    expect(pb).toContain('<LearningV2TaskLead lang={interfaceLocale as Lang} parts={parts} />');
    expect(pb).toContain('<LearningV2GoalBlock');
    expect(pb).toContain('kicker={parts.goal.label}');
    expect(pb).toContain('useLearningV2TaskParts({ family: props.family, prompt, interfaceLocale, modePayload })');
  });

  it('цель берётся из разбора Learning V2; динамик звука сохранён рядом', () => {
    expect(pb).toMatch(/trailing=\{onPlayFullPhraseAudio \? \(\s*<LearningV2AudioReplayPressableV1/);
    expect(pb).toContain('name="volume-high"');
    expect(pb).not.toContain('sx.taskLabel');
  });

  it('банк слов, строка ответа и «Проверить» — прежние (логика режима не менялась)', () => {
    expect(pb).toContain('onAppendToken(option.responseId)');
    expect(pb).toContain('onRemoveTokenAt(index)');
    expect(pb).toContain('learningV2ModeCheckLabelV1(interfaceLocale)');
  });
});

describe('«Послушай и выбери» и диктант', () => {
  const lc = code(read('modules/learning-v2/modes/listen_choose_mode_v1.tsx'));
  const ld = code(read('modules/learning-v2/modes/listen_build_dictation_mode_v1.tsx'));

  it.each([['Послушай и выбери', lc], ['диктант', ld]] as const)('%s: общее начало тела; кнопка звука 96 со значком 36 (динамик остаётся); прежней серой строки нет', (_name, src) => {
    expect(src).toContain('<LearningV2TaskLead lang={interfaceLocale as Lang} parts={parts} />');
    expect(src).toContain('useLearningV2TaskParts({ family: props.family, prompt, interfaceLocale, modePayload })');
    expect(src).toContain('const PLAY_SIZE = 96;');
    expect(src).toContain('const PLAY_ICON = 36;');
    expect(src).toContain('name="volume-high" size={PLAY_ICON}');
    expect(src).not.toContain('sx.taskLabel');
  });

  it('варианты ответа выше: у «Послушай и выбери» отступ 20 вместо 26; у диктанта подпись «фраза/слово» заменена постоянным названием', () => {
    expect(lc).toContain('options: { width: "100%", gap: 13, marginTop: 20 }');
    expect(ld).not.toContain('listenBuildTaskLabel');
  });
});

describe('«Вставь слово» и «Скажи вслух»', () => {
  const cg = code(read('modules/learning-v2/modes/context_gap_grammar_mode_v1.tsx'));
  const rc = code(read('modules/learning-v2/modes/scripted_repeat_compare_mode_v1.tsx'));

  it('«Вставь слово»: название, ситуация карточкой, цель отдельной строкой, фраза с пропуском по центру', () => {
    expect(cg).toContain('<LearningV2TaskLead lang={interfaceLocale as Lang} parts={parts} />');
    expect(cg).toContain('{parts.goal ? <LearningV2GoalBlock kicker={parts.goal.label} value={parts.goal.text} small /> : null}');
    expect(cg).toContain('justifyContent: "center"');
    expect(cg).not.toContain('sx.taskLabel');
    expect(cg).not.toContain('sx.scene');
  });

  it('«Скажи вслух»: ситуация карточкой, фраза с переводом и динамиком в одной карточке; ответ не раскрывается раньше времени', () => {
    expect(rc).toContain('<LearningV2TaskLead lang={interfaceLocale as Lang} parts={visibleParts} />');
    expect(rc).toMatch(/answerBearingContentRevealed && targetPhrase \? \(\s*<LearningV2SayCard/);
    expect(rc).toContain('const visibleParts = answerBearingContentRevealed ? parts : { ...parts, goal: null };');
    expect(rc).toContain('testID="learning-v2-repeat-reference-play"');
    expect(rc).toContain('name="volume-high"');
    expect(rc).toContain('prompt: visiblePrompt');
  });
});

describe('перенос 1:1 «Собери фразу» (tasks-1to1-2026-10-22.md)', () => {
  const tokens = code(read('components/learning-v2/learning_v2_task_theme_tokens.ts'));
  const body = code(read('components/learning-v2/LearningV2TaskBody.tsx'));
  const pb = code(read('modules/learning-v2/modes/phrase_builder_mode_v1.tsx'));
  const glass = code(read('components/learning-v2/LearningV2Glass.tsx'));

  it('тень плит заданий — `--sh` макета: светлая 0 10 26 −14 α .30 + белая кромка сверху; тёмная 0 12 28 −14 α .7', () => {
    expect(tokens).toContain("{ offsetX: 0, offsetY: 10, blurRadius: 26, spreadDistance: -14, color: 'rgba(51,51,87,0.30)' }");
    expect(tokens).toContain("color: 'rgba(255,255,255,0.9)', inset: true");
    expect(tokens).toContain("{ offsetX: 0, offsetY: 12, blurRadius: 28, spreadDistance: -14, color: 'rgba(0,0,0,0.7)' }");
  });

  it('смеси цветов считаются от токенов темы: --ctl светлой — треть пути к карточке; акцент 9/14 %; полка чипа текст α .12', () => {
    expect(tokens).toContain('lv2Mix(g.opaqueControl, g.opaqueCard, 1 / 3)');
    expect(tokens).toContain('lv2Alpha(g.accent, 0.09)');
    expect(tokens).toContain('lv2Alpha(g.accent, 0.14)');
    expect(tokens).toContain("light ? lv2Alpha(g.text, 0.12) : 'rgba(0,0,0,0.34)'");
    expect(tokens).toContain("footerSolid: light ? '#EEEFFA'");
  });

  it('чип: заливка controlSoft и полка chipShelf (46 / 18 / 14 / 16-600 уже совпадали)', () => {
    expect(glass).toContain('task.controlSoft');
    expect(glass).toContain('task.chipShelf');
    expect(glass).toContain("chip: { minHeight: 46, paddingHorizontal: 18, borderRadius: 14,");
  });

  it('кнопка «Проверить» — `.tcta`: 52 / 26 / фон текст / надпись карточка 16-700 / gap 8, плоская', () => {
    expect(body).toContain("cta: { marginTop: 22, minHeight: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 22 }");
    expect(body).toContain("ctaText: { fontSize: 16, lineHeight: 21, fontWeight: '700' }");
    expect(body).toContain('task.ctaFill');
    expect(pb).toContain('<LearningV2TaskCta');
    expect(pb).not.toContain('<Lv2Cta');
  });

  it('строка ответа `.ans`: min-height 64, margin-top 22, padding 10 12, линия — внутренняя тень (не border)', () => {
    expect(pb).toContain('minHeight: 64,');
    expect(pb).toContain('marginTop: 22,');
    expect(pb).toContain('paddingTop: 10,\n    paddingBottom: 10,\n    paddingHorizontal: 12,');
    expect(pb).toContain('boxShadow: lv2TaskAnswerLineShadow(g)');
    expect(pb).not.toMatch(/borderBottom/);
    expect(tokens).toContain('offsetY: -1, blurRadius: 0, spreadDistance: 0, color: g.hairlineSoft, inset: true');
  });

  it('ситуация: 16/24 с отступом 5 (в макете 17/24 — D145), заливка accentWash9', () => {
    expect(body).toContain("sitValue: { marginTop: LV2_TASK_BODY.situation.valueGap, fontSize: 16, lineHeight: 24 }");
    expect(body).toContain('lv2TaskTokens(g).accentWash9');
  });
});
