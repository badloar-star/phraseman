# Премиум-темы grad_full_* — вычитка текстов на 9 языках (Переводчик → 4 · ТЕМЫ)

Status: Готово — правки отдать 4 · ТЕМЫ (файлы — пакет Codex, Переводчик их не правит)
Owner: «10 · ПЕРЕВОДЧИК» (координатор 24.10)

Проверены `app/theme_display_names.ts` (названия) и `app/premium_theme_copy.ts` (заголовок «… открыта», шутка, условие,
подписи). Все 6 тем есть на 9 языках. Ширина: название — строка списка 16/700 почти во всю ширину, самое длинное
(«Сингулярность», «Singularidade», «Hắc diện thạch» после правки) ≈ 125 dp — влезает. Условие — 14/600, переносится.

## Что поправить

### 1. Вьетнамский: названия оставлены по-английски (5 из 6)

| тема | сейчас vi | надо vi | title vi |
|---|---|---|---|
| grad_full_olive | Ceramic | Gốm sứ | Đã mở Gốm sứ |
| grad_full_ref_signal_lime | Obsidian | Hắc diện thạch | Đã mở Hắc diện thạch |
| grad_full_ref_storm_violet | Amethyst | Thạch anh tím | Đã mở Thạch anh tím |
| grad_full_horizon | Atmosphere | Khí quyển | Đã mở Khí quyển |
| grad_full_ref_gravity_blue | Singularity | Điểm kỳ dị | Đã mở Điểm kỳ dị |

Править и `theme_display_names.ts` (название), и `premium_theme_copy.ts` `title.vi` («Ceramic unlocked» → «Đã mở Gốm sứ» и т. д.,
по образцу уже верного «Đã mở Titan»). Подпись раздела `REWARD_SECTION.vi`: «Themes» → «Chủ đề».

### 2. «Шпиль» → «Пик» (раздел переименован владельцем 13.10; `components/spire/spire_strings.ts` `title`)

`REQUIREMENT.grad_full_titanium` (единица — `tier`, верхний уровень):

| ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|
| Высший уровень Пика | Найвищий рівень Піку | Reach the top tier of the Peak | Alcanza el nivel más alto del Pico | Alcance o nível mais alto do Pico | Đạt bậc cao nhất của Đỉnh | Capai tingkat tertinggi Puncak | Zirve’nin en üst seviyesine ulaş | Osiągnij najwyższy poziom Szczytu |

(Сейчас: «Достичь последнего Шпиля / Reach the final Spire / Pináculo / Tháp / Kule / Iglicy» — старое имя раздела.)

### 3. «Learning V2» — внутреннее имя, его видит игрок

Игрок знает курс как «курс» (вкладка «Обучение»). `REQUIREMENT.grad_full_ref_gravity_blue`:

| ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|
| Пройти весь курс | Пройти весь курс | Complete the whole course | Completa todo el curso | Conclua todo o curso | Hoàn thành toàn bộ khóa học | Selesaikan seluruh kursus | Kursun tamamını bitir | Ukończ cały kurs |

И начало шутки `joke.grad_full_ref_gravity_blue`: «Весь курс пройден.» / «Увесь курс пройдено.» / «Course complete.» /
«Curso completado.» / «Curso concluído.» / «Đã hoàn thành khóa học.» / «Kursus selesai.» / «Kurs tamamlandı.» / «Kurs ukończony.»
(остальная часть шутки без изменений).

### 4. Род в шутке «Атмосферы» (grad_full_horizon)

| язык | сейчас | надо |
|---|---|---|
| ru | Ты посмотрел дальше, чем смотрит горизонт. | Ты видишь дальше горизонта. |
| uk | Ти подивився далі, ніж бачить горизонт. | Ти бачиш далі за горизонт. |
| pl | Zajrzałeś dalej niż horyzont. | Widzisz dalej niż horyzont. |

Остальные языки без рода — без изменений.

### 5. Единица прогресса `sessions`

ru «сессий» / uk «сесій» — в приложении это «занятия»: ru «занятий», uk «занять». Остальные языки верны
(sessions / sesiones / sessões / buổi / sesi / oturum / sesji).

## Верно, без правок

Названия на ru, uk, en, es, pt-BR, id, tr, pl; шутки olive, signal_lime, storm_violet, titanium; подписи «Условие», «Прогресс»,
«Прогресс временно недоступен»; единицы days / hours / rank / tier / purchase.
