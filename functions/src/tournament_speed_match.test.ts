/**
 * Контракт режима «Пары на скорость».
 *
 * зачем эти тесты: на поле пар брак не виден глазами. Если два английских
 * слова получили один русский перевод, у пары появляется ДВА верных ответа —
 * игрок теряет очки на правильном действии. Это и проверяем.
 */
import {
  SPEED_MATCH_PAIRS,
  buildSpeedMatchPromptPacket,
  speedMatchTaskFrom,
  speedMatchTasksFrom,
  validateSpeedMatchBatch,
  type SpeedMatchItem,
} from './tournament_ai_generator';
import { validateTournamentTask, toPublicTournamentTask } from './tournament_core';

const pair = (en: string, ru: string): SpeedMatchItem => ({
  en,
  ru,
  difficulty: 'easy',
  ruleNote: `«${en}» переводится как «${ru}».`,
  example: `I know the word ${en}. — Я знаю слово ${en}.`,
});

const goodField: SpeedMatchItem[] = [
  pair('bread', 'хлеб'),
  pair('water', 'вода'),
  pair('table', 'стол'),
  pair('window', 'окно'),
  pair('street', 'улица'),
  pair('morning', 'утро'),
];

describe('пары на скорость', () => {
  it('промпт запрещает неоднозначные переводы', () => {
    const packet = buildSpeedMatchPromptPacket({ level: 'A2' });
    expect(packet.task).toContain('unambiguous');
    expect(packet.task).toContain('two valid answers');
    // Поле разбирают на время: каждая сторона — одно слово, не фраза.
    expect(packet.task).toContain('exactly one word per side');
  });

  it('ОДИНАКОВЫЙ ПЕРЕВОД у разных слов отбрасывается', () => {
    // say/tell с одним переводом = два верных ответа на поле.
    const items = [
      ...goodField,
      pair('say', 'говорить'),
      pair('tell', 'говорить'),
      pair('speak', 'разговаривать'),
      pair('talk', 'беседовать'),
    ];
    const result = validateSpeedMatchBatch({ items });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const translations = (result.items as unknown as SpeedMatchItem[]).map((p) => p.ru);
      // «говорить» осталось РОВНО одно — дубль отсеян.
      expect(translations.filter((ru) => ru === 'говорить')).toHaveLength(1);
      expect(result.rejected?.join(' ')).toContain('ambiguous translation');
    }
  });

  it('фразы из двух и более слов не проходят: speed-pair хранит только слова', () => {
    const items = [
      ...goodField,
      pair('bus stop', 'автобусная остановка'),
      pair('bus', 'автобус'),
      pair('door', 'дверь'),
      pair('night', 'ночь'),
    ];
    const result = validateSpeedMatchBatch({ items });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rejected?.join(' ')).toContain('one word per side');
    }
  });

  it('пунктуация не становится частью speed-pair чипов', () => {
    const punctuated = [
      pair('bread!', 'хлеб.'), pair('water?', 'вода,'), pair('table;', 'стол:'),
      pair('window…', 'окно!'), pair('street.', 'улица?'), pair('morning,', 'утро;'),
    ];
    const result = validateSpeedMatchBatch({ items: punctuated });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const items = result.items as unknown as SpeedMatchItem[];
    expect(items.map((item) => item.en)).toEqual(['bread', 'water', 'table', 'window', 'street', 'morning']);
    expect(items.map((item) => item.ru)).toEqual(['хлеб', 'вода', 'стол', 'окно', 'улица', 'утро']);
    const task = speedMatchTaskFrom(items, 'A2');
    expect((task?.payload as { rightOptions: string[] }).rightOptions.some((chip) => /[!?.,;:…]/u.test(chip))).toBe(false);
  });

  it('неполное поле бракуется целиком — раунд не соберётся', () => {
    const result = validateSpeedMatchBatch({ items: goodField.slice(0, 3) });
    expect(result.ok).toBe(false);
  });

  it('поле = ОДНО задание на целый раунд', () => {
    const task = speedMatchTaskFrom(goodField, 'A2');
    expect(task).not.toBeNull();
    expect(task?.mode).toBe('speed_match');
    const items = task?.payload.items as Array<Record<string, unknown>>;
    expect(items).toHaveLength(SPEED_MATCH_PAIRS);
  });

  it('каждая пара получает полный разбор и отдельные причины остальных переводов', () => {
    const task = speedMatchTaskFrom(goodField, 'A2');
    const items = task?.payload.items as Array<{ explanation: { ruleNote: string; example: string; wrongOptionReasons: string[] } }>;
    expect(items).toHaveLength(SPEED_MATCH_PAIRS);
    for (const item of items) {
      expect(item.explanation.ruleNote).toBeTruthy();
      expect(item.explanation.example).toBeTruthy();
      expect(item.explanation.wrongOptionReasons.filter(Boolean)).toHaveLength(SPEED_MATCH_PAIRS - 1);
    }
  });

  it('дистракторы берутся С ЭТОГО ЖЕ поля', () => {
    // Иначе задание решается исключением: «такого слова на поле нет».
    const task = speedMatchTaskFrom(goodField, 'A2');
    const items = task?.payload.items as Array<{ options: string[]; correctIndex: number }>;
    const fieldTranslations = new Set(goodField.map((p) => p.ru));
    for (const item of items) {
      for (const option of item.options) {
        expect(fieldTranslations.has(option)).toBe(true);
      }
    }
  });

  it('публикует единую уникальную правую колонку для макета 07', () => {
    const task = speedMatchTaskFrom(goodField, 'A2');
    const payload = task?.payload as {
      rightOptions: string[];
      items: Array<{ options: string[]; correctIndex: number }>;
    };
    expect(payload.rightOptions).toEqual(goodField.map((entry) => entry.ru));
    expect(new Set(payload.rightOptions).size).toBe(SPEED_MATCH_PAIRS);
    payload.items.forEach((item, index) => {
      expect(item.options).toEqual(payload.rightOptions);
      expect(item.correctIndex).toBe(index);
    });

    const publicTask = toPublicTournamentTask({ ...task!, verified: true });
    expect(publicTask?.payload.rightOptions).toEqual(payload.rightOptions);
    expect(publicTask?.payload).not.toHaveProperty('correctIndex');
  });

  it('не допускает старое 4-choice поле в новую комнату', () => {
    const legacy = speedMatchTaskFrom(goodField, 'A2')!;
    delete (legacy.payload as Record<string, unknown>).rightOptions;
    const selected = require('./tournament_core').selectRoundTasks({
      pool: [{ ...legacy, verified: true }],
      roomId: 'new-room-no-legacy-match',
      roundNo: 1,
      count: 1,
      modeKind: 'mix',
    });
    expect(selected).toEqual([]);
  });

  it('верный ответ каждой пары — её собственный перевод', () => {
    const task = speedMatchTaskFrom(goodField, 'A2');
    const items = task?.payload.items as Array<{ prompt: string; options: string[]; correctIndex: number }>;
    for (const item of items) {
      const expected = goodField.find((p) => p.en === item.prompt)?.ru;
      expect(item.options[item.correctIndex]).toBe(expected);
    }
  });

  it('задание проходит серверный контракт и играется как поле пар', () => {
    const task = speedMatchTaskFrom(goodField, 'A2');
    const validation = validateTournamentTask({ ...task!, verified: true });
    // зачем 2026-07-27: speed_match раньше классифицировался как 'timeattack' и
    // разворачивался в 6 отдельных вопросов с 4 вариантами вместо поля пар 2×5
    // по макету. Теперь у него собственный kind 'match'.
    expect(validation).toEqual({ ok: true, kind: 'match' });
    // Публичная версия НЕ содержит правильных индексов.
    const publicTask = toPublicTournamentTask({ ...task!, verified: true });
    const serialized = JSON.stringify(publicTask);
    expect(serialized).not.toContain('correctIndex');
  });

  it('батч режется на целые поля, остаток отбрасывается', () => {
    const twelve = [
      ...goodField,
      pair('bus', 'автобус'), pair('door', 'дверь'), pair('night', 'ночь'),
      pair('friend', 'друг'), pair('city', 'город'), pair('book', 'книга'),
    ];
    // 12 пар = 2 поля по 6.
    expect(speedMatchTasksFrom(twelve, 'A2')).toHaveLength(2);
    // 9 пар = 1 поле, остаток в игру не идёт (неполное поле неиграбельно).
    expect(speedMatchTasksFrom(twelve.slice(0, 9), 'A2')).toHaveLength(1);
  });
});
