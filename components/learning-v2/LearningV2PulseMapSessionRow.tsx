import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { LearningV2MapNode, type LearningV2MapNodeStateV1 } from '../LearningV2MapNode';

/**
 * Строка занятия на сплошной карте курса.
 *
 * зачем: владелец 20.09 — «исправь скролл чтобы он не подтормаживал даже если
 * мы скроллим до 1770 сессии». Полный курс — 32 урока × 56 занятий плюс плашки
 * уроков и глав, около 2048 строк.
 *
 * Раньше строка рисовалась голым JSX прямо внутри renderMapRow. При
 * переиспользовании ячейки FlatList перерисовывал ВСЁ поддерево: SVG-холст
 * дужки, узел, две иконки, две подписи — и так для ~62 строк окна. Вдобавок
 * onPress был инлайновой стрелкой, из-за чего memo самого LearningV2MapNode
 * никогда не срабатывал.
 *
 * Поэтому строка вынесена в memo-компонент, и все пропсы здесь —
 * ПРИМИТИВЫ (числа, строки, цвета). Передать сюда объект темы или локализации
 * нельзя: их идентичность меняется каждый рендер, и memo станет декоративным
 * ровно так же, как было. Это стережёт отдельный тест.
 */
/**
 * Состояние узла берём из самого узла, а не объявляем своё: расхождение
 * списков уже дало ошибку типов на первой же проверке (выдуманное
 * 'available' узел не принимает).
 */
export type LearningV2PulseMapSessionRowState = LearningV2MapNodeStateV1;

export interface LearningV2PulseMapSessionRowProps {
  /** Порядковый номер занятия внутри урока — он же подпись на узле. */
  readonly sessionOrdinal: number;
  /** Урок, которому принадлежит занятие: уходит в обработчик нажатия. */
  readonly lessonOrdinal: number;
  readonly state: LearningV2PulseMapSessionRowState;
  /** Название занятия под узлом. Готовая строка: считает её родитель. */
  readonly title: string;
  /** Подпись для голосового доступа целиком, уже собранная родителем. */
  readonly accessibilityLabel: string;
  readonly testIDPrefix: string;

  /** Высота строки — шаг карты. */
  readonly step: number;
  readonly nodeSize: number;
  /** Смещение узла змейкой относительно центра экрана. */
  readonly nodeOffsetX: number;
  /** Абсолютные X текущего и следующего узла — по ним рисуется дужка. */
  readonly nodeX: number;
  readonly nextNodeX: number;
  readonly viewportWidth: number;
  /** Последняя строка списка дужку вниз не рисует. */
  readonly showConnector: boolean;

  readonly faceColor: string;
  readonly haloColor: string;
  readonly inkColor: string;
  readonly labelColor: string;
  readonly connectorColor: string;
  readonly starsBackground: string;
  readonly starsBorder: string;

  /** Иконка внутри узла: имя уже выбрано родителем по состоянию. */
  readonly iconName: React.ComponentProps<typeof Ionicons>['name'];
  /** Сколько звёзд показать. 0 — плашки звёзд нет. */
  readonly completedStars: number;

  readonly active: boolean;
  readonly reduceMotion: boolean;

  /**
   * Обработчик нажатия. Ссылка обязана быть стабильной (useCallback у
   * родителя) — иначе memo не сработает и вернутся лаги прокрутки.
   * Координаты занятия компонент подставляет сам.
   */
  readonly onSessionPress: (
    lessonOrdinal: number,
    sessionOrdinal: number,
    state: LearningV2PulseMapSessionRowState,
  ) => void;
  readonly onSessionCompleted?: () => void;
}

function LearningV2PulseMapSessionRowImpl({
  sessionOrdinal, lessonOrdinal, state, title, accessibilityLabel, testIDPrefix,
  step, nodeSize, nodeOffsetX, nodeX, nextNodeX, viewportWidth, showConnector,
  faceColor, haloColor, inkColor, labelColor, connectorColor,
  starsBackground, starsBorder,
  iconName, completedStars, active, reduceMotion,
  onSessionPress, onSessionCompleted,
}: LearningV2PulseMapSessionRowProps) {
  // зачем: инлайновая стрелка в onPress делала пропс новым на каждый рендер и
  // обнуляла memo узла. Здесь она создаётся один раз на строку и меняется
  // только вместе с координатами занятия.
  const handlePress = useCallback(
    () => onSessionPress(lessonOrdinal, sessionOrdinal, state),
    [lessonOrdinal, onSessionPress, sessionOrdinal, state],
  );

  const isCurrent = state === 'current';
  // Дужка между узлами. SVG здесь намеренно: попытка заменить его повёрнутым
  // View провалилась — концы отрезка не совпадали с центрами кружков, и палки
  // уехали мимо (владелец 20.09 прислал скриншот). Кривая по точным
  // координатам узлов рисуется верно при любом смещении змейки.
  const routeD = `M ${nodeX} 0 C ${nodeX} 64 ${nextNodeX} 64 ${nextNodeX} ${step}`;

  return (
    <View style={[styles.row, { height: step }]}>
      {showConnector ? (
        <Svg
          pointerEvents="none"
          width={viewportWidth}
          height={step * 2}
          style={[styles.connector, { top: step / 2 }]}
        >
          <Path
            d={routeD}
            fill="none"
            stroke={connectorColor}
            strokeOpacity={0.35}
            strokeWidth={7}
            strokeLinecap="round"
          />
        </Svg>
      ) : null}

      {/* Подпись занятия лежит ПОД кружком и отцентрирована по нему: змейка
          уводит узел на ±71px, поэтому подпись двигается тем же смещением. */}
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.nodeLabel, { top: 6 + nodeSize + 6, transform: [{ translateX: nodeOffsetX }] }]}
      >
        <Text
          style={{
            color: labelColor,
            fontSize: isCurrent ? 13 : 12,
            lineHeight: isCurrent ? 16 : 15,
            fontWeight: isCurrent ? '800' : '700',
            textAlign: 'center',
          }}
        >
          {title}
        </Text>
      </View>

      <View style={[styles.nodeCluster, { transform: [{ translateX: nodeOffsetX }] }]}>
        <LearningV2MapNode
          testID={`${testIDPrefix}-${sessionOrdinal}`}
          state={state}
          width={nodeSize}
          height={nodeSize}
          radius={nodeSize / 2}
          faceColor={faceColor}
          haloColor={haloColor}
          accessible
          active={active}
          reduceMotion={reduceMotion}
          accessibilityLabel={accessibilityLabel}
          onPress={handlePress}
          onCompletedTransition={onSessionCompleted}
        >
          <View pointerEvents="none" style={styles.nodeFace}>
            <Ionicons
              testID={`${testIDPrefix}-icon-${sessionOrdinal}`}
              name={iconName}
              size={31}
              color={inkColor}
            />
            <Text style={{ color: inkColor, fontSize: 13, fontWeight: '700' }}>
              {sessionOrdinal}
            </Text>
          </View>
        </LearningV2MapNode>

        {completedStars > 0 ? (
          <View
            testID={`${testIDPrefix}-${sessionOrdinal}-stars`}
            pointerEvents="none"
            accessible={false}
            style={[styles.sessionStars, { backgroundColor: starsBackground, borderColor: starsBorder }]}
          >
            {Array.from({ length: completedStars }, (_, starIndex) => (
              <Ionicons key={starIndex} name="star" size={14} color={starsBorder} />
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Сравнение пропсов идёт по примитивам, поэтому оно дешёвое и срабатывает:
 * строка, уехавшая за пределы окна и вернувшаяся с теми же данными, не
 * перерисовывается вовсе. Это и держит прокрутку ровной на 2048 строках.
 */
export const LearningV2PulseMapSessionRow = memo(LearningV2PulseMapSessionRowImpl);

const styles = StyleSheet.create({
  row: { alignItems: 'center', justifyContent: 'flex-start', paddingTop: 6 },
  connector: { position: 'absolute', left: 0 },
  nodeCluster: { alignItems: 'center', justifyContent: 'center' },
  nodeFace: { alignItems: 'center', justifyContent: 'center', gap: 5 },
  // Ширина 206 считается так, чтобы подпись не вылезла за экран при крайнем
  // смещении змейки: width/2 + 82 <= 390/2 - 10.
  nodeLabel: { position: 'absolute', alignSelf: 'center', width: 206, alignItems: 'center' },
  // guard-ok: это не обводка контейнера, а золотая окантовка бейджа звёзд —
  // перенесена дословно из прежнего кода строки. Внешний вид не меняем:
  // владелец просил починить прокрутку, а не переделывать карту.
  sessionStars: {
    position: 'absolute',
    bottom: -16,
    minHeight: 24,
    minWidth: 30,
    paddingHorizontal: 7,
    borderRadius: 12,
    borderWidth: 1, // guard-ok: окантовка бейджа звёзд, не контейнера
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
