import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';

const sourcePath = path.resolve('app/settings_notifications.tsx');
const source = fs.readFileSync(sourcePath, 'utf8');
const sourceFile = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

const normalizeCheckoutEol = value => value.replaceAll('\r\n', '\n');
const sha256 = value => crypto.createHash('sha256').update(normalizeCheckoutEol(value)).digest('hex');

function findNamedNode(name, ast = sourceFile) {
  let match;
  const visit = node => {
    if (match) return;
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) match = node;
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) match = node;
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.ok(match, `${name} is present`);
  return match;
}

function findArrowContaining(fragment) {
  let match;
  const visit = node => {
    if (match) return;
    if (ts.isArrowFunction(node) && node.getText(sourceFile).includes(fragment)) match = node;
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  assert.ok(match, `callback containing ${fragment} is present`);
  return match.getText(sourceFile);
}

const protectedHashes = {
  SimplePicker: 'c09930bd91831d761d027dedc87b5c960643114427a0b9fbe54d67d34684b23b',
  // зачем (темы 2.0): кнопка OK модалки — роли цвета темы accent/accentInk (в «Спокойно» = cta/ctaInk).
  // 04.10: OM-TIME — кнопки 48, «Отмена» 700, двоеточие 300, поля панели колёс 18/28.
  // 11.10: «Темы» (cb4ecb396) дописали в разметку комментарий theme-exempt к чёрному затемнению — вид прежний.
  // 12.10 (Тень): окно времени без кромки — внешний слой с plateBoxShadow, кнопки с nested/action тенью; логика прежняя.
  TimeModal: 'c09f0c9d1af4e8d65c80d470e6b560b0f9ea50a5fbdf71be812b4f80eb2aa882', // 11.10: граница дорожки переключателя — switchTrackBorder(glass)
  scheduleTime: 'ba0a7abb3016f9ad6d07373ff26b07a699ca06431ef0ddcfff3268319f36cce1',
  scheduleAnyEnabled: 'c1806f95116fb5a4651c0a115d7db2371ab8109ae9e72fcde2d5ccae4c3d61d8',
  flashSaved: 'a44652baaecc9ed9e907e3bdae4f6e646bc4168cf22fe99de9e7790310390d1b',
  ensurePermissionIfEnabling: '5bea29535c1dc1de592053f15b6b8f3736046f4e1e9a0c5dd3a93047057213e3',
  // зачем (30.09): немой .catch(() => {}) заменён на swallowError('settings_notifications:persistPrefs') в efe19ae9d — правило «немых catch нет».
  // 11.10: в catch добавлен лог [NOTIF-PREFS] persist_failed (правило владельца: немых catch нет), логика отката прежняя.
  // 12.10 (координатор, съёмка R1): dev robot_no_cloud=1 — после мгновенного обновления экрана выход ДО сохранения и облака (только dev, app/dev_robot_no_cloud.ts).
  persistPrefs: '8d354fe49d3e6c504e64f8566e19079f1f64dce1bd4462ac4a2f35dfd692e92f', // перепин 13.10 (№24): только комментарий `// i18n-ok` в строке лога (Макеты 3321a8ce1), логика сохранения не менялась
  // 13.10 (умное напоминание, владелец вариант (а)): после планирования экран берёт фактическое время дней «авто» (setS снимка).
  persistSchedule: '0084d34951676a8fa78c0777a3459fa9781bdad89df29120eab44ba5b608f4bf', // перепин 13.10 (№24): только комментарий `// i18n-ok` в строке лога (Макеты 3321a8ce1), планирование не менялось // 12.10: тот же выход robot_no_cloud
  toggleMaster: '48e7e186a958d38d5d0bd17198b5bfc65f5867b7bdd4b73d58c9bb2cd117b387',
  toggleCategory: 'c735bcda2ed9177b35deec2f91bc78663f8e2f25083628f76e3469de63a9c4f5',
  // 13.10 (умное напоминание): включение без выбора времени — mode 'auto', выбор времени — mode 'manual' (не перетираем никогда).
  toggleDaily: 'dbb31abc66bdb4a0133096137ecf3de932a9e9babbca956f29426d31943badb4',
  confirmTime: '545d9752fd86fc06a5e5195cf0f72bbf78a317c622adcff684d312fe1b4a1636',
};

test('protected scheduling, permission, and modal AST nodes remain byte-identical', () => {
  for (const [name, expected] of Object.entries(protectedHashes)) {
    assert.equal(sha256(findNamedNode(name).getText(sourceFile)), expected, `${name} changed`);
  }
});

test('protected snapshots normalize only checkout CRLF to LF', () => {
  assert.equal(sha256('same\r\ncode'), sha256('same\ncode'));
  assert.notEqual(sha256('same\rcode'), sha256('same\ncode'));
  assert.notEqual(sha256('changed\ncode'), sha256('same\ncode'));

  const crlfSource = normalizeCheckoutEol(source).replaceAll('\n', '\r\n');
  const crlfAst = ts.createSourceFile(sourcePath, crlfSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  for (const [name, expected] of Object.entries(protectedHashes)) {
    assert.equal(sha256(findNamedNode(name, crlfAst).getText(crlfAst)), expected, `${name} survives a CRLF checkout`);
  }
});

test('protected hydration, navigation, recovery, refs, target, and modal props remain literal snapshots', () => {
  assert.match(source, /useFocusEffect\(\s*useCallback\(\(\) => \{\s*void loadNotifSettings\(\)\.then\(setS\);\s*void hydrateNotifPrefsFromStorage\(\)\.then\(setPrefs\);\s*\}, \[\]\)\s*\);/);
  assert.match(source, /const prefsRef = useRef\(prefs\); prefsRef\.current = prefs;\s*const sRef = useRef\(s\); sRef\.current = s;/);
  assert.match(source, /const \{ studyTarget \} = useStudyTarget\(\);/);

  const expectedNavigation = `() => {
          hapticTap();
          // Экран открывается из вкладки «Настройки» — возвращаемся на settings, не на home.
          safeRouterBack(router, '/(tabs)/settings' as any);
        }`;
  const expectedRecovery = `async () => {
              hapticTap();
              // зачем (FINAL_PHASE п.7): исключение из разрешения/планирования было необработанным отказом без следа.
              try {
                const res = await requestNotificationPermissionWithFallback({ openSettingsIfBlocked: true });
                console.warn(\`[NOTIF-PERMISSION] settings: granted=\${res.granted}\`);
                if (res.granted) {
                  setNeedsPermission(false);
                  await applyNotifPrefsSideEffects(prefsRef.current, lang as Lang, { studyTarget });
                  if (scheduleAnyEnabled(sRef.current)) {
                    await scheduleNotifications(sRef.current, lang as Lang, 0, { requestPermission: false, studyTarget });
                  }
                }
              } catch (error) {
                console.warn('[NOTIF-PERMISSION] settings: запрос разрешения или планирование не удались', error);
              }
            }`;
  assert.equal(normalizeCheckoutEol(findArrowContaining("safeRouterBack(router, '/(tabs)/settings' as any)")), expectedNavigation);
  assert.equal(normalizeCheckoutEol(findArrowContaining('openSettingsIfBlocked: true')), expectedRecovery);
  assert.match(source, /<TimeModal\s+visible=\{timeOpen\}\s+hour=\{hour\}\s+minute=\{minute\}\s+timeTitle=\{timeLabel\}\s+cancelLabel=\{cancelLabel\}\s+onConfirm=\{confirmTime\}\s+onCancel=\{\(\) => setTimeOpen\(false\)\}\s+\/>/);
});

test('notification settings use the approved safe liquid-glass shell and card geometry', () => {
  const scrollStart = source.indexOf('<BouncyScrollView');
  const backStart = source.indexOf('accessibilityLabel={backLabel}', scrollStart);
  const titleStart = source.indexOf('{screenTitle}', scrollStart);
  const masterStart = source.indexOf('{masterLabel}', scrollStart);
  assert.ok(scrollStart >= 0 && scrollStart < backStart && backStart < titleStart && titleStart < masterStart, 'header and body live inside the scroll view');
  for (const side of ['Top', 'Bottom', 'Left', 'Right']) assert.match(source, new RegExp(`padding${side}:\\s*insets\\.${side.toLowerCase()}`));
  assert.match(source, /useStableSafeAreaInsets\(\)/);
  assert.match(source, /liquidGlassTokens\(liquidGlassThemeId\)/);
  // 04.10 (profile.html `.rb.bare`): «назад» — голый шеврон, область нажатия 48×44.
  assert.match(source, /style=\{\{ width: 48, height: 44,[^}]*marginTop: 4 \}\}/);
  // 11.10 (паритет profile.html PRF-04): заголовок с разрядкой −0.5.
  assert.match(source, /fontSize:\s*34,\s*lineHeight:\s*40,\s*fontWeight:\s*'700',\s*letterSpacing:\s*-0\.5,\s*marginTop:\s*10/);
  assert.match(source, /const statusCardStyle[^;]*paddingVertical:\s*14[^;]*paddingHorizontal:\s*16[^;]*alignItems:\s*'flex-start'/s);
  assert.match(source, /fontSize:\s*16,\s*lineHeight:\s*22,\s*fontWeight:\s*'700'/);
  assert.match(source, /const rowStyle[^;]*minHeight:\s*64[^;]*paddingVertical:\s*10[^;]*paddingHorizontal:\s*14[^;]*gap:\s*14/s);
  assert.match(source, /width:\s*41,\s*height:\s*41,\s*borderRadius:\s*10/);
  assert.match(source, /<Ionicons name=\{name\} size=\{20\}/);
  assert.match(source, /fontSize:\s*16,\s*lineHeight:\s*21,\s*fontWeight:\s*'700'/);
  // зачем (стиль «Тень», владелец 12.10): строки — плашки с тенью без кромки и клипа.
  assert.match(source, /backgroundColor:\s*glass\.plateFillFrom/);
  assert.match(source, /boxShadow:\s*plateBoxShadow\(glass\)/);
  assert.match(source, /<PlateFill g=\{glass\} radius=\{14\} \/>/);
  // Исключение — рамка текущего часа в колёсике (индикатор выбора, не контейнер): borderTopWidth/borderBottomWidth.
  assert.doesNotMatch(source, /borderWidth:\s*1,\s*borderColor:\s*glass\.glassEdge/);
  assert.doesNotMatch(source, /SectionSheetHeader|CustomSwitch|SafeAreaView|BlurView/);
  assert.doesNotMatch(source, /adjustsFontSizeToFit|numberOfLines=/);
  // зачем (координатор 13.10, Авторизация: системный «Крупный шрифт» ×1,3 ломает заголовки 34/40 pt на 360 dp у pl/es; коммит 687205b5b):
  // кап шрифта допустим ТОЛЬКО на заголовке экрана и ровно 1,15 — перенос по словам остаётся; на остальном тексте экрана кап по-прежнему запрещён.
  const caps = source.match(/maxFontSizeMultiplier=\{[^}]*\}/g) ?? [];
  assert.deepEqual(caps, ['maxFontSizeMultiplier={1.15}'], 'only the screen title is capped, at 1.15');
});

test('master hint and back label retain all nine existing locales', () => {
  assert.match(source, /ru:'Системное разрешение телефона тоже должно быть включено\.'/);
  for (const locale of ['ru', 'uk', 'en', 'es', "'pt-BR'", 'vi', 'id', 'tr', 'pl']) {
    const key = locale.replaceAll("'", "\\'");
    assert.match(source, new RegExp(`const masterHint = L\\(\\{[^;]*${key}:`, 's'));
    assert.match(source, new RegExp(`const backLabel = L\\(\\{[^;]*${key}:`, 's'));
  }
});

test('all supported live controls are bound and retired or invented controls stay absent', () => {
  // зачем (settings-gap-012): при системном запрете строка показывает «выключено» (master = prefs.master && !needsPermission)
  assert.match(source, /label=\{dailyLabel\}[\s\S]*?value=\{master && dailyEnabled\}[\s\S]*?onValueChange=\{toggleDaily\}/);
  assert.match(source, /const master = \(prefs\.master \|\| devShowcase\) && !needsPermission;/);
  // зачем (№18, settings-gap-028): витрина робота — только при dev reminderTime (getDevReminderTime в сторе = null)
  assert.match(source, /const devShowcase = getDevReminderTime\(\) !== null;/);
  assert.match(source, /value=\{master && prefs\.categories\.streak\}/);
  assert.match(source, /\[NOTIF-PERM\] display system_blocked=/);
  for (const [label, category] of [
    ['streakLabel', 'streak'], ['phraseLabel', 'phrase_of_day'], ['energyLabel', 'energy'],
    ['weeklyLabel', 'weekly_recap'], ['monthlyLabel', 'monthly_recap'], ['friendsLabel', 'friends'], ['offersLabel', 'offers'],
    // 11.10 (profile-006, координатор): Шпиль в первом выпуске, сервер уважает pushPrefs.league — тумблер больше не «выдуманный».
    ['spireLabel', 'spire'],
  ]) {
    assert.match(source, new RegExp(`label=\\{${label}\\}[\\s\\S]*?value=\\{master && prefs\\.categories\\.${category}\\}[\\s\\S]*?onValueChange=\\{toggleCategory\\('${category}'\\)\\}`));
  }
  assert.match(source, /\{pad\(hour\)\}:\{pad\(minute\)\}/, 'the time row renders actual saved time');
  assert.doesNotMatch(source, />20:00<|['"]20:00['"]/, 'the actual app does not hardcode demo time');
  assert.doesNotMatch(source, /giftsLabel|toggleCategory\('gifts'\)/);
  assert.match(source, /<View style=\{\[statusCardStyle, \{ marginTop: 18 \}]}[\s\S]{0,250}<Ionicons name="chatbubble-outline" size=\{20\}/);
  assert.match(source, /<ToggleRow label=\{dailyLabel\} icon="flame-outline"/);
  assert.match(source, /<ToggleRow label=\{weeklyLabel\} icon="trending-up-outline"/);
});

test('time is a separate trailing value while its localized label remains free to wrap', () => {
  const timeRow = source.slice(source.indexOf('accessibilityLabel={timeLabel}'), source.indexOf('</PressableHybrid>', source.indexOf('accessibilityLabel={timeLabel}')));
  assert.ok(timeRow.includes('accessibilityValue={{ text: `${pad(hour)}:${pad(minute)}` }}'), 'screen readers receive the current time as the control value');
  assert.match(timeRow, /<FlowText[^>]*style=\{\{[^}]*flex:\s*1,\s*minWidth:\s*0[^}]*\}\}>\{timeLabel\}<\/FlowText>/);
  // зачем (settings-gaps-states .gs-nval, 12.10): значение времени и шеврон через 14, а не 4
  assert.match(timeRow, /<View style=\{\{ flexDirection: 'row', alignItems: 'center', gap: 14[^}]*marginLeft: 8 \}\}>[\s\S]*\{pad\(hour\)\}:\{pad\(minute\)\}[\s\S]*chevron-forward/);
  assert.ok(timeRow.includes("style={{ color: glass.secondary, fontSize: 13, lineHeight: 18, fontWeight: '400' }}"), 'the trailing value matches the mock secondary 13px regular D145 treatment');
});

test('master and daily dependencies propagate disabled accessibility state', () => {
  assert.match(source, /function LocalSwitch[\s\S]*disabled = false[\s\S]*accessibilityState=\{\{ checked: value, disabled \}\}[\s\S]*disabled=\{disabled\}/);
  assert.match(source, /label=\{dailyLabel\}[\s\S]*?disabled=\{!master\}/);
  for (const label of ['streakLabel', 'phraseLabel', 'energyLabel', 'weeklyLabel', 'monthlyLabel', 'friendsLabel', 'offersLabel']) {
    assert.match(source, new RegExp(`label=\\{${label}\\}[\\s\\S]*?disabled=\\{!master\\}`));
  }
  assert.match(source, /accessibilityLabel=\{timeLabel\}[\s\S]*?accessibilityState=\{\{ disabled: !timeRowActive \}\}[\s\S]*?disabled=\{!timeRowActive\}/);
  assert.match(source, /opacity:\s*master \? 1 : 0\.45/);
});

function assertLocalSwitchFeedbackContract(candidate) {
  const openingTag = candidate.match(/function LocalSwitch[\s\S]*?<PressableHybrid([\s\S]*?)\n\s*>/)?.[1] ?? '';
  assert.match(openingTag, /withHaptic=\{false\}/);
  assert.match(openingTag, /withSound=\{false\}/);
  assert.match(openingTag, /onPress=\{\(\) => \{ hapticTap\(\); onValueChange\(!value\); \}\}/);
  assert.equal((openingTag.match(/hapticTap\(\)/g) ?? []).length, 1);
}

test('local switches have one existing haptic and opt out of duplicate component feedback', () => {
  assertLocalSwitchFeedbackContract(source);
  assert.throws(
    () => assertLocalSwitchFeedbackContract(source.replace('withHaptic={false}', '')),
    /withHaptic/,
    'the contract catches an in-memory duplicate-feedback mutation',
  );
  assert.match(source, /width:\s*48,\s*height:\s*29/);
  assert.match(source, /width:\s*21,\s*height:\s*21/);
  assert.match(source, /translateX:\s*value \? 19 : 0/);
});

test('saved feedback reserves its space instead of shifting the title', () => {
  assert.match(source, /opacity:\s*saved && !needsPermission \? 1 : 0/);
  assert.match(source, /pointerEvents="none"/);
  assert.match(source, /accessibilityElementsHidden=\{!saved \|\| needsPermission\}/);
  assert.match(source, /importantForAccessibility=\{saved && !needsPermission \? 'auto' : 'no-hide-descendants'\}/);
});

