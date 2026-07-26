// зачем: владелец открыл V2 в Metro и не увидел новых режимов — они были написаны,
// но ни один файл их не импортировал. Этот реестр связывает каталог лаборатории
// (семьи V2) с портированными поверхностями Kimi и подставляет их в плеер.
// Единственная точка правды роутинга: добавил поверхность — добавь строку здесь.
import React from 'react';

import type { V2ActivityFamily } from '../../../modules/learning-v2/contracts/activity';
import { BaBranchingScene } from './surfaces/BaBranchingScene';
import { CgContextGap } from './surfaces/CgContextGap';
import { CmSpeakingClub } from './surfaces/CmSpeakingClub';
import { CpCheckpoint } from './surfaces/CpCheckpoint';
import { LbListenBuild } from './surfaces/LbListenBuild';
import { LcListenChoose } from './surfaces/LcListenChoose';
import { MrMicrostory } from './surfaces/MrMicrostory';
import { PbPhraseBuilder } from './surfaces/PbPhraseBuilder';
import { PrPersonalReview } from './surfaces/PrPersonalReview';
import { QrQuickResponse } from './surfaces/QrQuickResponse';
import { RpRepeatCompare } from './surfaces/RpRepeatCompare';
import { SdScriptedDialogue } from './surfaces/SdScriptedDialogue';
import { ShShadowing } from './surfaces/ShShadowing';
import { SlSoundSyllableLab } from './surfaces/SlSoundSyllableLab';
import { SmSpeedMatch } from './surfaces/SmSpeedMatch';
import { SoundDiscrimination } from './surfaces/SoundDiscrimination';
import { VdVisualDiscovery } from './surfaces/VdVisualDiscovery';

export interface KimiSurfaceEntry {
  /** surfaceId Kimi — совпадает с именем в поставке и в чек-листе порта. */
  readonly surfaceId: string;
  readonly Component: React.ComponentType;
}

/**
 * Семья каталога → поверхность Kimi. Покрыты все 17 семей, кроме describe_scene
 * (снята владельцем с направления — в каталоге показывается с бейджем «СНЯТ»).
 */
export const KIMI_SURFACE_BY_FAMILY: Readonly<Partial<Record<V2ActivityFamily, KimiSurfaceEntry>>> =
  Object.freeze({
    visual_discovery: { surfaceId: 'vd-visual-discovery', Component: VdVisualDiscovery },
    listen_choose: { surfaceId: 'lc-listen-choose', Component: LcListenChoose },
    microstory_radio: { surfaceId: 'mr-microstory', Component: MrMicrostory },
    branching_scene: { surfaceId: 'ba-branching-scene', Component: BaBranchingScene },
    sound_contrast: { surfaceId: 'sound-discrimination', Component: SoundDiscrimination },
    sound_syllable_lab: { surfaceId: 'sl-sound-syllable-lab', Component: SlSoundSyllableLab },
    scripted_repeat_compare: { surfaceId: 'rp-repeat-compare', Component: RpRepeatCompare },
    shadowing_prosody: { surfaceId: 'sh-shadowing', Component: ShShadowing },
    phrase_builder: { surfaceId: 'pb-phrase-builder', Component: PbPhraseBuilder },
    listen_build_dictation: { surfaceId: 'lb-listen-build', Component: LbListenBuild },
    context_gap_grammar: { surfaceId: 'cg-context-gap', Component: CgContextGap },
    speed_match: { surfaceId: 'sm-speed-match', Component: SmSpeedMatch },
    quick_spoken_response: { surfaceId: 'qr-quick-response', Component: QrQuickResponse },
    scripted_dialogue: { surfaceId: 'sd-scripted-dialogue', Component: SdScriptedDialogue },
    speaking_club_mission: { surfaceId: 'cm-speaking-club', Component: CmSpeakingClub },
    personalized_review: { surfaceId: 'pr-personal-review', Component: PrPersonalReview },
  });

/** Дополнительная поверхность вне семей — чекпоинт главы. */
export const KIMI_CHECKPOINT: KimiSurfaceEntry = { surfaceId: 'cp-checkpoint', Component: CpCheckpoint };

export function kimiSurfaceFor(family: V2ActivityFamily): KimiSurfaceEntry | null {
  return KIMI_SURFACE_BY_FAMILY[family] ?? null;
}
