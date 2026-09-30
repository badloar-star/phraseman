import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('components/PhoneStateRecoveryScreen.tsx', 'utf8');
const recoverySource = readFileSync('app/phone_state_recovery.ts', 'utf8');

const approvedTitles = [
  ["ru", "'Восстанавливаем сохранение'"],
  ["uk", "'Відновлюємо збереження'"],
  ["en", "'Restoring your save'"],
  ["es", "'Restaurando el guardado'"],
  ["'pt-BR'", "'Restaurando o salvamento'"],
  ["vi", "'Đang khôi phục bản lưu'"],
  ["id", "'Memulihkan penyimpanan'"],
  ["tr", "'Kayıt geri yükleniyor'"],
  ["pl", "'Przywracamy zapis'"],
];

const approvedBodies = [
  ["uk", "'Звільняємо місце та відновлюємо збереження…'"],
  ["en", "'Freeing up space and restoring your save…'"],
  ["es", "'Liberando espacio y restaurando el guardado…'"],
  ["'pt-BR'", "'Liberando espaço e restaurando o salvamento…'"],
  ["vi", "'Đang giải phóng dung lượng và khôi phục bản lưu…'"],
  ["id", "'Mengosongkan ruang dan memulihkan penyimpanan…'"],
  ["tr", "'Alan açılıyor ve kayıt geri yükleniyor…'"],
  ["pl", "'Zwalniamy miejsce i przywracamy zapis…'"],
];

assert.match(source, /const AUTOMATIC_RETRY_MS = 5_000;/, 'automatic recovery retry must remain five seconds');
assert.match(source, /useState\(phoneStateDurabilityRecovery\.getSnapshot\(\)\)/, 'first render must hydrate from the current recovery snapshot');
assert.match(source, /useEffect\(\(\) => phoneStateDurabilityRecovery\.subscribe\(\(\) => \{\s*setSnapshot\(phoneStateDurabilityRecovery\.getSnapshot\(\)\);\s*\}\), \[\]\);/, 'screen must subscribe once and return the recovery unsubscribe callback');
assert.match(source, /if \(snapshot\.failedAttempts === 0\) setDismissed\(false\);/, 'successful recovery must reset local dismissal');
assert.match(source, /const timer = setTimeout\(\(\) => \{\s*void phoneStateDurabilityRecovery\.retryPending\(\);\s*\}, AUTOMATIC_RETRY_MS\);\s*return \(\) => clearTimeout\(timer\);\s*\}, \[snapshot\.failedAttempts\]\);/, 'automatic retry must remain cleaned up and independent of modal dismissal');
assert.match(source, /<Modal\s+visible=\{snapshot\.visible && !dismissed\}[\s\S]*?transparent=\{false\}[\s\S]*?onRequestClose=\{\(\) => setDismissed\(true\)\}/, 'native full-screen modal must preserve authoritative visibility and Back-only presentation dismissal');
assert.match(source, /ru: phoneStateRecoveryCopyRu,/, 'approved Russian durability-recovery body must remain wired to the Russian locale');
assert.match(recoverySource, /export const phoneStateRecoveryCopyRu = 'Освобождаем место и восстанавливаем сохранение…';/, 'approved Russian recovery body must remain exact');
for (const [locale, copy] of approvedTitles) {
  assert.ok(source.includes(`${locale}: ${copy}`), `${locale} recovery title must remain exact`);
}
for (const [locale, copy] of approvedBodies) {
  assert.ok(source.includes(`${locale}: ${copy}`), `${locale} recovery body must remain exact`);
}
assert.match(source, /accessibilityRole="alert"/, 'recovery state must retain its accessibility announcement');
assert.match(source, /accessibilityLiveRegion="polite"/, 'recovery announcement politeness must remain unchanged');
assert.match(source, /accessibilityLabel=\{`\$\{title\}\. \$\{body\}`\}/, 'announcement must retain the localized title and body');
assert.match(source, /liquidGlassTokens/, 'recovery presentation must use the active 13-theme material registry');
assert.match(source, /liquidGlassThemeId/, 'recovery presentation must follow the selected Liquid Glass theme');
assert.match(source, /colors=\{\[glass\.bgTop, glass\.bgBottom\]\}/, 'full-screen recovery must use the dark palette gradient');
assert.match(source, /<ResponsiveModalScrollView\s+testID="phone-state-recovery-scroll"[\s\S]*?accessibilityRole="alert"[\s\S]*?\{body\}[\s\S]*?<\/ResponsiveModalScrollView>/, 'localized recovery content must remain inside the safe-area scroll surface');
assert.match(source, /<FullscreenHybridEntrance[\s\S]*?visible=\{snapshot\.visible\}/, 'existing reduced-motion-aware entrance must remain wired to recovery visibility');
assert.doesNotMatch(source, /styles\.card|borderWidth:/, 'recovery state must not retain the old inset outlined card');
assert.doesNotMatch(source, /BlurView/, 'recovery state must not add a heavy blur layer');
