# Task packet: заготовка правок политики R1 — озвучка карточек (П9) и запись согласий

Governance-ID: TG-5C9270E33301
Status: In progress
Owner: сессия «1 · Ядро». Координатор 12.10: «заготовка правок политики, НЕ применять:
handoff/legal_r1_policy_additions.patch + .md с текстом „было → стало“ по двум абзацам. (1) П9 озвучка карточек
опубликованных наборов… (2) фраза от Авторизации про хранение выбора согласий… Через legal/*.json и legal:sync. Оба абзаца
ждут „да“ владельца».

## Outcome
docs/phraseman-2.0/handoff/legal_r1_policy_additions.md («было → стало» для §6, §10, §13 + перевод для владельца) и
legal_r1_policy_additions.patch (diff к legal/privacy_policy_en.json и legal/privacy_policy_en_ios.json, проверен
`git apply --check`). Сами legal/*.json НЕ меняются.

## Scope
In: два файла в handoff. Out: legal/*.json, legal:sync, выкладка сайта и функций cardTts*.

## Architecture
Патч собран скриптом в scratchpad: точечная замена текста в сыром JSON (без пересериализации), проверка, что изменились
ровно разделы 6, 10, 13 в обоих файлах.

## Security and privacy
Факты сверены с кодом: functions/src/card_tts_core.ts и card_tts_worker.ts (в OpenAI уходят только model/voice/input/speed,
текст карточки ≤ 300 знаков, клип адресуется хэшем текста, хранится в Firebase Storage `card-audio/v1/`);
record_age_consent_snapshot.ts (analyticsConsent, appVersion, platform) и record_ai_consent_factory.ts (состояние + время).

## Technical debt
Аудио карточек не удаляется при снятии набора (общий клип по хэшу текста) — в тексте политики сказано «хранится, пока
нужно наборам, которые его используют»; чистка осиротевших клипов — задача после R1. Дата «Last updated» правится при
применении.

## Verification
`git apply --check` патча на текущем HEAD — OK; 12 изменённых строк (3 абзаца × 2 файла).

## Rollback
`git revert` коммита с документами; патч не применён, откатывать в legal нечего.
