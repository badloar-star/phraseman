// Секция QA-панели: единый список всех dev-лабораторий. До редизайна 2026-06
// celebration-лаба и anim-demo вообще не были доступны из панели.
import React from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccordionSection, AdminHint, ButtonRow } from '../ui';
import {
  requestForcedWelcome,
  resetWelcomeSeen,
  type WelcomeBranch,
} from '../../../app/onboarding_welcome/welcome_gate';

interface Props {
  open: boolean;
  onToggle: (id: string) => void;
  /** Засев и запуск тест-бенча «Повтор: 7 карточек» (из хаба). */
  onOpenReviewBench: () => void;
}

export default function LabsSection({ open, onToggle, onOpenReviewBench }: Props) {
  const router = useRouter();

  /** Принудительно запустить приветствие нужной ветки на главной. */
  const launchWelcome = async (branch: WelcomeBranch) => {
    // Гейт ждёт onboarding_done — в QA проставим, чтобы запуск точно сработал.
    await AsyncStorage.setItem('onboarding_done', '1').catch(() => {});
    await resetWelcomeSeen();
    await requestForcedWelcome(branch);
    router.push('/(tabs)/home' as any);
  };
  return (
    <AccordionSection
      id="labs_hub"
      icon="flask-outline"
      title="Лаборатории (все)"
      badge={9}
      open={open}
      onToggle={onToggle}
    >
      <AdminHint>Отдельные dev-экраны с изолированными превью.</AdminHint>
      <ButtonRow
        testID="admin-welcome-free"
        icon="compass-outline"
        label="Знакомство: новичок"
        sub="Запуск приветствия (без плана) на главной с реальной подсветкой"
        onPress={() => { void launchWelcome('free'); }}
      />
      <ButtonRow
        testID="admin-welcome-plan"
        icon="map-outline"
        label="Знакомство: с планом"
        sub="Запуск приветствия (платный план) на главной с реальной подсветкой"
        onPress={() => { void launchWelcome('plan'); }}
      />
      <ButtonRow
        testID="admin-lab-speaking"
        icon="mic-outline"
        label="Speaking Lab"
        sub="8 статусов SpeakingPanel + пейвол context=speaking"
        onPress={() => router.push('/admin_speaking_lab' as any)}
      />
      <ButtonRow
        testID="admin-lab-referral"
        icon="people-outline"
        label="Referral Lab"
        sub="VIP за друзей: 3 варианта Activated + Ended"
        onPress={() => router.push('/admin_referral_lab' as any)}
      />
      <ButtonRow
        testID="admin-lab-intro-preview"
        icon="book-outline"
        label="Intro Preview"
        sub="Онбординг-экраны уроков 1–32, сброс intro-флагов"
        onPress={() => router.push('/admin_intro_preview' as any)}
      />
      <ButtonRow
        testID="admin-lab-premium-delivery"
        icon="cloud-done-outline"
        label="Premium Delivery Test"
        sub="E2E: VIP реально приходит с сервера и не утекает при смене аккаунта"
        onPress={() => router.push('/admin_premium_delivery_test' as any)}
      />
      <ButtonRow
        testID="admin-lab-celebration"
        icon="trophy-outline"
        label="Celebration Lab"
        sub="«Дорогой» экран завершения урока: трофей, конфетти, XP-каунтер"
        onPress={() => router.push('/admin_celebration_lab' as any)}
      />
      <ButtonRow
        testID="admin-lab-anim-demo"
        icon="color-wand-outline"
        label="Anim Demo Lab"
        sub="Возможности стека: FLIP, SHINE, BURST, Duolingo-кнопка"
        onPress={() => router.push('/anim_demo_lab' as any)}
      />
      <ButtonRow
        testID="admin-lab-review-bench"
        icon="refresh-outline"
        label="Повтор: 7 тестовых карточек"
        sub="Сид урока 99 и экран «Повторение»"
        onPress={onOpenReviewBench}
      />
    </AccordionSection>
  );
}
