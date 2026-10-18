// зачем (координатор 18.10, список Сайта; прецедент — интро урока, владелец 08:36 «вот это свечение текста убери»): на Android dimezis-BlurView без blurTarget
// снимает экран вместе с текстом панели и кладёт размытую копию под текст — ореол. В шторках и модалках ниже живой блюр на Android выключен; тон и кромка остаются.
import fs from 'node:fs';
import path from 'node:path';

const FILES = [
  'components/modal_fx/HybridSheetShell.tsx',
  'components/ThemedChoiceModal.tsx',
  'components/ThemedConfirmModal.tsx',
  'components/NotificationPermissionModal.tsx',
  'components/NotificationPermissionModalHybrid.tsx',
  'components/ForceUpdateGate.tsx',
  'components/OfflineBanner.tsx',
  'components/UpdateModal.tsx',
];

describe('Android: живой блюр шторок и модалок выключен (нет ореола текста)', () => {
  it.each(FILES)('%s — BlurView рисуется только не на Android, подложка тона осталась', (rel) => {
    const src = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
    const blurs = src.match(/<BlurView\b/g) ?? [];
    expect(blurs).toHaveLength(1);
    expect(src).toMatch(/\{Platform\.OS !== 'android' \? \(\s*<BlurView\b[\s\S]*?\/>\s*\) : null\}/);
    // вид не меняется: заливка тоном под блюром на месте
    expect(src).toMatch(/backgroundColor: (glass\.sheet|glass\.opaqueSheet|cardBg|Platform\.OS === 'android' \? glass\.opaqueSheet)/);
  });
});
