# Сверка политики конфиденциальности с ночными функциями 14–15.10 (координатор 15.10, только чтение)

Governance-ID: TG-000EC580AC30
Status: Готово к утреннему решению владельца. Политику НЕ правили.
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Сверка `legal/privacy_policy_en.json` (последняя правка 693d153cc, 14.10, D189; именно она уйдёт 17.10) с функциями ночи.

| Функция | Что собирается и где | Сколько живёт | Политика | Вывод |
|---|---|---|---|---|
| Сторис (D192): итог недели Пика, рубеж серии, новый ранг монеты, ачивка | ТОЛЬКО на устройстве: AsyncStorage `story_events_v1:<stableId>`, свои факты, без Firestore (`modules/story_events/story_events_store.ts`) | событие 7 дней, не больше 20 | §3 (локальные данные: прогресс, серии, ачивки…), удаление — `AsyncStorage.clear()` | ✅ покрыто (по желанию — абзац 3 для ясности) |
| «С возвращением» (D193) | локально: `winback_last_active_at_v1` (время последнего входа), `welcome_back_shown_at_v1`; цифры окна — из локальных кэшей (фразы, ранг, энергия, карточки) | до удаления/очистки данных | §3; §12 упоминает re-engagement/winback | ✅ покрыто |
| «Напомнить вечером» (D191 m03) | одно локальное уведомление сегодня 19:00, только если разрешение УЖЕ дано и категория «Пик» включена; на устройстве — id уведомления (`spire_week_remind_id_v1`) | до срабатывания/отмены | §12 (local reminders, local scheduled notification IDs) | ✅ покрыто, нового разрешения нет |
| Итог недели: лестница соперников (D191, 3ed0dcf5f, 14.10 21:31) | сервер: в `users/{uid}/spire_week_results/{week}_{lang}` каждого участника пишется снимок до 6 мест комнаты — имя, ранг монеты, место, монеты недели; без uid (`functions/src/spire_finalize_core.ts` ladderFor) | бессрочно (чистки итогов нет) | §5: другие видят ник, аватар, шаги, место, результат, монеты недели; «your entry is removed from them when your account is deleted» | ⚠️ ЧАСТИЧНО: при удалении аккаунта стираются свои итоги (recursiveDelete users/{uid}) и членство в комнатах, но ИМЯ удалённого остаётся в снимках лестниц у соседей — обещание §5 не выполняется для этих снимков |
| Звуки V2 | данных нет (локальные файлы) | — | — | ✅ не касается |
| Выплата Пика в балансе | начисление монет в баланс и журнал монет | как журнал монет | §9 (coin balances, grants, reward grants, audit logs), §4 (Peak progress) | ✅ покрыто |
| Удаление гостя D189 (aadca729d) + 3 правки (c1516a23e) | гость = анонимный вход без провайдеров и без привязки; любое сомнение или ошибка чтения → обычные 14 дней; перед удалением перепроверка | — | §19/§20: гость удаляется «as soon as the deletion request reaches our servers» | ⚠️ неточно: по коду «сразу» только при подтверждённом признаке гостя, иначе 14 дней — политика обещает больше, чем делает код (абзац 2) |

## Готовые абзацы правки (EN, как сама политика; переводы — через legal:sync)

**Абзац 1 — §5, лестница итога недели (выбрать одно):**

- Вариант А (только текст, код не меняем) — после «…your entry is removed from them when your account is deleted.» добавить:
  > When a week ends, each participant's weekly summary also keeps a short snapshot of the top places in their room (nickname, coin rank, place and weekly coins, without account identifiers) so that the summary can be shown again later. These snapshots belong to other participants' Peak history and are not removed when you delete your account.

  Риск: ник — персональные данные; явное «не удаляем» при запросе на удаление — слабое место для GDPR (право на удаление).
- Вариант Б (рекомендую; код Ядра, политика не меняется): в строку лестницы писать необратимый хеш stableId и при удалении аккаунта
  заменять имя на нейтральное («Игрок») во всех снимках с этим хешем — или ограничить хранение итогов N неделями. Тогда текущий текст §5 верен.

**Абзац 2 — §19 и §20, гость (уточнить под фактический код D189):**

§19, заменить хвост пункта про гостя:
> A guest account (used without signing in with Google or Apple) cannot be restored, so its server-side data is deleted as soon as the deletion request reaches our servers and they confirm that no Google or Apple sign-in is linked to it; if this cannot be confirmed at that moment, the ordinary 14-day period applies.

§20, в абзаце про гостя заменить «for a guest account, server-side deletion starts as soon as our servers receive the request, because a guest account cannot be restored» на:
> for a guest account, server-side deletion starts as soon as our servers receive the request and confirm that no Google or Apple sign-in is linked to the account, because a guest account cannot be restored; if that cannot be confirmed at that moment, the ordinary 14-day period applies.

**Абзац 3 — §3, сторис (необязательно, для ясности):**
> The App also keeps a short list of your own recent milestones (for example a weekly Peak result, a streak milestone, a new coin rank or an achievement) on your device to show them as highlights on the Home screen. Each item expires after 7 days, at most 20 are kept, and the list is not sent to us.

## Scope

Только чтение кода и политики. Правка политики и кода — по решению владельца (политика: `legal/` + `npm run legal:sync`).

## Architecture / Security and privacy

Не менялось. Находка по лестнице — риск соответствия обещанию удаления (§5), не утечка: снимки видны только участнику той же комнаты.

## Technical debt

- Итоги недели `spire_week_results` хранятся бессрочно — к решению по абзацу 1.

## Verification

Пути и коммиты указаны в таблице; утверждения проверены по коду (grep и чтение функций), не по описаниям.

## Rollback

Не требуется (документ).
