/**
 * Read-only Design 2.0 catalogue surface for already released dialogue data.
 * Access is intentionally decided upstream: this component only renders the
 * supplied learner-facing status and sends presses (including locked rows) to
 * the caller, which can open a briefing.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { Image, Text, View } from 'react-native';

import { coinRankRowForDisplay } from '../../app/coin_rank_table_v1';
import { animateNextLayoutTransition } from '../../app/smooth_layout';
import { V2 } from '../../constants/v2Style';
import { PressableScale } from '../feedback/PressableScale';
import { dialogueGlassCardStyle, useDialogueGlass } from './glass/DialogueGlassKit';

export type DialogueV2CatalogueRowStatus = 'available' | 'done' | 'locked';

/** Learner-facing projection from an immutable, released V2 language pack. */
export type DialogueV2CatalogueLearnerItem = Readonly<{
  id: string;
  worldId: string;
  title: string;
  cefr: string;
  rankRequired: number;
  status: 'available' | 'done' | 'locked';
}>;

export type DialogueV2CatalogueWorld = Readonly<{
  id: string;
  title: string;
}>;

export type DialogueV2CatalogueWorldGroup = Readonly<{
  world: DialogueV2CatalogueWorld;
  items: readonly DialogueV2CatalogueLearnerItem[];
}>;

/**
 * The caller owns world order, so localized catalogue sections do not inherit
 * an incidental order from the release payload. Unknown worlds are not shown.
 */
export function groupDialogueV2CatalogueItemsByWorld(
  items: readonly DialogueV2CatalogueLearnerItem[],
  worlds: readonly DialogueV2CatalogueWorld[],
): readonly DialogueV2CatalogueWorldGroup[] {
  return worlds.flatMap((world) => {
    const worldItems = items.filter((item) => item.worldId === world.id);
    return worldItems.length === 0 ? [] : [{ world, items: worldItems }];
  });
}

export type DialogueV2CatalogueSectionProps = Readonly<{
  /** Released learner-facing rows only — never authoring drafts. */
  items: readonly DialogueV2CatalogueLearnerItem[];
  /** Ordered, localized world headings supplied by the release projection. */
  worlds: readonly DialogueV2CatalogueWorld[];
  /** Localized row copy supplied by the caller (rank line under a locked title). */
  labels: Readonly<{ lockedAtRank: (rank: number) => string; worldSubtitle?: (worldId: string) => string | null }>;
  /** Called for every row; locked rows use this to open their briefing. */
  onPressItem: (item: DialogueV2CatalogueLearnerItem) => void;
}>;

function worldIcon(worldId: string): React.ComponentProps<typeof Ionicons>['name'] {
  if (worldId === 'travel') return 'airplane';
  if (worldId === 'social') return 'people';
  if (worldId === 'work') return 'briefcase';
  return 'cafe';
}

// зачем (владелец 2026-09-30, макет dialogs.html A1/A4/A7, Liquid Glass): мир — стеклянная
// карточка с плиткой 55 и крупным названием; раскрытый мир — строки 60 с плиткой 46, бейджем
// уровня и «›»/галочкой; закрытая по рангу строка — замок в плитке и под названием «Откроется
// на ранге N» с монетой ранга. Раскрытие — плавным переходом лэйаута. Доступ решается выше.
export function DialogueV2CatalogueSection({
  items,
  worlds,
  labels,
  onPressItem,
}: DialogueV2CatalogueSectionProps) {
  const glass = useDialogueGlass();
  const groups = groupDialogueV2CatalogueItemsByWorld(items, worlds);
  // The catalogue intentionally enters collapsed. It keeps the released data
  // compact until the learner chooses one world; access still comes entirely
  // from the projection supplied by the caller.
  const [activeWorldId, setActiveWorldId] = useState<string | null>(null);
  const toggleWorld = (worldId: string) => {
    animateNextLayoutTransition();
    setActiveWorldId((current) => current === worldId ? null : worldId);
  };

  return (
    <View testID="dialogue-v2-catalogue-section" style={{ gap: 13, marginTop: 20 }}>
      {groups.map(({ world, items: worldItems }) => {
        const expanded = activeWorldId === world.id;
        // зачем (сверка с dialogs.html A1–A2, 04.10): карточка категории по макету несёт «пройдено N / всего M»
        // и полоску — оба числа уже есть в статусах строк, сеть не нужна.
        const doneCount = worldItems.filter((item) => item.status === 'done').length;
        const totalCount = worldItems.length;
        const progress = totalCount > 0 ? doneCount / totalCount : 0;
        const subtitle = labels.worldSubtitle?.(world.id) ?? null;

        return (
          <View
            key={world.id}
            testID={`dialogue-v2-world-${world.id}`}
            style={[dialogueGlassCardStyle(glass, 24), { paddingHorizontal: 14, paddingTop: 14, paddingBottom: expanded ? 16 : 14 }]}
          >
            <PressableScale
              testID={`dialogue-v2-world-toggle-${world.id}`}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLabel={`${world.title}, ${doneCount}/${totalCount}`}
              onPress={() => toggleWorld(world.id)}
              variant="flat"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 55 }}
            >
              <View style={{ width: 55, height: 55, borderRadius: 16, backgroundColor: glass.opaqueControl, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={worldIcon(world.id)} size={26} color={glass.text} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: glass.text, fontSize: 19, lineHeight: 24, fontWeight: '700' }} maxFontSizeMultiplier={1.3}>
                  {world.title}
                </Text>
                {subtitle ? (
                  <Text style={{ color: glass.secondary, fontSize: 13, lineHeight: 18, marginTop: 2 }} maxFontSizeMultiplier={1.3}>{/* guard-ok: исключение 2.0 — короткая строка категории из макета dialogs.html A1 */}
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              <Text testID={`dialogue-v2-world-count-${world.id}`} style={{ color: glass.text, fontSize: 16, lineHeight: 21, fontWeight: '700', fontVariant: ['tabular-nums'] }} maxFontSizeMultiplier={1.3}>
                {doneCount}
                <Text style={{ color: glass.secondary, fontSize: 13, fontWeight: '500' }}>/{totalCount}</Text>
              </Text>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-forward'} size={20} color={glass.secondary} />
            </PressableScale>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: glass.line, marginTop: 12, overflow: 'hidden' }}>
              <View style={{ height: 6, minWidth: 6, width: `${Math.round(progress * 100)}%`, borderRadius: 3, backgroundColor: glass.text }} />
            </View>

            {expanded ? (
              <View style={{ marginTop: 18, gap: V2.gapTight }}>
                {worldItems.map((item) => {
                  const locked = item.status === 'locked';
                  const done = item.status === 'done';
                  const statusAccessibility = locked
                    ? labels.lockedAtRank(item.rankRequired)
                    : done
                      ? 'done'
                      : 'available';

                  return (
                    <PressableScale
                      key={item.id}
                      testID={`dialogue-v2-catalogue-row-${item.id}`}
                      accessibilityRole="button"
                      accessibilityLabel={`${item.title}, ${item.cefr}, ${statusAccessibility}`}
                      onPress={() => onPressItem(item)}
                      variant="flat"
                      style={{
                        minHeight: 60,
                        borderRadius: 16,
                        backgroundColor: glass.opaqueControl,
                        paddingLeft: 10,
                        paddingRight: 14,
                        paddingVertical: 7,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 16,
                      }}
                    >
                      <View style={{ width: 46, height: 46, borderRadius: 13, backgroundColor: glass.opaqueCard, alignItems: 'center', justifyContent: 'center' }}>
                        {locked ? (
                          <Ionicons name="lock-closed" size={20} color={glass.mutedText} />
                        ) : (
                          <Ionicons name={worldIcon(item.worldId)} size={20} color={glass.text} />
                        )}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={{ color: locked ? glass.secondary : glass.text, fontSize: 16, lineHeight: 21, fontWeight: '700' }}
                          maxFontSizeMultiplier={1.3}
                        >
                          {item.title}
                        </Text>
                        {locked ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <Text style={{ color: glass.secondary, fontSize: 13, lineHeight: 18 }} maxFontSizeMultiplier={1.3}>
                              {labels.lockedAtRank(item.rankRequired)}
                            </Text>
                            <Image
                              source={coinRankRowForDisplay(item.rankRequired).source}
                              style={{ width: 16, height: 16 }}
                              accessible={false}
                            />
                          </View>
                        ) : null}
                      </View>

                      <View style={{ backgroundColor: glass.opaqueCard, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 4 }}>
                        <Text style={{ color: glass.text, fontSize: 13, lineHeight: 17, fontWeight: '700' }} maxFontSizeMultiplier={1.3}>
                          {item.cefr}
                        </Text>
                      </View>

                      {done ? (
                        <Ionicons name="checkmark" size={20} color={glass.text} />
                      ) : (
                        <Ionicons name="chevron-forward" size={20} color={glass.secondary} />
                      )}
                    </PressableScale>
                  );
                })}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

export default DialogueV2CatalogueSection;
