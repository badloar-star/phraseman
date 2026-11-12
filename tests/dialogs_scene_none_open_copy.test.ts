// зачем (обход экранов 12.11, координатор): хаб «Диалоги» писал «Пока всё открытое пройдено» при «0 из 76» — человек не прошёл ничего,
// а ему говорили, что прошёл всё. Сторож: при 0 пройденных и без открытого диалога — текст про ранг, а «всё пройдено» — только если что-то пройдено;
// и журнал [DIALOG-UNLOCK] называет причину пустой сцены.
import { buildDialogsSceneCopy } from '../components/dialogs/scene/dialogs_scene_copy';
import { summarizeDialogsUnlock, type DialogsUnlockItem } from '../components/dialogs/scene/dialogs_unlock_log';

const LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

function copyFor(lang: (typeof LANGS)[number], doneCount: number) {
  return buildDialogsSceneCopy({ lang, state: 'next', plus: false, dialog: null, following: null, quotaRemaining: 20, quotaTotal: 30, resetDate: null, voicePerDay: null, doneCount, totalCount: 76 });
}

describe('Диалоги: ничего не открыто и ничего не пройдено', () => {
  it('«0 из 76» — не «всё открытое пройдено», а текст про ранг, без кнопки', () => {
    const c = copyFor('ru', 0);
    expect(c.title).toBe('Диалоги откроются с новым рангом');
    expect(c.sub).toBe('Проходи уроки и копи монеты — с рангом откроется первый диалог.');
    expect(c.title).not.toBe('Пока всё открытое пройдено');
    expect(c.cta).toBeNull();
  });

  it('пройден хотя бы один — прежний текст «всё открытое пройдено»', () => {
    expect(copyFor('ru', 3).title).toBe('Пока всё открытое пройдено');
  });

  it('на всех 9 языках два текста различаются и не пусты', () => {
    for (const lang of LANGS) {
      const none = copyFor(lang, 0);
      const all = copyFor(lang, 1);
      expect(none.title.trim().length).toBeGreaterThan(0);
      expect(none.sub?.trim().length ?? 0).toBeGreaterThan(0);
      expect(none.title).not.toBe(all.title);
    }
  });
});

describe('[DIALOG-UNLOCK]: причина пустой сцены', () => {
  const locked = (id: string, rankRequired: number): DialogsUnlockItem => ({ id, status: 'locked', rankRequired });

  it('ранг неизвестен — все закрыты, причина rank_unknown', () => {
    const s = summarizeDialogsUnlock([locked('social_01', 1), locked('work_01', 2)], null);
    expect(s).toEqual({ open: 0, done: 0, locked: 2, nearestLockedRank: 1, reason: 'rank_unknown' });
  });

  it('ранг 0 у нового — ничего не открыто на этом ранге', () => {
    expect(summarizeDialogsUnlock([locked('social_01', 1)], 0).reason).toBe('nothing_unlocked_at_rank');
  });

  it('пройденное есть, открытых нет — all_open_done; открытый есть — has_next', () => {
    expect(summarizeDialogsUnlock([{ id: 'social_01', status: 'done', rankRequired: 0 }, locked('work_01', 1)], 0).reason).toBe('all_open_done');
    expect(summarizeDialogsUnlock([{ id: 'social_01', status: 'available', rankRequired: 0 }], 0).reason).toBe('has_next');
  });
});
