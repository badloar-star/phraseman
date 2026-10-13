# Вёрстка на длинных строках 9 языков — зона Дизайна, разбор R1, 13.10.2026

Поручение координатора: места, где текст фиксированной ширины может обрезаться или налезать на pt-BR, pl, tr, vi, id (и uk/es) — кнопки, пилюли, заголовки. Без `adjustsFontSizeToFit` — перенос или гибкая ширина.

## Метод
Сценарий в scratchpad обошёл `triLang`-таблицы 1958 строк зоны (Карточки, Диалоги, Главная, Сообщество, Видео, уроки-обвязка), сравнил длины 9 языков с ru и пометил **540** строк, где самый длинный язык ≥ 1,3× ru и 11–26 знаков. Из них отброшены данные слов (`app/lesson_words.tsx` — словарь урока, не интерфейс) и тексты вводных экранов уроков (Learning V2, вне зоны). Для остальных (~150 подписей) контейнер проверен в коде: однострочность, фиксированная ширина, ряд без переноса, равные колонки.

## Итог
**Один реальный риск исправлен**, остальные места уже защищены (перенос, `flexShrink`, `minWidth: 0`, горизонтальная прокрутка) или подпись не текстовая (иконка).

## Исправлено в этой пачке
| файл:строка | язык | риск | правка |
|---|---|---|---|
| `app/community_packs/CommunityPackSocialBar.tsx` (ряд счётчиков, `pack-like-*`) | es «lo añadieron» + «En tendencia»; pt-BR «adicionaram» | ряд «лайк · N добавили · отклики · В топе» без переноса: ≈340 из ≈379 dp, на крупном шрифте ОС выходил за край | `flexWrap: 'wrap'`, `columnGap: 12`, `rowGap: 6` — лишнее уходит на вторую строку; сторож `tests/community_pack_social_bar_wrap_contract.test.ts` |

## Проверено — уже защищено (правка не нужна)
| где | язык / строка | почему безопасно |
|---|---|---|
| `components/youtube/YoutubeChannelTabs.tsx:21` | es «Listas de reproducción» (22) | вкладка `flexShrink: 1, minWidth: 0` — сжимается и переносится |
| `app/flashcards/SavedTopCommunityPacks.tsx:203` | pl «Zobacz wszystkie» | ссылка `maxWidth: '42%'`, `flexShrink: 1`, `minWidth: 0` |
| `components/home/v2/HomeV2VideoRail.tsx:40` | pl «Zobacz wszystkie» | заголовок раздела («Wideo», «Videolar») короткий во всех языках — вместе помещаются |
| `components/dialogs/DialogBubbleActions.tsx` | id «Sembunyikan terjemahan», en «Why it sounds like this» | кнопки пузыря — иконки 34×34, подписи только для озвучки экрана |
| `app/flashcards/FlashcardsTrainingModeSheet.tsx:163–217` | pt-BR «Verdadeiro / falso», pl «Spróbuj ponownie» | плитки `flex: 1, minWidth: 0`, подпись без `numberOfLines` — переносится |
| `components/youtube/YoutubePremiereHero.tsx:70–72` | id «Gabung sekarang», «Segera tayang perdana» | пилюля по ширине текста, кнопка `minHeight: 44` по центру, ≤ ~200 dp |
| `components/completion/V2DoneScreen.tsx:68` | vi «độ chính xác» | три равные колонки ≈110 dp, подпись 13 px ≈ 72 dp |
| `components/flashcards/StatusFilterChips.tsx` / `app/flashcards/cardStatus.ts:56` | id «Sedang dipelajari» | чипы статусов — горизонтальная прокрутка |
| `components/cards-grid/CardsGallery.tsx` | перевод карточек | `numberOfLines` 1–2 с «…» по размеру плитки, перенос сделан осознанно |
| `app/community_packs/PackCommentsSheet.tsx:972/985` | tr «Sabitlemeyi kaldır», id «Sembunyikan dari semua» | пункты меню — строки на всю ширину шторки, иконка 24 + текст |

## Не вёрстка (пропущено намеренно)
- `app/lesson_words.tsx` (≈300 строк пометок) — словарь слов урока, длина — свойство перевода, не интерфейса.
- `app/(tabs)/settings.tsx:234` — собственные названия языков («Português (Brasil)»), строка списка на всю ширину.
- `app/lesson_intro_screens_lesson*_v2.ts` — тексты урока (Learning V2), по Библии текстов, не по этому аудиту.

## Что может проверить только кадр (Сверка)
Статический разбор не заменяет кадры. Для пересъёмки на pt-BR / pl / tr / vi / id: соц-ряд набора (`CommunityPackSocialBar`, экран набора и плитка каталога), шапка хаба Карточек с «Meus conjuntos / Bộ thẻ của tôi», кнопки «Wróć na stronę główną» / «Tentar novamente» в пустых состояниях и шторка выбора колоды `DeckPickerSheet` (es «¿Qué entra en el blitz?»).

## Решения владельцу
Нет. Переводы (Ядро) не менялись.
