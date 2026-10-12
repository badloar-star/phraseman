# Task packet: светлый акцент — экраны Авторизации (вход, аккаунт, профиль, настройки, промо, код друга, поддержка)

Governance-ID: TG-FF9DA3E06040
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор: делим по файлам; только accentGraphic / accentTextSafe, тёмный вид не меняется)

## Outcome

- Раздел 1 аудита (docs/phraseman-2.0/LIGHT_ACCENT_GRAPHICS_AUDIT_2026-10-13.md) в моих файлах: profile_card_sheet_paint.ts:53 и referrals.tsx:724
  уже закрыты коммитами aef4b71d5 / fd60c8c11 (23:31) — правок не нужно.
- Раздел 2 в моих файлах (заливки «проверить элемент»): все четыре — кнопка/значок, где подпись или галочка красится
  `accentInk`/`onAccent` поверх `accent` (по аудиту: «кнопка с текстом — оставить»). Помечены `light-accent-ok: причина`:
  referrals.tsx:698 (кнопка «Получить приз»), referral_access_ended_modal.tsx:238 (кнопка «Пригласить / Полный доступ»),
  NicknameEditModal.tsx:556 (кнопка «Сохранить»), StudyLanguagePicker.tsx:337 (значок-галочка изучаемого языка).
  Перекраска значка на `accentGraphic` дала бы тёмную галочку `onAccent` на углублённом тоне — хуже.

## Scope

In scope: только пометки в четырёх строках. Вид не меняется ни в светлой, ни в тёмной теме.
Out of scope: пейволы (раздел 3, paywallShared — не названы координатором моими), config/light-accent-graphics-baseline.json
(правится другой сессией; храповик пропускает уменьшение без правки базы).

## Architecture

Пометка `light-accent-ok` — штатное исключение сканера scripts/light_accent_graphics_scan.mjs.

## Security and privacy

Не касается данных.

## Technical debt

- Contain: нет.

## Verification

Сканер: в моих файлах учтённых мест 0; проверка синтаксиса каждого файла.

## Rollback

Откат коммита.
