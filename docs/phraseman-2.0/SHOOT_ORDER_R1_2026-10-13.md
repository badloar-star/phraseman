# Порядок съёмки R1 для Сверки (Макеты, 13.10)

**Всего блокирующих строк гейта: 237. Из них снимать: 174 (впервые 103 · переснять 71) + анимации 28 отдельной пачкой; пересклейка без съёмки 28; не снимать — ручной 6 · код 1 · образец правят Макеты 0 · решение владельца 0.**

Источник: `visual_parity.json` + `DEV_LINKS_R1.md` (ссылки и тапы взяты оттуда дословно; если у строки там несколько вариантов — первый). Порядок: онбординг → онбординг-пейвол → смена языка → Карточки → Диалоги → пейволы → энергия → Сообщество → вход и аккаунт → Настройки → профиль → Шпиль → Обучение → прочее. Пачки по 40–50 id, режутся по границе семейства (если семейство длиннее 50 — внутри него). Тема кадра — по таблице «Тема кадра по страницам» (DEV_SWITCHES_R1_CORE): страницы класса A — добавлять `theme=grad_aurora&level=1`, класс C (profile, cards-v2, learn и др.) — `theme=graphite&level=0`. Паузы: после открытия урока/сессии ≥2,5 с, перед кадром со скелетом — ≥4 с; клавиатуру прятать (hidekb). Гость: ссылки с «только гость» — pm clear + онбординг.

Колонки: id · что нужно · ссылка (без `phraseman://dev_state?`) · тапы/шаги.

## Пачка 1 · 50 кадров · онбординг, онбординг · пейвол, Карточки

| id | что | ссылка | шаги |
|---|---|---|---|
| onboarding-002 | впервые | `onboarding=done&intros=seen&onbstep=welcome&overlays=off&next=/(tabs)/home` | `tap:#onboarding-existing-account; wait:600` |
| onboarding-003 | впервые | `onboarding=done&intros=seen&guest=required&onbstep=welcome&signin=hold&overlays=off&next=/(tabs)/home` | `tap:#onboarding-existing-account; wait:600; tap:#auth-google-button; wait:9500` |
| onboarding-004 | впервые | `onboarding=done&intros=seen&guest=required&onbstep=welcome&signin=offline&overlays=off&next=/(tabs)/home` | `tap:#onboarding-existing-account; wait:600; tap:#auth-google-button; wait:1200` |
| onboarding-005 | впервые | `onboarding=done&intros=seen&guest=required&onbstep=welcome&signin=unknown&overlays=off&next=/(tabs)/home` | `tap:#onboarding-existing-account; wait:600; tap:#auth-google-button; wait:1500` |
| onboarding-006 | впервые | `onboarding=done&intros=seen&onbstep=welcome&auth=none&overlays=off&next=/(tabs)/home` | `wait:1800; tap:#onboarding-existing-account; wait:800` |
| onboarding-007 | переснять | `onboarding=done&intros=seen&onbstep=privacy&overlays=off&next=/(tabs)/home` |  |
| onboarding-008 | впервые | `onboarding=done&intros=seen&guest=required&onbstep=privacy&signin=generic&overlays=off&next=/(tabs)/home` | `tap:#auth-google-button; wait:1200` |
| onboarding-010 | впервые | `onboarding=done&intros=seen&onbstep=niceToMeet&greet=Alexandra-Wilhelmina&overlays=off&next=/(tabs)/home` |  |
| onboarding-018 | переснять | `onboarding=done&intros=seen&onbstep=notifications&overlays=off&next=/(tabs)/home` | `wait:2000` |
| onboarding-025 | впервые | `onboarding=done&intros=seen&onbstep=onboardingPaywall&paywall=loading&overlays=off&next=/(tabs)/home` |  |
| onboarding-026 | впервые | `onboarding=done&intros=seen&overlays=off&next=/language_welcome?target=en` | `wait:600` |
| onboarding-027 | впервые | `onboarding=done&intros=seen&overlays=off&next=/language_welcome?target=en` | `tap:#language-welcome-primary; wait:500` |
| onboarding-028 | впервые | `onboarding=done&intros=seen&overlays=off&next=/language_welcome?target=en` | `tap:#language-welcome-primary; wait:500; tap:#language-welcome-option-everyday; tap:#language-welcome-primary; wait:500` |
| onboarding-029 | впервые | `onboarding=done&intros=seen&overlays=off&next=/language_welcome?target=en%26devStep=done` | `wait:600` |
| onboarding-paywall-001 | впервые | `onboarding=done&intros=seen&onbstep=onboardingPaywall&paywall=live&overlays=off&next=/(tabs)/home` | `wait:2500` |
| cards-008 | переснять | `onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&studyTarget=en&next=/flashcards_collection?cat=saved` | `tap:#fc-saved-actions; tap:#fc-saved-view-deck` |
| cards-011 | переснять | `onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&studyTarget=en&next=/flashcards_my_packs` |  |
| cards-012 | переснять | `onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&studyTarget=en&next=/flashcards_my_packs` | `long:#fc-my-packs-pack-local_pack_dev_demo_work; tap:#fc-my-packs-pack-delete-local_pack_dev_demo_work` |
| cards-018 | переснять | `onboarding=done&intros=seen&packcards=on&community=reset&overlays=off&next=/flashcards_collection?pack=dev_demo_community_2%26preview=1` | `wait:2500; tap:#fc-zoom-larger; wait:500` |
| cards-019 | переснять | `onboarding=done&intros=seen&packcards=on&community=reset&overlays=off&next=/flashcards_collection?pack=dev_demo_community_2%26preview=1` | `wait:2500; tap:#pack-add-dev_demo_community_2` |
| cards-022 | переснять | `onboarding=done&intros=seen&cards=empty&plus=on&overlays=off&next=/community_pack_create` | `tap:#ugc-pack-first-card; tap:#ugc-pack-draft-front; type:Layover` |
| cards-026 | переснять | `onboarding=done&intros=seen&cards=demo_few&plus=on&overlays=off&studyTarget=en&next=/flashcards_training_setup?mode=blitz` | `tap:#fc-training-setup-deck-saved; wait:500` |
| cards-031 | переснять | `onboarding=done&intros=seen&cards=demo&hold=saved_loading&studyTarget=en&overlays=off&next=/flashcards_collection?cat=saved` |  |
| cards-035 | переснять | `onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&studyTarget=en&next=/flashcards_collection?cat=saved` | `tap:#fc-saved-actions; tap:#fc-menu-select; tap:#fc-gallery-tile-*; tap:#fc-gallery-tile-*@2; tap:#fc-gallery-tile-*@3; tap:#fc-delete-selected` |
| cards-037 | переснять | `onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&studyTarget=en&next=/flashcards_collection?cat=saved` | `tap:#fc-saved-actions; tap:#fc-saved-view-deck; tap:#fc-deck-card` |
| cards-044 | переснять | `onboarding=done&intros=seen&packcards=meta&community=added&overlays=off&next=/flashcards_my_packs` | `tap:#fc-my-packs-pack-dev_demo_community_2; wait:5200` |
| cards-045 | переснять | `onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&studyTarget=en&next=/flashcards_my_packs` | `long:#fc-my-packs-pack-local_pack_dev_demo_work; tap:#fc-my-packs-pack-delete-local_pack_dev_demo_work; tap:#fc-delete-pack-confirm-confirm` |
| cards-046 | переснять | `onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&studyTarget=en&next=/flashcards_my_packs` | `tap:#fc-my-packs-menu; tap:#fc-my-packs-menu-search; tap:#fc-my-packs-search; type:zzzqq` |
| cards-047 | переснять | `onboarding=done&intros=seen&hold=catalog_loading&overlays=off&next=/flashcards_packs` |  |
| cards-050 | переснять | `onboarding=done&intros=seen&packcards=on&community=reset&overlays=off&next=/flashcards_collection?pack=dev_demo_community_2%26preview=1` | `wait:2500; tap:#pack-add-dev_demo_community_2; tap:#pack-like-dev_demo_community_2` |
| cards-051 | переснять | `onboarding=done&intros=seen&packcards=on&community=reset&comments=empty&overlays=off&next=/flashcards_collection?pack=dev_demo_community_2%26preview=1` | `wait:2500; tap:#pack-add-dev_demo_community_2; tap:#pack-comments-dev_demo_community_2` |
| cards-052 | переснять | `onboarding=done&intros=seen&packcards=on&community=reset&comments=demo&overlays=off&next=/flashcards_collection?pack=dev_demo_community_2%26preview=1` | `wait:2500; tap:#pack-comments-dev_demo_community_2` |
| cards-053 | переснять | `onboarding=done&intros=seen&cards=demo_published&plus=on&packcards=on&comments=demo&overlays=off&studyTarget=en&next=/flashcards_collection?pack=dev_demo_published_own%26openComments=1` | `tap:#pack-comment-more-dev_demo_cm_2` |
| cards-054 | переснять | `onboarding=done&intros=seen&packcards=on&community=reset&comments=demo&overlays=off&next=/flashcards_collection?pack=dev_demo_community_2%26preview=1` | `wait:2500; tap:#pack-add-dev_demo_community_2; tap:#pack-comments-dev_demo_community_2; tap:#pack-comment-input; type:Thanks; tap:#pack-comment-send; wait:600` |
| cards-055 | переснять | `onboarding=done&intros=seen&packcards=on&community=reset&comments=demo&overlays=off&next=/flashcards_collection?pack=dev_demo_community_2%26preview=1` | `wait:2500; tap:#pack-add-dev_demo_community_2; tap:#pack-comments-dev_demo_community_2; tap:#pack-comment-more-dev_demo_cm_2` |
| cards-057 | переснять | `onboarding=done&intros=seen&packcards=on&community=reset&comments=demo&overlays=off&next=/flashcards_collection?pack=dev_demo_community_2%26preview=1` | `wait:2500; tap:#pack-add-dev_demo_community_2; tap:#pack-comments-dev_demo_community_2; tap:#pack-comment-more-dev_demo_cm_2; tap:Пожаловаться; wait:600` |
| cards-058 | переснять | `onboarding=done&intros=seen&packcards=on&community=reset&comments=demo&overlays=off&next=/flashcards_collection?pack=dev_demo_community_2%26preview=1` | `wait:2500; tap:#pack-add-dev_demo_community_2; tap:#pack-comments-dev_demo_community_2; tap:#pack-comment-more-dev_demo_cm_2; tap:Пожаловаться; tap:Спам или реклама; tap:Отправить жалобу; wait:600` |
| cards-059 | переснять | `onboarding=done&intros=seen&catalog=demo&packcards=on&community=reset&overlays=off&next=/flashcards_packs` | `long:#flashcards-pack-card-dev_demo_community_1; tap:#flashcards-pack-report; tap:Спам или реклама; tap:Отправить жалобу; wait:600` |
| cards-061 | переснять | `onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&studyTarget=en&next=/flashcards_card_editor?create=1%26cat=custom` | `tap:#fc-editor-description; wait:400` |
| cards-063 | переснять | `onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&studyTarget=en&next=/flashcards_card_editor?id=dev_missing_card` |  |
| cards-064 | впервые | `onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&studyTarget=en&next=/flashcards_card_editor?create=1%26cat=custom` | `tap:#fc-editor-en; type:Test; hidekb; tap:#fc-editor-tr; type:Test; hidekb; tap:#fc-editor-save` |
| cards-065 | переснять | `onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&studyTarget=en&next=/community_pack_create?packId=local_pack_dev_demo_work` |  |
| cards-066 | переснять | `onboarding=done&intros=seen&cards=empty&plus=on&overlays=off&next=/community_pack_create` |  |
| cards-067 | переснять | `onboarding=done&intros=seen&cards=empty&plus=on&overlays=off&next=/community_pack_create` |  |
| cards-069 | переснять | `onboarding=done&intros=seen&plus=on&packdraft=few&overlays=off&next=/community_pack_create` | `tap:#ugc-pack-save; wait:600` |
| cards-071 | переснять | `onboarding=done&intros=seen&plus=on&packdraft=full&overlays=off&next=/community_pack_create` | `tap:#ugc-pack-add-card; wait:600` |
| cards-073 | переснять | `onboarding=done&intros=seen&plus=on&packdraft=private&overlays=off&next=/community_pack_create` | `tap:#ugc-pack-save; wait:600` |
| cards-074 | переснять | `onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&studyTarget=en&next=/community_pack_create?packId=dev_missing_cloud_pack` | `see:#ugc-pack-load-error` |
| cards-076 | переснять | `onboarding=done&intros=seen&cards=empty&plus=on&studyTarget=es&overlays=off&next=/flashcards_training_setup?mode=blitz` |  |
| cards-081 | впервые | `onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&studyTarget=en&next=/flashcards_video_packs` | `tap:#fc-video-packs-menu; tap:#fc-video-packs-menu-search; tap:#fc-video-packs-search; type:zzzqq` |

## Пачка 2 · 50 кадров · Карточки

| id | что | ссылка | шаги |
|---|---|---|---|
| cards-082 | переснять | `onboarding=done&intros=seen&packcards=on&community=reset&fail=video_open&overlays=off&next=/flashcards_collection?pack=video_devDemoVid0%26preview=1` | `tap:#video-set-hero` |
| cards-gap-007 | переснять | `onboarding=done&intros=seen&cards=notranslation&plus=on&overlays=off&studyTarget=en&next=/flashcards_truefalse_session?deck=saved%26quick=1%26size=all` |  |
| cards-gap-009 | переснять | `onboarding=done&intros=seen&cards=demo&plus=on&fail=recall_load&overlays=off&studyTarget=en&next=/flashcards_recall_session?deck=saved%26size=all%26dir=to_target` |  |
| cards-gap-019 | впервые | `onboarding=done&intros=seen&cards=demo_nopacks&plus=on&overlays=off&studyTarget=en&next=/flashcards_collection?cat=saved` | `tap:Layover; tap:#fc-expanded-to-pack` |
| cards-gap-021 | впервые | `onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&studyTarget=en&next=/flashcards_collection?cat=saved` | `tap:#fc-gallery-tile-*; wait:900; tap:#fc-expanded-to-pack; wait:900; tap:#fc-expanded-pack-local_pack_dev_demo_work; wait:1800; tap:#fc-gallery-tile-*; wait:900; tap:#fc-expanded-to-pack; wait:900; tap:#fc-expanded-pack-local_pack_dev_demo_work` |
| cards-gap-023 | впервые | `onboarding=done&intros=seen&cards=demo_lessons&plus=on&overlays=off&studyTarget=en&next=/flashcards_collection?cat=saved` | `tap:#fc-saved-actions; tap:#fc-saved-content-phrase; tap:#fc-menu-filter` |
| cards-gap-024 | впервые | `onboarding=done&intros=seen&cards=demo_lessons&plus=on&overlays=off&studyTarget=en&next=/flashcards_collection?cat=saved` | `tap:#fc-saved-actions; tap:Фразы; wait:600; tap:#fc-menu-filter; tap:Урок 3` |
| cards-gap-027 | впервые | `onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&studyTarget=en&next=/flashcards_collection?pack=local_pack_dev_demo_work` | `tap:#fc-pack-menu; tap:#fc-pack-publish` |
| cards-gap-028 | впервые | `onboarding=done&intros=seen&cards=demo&plus=on&fail=publish_error&overlays=off&studyTarget=en&next=/flashcards_collection?pack=local_pack_dev_demo_work` | `tap:#fc-pack-menu; tap:#fc-pack-publish` |
| cards-gap-029 | переснять | `onboarding=done&intros=seen&cards=demo_published&plus=on&packcards=on&fail=pack_remove_min&overlays=off&studyTarget=en&next=/flashcards_collection?pack=dev_demo_published_own` | `tap:#fc-gallery-tile-dev_demo_published_own_c1; tap:#fc-expanded-delete; wait:5800` |
| cards-gap-031 | переснять | `onboarding=done&intros=seen&cards=demo_published&plus=on&packcards=on&fail=pack_remove_net&overlays=off&studyTarget=en&next=/flashcards_collection?pack=dev_demo_published_own` | `tap:#fc-gallery-tile-dev_demo_published_own_c1; tap:#fc-expanded-delete; wait:5800` |
| cards-gap-032 | впервые | `onboarding=done&intros=seen&packcards=on&community=reset&overlays=off&next=/flashcards_collection?pack=dev_demo_community_2%26preview=1` | `wait:2500; tap:#pack-like-dev_demo_community_2` |
| cards-gap-033 | впервые | `onboarding=done&intros=seen&packcards=on&community=reset&fail=pack_like&overlays=off&next=/flashcards_collection?pack=dev_demo_community_2%26preview=1` | `wait:2500; tap:#pack-add-dev_demo_community_2; tap:#pack-like-dev_demo_community_2` |
| cards-gap-036 | впервые | `onboarding=done&intros=seen&plus=on&voices=demo&overlays=off&next=/flashcards_voice_picker` | `tap:#fc-voice-row-dev_voice_samantha` |
| cards-gap-037 | переснять | `onboarding=done&intros=seen&cards=demo&hold=voices_loading&overlays=off&studyTarget=en&next=/flashcards_voice_picker` |  |
| cards-gap-038 | впервые | `onboarding=done&intros=seen&plus=on&voices=none&overlays=off&next=/flashcards_voice_picker` |  |
| cards-gap-039 | впервые | `onboarding=done&intros=seen&cards=demo_published&plus=on&packcards=on&overlays=off&studyTarget=en&next=/flashcards_collection?pack=dev_demo_published_own` | `tap:#fc-gallery-tile-dev_demo_published_own_c1; tap:#fc-expanded-to-pack` |
| cards-gap-040 | впервые | `onboarding=done&intros=seen&cards=demo&plus=off&free=on&mode=a&energy=5&overlays=off&studyTarget=en&next=/flashcards_recall_session?deck=saved%26size=all%26dir=to_target` |  |
| cards-section-011 | переснять | `onboarding=done&intros=seen&cards=empty&plus=off&overlays=off&next=/flashcards_my_packs` |  |
| cards-section-013 | впервые | `onboarding=done&intros=seen&packcards=on&community=reset&overlays=off&next=/flashcards_collection?pack=dev_demo_community_2%26preview=1` | `wait:2500; tap:#fc-zoom-larger; wait:500` |
| cards-section-014 | впервые | `onboarding=done&intros=seen&packcards=on&community=reset&overlays=off&next=/flashcards_collection?pack=dev_demo_community_2%26preview=1` | `wait:2500; tap:#pack-add-dev_demo_community_2` |
| cards-section-021 | переснять | `onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&studyTarget=en&next=/community_pack_create?packId=local_pack_dev_demo_work` |  |
| cards-section-029 | впервые | `onboarding=done&intros=seen&catalog=empty&fail=catalog_load&overlays=off&next=/flashcards_packs` |  |
| cards-section-030 | впервые | `onboarding=done&intros=seen&packcards=on&community=reset&overlays=off&next=/flashcards_collection?pack=video_devDemoVid0%26preview=1` |  |
| cards-section-031 | впервые | `onboarding=done&intros=seen&packcards=on&community=reset&overlays=off&next=/flashcards_collection?pack=video_devDemoVid0%26preview=1` | `tap:#pack-add-video_devDemoVid0` |
| cards-section-038 | впервые | `onboarding=done&intros=seen&cards=empty&plus=on&studyTarget=es&overlays=off&next=/flashcards_training_setup?mode=blitz` |  |
| cards-section-039 | впервые | `onboarding=done&intros=seen&cards=demo&plus=on&animations=off&overlays=off&studyTarget=en&next=/flashcards_blitz_session?deck=saved%26sec=60` |  |
| cards-section-040 | переснять | `onboarding=done&intros=seen&cards=demo&plus=on&speech=correct&overlays=off&studyTarget=en&next=/flashcards_speaking_session?deck=saved%26size=all` | `wait:3000` |
| cards-section-042 | переснять | `onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&studyTarget=en&next=/flashcards_truefalse_session?deck=saved%26quick=1%26size=all` | `wait:4000` |
| cards-section-049 | впервые | `onboarding=done&intros=seen&cards=demo&plus=on&answer=wrong&overlays=off&studyTarget=en&next=/flashcards_training_setup?mode=truefalse` | `tap:#fc-training-setup-deck-saved; tap:#fc-training-setup-start; wait:2500; tap:#flashcards-truefalse-answer-target; wait:600` |
| cards-section-050 | впервые | `onboarding=done&intros=seen&cards=demo&plus=on&answer=correct&overlays=off&studyTarget=en&next=/flashcards_training_setup?mode=recall` | `tap:#fc-training-setup-deck-saved; tap:#fc-training-setup-start; wait:2500; tap:#fc-recall-check; wait:600` |
| cards-section-052 | впервые | `onboarding=done&intros=seen&cards=demo&plus=on&studyTarget=en&overlays=off&next=/flashcards_recall_session?deck=saved%26size=all%26dir=to_target` | `wait:4000; await:#fc-recall-input; tap:#fc-recall-input; type:zzzz; tap:#fc-recall-check; wait:800` |
| cards-section-053 | впервые | `onboarding=done&intros=seen&overlays=off&next=/dev_cards_result_preview?state=errors` | `wait:1500` |
| cards-section-054 | переснять | `onboarding=done&intros=seen&overlays=off&next=/dev_cards_result_preview?state=errors` | `wait:1500` |
| cards-section-055 | впервые | `onboarding=done&intros=seen&overlays=off&next=/dev_cards_result_preview?state=clean` | `wait:1500` |
| cards-section-056 | впервые | `onboarding=done&intros=seen&plus=off&cards=demo&quota=exhausted&overlays=off&studyTarget=en&next=/flashcards_training_setup?mode=blitz` |  |
| cards-v2-006 | переснять | `onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&studyTarget=en&next=/flashcards_collection?cat=saved` |  |
| cards-v2-007 | переснять | `onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&studyTarget=en&next=/flashcards_collection?cat=saved` | `tap:#fc-zoom-smaller` |
| cards-v2-010 | переснять | `onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&studyTarget=en&next=/flashcards_collection?cat=saved` | `tap:#fc-gallery-tile-*; tap:#fc-expanded-delete` |
| cards-v2-019 | переснять | `onboarding=done&intros=seen&packcards=on&community=reset&overlays=off&next=/flashcards_collection?pack=video_devDemoVid0%26preview=1` |  |
| cards-v2-020 | переснять | `onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&studyTarget=en&next=/flashcards_collection?cat=saved` | `tap:#fc-gallery-tile-*` |
| cards-v2-025 | переснять | `onboarding=done&intros=seen&catalog=demo&cards=empty&overlays=off&next=/flashcards_packs` |  |
| cards-v2-035 | впервые | `onboarding=done&intros=seen&cards=demo&plus=on&studyTarget=en&blitz_answer=correct&animations=off&overlays=off&next=/flashcards_blitz_session?deck=saved%26sec=60` | `wait:4000; await:#fc-blitz-opt-target; tap:#fc-blitz-opt-target` |
| cards-v2-036 | впервые | `onboarding=done&intros=seen&cards=demo&plus=on&studyTarget=en&blitz_answer=wrong&animations=off&overlays=off&next=/flashcards_blitz_session?deck=saved%26sec=60` | `wait:4000; await:#fc-blitz-opt-target; tap:#fc-blitz-opt-target` |
| cards-v2-038 | впервые | `onboarding=done&intros=seen&cards=demo&plus=on&answer=wrong&overlays=off&studyTarget=en&next=/flashcards_training_setup?mode=truefalse` | `tap:#fc-training-setup-deck-saved; tap:#fc-training-setup-start; wait:2500; tap:#flashcards-truefalse-answer-target; wait:600` |
| cards-v2-039 | впервые | `onboarding=done&intros=seen&cards=demo&plus=on&answer=correct&overlays=off&studyTarget=en&next=/flashcards_training_setup?mode=recall` | `tap:#fc-training-setup-deck-saved; tap:#fc-training-setup-start; wait:2500; tap:#fc-recall-check; wait:600` |
| cards-v2-040 | впервые | `onboarding=done&intros=seen&cards=demo&plus=on&studyTarget=en&overlays=off&next=/flashcards_recall_session?deck=saved%26size=all%26dir=to_target` | `wait:4000; await:#fc-recall-input; tap:#fc-recall-input; type:zzzz; tap:#fc-recall-check; wait:800` |
| cards-v2-041 | впервые | `onboarding=done&intros=seen&overlays=off&next=/dev_cards_result_preview?state=errors` | `wait:1500` |
| cards-v2-042 | впервые | `onboarding=done&intros=seen&overlays=off&next=/dev_cards_result_preview?state=clean` | `wait:1500` |
| cards-v2-045 | переснять | `onboarding=done&intros=seen&cards=demo&plus=off&overlays=off&studyTarget=en&next=/flashcards_collection?cat=saved` |  |

## Пачка 3 · 47 кадров · Карточки, Диалоги, пейволы, энергия, Сообщество

| id | что | ссылка | шаги |
|---|---|---|---|
| cards-v2-047 | переснять | `onboarding=done&intros=seen&cards=demo&plus=off&packdraft=on&overlays=off&studyTarget=en&next=/community_pack_create` | `wait:1500` |
| cards-v2-049 | впервые | `onboarding=done&intros=seen&cards=demo&plus=on&studyTarget=en&overlays=off&next=/flashcards_recall_session?deck=saved%26size=all%26dir=to_target` | `wait:4000; await:#fc-recall-input; tap:#fc-recall-hint; wait:500` |
| cards-v2-050 | впервые | `onboarding=done&intros=seen&cards=demo&plus=on&studyTarget=en&overlays=off&next=/flashcards_recall_session?deck=saved%26size=all%26dir=to_target` | `wait:4000; await:#fc-recall-input; tap:#fc-recall-reveal; wait:600` |
| cards-v2-051 | впервые | `onboarding=done&intros=seen&overlays=off&next=/dev_cards_result_preview?state=good` | `wait:1500` |
| cards-v2-052 | впервые | `onboarding=done&intros=seen&overlays=off&next=/dev_cards_result_preview?state=grow` | `wait:1500` |
| cards-v2-053 | впервые | `onboarding=done&intros=seen&packcards=on&community=reset&overlays=off&next=/flashcards_collection?pack=video_devDemoVid0%26preview=1` | `tap:#pack-add-video_devDemoVid0` |
| dialogs-010 | впервые | `onboarding=done&intros=seen&dialogs_paused=1&overlays=off&next=/ai_dialog_home` |  |
| dialogs-021 | впервые | `onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&dev_dialog_better=on&coinRank=6&aiConsent=granted&overlays=off&next=/ai_dialog_home` | `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-session-input; type:Hello; tap:#dialogue-v2-session-send; wait:2500` |
| dialogs-024 | впервые | `onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&speech=preparing&coinRank=6&aiConsent=granted&overlays=off&next=/ai_dialog_home` | `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; long:#dialogue-v2-voice-input; wait:400` |
| dialogs-033 | впервые | `onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&dialogs_paused=1&coinRank=6&aiConsent=granted&overlays=off&next=/ai_dialog_home` | `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-session-input; type:Hello; tap:#dialogue-v2-session-send; wait:1200` |
| dialogs-037 | впервые | `onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&dev_dialog_end=on&coinRank=6&aiConsent=granted&overlays=off&next=/ai_dialog_home` | `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-session-input; type:Hello; tap:#dialogue-v2-session-send; wait:2500; see:#dialogue-v2-session-end-veil` |
| dialogs-040 | впервые | `onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&dev_dialog_completion=clean&coinRank=6&aiConsent=granted&overlays=off&next=/ai_dialog_home` | `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-session-input; type:Hello; tap:#dialogue-v2-session-send; wait:2500; tap:#dialogue-v2-session-more; tap:#dialogue-v2-session-menu-complete; wait:1500` |
| dialogs-046 | впервые | `onboarding=done&intros=seen&plus=on&dquota=reset&energy=5&dev_dialog_send=ok&overlays=off&next=/dialogue_v2_freeform` | `wait:1200; tap:#dialogue-v2-freeform-input; type:Hello; tap:#dialogue-v2-freeform-send; wait:300` |
| dialogs-gap-001 | впервые | `onboarding=done&intros=seen&plus=on&dev_dialog_memory=demo&overlays=off&next=/dialogue_v2_memory` | `wait:1200` |
| dialogs-gap-004 | впервые | `onboarding=done&intros=seen&plus=on&dev_dialog_memory=demo&overlays=off&next=/dialogue_v2_memory` | `wait:1200; tap:#dialogue-v2-memory-clear-confirm; wait:600` |
| dialogs-gap-005 | впервые | `onboarding=done&intros=seen&plus=on&dev_dialog_memory=clearing&overlays=off&next=/dialogue_v2_memory` | `wait:1200; tap:#dialogue-v2-memory-clear-confirm; wait:600; tap:#dialogue-v2-memory-clear-dialog-confirm; wait:300` |
| dialogs-gap-006 | впервые | `onboarding=done&intros=seen&plus=on&dev_dialog_memory=clear_fail&overlays=off&next=/dialogue_v2_memory` | `wait:1200; tap:#dialogue-v2-memory-clear-confirm; wait:600; tap:#dialogue-v2-memory-clear-dialog-confirm; wait:800` |
| dialogs-gap-007 | впервые | `onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&dev_dialog_completion=loading&coinRank=6&aiConsent=granted&overlays=off&next=/ai_dialog_home` | `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-session-input; type:Hello; tap:#dialogue-v2-session-send; wait:2500; tap:#dialogue-v2-session-more; tap:#dialogue-v2-session-menu-complete; wait:1500` |
| dialogs-gap-008 | впервые | `onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&dev_dialog_completion=unavailable&coinRank=6&aiConsent=granted&overlays=off&next=/ai_dialog_home` | `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-session-input; type:Hello; tap:#dialogue-v2-session-send; wait:2500; tap:#dialogue-v2-session-more; tap:#dialogue-v2-session-menu-complete; wait:1500` |
| dialogs-gap-009 | впервые | `onboarding=done&intros=seen&plus=on&hold=freeform_loading&dev_dialog_send=ok&overlays=off&next=/dialogue_v2_freeform` |  |
| dialogs-gap-011 | переснять | `onboarding=done&intros=seen&plus=on&dquota=reset&energy=5&dev_dialog_send=ok&dev_dialog_fail=service&overlays=off&next=/dialogue_v2_freeform` | `wait:1500` |
| dialogs-gap-014 | впервые | `onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&speech=correct&coinRank=6&aiConsent=granted&overlays=off&next=/ai_dialog_home` | `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; long:#dialogue-v2-voice-input; wait:800; tap:#dialogue-v2-session-send; wait:600` |
| paywall-gap-012 | переснять | `onboarding=done&intros=seen&plus=off&free=on&energy=5&toast=restored&overlays=off&next=/premium_modal?context=no_energy%26source=no_energy_modal` | `wait:300` |
| paywalls-008 | впервые | `onboarding=done&intros=seen&plus=off&aiConsent=granted&ai_explain=limit&overlays=off&next=/lesson_menu?id=1` |  |
| paywalls-009 | впервые | `onboarding=done&intros=seen&plus=off&upsell=first_lesson&overlays=off&next=/lesson_complete?id=1%26passed=1` | `wait:3000` |
| paywalls-010 | впервые | `onboarding=done&intros=seen&plus=off&upsell=three_lessons&overlays=off&next=/lesson_complete?id=1%26passed=1` | `wait:3000` |
| paywalls-014 | переснять | `onboarding=done&intros=seen&plus=off&free=on&energy=5&overlays=off&next=/premium_modal?context=generic%26source=settings_premium%26_dev_state=pending` |  |
| paywalls-015 | переснять | `phraseman://premium_modal?context=generic&source=settings_premium&_dev_state=unknown_outcome` |  |
| paywalls-020 | переснять | `onboarding=done&intros=seen&plus=on&plan=yearly&manage=loading&overlays=off&next=/manage_subscription` |  |
| paywalls-021 | переснять | `onboarding=done&intros=seen&plus=on&plan=lifetime&overlays=off&next=/manage_subscription` |  |
| paywalls-025 | переснять | `onboarding=done&intros=seen&plus=on&plan=yearly&overlays=off&next=/manage_subscription` | `tap:#manage-subscription-cancel; tap:#manage-subscription-reason-missing_features; tap:#manage-subscription-reasons-continue` |
| energy-modes-011 | впервые | `onboarding=done&intros=seen&energy=0&plus=off&mode=b&overlays=off&next=/(tabs)/home` |  |
| energy-modes-012 | впервые | `onboarding=done&intros=seen&cards=demo&plus=off&free=on&mode=b&energy=5&blitz_answer=wrong&animations=off&overlays=off&studyTarget=en&next=/flashcards_blitz_session?deck=saved%26sec=60` | `wait:4000; await:#fc-blitz-opt-target; tap:#fc-blitz-opt-target; wait:300` |
| energy-modes-013 | впервые | `onboarding=done&intros=seen&plus=off&mode=b&energy=5&dquota=reset&coinRank=6&aiConsent=granted&dev_dialog_send=ok&overlays=off&next=/ai_dialog_home` | `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-session-input; type:I goed home; tap:#dialogue-v2-session-send; wait:2500` |
| energy-modes-014 | впервые | `onboarding=done&intros=seen&plus=off&mode=b&energy=5&overlays=off&next=/(tabs)/home` | `tap:#home-v2-phrase-of-day; wait:800` |
| community-008 | впервые | `onboarding=done&intros=seen&friends=demo&spire=open&plus=off&free=on&cards=demo&dev_friends_hold=search&overlays=off&studyTarget=en&next=/(tabs)/community` | `tap:#friends-open-add; wait:800; tap:#friends-code-input; type:ZZ99; tap:#friends-search` |
| community-009 | впервые | `onboarding=done&intros=seen&friends=demo&spire=open&plus=off&free=on&cards=demo&overlays=off&studyTarget=en&next=/(tabs)/community` | `tap:#friends-open-add; wait:800; tap:#friends-code-input; type:DEVFND; tap:#friends-search; wait:1000` |
| community-011 | впервые | `onboarding=done&intros=seen&friends=demo&spire=open&plus=off&free=on&cards=demo&dev_friends_fail=add&overlays=off&studyTarget=en&next=/(tabs)/community` | `tap:#friends-open-add; wait:800; tap:#friends-code-input; type:DEVFND; tap:#friends-search; wait:1000; tap:#friends-add-found; wait:800` |
| community-012 | впервые | `onboarding=done&intros=seen&friends=demo&spire=open&plus=off&free=on&cards=demo&overlays=off&studyTarget=en&next=/(tabs)/community` | `tap:#friends-open-add; wait:800; tap:#friends-code-input; type:ZZ98; tap:#friends-search; wait:1500` |
| community-013 | впервые | `onboarding=done&intros=seen&friends=demo&spire=open&plus=off&free=on&cards=demo&overlays=off&studyTarget=en&next=/(tabs)/community` | `tap:#friends-open-add; wait:800; tap:#friends-code-input; type:DEVSLF; tap:#friends-search; wait:800` |
| community-015 | впервые | `onboarding=done&intros=seen&friends=demo&spire=open&plus=off&free=on&cards=demo&dev_friends_fail=search_offline&overlays=off&studyTarget=en&next=/(tabs)/community` | `tap:#friends-open-add; wait:800; tap:#friends-code-input; type:ZZ99; tap:#friends-search; wait:800` |
| community-017 | впервые | `onboarding=done&intros=seen&friends=demo&spire=open&plus=off&free=on&cards=demo&overlays=off&studyTarget=en&next=/(tabs)/community` | `tap:#friends-open-add; wait:800; tap:#friends-code-input; type:DEVFND; tap:#friends-search; wait:1000` |
| community-018 | впервые | `onboarding=done&intros=seen&friends=demo&spire=open&plus=off&free=on&cards=demo&overlays=off&studyTarget=en&next=/(tabs)/community` | `tap:#friends-open-add; wait:800; tap:#friends-code-input; type:DEVFND; tap:#friends-search; wait:1000` |
| community-019 | впервые | `onboarding=done&intros=seen&friends=demo&spire=open&plus=off&free=on&cards=demo&overlays=off&studyTarget=en&next=/(tabs)/community` | `tap:#friends-open-add; wait:800; tap:#friends-code-input; type:DEVFND; tap:#friends-search; wait:1000` |
| community-021 | впервые | `onboarding=done&intros=seen&friends=demo&spire=open&plus=off&free=on&cards=demo&dev_friends_fail=list&overlays=off&studyTarget=en&next=/(tabs)/community` | `wait:1000` |
| community-022 | впервые | `onboarding=done&intros=seen&friends=demo&spire=open&plus=off&free=on&cards=demo&friend_event=study_invite&overlays=off&studyTarget=en&next=/(tabs)/community` | `wait:800; see:#friend-study-invite-modal` |
| community-024 | впервые | `onboarding=done&intros=seen&friends=demo&spire=open&plus=off&free=on&cards=demo&overlays=off&studyTarget=en&next=/(tabs)/community` | `wait:800; tap:#friend-row-body-dev-demo-friend-1; wait:800; tap:#friend-together-sheet-delete; wait:800` |

## Пачка 4 · 27 кадров · вход и аккаунт, Настройки, профиль, Шпиль, прочее

| id | что | ссылка | шаги |
|---|---|---|---|
| auth-gap-001 | впервые | `onboarding=done&intros=seen&plus=off&overlays=off&next=/account_details` |  |
| auth-gap-002 | впервые | `onboarding=done&intros=seen&overlays=off&next=/account_details` | `tap:#account-email-copy; settle:0` |
| auth-gap-003 | впервые | `onboarding=done&intros=seen&switch=required&overlays=off&next=/account_details` | `tap:#account-link-row; tap:#auth-google-button; wait:1500` |
| auth-gap-004 | впервые | `onboarding=done&intros=seen&switch=not_uploaded&overlays=off&next=/account_details` | `tap:#account-link-row; tap:#auth-google-button; wait:1500` |
| auth-gap-005 | впервые | `onboarding=done&intros=seen&switch=backup_blocked&overlays=off&next=/account_details` | `tap:#account-link-row; tap:#auth-google-button; wait:1500` |
| auth-gap-006 | впервые | `onboarding=done&intros=seen&restore=restored&overlays=off&next=/account_details` | `tap:#account-link-row; tap:#auth-google-button; wait:1500; tap:Восстановить; wait:1200` |
| auth-gap-007 | впервые | `onboarding=done&intros=seen&restore=offer&overlays=off&next=/account_details` | `tap:#account-link-row; tap:#auth-google-button; wait:1500` |
| auth-gap-008 | впервые | `onboarding=done&intros=seen&restore=retired&overlays=off&next=/account_details` | `tap:#account-link-row; tap:#auth-google-button; wait:1500` |
| auth-gap-009 | впервые | `onboarding=done&intros=seen&delete=fail&overlays=off&next=/account_details` | `see:#account-delete-button; tap:#account-delete-button` |
| auth-gap-010 | впервые | `guest=required&onboarding=done&intros=seen&delete=fail&overlays=off&next=/account_details` | `see:#account-delete-button; tap:#account-delete-button` |
| auth-gap-012 | впервые | `guest=required&onboarding=done&intros=seen&plus=on&plustransfer=on&switch=required&overlays=off&next=/(tabs)/settings?switchAccount=1` |  |
| auth-gap-016 | впервые | `guest=required&onboarding=done&intros=seen&switch=not_uploaded&overlays=off&next=/(tabs)/settings?switchAccount=1` | `tap:#settings-switch-continue; wait:1500` |
| settings-gap-007 | переснять | `onboarding=done&intros=seen&plus=off&slot=poll&cache=hold&overlays=off&next=/(tabs)/settings` | `see:#settings-clear-cache-row; tap:#settings-clear-cache-row; wait:400; tap:#glass-alert-action-1; wait:400; scroll:down; scroll:down; wait:500` |
| settings-gap-009 | переснять | `onboarding=done&intros=seen&plus=off&slot=message&cache=failed&overlays=off&next=/(tabs)/settings` | `see:#settings-clear-cache-row; tap:#settings-clear-cache-row; tap:Очистить; wait:300` |
| settings-gap-010 | переснять | `onboarding=done&intros=seen&robot_no_cloud=1&overlays=off&next=/settings_notifications` | `tap:#notif-master-switch; wait:1600; tap:#notif-daily-switch; settle:0` |
| settings-gap-012 | впервые | `onboarding=done&intros=seen&plus=off&notifperm=denied&overlays=off&next=/settings_notifications` | `wait:800; see:#notif-permission-denied-label` |
| settings-gap-017 | переснять | `onboarding=done&intros=seen&robot_no_cloud=1&overlays=off&next=/privacy_settings` | `tap:#privacy-analytics-consent-switch; tap:#privacy-ai-explain-consent-switch; tap:#privacy-ai-dialog-consent-switch; see:#privacy-delete-account` |
| settings-gap-023 | впервые | `onboarding=done&intros=seen&plus=off&support=sent&overlays=off&next=/support_report` | `tap:#support-report-input; type:Test; hidekb; tap:#support-report-submit; wait:800` |
| settings-gap-027 | переснять | `onboarding=done&intros=seen&robot_no_cloud=1&overlays=off&next=/settings_notifications` | `tap:#notif-master-switch; wait:1600` |
| settings-gap-035 | переснять | `onboarding=done&intros=seen&plus=off&overlays=off&next=/support_report` | `tap:#support-report-input; type:short` |
| profile-018 | переснять | `onboarding=done&intros=seen&plus=on&plan=lifetime&overlays=off&next=/manage_subscription` |  |
| profile-019 | переснять | `onboarding=done&intros=seen&plus=on&plan=yearly&manage=loading&overlays=off&next=/manage_subscription` |  |
| spire-gap-021 | впервые | `onboarding=done&intros=seen&overlays=off&next=/dev_spire_preview?state=step_choice%26spirePanel=off%26tier=0%26floor=4` | `see:#spire-task-report-0` |
| spire-gap-022 | впервые | `onboarding=done&intros=seen&overlays=off&next=/dev_spire_preview?state=room%26spirePanel=off%26tier=0%26floor=4` | `see:#spire-beta-pill` |
| overlays-campaigns-004 | переснять | `onboarding=done&intros=seen&plus=off&energy=3&overlays=off&next=/promo_code_entry` |  |
| overlays-campaigns-006 | впервые | `onboarding=done&intros=seen&plus=off&promo=hold&overlays=off&next=/promo_code_entry` | `tap:#promo-code-input; type:TESTCODE; hidekb; tap:#promo-code-submit; wait:400` |
| overlays-campaigns-014 | переснять | `onboarding=done&intros=seen&plus=off&energy=3&promo=off&overlays=off&next=/promo_code_entry` | `tap:#promo-code-input; type:WELCOME30; hidekb; tap:#promo-code-submit; wait:600` |

## Пачка «Анимации» · 28 кадров (нужна anim_evidence — кадр во время анимации; снимать после основных пачек)

| id | что | ссылка | шаги |
|---|---|---|---|
| cards-033 | переснять | `onboarding=done&intros=seen&cards=demo&plus=on&hint=show&overlays=off&studyTarget=en&next=/flashcards_collection?cat=saved` |  |
| cards-040 | переснять | `onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&studyTarget=en&next=/flashcards_my_packs` | `tap:#fc-my-packs-pack-local_pack_dev_demo_travel; wait:800` |
| cards-043 | впервые | `onboarding=done&intros=seen&packcards=on&community=reset&overlays=off&next=/flashcards_collection?pack=video_devDemoVid0%26preview=1` |  |
| cards-056 | переснять | `onboarding=done&intros=seen&packcards=on&community=reset&comments=demo&hold=comment_send&overlays=off&next=/flashcards_collection?pack=dev_demo_community_2%26preview=1` | `wait:2500; tap:#pack-add-dev_demo_community_2; tap:#pack-comments-dev_demo_community_2; tap:#pack-comment-input; type:Thanks; tap:#pack-comment-send; wait:600` |
| cards-072 | переснять | `onboarding=done&intros=seen&plus=on&packdraft=on&fail=publish_error&overlays=off&next=/community_pack_create` | `tap:#ugc-pack-save; wait:600` |
| cards-079 | переснять | `onboarding=done&intros=seen&cards=demo&plus=on&speech=correct&overlays=off&studyTarget=en&next=/flashcards_speaking_session?deck=custom%26size=all` | `wait:3000; tap:#fc-speak-pick-decks-empty` |
| cards-section-016 | впервые | `onboarding=done&intros=seen&cards=demo&plus=on&studyTarget=en&overlays=off&next=/flashcards_collection?cat=saved` | `tap:Layover; wait:600` |
| cards-section-018 | переснять | `onboarding=done&intros=seen&packcards=on&community=reset&overlays=off&next=/flashcards_collection?pack=dev_demo_community_2%26preview=1` | `wait:2500; tap:#pack-add-dev_demo_community_2; tap:#fc-gallery-tile-dev_demo_community_2_c1` |
| cards-section-019 | переснять | `onboarding=done&intros=seen&cards=empty&plus=on&overlays=off&next=/community_pack_create` |  |
| cards-section-041 | переснять | `onboarding=done&intros=seen&cards=demo&plus=on&speech=correct&overlays=off&studyTarget=en&next=/flashcards_speaking_session?deck=saved%26size=all` | `wait:3000; xy:540,1324` |
| cards-section-043 | переснять | `onboarding=done&intros=seen&cards=demo&plus=on&overlays=off&studyTarget=en&next=/flashcards_recall_session?deck=saved%26size=all%26dir=to_target` | `wait:4000` |
| dialogs-025 | впервые | `onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&speech=hold&coinRank=6&aiConsent=granted&overlays=off&next=/ai_dialog_home` | `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; long:#dialogue-v2-voice-input; wait:400` |
| dialogs-026 | впервые | `onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&speech=correct&coinRank=6&aiConsent=granted&overlays=off&next=/ai_dialog_home` | `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; long:#dialogue-v2-voice-input; wait:800` |
| dialogs-027 | впервые | `onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&speech=no_speech&coinRank=6&aiConsent=granted&overlays=off&next=/ai_dialog_home` | `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; long:#dialogue-v2-voice-input; wait:800` |
| dialogs-042 | впервые | `onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&dev_dialog_completion=clean&coinRank=6&aiConsent=granted&overlays=off&next=/ai_dialog_home` | `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-session-input; type:Hello; tap:#dialogue-v2-session-send; wait:2500; tap:#dialogue-v2-session-more; tap:#dialogue-v2-session-menu-complete; wait:1500; tap:#dialogue-v2-completion-feedback-header; tap:#dialogue-v2-completion-feedback-star-4` |
| dialogs-043 | впервые | `onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&coinRank=6&aiConsent=granted&studyTarget=en&dev_dialog_completion=clean&overlays=off&next=/ai_dialog_home` | `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-session-input; type:Hello; tap:#dialogue-v2-session-send; wait:2500; tap:#dialogue-v2-session-more; tap:#dialogue-v2-session-menu-complete; wait:3000` |
| dialogs-044 | впервые | `onboarding=done&intros=seen&plus=off&dquota=reset&energy=5&dev_dialog_send=ok&dev_dialog_completion=errors&coinRank=6&aiConsent=granted&overlays=off&next=/ai_dialog_home` | `tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-session-input; type:Hello; tap:#dialogue-v2-session-send; wait:2500; tap:#dialogue-v2-session-more; tap:#dialogue-v2-session-menu-complete; wait:1500` |
| energy-modes-002 | переснять | `onboarding=done&intros=seen&plus=off&free=on&lessonintro=skip&mode=b&energy=5&overlays=off&next=/lesson1?id=1%26from=lesson_menu` | `wait:2500; tap:#lesson1-word-option-wrong; tap:#lesson1-word-option-correct; tap:#lesson1-word-option-correct; tap:#lesson1-check; wait:600` |
| energy-modes-003 | переснять | `onboarding=done&intros=seen&plus=off&free=on&lessonintro=skip&mode=b&energy=1&overlays=off&next=/lesson1?id=1%26from=lesson_menu` | `wait:2500` |
| energy-modes-004 | переснять | `onboarding=done&intros=seen&plus=off&free=on&lessonintro=skip&mode=b&energy=1&overlays=off&next=/lesson1?id=1%26from=lesson_menu` | `wait:2500; tap:#lesson1-word-option-wrong; tap:#lesson1-word-option-correct; tap:#lesson1-word-option-correct; tap:#lesson1-check; wait:1500` |
| energy-modes-005 | переснять | `onboarding=done&intros=seen&plus=off&free=on&lessonintro=skip&mode=b&energy=1&overlays=off&next=/lesson1?id=1%26from=lesson_menu` | `wait:2500; tap:#lesson1-word-option-wrong; wait:1500; tap:#energy-stop-plus; wait:1200` |
| energy-modes-006 | переснять | `onboarding=done&intros=seen&plus=off&free=on&lessonintro=skip&mode=b&energy=1&energy_stop=plus_granted&overlays=off&next=/lesson1?id=1%26from=lesson_menu` | `wait:2500; tap:#lesson1-word-option-wrong; wait:1500; tap:#energy-stop-plus; wait:1500` |
| energy-modes-007 | впервые | `onboarding=done&intros=seen&plus=off&free=on&mode=b&energy=0&overlays=off&next=/lesson_menu?id=1` | `wait:3000; tap:#lesson-menu-primary; wait:1500` |
| energy-modes-008 | переснять | `onboarding=done&intros=seen&plus=off&free=on&mode=b&energy=restoring&restore_in=8&overlays=off&next=/lesson_menu?id=1` | `wait:3000; tap:#lesson-menu-primary; wait:1200; tap:#energy-needed-wait; wait:7500` |
| energy-modes-015 | переснять | `onboarding=done&intros=seen&plus=off&free=on&lessonintro=skip&mode=a&energy=5&overlays=off&next=/lesson1?id=1%26from=lesson_menu` | `wait:2500` |
| energy-modes-016 | переснять | `onboarding=done&intros=seen&plus=off&free=on&lessonintro=skip&mode=a&energy=5&overlays=off&next=/lesson1?id=1%26from=lesson_menu` | `wait:2500; tap:#lesson1-word-option-wrong; tap:#lesson1-word-option-correct; tap:#lesson1-word-option-correct; tap:#lesson1-check; wait:600` |
| community-002 | впервые | `onboarding=done&intros=seen&overlays=off&next=/dev_spire_preview?state=room%26spirePanel=off` | `see:#spire-all-members` |
| profile-023 | переснять | `onboarding=done&intros=seen&plus=on&plan=yearly&overlays=off&next=/manage_subscription` | `tap:#manage-subscription-cancel; tap:#manage-subscription-reason-missing_features; tap:#manage-subscription-reasons-continue` |

## Пересклейка без съёмки · 28 (stitch-only, голый кадр уже есть)
cards-041, cards-042, cards-gap-011, cards-gap-014, cards-gap-015, cards-gap-016, cards-gap-017, cards-gap-025, cards-gap-035, cards-section-046, cards-v2-015, cards-v2-016, cards-v2-026, cards-v2-027, cards-v2-028, cards-v2-032, cards-v2-037, cards-v2-044, cards-v2-046, dialogs-009, dialogs-gap-016, energy-modes-009, energy-modes-010, auth-gap-013, settings-gap-020, settings-gap-021, spire-gap-016, spire-gap-019

## Не снимать (для справки)
- ручной кадр (6): cards-060, dialogs-028, community-010, settings-gap-001, profile-002, overlays-campaigns-013
- правка кода — с владельцем зоны (1): settings-gap-034
- образец правят Макеты (0): 
- решение владельца (0): 
