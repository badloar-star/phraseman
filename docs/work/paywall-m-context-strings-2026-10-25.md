# Пейвол «Вариант М» — строки для Переводчика (ru, 25.10)

Источник: макеты docs/design/v2-app/paywall-variant-m.html и docs/design/v2-app/paywall-m-context.html
(владелец выбрал «М», журнал 5b9fb6182). Языки: uk, en, es, pt-BR, vi, id, tr, pl.

Правила: на «ты» (где есть такая форма), без рода — «твоя фраза», а не «ты сказал». `{n}` и подобное — число из кода,
склонять по числу. Цены и «7 дней» приходят из магазина, в строках это подстановки. Длина — влезает в макет: заголовок панели
до ~50 знаков (2 строки), кнопка — одна строка.

## Общий экран М

| Ключ | ru |
|---|---|
| m.notNow | Не сейчас |
| m.chart.voice.title | Сколько фраз ты скажешь вслух за месяц |
| m.chart.dialog.title | Сколько реплик ты скажешь в разговорах |
| m.chart.today | сегодня |
| m.chart.in30 | через 30 дней |
| m.chart.legendPlus | с Plus, в твоём темпе |
| m.chart.legendFreeDay | бесплатно, до {n} в день |
| m.chart.legendFreeMonth | бесплатно, {n} в месяц |
| m.chart.note.voice | Твой темп сегодня — {pace} фраз в день. Бесплатно голос ограничен тремя попытками в день. |
| m.chart.note.dialog | Как сегодня: {n} реплик за разговор. Бесплатный лимит — {limit} реплик в месяц. |
| m.road.title | Что ты скажешь через 30 дней |
| m.road.day | День {day} · урок {lesson} |
| m.road.week | Неделя {week} · {topic} |
| m.cmp.title | Бесплатно и Plus |
| m.cmp.free | Бесплатно |
| m.cmp.speak | Говорить вслух |
| m.cmp.aiDialog | Разговор с ИИ |
| m.cmp.explain | Разбор ошибок |
| m.cmp.energy | Занятия подряд |
| m.cmp.ownPhrases | Свои фразы |
| m.cmp.streakShield | Защита серии |
| m.cmp.perDay | {n} в день |
| m.cmp.perMonth | {n} в месяц |
| m.cmp.energyFree | {n}, потом ждать |
| m.cmp.unlimited | без лимита |
| m.cmp.every | каждая |
| m.cmp.asMuch | сколько тянет |
| m.plans.title | Выбери план |
| m.plans.year | Год |
| m.plans.month | Месяц |
| m.plans.perMonthApprox | ≈ {price} в месяц |
| m.plans.noTrial | без пробного периода |
| m.cta.trial | Начать {days} дней бесплатно |
| m.cta.noTrial | Оформить за {price} в год |
| m.fine.trial | Сегодня 0 €. Потом {price} в год, напомним за 2 дня. |
| m.fine.noTrial | ≈ {monthly} в месяц. Продлевается раз в год, отмена в любой момент. |
| m.links.restore | Восстановить покупки |
| m.links.terms | Условия |
| m.links.privacy | Конфиденциальность |
| m.stats.daysStreak | дней подряд |
| m.stats.phrases | фраз |
| m.stats.lessons | уроков |

## Шапки общего экрана по месту

| Ключ | ru |
|---|---|
| m.head.general.kicker | Ты на {lesson}-м уроке из {total} |
| m.head.general.title | Через месяц ты расскажешь о своём дне по-английски |
| m.head.general.sub | Курс уже ведёт тебя. Plus добавляет главное: говорить вслух и разговаривать с ИИ сколько хочешь. |
| m.head.energy.pill | Энергия 0 |
| m.head.energy.kicker | {n} занятий подряд сегодня |
| m.head.energy.title | Не останавливайся на самом интересном |
| m.head.energy.sub | С Plus энергия не кончается: занимайся, сколько тянет. И говори вслух без лимита. |
| m.head.dialog.pill | Разговор с ИИ |
| m.head.dialog.kicker | Первый разговор: {min} минут, {n} фраз |
| m.head.dialog.title | Через месяц ты поговоришь в кафе, на работе и о себе |
| m.head.dialog.sub | Бесплатно — {limit} реплик в месяц, их хватит на пару разговоров. С Plus разговаривай каждый день. |
| m.head.streak.pill | Серия {n} дней |
| m.head.streak.kicker | {n} дней подряд |
| m.head.streak.title | Пусть серия переживёт и занятой день |
| m.head.streak.sub | С Plus пропуск в один день закроется сам — до 3 раз в месяц. И говори вслух без лимита. |
| m.head.workshop.pill | Мастерская фраз |
| m.head.workshop.kicker | Урок {lesson} пройден · {n} фраз |
| m.head.workshop.title | Через месяц фразы курса будут складываться сами |
| m.head.workshop.sub | Мастерская к каждому пройденному уроку: собирай, слушай, говори вслух. |
| m.head.lock.pill | Урок {lesson} |
| m.head.lock.sub | Впереди ещё {n} уроков. Plus открывает весь курс и разговоры вслух без лимита. |

## Панели по месту

| Ключ | ru |
|---|---|
| mc.fine.trial | {days} дней бесплатно, потом {price} в год |
| mc.fine.noTrial | {price} в год · ≈ {monthly} в месяц |
| mc.later | Позже |
| mc.energy.kicker | {n} занятий подряд сегодня |
| mc.energy.title | Ты в ударе. Энергия кончилась раньше тебя |
| mc.energy.wait | Подождать |
| mc.energy.waitSub | и продолжишь бесплатно |
| mc.energy.plusBig | дальше |
| mc.energy.plusSubTrial | сейчас, {days} дней бесплатно |
| mc.energy.plusSubNoTrial | сейчас, ≈ {monthly} в месяц |
| mc.energy.saved | Занятие сохранится |
| mc.dialog.kicker | Первый разговор с ИИ |
| mc.dialog.title | {min} минут по-английски и {n} твоих фраз |
| mc.dialog.yourPhrase | Твоя фраза: |
| mc.dialog.body | Бесплатно — {limit} реплик в месяц. С Plus разговаривай каждый день и получай разбор каждой фразы. |
| mc.dialog.cta | Продолжить разговор с Plus |
| mc.streak.kicker | Серия · {n} дней |
| mc.streak.title | Месяц подряд. Пусть серия переживёт и занятой день |
| mc.streak.missed | пропуск |
| mc.streak.body | С Plus пропущенный день закроется сам — до 3 раз в месяц. Серия останется на месте. |
| mc.streak.cta | Защитить серию с Plus |
| mc.workshop.kicker | Урок {lesson} пройден · {n} фраз |
| mc.workshop.title | Собери фразы урока ещё раз |
| mc.workshop.body | Мастерская фраз: сборка с подсказками, теорией и голосом к каждому пройденному уроку. |
| mc.workshop.cta | Открыть Мастерскую с Plus |
| mc.lock.kicker | Пройдено {done} урока из {total} |
| mc.lock.title | Следующий шаг — урок {lesson} |
| mc.lock.progress | {done} из {total} |
| mc.lock.ahead | впереди {n} уроков |
| mc.lock.cta | Открыть весь курс с Plus |
| mc.refused.title | Не видим твой Plus |
| mc.refused.body | Если подписка уже оформлена, восстанови покупку. Это бесплатно. |
| mc.refused.restore | Восстановить покупки |
| mc.refused.subscribe | Оформить Plus |
| mc.refused.nf.title | Подписку не нашли |
| mc.refused.nf.body.android | В этом аккаунте Google Play Plus не оформлен. Если покупка была с другого аккаунта — войди в него и повтори. |
| mc.refused.nf.body.ios | В этом Apple ID Plus не оформлен. Если покупка была с другого Apple ID — войди в него и повтори. |
| mc.refused.nf.retry | Повторить |

Примечания:
- «Энергия 0», «Серия {n} дней» — короткие пилюли, до ~18 знаков.
- Строки mc.refused.* частично уже есть в коде (paywall_context_texts.ts, plus_server_refused) — title/body совпадают дословно.
- Фразы курса (There is a café…, I'm outside) не переводятся — это английский материал урока.
