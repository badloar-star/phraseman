# Learning V2 · «Начнём с эпизода / урока» и итог теста — строки ×9 (Переводчик → Learning V2, координатор 25.10)

Status: Готово к вставке; ключи — предложение, согласовать с Learning V2
Owner: «10 · ПЕРЕВОДЧИК»

Порядок: ru, uk, en, es, pt-BR, vi, id, tr, pl. Подстановки: `{a}` — номер эпизода, `{n}` — номер урока, `{range}` — «1–4»,
`{scene}` — название сцены итога экзамена (как есть, без склонения). Слова — как в «Сезоне»: эпизод = episode/episodio/episódio/tập/
episode/bölüm/odcinek, урок = lesson/lección/lição/bài/pelajaran/ders/lekcja. На «ты», без «сессия/интро/попытка» (замок
`no_dev_jargon_visible_copy_2026_10_25`).

## Уже есть

- `beginEpisode` «Начать эпизод {n}» — `components/learning-v2/season/season_copy_card.ts`, 9 языков (верно, правок нет).
- «Готовим занятие…», «Ещё готовится…», «Занятие ещё готовится. Нажми «Продолжить» через пару секунд» — `components/lesson_prep/prep_cta_copy.ts`
  (eb3f25eca), 9 языков, дословно по `lv2-preparing-and-packs-error-copy-2026-10-25.md`.

## Новые строки

```ts
// подпись под каруселью «Сезона»
startFromEpisode: ['Начнём с эпизода {a}', 'Почнемо з епізоду {a}', "Let's start with episode {a}", 'Empecemos por el episodio {a}', 'Vamos começar pelo episódio {a}', 'Bắt đầu từ tập {a} nhé', 'Kita mulai dari episode {a}', '{a}. bölümden başlayalım', 'Zacznijmy od odcinka {a}'],
// итог экзамена главы: «{сцена}. Начнём с эпизода {a}»
examStartFromEpisode: ['{scene}. Начнём с эпизода {a}', '{scene}. Почнемо з епізоду {a}', "{scene}. Let's start with episode {a}", '{scene}. Empecemos por el episodio {a}', '{scene}. Vamos começar pelo episódio {a}', '{scene}. Bắt đầu từ tập {a} nhé', '{scene}. Kita mulai dari episode {a}', '{scene}. {a}. bölümden başlayalım', '{scene}. Zacznijmy od odcinka {a}'],
// итог теста «Не хочу с начала»
startFromLesson: ['Начнём с урока {n}', 'Почнемо з уроку {n}', "Let's start with lesson {n}", 'Empecemos por la lección {n}', 'Vamos começar pela lição {n}', 'Bắt đầu từ bài {n} nhé', 'Kita mulai dari pelajaran {n}', '{n}. dersten başlayalım', 'Zacznijmy od lekcji {n}'],
knownLessons: ['Темы уроков {range} ты уже знаешь.', 'Теми уроків {range} ти вже знаєш.', 'You already know the topics of lessons {range}.', 'Ya conoces los temas de las lecciones {range}.', 'Você já conhece os temas das lições {range}.', 'Bạn đã biết chủ đề của các bài {range}.', 'Kamu sudah tahu topik pelajaran {range}.', '{range}. derslerin konularını zaten biliyorsun.', 'Tematy lekcji {range} już znasz.'],
// короткая метка у урока, который ученик уже знает (если это бейдж/фишка)
known: ['знаешь', 'знаєш', 'you know it', 'ya lo sabes', 'você já sabe', 'đã biết', 'sudah tahu', 'biliyorsun', 'znasz'],
```

⚠ `known` переведён как короткая метка «знаешь». Если в макете это слово внутри фразы или заголовок с заглавной буквы — пришлите контекст, переделаю.

## Попутно

- `prep_cta_copy.ts` `hintUnavailable` id «Coba lagi sebentar lagi» — двойное «lagi»; при следующей правке — «Coba lagi nanti» (та же фраза во вкладке «Уроки»).
