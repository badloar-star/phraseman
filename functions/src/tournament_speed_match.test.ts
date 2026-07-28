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

const pair = (en: string, ru: string): SpeedMatchItem => ({ en, ru, difficulty: 'easy' });

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
    // Поле разбирают на время — длинные слова читать некогда.
    expect(packet.task).toContain('never longer than 3 words');
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

  it('слишком длинные пары не проходят: их не прочесть на бегу', () => {
    const items = [
      ...goodField,
      pair('the whole entire situation', 'вся эта ситуация целиком'),
      pair('bus', 'автобус'),
      pair('door', 'дверь'),
      pair('night', 'ночь'),
    ];
    const result = validateSpeedMatchBatch({ items });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rejected?.join(' ')).toContain('too long');
    }
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
