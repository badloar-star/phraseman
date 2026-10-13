// зачем (Макеты cards-074, решение координатора 13.10): вторичные экраны редактора набора (недоступно для правки, недоступно в сборке, скелетон перед пейволом) —
// шапка как у основной формы и в cards-v2 edHead: × слева, заголовок слева; замок пустого состояния контурный.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));
const create = read('app/community_pack_create.tsx');
const header = read('app/community_packs/PackEditorV2.tsx');

describe('редактор набора: шапка вторичных экранов', () => {
  it('renderHeader отдаёт общую шапку EditorHeader, старой ← и центровки нет', () => {
    expect(create).toContain('<EditorHeader g={kg} title={title} closeLabel={backLabel} onClose={goBack} right={right} />');
    expect(create).not.toContain('icon="arrow-back"');
    expect(create).not.toContain("textAlign: 'center' as const, color: g.text, fontSize: 20");
    expect(create).not.toContain('CardsGlassRoundButton');
  });

  it('общая шапка: × слева, заголовок рядом, testID кнопки прежний', () => {
    expect(header).toContain('testID="ugc-pack-back"');
    expect(header).toContain('<Ionicons name="close" size={20} color={g.text} />');
  });

  it('замок экрана «недоступно для правки» — контурный', () => {
    expect(create).toContain('icon="lock-closed-outline"');
    expect(create).not.toMatch(/icon="lock-closed"/);
  });
});
