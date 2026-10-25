# Онбординг, экран «Твои данные»: правдивый `privacyBody` ×9 (Переводчик, 25.10, срочно)

Для: 5 · ВХОД (вносит в `components/onboarding/clean_onboarding_copy_core.ts`, ключ `privacyBody`), координатор.
Основание: проверка ВХОДа `docs/work/onboarding-privacy-truth-2026-10-25.md` (3f2d83b85). Данные получают обработчики:
Firebase, RevenueCat, OpenAI и другие (политика §16). Поэтому прежнее «никому не передаём» и «только чтобы сохранить
прогресс» — неправда.

Смысл на всех языках один:
1. мы не продаём данные;
2. зачем они нужны — хранить прогресс и подбирать уроки;
3. что и кому передаётся — в Политике конфиденциальности.

Без «никому», без «только», без обещаний сверх политики. Тон — тепло и честно, без шуток.
Название политики взято из соседних строк онбординга (`legalVaultPrivacy`, та же падежная форма), чтобы ссылка и текст
совпадали. vi — «Chúng tôi», как в остальном онбординге.

| Язык | `privacyBody` |
|---|---|
| ru | Мы не продаём твои данные. Они нужны, чтобы хранить прогресс и подбирать уроки; что и кому уходит — в Политике конфиденциальности. |
| uk | Ми не продаємо твої дані. Вони потрібні, щоб зберігати прогрес і добирати уроки; що й кому передається — у Політиці конфіденційності. |
| en | We don’t sell your data. We use it to save your progress and pick your lessons; what goes where is in the Privacy Policy. |
| es | No vendemos tus datos. Los usamos para guardar tu progreso y elegir tus lecciones; qué se comparte y con quién, en la Política de privacidad. |
| pt-BR | Não vendemos seus dados. Eles servem para guardar seu progresso e escolher suas lições; o que é compartilhado e com quem está na Política de Privacidade. |
| vi | Chúng tôi không bán dữ liệu của bạn. Dữ liệu dùng để lưu tiến độ và chọn bài học cho bạn; dữ liệu nào được chia sẻ và với ai có trong Chính sách quyền riêng tư. |
| id | Kami tidak menjual datamu. Data dipakai untuk menyimpan progres dan memilih pelajaranmu; apa yang dibagikan dan ke siapa ada di Kebijakan Privasi. |
| tr | Verilerini satmıyoruz. İlerlemeni saklamak ve derslerini seçmek için kullanıyoruz; neyin kime gittiği Gizlilik Politikası’nda. |
| pl | Nie sprzedajemy twoich danych. Służą do zapisywania postępów i doboru lekcji; co i komu przekazujemy — w Polityce prywatności. |

## Заголовок над этим текстом — на решение координатора

`privacyTitle`: «Твои данные — только твои» (en «Your data stays yours», es «Tus datos son solo tuyos» …). После правки тела
заголовок спорит с ним: данные уходят обработчикам, и «только твои» можно прочитать как «никуда не уходят». Безопасный вариант
без обещания:

| ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|
| Про твои данные — честно | Про твої дані — чесно | Your data, honestly | Tus datos, con honestidad | Seus dados, com transparência | Về dữ liệu của bạn — nói thẳng | Soal datamu — terus terang | Verilerin hakkında açıkça | O twoich danych — szczerze |

Если координатор оставляет прежний заголовок — тело выше всё равно правдиво и само по себе.
