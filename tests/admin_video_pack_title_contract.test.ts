// зачем (владелец 17.10, R110): «название придумывается всегда автоматически… не более 2–3 слов» — в админке после извлечения фраз
// название набора появляется само (adminSuggestVideoPackTitle), его можно поправить руками (перевод через adminTranslateMessage),
// «Другой вариант» просит новое, и оно уходит в черновик (packTitles) — публикация и пересборка берут его оттуда.
import fs from 'fs';
import path from 'path';

const html = fs.readFileSync(path.join(__dirname, '..', 'admin', 'v2', 'legacy.html'), 'utf8').replace(/\r\n/g, '\n');
const server = fs.readFileSync(path.join(__dirname, '..', 'functions', 'src', 'video_phrases.ts'), 'utf8').replace(/\r\n/g, '\n');
const index = fs.readFileSync(path.join(__dirname, '..', 'functions', 'src', 'index.ts'), 'utf8');

describe('admin video pack auto title', () => {
  it('has the title field, «Другой вариант» and the 9-language line in the phrase editor', () => {
    expect(html).toContain('id="vp-pack-title"');
    expect(html).toContain('maxlength="40"');
    expect(html).toContain('id="vp-title-another"');
    expect(html).toContain('id="vp-title-langs"');
  });

  it('suggests right after phrases are extracted and when a set without a saved title is opened', () => {
    expect(html).toContain("state.phrases=phrases;state.versionId='';renderReview();state.titleHistory=[];void vpSuggestTitle('after-parse');");
    expect(html).toContain('renderReview();vpTitleLoad(source);');
    expect(html).toMatch(/call\('adminSuggestVideoPackTitle',\{videoId,phrases:phrases\.slice\(0,40\)/);
  });

  it('a manual edit is translated with the existing admin translator; «another» passes previous variants to avoid', () => {
    expect(html).toContain("call('adminTranslateMessage',{fields:[ru]");
    expect(html).toContain("avoid:state.titleHistory.slice(-10)");
    expect(html).toContain("byId('vp-title-another')?.addEventListener('click',()=>{void vpSuggestTitle('another')});");
  });

  it('stale answers are dropped and every branch logs [VIDEO-PACK-TITLE]', () => {
    expect(html).toContain("if(req!==state.titleRequest||videoId!==state.selectedVideoId){console.log('[VIDEO-PACK-TITLE] suggest:stale'");
    for (const tag of ['suggest:skip', 'suggest:start', 'suggest:ok', 'suggest:fail', 'load:saved', 'load:none', 'translate:ok', 'translate:fail', 'save:titles']) {
      expect(html).toContain(`[VIDEO-PACK-TITLE] ${tag}`);
    }
  });

  it('the draft save carries the titles; publish and backfill read them from the version', () => {
    expect(html).toContain("phrases,packTitles:vpTitlesForSave()});");
    expect(server).toContain("...(packTitles ? { packTitles } : {})");
    expect(server).toContain('publishedPackTitles = normalizeVideoPackTitles(data.packTitles);');
    expect(server).toContain('packTitles: normalizeVideoPackTitles(data.packTitles),');
    expect(index).toContain('export { adminSuggestVideoPackTitle } from "./video_pack_title";');
  });
});
