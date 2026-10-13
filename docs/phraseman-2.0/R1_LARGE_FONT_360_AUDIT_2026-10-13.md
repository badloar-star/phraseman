# R1 №4 — крупный шрифт ×1,3 и узкий экран 360 dp: аудит по коду (13.10)

Исполнитель: сессия «4 · ТЕМЫ 2.0». Governance-ID: TG-136FC9D9AF6E. Метод: статический скан экранов R1 (Главная, Уроки/итог, Шпиль, Диалоги, Карточки, Настройки, Пэйволы) на фиксированные `height` у блоков с подписью, `numberOfLines`, ряды без `flexWrap`, `adjustsFontSizeToFit`. Эмулятор занят роботом Сверки, поэтому визуальная проверка — пачка FS1 (ниже).

## Что нашлось
- `adjustsFontSizeToFit` в экранах R1 не используется (два вхождения в `PaywallProofCards.tsx` — комментарии «было … стало перенос»).
- Иконки-плитки и круглые кнопки с фиксированными `width/height` (back, close, монета, плитка режима) — безопасны, подписи внутри нет. Их не трогал.
- Реальный риск — **кнопки и плашки с переводимой подписью на фиксированной `height`**: при переносе подписи (tr/pl/vi/id/pt-BR на 360 dp или ×1,3) второй ряд обрезается. Такие места найдены в 11 файлах.

## Что исправлено (`height` → `minHeight`, вид в одну строку прежний)
| Файл | Элемент |
|---|---|
| components/home/HomeSectionPulseButton.tsx | пилюля раздела (30) |
| components/completion/V2DoneScreen.tsx | баланс (40), плашка счёта (32), «ghost» (44), главная CTA (52) |
| app/dialogue_v2_completion.tsx | настроение (32), «Повторить ошибки» (44) |
| components/dialogs/glass/DialogueGlassSessionParts.tsx | плашка (32), «Исправить» (30) |
| components/paywall/PaywallPlus.tsx | промо-плашка (35) |
| components/spire/SpireFriendsRow.tsx | чип друга (46) |
| components/spire/SpireResultPanel.tsx | плашка итога (36) |
| app/flashcards/CardsSessionResultV2.tsx | плашка (35), CTA (48) |
| app/flashcards/CollectionGalleryView.tsx | «Добавить» (42), FAB (42) |
| app/flashcards/VideoSetView.tsx | «Перейти к моменту» (38) |
| app/flashcards/PackLanguagePicker.tsx | выбор языка набора (40) |

## Проверено и оставлено
- `app/(tabs)/lessons.tsx` (16 вхождений `height`): иконки, поле поиска (одна строка, `flex:1`), пилюля монет (число) — подписей с переносом нет.
- Диалоги (`DialogsTabContent` и др.): все найденные `height` — плитки-иконки и круглые кнопки.
- Настройки и `manage_subscription`: плитки/иконки и декоративные подложки (`cardSheen`, `sheetSheen`) — не текст.

## Не покрыто (нужны кадры)
Перенос в длинных строках (названия наборов, имена друзей, заголовки шторок) и наезды при ×1,3 по коду не видны. Нужна пачка **FS1** у Сверки: 10–12 ключевых экранов (Главная, Уроки, Итог урока, Шпиль, Диалоги, Память, Карточки хаб, Итог карточек, Настройки, Подписка, Пэйвол Plus) при `font_scale 1.3` и ширине 360 dp (`adb shell settings put system font_scale 1.3`, вернуть 1.0 в trap).

## Рекомендации владельцам
- Дальнейшие кнопки с подписью задавать через `minHeight`; сторож «не `height:` у элементов с `<Text>`» можно добавить в `tests/layout_stability_contract.test.ts` (отдельная задача).
