// Секция QA-панели: инлайн-тосты и баннеры, не покрытые панелью до редизайна
// 2026-06: InGameToast, RankChangeBanner, SaveProgressBanner. Это НЕ <Modal> —
// они рендерятся в потоке, поэтому показываются в превью-зоне внутри секции.
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useLang } from '../../LangContext';
import InGameToast from '../../InGameToast';
import RankChangeBanner from '../../RankChangeBanner';
import SaveProgressBanner from '../../SaveProgressBanner';
import {
  AccordionSection, AdminHint, ButtonRow,
  ADMIN_SURFACE_MUTED, ADMIN_TEXT_MUTED, ACCENT_BORDER_SOFT,
} from '../ui';

interface Props {
  open: boolean;
  onToggle: (id: string) => void;
}

export default function BannersToastsExtraSection({ open, onToggle }: Props) {
  const { lang } = useLang();
  const [inGameToast, setInGameToast] = useState<{ message: string; type: 'error' | 'info' } | null>(null);
  const [rankDelta, setRankDelta] = useState<{ delta: number; passedName?: string; lostToName?: string } | null>(null);

  return (
    <AccordionSection
      id="banners_toasts_extra"
      icon="reorder-three-outline"
      title="Баннеры и инлайн-тосты (остальные)"
      badge={4}
      open={open}
      onToggle={onToggle}
    >
      <AdminHint>
        Инлайн-элементы (не Modal): рендерятся в превью-зоне ниже. InGameToast в проде висит поверх
        арены (zIndex 999999), RankChangeBanner — в ленте клуба.
      </AdminHint>
      <ButtonRow
        testID="admin-extra-ingame-toast-info"
        icon="chatbubble-outline"
        label="InGameToast — info"
        sub="Авто-скрытие через 3 сек"
        onPress={() => setInGameToast({ message: 'Запрос в друзья отправлен!', type: 'info' })}
      />
      <ButtonRow
        testID="admin-extra-ingame-toast-error"
        icon="warning-outline"
        label="InGameToast — error"
        sub="Вариант ошибки"
        onPress={() => setInGameToast({ message: 'Не удалось подключиться к матчу', type: 'error' })}
      />
      <ButtonRow
        testID="admin-extra-rank-banner-up"
        icon="trending-up-outline"
        label="RankChangeBanner — обогнал (+2)"
        sub="Баннер из ленты клуба; в превью не скрывается сам"
        onPress={() => setRankDelta({ delta: 2, passedName: 'Carlos' })}
      />
      <ButtonRow
        testID="admin-extra-rank-banner-down"
        icon="trending-down-outline"
        label="RankChangeBanner — обогнали (−1)"
        sub="Понижение позиции"
        onPress={() => setRankDelta({ delta: -1, lostToName: 'Diana' })}
      />

      {/* Превью-зона для инлайн-элементов */}
      <View
        style={{
          margin: 12,
          minHeight: 150,
          borderRadius: 12,
          borderWidth: 0.5,
          borderColor: ACCENT_BORDER_SOFT,
          backgroundColor: ADMIN_SURFACE_MUTED,
          overflow: 'hidden',
          padding: 12,
        }}
      >
        <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 10, marginBottom: 8 }}>
          превью-зона (инлайн-рендер)
        </Text>
        {rankDelta && (
          <RankChangeBanner
            delta={rankDelta.delta}
            passedName={rankDelta.passedName ?? null}
            lostToName={rankDelta.lostToName ?? null}
            lang={lang}
            duration={0}
            onClose={() => setRankDelta(null)}
          />
        )}
        {/* SaveProgressBanner сам решает, показываться ли: XP ≥ 1000, нет привязки
            аккаунта, кулдаун 7 дней. Если условия не выполнены — место пустое. */}
        <SaveProgressBanner />
        <Text style={{ color: ADMIN_TEXT_MUTED, fontSize: 10, marginTop: 8 }}>
          SaveProgressBanner появится тут при XP ≥ 1000 и без привязанного аккаунта
        </Text>
        {inGameToast && (
          <InGameToast
            message={inGameToast.message}
            type={inGameToast.type}
            onHide={() => setInGameToast(null)}
          />
        )}
      </View>
    </AccordionSection>
  );
}
