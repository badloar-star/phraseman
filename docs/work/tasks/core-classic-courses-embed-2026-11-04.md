# Ядро · классические курсы EN/ES/FR/DE/IT вшиваются в сборку (04.11)

Governance-ID: TG-D0259739868D
Governance-ID: TG-A9784D499738
Governance-ID: TG-D160D76915DA
Governance-ID: TG-613B3B230D2D
Governance-ID: TG-9C05F008F405
Governance-ID: TG-7AEB7179057B
Governance-ID: TG-09E2E8CBBE64
Governance-ID: TG-8D8E3655EA99
Governance-ID: TG-625E30A58543
Governance-ID: TG-E690033A104B
Governance-ID: TG-B343EE4BCEFD
Governance-ID: TG-7F6E8F2FCFAF
Governance-ID: TG-4188ED8DCDE9
Governance-ID: TG-F105AA5D5A98
Governance-ID: TG-9F041A65A82B
Governance-ID: TG-94BD73D4180A
Governance-ID: TG-806EAD7CB5E1
Governance-ID: TG-B7659595D179
Governance-ID: TG-29D4827EF484
Governance-ID: TG-5AE039A55ED9
Governance-ID: TG-0C6ECDD3E268
Governance-ID: TG-6AB055898121
Governance-ID: TG-06F3F7709A67
Governance-ID: TG-AC1AA71A48C0
Governance-ID: TG-4CFDC3C93754
Governance-ID: TG-D5EA4A0B532E
Governance-ID: TG-419D574ABB4C
Governance-ID: TG-9A992F4F0D48
Governance-ID: TG-D9573B42F790
Governance-ID: TG-3EB023A82AAB
Governance-ID: TG-12CC06B536A0
Governance-ID: TG-92644C835FEC
Governance-ID: TG-CE79AFD10DA6
Governance-ID: TG-1EFE2AE25556
Governance-ID: TG-3C55CFCC6A75
Governance-ID: TG-344A0ABB77C6
Governance-ID: TG-713A03E6FA11
Governance-ID: TG-A80896344D44
Governance-ID: TG-4DA324E7DC0D
Governance-ID: TG-26E4F043EEFD
Governance-ID: TG-8AB4B7598593
Governance-ID: TG-5D6C95AB764B
Governance-ID: TG-BC31D43DDE2E
Governance-ID: TG-110FE3D216DD
Governance-ID: TG-E943A913DDDC
Governance-ID: TG-04C46AFB5D0A
Governance-ID: TG-F7F3860D7EE6
Governance-ID: TG-FE28E835FD43
Governance-ID: TG-BBBE2E1922A7
Governance-ID: TG-2A6016D06E41
Governance-ID: TG-674D03C6B204
Governance-ID: TG-F90497157C00
Governance-ID: TG-83F3BFB6A34E
Governance-ID: TG-8F74CF2F691E
Governance-ID: TG-5D3D76665B19
Governance-ID: TG-5273F936B5C6
Governance-ID: TG-B272CC47232C
Governance-ID: TG-2A285CEA52E6
Governance-ID: TG-97D9304FA903
Governance-ID: TG-D05D64BC2611
Governance-ID: TG-B83802AA895D
Governance-ID: TG-608D3C8C6FC3
Governance-ID: TG-FC7F06CB6E92
Governance-ID: TG-CF0E49B1D658
Governance-ID: TG-F35005AB28FE
Status: In progress
Owner: 1 · ЯДРО (поручение координатора, решение владельца 04.11)

## Outcome
Курсы EN (замена), ES, FR, DE, IT по 32 урока × 50 фраз вшиваются в сборку как рабочая часть (фразы, вступления, теория, словарь).
Заменяют старый основной классический курс языка. PL/PT-BR/CS/KO на холде. Звук — только системный TTS телефона.
Срез 1: сервер принимает цели en|es|fr|de|it (progress_events.normalizeStudyTarget).

## Scope
Срез 1: functions/src/progress_events.ts (+тест), затем клиентский реестр курсов, сброс внутриурочного прогресса при смене rev,
таблица готовности языков (с записью решения в 03_DECISIONS.md). Данные — modules/classic-courses/** (делает 12 · ТЕОРИЯ).
Старые данные курсов не удаляются до слова координатора.

## Architecture
Ключи прогресса для не-EN целей одинаковы на клиенте (target_storage_keys.targetKey) и сервере: `<domain>_v2::<target>::<id>`;
EN остаётся на прежних ключах. Серверная правка обобщает 'fr' до любой поддержанной цели, EN не меняется.

## Security and privacy
Новых данных пользователей нет; значение studyTarget проходит белый список (иначе en).

## Technical debt
Копии списков языков в клиенте (silent fallback to en в phrase_target_utils.ts) — проверяются в срезе клиента.

## Verification
jest точечно через светофор (functions progress_events.test.ts), tsc functions; клиентские тесты среза.

## Rollback
git revert коммита; деплой функции по имени откатывается трафиком на прежнюю ревизию.

## Срез 1, часть B (04.11): вызовы и ярлыки
Scope: lesson1/lesson_complete передают studyTarget в getLessonData и не используют французскую удалённую подгрузку для фраз курса;
ярлыки на значке (expo-quick-actions): конфиг, слушатель → существующие маршруты, 9 языков, сторож «конфиг ↔ маршруты».
Прогресс пользователей не трогается (сторож 58fddbadd). Флаг CLASSIC_COURSES_RUNTIME_ENABLED остаётся false до слова координатора.

## Хвост среза 1 и энергия от Пика (04.11)
- Ярлыки: правки Ревизора (открывать действие только после онбординга; флаг initial на уровне модуля).
- Синхронизация es/de/it: buildTargetLessonSyncKeys, isServerOwnedProgressKey es|fr|de|it парой клиент+сервер, блок pass_live в firestore.rules.
- Энергия от Пика: spireEnergyBonus (+1/−1 за повышение/понижение, 0..11) в leaderboard/{uid}, потолок 5+max по языкам; замок 28.10 отменён владельцем.
