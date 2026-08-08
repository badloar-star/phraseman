# Порт режимов Kimi V5 → RN-лаборатория (Уроки → V2)

> зачем: владелец проверил лабораторию — НИ ОДИН режим не соответствовал макетам,
> потому что первая версия была написана «из головы» (4 шаблонных взаимодействия),
> а не по исходникам Kimi. Этот план — дословный порт настоящих поверхностей.
> Источник истины: `C:\Users\badlo\Documents\kimi\workspace\kimi-delivery\learning-v2-frontend\20260719-0858-k3\source\src\`
> (резерв: `C:\appsprojects\phraseman-backups\kimi-learning-v2-frontend-20260719-0858-k3\source\src\`).
> Скриншоты для сверки: `<delivery>\screenshots\mobile\<surface>__<state>__*.png`.

## Правила порта (обязательные)
1. НЕ выдумывать: каждый экран = перевод соответствующего `.tsx` Kimi + его фикстуры
   (`source/src/fixtures/index.ts`, `surfaces/modes2/fixtures.ts`, `voice-fixtures.ts`).
   Копия фикстур в RN: `components/learning-v2-lab/kimi/fixtures/…` (дословно).
2. Визуал = токены cinema-темы из `styles/tokens.css` → `kimi/tokens.ts`
   (+ mode-акценты: listen #6C8EFF, missing-word #A78BFA, phrase-build #34D399,
   pronunciation #F472B6, natural-choice #FBBF24; state-цвета шести состояний).
   CSS-блоки в `styles/base.css` (`.ashell`, `.optgrid`, `.chip`, `.choiceshell`,
   `.composer`, `.voice…`, `.lc__…` и т.д.) — источник размеров/отступов/радиусов.
3. Геометрия ActivityShell СТАБИЛЬНА между 6 состояниями: header(state-badge+title)
   → prompt lane → interaction lane → feedback lane (status dot + сообщение из
   фикстуры + inline progressbar в processing + FeedbackNote) → footer
   (1 primary + ≤1 ghost secondary). Никаких полноэкранных спиннеров.
4. Состояния: prompt/active/processing/success/needs_work/recovery
   (contracts/states.ts). primary-лейблы и statusMessages — ИЗ ФИКСТУР (copy.*).
   Вердикт: submit → processing → success|needs_work по правильности (наш плеер),
   визуал состояний — Kimi.
5. ~~Речевые режимы — с симуляцией распознавания~~ — ОТМЕНЕНО решением владельца
   (см. ниже): VoiceActivityShell портирован полностью, но подключён к НАСТОЯЩЕМУ
   микрофону (`kimi/use_voice_capture.ts` поверх expo-speech-recognition +
   `app/speaking_recognition_options.ts`), распознавание только на устройстве.
6. Запреты владельца поверх: обводки контейнеров из макетов сохраняем ТОЛЬКО как
   тонкие state-границы Kimi (это их дизайн-система,允 в лаборатории), но не
   добавляем своих; adjustsFontSizeToFit — никогда.

## Решения владельца (2026-07-26) — не переспрашивать
1. **Состояния — «как у Duolingo»**: живой цикл без служебной панели переключения.
   Выбрал ответ → «Проверить» → короткий inline-processing → success/needs_work по
   правильности → «Дальше». Recovery показывается только при реальном сбое.
2. **Речевые режимы — НАСТОЯЩИЙ микрофон**, распознавание **только на устройстве**
   (голос никуда не отправляется и не хранится). Это отменяет пункт 5 «симуляция».
   **Privacy Policy править НЕ нужно** — проверено 2026-07-26: `privacy.html` §13
   уже описывает запрос микрофона и распознавание речи, прямо со словами
   «speech may be processed on device»; §18 называет микрофон основанием «согласие».
   Разрешения тоже уже настроены — `app.config.js` (плагин expo-speech-recognition).
   Следствие: экраны Kimi, обещающие СЕТЕВУЮ обработку голоса, НЕ показываются
   (карточка consent в qr-quick-response и приватность-сводка в cm-speaking-club) —
   тексты сохранены в фикстурах дословно, но на экране идёт правдивая сводка
   «обрабатывается на устройстве». Обещать передачу, которой нет, нельзя.
3. **Порядок сдачи — волнами по 4–5 режимов**, коммит за режимом. Речевые — последней
   волной, после 12 неречевых.

## Целевая структура в приложении (ветка feature/referral-roulette)
```
components/learning-v2-lab/
  kimi/
    tokens.ts            ← styles/tokens.css (cinema) + mode-акценты
    LabState.tsx         ← мини-контекст: state, verdict, logIntent (замена LabContext)
    ActivityShell.tsx    ← shell/ActivityShell.tsx (165 строк)
    ChoiceShell.tsx      ← surfaces/mobile/shared/ChoiceShell.tsx
    ComposerShell.tsx    ← surfaces/mobile/shared/ComposerShell.tsx (+ComposerInput)
    VoiceShell.tsx       ← surfaces/modes2/VoiceActivityShell.tsx
    OptionGrid.tsx       ← components/OptionGrid.tsx
    SignalButton.tsx     ← components/SignalButton.tsx
    FeedbackNote.tsx     ← components/FeedbackNote.tsx
    primitives.tsx       ← GraphemeText, ScriptAnnotation, IntentButton(вариант RN)
    fixtures/core.ts     ← fixtures/index.ts (148 строк, дословно)
    fixtures/modes2.ts   ← surfaces/modes2/fixtures.ts
    fixtures/voice.ts    ← surfaces/modes2/voice-fixtures.ts
    surfaces/<Mode>.tsx  ← по одному на режим (список ниже)
  LearningV2ModesLab.tsx ← список: каталог поверхностей Kimi (не абстрактные семьи)
  ModeDemoPlayer.tsx     → замещается роутером на kimi/surfaces
```

## Чек-лист режимов (источник → цель → статус)
| # | Kimi surface | Файл-источник | Статус |
|---|---|---|---|
| 1 | lc-listen-choose | mobile/LcListenChoose.tsx (ChoiceShell) | ✅ |
| 2 | vd-visual-discovery | mobile/VdVisualDiscovery.tsx | ✅ |
| 3 | sm-speed-match | mobile/SmSpeedMatch.tsx | ✅ |
| 4 | pb-phrase-builder | mobile/PbPhraseBuilder.tsx (ComposerShell) | ✅ |
| 5 | lb-listen-build | mobile/LbListenBuild.tsx (ComposerShell) | ✅ |
| 6 | cg-context-gap | mobile/CgContextGap.tsx | ✅ |
| 7 | sound-discrimination | mobile/SoundDiscrimination.tsx | ✅ |
| 8 | sl-sound-syllable-lab | modes2/SlSoundSyllableLab.tsx | ✅ |
| 9 | rp-repeat-compare | modes2/RpRepeatCompare.tsx (VoiceShell) | ✅ |
| 10 | qr-quick-response | modes2/QrQuickResponse.tsx (VoiceShell) | ✅ |
| 11 | sh-shadowing | modes2/ShShadowing.tsx (VoiceShell) | ✅ |
| 12 | mr-microstory | modes2/MrMicrostory.tsx | ✅ |
| 13 | ba-branching-scene | modes2/BaBranchingScene.tsx | ✅ |
| 14 | sd-scripted-dialogue | modes2/SdScriptedDialogue.tsx (VoiceShell) | ✅ |
| 15 | cm-speaking-club | modes2/CmSpeakingClub.tsx (VoiceShell) | ✅ |
| 16 | pr-personal-review | modes2/PrPersonalReview.tsx | ✅ |
| 17 | cp-checkpoint | modes2/CpCheckpoint.tsx | ✅ |
| — | ds-describe-scene | modes2/DsDescribeScene.tsx — СНЯТ владельцем, в каталоге с бейджем | ⬜ |

Скриптовые поверхности (zh/ja/ko/ar, writing-system-hub, episode-map, session-runner,
practice-lab, stars) — ВТОРАЯ волна после 17 режимов.

## Порядок работы каждого режима
1. Прочитать исходник Kimi + его фикстуру + CSS-блоки его классов из base.css.
2. Портировать в `kimi/surfaces/<Mode>.tsx` на общих оболочках.
3. Сверить со скриншотами `screenshots/mobile/<surface>__*` (Read PNG).
4. Обновить чек-лист здесь (⬜→✅), закоммитить атомарно в feature/referral-roulette.

## Как проверить (владелец)
Metro из C:\appsprojects\phraseman → Уроки → V2 → режим.
