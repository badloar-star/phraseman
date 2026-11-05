# Task packet: словарь классики en — перевод новых лемм на 5 локалей

Governance-ID: TG-8540C0FC63B0
Status: In progress
Owner: 10 · ПЕРЕВОДЧИК
Related epic/enabler: P1 словарь классики (координатор, 05.11), пакет en первый

## Outcome

Для 115 новых лемм английского курса (docs/work/classic_glossary_candidates/en.json) составлен перевод значения на pt-BR, vi, id, tr, pl, плюс ru/uk/en/es-ревью. Файл — docs/work/classic_glossary_candidates/en.translated.json. Успех: 115 записей, у каждой все 9 локалей, JSON парсится, glossary.json не тронут.

## Scope

In scope: docs/work/classic_glossary_candidates/en.translated.json (новый файл), этот пакет.
Out of scope: modules/classic-courses/en/glossary.json (пишет Теория после ревью), it/es/fr/de (следующими пачками), черновики Локального ИИ (ещё не выданы).

## Architecture

Файл-кандидат читает Теория; формат meaning как в modules/classic-courses/*/glossary.json. Код не меняется.

## Security and privacy

Персональных данных нет.

## Technical debt

Черновики Локального ИИ (LocalAI\swarm\out\drafts\glossary\en.json) пока не выданы: ревью будет по этому переводу. Глагольные формы и местоимения даны как словарные глоссы, не как полные переводы примеров.

## Verification

JSON парсится; 115 лемм; у каждой 9 полей значения; glossary.json не изменён.

## Rollback

Удалить файл en.translated.json (новый, без влияния на приложение).
