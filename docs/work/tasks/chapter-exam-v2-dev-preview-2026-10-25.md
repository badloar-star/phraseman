# Task packet: dev-ссылки на все состояния экзамена главы v2 (для склейки Сверки)

Governance-ID: TG-7E81ED29F56C
Status: In progress
Owner: Learning V2 session; задача координатора 25.10 (от склейки зависит, будет ли экзамен v2 включён в OTA)

## Outcome

Сверка снимает каждое состояние экрана экзамена v2 главы 1–3 по ссылке, не проходя экзамен на тестовом аккаунте (запись
экзамена запрещена). Состояния: старт (первый вопрос), вопрос каждого типа (сказать / ответить / найти ошибку, плюс «или
напиши»), ответ верно / с опечаткой / неверно, пауза пересдачи, итог «сдал» и «не сдал», разбор ошибок, повтор тем.

## Scope

- app/dev_chapter_exam_v2_preview.tsx — dev-маршрут `/dev_chapter_exam_v2_preview?state=…&chapter=1|2|3&theme=dark|light`.
- components/learning-v2/exam_v2/chapter_exam_v2_dev_presets.ts — чистая функция «состояние → снимок данных» из настоящего банка.
- ChapterExamV2Run.tsx — необязательный `devPreset`: состояние берётся из снимка, подготовка, энергия и запись не вызываются.
- ChapterExamV2Question.tsx — необязательный `initialAnswerText`: вопрос сразу показывает проверенный ответ.
- Тест-сторож.

## Architecture

Экран превью — тот же ChapterExamV2Run, что идёт в бой (шапка, прогресс, вопрос, итог). Снимок собирается из настоящих
банков (`chapterExamV2BankFor`), подбор вопросов — `selectChapterExamV2Items`, итог — `scoreChapterExamV2`. Боевой вход
`devPreset` не передаёт, поведение боя не меняется. Маршрут с префиксом dev_ не попадает в стор-бандл (regex router.ctx,
сторож store_bundle_dev_routes_guard), плюс `ENABLE_DEV_TOOLS && !IS_STORE_RELEASE`, иначе — Главная.

## Security and privacy

Сеть, AsyncStorage и энергия не трогаются. Тема ссылкой меняется только в памяти процесса (dev_appearance_override).

## Technical debt

Нет. Снимок пересобирается из банков, отдельных моков нет.

## Verification

Тест: каждое состояние даёт ожидаемую фазу и данные; боевой код (chapter-exam.tsx) не передаёт devPreset и не импортирует
пресеты; маршрут уводит на Главную вне dev.

## Rollback

Revert коммита; боевой путь не затронут.
