// ЗАМОК ВЛАДЕЛЬЦА 05.11 (через координатора, дословно): «ЗАКРЫТЫЙ РАЗДЕЛ НЕЛЬЗЯ ОТКРЫТЬ, ЕСЛИ РАНГ ЕЩЁ НЕ ОТКРЫТ — ТАКОГО РАЗДЕЛА ПРОСТО НЕТ, ПОКА НЕ ОТКРЫТ РАНГ; экран-заглушку
// «Откроется на ранге N» вообще не добавлять». Реестр docs/work/OWNER_LOCKS.md, строка 05.11. Ослабить можно только по новому слову владельца: правка файла + строки реестра + KNOWN_GUARDS в tests/owner_locks_registry.test.cjs.
import { decideForUser } from '../app/rank_gate_decision';
import { readSource } from './helpers/read_source';

const code = (rel: string): string => readSource(rel).split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l)).join('\n').replace(/\/\/[^\n]*/g, '');

describe('ЗАМОК ВЛАДЕЛЬЦА 05.11 — закрытого рангом раздела нет: ни входов, ни экрана-заглушки', () => {
  it('экрана «Откроется на ранге N» нет: компонент закрытого маршрута не рисует ничего — ни заголовка, ни кнопок «К занятиям»/«Открыть все с Plus»', () => {
    const src = code('components/home/v2/RankLockedSection.tsx');
    expect(src).toContain('return null;');
    expect(src).not.toMatch(/<Text|<View|V2Pressable|openPremiumPaywall|triLang|Откроется|Opens at rank|К занятиям|To lessons|Unlock all with Plus/);
  });

  it('закрытый маршрут (deep link / ярлык) без ранга тихо возвращает на Главную с логом [RANK-GATE]', () => {
    const src = code('components/home/v2/RankLockedSection.tsx');
    expect(src).toContain("router.replace('/(tabs)/home' as never)");
    expect(src).toContain('[RANK-GATE] closed_route_redirect');
  });

  it('все четыре закрытых маршрута подключают этот тихий возврат: Видео, Диалоги, хаб Карточек, Пик (?section=spire)', () => {
    for (const [file, surface] of [
      ['app/(tabs)/video.tsx', 'video'], ['app/ai_dialog_home.tsx', 'dialogues'], ['app/flashcards/FlashcardsHubScreen.tsx', 'cards_hub'], ['app/(tabs)/community.tsx', 'peak'],
    ] as const) {
      const src = code(file);
      expect(`${file}: ${src.includes('RankLockedSection')}`).toBe(`${file}: true`);
      expect(`${file}: ${src.includes(`surface="${surface}"`)}`).toBe(`${file}: true`);
    }
  });

  it('на ранге 0 (новый, Free): разделы закрыты по решению доступа; с Plus — открыты (Plus открывает всё)', () => {
    const base = { gatesEnabled: true, rank: 0, plusActive: false, plusResolved: true, verdict: { isNew: true, reason: 'new' } } as never;
    for (const surface of ['video', 'dialogues', 'peak', 'cards_hub'] as const) {
      expect(`${surface}: ${decideForUser(surface, base).status}`).toBe(`${surface}: locked`);
      expect(`${surface}+plus: ${decideForUser(surface, { ...(base as object), plusActive: true } as never).status}`).toBe(`${surface}+plus: allowed`);
    }
  });

  it('входы в закрытые разделы на Главной не рисуются: плитки (фильтр по замкам), лента «Видео», задачи «Сегодня», вкладка «Пик» в Сообществе', () => {
    const home = code('app/(tabs)/home.tsx');
    expect(home).toContain('dialogs: homeDialoguesVisible && !rankLockedDialogues');
    expect(home).toContain('cards: homeFlashcardsVisible && !rankLockedCardsHub');
    expect(home).toContain('isVideoButtonEnabled() && homeVideosVisible && !rankLockedVideo && !homeV2VideoNoChannel');
    expect(home).toContain('available: isLearningSurfaceReady(studyTarget, \'spire\') && spireTabEnabled && !rankLockedPeak');
    expect(code('app/(tabs)/community.tsx')).toContain('spireVisible && !peakLocked');
  });
});
