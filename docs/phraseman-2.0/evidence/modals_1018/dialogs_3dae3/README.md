# Диалоги при шрифте 1,3 на 3dae33c31 (Сайт) — ✅ строки не слипаются и не подрезаются (СВЕРКА, 18.10 07:42–07:46; Pixel_8 AVD; font_scale 1,3; интерфейс es; бандл с рабочей копией)
## Гейт «Диалог не найден» (ai_dialog_briefing?scenarioId=zzz_bad)
- light_notfound.png: «! / No se encontró el diálogo / Este diálogo no se abrió. Vuelve a las lecciones y elige la situación otra vez.» (две строки подписи без слипания), кнопка «Volver» тёмная по центру.
- dark_notfound.png (Аврора): то же, кнопка «Volver» мятная. Заголовок и подпись целиком, ничего не подрезано.
(Для сравнения: dialogue_v2_session?scenarioId=zzz_bad даёт другое окно «Los diálogos no están disponibles» + «Volver» — ссылка из сценария Сайта идёт в briefing.)
## Сессия с ошибкой хода (dialogue_v2_session?scenarioId=social_01, dev_dialog_send=network, consent=on)
- light_session.png (до ошибки): шапка «Saludar después de co…» с усечением многоточием, «Diálogo», ⚡5 и «—/30», «Objetivo 1 de 6 / Empezar con un saludo», ответ Mila. 
- light_turn_error.png (светлая): реплика «Hi Mila! I am fine.» (читается плохо: тёмный пузырь с тёмным текстом на светлой теме — 🔴 низкий контраст), «No enviado», карточка «No llegó la respuesta. / Inténtalo de nuevo.» в 2 строки + кнопка «Reintentar»; на кадре висит плавающая клавиатурная палитра слева (это системное окно Gboard, не приложение).
- dark_turn_error_clean.png (тёмная Аврора): реплика светлым пузырём «Hi Mila! I am fine.», «No enviado», «No llegó la respuesta. / Inténtalo de nuevo.» в 2 строки + мятная «Reintentar»; строки не слипаются, не подрезаны.
- «Назад» на ошибке открывает шторку «¿Salir del diálogo?» (dark_… делал): «La conversación no se guardará: la próxima vez el diálogo empezará de nuevo.» в 3 строки, «Quedarme» / «Salir» — влезает.
## 🔴 Замечание
На светлой теме пузырь пользователя с ошибкой «Hi Mila! I am fine.» — тёмный фон (#1B1B24) и тёмный текст (светло-зелёный на тёмном, почти не читается) — на light_turn_error.png текст едва видно. В тёмной теме тот же элемент светлый и читается.
