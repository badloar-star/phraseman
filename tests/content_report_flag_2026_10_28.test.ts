// зачем (координатор 28.10, слово владельца: «Пожаловаться» везде — Диалоги во время диалога на реплику и на диалог целиком, тест уровня, упражнения; «тап — сразу „Спасибо“, отправка в фоне,
// ретрай без сети»): сторож транспорта жалоб (долговечная очередь, минимум данных, повтор не дублирует) и встраивания флажка в Диалоги и в вопрос теста/экзамена.
import fs from 'node:fs';
import path from 'node:path';

const sendInBackground = jest.fn();
jest.mock('../app/support_report_outbox', () => ({ sendSupportReportInBackground: (...args: unknown[]) => sendInBackground(...args) }));

import { contentReportDataTextV1, resetContentReportsForTests, submitContentReportV1 } from '../app/content_report_v1';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

const BASE = { screen: 'dialogue_v2_session', dataId: 'dialogue_v2:en:cafe:turn-3', dataText: 'Would you like some tea?', comment: 'В реплике ошибка в артикле', lang: 'ru' as const, contentLang: 'en' };

describe('submitContentReportV1 — транспорт жалобы для всех людей', () => {
  beforeEach(() => {
    sendInBackground.mockReset();
    resetContentReportsForTests();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => { jest.restoreAllMocks(); });

  it('кладёт отчёт в долговечную очередь без диагностического журнала; в отчёте экран, id, текст, ответ и язык контента', async () => {
    sendInBackground.mockResolvedValue('queued');
    const result = await submitContentReportV1({ ...BASE, userAnswer: 'a cup' });
    expect(result).toBe('sent');
    expect(sendInBackground).toHaveBeenCalledTimes(1);
    const [payload, lang, options, delivery] = sendInBackground.mock.calls[0]!;
    expect(payload).toMatchObject({ screen: 'dialogue_v2_session', category: 'free_text', dataId: 'dialogue_v2:en:cafe:turn-3', userAnswer: 'a cup', comment: 'В реплике ошибка в артикле' });
    expect(payload.dataText).toBe('dialogue_v2_session · en\nWould you like some tea?');
    expect(lang).toBe('ru');
    expect(options).toEqual({});
    expect(delivery).toEqual({ attachDiagnostics: false });
  });

  it('«не отправилось» только когда не легло даже в очередь; сбой и исключение дают failed и строку журнала', async () => {
    sendInBackground.mockResolvedValueOnce('failed');
    expect(await submitContentReportV1(BASE)).toBe('failed');
    sendInBackground.mockRejectedValueOnce(new Error('boom'));
    expect(await submitContentReportV1({ ...BASE, dataId: 'other' })).toBe('failed');
    expect((console.warn as jest.Mock).mock.calls.some((c) => String(c[0]).startsWith('[CONTENT-REPORT] отправка бросила ошибку'))).toBe(true);
  });

  it('пояснение короче минимума — invalid_comment без обращения к очереди', async () => {
    expect(await submitContentReportV1({ ...BASE, comment: 'коротко' })).toBe('invalid_comment');
    expect(sendInBackground).not.toHaveBeenCalled();
  });

  it('тот же отчёт повторно в этом запуске не уходит второй раз', async () => {
    sendInBackground.mockResolvedValue('sent');
    expect(await submitContentReportV1(BASE)).toBe('sent');
    expect(await submitContentReportV1(BASE)).toBe('sent');
    expect(sendInBackground).toHaveBeenCalledTimes(1);
    expect(await submitContentReportV1({ ...BASE, dataId: 'dialogue_v2:en:cafe:turn-4' })).toBe('sent');
    expect(sendInBackground).toHaveBeenCalledTimes(2);
  });

  it('длинные тексты режутся до потолков, язык контента — первой строкой', () => {
    const long = 'x'.repeat(5000);
    expect(contentReportDataTextV1({ screen: 's', dataText: long, contentLang: 'es' }).length).toBeLessThanOrEqual(1800);
    expect(contentReportDataTextV1({ screen: 's', dataText: 't', contentLang: 'es' }).startsWith('s · es\n')).toBe(true);
    expect(contentReportDataTextV1({ screen: 's', dataText: 't' }).startsWith('s\n')).toBe(true);
  });
});

describe('флажок «Пожаловаться» встроен в Диалоги и в вопрос теста/экзамена', () => {
  it('ContentReportFlag — тот же ReportErrorButton, флажок icon-flag, со своим транспортом (виден всем) и с openRef для меню', () => {
    const flag = read('components/ContentReportFlag.tsx');
    expect(flag).toContain("import ReportErrorButton from './ReportErrorButton';");
    expect(flag).toContain('variant="icon-flag"');
    expect(flag).toContain('submitOverride={submit}');
    expect(flag).toContain('openRef={openRef}');
    expect(flag).toContain('submitContentReportV1');
  });

  it('сценарный диалог: флажок на реплике собеседника и пункт «Сообщить об ошибке» в меню «⋯» → скрытая форма на диалог целиком', () => {
    const screen = read('components/dialogs/DialogueV2SessionScreen.tsx');
    expect(screen).toContain("screen=\"dialogue_v2_session\"");
    expect(screen).toContain('dataId={`${report.dialogId}:${message.id}`}');
    expect(screen).toContain('reportLabel={report?.label}');
    expect(screen).toContain('hideTrigger');
    expect(screen).toContain('openRef={dialogReportOpenRef}');
    expect(screen).toContain("join('\\n')");
    const menu = read('components/dialogs/glass/DialogueGlassMenuSheet.tsx');
    expect(menu).toContain('testID="dialogue-v2-session-menu-report"');
    expect(menu).toContain("pendingRef.current = 'report'");
    expect(menu).toContain("else if (pending === 'report') onReport?.();");
    const route = read('app/dialogue_v2_session.tsx');
    expect(route).toContain('dialogId: `dialogue_v2:${studyTarget}:${scenarioId}`');
  });

  it('свободный диалог: флажок на реплике собеседника и флажок в шапке — на разговор целиком', () => {
    const screen = read('components/dialogs/DialogueV2FreeformScreen.tsx');
    expect(screen).toContain('testID="dialogue-v2-freeform-report"');
    expect(screen).toContain('dataId={`${report.dialogId}:${message.id}`}');
    const route = read('app/dialogue_v2_freeform.tsx');
    expect(route).toContain('dialogId: `dialogue_v2_freeform:${studyTarget}:${session?.sessionId ??');
  });

  it('вопрос теста уровня и экзамена главы: один флажок в общем ChapterExamQuestion, мост теста называет свой экран', () => {
    const exam = read('app/learning-v2/chapter-exam.tsx');
    expect(exam).toContain('testID="chapter-exam-report"');
    expect(exam).toContain("reportScreen = 'learning_v2_chapter_exam'");
    // Learning V2 28.10: в отчёт теста уровня — слова с пропуском, варианты пропуска и верный ответ (после проверки)
    expect(exam).toContain('Пропуск: ${gapPhrase}');
    expect(exam).toContain('Варианты пропуска: ${gapTexts}');
    expect(exam).toContain('Верный ответ: ${correctText}');
    expect(exam).toMatch(/verdict === null \? null : learningV2ChapterExamCorrectAnswerV1/);
    expect(exam).toContain('dataId: `lv2:l${lessonOrdinal}:s${question.sessionOrdinal}:${question.family}:${question.interactionId}`');
    expect(read('components/learning-v2/placement/placement_bridge_live.tsx')).toContain('reportScreen="learning_v2_placement"');
  });

  it('транспорт не шлёт журнал диагностики и не пишет в сеть напрямую: только через долговечную очередь', () => {
    const transport = read('app/content_report_v1.ts');
    expect(transport).toContain('sendSupportReportInBackground');
    expect(transport).toContain('attachDiagnostics: false');
    expect(transport).not.toMatch(/httpsCallable|fetch\(|firestore/i);
  });
});
