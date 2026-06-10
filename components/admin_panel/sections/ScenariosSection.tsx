// Секция QA-панели: конфликтные сценарии из аудита модалок 2026-06-10
// (docs/reports/MODALS_TOASTS_AUDIT_2026-06-10.md, §2). Цепочки воспроизводят
// реальные тайминги, чтобы глазами проверить наложения окон перед релизом.
import React, { useRef, useState } from 'react';
import { useLang } from '../../LangContext';
import UpdateModal from '../../UpdateModal';
import ReleaseNotesModal from '../../ReleaseNotesModal';
import GlobalBroadcastModal from '../../GlobalBroadcastModal';
import NotificationPermissionModal from '../../NotificationPermissionModal';
import StreakReviveModal from '../../StreakReviveModal';
import PremiumCelebrationModal from '../../PremiumCelebrationModal';
import VipCelebrationModal from '../../VipCelebrationModal';
import RegistrationPromptModal from '../../RegistrationPromptModal';
import ThemedConfirmModal from '../../ThemedConfirmModal';
import { STORE_URL } from '../../../app/config';
import type { GlobalBroadcastModalPayload } from '../../../app/global_broadcast_modal';
import { markStreakLost, getReviveOffer, type StreakReviveOffer } from '../../../app/streak_revive';
import { AccordionSection, AdminHint, ButtonRow } from '../ui';
import { qaToast } from '../qa_utils';

const QA_BROADCAST_PAYLOAD: GlobalBroadcastModalPayload = {
  id: 'qa_scenario_broadcast',
  kind: 'general',
  premiumAudience: 'all',
  rewardType: 'shards',
  rewardAmount: 5,
  premiumRewardDays: 0,
  titleRu: 'Сценарий: сообщение команды',
  titleUk: 'Сценарій: повідомлення команди',
  titleEs: 'Escenario: mensaje del equipo',
  titlePtBr: 'Cenário: mensagem da equipe',
  titleVi: 'Kịch bản: thông báo từ đội ngũ',
  titleId: 'Skenario: pesan dari tim',
  titleTr: 'Senaryo: ekip mesajı',
  titlePl: 'Scenariusz: wiadomość zespołu',
  messageRu: 'Шаг 3 «парада окон»: GlobalBroadcastModal. Preview-only, без claim.',
  messageUk: 'Крок 3 «параду вікон»: GlobalBroadcastModal. Preview-only, без claim.',
  messageEs: 'Paso 3 del «desfile»: GlobalBroadcastModal. Solo vista previa.',
  messagePtBr: 'Passo 3 do «desfile»: GlobalBroadcastModal. Somente prévia.',
  messageVi: 'Bước 3 của «diễu hành»: GlobalBroadcastModal. Chỉ xem trước.',
  messageId: 'Langkah 3 «parade»: GlobalBroadcastModal. Hanya pratinjau.',
  messageTr: '«Geçit» 3. adım: GlobalBroadcastModal. Sadece önizleme.',
  messagePl: 'Krok 3 «parady»: GlobalBroadcastModal. Tylko podgląd.',
  reviewUrlIos: '',
  reviewUrlAndroid: '',
  reviewCtaRu: 'Оценить приложение',
  reviewCtaUk: 'Оцінити застосунок',
  reviewCtaEs: 'Valorar la app',
  reviewCtaPtBr: 'Avaliar o app',
  reviewCtaVi: 'Đánh giá ứng dụng',
  reviewCtaId: 'Nilai aplikasi',
  reviewCtaTr: 'Uygulamayı değerlendir',
  reviewCtaPl: 'Oceń aplikację',
  createdAt: '2026-06-10T00:00:00.000Z',
};

interface Props {
  open: boolean;
  onToggle: (id: string) => void;
  /** Реальный засев global level-up в очередь _layout (из хаба). */
  onSeedGlobalLevelUp: (level: number) => void | Promise<void>;
  /** Навигация на главную после засева (из хаба). */
  onGoHome: () => void;
  /** Засев VIP-survey inbox-сообщения + переход на главную (из хаба). */
  onSeedVipSurvey: () => void;
}

export default function ScenariosSection({ open, onToggle, onSeedGlobalLevelUp, onGoHome, onSeedVipSurvey }: Props) {
  const { lang } = useLang();

  // Сценарий 1: «холодный старт — парад окон» (Update → ReleaseNotes → Broadcast → NotifPermission)
  const [paradeStep, setParadeStep] = useState<number | null>(null);
  const advanceParade = (next: number) => {
    setParadeStep(null);
    if (next > 3) {
      qaToast('success', 'Парад завершён: 4 окна подряд, как при холодном старте');
      return;
    }
    // 400мс — реальный зазор очереди в _layout
    setTimeout(() => setParadeStep(next), 400);
  };

  // Сценарий 2: «конец первого урока — тройной удар»
  const [tripleReviewOpen, setTripleReviewOpen] = useState(false);
  const [tripleAuthOpen, setTripleAuthOpen] = useState(false);
  const tripleTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const startTripleHit = () => {
    tripleTimers.current.forEach(clearTimeout);
    tripleTimers.current = [];
    setTripleReviewOpen(true); // ReviewModal в проде открывается сразу
    tripleTimers.current.push(
      setTimeout(() => qaToast('info', '🏆 Достижение разблокировано (тайминг 1200мс)'), 1200),
      setTimeout(() => setTripleAuthOpen(true), 1500), // RegistrationPrompt: таймер 1500мс
    );
  };

  // Сценарий 3: StreakRevive → (600мс) → PremiumCelebration → (600мс) → VipCelebration
  const [chainStage, setChainStage] = useState<null | 'revive' | 'premium' | 'vip'>(null);
  const [chainOffer, setChainOffer] = useState<StreakReviveOffer | null>(null);
  const startReviveChain = async () => {
    await markStreakLost(47);
    const offer = await getReviveOffer();
    setChainOffer(offer);
    setChainStage('revive');
  };

  return (
    <AccordionSection
      id="scenarios_conflicts"
      icon="git-branch-outline"
      title="Сценарии: цепочки и конфликты окон"
      badge={5}
      open={open}
      onToggle={onToggle}
    >
      <AdminHint>
        Худшие сценарии из аудита модалок (10.06): проверь глазами наложения и порядок окон.
        Тайминги между шагами — как в проде.
      </AdminHint>
      <ButtonRow
        testID="admin-scenario-cold-start-parade"
        icon="sunny-outline"
        label="Холодный старт: парад окон"
        sub="Update → ReleaseNotes → Broadcast → NotifPermission, зазор 400мс"
        onPress={() => setParadeStep(0)}
      />
      <ButtonRow
        testID="admin-scenario-lesson-triple-hit"
        icon="alert-circle-outline"
        label="Конец 1-го урока: тройной удар"
        sub="Review сразу + ачивка через 1200мс + регистрация через 1500мс — друг на друге"
        onPress={startTripleHit}
      />
      <ButtonRow
        testID="admin-scenario-revive-chain"
        icon="flame-outline"
        label="Streak revive → Premium → VIP"
        sub="Каждое следующее окно открывается через 600мс после закрытия предыдущего"
        onPress={() => { void startReviveChain(); }}
      />
      <ButtonRow
        testID="admin-scenario-levelup-queue"
        icon="trending-up-outline"
        label="Очередь из двух level-up (реальный флоу)"
        sub="Сидит уровни 30 и 35 в pending-очередь _layout и уходит на главную: LevelUp → Gift → LevelUp"
        onPress={() => {
          void onSeedGlobalLevelUp(30);
          void onSeedGlobalLevelUp(35);
          onGoHome();
        }}
      />
      <ButtonRow
        testID="admin-scenario-inbox-flow"
        icon="mail-unread-outline"
        label="Inbox: опрос → празднование (вложенные Modal)"
        sub="Засев VIP-survey в inbox и переход на главную — открой конверт и пройди до конца"
        onPress={onSeedVipSurvey}
      />

      {/* Хосты сценария 1 */}
      <UpdateModal
        visible={paradeStep === 0}
        storeUrl={STORE_URL}
        message="Шаг 1/4: форс-обновление (сценарий «парад окон»)"
        onClose={() => advanceParade(1)}
      />
      <ReleaseNotesModal visible={paradeStep === 1} onClose={() => advanceParade(2)} />
      <GlobalBroadcastModal
        visible={paradeStep === 2}
        payload={QA_BROADCAST_PAYLOAD}
        previewOnly
        onClose={() => advanceParade(3)}
      />
      <NotificationPermissionModal
        visible={paradeStep === 3}
        lang={lang}
        onCancel={() => advanceParade(4)}
        onConfirm={() => advanceParade(4)}
      />

      {/* Хосты сценария 2 */}
      <ThemedConfirmModal
        visible={tripleReviewOpen}
        title="Нравится приложение?"
        message="Имитация ReviewModal из lesson_complete (в проде открывается сразу после урока)."
        cancelLabel="Позже"
        confirmLabel="Оценить"
        onCancel={() => setTripleReviewOpen(false)}
        onConfirm={() => setTripleReviewOpen(false)}
        confirmVariant="accent"
      />
      <RegistrationPromptModal
        visible={tripleAuthOpen}
        context="dev"
        title="QA: тройной удар"
        subtitle="RegistrationPromptModal открылся по таймеру 1500мс — поверх review-модалки, как в проде."
        onClose={() => setTripleAuthOpen(false)}
      />

      {/* Хосты сценария 3 */}
      <StreakReviveModal
        visible={chainStage === 'revive'}
        offer={chainOffer}
        onClose={() => {
          setChainStage(null);
          setTimeout(() => setChainStage('premium'), 600);
        }}
      />
      <PremiumCelebrationModal
        visible={chainStage === 'premium'}
        onClose={() => {
          setChainStage(null);
          setTimeout(() => setChainStage('vip'), 600);
        }}
      />
      <VipCelebrationModal
        visible={chainStage === 'vip'}
        onClose={() => {
          setChainStage(null);
          setChainOffer(null);
          qaToast('success', 'Цепочка revive → premium → vip завершена');
        }}
      />
    </AccordionSection>
  );
}
