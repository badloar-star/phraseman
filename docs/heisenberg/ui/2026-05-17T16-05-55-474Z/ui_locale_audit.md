# Heisenberg UI Locale Audit

Generated: 2026-05-17T16:05:55.473Z
Activation ready: no
Planned locales: pt-BR, vi, id, tr, pl

## Summary
- Files scanned: 580
- triLang calls: 1510
- Static triLang calls: 1509
- Dynamic triLang calls: 1
- triLang missing locale units: 140
- triLang calls missing all planned locales: 28
- Bundle missing locale units: 10

## Finding Codes
- trilang-missing-all-planned-locales: 28
- lang-context-bundle-missing-planned-locale: 5
- dynamic-trilang-copy: 1
- i18n-t-bundle-missing-planned-locales: 1

## Top Files
- app/(tabs)/friends.tsx: 4 findings, 20 missing locale units
- components/CoachToast.tsx: 3 findings, 15 missing locale units
- app/diagnostic_test.tsx: 2 findings, 10 missing locale units
- app/level_gift_system.ts: 2 findings, 10 missing locale units
- app/streak_stats.tsx: 2 findings, 10 missing locale units
- components/AchievementToast.tsx: 2 findings, 10 missing locale units
- components/GlobalBroadcastModal.tsx: 2 findings, 10 missing locale units
- components/LangContext.tsx: 5 findings, 5 missing locale units
- app/(tabs)/settings.tsx: 1 findings, 5 missing locale units
- app/community_pack_create.tsx: 1 findings, 5 missing locale units
- app/exam.tsx: 1 findings, 5 missing locale units
- app/friends_screen.tsx: 1 findings, 5 missing locale units
- app/hint.tsx: 1 findings, 5 missing locale units
- app/lesson_help.tsx: 1 findings, 5 missing locale units
- app/premium_modal.tsx: 1 findings, 5 missing locale units
- app/preposition_drill.tsx: 1 findings, 5 missing locale units
- app/quizzes/result_view.tsx: 1 findings, 5 missing locale units
- app/settings_themes.tsx: 1 findings, 5 missing locale units
- components/DeleteAccountConfirmModal.tsx: 1 findings, 5 missing locale units
- constants/i18n.ts: 1 findings, 5 missing locale units
- components/ReleaseNotesModal.tsx: 1 findings, 0 missing locale units

## First Findings
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:859 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:945 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:1138 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:1239 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/(tabs)/settings.tsx:92 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/community_pack_create.tsx:110 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/diagnostic_test.tsx:1141 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: q.hintRU, uk: q.hintUK, es: q.hintES }
- [warning] trilang-missing-all-planned-locales app/diagnostic_test.tsx:1290 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: q.hintRU, uk: q.hintUK, es: q.hintES }
- [warning] trilang-missing-all-planned-locales app/exam.tsx:363 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/friends_screen.tsx:123 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/hint.tsx:1155 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: hint.titleRU, uk: hint.titleUK, es: hint.titleES }
- [warning] trilang-missing-all-planned-locales app/lesson_help.tsx:19384 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: theory.titleUK, ru: theory.titleRU, es: theoryTitleEs }
- [warning] trilang-missing-all-planned-locales app/level_gift_system.ts:67 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: g.titleRU, uk: g.titleUK, es: g.titleES ?? g.titleRU }
- [warning] trilang-missing-all-planned-locales app/level_gift_system.ts:71 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: g.descRU, uk: g.descUK, es: g.descES ?? g.descRU }
- [warning] trilang-missing-all-planned-locales app/premium_modal.tsx:943 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/preposition_drill.tsx:494 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: item.explainUK, ru: item.explainRU, es: item.explainES ?? item.explainRU, }
- [warning] trilang-missing-all-planned-locales app/quizzes/result_view.tsx:76 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: rankInfo.labelRU, uk: rankInfo.labelUK, es: rankInfo.labelES }
- [warning] trilang-missing-all-planned-locales app/settings_themes.tsx:121 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: item.labelRU, uk: item.labelUK, es: item.labelES }
- [warning] trilang-missing-all-planned-locales app/streak_stats.tsx:3915 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: engineLeague.nameRU, uk: engineLeague.nameUK, es: engineLeague.nameES ?? engineLeague.nameRU, }
- [warning] trilang-missing-all-planned-locales app/streak_stats.tsx:3922 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: engineLeague.descRU, uk: engineLeague.descUK, es: CLUB_DESC_ES[engineLeague.id] ?? engineLeague.descRU, }
- [warning] trilang-missing-all-planned-locales components/AchievementToast.tsx:200 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: displayedToast.nameUk, ru: displayedToast.nameRu, es: displayedToast.nameEs ?? displayedToast.nameRu, }
- [warning] trilang-missing-all-planned-locales components/AchievementToast.tsx:205 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: displayedToast.descUk, ru: displayedToast.descRu, es: displayedToast.descEs ?? displayedToast.descRu, }
- [warning] trilang-missing-all-planned-locales components/CoachToast.tsx:55 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: labelRu, uk: labelUk, es: labelEs }
- [warning] trilang-missing-all-planned-locales components/CoachToast.tsx:97 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: microLabelRu ?? categoryLabel, uk: microLabelUk ?? microLabelRu ?? categoryLabel, es: microLabelEs ?? microLabelRu ?? categoryLabel, }
- [warning] trilang-missing-all-planned-locales components/CoachToast.tsx:103 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: microLabel ? `Мы заметили трудности с ${microLabel}` : `Мы заметили трудности с темой «${categoryLabel}»`, uk: microLabel ? `Ми помітили труднощі з ${microLabel}` : `Ми поміт
- [warning] trilang-missing-all-planned-locales components/DeleteAccountConfirmModal.tsx:31 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales components/GlobalBroadcastModal.tsx:32 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: payload.titleRu, uk: payload.titleUk, es: payload.titleEs }
- [warning] trilang-missing-all-planned-locales components/GlobalBroadcastModal.tsx:37 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: payload.messageRu, uk: payload.messageUk, es: payload.messageEs }
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx PT_BR | PTBR missing: pt-BR: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx VI missing: vi: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx ID missing: id: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx TR missing: tr: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] lang-context-bundle-missing-planned-locale components/LangContext.tsx PL missing: pl: components/LangContext.tsx does not define a full runtime string bundle for this planned interface locale.
- [warning] dynamic-trilang-copy components/ReleaseNotesModal.tsx:137: triLang uses a dynamic copy object; UI locale audit cannot prove planned locales are present. | triLang(lang, TEXT.body)
- [warning] i18n-t-bundle-missing-planned-locales constants/i18n.ts:37 T.<locale> missing: pt-BR, vi, id, tr, pl: constants/i18n.ts does not define UI string bundles for all planned interface locales.
