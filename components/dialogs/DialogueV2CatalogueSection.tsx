/**
 * Read-only Design 2.0 catalogue surface for already released dialogue data.
 * Access is intentionally decided upstream: this component only renders the
 * supplied learner-facing status and sends presses (including locked rows) to
 * the caller, which can open a briefing.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { dialogueScenarioIcon } from './dialogue_scenario_icons';
import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';

import { coinRankRowForDisplay } from '../../app/coin_rank_table_v1';
import { logMemCoin } from '../coins/mem_coin_probe';
import { animateNextLayoutTransition } from '../../app/smooth_layout';
import { PressableScale } from '../feedback/PressableScale';
import { nestedBoxShadow } from '../v2/ShadowSurface';
import { dialogueGlassCardStyle, useDialogueGlass } from './glass/DialogueGlassKit';
import { glassTone } from './glass/glassTone';
import { useHubHeaderCollapseActions } from './hub_header_collapse';

/** Ступени тона поверх карточки категории: строка +4,5 %, плитка +9 % цвета текста темы (макет dialogs.html A4: #161618 → #1D1D1F → #28282A); светлая тема темнеет, а не светлеет. */
const ROW_TONE_ALPHA = 0.045;
const TILE_TONE_ALPHA = 0.09;

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
  // зачем (Макеты 7c831a193, dialogs-004): в образце «Дела» — заливной документ с строками (`docF`), а не портфель; ближайший значок набора — document-text
  if (worldId === 'work') return 'document-text';
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
  // ВРЕМЕННО (координатор 13.10, RUN hub_collapse после R12; убрать после проверки Сверкой): счётчик рендеров Section — рендер ожидаем только от собственного раскрытия категории. Только dev.
  const hubRenderCountRef = useRef(0);
  hubRenderCountRef.current += 1;
  if ((globalThis as { __DEV__?: boolean }).__DEV__ === true) console.log(`[HUB-COLLAPSE] render Section n=${hubRenderCountRef.current}`); // guard-ok: временный счётчик рендеров, dev
  const glass = useDialogueGlass();
  const groups = groupDialogueV2CatalogueItemsByWorld(items, worlds);
  // The catalogue intentionally enters collapsed. It keeps the released data
  // compact until the learner chooses one world; access still comes entirely
  // from the projection supplied by the caller.
  const [activeWorldId, setActiveWorldId] = useState<string | null>(null);
  // зачем (dialogs-003, координатор 13.10): шапка хаба схлопывается, пока открыта категория (образец №4). Сообщаем «открыта/закрыта» через стабильный контекст действий — состояние шапки живёт не здесь,
  // поэтому этот список от него не перерисовывается. Вне хаба (вкладка «Уроки») действий нет.
  const collapseActions = useHubHeaderCollapseActions();
  const toggleWorld = (worldId: string) => {
    animateNextLayoutTransition();
    const next = activeWorldId === worldId ? null : worldId;
    setActiveWorldId(next);
    collapseActions?.setCategoryOpen(next !== null);
  };

  return (
    // зачем (dialogs.html A1 `.stack.g13`): категории через 13, первая — 32 под шапкой хаба.
    <View testID="dialogue-v2-catalogue-section" style={{ gap: 13, marginTop: 32 }}>
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
            // зачем: свёрнутая — `.card.c2` хаба (A1: r22, поля 16/16/18); раскрытая — карточка кадра A4 (r24, поля 14/14/16).
            style={[dialogueGlassCardStyle(glass, expanded ? 24 : 22), expanded
              ? { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 16 }
              : { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 18 }]}
          >
            <PressableScale
              testID={`dialogue-v2-world-toggle-${world.id}`}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLabel={`${world.title}, ${doneCount}/${totalCount}`}
              onPress={() => toggleWorld(world.id)}
              variant="flat"
              // зачем (Макеты 9e311920a, dialogs-001/002/004 «подпись в две строки, колонка текста уже»): в образце A1 `.flex` gap 12, а плитка
              // отодвинута ещё на 10 (margin-right) — 22 только между плиткой и текстом; «0/13» и «›» стоят через 12. Раньше 22 было везде — текст терял 20.
              style={{ flexDirection: 'row', alignItems: 'center', gap: expanded ? 16 : 12, minHeight: 55 }}
            >
              {/* зачем (сверка dialogs-004/-002, «плитка категории и строки без карточки/плитки»): в макете ступени тона — карточка категории 0x161618 → строка 0x1D1D1F (+5 %) → плитка 0x28282A (+9 %).
                  Токены темы (opaqueControl/opaqueCard) в тёмных темах почти равны фону карточки, и плитки/строки сливались; тон считаем от белого — ступени видны в любой теме. */}
              <View style={{ width: 55, height: 55, borderRadius: 14, marginRight: expanded ? 0 : 10, backgroundColor: glassTone(glass.text, TILE_TONE_ALPHA), alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={worldIcon(world.id)} size={26} color={glass.text} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: glass.text, fontSize: expanded ? 20 : 19, lineHeight: expanded ? 25 : 24, fontWeight: '700' }} maxFontSizeMultiplier={1.3}>
                  {world.title}
                </Text>
                {subtitle && !expanded ? (
                  // A1: подпись 15 вторичным, отступ 6 — шкала D145: 16/20.
                  <Text style={{ color: glass.secondary, fontSize: 16, lineHeight: 20, marginTop: 6 }} maxFontSizeMultiplier={1.3}>{/* guard-ok: исключение 2.0 — короткая строка категории из макета dialogs.html A1 */}
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              {/* `.frac`: «пройдено» 28/700, «/всего» 16 вторичным с отступом 3. */}
              <Text testID={`dialogue-v2-world-count-${world.id}`} style={{ color: glass.text, fontSize: 28, lineHeight: 34, fontWeight: '700', fontVariant: ['tabular-nums'] }} maxFontSizeMultiplier={1.3}>
                {doneCount}
                <Text style={{ color: glass.secondary, fontSize: 16, fontWeight: '400' }}>{' '}/{totalCount}</Text>
              </Text>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-forward'} size={20} color={glass.secondary} />
            </PressableScale>
            {/* `.trk.dot`: дорожка 7, на ней белая точка 8 там, где «пройдено» (не заливка). */}
            <View style={{ height: 7, borderRadius: 4, backgroundColor: glass.line, marginTop: expanded ? 16 : 18, marginHorizontal: expanded ? 6 : 4 }}>
              <View style={{ position: 'absolute', top: -0.5, width: 8, height: 8, borderRadius: 4, backgroundColor: glass.text, left: `${Math.round(progress * 100)}%`, marginLeft: doneCount > 0 ? -8 : 0 }} />
            </View>

            {expanded ? (
              // A4 `.stack`: строки через 9.
              <View style={{ marginTop: 18, gap: 9 }}>
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
                        // A4 `.dl`: высота 60, радиус 14, поля 0·14·0·10.
                        minHeight: 60,
                        borderRadius: 14,
                        backgroundColor: glassTone(glass.text, ROW_TONE_ALPHA),
                        paddingLeft: 10,
                        paddingRight: 14,
                        paddingVertical: 6,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 16,
                      }}
                    >
                      <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: glassTone(glass.text, TILE_TONE_ALPHA), alignItems: 'center', justifyContent: 'center' }}>
                        {locked ? (
                          <Ionicons name="lock-closed" size={20} color={glass.mutedText} />
                        ) : (
                          // зачем (владелец 13.10): у каждой сценки свой значок по смыслу; неизвестная — значок мира, как раньше.
                          <Ionicons name={dialogueScenarioIcon(item.id, worldIcon(item.worldId))} size={20} color={glass.text} />
                        )}
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          // A4: 17/22/600 — шкала D145: 16/22, вес 600.
                          style={{ color: locked ? glass.secondary : glass.text, fontSize: 16, lineHeight: 22, fontWeight: '600' }}
                          maxFontSizeMultiplier={1.3}
                        >
                          {item.title}
                        </Text>
                        {locked ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <Text style={{ color: glass.secondary, fontSize: 13, lineHeight: 18 }} maxFontSizeMultiplier={1.3}>
                              {labels.lockedAtRank(item.rankRequired)}
                            </Text>
                            {/* зачем (R129): монета 768² в 16 dp на каждой закрытой строке — expo-image декодирует под размер вида; recyclingKey по рангу */}
                            <Image
                              source={coinRankRowForDisplay(item.rankRequired).source}
                              style={{ width: 16, height: 16 }}
                              contentFit="cover"
                              recyclingKey={`coin-${item.rankRequired}`}
                              accessible={false}
                              onLoad={() => logMemCoin('dialogue-catalogue-locked', 16)}
                            />
                          </View>
                        ) : null}
                      </View>

                      {/* `.lvl`: 38×26, радиус 8, поля 0·9; вложенная плашка стиля «Тень» — тон и малая тень, без кромки. */}
                      <View style={{ minWidth: 38, height: 26, backgroundColor: glass.dividerTone, boxShadow: nestedBoxShadow(glass), borderRadius: 8, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center' }}>
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
