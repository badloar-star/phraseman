# Task packet: 8 «ДЕВ» из карточного среза Макетов — dev-состояния для кадров Карточек

Governance-ID: TG-185EABEA8B3B
Status: In progress
Owner: Ядро (сессия 1)
Related: docs/phraseman-2.0/CARDS_SLICE_TRIAGE_R1_2026-10-13.md («ДЕВ»), поручение координатора 13.10

## Outcome

Разбор по коду и реестру паритета (вердикты сняты 12.10 17:22 — до правок подмен):
- cards-053 / cards-057 (чужой опубликованный набор с откликами) — подмены УЖЕ есть: `community=reset&comments=demo`,
  набор `dev_demo_community_2`; ссылки в DEV_LINKS обновлены после вердикта → только пересъёмка.
- cards-058 / cards-059 (результат отправки жалобы на отклик / набор) — УЖЕ без сети: `user_report.ts`
  `devCommunityReportOutcome` (демо-набор → «sent» без записи в прод, `fail=report_send` → «не отправилась») → пересъёмка.
- cards-071 (лимит 50 карточек) — подмена `packdraft=full` есть, ссылка есть → пересъёмка.
- cards-section-029 («Нет сети») — код верен: «Нет сети» показывается после окончания загрузки каталога; кадр снят через
  3 с, пока шла загрузка (скелет). Шаги: ждать `#flashcards-community-empty-label`. Лишняя строка «Продолжить создание
  набора» — настоящий черновик на телефоне робота от прошлых кадров (packdraft сохраняется экраном создания).
  НОВОЕ: `packdraft=none` — «черновика нет» только в памяти (настоящий черновик на телефоне не трогается и не удаляется).
- community-002 (Шпиль включён для кадра) — `spire=open` уже есть (setSpireTabDevOverride); строка ведёт в
  `/dev_spire_preview` — вердикт про конфиг относится к живой вкладке; см. ответ Авторизации.

## Scope

In scope: app/dev_cards_state.ts (`packdraft=none`), app/community_packs/communityPackDraftStorage.ts (учёт none),
store_release_stubs/dev_state/dev_cards_state_stub.ts (экспорт), тест. Строки DEV_LINKS — Авторизация.

## Architecture

No architecture change.

## Security and privacy

Только dev-подмены в памяти (`__DEV__ && !IS_STORE_RELEASE`); данные пользователя не меняются и не удаляются.

## Technical debt

- Подмены живут в памяти процесса: перезапуск приложения между ссылкой и кадром их сбрасывает.

## Verification

Тест подмены none (загрузка черновика → null без чтения хранилища); стор-заглушки (store_release_stubs_gate); babel.

## Rollback

Откат коммита.
