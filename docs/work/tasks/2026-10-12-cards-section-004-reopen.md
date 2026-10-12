# Task packet: cards-section-004 возвращена в работу, кадр cards-v2-030 под её id, общий порядок обновления хэша кадра

Governance-ID: TG-3E37015F56B4
Status: In progress
Owner: сессия «3 · Макеты» по поручению координатора
Related epic/enabler: непрерывная сверка паритета (RELEASE_PLAN_2026-10-11.md)

## Outcome

Строка cards-section-004 (cards-section.html №4, «Хаб — лимит исчерпан (Free)», вариант А) возвращена из removed_by_owner в работу, ей привязан кадр приложения (копия cards-v2-030.png) и выставлен вердикт. В блок A журнала MOCKUPS_ALIGNED_TO_CODE_R1.md записана пометка о возврате (владельцу подтвердить). По общему разрешению координатора: если файл кадра новее записи в реестре, обновляются evidence_at и evidence_sha256 по файлу и ставится вердикт (paywalls-014). Мера успеха: число строк реестра прежнее, cards-003 и cards-gap-013 не тронуты.

## Scope

In scope: registries/visual_parity.json (cards-section-004, paywalls-014 по id), evidence/parity/cards-section-004.png (копия кадра), docs/phraseman-2.0/MOCKUPS_ALIGNED_TO_CODE_R1.md.

Out of scope: код приложения; cards-section.html (под замком); строки cards-003, cards-gap-013.

## Architecture

No architecture change: реестр и документация.

## Security and privacy

Данных пользователей нет.

## Technical debt

Contain: снятие по п.55 признано ошибочным координатором, владельцу подтвердить утром.

## Verification

Число строк реестра прежнее; хэш кадра в записи равен sha256 файла.

## Rollback

Откат коммита.
