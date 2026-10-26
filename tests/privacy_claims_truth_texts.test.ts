// зачем (5 · ВХОД e20b47676, координатор 26.10, Переводчик c7465f2d0): три неправды о данных — «в OpenAI текст или речь»,
// «анонимная / обезличенная статистика, видим только цифры», безусловное «напомним заранее». Сторож держит правду ×9.
import { readSource } from './helpers/read_source';

const copy = readSource('components/onboarding/clean_onboarding_copy_core.ts');
const settings = readSource('app/privacy_settings.tsx');
const line = (key: string) => copy.split('\n').find((l) => l.trimStart().startsWith(`${key}: T(`)) ?? '';
const block = (ruStart: string) => {
  const start = settings.indexOf(`ru: '${ruStart}`);
  return start < 0 ? '' : settings.slice(start, settings.indexOf('})', start));
};

describe('правда о данных в текстах', () => {
  it('ИИ в настройках: только «текст», без «речи» на 9 языках', () => {
    const ai = block('Каждая функция работает только после отдельного');
    expect(ai).not.toBe('');
    for (const word of ['речь', 'мовлення', 'speech', 'voz', 'giọng nói', 'suara', 'ses', 'mowa', 'texto ou voz', 'texto o voz']) {
      expect(ai.toLowerCase()).not.toContain(word);
    }
    expect(ai).toContain('OpenAI');
  });

  it('статистика: без «анонимн / обезличен / anonymous / only see numbers» на 9 языках', () => {
    const texts = [line('improveBody'), line('improveShare'), block('Данные о том, как проходит обучение')];
    for (const t of texts) expect(t).not.toBe('');
    const all = texts.join('\n').toLowerCase();
    for (const word of ['анонимн', 'анонімн', 'обезличен', 'знеособлен', 'anonymous', 'anónim', 'anônim', 'despersonaliz',
      'ẩn danh', 'anonim', 'zanonimizowan', 'only see numbers', 'видим только цифры']) {
      expect(all).not.toContain(word);
    }
  });

  it('напоминание о конце пробного — только с условием про уведомления (×9)', () => {
    for (const key of ['trialReminderBodyDays', 'trialReminderBody']) {
      const t = line(key);
      expect(t).not.toBe('');
      for (const cond of ['Если разрешишь уведомления', 'Якщо дозволиш сповіщення', 'If you allow notifications', 'Si permites las notificaciones',
        'Se você permitir notificações', 'Nếu bạn cho phép thông báo', 'Kalau kamu mengizinkan notifikasi', 'Bildirimlere izin verirsen',
        'Jeśli pozwolisz na powiadomienia']) expect(t).toContain(cond);
      expect(t).not.toContain('Мы напомним заранее, чтобы');
    }
  });
});
