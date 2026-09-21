import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

const lessons = readFileSync("app/(tabs)/lessons.tsx", "utf8");
const copy = readFileSync("app/feature_intro_sections_copy.ts", "utf8");
const requestedIntro = readFileSync(
  "hooks/use_requested_feature_intro.ts",
  "utf8",
);
const featureAssets = readFileSync("app/feature_intro_assets.ts", "utf8");
const pulseCourse = readFileSync(
  "components/learning-v2/LearningV2PulseCourse.tsx",
  "utf8",
);

assert.match(copy, /id: 'legacy_lessons_first_visit'/);
assert.match(copy, /family: 'orbit'/);
assert.match(copy, /art: 'legacy_lessons'/);
assert.match(copy, /ru: 'Открыть старые уроки'/);
assert.match(featureAssets, /FeatureIntroAssetKey[\s\S]*?'legacy_lessons'/);
const legacyLessonsArtHashes: string[] = [];
for (const theme of [
  "dark",
  "gold",
  "olive",
  "midnight",
  "ember",
  "aurora",
  "volt",
  "indigo",
  "sagePorcelain",
]) {
  const assetPath = `assets/images/feature_intros/${theme}/feature-intro-${theme}-legacy-lessons.webp`;
  assert.match(
    featureAssets,
    new RegExp(
      `legacy_lessons: require\\('../assets/images/feature_intros/${theme}/feature-intro-${theme}-legacy-lessons\\.webp'\\)`,
    ),
  );
  assert.equal(existsSync(assetPath), true, `missing ${assetPath}`);
  legacyLessonsArtHashes.push(
    createHash("sha256").update(readFileSync(assetPath)).digest("hex"),
  );
}
assert.equal(
  new Set(legacyLessonsArtHashes).size,
  legacyLessonsArtHashes.length,
  "legacy lessons intro art must be generated separately for every theme",
);

assert.match(lessons, /useRequestedFeatureIntro\(/);
assert.match(lessons, /["']legacy_lessons_first_visit["']/);
assert.match(lessons, /testIdPrefix="legacy-lessons-first-visit"/);
assert.match(lessons, /onLegacyLessons=\{requestLegacyLessons\}/);
assert.match(lessons, /onLater=\{legacyLessonsIntro\.cancel\}/);
assert.match(
  requestedIntro,
  /const cancel[\s\S]*?pending\.current = false;[\s\S]*?setVisible\(false\)/,
);

// зачем: ОТМЕНА правила от 2026-09-17. Владелец 21.09: «убери A1 A2 B1 B2
// кнопочки вверху, пусть всё будет списком как было когда-то». Раньше здесь
// сторожились чипы уровней, их геометрия и подкрутка рельсы к активному
// уровню. Теперь сторожим ОБРАТНОЕ: переключателя быть не должно, а список
// обязан идти сплошняком.
assert.doesNotMatch(
  lessons,
  /const \[legacySelectedLevel/,
  'фильтр по уровню отменён владельцем 21.09 — список идёт сплошняком',
);
assert.doesNotMatch(
  lessons,
  /COURSE_LEVELS\.map/,
  'чипы A1 A2 B1 B2 удалены по прямому указанию владельца 21.09',
);
assert.doesNotMatch(
  lessons,
  /COURSE_LEVEL_RANGES\[legacySelectedLevel\]/,
  'список не режется по уровню: заголовки уровней живут в самом потоке',
);
// Ряд сохраняется целиком: владелец просил убрать ТОЛЬКО уровни.
assert.match(lessons, /testID="legacy-lessons-level-rail"/);
const levelRailWrapper = lessons.slice(
  Math.max(0, lessons.indexOf('testID="legacy-lessons-level-rail"') - 600),
  lessons.indexOf('testID="legacy-lessons-level-rail"'),
);
assert.match(levelRailWrapper, /\{ flex: 1, minWidth: 0 \}/);
assert.match(lessons, /testID="legacy-lessons-level-combo"/);
assert.match(lessons, /testID="legacy-lessons-open-new-lessons"/);
// Заголовки уровней и экзамены обязаны остаться в потоке списка — без них
// сплошной список теряет границы разделов.
assert.match(lessons, /kind: "header",/);
assert.match(lessons, /kind: "exam",/);
assert.match(lessons, /data\.push\(\{ kind: "attestation" \}\)/);
assert.match(lessons, /ru: "Новые уроки"/);
assert.match(lessons, /data=\{legacyFilteredListData\}/);

const legacyBranch = lessons.slice(
  lessons.indexOf('testID="legacy-lessons-catalog"'),
  lessons.indexOf('data={legacyFilteredListData}') + 50,
);
assert.doesNotMatch(legacyBranch, /TabUnderlineButton|Диалоги|Маршрут|label="V2"/);
assert.doesNotMatch(legacyBranch, /t\.textSecondary/);
assert.doesNotMatch(pulseCourse, /testID="learning-v2-open-dialogs"/);
assert.doesNotMatch(pulseCourse, /dialogsLabel: string|onDialogs: \(\) => void/);
assert.doesNotMatch(lessons, /dialogsLabel=\{|onDialogs=\{openDialogs\}/);
assert.match(pulseCourse, /section: \{[\s\S]*?minWidth: 54,[\s\S]*?minHeight: 44/);
assert.match(pulseCourse, /accessibilityRole="tab"[\s\S]*?accessibilityState=\{\{ selected:/);
assert.match(pulseCourse, /utilitySectionText: \{ flexShrink: 1,[\s\S]*?fontSize: 14/);
assert.match(pulseCourse, /<PressableHybrid[\s\S]*?testID=\{`learning-v2-level-/);
assert.match(pulseCourse, /<PressableHybrid[\s\S]*?testID="learning-v2-open-legacy-lessons"/);
assert.match(
  pulseCourse,
  /testID="learning-v2-level-rail"[\s\S]*?<\/ScrollView>[\s\S]*?testID="learning-v2-open-legacy-lessons"/,
);
assert.match(pulseCourse, /utilitySection: \{[\s\S]*?maxWidth: 160/);
// зачем: здесь сторожилась геометрия чипов уровней (minWidth 52 / height 44)
// и отсутствие у них своего alignSelf. Чипы удалены владельцем 21.09, так что
// сторожить нечего. Высота 44 как минимальная область тапа осталась у COMBO —
// проверяем её там, чтобы правило не потерялось вместе с чипами.
const comboChipBlock = legacyBranch.slice(
  legacyBranch.indexOf('testID="legacy-lessons-level-combo"'),
  legacyBranch.indexOf('testID="legacy-lessons-open-new-lessons"'),
);
assert.match(comboChipBlock, /height: 44/);
assert.doesNotMatch(comboChipBlock, /alignSelf: "center"/);
// зачем: «Новые уроки» живут ВНУТРИ рельсы (решение владельца 2026-09-17:
// «это один ряд весь») — рельса открывается, кнопка идёт в ней, рельса
// закрывается. Раньше здесь стояло обратное ожидание (кнопка ПОСЛЕ
// </ScrollView>), и проверка проходила лишь потому, что чипы уровней давали
// совпадение в другом месте файла. Чипы убраны 21.09, ложное совпадение
// исчезло — фиксируем реальный порядок.
assert.match(
  legacyBranch,
  /testID="legacy-lessons-level-rail"[\s\S]*?testID="legacy-lessons-open-new-lessons"[\s\S]*?<\/ScrollView>/,
);
// зачем: ширина 150 у «Новых уроков» ОТМЕНЕНА владельцем 2026-09-17 — чип
// получил тот же размер, что остальные кнопки ряда (52x44), «чтобы ряд
// читался как единая лента». Проверка на 150 оставалась зелёной только из-за
// совпадения в блоке чипов уровней; после их удаления 21.09 она вскрылась.
const newLessonsChipBlock = legacyBranch.slice(
  legacyBranch.indexOf('testID="legacy-lessons-open-new-lessons"'),
);
assert.match(newLessonsChipBlock, /width: 52/);
assert.match(newLessonsChipBlock, /height: 44/);
// зачем: подпись у «Новых уроков» отменена владельцем 2026-09-17 («кнопка
// должна быть такого же размера») — текст не влезал в 52pt без ужатия шрифта,
// а ужимать владелец запрещает. Осталась иконка, название несёт
// accessibilityLabel. Поэтому fontSize/flexShrink/textAlign больше не
// сторожим: их в кнопке нет.
assert.match(newLessonsChipBlock, /name="sparkles"/);
// Шаблонный testID `legacy-lessons-level-${level}` ушёл вместе с чипами
// уровней (владелец 21.09). Остаётся фиксированный COMBO.
assert.doesNotMatch(legacyBranch, /testID=\{`legacy-lessons-level-/);
assert.match(legacyBranch, /<PressableHybrid[\s\S]*?testID="legacy-lessons-open-new-lessons"/);

// зачем: на узком экране рельса листается, и это ОБЯЗАНО быть видно. Владелец
// 2026-09-17 видел срезанный B2 и не понимал, что ряд можно листать. Признак
// даётся тоном (градиент у правого края) — обводки контейнеров запрещены.
assert.match(
  legacyBranch,
  /testID="legacy-lessons-level-rail"[\s\S]*?<\/ScrollView>[\s\S]*?<LinearGradient[\s\S]*?pointerEvents="none"/,
);
// Затухание не имеет права перехватывать тап по чипу под ним.
assert.match(legacyBranch, /<LinearGradient[\s\S]*?pointerEvents="none"/);
// зачем: здесь сторожилась подкрутка рельсы к активному уровню
// (revealSelectedLegacyLevel + legacyLevelRailRevealedForRef) — она доводила
// чип B2 в зону видимости на узком экране. Чипов уровней больше нет
// (владелец 21.09), доводить нечего. Сторожим ОТСУТСТВИЕ, чтобы механика не
// вернулась вместе с переключателем.
assert.doesNotMatch(lessons, /revealSelectedLegacyLevel/);
assert.doesNotMatch(lessons, /legacyLevelRailRevealedForRef/);

process.stdout.write("LEARNING V2 LEGACY LESSONS ENTRY 2026-09-12: PASS\n");
