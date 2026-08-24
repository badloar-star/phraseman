import fs from 'fs';
import path from 'path';

// зачем (владелец 2026-08-24): создание СВОИХ карточек и СВОИХ наборов стало
// функцией подписки (Plus/Pro/Max). До этой правки обе функции были открыты
// всем бесплатно — ни одной проверки в коде не было, поэтому регрессия сюда
// вернулась бы незаметно. Сторож фиксирует два правила:
//   1) создание нового закрыто без подписки;
//   2) уже созданное НЕ отбирается — редактирование существующего не гейтится.
const root = path.join(__dirname, '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

// зачем без require самих экранов/премиум-контекста: они тянут за собой почти
// весь граф приложения и валят воркер по памяти (известная беда этой машины,
// см. project_season_tests_heap_oom). Логику берём из чистого модуля, а связи
// экранов проверяем чтением исходников — так же, как остальные контракты тем.
const gateSource = read('app', 'creator_access.ts');
const premiumContextSource = read('app', 'premium_context.ts');

const editorSource = read('app', 'flashcards_card_editor.tsx');
const packCreateSource = read('app', 'community_pack_create.tsx');

describe('creator access (own cards and own packs are a subscription feature)', () => {
  it('opens the creator for any paid subscription and closes it for free users', () => {
    // Plus / Pro / Max приходят в приложение одним признаком «есть премиум»
    // (Max тоже считается premium), поэтому одна проверка накрывает все три тира.
    // Гейт делегирован shouldGateFeature — тому же механизму, что у остальных
    // фич: тумблер «Премиум/Фри» в админ-пульте и Weekly Boon работают сразу.
    expect(gateSource).toContain("import { shouldGateFeature } from './feature_gates';");
    expect(gateSource).toContain("return shouldGateFeature('flashcards', hasPremiumAccess);");
  });

  it('reuses existing paywall contexts instead of inventing new ones', () => {
    // Новый context потребовал бы записей в пяти словарях paywall_copy,
    // застрахованных отдельным контрактом. Переиспользуем существующие.
    const contexts = [...gateSource.matchAll(/'(flashcard_[a-z_]+)'/g)].map((m) => m[1]);
    expect(contexts.length).toBeGreaterThan(0);
    for (const context of contexts) {
      expect(premiumContextSource).toContain(`'${context}'`);
    }
  });

  it('gates CREATING a new card but never editing an existing one', () => {
    expect(editorSource).toContain("import { creatorPaywallContext, shouldGateCreator } from './creator_access';");
    // Гейт завязан на !isEdit — редактирование своей старой карточки открыто.
    expect(editorSource).toContain('const creatorGated = !isEdit && shouldGateCreator(hasPremiumAccess);');
    expect(editorSource).toContain("params: { context: creatorPaywallContext('card'), source: 'card_editor_create' },");
    // Вторая линия защиты: клавиатурный onSubmitEditing уже однажды обходил disabled.
    expect(editorSource).toContain('|| creatorGated) return;');
    expect(editorSource).toContain('&& !creatorGated;');
  });

  it('gates CREATING a new pack but never editing an existing one', () => {
    expect(packCreateSource).toContain("import { creatorPaywallContext, shouldGateCreator } from './creator_access';");
    expect(packCreateSource).toContain('const creatorGated = !isEditMode && shouldGateCreator(hasPremiumAccess);');
    expect(packCreateSource).toContain("params: { context: creatorPaywallContext('pack'), source: 'pack_create' },");
    expect(packCreateSource).toContain('if (creatorGated) return;');
  });

  // зачем (аудит 2026-08-24): до резолва подписки hasPremiumAccess равен false.
  // Без ожидания accessResolved ПЛАТЯЩИЙ человек на холодном старте получал бы
  // пейвол вместо своего экрана — регрессия прямо по деньгам.
  it('never shows the paywall to a paying user before access resolves', () => {
    for (const source of [editorSource, packCreateSource]) {
      expect(source).toContain('const { accessResolved } = usePremium();');
      // Редирект ждёт резолва…
      expect(source).toContain('const creatorLocked = creatorGated && accessResolved;');
      // …а запись закрыта СРАЗУ (creatorGated), пока доступ ещё неизвестен.
      expect(source).toContain('creatorGated');
    }
  });

  it('reports the paywall to analytics like other gates do', () => {
    expect(editorSource).toContain("void trackEvent('paywall_shown', { context: creatorPaywallContext('card')");
    expect(packCreateSource).toContain("void trackEvent('paywall_shown', { context: creatorPaywallContext('pack')");
  });

  it('keeps the gate on the screens themselves, not on individual buttons', () => {
    // В редактор и в создание набора ведёт несколько входов (кнопки коллекции,
    // хаб категорий, легаси-диплинк ?create=1). Проверка на самих экранах не
    // оставляет обходного пути ни одному из них.
    for (const source of [editorSource, packCreateSource]) {
      expect(source).toContain('creatorRedirectedRef');
      expect(source).toContain('router.replace({');
    }
  });
});
