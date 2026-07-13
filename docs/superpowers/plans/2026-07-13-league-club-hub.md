# League Club Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Превратить экран Лиги в живой Club Hub с оперативным героем, обзором активности, командной Бонус-лигой, подиумом и виртуализированным рейтингом, сохранив все текущие механики и полноэкранный чат.

**Architecture:** `app/club_screen.tsx` остаётся единственным координатором загрузки, наград, модалей и навигации. Чистые функции формируют модели героя, миссии, подиума и ограниченного activity preview; небольшие мемоизированные компоненты только отображают данные и вызывают переданные callbacks. Activity preview читает синхронный кеш чата и не создаёт новую Firestore-подписку.

**Tech Stack:** React Native 0.81, Expo 54, TypeScript 5.9, React 19, Expo Router, React Native Reanimated 4, Jest/ts-jest, `FlatList`, существующие Phraseman theme/i18n/chat/league сервисы.

---

## Карта файлов

**Создать:**

- `app/league_club_hub_model.ts` — чистые модели героя, быстрых статусов, командной миссии и подиума.
- `app/league_activity_model.ts` — преобразование кешированных сообщений и состояния лиги в 3–5 событий.
- `app/league_chat_visibility.ts` — единое правило скрытия устаревших системных Compass-сообщений.
- `components/league/LeagueClubHero.tsx` — оперативный верх экрана.
- `components/league/LeagueQuickStats.tsx` — три быстрых статуса.
- `components/league/LeagueActivityPreview.tsx` — секция «Что происходит».
- `components/league/LeagueBonusMission.tsx` — Бонус-лига как командная миссия.
- `components/league/LeaguePodium.tsx` — топ-3.
- `components/league/LeagueLeaderboardRow.tsx` — строка виртуализированного рейтинга.
- `tests/league_club_hub_model.test.ts` — unit-тесты приоритетов и состояний.
- `tests/league_activity_model.test.ts` — unit-тесты событий и фильтрации.
- `tests/league_club_hub_contract.test.ts` — интеграционные source-контракты композиции, доступности и performance-инвариантов.

**Изменить:**

- `app/club_screen.tsx` — подключить новые модели/секции, синхронно прочитать кеш чата, заменить главный `ScrollView` на `Reanimated.FlatList`, сохранить текущие callbacks и модали.
- `components/LeagueChatPanel.tsx` — использовать общий фильтр `isLeagueChatMessageVisibleInFeed` без изменения поведения чата.

**Не изменять:** Firestore rules, Cloud Functions, формулы XP/короны/сундука, выдачу наград, `LeagueChestOpenModal`, `LeagueBonusAvailableModal`, прямой вход `openChat=1`.

**Перед выполнением:** создать отдельный worktree от коммита со спецификацией через skill `using-git-worktrees`, потому что основное рабочее дерево содержит несвязанные незавершённые изменения. Рабочая ветка: `codex/league-club-hub`.

---

### Task 1: Чистая модель Club Hub

**Files:**

- Create: `app/league_club_hub_model.ts`
- Create: `tests/league_club_hub_model.test.ts`

- [ ] **Step 1: Написать падающие тесты приоритетов героя, миссии и подиума**

```ts
import {
  buildLeagueBonusMissionModel,
  buildLeagueClubHeroModel,
  buildLeaguePodium,
} from '../app/league_club_hub_model';
import type { GroupMember } from '../app/league_engine';

const members: GroupMember[] = [
  { uid: 'a', name: 'Anna', points: 900, isMe: false },
  { uid: 'me', name: 'Me', points: 700, isMe: true },
  { uid: 'c', name: 'Chris', points: 500, isMe: false },
];

describe('league club hub model', () => {
  it('prioritizes unread chat, then a ready chest, then helping the club', () => {
    const base = { rank: 2, participantCount: 3, weeklyXp: 700, bonusProgress: 8200, bonusGoal: 10000 };
    expect(buildLeagueClubHeroModel({ ...base, unreadCount: 3, chestReady: true, chestClaimed: false }).primaryAction)
      .toBe('open_chat');
    expect(buildLeagueClubHeroModel({ ...base, unreadCount: 0, chestReady: true, chestClaimed: false }).primaryAction)
      .toBe('claim_chest');
    expect(buildLeagueClubHeroModel({ ...base, unreadCount: 0, chestReady: false, chestClaimed: false }).primaryAction)
      .toBe('help_club');
  });

  it('never promises a chest that was already claimed', () => {
    const model = buildLeagueBonusMissionModel({
      progress: 10000,
      goal: 10000,
      myContribution: 700,
      chestReady: true,
      chestClaimed: true,
      contributors: members,
      boost: null,
    });
    expect(model.state).toBe('claimed');
    expect(model.canClaim).toBe(false);
    expect(model.remainingXp).toBe(0);
  });

  it('returns only real podium members and marks the current user', () => {
    expect(buildLeaguePodium(members.slice(0, 2))).toHaveLength(2);
    expect(buildLeaguePodium(members)[1]).toMatchObject({ place: 2, isMe: true, name: 'Me' });
  });
});
```

- [ ] **Step 2: Запустить тест и увидеть правильное падение**

Run: `npx jest --runTestsByPath tests/league_club_hub_model.test.ts --no-cache --runInBand`

Expected: FAIL с `Cannot find module '../app/league_club_hub_model'`.

- [ ] **Step 3: Реализовать типизированные чистые функции**

```ts
import type { GroupMember } from './league_engine';
import type { LeagueGroupBoostState } from './league_group_boosts';

export type LeagueHubPrimaryAction = 'open_chat' | 'claim_chest' | 'help_club' | 'view_rank';
export type LeagueBonusMissionState = 'locked' | 'active' | 'almost_ready' | 'ready' | 'claimed';

export interface LeagueClubHeroInput {
  rank: number;
  participantCount: number;
  weeklyXp: number;
  bonusProgress: number;
  bonusGoal: number;
  unreadCount: number;
  chestReady: boolean;
  chestClaimed: boolean;
  boostLabel?: string;
  crownHolderName?: string;
}

export interface LeagueClubHeroModel extends LeagueClubHeroInput {
  bonusPercent: number;
  primaryAction: LeagueHubPrimaryAction;
}

export function buildLeagueClubHeroModel(input: LeagueClubHeroInput): LeagueClubHeroModel {
  const bonusPercent = input.bonusGoal > 0
    ? Math.min(100, Math.max(0, Math.round((input.bonusProgress / input.bonusGoal) * 100)))
    : 0;
  const primaryAction: LeagueHubPrimaryAction = input.unreadCount > 0
    ? 'open_chat'
    : input.chestReady && !input.chestClaimed
      ? 'claim_chest'
      : input.bonusGoal > input.bonusProgress
        ? 'help_club'
        : 'view_rank';
  return { ...input, bonusPercent, primaryAction };
}

export interface LeagueBonusMissionInput {
  progress: number;
  goal: number;
  myContribution: number;
  chestReady: boolean;
  chestClaimed: boolean;
  contributors: GroupMember[];
  boost: LeagueGroupBoostState | null;
}

export interface LeagueBonusMissionModel extends LeagueBonusMissionInput {
  percent: number;
  remainingXp: number;
  canClaim: boolean;
  state: LeagueBonusMissionState;
  topContributors: GroupMember[];
}

export function buildLeagueBonusMissionModel(input: LeagueBonusMissionInput): LeagueBonusMissionModel {
  const progress = Math.max(0, Math.floor(input.progress));
  const goal = Math.max(1, Math.floor(input.goal));
  const remainingXp = Math.max(0, goal - progress);
  const percent = Math.min(100, Math.round((progress / goal) * 100));
  const state: LeagueBonusMissionState = input.chestClaimed
    ? 'claimed'
    : input.chestReady
      ? 'ready'
      : percent >= 80
        ? 'almost_ready'
        : progress > 0
          ? 'active'
          : 'locked';
  return {
    ...input,
    progress,
    goal,
    remainingXp,
    percent,
    state,
    canClaim: state === 'ready',
    topContributors: [...input.contributors].sort((a, b) => b.points - a.points).slice(0, 3),
  };
}

export interface LeaguePodiumMember {
  place: 1 | 2 | 3;
  uid?: string;
  name: string;
  points: number;
  avatar?: string;
  frame?: string;
  aura?: string;
  isMe: boolean;
}

export function buildLeaguePodium(members: GroupMember[]): LeaguePodiumMember[] {
  return [...members]
    .sort((a, b) => b.points - a.points)
    .slice(0, 3)
    .map((member, index) => ({ ...member, place: (index + 1) as 1 | 2 | 3 }));
}
```

- [ ] **Step 4: Запустить unit-тест**

Run: `npx jest --runTestsByPath tests/league_club_hub_model.test.ts --no-cache --runInBand`

Expected: PASS, 3 tests.

- [ ] **Step 5: Зафиксировать задачу**

```bash
git add app/league_club_hub_model.ts tests/league_club_hub_model.test.ts
git commit -m "feat: add league club hub presentation model"
```

---

### Task 2: Общая видимость чата и ограниченная модель активности

**Files:**

- Create: `app/league_chat_visibility.ts`
- Create: `app/league_activity_model.ts`
- Create: `tests/league_activity_model.test.ts`
- Modify: `components/LeagueChatPanel.tsx:99-103, 411-414`

- [ ] **Step 1: Написать падающие тесты фильтрации, лимита и приоритета событий**

```ts
import { buildLeagueActivityEvents } from '../app/league_activity_model';
import { isLeagueChatMessageVisibleInFeed } from '../app/league_chat_visibility';
import type { LeagueChatMessage } from '../app/firestore_league_chat';

const message = (overrides: Partial<LeagueChatMessage>): LeagueChatMessage => ({
  id: 'm1', groupId: 'g', weekId: 'w', leagueId: 1, authorUid: 'u1', authorName: 'Anna',
  text: 'Hello', status: 'visible', createdAt: 1000, ...overrides,
});

describe('league activity model', () => {
  it('uses the same retired Compass filter as the full chat', () => {
    expect(isLeagueChatMessageVisibleInFeed(message({ pinned: true }))).toBe(false);
    expect(isLeagueChatMessageVisibleInFeed(message({ compassKind: 'icebreaker' }))).toBe(false);
    expect(isLeagueChatMessageVisibleInFeed(message({ compassKind: 'daily_summary' }))).toBe(false);
    expect(isLeagueChatMessageVisibleInFeed(message({ status: 'deleted' }))).toBe(false);
    expect(isLeagueChatMessageVisibleInFeed(message({ compassKind: 'poll' }))).toBe(true);
  });

  it('returns at most five stable events with actionable items first', () => {
    const events = buildLeagueActivityEvents({
      messages: [message({ id: 'chat', createdAt: 5000 }), message({ id: 'poll', compassKind: 'poll', createdAt: 6000 })],
      rankDelta: { delta: 1, passedName: 'Chris' },
      boost: { buyerUid: 'b', buyerName: 'Ben', expiresAt: 9000, multiplier: 2, likeCount: 0 } as never,
      crownHolder: { uid: 'a', name: 'Anna' },
      bonusProgress: 8200,
      bonusGoal: 10000,
      chestReady: false,
      now: 7000,
      lang: 'ru',
    });
    expect(events.length).toBeLessThanOrEqual(5);
    expect(new Set(events.map((event) => event.id)).size).toBe(events.length);
    expect(events.some((event) => event.action === 'open_chat')).toBe(true);
  });
});
```

- [ ] **Step 2: Запустить тест и увидеть правильное падение**

Run: `npx jest --runTestsByPath tests/league_activity_model.test.ts --no-cache --runInBand`

Expected: FAIL с отсутствующими модулями `league_activity_model` и `league_chat_visibility`.

- [ ] **Step 3: Создать общий фильтр и заменить локальный фильтр в чате**

```ts
// app/league_chat_visibility.ts
import type { LeagueChatMessage } from './firestore_league_chat';

export function isLeagueChatMessageVisibleInFeed(message: LeagueChatMessage): boolean {
  return message.status === 'visible'
    && !message.pinned
    && message.compassKind !== 'icebreaker'
    && message.compassKind !== 'daily_summary';
}
```

В `LeagueChatPanel.tsx` импортировать функцию и заменить вызов локальной `isRetiredCompassSystemMessage` на:

```ts
const visibleMessages = mergedMessages.filter(
  (row) => isOptimisticLeagueChatMessage(row) || isLeagueChatMessageVisibleInFeed(row as LeagueChatMessage),
);
```

Удалить только ставшую ненужной локальную функцию; остальные фильтры и возможности чата не менять.

- [ ] **Step 4: Реализовать чистый агрегатор максимум пяти событий**

`app/league_activity_model.ts` должен экспортировать:

```ts
export type LeagueActivityAction = 'open_chat' | 'open_profile' | 'open_bonus' | 'open_rank';
export type LeagueActivityKind = 'compass' | 'chat' | 'boost' | 'crown' | 'rank' | 'bonus' | 'chest';

export interface LeagueActivityEvent {
  id: string;
  kind: LeagueActivityKind;
  action: LeagueActivityAction;
  authorName?: string;
  authorUid?: string;
  text: string;
  createdAt: number;
}
```

`buildLeagueActivityEvents(input)` выполняет строго этот порядок:

1. готовый сундук;
2. свежий видимый Compass poll/post;
3. последнее видимое обычное сообщение;
4. активный буст;
5. изменение ранга;
6. текущий владелец короны;
7. прогресс бонуса.

Функция удаляет события с одинаковым `id`, сортирует сообщения по `createdAt` по убыванию и возвращает `.slice(0, 5)`. Для сообщений текст выбирается как `message.i18n?.[input.lang] ?? message.i18n?.ru ?? message.text`; локализованные служебные подписи добавляет UI-компонент.

- [ ] **Step 5: Запустить новые и существующие тесты чата**

Run: `npx jest --runTestsByPath tests/league_activity_model.test.ts tests/league_chat_cache_first.test.ts tests/league_chat_unread_badge_contract.test.ts tests/league_chat_author_card_open.test.ts --no-cache --runInBand`

Expected: PASS; сохранены cache-first, unread badge, direct/fullscreen и author profile контракты.

- [ ] **Step 6: Зафиксировать задачу**

```bash
git add app/league_chat_visibility.ts app/league_activity_model.ts components/LeagueChatPanel.tsx tests/league_activity_model.test.ts
git commit -m "feat: derive league activity from cached club state"
```

---

### Task 3: Герой и быстрые статусы

**Files:**

- Create: `components/league/LeagueClubHero.tsx`
- Create: `components/league/LeagueQuickStats.tsx`
- Create: `tests/league_club_hub_contract.test.ts`

- [ ] **Step 1: Написать падающий source-контракт публичных свойств и доступности**

```ts
import fs from 'node:fs';
import path from 'node:path';

const read = (file: string): string => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('league club hub composition', () => {
  it('ships an accessible operational hero and quick stats', () => {
    const hero = read('components/league/LeagueClubHero.tsx');
    const stats = read('components/league/LeagueQuickStats.tsx');
    expect(hero).toContain('LeagueClubHeroModel');
    expect(hero).toContain('accessibilityRole="button"');
    expect(hero).toContain('accessibilityLabel');
    expect(hero).toContain('testID="league-club-hero-primary-action"');
    expect(hero).toContain('formatLeagueChatUnreadBadge');
    expect(stats).toContain('testID="league-quick-stats"');
    expect(stats).toContain('minimumFontScale');
  });
});
```

- [ ] **Step 2: Запустить тест и увидеть отсутствие компонентов**

Run: `npx jest --runTestsByPath tests/league_club_hub_contract.test.ts --no-cache --runInBand`

Expected: FAIL с `ENOENT` для `LeagueClubHero.tsx`.

- [ ] **Step 3: Реализовать `LeagueClubHero`**

Компонент принимает явный интерфейс:

```ts
interface LeagueClubHeroProps {
  model: LeagueClubHeroModel;
  leagueName: string;
  leagueTag: string;
  leagueColor: string;
  leagueIcon: React.ReactNode;
  lang: Lang;
  palette: { surface: string; text: string; muted: string; accent: string; accentText: string };
  onPrimaryAction: (action: LeagueHubPrimaryAction) => void;
}
```

JSX содержит: имя/тег лиги, `#rank из participantCount`, weekly XP, bonus percent, unread badge, boost/crown status и одну `Pressable`/`TapScale` кнопку. Кнопка получает `minHeight: 48`, `accessibilityRole="button"`, локализованный `accessibilityLabel`, `testID="league-club-hero-primary-action"`; для `accent` используется `accentText` с тёмным значением на лаймовой поверхности.

- [ ] **Step 4: Реализовать `LeagueQuickStats`**

Компонент принимает три элемента `{ id, label, value, hint, onPress }`, рендерит их внутри `View testID="league-quick-stats"`; каждая карточка имеет `minHeight: 76`, `minWidth: 0`, доступную кнопку и текст с `numberOfLines`, `adjustsFontSizeToFit`, `minimumFontScale={0.82}`. На ширине до 360 pt карточки допускают горизонтальный `ScrollView`, на остальных помещаются в одну строку.

- [ ] **Step 5: Запустить контракт**

Run: `npx jest --runTestsByPath tests/league_club_hub_contract.test.ts --no-cache --runInBand`

Expected: PASS для hero/quick-stats assertions.

- [ ] **Step 6: Зафиксировать задачу**

```bash
git add components/league/LeagueClubHero.tsx components/league/LeagueQuickStats.tsx tests/league_club_hub_contract.test.ts
git commit -m "feat: add league club hero and quick stats"
```

---

### Task 4: Activity preview и командная Бонус-лига

**Files:**

- Create: `components/league/LeagueActivityPreview.tsx`
- Create: `components/league/LeagueBonusMission.tsx`
- Modify: `tests/league_club_hub_contract.test.ts`

- [ ] **Step 1: Расширить контракт и увидеть падение**

Добавить assertions:

```ts
it('renders bounded activity and the team mission without live subscriptions', () => {
  const activity = read('components/league/LeagueActivityPreview.tsx');
  const mission = read('components/league/LeagueBonusMission.tsx');
  expect(activity).toContain('events.slice(0, 5)');
  expect(activity).toContain('testID="league-activity-preview"');
  expect(activity).not.toContain('subscribeLeagueChatMessages');
  expect(mission).toContain('testID="league-bonus-mission"');
  expect(mission).toContain('model.canClaim');
  expect(mission).toContain('accessibilityValue');
});
```

Run: `npx jest --runTestsByPath tests/league_club_hub_contract.test.ts --no-cache --runInBand`

Expected: FAIL с `ENOENT` для новых компонентов.

- [ ] **Step 2: Реализовать `LeagueActivityPreview`**

Props: `events`, `lang`, `palette`, `onAction(event)`, `emptyAction`. Компонент показывает заголовок «Что происходит», максимум пять строк, относительное время через чистый formatter и одну доступную кнопку на событие. Для пустого массива рендерит одну карточку с призывом начать разговор; не создаёт подписок, таймеров или запросов.

- [ ] **Step 3: Реализовать `LeagueBonusMission`**

Props: `model`, `lang`, `palette`, `giftImage`, `renderContributorAvatar`, `onClaim`, `onBoost`, `onOpenRank`. Компонент показывает `progress / goal`, `remainingXp`, личный вклад, три реальных аватара, активный boost, состояния `locked/active/almost_ready/ready/claimed`. CTA вызывает `onClaim` только при `model.canClaim`; состояние `claimed` не содержит обещания повторной награды. Прогресс получает `accessibilityRole="progressbar"` и `accessibilityValue={{ min: 0, max: model.goal, now: model.progress }}`.

- [ ] **Step 4: Запустить контракт и model-тесты**

Run: `npx jest --runTestsByPath tests/league_club_hub_contract.test.ts tests/league_club_hub_model.test.ts --no-cache --runInBand`

Expected: PASS.

- [ ] **Step 5: Зафиксировать задачу**

```bash
git add components/league/LeagueActivityPreview.tsx components/league/LeagueBonusMission.tsx tests/league_club_hub_contract.test.ts
git commit -m "feat: add league activity and team mission sections"
```

---

### Task 5: Подиум и строка рейтинга

**Files:**

- Create: `components/league/LeaguePodium.tsx`
- Create: `components/league/LeagueLeaderboardRow.tsx`
- Modify: `tests/league_club_hub_contract.test.ts`

- [ ] **Step 1: Добавить падающий контракт подиума и строк**

```ts
it('separates the top three and keeps participant profile actions', () => {
  const podium = read('components/league/LeaguePodium.tsx');
  const row = read('components/league/LeagueLeaderboardRow.tsx');
  expect(podium).toContain('podium.map');
  expect(podium).toContain('onOpenProfile');
  expect(podium).toContain('accessibilityLabel');
  expect(row).toContain('GroupMember');
  expect(row).toContain('onOpenProfile');
  expect(row).toContain('isMe');
});
```

Run: `npx jest --runTestsByPath tests/league_club_hub_contract.test.ts --no-cache --runInBand`

Expected: FAIL с `ENOENT`.

- [ ] **Step 2: Реализовать подиум**

`LeaguePodium` принимает `LeaguePodiumMember[]`, карту корон, avatar renderer и `onOpenProfile`. Порядок визуальных колонок `[2, 1, 3]`, но accessibility-порядок и подписи явно называют место. При 1–2 участниках рендерятся только реальные элементы. Первое место выше на 24 pt; анимация сияния не бесконечная.

- [ ] **Step 3: Извлечь строку рейтинга без потери возможностей**

`LeagueLeaderboardRow` принимает `member`, `index`, promotion/relegation границы, crown data, текущую тему и существующий callback профиля. Перенести из `club_screen.tsx` текущие AvatarView, aura/frame, premium/VIP/crown name, XP, streak, boost marker, «Вы» и зоны повышения/понижения. Не изменять значения, сортировку и логику открытия `UnifiedPlayerModal`.

- [ ] **Step 4: Запустить контракт**

Run: `npx jest --runTestsByPath tests/league_club_hub_contract.test.ts tests/league_chat_author_card_open.test.ts --no-cache --runInBand`

Expected: PASS.

- [ ] **Step 5: Зафиксировать задачу**

```bash
git add components/league/LeaguePodium.tsx components/league/LeagueLeaderboardRow.tsx tests/league_club_hub_contract.test.ts
git commit -m "feat: add league podium and leaderboard row"
```

---

### Task 6: Интеграция нового Club Hub в `club_screen.tsx`

**Files:**

- Modify: `app/club_screen.tsx:1-120, 390-570, 900-950, 1296-2057`
- Modify: `tests/league_club_hub_contract.test.ts`

- [ ] **Step 1: Добавить падающий интеграционный контракт**

```ts
it('wires the hub to cached data and virtualizes the growing leaderboard', () => {
  const screen = read('app/club_screen.tsx');
  expect(screen).toContain('getCachedLeagueChatRoomSync');
  expect(screen).toContain('getCachedLeagueChatMessagesSync');
  expect(screen).toContain('buildLeagueActivityEvents');
  expect(screen).toContain('<LeagueClubHero');
  expect(screen).toContain('<LeagueActivityPreview');
  expect(screen).toContain('<LeagueBonusMission');
  expect(screen).toContain('<LeaguePodium');
  expect(screen).toContain('<Reanimated.FlatList');
  expect(screen).toContain('keyExtractor={leagueMemberKeyExtractor}');
  expect(screen).not.toContain('subscribeLeagueChatMessages');
});
```

Run: `npx jest --runTestsByPath tests/league_club_hub_contract.test.ts --no-cache --runInBand`

Expected: FAIL, потому что экран ещё использует старую композицию.

- [ ] **Step 2: Синхронно получить только кешированный preview чата**

В `ClubScreen` создать memo/ref-инициализацию:

```ts
const cachedChatRoom = leagueGroupMeta ?? getCachedLeagueChatRoomSync();
const cachedChatMessages = useMemo(
  () => cachedChatRoom ? getCachedLeagueChatMessagesSync(cachedChatRoom) : [],
  [cachedChatRoom?.groupId, cachedChatRoom?.weekId, chatModalVisible],
);
```

Зависимость `chatModalVisible` перечитывает memory-cache после закрытия полного чата. Не вызывать authorization, room resolution или subscription ради activity preview. Live subscription остаётся только внутри открытого `LeagueChatPanel`.

- [ ] **Step 3: Построить модели через `useMemo`**

Создать `heroModel`, `bonusMissionModel`, `podium` и `activityEvents`. В dependencies включить только используемые примитивы/объекты. Главное действие маршрутизировать так:

```ts
const handleHubPrimaryAction = useCallback((action: LeagueHubPrimaryAction) => {
  hapticTap();
  if (action === 'open_chat') setChatModalVisible(true);
  else if (action === 'claim_chest') void claimLeagueChestReward();
  else if (action === 'help_club') contentListRef.current?.scrollToOffset({ offset: bonusMissionOffsetRef.current, animated: true });
  else contentListRef.current?.scrollToEnd({ animated: true });
}, [claimLeagueChestReward]);
```

`bonusMissionOffsetRef` инициализировать нулём и обновлять из `onLayout` контейнера миссии; это не вызывает дополнительный render.

- [ ] **Step 4: Заменить главный ScrollView одним виртуализированным списком**

Использовать `Reanimated.FlatList<GroupMember>`:

- `data={sortedGroup}`;
- `ListHeaderComponent` содержит `RankChangeBanner`, promotion banner, hero, quick stats, activity, mission и podium;
- `renderItem` использует `LeagueLeaderboardRow`;
- `ListEmptyComponent` сохраняет текущое корректное пустое состояние;
- `keyExtractor={leagueMemberKeyExtractor}`, где ключ — `uid ?? botId ?? name-index`;
- `initialNumToRender={12}`, `windowSize={7}`, `removeClippedSubviews={false}` для avatar/aura корректности;
- существующие `onAnimatedScroll`, bounce и content padding сохраняются;
- прежний `.map()` участников удаляется только после переноса всей строки в новый компонент.

- [ ] **Step 5: Сохранить старые действия и модали**

Проверить, что hero/mission/activity/podium вызывают существующие `setChatModalVisible`, `claimLeagueChestReward`, `setGroupBoostConfirmVisible`, `setProfile`, а ниже списка без изменения остаются fullscreen chat, chat profile modal, player modal, confirm modal, chest modal и result modal.

- [ ] **Step 6: Запустить узкие интеграционные контракты**

Run: `npx jest --runTestsByPath tests/league_club_hub_contract.test.ts tests/league_chat_cache_first.test.ts tests/league_chat_unread_badge_contract.test.ts tests/league_chat_author_card_open.test.ts tests/league_bonus_gift_images.test.ts tests/league_current_icon_content_alignment.test.ts --no-cache --runInBand`

Expected: PASS.

- [ ] **Step 7: Зафиксировать задачу**

```bash
git add app/club_screen.tsx tests/league_club_hub_contract.test.ts
git commit -m "feat: compose league screen as a living club hub"
```

---

### Task 7: Lifecycle, accessibility, темы и финальная регрессия

**Files:**

- Modify: `app/club_screen.tsx`
- Modify: `components/league/LeagueClubHero.tsx`
- Modify: `components/league/LeagueQuickStats.tsx`
- Modify: `components/league/LeagueActivityPreview.tsx`
- Modify: `components/league/LeagueBonusMission.tsx`
- Modify: `components/league/LeaguePodium.tsx`
- Modify: `components/league/LeagueLeaderboardRow.tsx`
- Modify: `tests/league_club_hub_contract.test.ts`

- [ ] **Step 1: Добавить падающие performance/a11y assertions**

```ts
it('keeps motion finite and bright surfaces readable', () => {
  const files = [
    'LeagueClubHero.tsx', 'LeagueQuickStats.tsx', 'LeagueActivityPreview.tsx',
    'LeagueBonusMission.tsx', 'LeaguePodium.tsx', 'LeagueLeaderboardRow.tsx',
  ].map((name) => read(`components/league/${name}`)).join('\n');
  expect(files).not.toContain('withRepeat(');
  expect(files).not.toContain('Animated.loop(');
  expect(files).not.toContain('setInterval(');
  expect(files).toContain('accessibilityLabel');
  expect(files).toContain('accentText');
});
```

Run: `npx jest --runTestsByPath tests/league_club_hub_contract.test.ts --no-cache --runInBand`

Expected: FAIL, если хотя бы один обязательный a11y/contrast token ещё не подключён.

- [ ] **Step 2: Довести accessibility и motion**

Добавить accessibility labels/hints для hero CTA, быстрых статусов, событий, contributor avatars, podium/profile и participant/profile. Импортировать `useReduceMotion` из `hooks/use_reduce_motion.ts`; при `true` отключать transform и задавать duration `0`, при `false` выполнять только однократное появление через opacity/transform длительностью 150–300 мс. Не добавлять новый `setInterval`; сохранить существующий boost countdown и его текущий lifecycle-контракт.

- [ ] **Step 3: Проверить контраст всех тем**

Передавать в новые компоненты семантические цвета текущей темы. На `t.accent`, `t.correct`, ready-green и lime CTA использовать `t.correctText`, `#07110A` либо другой существующий тёмный foreground. Проверить длинные строки для RU, UK, ES, PT-BR, VI, ID, TR, PL через `numberOfLines`, `minWidth: 0` и font scaling.

- [ ] **Step 4: Запустить все узкие guards раздела**

Run:

```bash
npx jest --runTestsByPath tests/league_club_hub_model.test.ts tests/league_activity_model.test.ts tests/league_club_hub_contract.test.ts tests/league_chat_cache_first.test.ts tests/league_chat_unread_badge_contract.test.ts tests/league_chat_author_card_open.test.ts tests/league_bonus_modal_safe_area.test.ts tests/league_bonus_gift_images.test.ts tests/league_chest_goal.test.ts tests/league_current_icon_content_alignment.test.ts tests/league_xp_promotion_remote_mode_contract.test.ts tests/owner_direction_runtime_contract.test.ts tests/runtime_lifecycle_ratchet.test.ts tests/perf_freeze_contract.test.ts tests/bouncy_screen_chrome_contract.test.ts tests/borderless_top_bevel_contract.test.ts --no-cache --runInBand
```

Expected: PASS, no source writes from tests.

- [ ] **Step 5: Запустить scoped TypeScript и lint по изменённым файлам**

Run: `npx tsc --noEmit --pretty false`

Expected: exit 0. Если весь проект падает на заранее существующих чужих изменениях, сохранить полный лог вне контекста и отдельно проверить отсутствие ошибок, относящихся к `club_screen`, `league_*_model` и `components/league/*`; не исправлять несвязанные файлы.

Run: `npx eslint app/club_screen.tsx app/league_club_hub_model.ts app/league_activity_model.ts app/league_chat_visibility.ts components/LeagueChatPanel.tsx components/league/*.tsx tests/league_club_hub_model.test.ts tests/league_activity_model.test.ts tests/league_club_hub_contract.test.ts`

Expected: exit 0 для изменённых файлов.

- [ ] **Step 6: Провести ручную визуальную проверку**

На dev build открыть Лигу в минимальной ширине телефона и проверить состояния: кешированный первый кадр, 0/1/2/3+ участников, unread chat, активный boost, бонус 0/80/100%, готовый/полученный сундук, пользователь в top-3 и вне top-3, прямой вход `openChat=1`, открытие профиля из чата/подиума/списка, light/dark/gold и одна яркая тема. Подтвердить отсутствие белого текста на лайме, скачка геометрии и фоновой анимации после ухода с экрана.

- [ ] **Step 7: Зафиксировать финальную доводку**

```bash
git add app/club_screen.tsx app/league_club_hub_model.ts app/league_activity_model.ts app/league_chat_visibility.ts components/LeagueChatPanel.tsx components/league tests/league_club_hub_model.test.ts tests/league_activity_model.test.ts tests/league_club_hub_contract.test.ts
git commit -m "test: harden league club hub runtime contracts"
```

---

## Финальные критерии приёмки

- Первый кадр показывает последний известный экран Лиги без полноэкранного спиннера.
- За три секунды видны место, недельный XP, бонусная цель, главный клубный сигнал и вход в чат.
- «Что происходит» содержит не более пяти реальных кешированных событий и не создаёт live subscription.
- Бонус-лига показывает общую цель, остаток XP, личный вклад, ведущих участников, boost и корректное состояние сундука.
- Топ-3 визуально отделён, но полный рейтинг и профили работают по-прежнему.
- Полный рейтинг виртуализирован одним главным `FlatList`; нет растущего `.map()` внутри ScrollView.
- Чат сохраняет cache-first, optimistic send, Compass, reactions, replies, moderation, unread и direct entry.
- Все прежние наградные/профильные/result модали сохранены.
- Новые интерактивные зоны не меньше 44×44 pt, имеют accessibility labels, а ярко-зелёные поверхности — тёмный foreground.
- Новые компоненты не добавляют бесконечных анимаций, фоновых таймеров или неограниченных кешей.
