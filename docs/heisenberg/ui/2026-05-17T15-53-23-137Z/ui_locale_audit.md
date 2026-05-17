# Heisenberg UI Locale Audit

Generated: 2026-05-17T15:53:23.136Z
Activation ready: no
Planned locales: pt-BR, vi, id, tr, pl

## Summary
- Files scanned: 580
- triLang calls: 1510
- Static triLang calls: 1502
- Dynamic triLang calls: 8
- triLang missing locale units: 220
- triLang calls missing all planned locales: 44
- Bundle missing locale units: 10

## Finding Codes
- trilang-missing-all-planned-locales: 44
- dynamic-trilang-copy: 8
- lang-context-bundle-missing-planned-locale: 5
- i18n-t-bundle-missing-planned-locales: 1

## Top Files
- app/(tabs)/friends.tsx: 6 findings, 30 missing locale units
- components/GlobalBroadcastModal.tsx: 4 findings, 20 missing locale units
- app/friends_screen.tsx: 3 findings, 15 missing locale units
- components/CoachToast.tsx: 3 findings, 15 missing locale units
- app/level_gift_system.ts: 3 findings, 10 missing locale units
- app/avatar_select.tsx: 2 findings, 10 missing locale units
- app/diagnostic_test.tsx: 2 findings, 10 missing locale units
- app/streak_stats.tsx: 2 findings, 10 missing locale units
- components/AchievementToast.tsx: 2 findings, 10 missing locale units
- components/LangContext.tsx: 5 findings, 5 missing locale units
- components/ReleaseNotesModal.tsx: 5 findings, 5 missing locale units
- app/(tabs)/settings.tsx: 2 findings, 5 missing locale units
- app/community_pack_create.tsx: 1 findings, 5 missing locale units
- app/exam.tsx: 1 findings, 5 missing locale units
- app/hint.tsx: 1 findings, 5 missing locale units
- app/lesson_help.tsx: 1 findings, 5 missing locale units
- app/lesson1.tsx: 1 findings, 5 missing locale units
- app/premium_modal.tsx: 1 findings, 5 missing locale units
- app/preposition_drill.tsx: 1 findings, 5 missing locale units
- app/privacy_screen.tsx: 1 findings, 5 missing locale units
- app/quizzes/result_view.tsx: 1 findings, 5 missing locale units
- app/settings_themes.tsx: 1 findings, 5 missing locale units
- app/shards_shop.tsx: 1 findings, 5 missing locale units
- app/terms_screen.tsx: 1 findings, 5 missing locale units
- components/DeleteAccountConfirmModal.tsx: 1 findings, 5 missing locale units

## First Findings
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:854 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:940 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:1133 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:1234 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:1714 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: gift.labelRu, uk: gift.labelUk, es: gift.labelEs }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:1717 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: gift.descRu, uk: gift.descUk, es: gift.descEs }
- [warning] trilang-missing-all-planned-locales app/(tabs)/settings.tsx:92 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] dynamic-trilang-copy app/(tabs)/settings.tsx:545: triLang uses a dynamic copy object; UI locale audit cannot prove planned locales are present. | triLang(lang, FONT_SIZE_LABELS[fontSize])
- [warning] trilang-missing-all-planned-locales app/avatar_select.tsx:362 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: aura.nameRu, uk: aura.nameUk, es: aura.nameEs }
- [warning] trilang-missing-all-planned-locales app/avatar_select.tsx:1027 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `Открыть ауру «${auraName(pendingAuraPurchase)}» за осколки?`, uk: `Відкрити ауру «${auraName(pendingAuraPurchase)}» за осколки?`, es: `¿Desbloquear el aura «${auraName(pendi
- [warning] trilang-missing-all-planned-locales app/community_pack_create.tsx:110 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] dynamic-trilang-copy app/community_packs/ugcCardThemePresets.ts:33: triLang uses a dynamic copy object; UI locale audit cannot prove planned locales are present. | triLang(lang, UGC_CARD_THEME_LABELS[id])
- [warning] trilang-missing-all-planned-locales app/diagnostic_test.tsx:1141 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: q.hintRU, uk: q.hintUK, es: q.hintES }
- [warning] trilang-missing-all-planned-locales app/diagnostic_test.tsx:1290 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: q.hintRU, uk: q.hintUK, es: q.hintES }
- [warning] trilang-missing-all-planned-locales app/exam.tsx:363 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/friends_screen.tsx:123 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/friends_screen.tsx:385 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: gift.labelRu, uk: gift.labelUk, es: gift.labelEs }
- [warning] trilang-missing-all-planned-locales app/friends_screen.tsx:388 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: gift.descRu, uk: gift.descUk, es: gift.descEs }
- [warning] trilang-missing-all-planned-locales app/hint.tsx:1155 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: hint.titleRU, uk: hint.titleUK, es: hint.titleES }
- [warning] trilang-missing-all-planned-locales app/lesson1.tsx:705 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: 'Урок', ru: 'Урок', es: 'Lección' }
- [warning] trilang-missing-all-planned-locales app/lesson_help.tsx:19384 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: theory.titleUK, ru: theory.titleRU, es: theoryTitleEs }
- [warning] trilang-missing-all-planned-locales app/level_gift_system.ts:67 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: g.titleRU, uk: g.titleUK, es: g.titleES ?? g.titleRU }
- [warning] trilang-missing-all-planned-locales app/level_gift_system.ts:71 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: g.descRU, uk: g.descUK, es: g.descES ?? g.descRU }
- [warning] dynamic-trilang-copy app/level_gift_system.ts:86: triLang uses a dynamic copy object; UI locale audit cannot prove planned locales are present. | triLang(lang, GIFT_RARITY_UI_LABEL[r])
- [warning] trilang-missing-all-planned-locales app/premium_modal.tsx:943 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/preposition_drill.tsx:494 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: item.explainUK, ru: item.explainRU, es: item.explainES ?? item.explainRU, }
- [warning] trilang-missing-all-planned-locales app/privacy_screen.tsx:47 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Открыть политику на сайте Knowly', uk: 'Відкрити політику на сайті Knowly', es: 'Abrir la política en knowlyapps.com', }
- [warning] trilang-missing-all-planned-locales app/quizzes/result_view.tsx:76 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: rankInfo.labelRU, uk: rankInfo.labelUK, es: rankInfo.labelES }
- [warning] trilang-missing-all-planned-locales app/settings_themes.tsx:121 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: item.labelRU, uk: item.labelUK, es: item.labelES }
- [warning] trilang-missing-all-planned-locales app/shards_shop.tsx:1482 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Магазин осколков', uk: 'Крамниця уламків', es: 'Tienda de fragmentos', }
- [warning] trilang-missing-all-planned-locales app/streak_stats.tsx:3915 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: engineLeague.nameRU, uk: engineLeague.nameUK, es: engineLeague.nameES ?? engineLeague.nameRU, }
- [warning] trilang-missing-all-planned-locales app/streak_stats.tsx:3922 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: engineLeague.descRU, uk: engineLeague.descUK, es: CLUB_DESC_ES[engineLeague.id] ?? engineLeague.descRU, }
- [warning] trilang-missing-all-planned-locales app/terms_screen.tsx:47 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Открыть условия на сайте Knowly', uk: 'Відкрити умови на сайті Knowly', es: 'Abrir los términos en knowlyapps.com', }
- [warning] trilang-missing-all-planned-locales components/AchievementToast.tsx:200 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: displayedToast.nameUk, ru: displayedToast.nameRu, es: displayedToast.nameEs ?? displayedToast.nameRu, }
- [warning] trilang-missing-all-planned-locales components/AchievementToast.tsx:205 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: displayedToast.descUk, ru: displayedToast.descRu, es: displayedToast.descEs ?? displayedToast.descRu, }
- [warning] trilang-missing-all-planned-locales components/CoachToast.tsx:55 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: labelRu, uk: labelUk, es: labelEs }
- [warning] trilang-missing-all-planned-locales components/CoachToast.tsx:97 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: microLabelRu ?? categoryLabel, uk: microLabelUk ?? microLabelRu ?? categoryLabel, es: microLabelEs ?? microLabelRu ?? categoryLabel, }
- [warning] trilang-missing-all-planned-locales components/CoachToast.tsx:103 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: microLabel ? `Мы заметили трудности с ${microLabel}` : `Мы заметили трудности с темой «${categoryLabel}»`, uk: microLabel ? `Ми помітили труднощі з ${microLabel}` : `Ми поміт
- [warning] trilang-missing-all-planned-locales components/DeleteAccountConfirmModal.tsx:31 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales components/EnergyBar.tsx:32 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Долгое нажатие — восстановить энергию за осколки', uk: 'Довге натискання — відновити енергію за осколки', es: `Mantén pulsado para recuperar energía con ${BRAND_SHARDS_ES}`,
- [warning] trilang-missing-all-planned-locales components/GlobalBroadcastModal.tsx:32 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: payload.titleRu, uk: payload.titleUk, es: payload.titleEs }
- [warning] trilang-missing-all-planned-locales components/GlobalBroadcastModal.tsx:37 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: payload.messageRu, uk: payload.messageUk, es: payload.messageEs }
- [warning] trilang-missing-all-planned-locales components/GlobalBroadcastModal.tsx:120 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: reward.labelRu, uk: reward.labelUk, es: reward.labelEs }
- [warning] trilang-missing-all-planned-locales components/GlobalBroadcastModal.tsx:155 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: payload.reviewCtaRu, uk: payload.reviewCtaUk, es: payload.reviewCtaEs }
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx PT_BR | PTBR missing: pt-BR: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx VI missing: vi: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx ID missing: id: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx TR missing: tr: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx PL missing: pl: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] trilang-missing-all-planned-locales components/LessonEnergyLightning.tsx:32 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Долгое нажатие — восстановить энергию за осколки', uk: 'Довге натискання — відновити енергію за осколки', es: `Mantén pulsado para recuperar energía con ${BRAND_SHARDS_ES}`,
- [warning] trilang-missing-all-planned-locales components/PremiumGoldButton.tsx:29 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Получить Премиум', uk: 'Отримати Premium', es: 'Obtener Premium', }
- [warning] dynamic-trilang-copy components/ReleaseNotesModal.tsx:98: triLang uses a dynamic copy object; UI locale audit cannot prove planned locales are present. | triLang(lang, TEXT.title)
- [warning] dynamic-trilang-copy components/ReleaseNotesModal.tsx:99: triLang uses a dynamic copy object; UI locale audit cannot prove planned locales are present. | triLang(lang, TEXT.subtitle)
- [warning] dynamic-trilang-copy components/ReleaseNotesModal.tsx:104: triLang uses a dynamic copy object; UI locale audit cannot prove planned locales are present. | triLang(lang, TEXT.body)
- [warning] trilang-missing-all-planned-locales components/ReleaseNotesModal.tsx:233 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: 'Закрити', ru: 'Закрыть', es: 'Cerrar', }
- [warning] dynamic-trilang-copy components/ReleaseNotesModal.tsx:321: triLang uses a dynamic copy object; UI locale audit cannot prove planned locales are present. | triLang(lang, TEXT.cta)
- [warning] dynamic-trilang-copy components/StatsPremiumBlur.tsx:49: triLang uses a dynamic copy object; UI locale audit cannot prove planned locales are present. | triLang(lang, titleByContext[context])
- [warning] i18n-t-bundle-missing-planned-locales constants/i18n.ts:37 T.<locale> missing: pt-BR, vi, id, tr, pl: constants/i18n.ts does not define UI string bundles for all planned interface locales.
