// ─── Значок каждой сценки Диалогов ───────────────────────────────────────────────────────────────────────────
// зачем (владелец 13.10): в каталоге у каждой сценки свой значок по смыслу, а не общий значок мира. Одна таблица по id сценки
// (sourceScenarioId выпущенного кандидата: travel/work/social/everyday _01…_19). Неизвестный id — значок мира (как раньше).
// Только имена из набора Ionicons — сторож tests/dialogue_scenario_icons_contract.test.ts.
import type Ionicons from '@expo/vector-icons/Ionicons';
import type React from 'react';

export type DialogueScenarioIconName = React.ComponentProps<typeof Ionicons>['name'];

export const DIALOGUE_SCENARIO_ICON: Readonly<Record<string, DialogueScenarioIconName>> = Object.freeze({
  // Путешествия
  travel_01: 'bed', // написать хозяину жилья: я приехал
  travel_02: 'key', // код от двери
  travel_03: 'time', // время заселения
  travel_04: 'car', // трансфер
  travel_05: 'heart', // спасибо за совет
  travel_06: 'map', // маршрут
  travel_07: 'checkmark-done', // подтвердить бронь
  travel_08: 'hourglass', // задержка
  travel_09: 'bag-handle', // где оставить багаж
  travel_10: 'alarm', // время встречи
  travel_11: 'build', // проблема с жильём
  travel_12: 'airplane', // групповая поездка
  travel_13: 'swap-horizontal', // изменить бронь
  travel_14: 'alert-circle', // жалоба на сервис
  travel_15: 'git-branch', // другой маршрут
  travel_16: 'document-text', // добиться решения по брони
  travel_17: 'cash', // компенсация
  travel_18: 'business', // гость — хозяин — сервис
  travel_19: 'train', // сбой поездки, переписка нескольких сторон
  // Работа
  work_01: 'person-add', // представиться коллеге
  work_02: 'document', // попросить файл
  work_03: 'call', // время звонка
  work_04: 'time', // опаздываю
  work_05: 'thumbs-up', // спасибо за инструкцию
  work_06: 'checkbox', // уточнить задачу
  work_07: 'calendar', // перенести срок
  work_08: 'stats-chart', // короткий отчёт о статусе
  work_09: 'lock-open', // запросить доступ
  work_10: 'briefcase', // после первого рабочего дня
  work_11: 'footsteps', // следующий шаг команды
  work_12: 'bulb', // проблема и решение
  work_13: 'calendar-number', // собрать время для встречи
  work_14: 'shield-checkmark', // отстоять реальный срок
  work_15: 'create', // конструктивный отзыв
  work_16: 'layers', // приоритеты при нехватке ресурсов
  work_17: 'chatbubble-ellipses', // дипломатично не согласиться
  work_18: 'warning', // риск между командами
  work_19: 'scale', // сложные переговоры
  // Общение
  social_01: 'hand-left', // привет после знакомства
  social_02: 'calendar', // перенести встречу
  social_03: 'navigate', // спросить дорогу
  social_04: 'heart', // спасибо за помощь
  social_05: 'sparkles', // поздравить
  social_06: 'chatbubbles', // чат по интересам
  social_07: 'location', // договориться о времени и месте
  social_08: 'ticket', // пригласить на событие
  social_09: 'close-circle', // вежливо отменить планы
  social_10: 'mail', // написать после встречи
  social_11: 'people', // собрать общий план
  social_12: 'heart-half', // поддержать друга
  social_13: 'help-buoy', // недоразумение
  social_14: 'remove-circle', // тактично отказать
  social_15: 'eye', // обсудить ожидания
  social_16: 'chatbox-ellipses', // деликатный отзыв
  social_17: 'shield', // личная граница
  social_18: 'link', // вернуть доверие
  social_19: 'people-circle', // тонкий конфликт в группе
  // Повседневное
  everyday_01: 'help-circle', // попросить совета
  everyday_02: 'alarm', // напомнить о вещи
  everyday_03: 'sparkles', // поздравить
  everyday_04: 'calendar', // свободен ли человек
  everyday_05: 'sad', // короткое извинение
  everyday_06: 'hand-right', // маленькая просьба
  everyday_07: 'paw', // присмотр за питомцем
  everyday_08: 'gift', // подарок в общем чате
  everyday_09: 'cube', // детали доставки
  everyday_10: 'heart', // спасибо за помощь
  everyday_11: 'sunny', // планы на выходные
  everyday_12: 'git-compare', // сравнить варианты
  everyday_13: 'home', // проблема соседям или в сервис
  everyday_14: 'list', // общие правила
  everyday_15: 'construct', // неудобство без обвинений
  everyday_16: 'megaphone', // убедить группу
  everyday_17: 'shield', // разговор о границах
  everyday_18: 'git-merge', // распутать противоречия
  everyday_19: 'people-circle', // примирить группу
});

export function dialogueScenarioIcon(scenarioId: string, fallback: DialogueScenarioIconName): DialogueScenarioIconName {
  return DIALOGUE_SCENARIO_ICON[scenarioId] ?? fallback;
}

/** Значок мира (раздела) — общий для каталога и аватара собеседника в чате (раньше жил копией в DialogueV2CatalogueSection). */
export function dialogueWorldIcon(worldId: string): DialogueScenarioIconName {
  if (worldId === 'travel') return 'airplane';
  if (worldId === 'social') return 'people';
  // зачем (Макеты 7c831a193, dialogs-004): в образце «Дела» — заливной документ с строками (`docF`), а не портфель; ближайший значок набора — document-text
  if (worldId === 'work') return 'document-text';
  return 'cafe';
}

/**
 * зачем (Макеты 6dcbedb9f, dialogs-014/022/029): аватар собеседника в чате — значок сценки (как строка каталога), а не общий
 * значок человека. Мир — префикс id сценки (travel_01 → travel); неизвестная сценка — значок мира.
 */
export function dialogueScenarioAvatarIcon(scenarioId: string): DialogueScenarioIconName {
  return dialogueScenarioIcon(scenarioId, dialogueWorldIcon(scenarioId.split('_')[0] ?? ''));
}
