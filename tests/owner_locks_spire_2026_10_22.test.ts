// ЗАМОК ВЛАДЕЛЬЦА 22.10 — три правки владельца по «Сцене» Пика (реестр docs/work/OWNER_LOCKS.md, строки 3 · МАКЕТЫ). Сторож падает,
// если правку откатят. Ослабить его можно только по новому слову владельца: правка этого файла, строк реестра и KNOWN_GUARDS
// в tests/owner_locks_registry.test.cjs.
import type { Lang } from '../constants/i18n';
import { buildSpireSceneCopy, type SpireSceneState } from '../components/spire/scene/spire_scene_model';
import { spireScenePromoText } from '../components/spire/scene/spire_scene_strings';
import { readSource } from './helpers/read_source';

/** Код без комментариев: пометки замков и история в комментариях не должны ни ломать, ни подкармливать сторож. */
const code = (rel: string): string => readSource(rel).split(/\r?\n/).filter((line) => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(line)).join('\n');

const PEDESTAL = 'components/spire/scene/SpireScenePedestal.tsx';
const SCENE = 'components/spire/scene/SpireScene.tsx';
const MODEL = 'components/spire/scene/spire_scene_model.ts';
const MARKER = 'components/spire/SpireTowerMarker.tsx';
const TOWER = 'components/spire/SpireTower.tsx';

describe('ЗАМКИ ВЛАДЕЛЬЦА 22.10 — «Сцена» Пика', () => {
  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «не надо писать 1 ступ и тд! просто ник полностью»
  it('«Комната недели»: в строках топ-3 и своей строке — только ник, целиком, без ступеней и монет недели', () => {
    const pedestal = code(PEDESTAL);
    expect(pedestal).not.toMatch(/spireStepsShort|spireGroupThousands|weekCoins|\.steps\b|scoreOf/);
    const nicks = pedestal.split('\n').filter((line) => /spireNickWrap\((m|me)\.name\)/.test(line));
    expect(nicks).toHaveLength(2);
    for (const line of nicks) expect(line).not.toMatch(/numberOfLines|ellipsizeMode|adjustsFontSizeToFit|minimumFontScale/);
    expect(pedestal).not.toMatch(/>\{(m|me)\.name\}<|\$\{me\.name\} ·/);
  });

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «вот это убери текст»
  it('строки «N мест до повышения» нет: ни у «Комнаты недели», ни тёплой строкой сцены вечером', () => {
    for (const rel of [PEDESTAL, SCENE, MODEL]) expect(code(rel)).not.toMatch(/spireScenePromoText|copy\.warm|warmColor|\bpromo\b/);
    const facts = { tierName: 'Гранит', msLeft: 2 * 3_600_000, floor: 4, stepDone: 7, stepTotal: 8, perStep: 10, floorCoins: 40, placesToPromo: 2 };
    const states: SpireSceneState[] = ['search', 'eve', 'zero', 'day'];
    for (const lang of ['ru', 'uk', 'en'] as Lang[]) {
      for (const state of states) {
        const copy = buildSpireSceneCopy(lang, state, facts);
        expect(Object.keys(copy)).not.toContain('warm');
        const shown = Object.values(copy).flat().filter((v): v is string => typeof v === 'string').join(' | ');
        for (const more of [true, false]) expect(shown).not.toContain(spireScenePromoText(lang, 2, more));
      }
    }
  });

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «вот тут я сказал убрать обводку!!!!»
  it('своя монета на башне — без кольца, ореола, свечения и кольца Plus (на «Сцене» и в прежнем окне)', () => {
    const marker = code(MARKER);
    expect(marker).not.toMatch(/boxShadow|shadowColor|borderWidth|borderColor|s\.ring|s\.halo|PlusRingOverlay|PlusAvatarRing|plusKind|myIsPlus/);
    expect(marker.match(/<AvatarView [^>]*plus=\{false\}/g)).toHaveLength(2);
    expect(marker).not.toMatch(/plus=\{(?!false\})/);
    expect(code(TOWER)).toContain('<SpireTowerMarker lang={lang} sceneMode={sceneMode} myCoinRank={myCoinRank} onPressMe={onPressMe} />');
    expect(code(SCENE)).not.toContain('markerGlow');
  });
});
