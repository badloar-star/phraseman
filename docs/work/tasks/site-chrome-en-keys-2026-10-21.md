# Сайт: шапка и подвал на английском — каких ключей не хватает (Переводчик → 9 · САЙТ)

Governance-ID: TG-3371923419EA
Status: Ready for 9 · САЙТ
Owner: «10 · ПЕРЕВОДЧИК» (разбор и тексты); правка разметки — 9 · САЙТ (`knowly-www/**`)

## Причина

Английские значения для шапки и подвала **уже есть** в словаре сайта. Проблема в том, что на 17 страницах
стоит старая копия шапки/подвала, где у этих элементов **нет атрибута `data-i18n`** — переключатель языка
их не видит и оставляет по-русски. На остальных 13 страницах (например, `/gift/`) те же элементы уже с ключами.

## 17 страниц со старой шапкой/подвалом

```
404/index.html                      guides/how-to-learn-english/index.html
404.html                            guides/index.html
app/index.html                      guides/speaking-barrier/index.html
g/index.html                        legal/data-deletion/index.html
guides/english-15-minutes-a-day/    legal/privacy/index.html
guides/english-by-phrases/          legal/privacy-ios/index.html
guides/english-phrases-for-travel/  legal/terms/index.html
guides/how-to-improve-english-pronunciation/   russia/index.html
start/thanks/index.html
```

## Что поставить на этих страницах (ключи и en уже существуют)

| элемент (ru) | атрибут | ключ | en (уже в словаре) |
|---|---|---|---|
| кнопка «Начать бесплатно» | `data-i18n` | `v2.start` | Start for free |
| кнопка `#theme-toggle` «Светлая / тёмная тема» | `data-i18n` | `v2.themeToggle` | Light / dark theme |
| ссылка подвала «Условия» (`/legal/terms/`) | `data-i18n` | `v2.footer.terms` | Terms |
| `aria-label="Phraseman — главная"` (логотип, шапка и подвал) | `data-i18n-aria` | `v2.aria.home` | Phraseman — home |
| `aria-label="Главная навигация"` | `data-i18n-aria` | `v2.aria.nav` | Main navigation |
| `aria-label="Язык и оформление"` | `data-i18n-aria` | `v2.aria.langLook` | Language and appearance |
| `aria-label="Открыть меню"` | `data-i18n-aria` | `v2.aria.menu` | Open menu |

Проще всего — заменить старую шапку и подвал на этих 17 страницах той же разметкой, что на `/gift/`, и перенести оттуда же блок `window.I18N.en` с ключами `approved.*` / `v2.*`
(там все атрибуты на месте), а не править элементы по одному.

**Не переводить:** кнопки языков «Русский» / «English» — это названия языков на самих языках, так и должно быть.

**Важно (проверено по файлам):** английские значения этих ключей на «хороших» страницах лежат **внутри
самой страницы** (`window.I18N.en = Object.assign(…)` в конце файла), общего файла словаря для них нет
(`assets/*.js` их не содержат). Ни на одной из 17 страниц этих значений нет — поэтому **одних атрибутов мало**:
в `window.I18N.en` каждой из 17 страниц нужно добавить и значения. Вот они одной строкой:

```
'v2.start': 'Start for free', 'v2.themeToggle': 'Light / dark theme', 'v2.footer.terms': 'Terms',
'v2.aria.home': 'Phraseman — home', 'v2.aria.nav': 'Main navigation', 'v2.aria.langLook': 'Language and appearance', 'v2.aria.menu': 'Open menu'
```

## Вычитка en в общей шапке и подвале (по желанию)

Все значения верны. Мелочи:
- `approved.14` «Practise» — британское написание, остальной сайт американский («Cookie settings», «Check your level»)
  → **«Practice»**.
- `approved.24` «We are here» — заголовок раздела поддержки звучит обрывисто → **«We're here to help»**.
- В подвале два разных ключа для одной ссылки: `v2.footer.terms` «Terms» и `approved.28` «Terms of use».
  Лучше одно слово везде — **«Terms of use»** (как «Privacy» / «Data deletion» рядом).

## Scope / Architecture / Security and privacy

Только разметка шапки/подвала и тексты. Данные не затрагиваются.

## Technical debt

- Две копии шапки/подвала на сайте (старая и новая) — источник таких расхождений; стоит держать одну.

## Verification

Открыть 3–4 страницы из списка с `?lang=en`: в шапке и подвале не должно остаться кириллицы, кроме «Русский».

## Rollback

Удалить файл.
