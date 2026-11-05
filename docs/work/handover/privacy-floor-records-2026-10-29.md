# Политика конфиденциальности и «Рекорд этажа» (Пик) — для сессии «Вход» (ведёт политику), 29.10, сессия «4 · ТЕМЫ»

Проверено: `legal/privacy_policy_en.json`, раздел 5 «Public, social, and historical competitive data». Он уже называет видимое участникам комнаты Пика: «Peak floor, steps and weekly result, weekly coins earned (shown to members of your Peak room)».
НЕ покрыто новой фичей: (а) время рекорда этажа с ником рекордсмена видно всем участникам комнаты; (б) личные лучшие времена видны только их владельцу; (в) сервер хранит данные попытки (токен, время, число верных ответов) для проверки результата; (г) без ника показывается «Участник».
Удаление рекордов вместе с аккаунтом уже сделано (0423cf666, `functions/src/account_delete.ts`: `spire_floor_records`, попытки и результаты).

## Предлагаемый абзац (в раздел 5, после предложения про weekly coins)
> **Peak floor records.** In a Peak room, the fastest accepted time for each floor is shown to the members of that room together with the nickname of the player who set it (a player without a visible nickname appears as “Participant”). Your own best times are shown only to you. To check a record attempt, our server keeps the attempt token, the time and whether the ten answers were correct; this competitive data is separate from your lessons, coins and energy, and is deleted together with your account.

Остальные 8 языков политики — через Переводчика (политика ведётся на всех языках сайта; см. `legal/README.md`). Релиз: рекорд за флагом `SPIRE_FLOOR_RECORD_ENABLED=false`, то есть абзац нужен ДО включения флага, не до текущего обновления.
