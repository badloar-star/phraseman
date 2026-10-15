# Сайт 17.10 — чек-лист выкладки (knowlyapps.com, hosting target `knowlywww`)

> Выкладка ТОЛЬКО по прямому слову владельца в чате 17.10. Этот файл — подготовка, 15.10 ничего не выложено.
> Подготовлено на HEAD `bc35754f3`. Живой сайт сейчас = коммит `36c191b8a` (сверено curl: на `/legal/privacy/` нет «Hugging Face»,
> `/premium/` грузит `start.js?v=20261015q`, тест уровня — `i18n.js?v=20260803-1`).

## 1. Что уедет (diff `36c191b8a..HEAD -- knowly-www`, 8 файлов, коммиты 7e2077aba, 4f8256f86, ef58fe66f + коммит «юр-страницы lang=en»)

| Файл | Что меняется |
|---|---|
| `knowly-www/assets/start.js` | квиз /premium без шага с email/лидом (только оплата/подарок) |
| `knowly-www/premium/index.html` | `start.js?v=20261015r` (сброс кэша) |
| `knowly-www/english-level-test/i18n.js` | кнопка жалобы: «Нашлась ошибка?» |
| `knowly-www/english-level-test/index.html` | `i18n.js?v=20261015r` |
| `knowly-www/legal/privacy/index.html` | §9 RevenueCat при запуске; §13 голос (Apple / Whisper / Hugging Face); §16 Hugging Face; блок документа `lang="en"`, `<title>Privacy Policy · Phraseman` |
| `knowly-www/legal/privacy-ios/index.html` | те же абзацы §9/§13/§16; блок документа `lang="en"` (title уже английский) |
| `knowly-www/legal/terms/index.html` | только блок документа `lang="en"` и `<title>Terms of Use · Phraseman` |
| `knowly-www/legal/data-deletion/index.html` | только блок документа `lang="en"` и `<title>Data Deletion · Phraseman` |

Юр-страницы: текст документов — английский канон (`legal/*_en.json`); меню, подвал и `<html lang="ru">` остаются русскими,
английским помечен сам блок `.legal-document`. Генератор `npm run legal:sync` теперь ставит то же самое.
⚠️ Перед выкладкой НЕ запускать `npm run legal:sync`: он перезаписывает текст внутри `.legal-document` без готового оглавления
и якорей `id="s…"` (−~60 строк на страницу, 15.10 проверено). Если тексты политики менялись — переносить абзацы вручную.

Перед выкладкой повторить: `git diff --stat 36c191b8a..HEAD -- knowly-www` — если появились новые файлы, разобрать их до выкладки.
`git status --short knowly-www` должен быть пустым (выкладывается рабочая папка, не коммит).

## 2. Проверки до выкладки (15.10 — все зелёные)

```bash
npm run -s website:surface-contract
```
```bash
node scripts/deploy_lock_guard.mjs
```
```bash
node scripts/verify_website_surface_contract.mjs --require-security-headers
```
```bash
npx jest tests/legal_document_liquid_glass_source_contract.test.mjs --maxWorkers=1
```

Результат 15.10:
- surface-contract: `website_surface_contract_ok … layout=canonical`; lock guard rc 0; security headers ok.
- Ссылки: 29 страниц, внутренних битых 0 (файлы, `index.html`, редиректы firebase.json); внешних 35, все HTTP 200.
- Языки: переключатель сайта — **en/ru** (23 страницы, `assets/site-i18n.locales.js`); тест уровня — 6 языков (ru, en, de, es, it, fr).
  9 языков приложения (ru, uk, en, es, pt-BR, vi, id, tr, pl) на сайте **не заявлены и не появляются этой выкладкой** — это не регресс,
  текст юр-страниц один — английский (канон для сторов), обвязка сайта вокруг него русская, как и сейчас в живую.

## 3. Ссылки из приложения → адреса сайта после выкладки

| В приложении | Адрес | Есть в knowly-www | Живой сейчас |
|---|---|---|---|
| `KNOWLY_LEGAL_PRIVACY_URL` (app/config.ts:265) → `openLegalLink` | `https://knowlyapps.com/legal/privacy/` | `legal/privacy/index.html` | 200 |
| `KNOWLY_LEGAL_TERMS_URL` (app/config.ts:266) → `openLegalLink` | `https://knowlyapps.com/legal/terms/` | `legal/terms/index.html` | 200 |
| удаление данных (4 места) | `https://knowlyapps.com/legal/data-deletion/` | `legal/data-deletion/index.html` | 200 |
| инвайт (`app/referral_bootstrap.ts:13`) | `https://knowlyapps.com/phraseman/invite` | `phraseman/invite/` | 301 → со слешем |

Старые пути `/phrase/legal/privacy|terms` редиректятся в firebase.json на те же страницы. Адреса выкладкой не меняются —
приложение откроет уже обновлённый текст политики.

## 4. Выкладка (порядок)

1. Слово владельца в чате («выкладываем сайт»). Без него — стоп.
2. Проверки из п.2 ещё раз на текущем HEAD.
3. Превью-канал (живой сайт не трогает):
   ```bash
   npx firebase hosting:channel:deploy site-1017 --only knowlywww --expires 3d
   ```
4. Владелец смотрит ссылку превью: `/`, `/premium/`, `/english-level-test/`, `/legal/privacy/`, `/legal/privacy-ios/`.
5. После «ок» — перенос превью в живую версию:
   ```bash
   npx firebase hosting:clone knowlyapps:site-1017 knowlyapps:live
   ```
   (Альтернатива — полная выкладка штатным скриптом: `npm run hosting:knowly-www`; он сам гоняет surface-contract и lock guard.)

## 5. Проверка после выкладки

```bash
curl -s https://knowlyapps.com/legal/privacy/ | grep -c "Hugging Face"
```
```bash
curl -s https://knowlyapps.com/legal/privacy-ios/ | grep -c "Hugging Face"
```
```bash
curl -s https://knowlyapps.com/premium/ | grep -o "start.js?v=[0-9a-z]*"
```
```bash
for p in privacy privacy-ios terms data-deletion; do curl -s https://knowlyapps.com/legal/$p/ | grep -o '<title>[^<]*\|legal-document" lang="en"'; done
```
```bash
curl -s https://knowlyapps.com/english-level-test/ | grep -o "i18n.js?v=[0-9a-z-]*"
```

Ожидание:
- в политике «Hugging Face» больше 0 и есть абзац про RevenueCat при запуске;
- `start.js?v=20261015r` и `i18n.js?v=20261015r`;
- у каждой юр-страницы английский `<title>` (Privacy Policy / Privacy Policy (iOS) / Terms of Use / Data Deletion · Phraseman)
  и `legal-document" lang="en"`; оглавление слева на месте;
- `/legal/privacy/`, `/legal/terms/`, `/legal/data-deletion/` — 200, `/phraseman/invite` — 301→200;
- на /premium/ квиз не просит email, а сразу ведёт к оплате/подарку;
- из приложения (любая сборка) «Политика конфиденциальности» и «Условия» открываются без ошибки (`[LEGAL-LINK]` в логе).

## 6. Откат

- Быстрый: Firebase Console → Hosting → сайт `knowlyapps` → История выпусков → у предыдущей версии «Rollback».
- Из терминала, если превью старой версии ещё живо — клонировать его в live:
  ```bash
  npx firebase hosting:clone knowlyapps:<прежний-канал> knowlyapps:live
  ```
- Или вернуть файлы `knowly-www` к `36c191b8a` в рабочем дереве и выложить заново тем же порядком (п.4). Коммиты не откатывать.
