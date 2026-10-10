import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import V2SegmentedControl from '../components/v2/V2SegmentedControl';
import {
  V2AnswerOption, V2Badge, V2Button, V2Card, V2IconButton, V2InfoCard, V2LargeTitle, V2ProgressBar,
  V2Row, V2ScreenHeader, V2SearchField, V2SectionHeader, V2SheetFrame, V2StatStrip,
} from '../components/v2/V2Kit';
import { useV2Palette } from '../components/v2/useV2Palette';
import { V2 } from '../constants/v2Style';
import { safeRouterBack } from './navigation_back';

/**
 * Витрина набора 2.0 (dev): все кнопки, строки, карточки и шторка на одном
 * экране — владелец смотрит систему целиком до перевода экранов на неё.
 */
export default function V2KitPreviewScreen() {
  // Витрина только для разработки: в сборке для людей её не видно.
  if (!__DEV__) return <Redirect href="/(tabs)/home" />;
  return <V2KitPreview />;
}

function V2KitPreview() {
  const router = useRouter();
  const p = useV2Palette();
  const [tab, setTab] = useState<'theory' | 'practice' | 'cards'>('theory');
  const [answer, setAnswer] = useState<number | null>(null);
  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} decelerationRate="fast">
          <V2ScreenHeader
            title="Витрина деталей"
            subtitle="Не экран — образцы кнопок и строк"
            onBack={() => safeRouterBack(router, '/(tabs)/home' as never)}
            right={<V2IconButton icon="ellipsis-horizontal" accessibilityLabel="Ещё" />}
          />
          <V2LargeTitle title="Крупный заголовок" subtitle="Образец подписи под заголовком" right={<V2IconButton icon="add" accessibilityLabel="Создать" />} />
          <V2SegmentedControl segments={[{ key: 'theory', label: 'Раздел 1' }, { key: 'practice', label: 'Раздел 2' }, { key: 'cards', label: 'Раздел 3' }]} value={tab} onChange={setTab} />
          <V2StatStrip stats={[
            { icon: 'bar-chart-outline', label: 'Показатель 1', value: '8 из 12' },
            { icon: 'albums-outline', label: 'Показатель 2', value: '50' },
            { icon: 'time-outline', label: 'Показатель 3', value: '~ 12 мин' },
          ]} />
          <V2Card seed={0} style={s.progressCard}>
            <View style={{ flex: 1, gap: 12 }}>
              <Text style={[s.small, { color: p.textSecondary }]}>Твой прогресс</Text>
              <View style={s.progressRow}>
                <V2ProgressBar value={0.24} style={{ flex: 1 }} />
                <Text style={[s.small, { color: p.textSecondary }]}>24%</Text>
              </View>
            </View>
            <V2Button label="Продолжить" variant="secondary" size="small" icon="chevron-forward" />
          </V2Card>
          <V2SectionHeader title="Заголовок секции" actionLabel="Смотреть все" onAction={() => {}} />
          <V2Row seed={1} icon="play" iconShape="circle" title="Продолжить" subtitle="Упражнение 3 · Выбери правильную форму" onPress={() => {}} />
          <V2Row seed={2} icon="book-outline" iconShape="circle" title="Словарь" subtitle="20 ключевых слов и выражений" onPress={() => {}} />
          <V2Row seed={3} icon="flash-outline" title="Блиц" subtitle="За 60 секунд находи верные переводы" onPress={() => {}} />
          <V2Row seed={4} title="Family" subtitle="Лидия · ♡ 4 · 9" badge="20" onPress={() => {}} />
          <V2Row
            seed={0}
            leading={<Text style={[s.index, { color: p.textSecondary }]}>1</Text>}
            title="Lay"
            subtitle="класть, помещать"
            chevron={false}
            trailing={<View style={s.trailing}><V2IconButton icon="play" variant="outline" size={40} accessibilityLabel="Озвучить" /><V2IconButton icon="ellipsis-horizontal" variant="outline" size={40} accessibilityLabel="Ещё" /></View>}
          />
          <V2InfoCard icon="bulb-outline" overline="Главное правило" title="not ставится после am / is / are." />
          <V2InfoCard icon="document-text-outline" overline="Полезно знать" body="В разговорной речи часто используют сокращённые формы: I'm not, He isn't." onPress={() => {}} />
          <V2SearchField placeholder="Поиск по карточкам…" onFilterPress={() => {}} />
          <View style={s.badges}>
            <V2Badge label="A1" tone="outline" />
            <V2Badge label="49" />
            <V2Badge label="Урок 4" />
          </View>
          <V2Button label="Тренироваться с карточками" icon="arrow-forward" />
          <V2Button label="Добавить себе" variant="accent" icon="add" iconPosition="leading" />
          <V2Button label="Позже" variant="ghost" />
          <View style={{ gap: 12 }}>
            {['Нанимать, увольнять, бросить привычку', 'Складывать, сгибать об одежде', 'Обманывать, изменять'].map((label, i) => (
              <V2AnswerOption key={label} label={label} state={answer === null ? 'idle' : i === 0 ? 'correct' : answer === i ? 'wrong' : 'dimmed'} onPress={() => setAnswer(i)} />
            ))}
          </View>
          <V2SheetFrame title="Тренироваться с карточками" subtitle="Выбери формат тренировки" onClose={() => {}}>
            <View style={{ gap: 12 }}>
              <V2Row seed={2} icon="mic-outline" title="Устно" subtitle="Произноси фразы вслух" onPress={() => {}} />
              <V2Row seed={3} icon="checkmark-circle-outline" title="Правда / ложь" subtitle="Сверяй фразу с переводом" onPress={() => {}} />
            </View>
          </V2SheetFrame>
        </ScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: V2.screenPad, paddingTop: 8, paddingBottom: 48, gap: 14 },
  progressCard: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  small: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  index: { width: 22, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badges: { flexDirection: 'row', gap: 10 },
});
