# EP1 — пачка для Сверки: PM-086 «ценники энергии убраны со всех кнопок» (Дизайн, 13.10)

Что проверяем (acceptance PM-086-A1): на кнопках старта и в шапках занятий **нет цены энергии** (⚡ с числом 10/20/25 или «−N энергии»), для **Free** и для **Plus**, во всех режимах. В коде цена одна на любое занятие (`ENERGY_SESSION_COST = 1`, `app/energy_contract.ts`), текст доступности без 10/20/25 доказан пробой `tests/pm086_energy_price_text.probe.ts` (9 языков). Здесь недостающее — глазами на экране, язык **RU** (остальные 8 локалей закрыты пробой по тексту).

Правила: стандартные из `DEV_LINKS_R1.md` (force-stop → ссылка → «DEV-STATE OK»). **Free** = ссылка как написана (`plus=off&free=on`, энергия 3). **Plus** = та же ссылка, где `plus=off&free=on` заменено на `plus=on` (энергия не показывается, пилюли нет). Кнопки трат не жать. Кадр — экран **до** первого ответа: видна кнопка/шапка старта.

| # | режим (`EnergyActivityKey`) | ссылка Free | что должно быть на кадре | ссылка Plus |
|---|---|---|---|---|
| 1 | classic_lesson — урок (меню → занятие) | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&free=on&lessonintro=skip&mode=b&energy=3&overlays=off&next=/lesson_menu?id=1` | кнопка «Начать»/старт урока без ⚡N; пилюля энергии — только значок и «3» | то же с `plus=on` |
| 2 | lesson_words — слова | `phraseman://dev_state?onboarding=done&intros=seen&energy=3&plus=off&free=on&mode=b&overlays=off&next=/lesson_menu?id=1` → плитка «Слова» | шапка и кнопка тренировки слов без цены | `plus=on` |
| 3 | irregular_verbs — неправильные глаголы | `phraseman://dev_state?onboarding=done&intros=seen&energy=3&plus=off&free=on&mode=b&overlays=off&next=/lesson_irregular_verbs` | кнопка старта без цены | `plus=on` |
| 4 | preposition_drill — предлоги | `phraseman://dev_state?onboarding=done&intros=seen&energy=3&plus=off&free=on&mode=b&overlays=off&next=/preposition_drill` | кнопка старта без цены | `plus=on` |
| 5 | mistake_practice — «Мои ошибки» | `phraseman://dev_state?onboarding=done&intros=seen&mistakes=demo&studyTarget=en&energy=3&plus=off&free=on&mode=b&overlays=off&next=/mistakes_hub` → «Повторить ошибки» | кнопка запуска без цены | `plus=on` |
| 6 | flashcards — карточки (выбор набора) | `phraseman://dev_state?onboarding=done&intros=seen&cards=demo&plus=off&free=on&mode=b&energy=3&overlays=off&studyTarget=en&next=/flashcards_blitz_session?deck=saved%26sec=60` | экран тренировки без ⚡N в шапке; на шторке выбора набора — кнопка `fc-deck-start` без цены | `plus=on` |
| 7 | learning_v2_session — Learning V2 | `phraseman://dev_state?onboarding=done&intros=seen&energy=3&plus=off&free=on&mode=b&overlays=off&next=/(tabs)/home` → вкладка «Обучение» → сессия | кнопка запуска сессии без цены | `plus=on` |
| 8 | ai_dialog — диалоги | `phraseman://dev_state?onboarding=done&intros=seen&plus=off&free=on&mode=b&energy=3&dquota=reset&coinRank=6&aiConsent=granted&dev_dialog_send=ok&overlays=off&next=/ai_dialog_home` → сценка → брифинг | «Начать диалог» без цены | `plus=on` |
| 9 | diagnostic_test — диагностика | `phraseman://dev_state?onboarding=done&intros=seen&energy=3&plus=off&free=on&mode=b&overlays=off&next=/diagnostic_test` | кнопка старта без цены | `plus=on` |
| 10 | level_exam — экзамен уровня | `phraseman://dev_state?onboarding=done&intros=seen&energy=3&plus=off&free=on&mode=b&overlays=off&next=/level_exam` | кнопка старта без цены | `plus=on` |
| 11 | spire_step — ступень Пика | `phraseman://dev_state?onboarding=done&intros=seen&energy=3&plus=off&free=on&mode=b&overlays=off&next=/(tabs)/community` | «Подняться» без цены, без пилюли энергии (у Пика энергии нет) | `plus=on` |
| 12 | theory, reading, video | дойти из меню урока (`lesson_menu?id=1`, плитки «Теория», «Чтение») и из «Видео»; прямых ссылок нет | никаких ⚡N на кнопках входа | `plus=on` |

Итог для реестра: если на всех кадрах цены нет — PM-086-A1 закрывается по этим кадрам (хэш Сверки + ссылка на пачку). Если на каком-то кадре видна цена — снять кадр и вернуть мне строку с номером режима.
Примечание: режимы 5–6 и 12 зависят от демо-данных (`mistakes=demo`, `cards=demo` пишут в синхронизируемые ключи — см. правило 8 в `DEV_LINKS_R1.md`).
