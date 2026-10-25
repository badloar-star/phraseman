# Пик: сцена от самого верха, шапка «Сообщества» прозрачная поверх (долг замка «верх цельный»)

Governance-ID: TG-46B91DB7D0F1

## Outcome
Координатор 25.10 после сборки 2.0.2: долг Пика — сцена идёт от верха экрана под строкой состояния и под шапкой; шапка с вкладками прозрачная поверх сцены; слой spire_header_layer убрать; свет сцены начинается от верха. Сторож «верх цельный» зелёный.

## Scope
In scope: `app/(tabs)/community.tsx` (шапка поверх сцены, белые вкладки, без SpireSceneHeaderLayer), `components/spire/scene/spire_header_overlay.ts` (высота шапки), `components/spire/SpireHomeScreen.tsx` (отступ ленты под шапку, без новых строк — лимит 400), `components/spire/scene/SpireScene.tsx` (фон над рамкой сцены), тесты spire_scene_contract и сторож замка.
Out of scope: состав вкладок, энергия, макеты.

## Architecture
На Пике со «Сценой» (флаг + сцена на экране) шапка — absolute поверх тела, тело — от верха; высота шапки (onLayout) публикуется в память процесса, лента Пика добавляет её к paddingTop (позиция башни не меняется). Фон сцены (spire_scene_backdrop) рисуется над рамкой сцены со сдвигом -bleed — от верха экрана; затемнение под вкладками — часть того же фона. Вкладки — SPIRE_SCENE_INK.

## Security and privacy
Не касается.

## Technical debt
Файл spire_scene_header остаётся (spireSceneHeaderTone читают тесты), но слой не рисуется.

## Verification
Тесты Пика (jest + node), сторож owner_lock_whole_top, babel; снимок Сверки.

## Rollback
Откатить коммит.
