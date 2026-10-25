# Пейвол М: окна по месту на 8 языках — вычитка голоса (Переводчик, 25.10)

Для: Дизайн, координатор. Окна: энергия, серия, замок урока, Мастерская, «Не видим твой Plus», «Разговор с ИИ».

## Что нашёл

Все ключи окон (`mc.*`) уже переведены на 8 языков в источнике сборщика
`docs/work/paywall-m-context-strings-2026-10-25.translations.md` (раздел «Панели по месту»; мой перевод 06ab83139, раздел 6 —
443cb81d0). Черновиков Дизайна там нет: каждая строка из кода окна (`PaywallMPanels.tsx`) берётся из этой таблицы.

## Что поправлено (вместе с этой запиской, в той же таблице)

| Ключ | Было | Стало | Почему |
|---|---|---|---|
| `mc.energy.kicker`, `m.head.energy.kicker` | en/es/pt/id/tr/pl: session / sesión / sessão / sesi / oturum / sesja | lesson / lección / lição / pelajaran / ders / lekcja | «session» — кухня; в ru «занятие», во всём приложении — слово урока |
| `m.cmp.energy` | Sessions in a row … | Lessons in a row … (6 языков) | то же |
| `mc.energy.saved` | Your session will be saved … | Your progress is saved / Tu avance se guarda / Seu progresso fica salvo / Progresmu tersimpan / İlerlemen kaydedilir / Postęp się zapisze | то же; и честнее — сохраняется прогресс |
| `mc.refused.title` uk | Не бачимо твій Plus | Не бачимо твого Plus | падеж после отрицания |
| `mc.refused.nf.retry` pl | Ponów | Spróbuj jeszcze raz | «Ponów» — сухо и технично, в приложении везде «Spróbuj jeszcze raz» |

`mc.dialog.title` уже без «по-английски» (c11ea00e6): «{min} минут разговора и {n} твоих фраз» ×9.

Подстановки ({n}, {min}, {days}, {price}, {monthly}, {limit}, {lesson}, {done}, {total}) во всех языках те же, что в ru.

## Дизайну

Пересобрать: `node scripts/paywall_m_copy_build.mjs` → `components/paywall/m/paywall_m_copy.generated.ts`. Сторож голоса
(`owner_locks_voice_forbidden_phrases`) держит для этого файла храповик 4 — после пересборки число не вырастет.
