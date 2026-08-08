# Admin Content Studio R10B — UX design

Статус: утверждено в плане R8–R12 и уточнено перед реализацией 2026-07-13.

## Цель

Сделать генератор операционным рабочим местом: администратор выбирает направление, видит только допустимые сервером варианты, создаёт одну стадию или ограниченный план, проверяет результат предметно и при необходимости создаёт новую неизменяемую редакцию.

## Выбранный подход

Светлый одноколоночный пошаговый Studio с progressive disclosure. Он соответствует Admin UI Bible и лучше подходит для узких экранов, чем постоянный split-pane. Плотная таблица используется только для списка стадий; raw JSON скрыт в «Технические данные».

Альтернативы отклонены:

- мастер в modal: скрывает контекст и плохо подходит для длинной проверки;
- постоянные три панели: перегружает 375–768 px и ухудшает порядок клавиатуры;
- единая универсальная JSON-форма: заставляет помнить внутренние контракты и повышает риск ошибки.

## Структура

1. «Что создать»: язык, уровень, направление, одна область или диапазон, типы из capability matrix.
2. «Основа»: searchable picker только одобренных зависимостей; ID показывается вторично.
3. «Запуск»: сводка плана, конфликты до записи, одна основная кнопка создания черновиков.
4. «Стадии»: фильтры, bounded list, cursor «Показать ещё», состояние и отдельные действия.
5. «Проверка»: stage-specific представление, QA/coverage/source refs, semantic diff, причина решения или новой редакции.

## Состояния и безопасность

- Capability matrix загружается с сервера; неподдерживаемые сочетания не предлагаются и всё равно проверяются backend.
- Loading сохраняет геометрию формы; empty/error/partial имеют отдельные понятные сообщения и live region.
- Bulk не запускается browser loop: одна кнопка вызывает один server command.
- Одобрение возможно только из открытого exact preview fingerprint.
- Edit всегда создаёт новую ревизию; исходный артефакт остаётся видимым и неизменным.
- Challenge и rich Flashcard остаются draft-only, пока отсутствует runtime consumer.

## Доступность и responsive

- Реальные `label/for`, `fieldset/legend`, описания через `aria-describedby`.
- Порядок Tab совпадает с визуальным; focus-visible не скрывается.
- Кнопки имеют текст, tooltip и минимум 44 px на touch-width.
- Ошибки привязаны к секции и объявляются через `aria-live`.
- На 375 px элементы идут одной колонкой; на 768+ компактные пары полей; горизонтальная прокрутка запрещена.
- Анимации ограничены opacity/transform 150–200 ms и отключаются через `prefers-reduced-motion`.

## Модули

- `content-factory/state.js`: нормализованное состояние и pure selectors.
- `content-factory/controller.js`: callable orchestration, validation и действия.
- `content-factory/renderers.js`: общий экран и bounded lists.
- stage-specific renderers: lesson, question, flashcard, Arena и semantic diff.
- `pages/content-generator.js`: тонкая страница-композиция без бизнес-логики.

## Проверка

- Node contract tests для module boundaries и server-only callable paths.
- Visible-controls E2E: single, range, dependencies, conflicts, preview, edit, diff, pagination.
- Playwright: 375/768/1024/1440, keyboard, live states, unexpected network = 0.
- Advisor review после полного R10B состояния; деплой не входит в релиз.
