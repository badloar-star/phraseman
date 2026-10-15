# Аудит кнопок по коду: Карточки и Видео — 15.10 (R42, агент координатора)

Только чтение. 🔴 27, 🟡 ~75. Девять 🔴 перепроверены агентом по коду лично (#1, #6, #2/#8 en-US, #14/#15 owned=false, выбор канала, #4, #16).
Исполнитель указан в колонке «Кто»; 🟡 — тот же владелец зоны после своих 🔴.

## 🔴
| # | Экран / элемент | file:line | Проблема | Фикс | Кто |
|---|---|---|---|---|---|
| 1 | Сохранённое (es/de/it) | hooks/use-flashcards.ts:268,:356,:382 | loadAllSavedFlashcards читает только ['en','fr'] — карточки es/de/it не загружаются | Все 5 языков в трёх местах | Темы |
| 2 | «Говорение» мик + озвучка | flashcards_speaking_session.tsx:1671,:830,:876 | Нет recognitionLocale → en-US; озвучка зашита en-US | Язык из studyTarget | Сайт |
| 3 | «Верно/неверно» старт с «Первые 50 слов»/своим неопубликованным | flashcards_swipe.tsx:2047-2130,:809,:2135 | loadSources не знает starter_first_50/local_pack_* → тренируется не то; офлайн пакет пропадает | deck_sources.loadDeckCardsMulti, без подмены | Темы |
| 4 | Свой набор «Вернуть» | flashcards_collection.tsx:1306-1316 (:1241,:729) | Нет unhidePackCard — карточка скрыта до перезахода | Вызывать unhidePackCard | Дизайн |
| 5 | Галерея набора «⋯»/долгое | CollectionGalleryView.tsx:339-346,:268; marketplace.ts:695 | Шторка без строк — мёртвый контрол | Не вешать или добавить строки | Дизайн |
| 6 | Покупка набора за руны «Пополнить» | flashcards_collection.tsx:1981 | Только закрывает окно | Вести в магазин рун или скрыть | Дизайн |
| 7 | Динамик на плитке/карточке/VideoSetView | flashcards_collection.tsx:1699,:2000,:1492; CollectionGalleryView.tsx:203; VideoSetView.tsx:189,:200 | fr/de/es/it читает английский голос | {language, cardAudio:true} через inferExpoSpeechLanguage | Сайт |
| 8 | Редактор карточки «Озвучить»/транскрипция | flashcards_card_editor.tsx:377,:335,:509 | en-US зашит; английская транскрипция сохраняется для любого языка | Язык из studyTarget; не-en без транскрипции | Сайт |
| 9 | Сохранённое: «Удалено · Вернуть», «К списку», пустое | flashcards_collection.tsx:1770-1787,:1658,:1673,:1727 | lang сведён к ru/uk/es — en/pt-BR/vi/id/tr/pl видят русский | Язык интерфейса | Переводчик |
| 9b | Каталог сообщества | flashcards_packs.tsx:107,:522 → FlashcardsCategoryHub.tsx:995-1154 | hubCategoryLang ru/uk/es — «Нет сети», «Повторить», «Ничего не нашли» по-русски у 6 языков | Полный lang в triLang и ReportPackModal | Переводчик |
| 10 | Подсказка «Зажми карточку…» | CollectionGalleryView.tsx:227; CollectionListView.tsx:327; useCollectionData.ts:490 | Пишет старый ключ, читает по studyTarget — у fr/de/es/it возвращается всегда | Один ключ | Темы |
| 11 | «50/50» и «Безлимит с Plus» у Free | flashcards_collection.tsx:1190,:1535,:1696 | Лимит считает все языки, а действует по языку | savedCardsForPackLanguage.length | Темы |
| 12 | Комментарии к набору «Отправить»/реакции | PackCommentsSheet.tsx:400,:561,:325,:316 | myUserId только после загрузки; после 8 с null → кнопка молчит | getCanonicalUserId() сразу + тост | Вход и аккаунт |
| 13 | Мои наборы «Удалить» чужой | = R47 | | | Темы |
| 14 | «Из видео»/Видео→Наборы «Добавить» | VideoPackRow.tsx:208,:271; CommunityPackSocialBar.tsx:~118-160; packSocialFirestore.ts:246 | owned={false} зашит; пишет video_X, читает video:X — 3 чтения Firestore на строку впустую | owned из локальных id через communityPackIdForVideoPhraseSet; чтение по верному id | Темы |
| 15 | Просмотр видео «Добавить набор» | lingman_video_watch.tsx:202 | owned={false} — снова «Добавить», already_added без тоста | owned из loadCommunityOwnedPackIds | Темы |
| 16 | Хаб «N/30» у Plus | FlashcardsHubScreen.tsx:539-543,:699,:707-711; monthly_training_sessions.ts:173,:195 | Plus видит лимит, которого нет | Скрывать при Plus | Дизайн |
| 17 | Настройка тренировки «n/30» | flashcards_training_setup.tsx:751; TrainingSetupV2.tsx:182 | То же | Скрывать при Plus | Дизайн |
| 18 | Настройка тренировки после «Открыть каталог» | flashcards_training_setup.tsx:796,:411-413 | Список не обновляется на возврате | useFocusEffect → loadRevision++ | Темы |
| 19 | Колоды других языков | deck_options.ts:150,:342,:630 | _localOnlyDeckOptions не сбрасывается — новое не видно до перезапуска | Версионировать/пересобирать на фокусе | Темы |
| 20 | Итог «Верно/неверно» «Следующий раунд» при 0 энергии | flashcards_swipe.tsx:4396,:2578,:4453 | NoEnergyModal не смонтирован в ветке done — ничего | Вынести модалку выше | Дизайн |
| 21 | «Говорение» стрелка назад на скелете | flashcards_speaking_session.tsx:1401,:1486 | onPress undefined, загрузка до 20 с | Всегда leave | Дизайн |
| 22 | Блиц/Говорение/В-Н «Тренировка не открылась»/«Готовим…» | blitz:1311; speaking:1510; swipe:4292 | Нет «Назад»/✕ | Шапка с выходом | Дизайн |
| 23 | Плейлист | lingman_playlist.tsx:103; youtube_catalog_cache.ts:21-22,:62-73 | Из снимка 20 видео — пусто/мало, вечный скелет | loadAllChannelVideos по playlistIds; честная пустота | Дизайн |
| 24 | Сетка плейлистов | lingman_videos.tsx:734; youtube_catalog_cache.ts:22,:73 | Обрезано до 8 | Полный каталог + пустое состояние | Дизайн |
| 25 | Видео 0 роликов | lingman_videos.tsx:729-732 | Вечный скелет | «На этом языке пока нет роликов» + «Повторить» | Дизайн |
| 26 | Канал под плашкой языка | lingman_videos.tsx:137,:259; youtube_channel_preference.ts:90,:95; shared/youtube_catalog_contract.ts:260-276 | Падает на английский канал; Главная строже — расходятся | resolveVideoChannelForStudyTarget в табе | Дизайн |
| 27 | Премьера «Напомнить» | lingman_videos.tsx:540-558; youtube_premiere_notifications.ts:131 | Сразу «установлено», при отказе молча откат; «Settings» по-английски | Сообщение на причину, перевод | Дизайн |

## 🟡 (полный список — у агента; ключевое по зонам)
Хаб/наборы (Темы): плитка «Из видео» не подписана на язык; «Сообщество N» без фильтра/офлайн 0; navOnce на push; двойной тап видео-набора; пустой «Пока пусто» без действия; «Не показывать мне» без отмены; сбой каталога без «Повторить»; первый кадр чипа языка; «Открыть набор» 4,5 с без индикатора; выбор языка пишет глобальный ключ; «Открыть сообществу» без защиты; pickTopCommunityPacks без фильтра языка; нижние отступы без insets (flashcards_video_packs.tsx:604,:663; CommunityPackPreview.tsx:288).
Коллекция/редактор (Дизайн): «В набор» без фильтра языка; «Новая карточка»/«Создать набор»; правка без подтверждения выхода; черновик теряет level; EditorSheet paddingBottom:28; Plus до accessResolved видит пейвол; «Отправить в сообщество» без блокировки; анимация удаления при откате; двойной insets в галерее; голоса только en-*.
Тренировки (Темы): «Время» «—»; второй раунд без startNewCompletion (руны); «Далее» блок при отмене анимации; Enter в multiline; пресеты теряют sec/target; replace теряет target; чипы ошибок на языке приложения; офлайн «нет карточек»; разные правила энергии между режимами; CardPackShardPaywallModal пустой catch {}.
Видео (Дизайн): remindedIds не читается; выбор канала недостижим; «Сохранённые видео» пусто <View/>; английский RSS при сбое; pull-to-refresh молчит; плашка без hitSlop; channelId игнорируется; CTA limit(60) молчит; назад на /lingman_videos; плеер после 5 ошибок; фразы исчезают; лимит Free без пути в Plus; видео >100 packLanguage en; кэш 6 ч; сердечко офлайн; video_save_counts пагинация.

Языки: в StudyLanguageSheet и пикерах все 5 на месте. Маршруты все существуют. Экраны карточек вне таббара.
