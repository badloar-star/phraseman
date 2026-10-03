# German Learning V2 — owner decisions

Здесь записываются только решения, которых действительно нет в уже утверждённой
области. `PENDING` не означает предполагаемый ответ и не даёт authoring-доступ.

## Уже подтверждено владельцем 2026-09-19

- Standarddeutsch с production baseline Германии.
- PRE_A1 / zero beginner → functional B1, без обещания экзаменационной
  сертификации.
- Австрийские и швейцарские standard variants — только рецептивно и с явной
  маркировкой; диалекты не смешиваются с production targets.
- Learner-facing interface locales: самостоятельные RU и UK.
- Полный собственный German grammar-first blueprint до любой сессии.
- Свежий `judge_recenter` перед и после каждой сессии.

## Применимое общее решение владельца 2026-10-03 — одна немецкая фраза на одно взаимодействие

Каждая немецкая learner-facing interaction проверяет ровно одну фразу целевого
языка и один соответствующий target. Это правило действует также в checkpoint,
review и final:

- последовательность из нескольких реплик сохраняется без потерь как отдельные
  interaction с собственными ID, evaluator/ответом, аудио и feedback;
- RU и UK сохраняют одинаковые число и порядок interaction;
- `context_gap_grammar` показывает ровно один видимый `___` и выбирает один
  естественный немецкий fragment;
- assessed target/audio/voice не содержит `;`, `；` или `|`;
- `correctText` непуст, конкретен и выведен из target своей interaction;
- dictation target точно равен `referenceAudio.transcript`.

Это самостоятельная немецкая норма. Английские grammar, lexicon, examples,
scenes, release или receipts не импортируются в German-контур; английская
owner-запись не является немецким нормативным источником.

## PENDING

### DE-OWNER-PENDING-001 — объём DACH receptive inventory

Нужно выбрать минимальный проверяемый объём явно маркированных AT/CH standard
variants внутри 32×56 blueprint. Research подтверждает границу production vs
reception, но не задаёт продуктовый объём. До решения blueprint может хранить
кандидаты, но не замораживает exact regional coverage.

### DE-OWNER-PENDING-002 — внешний B1 cross-check

Нужно подтвердить, должен ли owner map показывать отдельную cross-check матрицу
против Goethe B1 model exam рядом с более широкой functional B1 CEFR matrix.
Это не меняет уже принятое решение: курс не обещает сертификат.

Ни один пункт не имеет статуса `OWNER APPROVED`. Owner approval полного
blueprint фиксируется отдельно только для exact displayed fingerprint.
