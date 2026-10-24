// ЗАМОК по заданию «Скажи вслух» (макет docs/design/v2-app/learning-v2-tasks-review.html, колонка «Предлагаем», `.micl`; закон владельца 22.10 «макет 1:1, ничего не толкуем»;
// реестр docs/work/OWNER_LOCKS.md). Падает, если подпись под микрофоном вернут к «Устно» или оживят удалённую строку.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('Замок: задание «Скажи вслух» — подпись под микрофоном по макету', () => {
  const player = read('app/learning_v2_direct_session_player_v1.tsx');
  const modeCopy = read('modules/learning-v2/modes/mode_copy_v1.ts');

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «макет 1:1» — под микрофоном «Удерживай и говори» (`.micl`), а не «Устно»
  it('под микрофоном стоит «Удерживай и говори» на девяти языках, «Устно» там нет', () => {
    const block = /const holdToSpeakLabel = triLang\(lang, \{([\s\S]*?)\}\);/u.exec(player)?.[1] ?? '';
    for (const text of ['Удерживай и говори', 'Утримуй і говори', 'Hold and speak', 'Mantén pulsado y habla', 'Segure e fale', 'Giữ và nói', 'Tahan dan bicara', 'Basılı tut ve konuş', 'Przytrzymaj i mów']) {
      expect(block).toContain(`"${text}"`);
    }
    expect(player).toContain(': holdToSpeakLabel}');
    expect(player).not.toContain('footerVoiceLabel');
    expect(player).not.toMatch(/ru: "Устно"/u);
  });

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «макет 1:1» — мёртвая строка «Удерживай микрофон внизу…» убрана, второй подписи нет
  it('мёртвой строки holdMicrophone в копии режима нет', () => {
    expect(modeCopy).not.toContain('holdMicrophone');
  });
});
