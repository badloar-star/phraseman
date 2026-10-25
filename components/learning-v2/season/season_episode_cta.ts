// ════════════════════════════════════════════════════════════════════════════
// season_episode_cta.ts — какая главная кнопка в окне эпизода «Обучения».
//
// зачем (жалоба владельца 25.10: урок 14, эпизод 42 открыт экзаменом, ☆☆☆, а в окне «Повторить эпизод 42» — «почему написано
// повторить, если он открылся через экзамен!!!»; ЗАМОК 21.10 «открыто ≠ пройдено»): у состояния 'open' (открыт экзаменом главы или
// входным тестом, не пройден) своей ветки не было — оно падало в «иначе» и получало «Повторить». «Повторить» — только у реально
// пройденного эпизода ('done'); открытый, но не пройденный — «Начать эпизод N».
// ════════════════════════════════════════════════════════════════════════════
import type { SeasonEpisodeCard } from './season_course_model';

export type SeasonEpisodeCtaV1 = 'start_with' | 'continue' | 'begin' | 'repeat';

/** Выбор кнопки окна эпизода. Каждая ветка пишет [EPISODE-CTA] с состоянием, которое её решило. */
export function seasonEpisodeCtaV1(card: SeasonEpisodeCard, newcomer: boolean): SeasonEpisodeCtaV1 {
  let cta: SeasonEpisodeCtaV1;
  let why: string;
  if (card.state === 'current') {
    cta = newcomer ? 'start_with' : 'continue';
    why = `state=current newcomer=${newcomer}`;
  } else if (card.state === 'done') {
    cta = 'repeat';
    why = 'state=done (пройден по-настоящему)';
  } else if (card.state === 'open') {
    cta = 'begin';
    why = 'state=open (открыт экзаменом/тестом, не пройден)';
  } else {
    // закрытая карта окно не открывает (тряска замка); сюда попадать не должна — пишем и даём «Начать», не «Повторить»
    cta = 'begin';
    why = `state=${card.state} (неожиданно для окна)`;
  }
  console.log('[EPISODE-CTA]', JSON.stringify({ card: card.id, lesson: card.lessonOrdinal, episode: card.sessionOrdinal, state: card.state, sourceState: card.sourceState, source: 'локальный прогресс курса (season_course_model)', cta, why })); // guard-ok: одна строка на окно эпизода
  return cta;
}
