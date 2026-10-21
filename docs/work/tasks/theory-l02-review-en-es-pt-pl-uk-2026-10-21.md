# Теория урока 2 — вычитка en, es, pt-BR, pl, uk (Переводчик → 12 · ТЕОРИЯ)

Governance-ID: TG-3371923419EA
Status: Ready for 12 · ТЕОРИЯ
Owner: «10 · ПЕРЕВОДЧИК» (вычитка); правка файлов — 12 · ТЕОРИЯ
Источник: коммит 9c17667dc, `docs/work/theory_drafts/lesson_02_{en,es,pt-BR,pl,uk}.md`
Первая часть (vi, id, tr) — `theory-l02-review-vi-id-tr-2026-10-21.md` (8fa189228).

## Общий вывод

Тексты хорошие, тема урока (вопрос, краткий ответ, who/what/where) объяснена через родной язык верно.
Ошибок носителя: en — 4, es — 1, pt-BR — 0, pl — 3 (род), uk — 2.

---

## 0. Сквозное: «занятие» → «эпизод» (решение владельца 21.10)

§11 во всех языках говорит «из занятия»: es «de la **sesión**», pt-BR «da **sessão**», id «dari **sesi** itu»,
vi «trong **buổi học**», pl «z **zajęć**», uk «із **занять**», en «from the **session**». Курс теперь называет это «эпизод»:
en **episode**, es **episodio**, pt-BR **episódio**, vi **tập**, id **episode**, tr **bölüm**, pl **odcinek**, uk **епізод**
(полный словарь — `episode-strings-9-lang-2026-10-21.md`). То же в уроке 1, если там встречается.

Вопрос «ты/вы» для ru/uk — открыт (см. `theory-l01-review-en-es-pt-pl-uk-2026-10-21.md`, раздел 0;
в шапке `lesson_02_ru.md` «обращение на «вы»» записано правилом формата).

---

## A. Ошибки носителя (обязательно исправить)

### en
1. **«Where is he? — You want to know *his place*»** (§01, §09, §14) и «*their place*» (§09) — «his place» = «его дом, квартира».
   → **«You want to know where he is.»** / **«You want to know where they are.»**
2. §01 body «you learned to **tell things**» — так не говорят. → **«you learned to say how things are»**
3. §04 подписи ячеек «clip · who · **what like**» — как в уроке 1, «what like» не существует. → **«clip · who · what kind»**
4. Кавычки «ёлочки» во всём тексте. → **“…”**

### es
1. §09 body «pero en inglés **falta he si lo quitas**» — фраза ломается. → **«pero en inglés he no se puede quitar: Where is he?»**

### pl (мужской род в обращении к ученику — D188)
1. §01 «W lekcji 1 **uczyłeś się** opowiadać» → **«Lekcja 1 nauczyła cię opowiadać»**
2. §07 «Yes, you are zabrzmi tak, **jakbyś mówił** o rozmówcy» → **«…zabrzmi tak, jakby chodziło o rozmówcę.»**
3. §02/§12 «Nie jestem **zainteresowany**», §03 «Nie jestem **przekonany**» — только мужской род, без «/ -a».
   → **«Nie interesuje mnie to.»**, **«Nie przekonuje mnie to.»** (без рода и живее)

### uk
1. §04 tip «**англієць** почує не питання…» → **«носій англійської почує…»** (как в уроке 1)
2. §11 «із **занять**» → **«з епізоду»** (см. раздел 0)

### pt-BR
Ошибок носителя нет.

---

## B. Стоит улучшить

- **en** §14 «put the clip first and **keep it**: Is it…?» — «keep it» двусмысленно. → **«…and don't drop it: Is it…?»**
- **es** смешаны нормы: «¿Se **ha** mareado?», «¿**Has sido** tú?», «no **ha** venido», «maletas deshechas» (Испания)
  рядом с «Ya **venció** el plazo» (Латинская Америка). Для широкой аудитории — латиноамериканская норма:
  «¿Se mareó?», «¿Fuiste tú?», «¿Quién no vino?».
- **es** «¿Soy bienvenido?» (§04, §05, §12) — только мужской род. → **«¿Soy bienvenido / bienvenida?»**
- **pt-BR** §03 «Não estão **velhos** *(os pães)*» — для хлеба в Бразилии говорят **«amanhecidos»**.
- **pl** §03 tip «tylko brzmi **stanowczo**» → «tylko brzmi **bardziej** stanowczo».

## Верно без правок

pt-BR целиком (кроме B); все drill и подписи ячеек (кроме «what like» в en); es/pl/uk §09–§11;
везде верно: краткое «да» без сокращения (`Yes, I am`), `It's / He's` не начинают вопрос.

## Scope / Architecture / Security and privacy

Только тексты черновиков. Без кода. Данные не затрагиваются.

## Technical debt

- Вычитка не заменяет носителя.

## Verification

Автор применяет правки; раздел 0 — сквозная замена слова во всех уроках теории.

## Rollback

Удалить файл.
