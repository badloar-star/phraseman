import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';

/*
 * Надгробие коллекционных дропов.
 *
 * зачем этот файл существует (2026-08-31): index.ts требует
 * `require('./collectibles_retired')`, а самого файла в дереве нет — он потерян
 * при одном из checkpoint-снимков. Из-за этого АНАЛИЗ КОДОВОЙ БАЗЫ падал с
 * «Cannot find module», и деплой ЛЮБОЙ функции был невозможен: сломанный
 * импорт валит весь бандл, а не только свою фичу.
 *
 * Функция `collectiblesClaimDrop` при этом ЖИВА в проде (проверено
 * functions:list) — значит её зовут старые версии приложения. Просто убрать
 * экспорт нельзя: у таких клиентов клейм упадёт с ошибкой соединения вместо
 * понятного отказа. Поэтому повторяем приём, уже применённый к Help Board
 * (help_board_decommission.ts): имя и сигнатура сохранены, внутри — вежливый
 * отказ без единого чтения Firestore, то есть нулевая стоимость.
 *
 * Надгробие живёт, пока не вымрут клиенты, знающие про дропы; после этого его
 * можно снять вместе с самой функцией.
 */

const REGION = 'us-central1';

export const COLLECTIBLES_RETIRED_MESSAGE = 'Collectible drops are no longer available.';

export const collectiblesClaimDrop = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async () => {
    throw new HttpsError('failed-precondition', COLLECTIBLES_RETIRED_MESSAGE);
  },
);
