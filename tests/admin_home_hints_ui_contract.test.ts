import fs from 'fs';
import path from 'path';

const adminSource = fs.readFileSync(path.join(process.cwd(), 'admin/v2/legacy.html'), 'utf8');

describe('home hints admin surface', () => {
  it('keeps the picker on the single live admin surface', () => {
    expect(adminSource).toContain("switchTab('home-hints')");
    expect(adminSource).toContain('id="tab-home-hints"');
    expect(adminSource).toContain('id="home-hints-catalog"');
    expect(adminSource).toContain('id="home-hints-preview-list"');
  });

  it('has explicit load, preview and publish actions', () => {
    expect(adminSource).toContain('window.loadHomeHintsCatalog');
    expect(adminSource).toContain('window.publishHomeHints');
    expect(adminSource).toContain("call('adminGetHomeHintsCatalog'");
    expect(adminSource).toContain("call('adminPublishHomeHints'");
    expect(adminSource).toContain('Укажи причину публикации');
  });
});
