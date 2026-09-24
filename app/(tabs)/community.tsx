import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { usePathname } from 'expo-router';
import { useLang } from '../../components/LangContext';
import { triLang } from '../../constants/i18n';
import { V2, V2_TYPE } from '../../constants/v2Style';
import { useV2Palette } from '../../components/v2/useV2Palette';
import V2SegmentedControl, { type V2Segment } from '../../components/v2/V2SegmentedControl';
import { TabRuntimeOwnerOverride, useTabNav } from '../TabContext';
import type { SubRuntimeOwnerId } from '../tab_page_model';

type Section = SubRuntimeOwnerId;
type SectionScreen = React.ComponentType<{ presentation?: 'push' | 'embedded' }>;

// зачем: разделы тяжёлые (лига ~2300 строк, друзья ~3900) — грузим модуль только
// при первом открытии раздела, а не вместе с вкладкой.
let leagueScreen: SectionScreen | null = null;
let friendsScreen: React.ComponentType | null = null;
let packsScreen: SectionScreen | null = null;
const loadLeague = () => (leagueScreen ??= (require('../club_screen') as { default: SectionScreen }).default);
const loadFriends = () => (friendsScreen ??= (require('./friends') as { default: React.ComponentType }).default);
const loadPacks = () => (packsScreen ??= (require('../flashcards_packs') as { default: SectionScreen }).default);

/** Старые ссылки на /(tabs)/friends (уведомления, заявки) открывают раздел «Друзья». */
function sectionFromPath(pathname: string): Section | null {
  return /\/friends\/?$/.test(pathname) ? 'friends' : null;
}

/**
 * Вкладка «Сообщество» (2.0, D39): «Лига | Друзья | Наборы» под переключателем.
 * Раздел меняется мгновенно; открытые разделы остаются смонтированными (свой
 * скролл и состояние), но работают только видимые — владелец выдаётся одному.
 */
export default function CommunityTabRoute() {
  const { lang } = useLang();
  const p = useV2Palette();
  const pathname = usePathname();
  const { runtimeOwnerId } = useTabNav();
  const [section, setSection] = useState<Section>(() => sectionFromPath(pathname) ?? 'league');
  const [visited, setVisited] = useState<ReadonlySet<Section>>(() => new Set([section]));

  useEffect(() => {
    const fromPath = sectionFromPath(pathname);
    if (fromPath) setSection(fromPath);
  }, [pathname]);

  useEffect(() => {
    setVisited((prev) => (prev.has(section) ? prev : new Set([...prev, section])));
  }, [section]);

  const segments = useMemo<readonly V2Segment<Section>[]>(() => [
    { key: 'league', label: triLang(lang, { ru: 'Лига', uk: 'Ліга', en: 'League', es: 'Liga', 'pt-BR': 'Liga', vi: 'Giải đấu', id: 'Liga', tr: 'Lig', pl: 'Liga' }) },
    { key: 'friends', label: triLang(lang, { ru: 'Друзья', uk: 'Друзі', en: 'Friends', es: 'Amigos', 'pt-BR': 'Amigos', vi: 'Bạn bè', id: 'Teman', tr: 'Arkadaşlar', pl: 'Znajomi' }) },
    { key: 'packs', label: triLang(lang, { ru: 'Наборы', uk: 'Набори', en: 'Packs', es: 'Packs', 'pt-BR': 'Pacotes', vi: 'Bộ thẻ', id: 'Paket', tr: 'Paketler', pl: 'Zestawy' }) },
  ], [lang]);

  const title = triLang(lang, { ru: 'Сообщество', uk: 'Спільнота', en: 'Community', es: 'Comunidad', 'pt-BR': 'Comunidade', vi: 'Cộng đồng', id: 'Komunitas', tr: 'Topluluk', pl: 'Społeczność' });
  const tabVisible = runtimeOwnerId === 'community' || segments.some((s) => s.key === runtimeOwnerId);

  const renderSection = (key: Section) => {
    if (!visited.has(key) && key !== section) return null;
    const shown = key === section;
    const owner = tabVisible && shown ? key : 'community';
    let body: React.ReactNode;
    if (key === 'league') { const Screen = loadLeague(); body = <Screen presentation="embedded" />; }
    else if (key === 'friends') { const Screen = loadFriends(); body = <Screen />; }
    else { const Screen = loadPacks(); body = <Screen presentation="embedded" />; }
    return (
      <View
        key={key}
        style={[StyleSheet.absoluteFill, shown ? null : s.hidden]}
        pointerEvents={shown ? 'auto' : 'none'}
        accessibilityElementsHidden={!shown}
        importantForAccessibility={shown ? 'auto' : 'no-hide-descendants'}
      >
        <TabRuntimeOwnerOverride runtimeOwnerId={owner}>{body}</TabRuntimeOwnerOverride>
      </View>
    );
  };

  return (
    <View testID="community-tab" style={s.root}>
      <View style={s.header}>
        <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{title}</Text>
        <V2SegmentedControl testID="community-sections" segments={segments} value={section} onChange={setSection} />
      </View>
      <View style={s.body}>
        {renderSection('league')}
        {renderSection('friends')}
        {renderSection('packs')}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: V2.screenPad, paddingTop: 12, paddingBottom: 8, gap: 16 },
  title: { ...V2_TYPE.largeTitle },
  body: { flex: 1, minHeight: 0 },
  // Скрытый раздел не рисуется, но сохраняет своё состояние и скролл.
  hidden: { display: 'none' },
});
