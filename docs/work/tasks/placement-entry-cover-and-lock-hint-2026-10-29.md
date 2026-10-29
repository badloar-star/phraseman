# Task packet: «Не хочу с начала» не только у новичка + плашка «Откроется после занятия N» (жалоба №8, макет одобрен)

Governance-ID: TG-FBD17ADB130A
Governance-ID: TG-56FEA7341730
Status: В работе
Owner: «5 · ВХОД»

## Outcome

Владелец 29.10 ~08:40 (через координатора) одобрил макет https://claude.ai/artifact/VCtfXrJuZn37rcsTvnLDMm с уточнением
дословно: «хорошо, но это же кнопка "Не хочу с начала" — пусть так и называется, если это она». Значит:
- кнопка теста уровня везде называется «Не хочу с начала» (seasonText 'notFromStart', 9 языков уже есть); подписи «Проверить уровень» нет;
- обложка курса: у новичка — на месте строки прогресса (как сейчас), у не-новичка — под строкой прогресса; видна, пока тест не
  использован и текущий урок < 10 (learningV2PlacementEntryV1, 801adeb01);
- тап по закрытой карте карусели: вибрация + тряска замка (замок 22.10), окна нет; плашка над таб-баром «Откроется после занятия N»
  с кнопкой «Не хочу с начала» — 4 с или до любого тапа; тест использован / урок ≥ 10 — только текст, 2,2 с;
- один раз на человека (замок 22.10 «1 раз на аккаунт» остаётся);
- логи [PLACEMENT-ENTRY] событием feature_action: показ (и причина скрытия), тап (обложка / плашка), плашка (с кнопкой / текст);
- строка в OWNER_LOCKS + сторож-тест.

## Scope

- `components/learning-v2/season/SeasonCourseConnected.tsx` — решение показа через learningV2PlacementEntryV1, журнал, тап.
- `components/learning-v2/season/SeasonCourseView.tsx` — стеклянная кнопка у не-новичка под строкой прогресса.
- `components/learning-v2/season/SeasonCourse.tsx` — плашка по тапу на закрытую карту (карусель и списки глав).
- НОВЫЙ `components/learning-v2/season/SeasonLockHint.tsx` — плашка (вид тост-плашки lessons.tsx: opaqueControl, r18, 20/12, 16/21 700, тень плашки).
- НОВЫЙ `app/learning_v2_placement_entry_diagnostics.ts` — события журнала.
- `app/learning_v2_placement_entry_copy.ts` — убрать «Проверить уровень» (кнопка = «Не хочу с начала»), тексты «Откроется после…» остаются.
- Тесты: `tests/learning_v2_placement_entry_v1.test.ts` (обновить), НОВЫЙ `tests/owner_locks_placement_entry_2026_10_29.test.ts`.
- `docs/work/OWNER_LOCKS.md` — своя строка патчем (файл с чужими правками).
- НЕ трогаю: `app/(tabs)/lessons.tsx` (чужие правки) — «Все уроки» (тап по закрытому уроку) ждёт кадров Сверки и макета.

## Architecture

Решение показа одно (learningV2PlacementEntryV1), View получает onNotFromStart только когда вход разрешён. Плашка живёт внутри
SeasonCourse (абсолютная, не двигает раскладку), анимация на UI-потоке (Reanimated), уменьшенное движение — сразу.
Закрытие «любым тапом»: onTouchStart корня курса, касание вне плашки прячет её, тап при этом проходит дальше.

## Security and privacy

Новых данных нет: события журнала обращений (политика §10) — только закрытые коды и номера урока/занятия 0–99.

## Technical debt

«Все уроки» — после кадров Сверки (lessons.tsx чужой, правка патчем через Ревизора).

## Verification

jest через слот: новые/обновлённые тесты + season-сторожа (owner_locks_*season*, learning_v2_not_from_start_once_v1, placement ui).
Типы — typecheck, мои файлы. Сверка — снимки против макета.

## Rollback

Вернуть условие newcomer в View/Connected, удалить SeasonLockHint и вызов в SeasonCourse.
