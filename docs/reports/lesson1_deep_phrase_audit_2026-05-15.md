# Углубленный аудит фраз урока 1

Дата: 2026-05-15

Источник активных фраз: `app/lesson_data_1_8_phrases_es.gen.ts`, импортируется через `app/lesson_data_1_8.ts`.

## Итог

Урок 1 в режиме изучения английского для RU/UK выглядит безопасно: 50 фраз, английские `wordsEn[]` совпадают с `english`, правильные ответы присутствуют, автоматический аудит переводов не нашел пометок.

Критичный риск есть в испанском L2-режиме: у 32 из 50 фраз `spanish` не совпадает с активными слотами `words[]`. Пользователь видит одну испанскую фразу, но правильная сборка требует другую. Это нельзя выпускать пользователю с включенным Spanish study.

## Прогоны

- `npm run lesson:qa -- --lesson 1 --summary`: 0 ошибок, 1 warning `theory_ame`.
- `npm run audit:translations`: 1600 фраз, 0 пометок.
- `npm run audit:correct-presence`: 0 проблем с наличием правильного слова.
- Ручная структурная проверка Lesson 1: 50 фраз, `wordsEn[]` vs `english` = 0 расхождений.
- Ручная структурная проверка Lesson 1: `words[]` vs `spanish` = 32 расхождения.

## Критичные расхождения ES

| ID | EN | Показывается в `spanish` | Собирается из `words[]` |
| --- | --- | --- | --- |
| lesson1_phrase_4 | She is calm | Ella está tranquila. | Ella está en casa |
| lesson1_phrase_14 | She is sad | Ella está triste. | Está contrariada |
| lesson1_phrase_16 | I am busy | Estoy ocupado. | Estoy en el trabajo |
| lesson1_phrase_17 | We are here | Estamos aquí. | Estamos en el parque |
| lesson1_phrase_18 | They are outside | Están afuera. | Están en el coche |
| lesson1_phrase_19 | She is tired | Ella está cansada. | Ella está de vacaciones |
| lesson1_phrase_21 | I am ready | Estoy listo. | Estoy en la cola |
| lesson1_phrase_22 | We are inside | Estamos adentro. | Estamos en el ascensor |
| lesson1_phrase_23 | He is strong | Él es fuerte. | Está en la cocina |
| lesson1_phrase_24 | You are kind | Eres amable. | Eres muy amable |
| lesson1_phrase_25 | It is serious | Es serio. | Es urgente |
| lesson1_phrase_26 | I am tired | Estoy cansado. | Estoy impactado |
| lesson1_phrase_27 | We are ready | Estamos listos. | Estamos en un taxi |
| lesson1_phrase_28 | She is happy | Ella está feliz. | Está casada |
| lesson1_phrase_30 | They are calm | Están tranquilos. | Están fuera |
| lesson1_phrase_31 | I am outside | Estoy afuera. | Estoy en el aeropuerto |
| lesson1_phrase_32 | We are calm | Estamos tranquilos. | Estamos en el tren |
| lesson1_phrase_33 | He is inside | Él está adentro. | Está en el baño |
| lesson1_phrase_34 | She is smart | Ella es inteligente. | Es inteligente |
| lesson1_phrase_35 | They are ready | Están listos. | Ella está en la tienda |
| lesson1_phrase_36 | I am strong | Soy fuerte. | Estoy en el gimnasio |
| lesson1_phrase_37 | We are late | Llegamos tarde. | Estamos en el autobús |
| lesson1_phrase_38 | It is near | Está cerca. | Está cerca de aquí |
| lesson1_phrase_40 | You are safe | Estás a salvo. | Estás en la lista |
| lesson1_phrase_41 | I am sick | Estoy enfermo. | Estoy en la farmacia |
| lesson1_phrase_42 | She is nervous | Ella está nerviosa. | Ella está en el hotel |
| lesson1_phrase_43 | We are okay | Estamos bien. | Estamos en el extranjero |
| lesson1_phrase_44 | They are hungry | Están hambrientos. | Tienen hambre |
| lesson1_phrase_46 | He is angry | Él está enojado. | Él está enfadado |
| lesson1_phrase_47 | They are together | Están juntos. | Están en el taxi |
| lesson1_phrase_48 | He is calm | Él está tranquilo. | Él está en la escuela |
| lesson1_phrase_50 | She is ready | Ella está lista. | Ella está nerviosa |

## Замечания по RU/UK/EN

- EN-фразы урока 1 грамматически соответствуют теме `personal pronouns + to be`.
- RU/UK переводы семантически соответствуют EN для пользовательского режима изучения английского.
- `You are ready/right/late/safe/fine` смешивает `ты/вы` по отдельным строкам. Это не ошибка, но перед релизом надо убедиться, что продукт сознательно тренирует оба значения `you`.
- `It is near` переведено как `Это близко / Це близько`. Для A1 это допустимо, но фраза без контекста звучит слегка обобщенно. Не блокер.
- `We are friends` использует `friends` в фразе, а словарь нормализует к `friend`; это нормально для словаря, но в упражнении должен оставаться plural `friends`.

## Релизный чеклист

- [ ] Открыть урок 1 в RU-интерфейсе и пройти все 50 фраз в режиме изучения английского.
- [ ] Открыть урок 1 в UK-интерфейсе и пройти все 50 фраз в режиме изучения английского.
- [ ] Для каждой фразы проверить, что подсказка RU/UK соответствует английской фразе, а не соседней строке.
- [ ] Для каждой фразы проверить, что все правильные слова доступны среди вариантов.
- [ ] Проверить, что `I am`, `You are`, `He/She/It is`, `We/They are` нигде не подменяются неверной формой `to be`.
- [ ] Проверить, что `You` в RU/UK намеренно чередует `ты/вы`, и это не выглядит как случайная ошибка.
- [ ] Проверить, что `here/outside/inside/together/near` отображаются как обстоятельства, без неверных предлогов.
- [ ] Проверить, что пользователь не видит пунктуацию как отдельный обязательный ответ в английском режиме.
- [ ] Исправить 32 ES-расхождения из таблицы выше или отключить Spanish study для урока 1 до исправления.
- [ ] После исправления ES повторить проверку `spanish` vs `words[]`: должно быть 0 расхождений.
- [ ] Повторно запустить `npm run lesson:qa -- --lesson 1 --summary`.
- [ ] Повторно запустить `npm run audit:translations`.
- [ ] Повторно запустить `npm run audit:correct-presence`.
- [ ] На устройстве пройти первые 5 и последние 5 фраз урока 1, чтобы проверить отсутствие UI-сдвигов, пустых кнопок и битой кодировки.
- [ ] Проверить кнопку `Сообщить о баге` на экране урока 1: в отчете должны уходить текущая фраза и выбранный ответ.

## Блокер перед релизом

Если Spanish study доступен конечному пользователю, урок 1 нельзя выпускать до синхронизации `spanish` и `words[]`.

Если Spanish study скрыт/выключен, урок 1 для изучения английского можно считать пройденным по фразам после ручной UI-проверки чеклиста.
