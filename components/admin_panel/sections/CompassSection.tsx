// Секция QA-панели: «Компас» — вызов модала брифинга и обновление дней.
// Раньше «Компас» нельзя было проверить из админки: брифинг показывается раз в
// день и только при включённом флаге + премиуме, а тип дня выбирается правилами.
// Эта секция ведёт в изолированную лабораторию admin_compass_lab.
import React from 'react';
import { useRouter } from 'expo-router';
import { AccordionSection, AdminHint, ButtonRow } from '../ui';

interface Props {
  open: boolean;
  onToggle: (id: string) => void;
}

export default function CompassSection({ open, onToggle }: Props) {
  const router = useRouter();
  return (
    <AccordionSection
      id="compass"
      icon="compass-outline"
      title="🧭 Компас"
      badge={2}
      open={open}
      onToggle={onToggle}
    >
      <AdminHint>
        Брифинг «Компаса» (для ИИ-голоса) и обновление дней. Превью по всем 4 типам
        дня + реальный день + сброс маркера «показано сегодня».
      </AdminHint>
      <ButtonRow
        testID="admin-compass-briefing"
        icon="navigate-outline"
        label="Вызвать модал брифинга"
        sub="4 типа дня (лёгкий / ремонт / погружение / возврат) + реальный день"
        onPress={() => router.push('/admin_compass_lab' as any)}
      />
      <ButtonRow
        testID="admin-compass-refresh-days"
        icon="refresh-outline"
        label="Обновление дней"
        sub="Сбросить «показано сегодня» — брифинг снова всплывёт на главной"
        onPress={() => router.push('/admin_compass_lab' as any)}
      />
    </AccordionSection>
  );
}
