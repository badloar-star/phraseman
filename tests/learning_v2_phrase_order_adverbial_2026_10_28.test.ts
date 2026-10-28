// Координатор 28.10 (сканер Теории, 211 заданий): в «собери фразу» обстоятельство времени / места в начале или в конце засчитывается,
// если остальной порядок верен. «Yesterday she found the keys» — верно. Связку и вопросы не переставляем.
import { phraseBuilderAcceptedOrdersV1 } from '../modules/learning-v2/content/phrase_order_variants_v1';
import { materializeFactoryNativeLearningV2SessionV1 } from '../modules/learning-v2/content/factory_native/factory_native_course_v1';
import { evaluateLearningV2CourseSessionInteractionV1 } from '../modules/learning-v2/runtime/course_session_evaluator_capsule_child_v1';

const orders = (s: string) => phraseBuilderAcceptedOrdersV1(s.split(' '), 'test');

beforeAll(() => { jest.spyOn(console, 'log').mockImplementation(() => undefined); jest.spyOn(console, 'warn').mockImplementation(() => undefined); });

describe('порядок слов: обстоятельство на любом конце', () => {
  it('время в конце → можно в начало, и наоборот', () => {
    expect(orders('She found the keys yesterday')).toEqual(['She found the keys yesterday', 'yesterday She found the keys']);
    expect(orders('Yesterday she found the keys')).toEqual(['Yesterday she found the keys', 'she found the keys Yesterday']);
    expect(orders('I am working tonight')).toContain('tonight I am working');
    expect(orders('We met last week')).toContain('last week We met');
    expect(orders('I read every evening')).toContain('every evening I read');
    expect(orders('I paint at home')).toContain('at home I paint');
  });

  it('не переставляем: связка перед обстоятельством, вопрос, короткая фраза, here / there, слово без обстоятельства', () => {
    expect(orders('Arrival is tomorrow')).toEqual(['Arrival is tomorrow']);
    expect(orders('Did you call yesterday')).toEqual(['Did you call yesterday']);
    expect(orders('Is the discount available today')).toEqual(['Is the discount available today']);
    expect(orders('Go today')).toEqual(['Go today']);
    expect(orders('I am here')).toEqual(['I am here']);
    expect(orders('She found the keys')).toEqual(['She found the keys']);
  });

  it('сквозь капсулу занятия: урок 10, занятие 9, i04 принимает оба порядка, чужой порядок — нет', () => {
    const session = materializeFactoryNativeLearningV2SessionV1({ lessonOrdinal: 10, sessionOrdinal: 9, interfaceLocale: 'ru' });
    expect(session).not.toBeNull();
    if (!session) return;
    const id = session.learnerChild.interactions.find((i) => i.interactionId.endsWith(':i04'))!.interactionId;
    const verdict = (value: string) => evaluateLearningV2CourseSessionInteractionV1(session.evaluatorCapsuleChild, id, { kind: 'text', value }).resultCode;
    expect(verdict('I am buying a ready-made meal today')).toBe('provisional_correct');
    expect(verdict('Today I am buying a ready-made meal')).toBe('provisional_correct');
    expect(verdict('I am today buying a ready-made meal')).not.toBe('provisional_correct');
  });
});
