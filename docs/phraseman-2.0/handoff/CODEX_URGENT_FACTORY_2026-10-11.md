# ⛔ СРОЧНО, Codex: не коммить `factory_native_course_v1.ts` без манифеста и `auxiliary.json` — одним коммитом

**Не коммить `modules/learning-v2/content/factory_native/factory_native_course_v1.ts` без перегенерации
`factory_native_manifest_v1.generated.ts` и копий `auxiliary.json` — ОДНИМ коммитом. Затем прогнать
`tests/learning_v2_lesson1_bundle_builds.test.ts`.**

## Что случилось (Ядро, 11.10, `npm run release:precheck`)

- В рабочей копии лежит незакоммиченная правка фабрики (+51/−16). Она бросает
  `learning_v2_factory_native_auxiliary_missing`, если у строки манифеста нет `loadAuxiliary`.
- В манифесте записей `loadAuxiliary: () => …` — **0**: нет ни у одной строки занятия (и в рабочей копии, и в HEAD).
- Итог: `tests/learning_v2_lesson1_bundle_builds.test.ts` — **186 из 187 занятий не собираются**. В стор-сборке курс
  Learning V2 теперь включён (caafa92ab) — такой коммит означает «Сессия недоступна» на каждом занятии у всех.
- В HEAD фабрика этого не требует, поэтому закоммиченное состояние такой поломки не содержит.

## ⛔ И в HEAD курс не открывается (прогон Ядра 11.10 на копии HEAD 242ec7f4b)

`tests/learning_v2_lesson1_bundle_builds.test.ts` на чистом HEAD: **130 из 187 занятий не собираются**, включая урок 1, занятие 1.
- Большинство — нет озвучки голоса `ash` в таблице озвучки (`voice=ash transcript="I am fine."`). Это тот же корень, что P1 в воротах качества (579 из 589).
- 14 — `learning_v2_factory_native_projection_invalid` (например урок 2 занятие 11, урок 4 занятие 5: `localized()` получает не объект в `nativeModePayload`).
- 4 — `learning_v2_factory_native_family_unsupported`.

Курс входит в стор-сборку — **стор не собирать и OTA production не выпускать**, пока этот тест не зелёный. Порядок: P1 (озвучка `ash`) → эти 18 занятий → затем пара «фабрика + манифест + auxiliary».

## Как правильно

1. Скопировать `auxiliary.json` в `modules/learning-v2/content/factory_native/generated_release/…` из выпуска (это P2,
   55 файлов) — пересборкой, не руками.
2. Перегенерировать манифест (`scripts/build_learning_v2_factory_native_manifest.mjs`) — у **каждой** строки должен
   появиться `loadAuxiliary`.
3. Проверить:

   ```bash
   npm run test:one -- tests/learning_v2_lesson1_bundle_builds.test.ts
   ```

   Смотреть на текст: `Tests: N passed`, не код возврата.
4. Фабрика + манифест + копии — **одним коммитом**.

## Защита

Сторож `scripts/guard_learning_v2_session_release.mjs` (стоит в pre-commit) теперь останавливает коммит, где фабрика
требует `loadAuxiliary`, а строк манифеста с ним меньше, чем занятий. Он читает то, что уходит в коммит (индекс или HEAD),
поэтому чужие коммиты из-за твоей незаконченной правки в рабочей копии не упадут. Сработал — коммить фабрику вместе с
манифестом, а не обходи сторожа.
