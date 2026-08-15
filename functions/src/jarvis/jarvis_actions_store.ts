import {
  buildProposedAction,
  validateAction,
  JARVIS_ACTIONS_MAX_PER_RUN,
  type JarvisAction,
  type ProposedActionInput,
} from './jarvis_actions';

/**
 * Хранилище и исполнитель действий Джарвиса.
 *
 * зачем разделены предложение и применение (safe outputs, GitHub Agentic
 * Workflows): агент НЕ пишет в чужие коллекции напрямую. Он кладёт описание
 * действия в буфер, действие проходит проверку кодом, владелец соглашается —
 * и только тогда отдельный шаг применяет его. Между «модель решила» и
 * «мир изменился» стоят две преграды, ни одну из которых модель не проходит
 * уговорами.
 *
 * зачем каждое действие хранит план отката: действие без отката — необратимое
 * действие, как бы безобидно оно ни выглядело. Откат исполняет код по записи
 * в журнале, LLM в нём не участвует.
 */

export const JARVIS_ACTIONS_COLLECTION = 'jarvis_actions';

/** Поле, куда складываются пометки Джарвиса в чужих документах. */
const TAG_FIELD = 'jarvisTags';

export interface ProposeActionsInput {
  readonly db: FirebaseFirestore.Firestore;
  readonly proposals: readonly ProposedActionInput[];
  readonly nowMs: number;
}

/**
 * Складывает предложения в буфер. Ничего не применяет.
 *
 * зачем сохранять и отвергнутые: молча выброшенное предложение невозможно
 * расследовать — вопрос «почему он этого не сделал» остался бы без ответа.
 */
export async function proposeActions(input: ProposeActionsInput): Promise<readonly JarvisAction[]> {
  const saved: JarvisAction[] = [];

  for (const proposal of input.proposals) {
    // зачем потолок внутри цикла: он ограничивает ПРИНЯТЫЕ предложения,
    // а отвергнутые всё равно записываются — иначе отказы терялись бы.
    if (saved.length >= JARVIS_ACTIONS_MAX_PER_RUN) break;

    const verdict = validateAction(proposal);
    const action = buildProposedAction(proposal);
    const ref = input.db.collection(JARVIS_ACTIONS_COLLECTION).doc(action.id);

    if (!verdict.ok) {
      await ref.set({
        ...action,
        status: 'rejected',
        rejectedReason: verdict.reason,
        updatedAtMs: input.nowMs,
      });
      continue;
    }

    // guard-ok (merge): пишем целиком — buildProposedAction уже собрал запись,
    // merge оставил бы поля от прошлой схемы.
    await ref.set({ ...action });
    saved.push(action);
  }

  return Object.freeze(saved);
}

export interface ApproveActionsForDecisionInput {
  readonly db: FirebaseFirestore.Firestore;
  readonly sourceDecisionHash: string;
  readonly nowMs: number;
}

/**
 * Одобряет предложенные действия по решению, которое владелец только что принял.
 *
 * зачем без отдельной кнопки: владелец уже сказал «да» этой находке в
 * Telegram. Спрашивать второй раз «а точно поставить пометку?» — это лишний
 * тап и та самая усталость от подтверждений, из-за которой люди начинают
 * жать «ок» не глядя. Согласие с находкой = согласие на её обратимые действия.
 *
 * Необратимого в списке разрешённых нет by design (см. ALLOWED_ACTION_KINDS),
 * поэтому цена ошибочного «да» — один клик отката.
 */
export async function approveActionsForDecision(
  input: ApproveActionsForDecisionInput,
): Promise<number> {
  // guard-ok (limit): выборка по конкретному решению, действий единицы.
  const snap = await input.db.collection(JARVIS_ACTIONS_COLLECTION)
    .where('sourceDecisionHash', '==', input.sourceDecisionHash)
    .limit(JARVIS_ACTIONS_MAX_PER_RUN)
    .get();

  let approved = 0;
  for (const doc of snap.docs) {
    const action = doc.data() as JarvisAction;
    // зачем только proposed: отвергнутое валидатором не воскрешаем,
    // уже применённое не применяем заново.
    if (action.status !== 'proposed') continue;
    await doc.ref.set({ status: 'approved', approvedAtMs: input.nowMs, updatedAtMs: input.nowMs }, { merge: true });
    approved += 1;
  }
  return approved;
}

export interface ApplyApprovedActionsInput {
  readonly db: FirebaseFirestore.Firestore;
  readonly nowMs: number;
}

/**
 * Применяет действия, которые владелец одобрил.
 *
 * зачем отдельным шагом от предложения: между решением модели и изменением
 * мира обязано стоять согласие человека. Автоматическое применение — это та
 * автономия, которой владелец не давал.
 */
export async function applyApprovedActions(input: ApplyApprovedActionsInput): Promise<number> {
  // guard-ok (limit): выборка только одобренных, их единицы.
  const snap = await input.db.collection(JARVIS_ACTIONS_COLLECTION)
    .where('status', '==', 'approved')
    .limit(JARVIS_ACTIONS_MAX_PER_RUN)
    .get();

  let applied = 0;
  for (const doc of snap.docs) {
    const action = doc.data() as JarvisAction;
    try {
      await applyOne(input.db, action);
      await doc.ref.set({ status: 'applied', appliedAtMs: input.nowMs, updatedAtMs: input.nowMs }, { merge: true });
      applied += 1;
    } catch (error) {
      // зачем не бросать: одно упавшее действие не должно останавливать
      // остальные и валить весь прогон.
      await doc.ref.set({
        status: 'rejected',
        rejectedReason: `не удалось применить: ${String(error)}`,
        updatedAtMs: input.nowMs,
      }, { merge: true });
    }
  }
  return applied;
}

async function applyOne(db: FirebaseFirestore.Firestore, action: JarvisAction): Promise<void> {
  // guard-ok (limit): .doc() адресует ОДИН документ по id — это не запрос
  // коллекции, limit()/where() здесь неприменимы. Коллекция взята не из
  // модели, а из белого списка ALLOWED_TARGETS (см. jarvis_actions.ts).
  const ref = db.collection(action.target.collection).doc(action.target.docId);

  if (action.kind === 'admin_tag') {
    const snap = await ref.get();
    const current = snap.exists ? (snap.data() as Record<string, unknown>) : {};
    const tags = Array.isArray(current[TAG_FIELD]) ? (current[TAG_FIELD] as string[]) : [];
    const tag = String(action.payload.tag);
    // зачем проверять наличие: крон ходит каждый день, и одобренное действие
    // не должно наплодить пять одинаковых пометок.
    if (tags.includes(tag)) return;
    await ref.set({ [TAG_FIELD]: [...tags, tag] }, { merge: true });
    return;
  }

  if (action.kind === 'support_draft') {
    await ref.set({
      jarvisDraft: {
        text: String(action.payload.draft),
        actionId: action.id,
        // зачем пометка авторства: человек, открывший черновик, обязан видеть,
        // что текст написан не им и не отправлен.
        writtenBy: 'jarvis',
        sent: false,
      },
    }, { merge: true });
    return;
  }

  // github_issue: пишем в собственный исходящий буфер, наружу отправляет
  // отдельный процесс с токеном. Здесь токена нет и быть не должно.
  await ref.set({
    title: String(action.payload.title),
    body: String(action.payload.body ?? ''),
    actionId: action.id,
    delivered: false,
    createdAtMs: action.createdAtMs,
  }, { merge: true });
}

export interface RollbackActionInput {
  readonly db: FirebaseFirestore.Firestore;
  readonly actionId: string;
  readonly nowMs: number;
}

/**
 * Отменяет применённое действие по записи в журнале.
 *
 * зачем откат исполняет КОД, а не модель: в откате нельзя импровизировать.
 * План отката записан в момент предложения и с тех пор не менялся.
 */
export async function rollbackAction(input: RollbackActionInput): Promise<boolean> {
  // guard-ok (limit): оба обращения ниже — .doc() по конкретному id, чтение
  // одной записи журнала и одной цели отката. Не запрос коллекции.
  const ref = input.db.collection(JARVIS_ACTIONS_COLLECTION).doc(input.actionId);
  const snap = await ref.get();
  if (!snap.exists) return false;

  const action = snap.data() as JarvisAction;
  if (action.status !== 'applied') return false;

  const targetRef = input.db.collection(action.rollback.target.collection).doc(action.rollback.target.docId);

  if (action.rollback.kind === 'remove_tag') {
    const targetSnap = await targetRef.get();
    const current = targetSnap.exists ? (targetSnap.data() as Record<string, unknown>) : {};
    const tags = Array.isArray(current[TAG_FIELD]) ? (current[TAG_FIELD] as string[]) : [];
    await targetRef.set({ [TAG_FIELD]: tags.filter((t) => t !== String(action.payload.tag)) }, { merge: true });
  } else if (action.rollback.kind === 'delete_draft') {
    // зачем null, а не удаление поля: история видна, черновик исчез.
    await targetRef.set({ jarvisDraft: null }, { merge: true });
  } else {
    await targetRef.set({ delivered: false, closed: true }, { merge: true });
  }

  await ref.set({ status: 'rolled_back', rolledBackAtMs: input.nowMs, updatedAtMs: input.nowMs }, { merge: true });
  return true;
}
