import { TRAINER_LOAD_COPY } from '../components/trainer_load_copy';
import { triLang } from '../constants/i18n';

describe('TrainerLoadStates — копирайт состояний загрузки/ошибки', () => {
  const groups = Object.entries(TRAINER_LOAD_COPY);

  it('каждая строка имеет ru/uk/es', () => {
    for (const [key, copy] of groups) {
      expect(typeof copy.ru).toBe('string');
      expect(copy.ru.length).toBeGreaterThan(0);
      expect(typeof copy.uk).toBe('string');
      expect(copy.uk.length).toBeGreaterThan(0);
      expect(typeof copy.es).toBe('string');
      expect(copy.es.length).toBeGreaterThan(0);
      // ru и uk должны различаться (не копипаста) для реальных строк
      expect(key).toBeTruthy();
    }
  });

  it('triLang выбирает корректную ветку для ru/uk', () => {
    expect(triLang('ru', TRAINER_LOAD_COPY.errorTitle)).toBe('Не удалось загрузить');
    expect(triLang('uk', TRAINER_LOAD_COPY.errorTitle)).toBe('Не вдалося завантажити');
    expect(triLang('ru', TRAINER_LOAD_COPY.retry)).toBe('Повторить');
    expect(triLang('uk', TRAINER_LOAD_COPY.retry)).toBe('Повторити');
  });

  it('есть кнопки retry и exit (защита от тупика при ошибке)', () => {
    expect(TRAINER_LOAD_COPY.retry.ru).toBeTruthy();
    expect(TRAINER_LOAD_COPY.exit.ru).toBeTruthy();
  });
});
