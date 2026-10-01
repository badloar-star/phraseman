# Аудит review → done, 2026-10-01

Итог: переведено в done **0** из 90 задач в статусе review. Остаются review: 90.

## Правило перевода в done (источник: docs/phraseman-2.0/tools/validate.py, 00_START_HERE.md, AGENTS.md пакета)
done требует одновременно: все критерии приняты с evidence; kind классифицирован (не unclassified); заполнены actual_model/actual_reasoning; непустой reviewer; review_verdict = PASS; для kind=code непустой result_sha; для каждого gate задачи есть gate_evidence. Штатный скрипт: docs/phraseman-2.0/tools/mark.py (--status done --reviewer ...), но он лишь записывает поля; независимого ревью он не создаёт.

## Почему ни одна не проходит
- review_verdict пуст/не PASS у 90 из 90 (только у PM-016/PM-051/PM-... частичные вердикты вида SOURCE_ACCEPTED_RELEASE_UNVERIFIED, не PASS). PASS ставит независимый рецензент; ставить его самому себе значило бы подделать ревью.
- gate_evidence пуст у 84 из 90 (gates BASELINE_SHA_APPROVED, DOMAIN_AUDIT_AND_IMPACT_ACCEPTED, DESIGN_APPROVED_FOR_VISIBLE_CHANGES и др. никто не подтверждал).
- reviewer пуст у 76; kind=unclassified у 86; actual_model пуст у 62; kind=code без result_sha у 3 (PM-276, PM-280, PM-286).
- 19 задач имеют неприянтые критерии (NOT_MET или false): PM-039, 048, 052, 066, 073, 074, 086, 092, 093, 094, 096, 097, 129, 130, 134, 205, 253, 286, 287.
- Для остальных задач критерии приняты и evidence есть (ни одного битого SHA коммита не найдено; часть «нет файлов» в скрипте проверки — артефакт регулярки на .tsx/сокращённых путях, не подтверждённая потеря).
- Тесты не прогонялись: перевод всё равно невозможен по формальным блокерам, жечь слоты бессмысленно.

## Таблица
| Задача | Решение | Причина |
|---|---|---|
| PM-003 Сверить требования с исходной записью и шестью скриншотами | остаётся review | нет reviewer; verdict=None; kind unclassified; нет actual_model |
| PM-004 Построить полный реестр экранов и маршрутов | остаётся review | нет reviewer; verdict=None; kind unclassified |
| PM-005 Построить реестр файлов и зависимостей | остаётся review | нет reviewer; verdict=None; kind unclassified; нет actual_model |
| PM-006 Инвентаризировать фоновые работы и подписки | остаётся review | нет reviewer; verdict=None; kind unclassified |
| PM-007 Сопоставить код и реально развёрнутые cron/functions | остаётся review | нет reviewer; verdict=None; kind unclassified |
| PM-009 Инвентаризировать ассеты и тяжёлые библиотеки | остаётся review | нет reviewer; verdict=None; kind unclassified |
| PM-013 Утвердить общую модель без XP и старых уровней | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,OWNER_DECISION_RECORDED; kind unclassified; нет actual_model |
| PM-014 Разрешить связь ранга монеты и доступа к диалогам | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,OWNER_DECISION_RECORDED; kind unclassified; нет actual_model |
| PM-018 Отклонить оплату за удаление и выбрать безопасный лимит | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,PROPOSED_SCOPE_APPROVED; kind unclassified; нет actual_model |
| PM-021 Зафиксировать отказ от макета «Графит» | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED; kind unclassified; нет actual_model |
| PM-030 Убрать декоративные эмодзи и мультяшные ассеты | остаётся review | verdict=None; gates без evidence: BASELINE_SHA_APPROVED; kind unclassified; нет actual_model |
| PM-031 Заменить иконки разделов на согласованный набор | остаётся review | verdict=None; gates без evidence: BASELINE_SHA_APPROVED; kind unclassified; нет actual_model |
| PM-032 Установить allowlist движения | остаётся review | verdict=None; gates без evidence: BASELINE_SHA_APPROVED; kind unclassified; нет actual_model |
| PM-034 Распространить новый стиль на все оставляемые экраны | остаётся review | verdict=None; gates без evidence: BASELINE_SHA_APPROVED; kind unclassified; нет actual_model |
| PM-036 Удалить точку входа арены из навигации | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified; нет actual_model |
| PM-039 Убрать лишние подписи блока статистики | остаётся review | не приняты PM-039-A1,PM-039-A2; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified |
| PM-043 Разместить энергию Free в хедере | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified; нет actual_model |
| PM-044 Заменить перо статичным огнём серии | остаётся review | verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified; нет actual_model |
| PM-045 Добавить понятную кнопку системного sharing | остаётся review | verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified; нет actual_model |
| PM-046 Удалить рулетку и экраны спинов | остаётся review | verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,MIGRATION_AND_ROLLBACK_APPROVED_BEFORE_DESTRUCTIVE_CHANGE; kind unclassified |
| PM-048 Удалить раздел подарков и его эксклюзивные зависимости | остаётся review | не приняты PM-048-A2; NOT_MET PM-048-A2; нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,MIGRATION_AND_ROLLBACK_APPROVED_BEFORE_DESTRUCTIVE_CHANGE; kind unclassified; нет actual_model |
| PM-052 Удалить «новый день» и полёт рун | остаётся review | не приняты PM-052-A1,PM-052-A2; NOT_MET PM-052-A1,PM-052-A2; нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,MIGRATION_AND_ROLLBACK_APPROVED_BEFORE_DESTRUCTIVE_CHANGE; kind unclassified |
| PM-055 Удалить множители опыта и бусты | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,MIGRATION_AND_ROLLBACK_APPROVED_BEFORE_DESTRUCTIVE_CHANGE; kind unclassified |
| PM-066 Удалить неприменимые ресурсы и импорты косметики | остаётся review | не приняты PM-066-A1; NOT_MET PM-066-A1; нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,MIGRATION_AND_ROLLBACK_APPROVED_BEFORE_DESTRUCTIVE_CHANGE; kind unclassified |
| PM-073 Разработать систему дизайнов монеты | остаётся review | не приняты PM-073-A1,PM-073-A2; нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,MIGRATION_AND_ROLLBACK_APPROVED_BEFORE_DESTRUCTIVE_CHANGE; kind unclassified |
| PM-074 Подготовить короткие ранговые подписи | остаётся review | не приняты PM-074-A1,PM-074-A2; нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,MIGRATION_AND_ROLLBACK_APPROVED_BEFORE_DESTRUCTIVE_CHANGE; kind unclassified |
| PM-078 Обработать сбой/офлайн/смену аккаунта при апгрейде | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,MIGRATION_AND_ROLLBACK_APPROVED_BEFORE_DESTRUCTIVE_CHANGE; kind unclassified; нет actual_model |
| PM-079 Отделить потраченный баланс от права доступа | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,MIGRATION_AND_ROLLBACK_APPROVED_BEFORE_DESTRUCTIVE_CHANGE; kind unclassified; нет actual_model |
| PM-084 Списывать энергию ровно при начале занятия | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,MIGRATION_AND_ROLLBACK_APPROVED_BEFORE_DESTRUCTIVE_CHANGE; kind unclassified; нет actual_model |
| PM-085 Показывать короткий расход энергии на экране занятия | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,MIGRATION_AND_ROLLBACK_APPROVED_BEFORE_DESTRUCTIVE_CHANGE; kind unclassified; нет actual_model |
| PM-086 Убрать ценники энергии со всех кнопок | остаётся review | не приняты PM-086-A1; NOT_MET PM-086-A1; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,MIGRATION_AND_ROLLBACK_APPROVED_BEFORE_DESTRUCTIVE_CHANGE; kind unclassified |
| PM-089 Спроектировать миграцию старого запаса | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,MIGRATION_AND_ROLLBACK_APPROVED_BEFORE_DESTRUCTIVE_CHANGE; kind unclassified; нет actual_model |
| PM-090 Определить поведение при нуле энергии | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,MIGRATION_AND_ROLLBACK_APPROVED_BEFORE_DESTRUCTIVE_CHANGE; kind unclassified; нет actual_model |
| PM-092 Переделать каталог наборов в компактный список | остаётся review | не приняты PM-092-A2; нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified |
| PM-093 Добавить короткое описание раздела карточек | остаётся review | не приняты PM-093-A2; нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified |
| PM-094 Добавить краткие описания подразделов | остаётся review | не приняты PM-094-A2; нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified |
| PM-096 Добавить согласованную сортировку наборов | остаётся review | не приняты PM-096-A2,PM-096-A3; нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified |
| PM-097 Сохранить нейтральные поля сторон карточки | остаётся review | не приняты PM-097-A2; нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified |
| PM-108 Защитить публичные наборы и жалобы | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified; нет actual_model |
| PM-109 Сохранить админ-публикацию видео и набора | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified; нет actual_model |
| PM-111 Добавить личное избранное видео | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified; нет actual_model |
| PM-112 Добавить счётчик уникальных сохранений | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified; нет actual_model |
| PM-113 Сделать счётчик без realtime на каждой карточке | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,PROPOSED_SCOPE_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified; нет actual_model |
| PM-129 Переделать экран «Блиц» | остаётся review | не приняты PM-129-A1; нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified |
| PM-130 Переделать экран «Устно» | остаётся review | не приняты PM-130-A1,PM-130-A2; нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified |
| PM-134 Удалить неиспользуемые controls во всех режимах | остаётся review | не приняты PM-134-A2; нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified |
| PM-141 Не использовать Plus как замену рангу | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified; нет actual_model |
| PM-144 Обновить экран выполнения диалога | остаётся review | verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified; нет actual_model |
| PM-145 Согласовать AI-квоты диалогов с отсутствием Plus-gate | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified; нет actual_model |
| PM-147 Оставить 3 бесплатных урока V1 | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED; kind unclassified; нет actual_model |
| PM-148 Удалить жемчужное открытие уроков | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED; kind unclassified; нет actual_model |
| PM-150 Задать условие продвижения от 2 звёзд | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED; kind unclassified; нет actual_model |
| PM-152 Перевести экзамены на согласованную звёздную шкалу | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED; kind unclassified; нет actual_model |
| PM-154 Разработать план новых языковых курсов V1 | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED; kind unclassified; нет actual_model |
| PM-155 Создать языковой QA-процесс для 1600 фраз | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED; kind unclassified; нет actual_model |
| PM-158 Исследовать облачное распознавание голоса | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED; kind unclassified; нет actual_model |
| PM-159 Спроектировать голосовую ветку V2 | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED; kind unclassified; нет actual_model |
| PM-164 Реализовать минимальный «Привет» | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified; нет actual_model |
| PM-167 Перенести полезные социальные события в активность | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified; нет actual_model |
| PM-168 Переписать опросы в нормальном взрослом тоне | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified; нет actual_model |
| PM-171 Скрыть идеи и убрать их runtime-прогрев | остаётся review | verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified |
| PM-172 Сделать пагинацию и кеш активности | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified; нет actual_model |
| PM-180 Удалить league boost и дополнительные привилегии | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified; нет actual_model |
| PM-183 Убрать энергию и лишние параметры визитки | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified; нет actual_model |
| PM-184 Согласовать одну улучшенную визитку | остаётся review | verdict=None; gates без evidence: BASELINE_SHA_APPROVED,OWNER_DECISION_RECORDED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified; нет actual_model |
| PM-187 Сохранить системное sharing профиля | остаётся review | verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified; нет actual_model |
| PM-192 Удалить неподтверждённые диагнозы ошибок | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified; нет actual_model |
| PM-194 Дать прямую практику выбранных ошибок | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified; нет actual_model |
| PM-197 Пересобрать настройки без мёртвых пунктов | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified; нет actual_model |
| PM-198 Убрать настройки голосовых разборов Макса | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified |
| PM-199 Проверить и исправить «Очистить кеш» | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified; нет actual_model |
| PM-200 Инвентаризировать уведомления и согласовать новый allowlist | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified; нет actual_model |
| PM-201 Снять старые локальные расписания уведомлений | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified; нет actual_model |
| PM-202 Снять серверные отправки удалённых событий | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified; нет actual_model |
| PM-205 Удалить ненужные audio packs/cache warmups | остаётся review | не приняты PM-205-A1; NOT_MET PM-205-A1; нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified |
| PM-206 Удалить фанфары и лишние звуковые эффекты | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified; нет actual_model |
| PM-210 Зарегистрировать каждую оставшуюся фоновую работу | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED; kind unclassified; нет actual_model |
| PM-212 Убрать module-evaluation side effects удалённых фич | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED; kind unclassified; нет actual_model |
| PM-223 Оценить cost до и после по операциям | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED; kind unclassified; нет actual_model |
| PM-226 Определить минимальный контракт диагностики | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED; kind unclassified; нет actual_model |
| PM-227 Обеспечить видимость существенных ошибок в админке | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED; kind unclassified |
| PM-251 Ввести независимую проверку UX и текста | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,IMPLEMENTATION_AND_MIGRATION_READY; kind unclassified; нет actual_model |
| PM-253 Вести прогресс с доказательствами | остаётся review | не приняты PM-253-A1; NOT_MET PM-253-A1; нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,IMPLEMENTATION_AND_MIGRATION_READY; kind unclassified; нет actual_model |
| PM-274 Шпиль: списание энергии за ступень | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED; kind unclassified; нет actual_model |
| PM-276 Шпиль: недельный итог — очки = ступени, боты вне зон | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,IMPLEMENTATION_AND_MIGRATION_READY; code без result_sha |
| PM-279 Шпиль: экраны и хуки (логика для сессии нового стиля) | остаётся review | verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified; нет actual_model |
| PM-280 Шпиль: монеты, серия дня и задача в «Сегодня» | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED; code без result_sha |
| PM-286 Шпиль: задания на слух и голосом из Learning V2 | остаётся review | не приняты PM-286-A2; NOT_MET PM-286-A2; нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED; code без result_sha |
| PM-287 Шпиль: публикация пулов es/de/fr без проверки носителем | остаётся review | не приняты PM-287-A1; NOT_MET PM-287-A1; нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,OWNER_DECISION_RECORDED |
| PM-288 Наборы из видео: тап по фразе открывает ролик на её моменте | остаётся review | нет reviewer; verdict=None; gates без evidence: BASELINE_SHA_APPROVED,DOMAIN_AUDIT_AND_IMPACT_ACCEPTED,DESIGN_APPROVED_FOR_VISIBLE_CHANGES; kind unclassified; нет actual_model |

## Требуют владельца/устройства/координатора
- Любая задача с NOT_MET (список выше), а также задачи с gate DESIGN_APPROVED_FOR_VISIBLE_CHANGES (видимый UI, нужен показ владельцу и/или проверка на устройстве).

## Вопросы координатору
1. Кто назначается независимым рецензентом и можно ли принять «координатор (Fable) по поручению владельца» как reviewer + verdict PASS (так уже подписаны PM-035/PM-139)? Рекомендация: да, но пакетом и с записью в worklog.
2. Нужно ли подтверждать gates BASELINE_SHA_APPROVED/DOMAIN_AUDIT_AND_IMPACT_ACCEPTED для задач, закрытых по факту уже выполненной работы? Рекомендация: один общий gate_evidence-пакет (ссылка на baseline-документ) на все.
3. 88 уже стоящих в done задач сами не проходят validate.py (done без reviewer/PASS). Привести validate.py к реальной практике или подчистить done? Рекомендация: решить правило один раз, иначе validate.py всегда красный.

## Пачка 1 — независимое ревью (2026-10-01, Q75/§32)

Ревьюер: agent-reviewer (Sonnet 5.5) по поручению координатора. Задачи: PM-003, 004, 005, 006, 007, 009, 013, 014, 018, 021. Общие gates BASELINE_SHA_APPROVED / DOMAIN_AUDIT_AND_IMPACT_ACCEPTED подтверждены пакетом [GATES_COMMON_2026-10-01.md](GATES_COMMON_2026-10-01.md) (Q76); остальные gates им не закрываются. Вердикты также записаны в worklog.jsonl (kind REVIEW_VERDICT). После правок validate.py: ошибок по задачам пачки нет (остаётся 550 прежних ошибок у ранее закрытых done-задач — тема Q77).

Итог: PASS -> done: 7 (PM-003, 004, 005, 007, 009, 014, 021). Остаются review: 3 — PM-006 (FAIL), PM-013 (содержание PASS, блокер метаданных), PM-018 (содержание PASS, ждёт owner-gate).

| Задача | Вердикт | Что проверено (коммит / тест / файл) | Статус после |
|---|---|---|---|
| PM-003 | PASS | скрипт tools/pm003_source_reconcile.mjs перепрогнан: 259 требований, 216 locator-ов, расхождений 0, 68/68 пунктов расшифровки привязаны (37 anchor + 31 coverage), S12/S57 в unconfirmed со статусом NOT_CONFIRMED; коммиты 8dbda7e2a, 6a37ebc28 существуют | done (kind audit) |
| PM-004 | PASS | evidence/PM-004_route_registry.md на HEAD: 100 маршрутов, keep 70/archive 13/redesign 15/remove 2, вопросов владельцу 0; коммиты 82836a31c, ba4236df8, 3591d0115 (экран ошибок удалён, реестр обновлён); числа в evidence критерия (101/71) устарели. Оговорка: scripts/pm004_route_registry.mjs грязный от другой сессии (D140, /collectibles_screen -> remove) — перегенерировать после её коммита | done (audit) |
| PM-005 | PASS | tools/build_file_inventory.mjs прогнан в памяти на HEAD: 44593 файла, unclassified 0, категории раздельно (native/server/assets/tests/generated/vendor), status CLASSIFIED_BY_PATH_NOT_CONTENT_AUDITED, exclusions/not_done есть. Оговорка: реестр хранит сводку+правила (entries пуст), граф зависимостей не строился — заголовок «и зависимостей» критериями не покрыт | done (audit) |
| PM-006 | FAIL | сторож критерия tests/pm210_background_jobs_registry.probe.ts падает на HEAD: 3 фоновые работы не внесены в evidence/PM-210_background_jobs.md (components/completion/V2DoneScreen.tsx, hooks/use_dialogue_v2_warmup.ts, hooks/use_today_tasks.ts — появились после коммита реестра) + 7 устаревших строк реестра. Нужно дозаполнить/почистить реестр и добиться PASS пробы | review (CHANGES_REQUIRED) |
| PM-007 | PASS | evidence/PM-007_code_vs_cloud_functions.md: список 1 (код 440), список 2 (облако 516), раздел «Расхождения (НЕ удалены автоматически)»; скрипт только читает; автоудаления функций в репозитории нет (`--force` только в деплое кодбазы english-test). Облачный JSON принят как присланный владельцем, прод не проверялся | done (audit) |
| PM-009 | PASS | evidence/PM-009_asset_bundle_inventory.md: раздельно исходник/архив EAS/бандл (109.10/17.24/15.87 МБ), путь импорта на каждый каталог, 88 кандидатов. Выборочно перепроверены: 85 из 88 по-прежнему без потребителей; spiral_notepad.png и home-forest-league.webp стали require() в Главной после снимка (ce1fad0af, D137) — удалять нельзя | done (audit) |
| PM-013 | PASS по сути, в done НЕ переведена | docs/PRODUCT.md раздел «Модель прогресса без XP (PM-013)»; пробы pm013_progress_separation, coin_identity_resolver_contract, pm055_xp_multiplier_runtime_retirement — все PASS (прогон ревью); решение D64.1 (PROGRESS.md раздел 1). Блокер: модель автора не установить (evidence-коммит efe19ae9d — общий снимок без Co-Authored-By) | review (PASS, ждёт запись автора) |
| PM-014 | PASS | D124 OWNER_FINAL 2026-09-30; код a1f7514f2: legacyDialogScenarioRankRequired даёт A1->1, A2->6, B1->11, B2->14; тесты dialogue_v2_access_contract 4/4 (в т.ч. «does not make a purchase or subscription an alternative unlock path»), ai_dialog_level_lock 9/9; файлы после коммита не менялись | done (decision, result_sha a1f7514f2) |
| PM-018 | PASS по сути, в done НЕ переведена | tests/fc_custom_cards_store 11/11, pack_publish_limit_client 3/3, functions community_pack_publish_limit 7/7 (прогон ревью); PACK_PUBLISH_DAILY_LIMIT=3, лимит 50 карточек, Free 50 своих; deleteCustomCard без списаний. Блокер: owner-gate PROPOSED_SCOPE_APPROVED — D17 остаётся PROPOSED, Q55 решён координатором и не записан в 03_DECISIONS.md (Q68 ждёт); на прод не выложено | review (ждёт owner-gate) |
| PM-021 | PASS | R021 и sources/03_design_rejection.txt дословно; PhraseMan_Home_Graphite.png в git нет; gate DESIGN_APPROVED_FOR_VISIBLE_CHANGES стоит на 107 задачах; «graphite» в docs/design/v2-app — токен тёмной темы, не отклонённый макет | done (decision) |

Общая оговорка по полю actual_reasoning: уровень рассуждения в git не фиксируется. У PM-003/005/014/021 записано «unrecorded» (модель установлена по Co-Authored-By); у PM-004/007/009 сохранено прежнее «high» из аудита 24.09. Если координатор требует известный уровень — эти задачи надо вернуть в review (вопрос Q-пачки 1).

Инструменты: mark.py НЕ использовался — он перезаписывает весь tasks.json в другом форматировании (правка бы дала диффом ~600 КБ вместо ~240 строк) и не умеет kind/gate_evidence. Блоки 10 задач заменены точечно скриптом из scratchpad с сохранением CRLF. render_views.py не запускался в итоге: он падает на KeyError 'D131' (в requirement_ids задачи есть D-номер, которого нет в requirements.json) — карточки tasks/*.md у изменённых задач остаются прежними, перегенерировать после починки генератора.


## Пачка 2 — независимое ревью (2026-10-01, Q75/§32)

Ревьюер: agent-reviewer (Sonnet 5.5) по поручению координатора. Задачи: PM-006 (повторно), 013 и 018 (повторно, по §34), 030, 031, 032, 034, 036, 043, 044, 045, 046, 055. Общие gates BASELINE_SHA_APPROVED / DOMAIN_AUDIT_AND_IMPACT_ACCEPTED — пакетом [GATES_COMMON_2026-10-01.md](GATES_COMMON_2026-10-01.md); DESIGN_APPROVED_FOR_VISIBLE_CHANGES и MIGRATION_AND_ROLLBACK_APPROVED_BEFORE_DESTRUCTIVE_CHANGE пакетом НЕ закрыты. Вердикты — также в worklog.jsonl (REVIEW_VERDICT). validate.py: ошибок по задачам пачки нет. Решения §34: Q78 («unrecorded» для actual_reasoning принято), Q79 (PM-013: «unknown, снимок нескольких сессий»), Q80 (Q55 записан как D141).

Итог: PASS -> done: 5 (PM-006, PM-013, PM-018, PM-030, PM-031). PASS по сути, ждут owner-gate (остаются review): 4 (PM-036, 043, 044, 045 — DESIGN_APPROVED_FOR_VISIBLE_CHANGES). FAIL / CHANGES_REQUIRED: 4 (PM-032, 034, 046, 055).

| Задача | Вердикт | Что проверено | Статус после |
|---|---|---|---|
| PM-006 | PASS | `npx tsx tests/pm210_background_jobs_registry.probe.ts` -> PASS, 94 строки / 117 мест / 0 предупреждений; 3 новые работы внесены, 7 устаревших убраны (7e6fa6bdb); колонки reads/writes/cache/cancellation на месте, unknown в 3 строках с причиной | done (audit) |
| PM-013 | PASS | пробы pm013_progress_separation, coin_identity_resolver_contract, pm055_xp_multiplier_runtime_retirement — PASS; gates BASELINE (пакет) и OWNER_DECISION_RECORDED (D64.1) с evidence; модель автора «unknown, снимок нескольких сессий» (Q79) | done (documentation) |
| PM-018 | PASS | D141 в 03_DECISIONS.md совпадает с кодом: functions/src/pack_publish_limit.ts (лимит 3, ключ суток UTC, без ветки по Plus), community_packs.ts:559/576 — слот в транзакции создания заявки, у админа null, повтор по submissionKey слот не тратит; тесты клиента 14/14 (fc_custom_cards_store 11 + pack_publish_limit_client 3), сервера community_pack_publish_limit 7/7; result_sha 734800ed0. community_packs.ts в дереве грязный от другой сессии (удаление подарков), строки лимита не затронуты. На прод не выложено | done (code) |
| PM-030 | PASS | decorative_emoji_retired_contract 11/11; скан app/components: декоративных эмодзи нет, кроме онбординга (решение владельца «не трогаем») и 🚫 на экране бана; поле icon каталога достижений не рендерится (экран на Ionicons); решение координатора по контенту/пушам в PROGRESS.md | done (design) |
| PM-031 | PASS | assets book_stack/chat_bubbles/notecard_stack в git, плитка «Диалоги» на chat_bubbles (home.tsx:3394), a11y-подписи в HomeV2FeatureTiles, таббар только Ionicons, новых библиотек нет. Визуально глазами не проверялось | done (design) |
| PM-032 | FAIL | сторож 2/2 зелёный, но A1 не выполнен по решению владельца 01.10 №2: вечные циклы остаются у HomeSectionPulseButton, ScreenGradient (6), V2Backdrop | review (CHANGES_REQUIRED) |
| PM-034 | FAIL | матрица STATE_CHECKLIST 768 строк (746 ✅, 2 ❌) — самопроверка; хвост документа с 🟠/❌ противоречит шапке; эмуляторный проход «в очереди» | review (CHANGES_REQUIRED) |
| PM-036 | PASS по сути | d83_arena_client_deleted.probe PASS; native-intent ведёт /arena* на Главную | review (owner-gate DESIGN_APPROVED) |
| PM-043 | PASS по сути | EnergyBar/Home на общем useEnergy, у Plus скрыто и без списания; energy_first_question_gate 11/11 | review (owner-gate DESIGN_APPROVED) |
| PM-044 | PASS по сути | streak_flame_fill_contract 4/4 | review (owner-gate DESIGN_APPROVED; шкала принята координатором, не владельцем) |
| PM-045 | PASS по сути | handleShare: только Share.share(имя, звание, подпись), XP нет; отдельного теста на шаринг нет | review (owner-gate DESIGN_APPROVED) |
| PM-046 | FAIL | клиентские наборы 3 файла 6/6, пробы retirement PASS; НО server_remote_event_allowlist.probe красный: токен gifts_to_coins (миграция Q12) — регресс после evidence; owner-gate MIGRATION не закрыт | review (CHANGES_REQUIRED) |
| PM-055 | FAIL | PM-055-A1 переведён в NOT_MET: evidence признаёт «частично»; xp_boost_tokens_compat_only.probe красный (app/cloud_sync.ts, app/gifts_to_coins_table_v1.ts, functions/src/accounts_v2_migration/inventory.ts); owner-gate MIGRATION не закрыт | review (CHANGES_REQUIRED) |

Оговорки: actual_reasoning для done-задач — «unrecorded» (Q78); у PM-006 сохранено «high» из аудита. mark.py/render_views.py не запускались; правка tasks.json точечная, с сохранением CRLF. Две красные пробы (PM-046, PM-055) — следствие миграции подарков в монеты (Q12): либо расширить их белые списки осознанно, либо убрать токены.


## Пачка 3 — независимое ревью (2026-10-01, Q75/§32)

Ревьюер: agent-reviewer (Sonnet 5.5) по поручению координатора. Задачи: PM-046, 055 (повторно), 078, 079, 084, 085, 089, 090, 108, 109, 111, 112. Общие gates BASELINE_SHA_APPROVED / DOMAIN_AUDIT_AND_IMPACT_ACCEPTED — пакетом [GATES_COMMON_2026-10-01.md](GATES_COMMON_2026-10-01.md). У всех 12 задач есть ещё один gate, пакетом не закрытый: MIGRATION_AND_ROLLBACK_APPROVED_BEFORE_DESTRUCTIVE_CHANGE (PM-046…090) или DESIGN_APPROVED_FOR_VISIBLE_CHANGES (PM-108…112), поэтому по §32 никто не переведён в done. Тесты гонялись под слотом светофора. Вердикты — также в worklog.jsonl (REVIEW_VERDICT). Использован mark.write_task_block (меняются только блоки задач, CRLF сохранён); render_views.py не запускался.

Итог: PASS -> done: 0. PASS по сути, ждут owner-gate (остаются review): 11 — PM-046, 078, 079, 084, 085, 089, 090 (MIGRATION), PM-108, 109, 111, 112 (DESIGN). FAIL: 1 — PM-055 (критерий A1 не принят).

| Задача | Вердикт | Что проверено | Статус после |
|---|---|---|---|
| PM-046 | PASS по сути | пробы server_remote_event_allowlist, level_gift_client/server_retirement, pm048_gift_section_retirement — PASS на HEAD; home_spin_entry_contract + level_spin_star_callable_retired PASS. Коммит 6e73af547 разрешает в пробе ровно один экспорт giftsToCoinsMigrationReport — админ-отчёт миграции подарков в монеты (пишет одну строку-счётчики, XP/событий/наград не выдаёт). Замечание: комментарий «только чтение» в пробе неточен (функция пишет отчёт) | review (ждёт Q83) |
| PM-055 | FAIL (A1) | пробы xp_boost_tokens_compat_only (3178 файлов, 6/6 compat), pm055_xp_multiplier_runtime_retirement, pm055_xp_surface_retirement — PASS; три добавленных compat-файла (cloud_sync — стирание старых ключей, gifts_to_coins_table_v1 — оценка в монетах, accounts_v2_migration/inventory — опись) — только совместимость, нового источника XP нет. Но A1 остаётся accepted=false: evidence признаёт «частично», закрытие кеша/notifications/остальных источников не показано | review (CHANGES_REQUIRED; плюс Q83) |
| PM-078 | PASS по сути | coin_rank_upgrade.test PASS, guard_behavior (node:test) 4/4, probe coin_rank_ceremony_once PASS; публикация ранга после multiSet | review (gate MIGRATION) |
| PM-079 | PASS по сути | coin_rank_upgrade.test + dialogue_v2_access_contract PASS | review (gate MIGRATION) |
| PM-084 | PASS по сути | energy_first_question_gate.test PASS (один operationId, без повторного списания, неготовый урок не списывает); source-level | review (gate MIGRATION) |
| PM-085 | PASS по сути | чтение AnimatedEnergyNumber.tsx: одна анимация на операцию, reduce motion — сразу; теста нет | review (gate MIGRATION) |
| PM-089 | PASS по сути | D98 OWNER_FINAL, раздел ENERGY.md, energy_cap_d98_migration.test PASS | review (gate MIGRATION: откат/необратимость обрезки >5) |
| PM-090 | PASS по сути | pm090_zero_energy_no_forced_ads_contract + energy_first_question_gate PASS; NoEnergyModal показывает время до следующей единицы | review (gate MIGRATION) |
| PM-108 | PASS по сути | functions client_reports/video_phrases/video_save_counts 43/43; community_pack_private_by_default PASS; коммит 7b64aa008. community_packs.ts грязный от другой сессии | review (gate DESIGN) |
| PM-109 | PASS по сути | video_phrases.test PASS; коммит 84e03f439 | review (gate DESIGN) |
| PM-111 | PASS по сути | video_favorites + video_favorites_rules_contract PASS; коммит af528a897; UI — зона «Дизайн», деплой правил — владелец | review (gate DESIGN) |
| PM-112 | PASS по сути | video_save_counts.test PASS; правило «клиент только читает» подтверждено; коммит af528a897 | review (gate DESIGN) |

Оговорки: actual_model для задач без записи проставлено «unknown, снимок нескольких сессий», actual_reasoning «unrecorded» (§34). result_sha проставлен только там, где есть отдельный коммит (PM-046, 108, 109, 111, 112); у PM-078…090 код входил в общие снимки. Работоспособность на устройстве/в проде не проверялась.


## Пачка 4 — независимое ревью (2026-10-01, Q75/§32)

Ревьюер: agent-reviewer (Sonnet 5.5) по поручению координатора. Задачи: PM-113, 141, 144, 145, 147, 148, 150, 152, 154, 155. Общие gates BASELINE_SHA_APPROVED / DOMAIN_AUDIT_AND_IMPACT_ACCEPTED — пакетом [GATES_COMMON_2026-10-01.md](GATES_COMMON_2026-10-01.md). Тесты гонялись под слотом светофора. Вердикты — также в worklog.jsonl (REVIEW_VERDICT). Запись в tasks.json — через mark.write_task_block; render_views.py не запускался. validate.py: ошибок по задачам пачки нет (550 прежних — тема Q77).

Итог: PASS -> done: 6 (PM-147, 148, 150, 152, 154, 155). PASS по сути, ждут gate (остаются review): 4 — PM-113 (PROPOSED_SCOPE_APPROVED + DESIGN), PM-141, 145, 144 (DESIGN). FAIL: 0.

| Задача | Вердикт | Что проверено | Статус после |
|---|---|---|---|
| PM-113 | PASS по сути | клиентские video_save_counts_client + video_favorites + video_favorites_rules_contract PASS, functions video_save_counts.test PASS; onSnapshot в app/video_*.ts нет, один документ video_save_counts/public, TTL 6 ч; VIDEO.md «Факт реализации» считает стоимость; af528a897, 790e24a99. D19 (OWNER_FINAL) утверждает фичу, но схема «без realtime, раз в 6 ч» остаётся предложением | review (gates PROPOSED_SCOPE_APPROVED, DESIGN; DESIGN по сути неприменим — логика без UI) |
| PM-141 | PASS по сути | D124; dialogue_v2_access_contract PASS; сравнение Free/Plus на пейволе (PaywallBenefitComparison: «30 в месяц» / безлимит); a1f7514f2 | review (gate DESIGN, по сути неприменим) |
| PM-144 | PASS по сути | dialogue_v2_session_route + dialogue_v2_session_screen PASS, source-контракт макета 8/8; перевод, разбор, голос собеседника проброшены; на устройстве не проверялось | review (gate DESIGN применим) |
| PM-145 | PASS по сути | functions dialog_quota_contract + premium_dialog_plus_daily_cap + dialogue_reply_access_contract 22/22; D111 (Free 30/мес), D123 (потолок Plus 300/сутки); premium_dialog.ts грязный от другой сессии (комментарий), не влияет | review (gate DESIGN, по сути неприменим) |
| PM-147 | PASS | lesson_lock_system (3 теста PM-147) + legacy_free_lesson_access + monetization_policy PASS; D122; 8cb088357, da298f561 | done (code) |
| PM-148 | PASS | покупка за жемчуг удалена целиком (модуль и флаг сняты в efe19ae9d), buyLessonWithPearls нигде не вызывается; d70_pearls_removed.probe PASS, lesson_plus_pearl_action/gate_modal PASS, купленные ранее уроки читаются (lessons_pearl_unlock_storage). Прежние тесты retired/plus_gate из evidence удалены вместе с модулем | done (code, 4ce929532) |
| PM-150 | PASS | resolveLessonAccess: premium_required раньше progress_required; buildPremiumLessonUnlocks требует 2★ у предыдущего и для Plus; тесты PASS | done (code, da298f561) |
| PM-152 | PASS | lesson_star_scale 4/4, пороги по D125 (зачёт уровня 2★/60%, Лингман 100%, сдача 70%); открытые зачёты не пересчитываются. НАЙДЕНО: tests/unit/lesson_lock_system.test.ts ждал порог 4.5 и падал после D125 — исправлено коммитом e4a420a91, 27/27 | done (code, e9fb1e924) |
| PM-154 | PASS | COURSES_FUTURE_PLANS.md: 1600 как ориентир, ступени A1–B2 (границы 9/19/29 совпадают с кодом), реестры лексики/форм, повторы, редактор, без облачного STT; пилотный язык — за владельцем | done (documentation) |
| PM-155 | PASS | чек-лист из 6 проверок, выборка 100%/10%, блокировка урока; процесс ещё не запускался (критерий этого не требует) | done (documentation) |

Где gate DESIGN_APPROVED_FOR_VISIBLE_CHANGES по сути неприменим (нет видимого UI, только правила/политика/логика): PM-113, PM-141, PM-145. Применим: PM-144 (экран сессии диалога).

Оговорки: actual_model «unknown, снимок нескольких сессий», actual_reasoning «unrecorded» (§34). result_sha у PM-144 не проставлен (серия из 6 коммитов). Работоспособность на устройстве/в проде не проверялась.



## Пачка 5 + закрытие по подписанному gate MIGRATION + D151 (2026-10-01, Q75/§32)

Ревьюер: agent-reviewer (Sonnet 5.5) по поручению координатора. Общие gates — [GATES_COMMON_2026-10-01.md](GATES_COMMON_2026-10-01.md). Подпись gate MIGRATION в [GATES_MIGRATION_2026-10-01.md](GATES_MIGRATION_2026-10-01.md) проверена (строка «Подпись координатора: ПОДПИСАНО», коммит 8d23c297c). Тесты — под слотом светофора. Запись в tasks.json — mark.write_task_block (CRLF сохранён); render_views.py не запускался; validate.py — ошибок по задачам этой пачки нет.

Итог: в done переведено 17 задач из 20 (7 по gate MIGRATION + PM-055, 2 по D151, 8 из пачки 5). Остаются review: 3 (PM-168, PM-171, PM-184 — ждут DESIGN).

### A) Закрытие по подписанному gate MIGRATION
| Задача | Вердикт | Основание | Статус |
|---|---|---|---|
| PM-046 | PASS | M1; пробы level_gift_client/server_retirement, pm048, server_remote_event_allowlist PASS; home_spin_entry + level_spin_star_callable_retired PASS | done (code, 72d217bfc) |
| PM-078 | PASS | M3; coin_rank_upgrade.test PASS, guard_behavior 4/4 (node:test) | done (code, 276fc003f) |
| PM-079 | PASS | M3; coin_rank_upgrade + dialogue_v2_access_contract PASS | done (code, 276fc003f) |
| PM-084 | PASS | M4; energy_first_question_gate 10/10 | done (code, efe19ae9d) |
| PM-085 | PASS | M4; чтение components/energy/AnimatedEnergyNumber.tsx (одна анимация на operationId, reduce motion); теста нет | done (design) |
| PM-089 | PASS | M4; energy_cap_d98_migration PASS | done (decision) |
| PM-090 | PASS | M4; pm090_zero_energy_no_forced_ads_contract PASS | done (code, 8cb088357) |
| PM-055 | PASS, A1 принят | аудит PM-055_xp_multiplier_completeness (6 измерений) подтверждён: xp_boost_tokens_compat_only (3183 файла, compat 6/6), pm055_xp_multiplier_runtime_retirement, pm055_xp_surface_retirement PASS; ни один экран не передаёт multipliers в ResultsSequence; старые ключи стираются; super_sunday_retired_d147 PASS | done (code, efe19ae9d) |

У всех нет иных незакрытых gates (PM-085 без DESIGN в списке gates), все критерии приняты.

### B) D151 (энергии и «Поделиться» на Главной нет)
| Задача | Что сделано | Статус |
|---|---|---|
| PM-043 | A1 переписан: энергия на Главной V2 не показывается (D151), на занятиях единый useEnergy; evidence — сторож home_v2_no_energy_no_share_owner_2026_10_01 3/3 + DESIGN_GATE_OWNER_REVIEW «Отклонено владельцем»; DESIGN закрыт D151 | done (design) |
| PM-045 | A1 переписан: «Поделиться» в визитке (PlayerProfileModal handleShare, кнопка), в шапке Главной нет; DESIGN закрыт D151 | done (design) |

### C) Пачка 5
| Задача | Вердикт | Что проверено | Статус |
|---|---|---|---|
| PM-158 | PASS | COURSES_FUTURE_PLANS.md, раздел PM-158; платный STT не подключён (expo-speech-recognition, max_voice_config запломбирован) | done (documentation) |
| PM-159 | PASS | раздел PM-159; порог зачёта — вопрос Q-G владельцу, критерии не блокирует | done (documentation) |
| PM-164 | PASS | 7b041cb73/7232941b9: functions friend_activity_likes + shard_survey_core 78/78; UI нет (только functions, firestore.rules) — DESIGN N/A | done (code) |
| PM-167 | PASS | d373a9e1c: activity_feed_pagination_cache, friend_social_notification_types, user_notifications_account_cache PASS; без UI — DESIGN N/A | done (code) |
| PM-172 | PASS | тот же коммит; страница 50 на старте, курсор, пол force 30 с, onSnapshot нет; «Показать ещё» — Дизайну | done (code) |
| PM-180 | PASS | git grep: остатки только совместимость; server_remote_event_allowlist PASS; A2 — PM-180_paid_history_accounted (D58/D70/D103); UI нет — DESIGN N/A | done (audit) |
| PM-183 | PASS | НАЙДЕНО: tests/energy_contract.test.ts не компилировался (TS2353 после 0aa34329b) — исправлен, 17/17; в карточке нет энергии/осколков — DESIGN N/A | done (code, 0aa34329b) |
| PM-168 | PASS по сути | survey_library_editorial_guard PASS; правит admin/v2/legacy.html (видимые тексты опросов) | review (ждёт DESIGN) |
| PM-171 | PASS по сути | pm171_ideas_section_retired.probe PASS; правит settings.tsx/_layout; серверная правка shard_survey_core.ts не задеплоена | review (ждёт DESIGN) |
| PM-184 | PASS по сути | profile_card_pro_legacy_grant 3/3, цена из PM-185, 5 коммитов существуют; gate OWNER_DECISION_RECORDED закрыт D73/D114; видимая визитка «Про»; анимация перехода не проверена в эмуляторе | review (ждёт DESIGN) |

Оговорки: actual_model «unknown, снимок нескольких сессий», actual_reasoning «unrecorded» (§34). Деплой функций/правил (PM-164, PM-171), Remote Config gifts_to_coins_enabled=false на проде и работа на устройстве не проверялись — владельцу.

## Пачка 6 + PM-171/184 + PM-168 тон (agent-reviewer, Sonnet 5.5, 01.10)

Итог: в done 10 задач (PM-171, 184, 187, 192, 194, 198, 199, 200, 201, 202). Остаются review: PM-168 (ждёт подписи координатора по тону), PM-197 (ждёт DESIGN), PM-206 (A2 NOT_MET). validate.py по этим задачам ошибок не даёт.

| Задача | Вердикт | Основание | Статус |
|---|---|---|---|
| PM-171 | PASS | pm171_ideas_section_retired.probe PASS (2378 файлов); DESIGN — требование владельца «скрыть идеи», только удаление; сервер shard_survey_core — выкладка с релизом 2.0 (DEPLOY_NOW Шаг 2), владельцу | done (code, 41648d48d) |
| PM-184 | PASS | D73/D114 есть и совпадают по смыслу; 5 коммитов существуют; profile_card_pro_legacy_grant 3/3; анимацию на устройстве — владельцу | done (code, ace685121) |
| PM-187 | PASS | PlayerProfileModal.tsx:212-217 — Share.share, в сообщении имя/звание/био, без email/uid/ошибок; DESIGN — D151 | done (design) |
| PM-192 | PASS | 4 теста ошибок PASS (25/25 вместе с PM-194/199); DESIGN N/A (eb8719cb0 убирает ярлык «Арена»). mistakes_hub_contract красный — не по PM-192 (снят gate_mistake_practice_premium в снимке) | done (code, eb8719cb0) |
| PM-194 | PASS | session_target_isolation 4/4, projection PASS; 348b71f45 — только тест, DESIGN N/A | done (code, 348b71f45) |
| PM-197 | PASS по сути | settings_root_liquid_glass 10/10, settings_notifications_liquid_glass 10/10; видимый экран по макету profile.html#PRF-01, макета в docs/design/v2-app нет, одобрения не найдено | review (ждёт DESIGN) |
| PM-198 | PASS | max_bundle_detachment 6 checks; fc_voice_prefs/settings_sound_controls/flashcards_audio PASS; только удаление пункта (пломба MAX) | done (code, ddf8e551e) |
| PM-199 | PASS | cache_reset_contract 9/9; DESIGN N/A (ветка результата, состояние failed уже было) | done (code, 0aecaf24c) |
| PM-200 | PASS | pm200_retired_notification_types PASS (2378); tap routes, triggers PASS. Вне критериев: notifications_weekly_recap.test.ts не компилируется (импорт удалённого weekly_xp) | done (audit) |
| PM-201 | PASS | notifications_retired_local_cancel 5/5 | done (code, efe19ae9d) |
| PM-202 | PASS | allowlist, deploy_targets, weekly_xp_cron, decision_atlas PASS; server_retired_scheduler_surface была красной из-за Q13 (levelSpinStarGrant — живой кошелёк), список живых callable дополнен, PASS | done (audit) |
| PM-206 | CHANGES_REQUIRED | A1 PASS; A2 NOT_MET: 2 осиротевших звука (pm.energy.refilled, pm.customization.applied), красные sound_events_contract (98≠97), sound_event_call_sites_contract, reward_sound_surfaces_contract | review |
| PM-168 | тон проверен | 10 из 51 опроса переписаны, сторож 53/53; таблица — в DESIGN_GATE_OWNER_REVIEW.md, «PM-168 — ревью тона»; подпись координатора ожидается | review |

Побочно исправлено: tests/server_retired_scheduler_surface.probe.ts (LIVE_CALLABLES), admin/v2/legacy.html (10 текстов опросов). Не проверялось: выкладка функций/правил, устройство.
