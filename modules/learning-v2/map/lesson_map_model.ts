/**
 * Canonical, presentation-independent route for one Learning V2 lesson.
 *
 * The lesson map intentionally accepts only the main course and personal-plan
 * tasks. Tournament content has its own flow and must never become a lesson
 * map node, even when a caller supplies it for contextual telemetry.
 */
export type LessonMapZoneId = 'understand' | 'use' | 'master';
export type LessonMapNodeState = 'completed' | 'current' | 'next' | 'locked';

export type PersonalPlanTaskInput = {
  id: string;
  title: string;
  status: 'available' | 'locked' | 'completed';
};

export type LessonMapInput = {
  lessonId: number;
  completedSessionIds: readonly string[];
  currentSessionId?: string;
  personalPlanTasks?: readonly PersonalPlanTaskInput[];
  /** Context only; deliberately excluded from the returned model. */
  tournamentTasks?: readonly { id: string; title: string }[];
};

export type LessonMapNode = {
  id: string;
  zoneId: LessonMapZoneId;
  order: number;
  state: LessonMapNodeState;
  xOffset: -64 | 64;
  /** The source mock communicates direction with spacing and state, not lines. */
  connector: null;
};

export type LessonMapZone = {
  id: LessonMapZoneId;
  title: 'Понять' | 'Применить' | 'Закрепить';
  nodes: readonly LessonMapNode[];
};

export type LessonMapSideNode = {
  id: string;
  kind: 'personal_plan';
  title: string;
  status: PersonalPlanTaskInput['status'];
};

export type LessonMapModel = {
  lessonId: number;
  zones: readonly LessonMapZone[];
  sideNodes: readonly LessonMapSideNode[];
};

const ZONES: readonly Pick<LessonMapZone, 'id' | 'title'>[] = [
  { id: 'understand', title: 'Понять' },
  { id: 'use', title: 'Применить' },
  { id: 'master', title: 'Закрепить' },
];

const SESSION_COUNT_PER_ZONE = 4;

function sessionId(lessonId: number, zoneId: LessonMapZoneId, sessionIndex: number): string {
  return `lesson-${lessonId}-${zoneId}-${sessionIndex}`;
}

export function buildLessonMapModel(input: LessonMapInput): LessonMapModel {
  const lessonId = Math.max(1, Math.floor(input.lessonId));
  const completed = new Set(input.completedSessionIds);
  const route: Array<Omit<LessonMapNode, 'state'>> = [];

  ZONES.forEach((zone, zoneIndex) => {
    for (let index = 1; index <= SESSION_COUNT_PER_ZONE; index += 1) {
      const order = zoneIndex * SESSION_COUNT_PER_ZONE + index;
      route.push({
        id: sessionId(lessonId, zone.id, index),
        zoneId: zone.id,
        order,
        xOffset: order % 2 === 1 ? -64 : 64,
        connector: null,
      });
    }
  });

  const firstUnavailableIndex = route.findIndex(node => !completed.has(node.id));
  const currentIndex = input.currentSessionId
    ? route.findIndex(node => node.id === input.currentSessionId && !completed.has(node.id))
    : firstUnavailableIndex;
  const resolvedCurrentIndex = currentIndex >= 0 ? currentIndex : firstUnavailableIndex;

  const nodesByZone = new Map<LessonMapZoneId, LessonMapNode[]>();
  ZONES.forEach(zone => nodesByZone.set(zone.id, []));
  route.forEach((routeNode, routeIndex) => {
    const state: LessonMapNodeState = completed.has(routeNode.id)
      ? 'completed'
      : routeIndex === resolvedCurrentIndex
        ? 'current'
        : routeIndex === resolvedCurrentIndex + 1
          ? 'next'
          : 'locked';
    nodesByZone.get(routeNode.zoneId)?.push({ ...routeNode, state });
  });

  return {
    lessonId,
    zones: ZONES.map(zone => ({
      ...zone,
      nodes: nodesByZone.get(zone.id) ?? [],
    })),
    sideNodes: (input.personalPlanTasks ?? []).slice(0, 2).map(task => ({
      id: task.id,
      kind: 'personal_plan',
      title: task.title,
      status: task.status,
    })),
  };
}
