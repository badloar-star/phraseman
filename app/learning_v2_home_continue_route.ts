// learning_v2_home_continue_route.ts — вход в занятие курса V2 из карточки «Продолжить» на Главной (Ревизор P23, координатор 15.10).
// зачем: маршруты V2 знает только сам V2 (сторож learning_v2_visibility_switch_contract), и любой новый вход стоит под рубильником
// «V2 скрыт»: при LEARNING_V2_HIDDEN карточка V2 не показывается вовсе и Главная остаётся на старом уроке.
import { LEARNING_V2_HIDDEN, logLearningV2Hidden } from './learning_v2_visibility_switch';

/** Можно ли показывать занятие V2 в карточке «Продолжить». */
export const HOME_CONTINUE_V2_ENABLED: boolean = !LEARNING_V2_HIDDEN;
if (LEARNING_V2_HIDDEN) logLearningV2Hidden('home_continue_card', 'home', 'hidden=v2_continue_card');

/** Маршрут занятия с параметрами из метки (те же, что у вкладки «Уроки», без одноразовой подготовки). */
export function homeContinueV2Href(route: Readonly<Record<string, string>>): Readonly<{ pathname: string; params: Readonly<Record<string, string>> }> {
  return { pathname: '/learning-v2/session/[id]', params: route };
}

export default function __RouteShim() { return null; }
