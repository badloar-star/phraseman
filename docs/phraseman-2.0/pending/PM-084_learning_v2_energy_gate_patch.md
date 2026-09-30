# PM-084 — патч подключения гейта энергии в Learning V2 (вставить ПОСЛЕ коммита сессии «Дизайн»)

Гейт готов и протестирован: `app/energy_first_question_gate.ts`, `hooks/useFirstQuestionEnergyGate.ts`, `hooks/learningV2FirstQuestionEnergy.ts` (tests/energy_first_question_gate.test.ts 11/11).

`app/learning-v2/session/[id].tsx`, функция `LearningV2SessionEnergyGate` (≈2123–2154 на 30.09):
1. `const { confirmSpendOne: confirmLearningV2Energy, acknowledgeSessionStart, energyReady } = useEnergy();` → `const { energyReady, energy, bonusEnergy, isUnlimited } = useEnergy();`
2. `useEnergySessionIntent("learning_v2_session", first(params.id) ?? "unknown")` → третьим аргументом `sessionRunId || undefined` (remount того же запуска не списывает; новый вход = новая попытка, D67).
3. Удалить `attemptedRef` и `useEffect` со списанием; вставить:
```ts
const [firstQuestionShown, setFirstQuestionShown] = useState(false);
const blocked = isAuthoringPreview || directSessionUnready || legacySessionUnready;
useFirstQuestionEnergyGate({
  intent: learningV2EnergyIntent, screen: 'learning_v2_session',
  firstQuestionVisible: !blocked && energyReady && firstQuestionShown,
  onInsufficient: () => setGate('denied'),
  onCancelled: () => safeRouterBack(router, '/(tabs)/lessons' as never),
});
useEffect(() => { if (!blocked && energyReady) setGate(isUnlimited || energy + bonusEnergy >= 1 ? 'ok' : 'denied'); }, [blocked, energyReady, isUnlimited, energy, bonusEnergy]);
const signal = useMemo(() => ({ onFirstQuestionShown: () => setFirstQuestionShown(true) }), []);
```
4. При `gate === "ok"` вместо `return <>{children}</>` → `<LearningV2FirstQuestionEnergyContext.Provider value={signal}>{children}</LearningV2FirstQuestionEnergyContext.Provider>`.
5. В плеерах (`app/learning_v2_direct_session_player_v1.tsx` и плеер старого режима) вызвать `useReportLearningV2FirstQuestionShown(Boolean(<текущее задание отрисовано>))`.
6. Импорты: `useFirstQuestionEnergyGate` из `../../../hooks/useFirstQuestionEnergyGate`; `LearningV2FirstQuestionEnergyContext`, `useReportLearningV2FirstQuestionShown` из `../../../hooks/learningV2FirstQuestionEnergy`.
Также: в `components/EnergyContext.tsx` после успешного `runLoad` вызвать `recoverUnshownFirstQuestionCharges(...)`, чтобы возврат за прошлый запуск шёл при старте, а не при первом экране (после коммита сессии с бонусами).
