import React, { useEffect, useMemo, useState } from 'react';
import { useAccentGraphics } from '../../hooks/use_accent_graphics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { useLang } from '../../components/LangContext';
import { triLang } from '../../constants/i18n';
import { V2 } from '../../constants/v2Style';
import { useV2Palette } from '../../components/v2/useV2Palette';
import { CommunityHeaderSlotProvider, type CommunityHeaderSlot } from '../community_header_slot';
import { TabRuntimeOwnerOverride, useTabNav } from '../TabContext';
import { SUB_RUNTIME_OWNER_IDS, type SubRuntimeOwnerId } from '../tab_page_model';
import { isSpireTabEnabled, primeSpireTabFlag, useSpireTabEnabled } from '../spire_tab_flag';
import { refreshSpireTabFlagIfClosed } from '../spire_gate_refresh';
import { hapticTap } from '../../hooks/use-haptics';
import SpireSceneHeaderLayer from '../../components/spire/scene/spire_scene_header';
import { useTabTopBleedInset } from '../../components/tab_top_bleed';

type Section = SubRuntimeOwnerId;
type SectionScreen = React.ComponentType<{ presentation?: 'push' | 'embedded' }>;

// Разделы друзей и наборов грузятся только при первом открытии вкладки.
let friendsScreen: React.ComponentType | null = null;
let spireScreen: React.ComponentType | null = null;
let packsScreen: SectionScreen | null = null;
const loadFriends = () => (friendsScreen ??= (require('./friends') as { default: React.ComponentType }).default);
// зачем: экран Шпиля грузится только когда замок открыт и раздел выбран.
const loadSpire = () => (spireScreen ??= (require('../../components/spire/SpireHomeScreen') as { default: React.ComponentType }).default);
const loadPacks = () => (packsScreen ??= (require('../flashcards_packs') as { default: SectionScreen }).default);

/** Старые ссылки на /(tabs)/friends (уведомления, заявки) открывают раздел «Друзья». */
function sectionFromPath(pathname: string): Section | null {
  return /\/friends\/?$/.test(pathname) ? 'friends' : null;
}

// зачем (01.10, пуши Шпиля 7024103cd): /(tabs)/community?section=spire открывает нужный раздел
// сразу. Неизвестное значение игнорируется; закрытый Шпиль сам вернётся к «Друзьям» (эффект ниже).
function sectionFromParam(value: unknown): Section | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'string' && (SUB_RUNTIME_OWNER_IDS as readonly string[]).includes(raw) ? raw as Section : null;
}

/**
 * Вкладка «Сообщество»: текстовые вкладки «Шпиль · Друзья · Наборы» (packs-simple.html кадр 1,
 * решение владельца 04.10 — одна шапка на всю вкладку, без заголовка «Сообщество»).
 * Раздел меняется мгновенно; открытые разделы остаются смонтированными (свой
 * скролл и состояние), но работают только видимые — владелец выдаётся одному.
 */
export default function CommunityTabRoute() {
  const { lang } = useLang();
  const p = useV2Palette();
  const accentGfx = useAccentGraphics(); // зачем (светлый акцент, аудит 13.10 §1): графика на сыром accent невидима в светлых градиентных темах — глубокий токен accentBorder (в тёмном ≈ accent, вид не меняется)
  const pathname = usePathname();
  const { section: sectionParam } = useLocalSearchParams<{ section?: string }>();
  const { runtimeOwnerId } = useTabNav();
  const spireVisible = useSpireTabEnabled();
  const [section, setSection] = useState<Section>(() => sectionFromParam(sectionParam) ?? sectionFromPath(pathname) ?? 'friends');
  const [visited, setVisited] = useState<ReadonlySet<Section>>(() => new Set([section]));
  // зачем: кнопки справа (лупа, язык) и раскрытый поиск отдаёт сам раздел «Наборы» — их состояние живёт там.
  const [packsSlot, setPacksSlot] = useState<CommunityHeaderSlot | null>(null);
  // зачем (владелец 22.10: «Пик полноэкранным», без полосы над ним; схема eab9aa35d): со «Сценой» Пика вкладка рисует фон от верха экрана —
  // шапка отступает на зону часов сама; без «Сцены» (флаг выключен) оболочка отступает как раньше и здесь 0
  const topInset = useTabTopBleedInset();

  useEffect(() => {
    const fromParam = sectionFromParam(sectionParam);
    if (sectionParam !== undefined && !fromParam) console.warn('[COMMUNITY] section param ignored', { sectionParam });
    const next = fromParam ?? sectionFromPath(pathname);
    if (next) setSection(next);
  }, [pathname, sectionParam]);

  useEffect(() => {
    setVisited((prev) => (prev.has(section) ? prev : new Set([...prev, section])));
  }, [section]);

  // зачем (владелец 11.10): вход по ссылке ?section=spire, а Шпиль скрыт (флаг или интерфейс не ru/uk) — на Главную,
  // а не в «Друзей». Решаем после прогрева флага: до него «скрыт» ещё не значит «нельзя».
  const router = useRouter();
  useEffect(() => {
    if (sectionFromParam(sectionParam) !== 'spire') return undefined;
    let alive = true;
    void primeSpireTabFlag().then(() => {
      if (!alive || isSpireTabEnabled()) return;
      console.log('[SPIRE-GATE]', JSON.stringify({ where: 'community_link', action: 'redirect_home' }));
      router.replace('/(tabs)/home');
    });
    return () => { alive = false; };
  }, [router, sectionParam]);

  // зачем: замок погас (remote-ключ выключили или сменили язык на не ru/uk) при открытом «Шпиле» — к друзьям.
  useEffect(() => {
    if (!spireVisible && section === 'spire') setSection('friends');
  }, [spireVisible, section]);

  const segments = useMemo<readonly { key: Section; label: string }[]>(() => [
    ...(spireVisible ? [{ key: 'spire' as const, label: triLang(lang, { ru: 'Пик', uk: 'Пік', en: 'Peak', es: 'Pico', 'pt-BR': 'Pico', vi: 'Đỉnh', id: 'Puncak', tr: 'Zirve', pl: 'Szczyt' }) }] : []),
    // зачем: паритет с макетом community.html COM-01 — порядок «Шпиль · Друзья · Наборы».
    { key: 'friends', label: triLang(lang, { ru: 'Друзья', uk: 'Друзі', en: 'Friends', es: 'Amigos', 'pt-BR': 'Amigos', vi: 'Bạn bè', id: 'Teman', tr: 'Arkadaşlar', pl: 'Znajomi' }) },
    { key: 'packs', label: triLang(lang, { ru: 'Наборы', uk: 'Набори', en: 'Packs', es: 'Packs', 'pt-BR': 'Pacotes', vi: 'Bộ thẻ', id: 'Paket', tr: 'Paketler', pl: 'Zestawy' }) },
  ], [lang, spireVisible]);

  const tabVisible = runtimeOwnerId === 'community' || segments.some((s) => s.key === runtimeOwnerId);
  // зачем (владелец 11.10: «ШПИЛЬ НЕМЕДЛЕННО»): вкладка скрыта по кэшу рубильников (TTL 6 ч) — при входе в раздел один
  // принудительный перечит, не чаще раза в 60 секунд; включили на сервере → вкладка появляется без перезапуска.
  useEffect(() => {
    if (!tabVisible || spireVisible) return;
    void refreshSpireTabFlagIfClosed('community_focus');
  }, [spireVisible, tabVisible]);

  const renderSection = (key: Section) => {
    if (!visited.has(key) && key !== section) return null;
    const shown = key === section;
    const owner = tabVisible && shown ? key : 'community';
    let body: React.ReactNode;
    if (key === 'friends') { const Screen = loadFriends(); body = <Screen />; }
    else if (key === 'spire') { const Screen = loadSpire(); body = <Screen />; }
    else { const Screen = loadPacks(); body = <CommunityHeaderSlotProvider value={setPacksSlot}><Screen presentation="embedded" /></CommunityHeaderSlotProvider>; }
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
      <View style={[s.header, topInset > 0 ? { paddingTop: 12 + topInset } : null]}>
        {section === 'packs' && packsSlot?.overlay ? (
          // зачем (packs-simple.html кадр 2): открытый поиск «Наборов» встаёт на место строки вкладок.
          <View style={s.headerOverlay}>{packsSlot.overlay}</View>
        ) : (<>
        <View testID="community-sections" accessibilityRole="tablist" style={s.tabs}>
          {segments.map((seg) => {
            const on = seg.key === section;
            return (
              <Pressable
                key={seg.key}
                testID={`community-sections-${seg.key}`}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                // зачем: как у прежнего переключателя — отклик на нажатие только при смене вкладки.
                onPressIn={() => { if (!on) hapticTap(); }}
                onPress={() => setSection(seg.key)}
                hitSlop={{ top: 12, bottom: 6, left: 8, right: 8 }}
                // зачем (packs-simple.html `.tabs3`): активная вкладка — белый текст и полоса 3px акцента под словом.
                style={[s.tab, { borderBottomColor: on ? accentGfx.border : 'transparent' }]}
              >
                <Text style={[s.tabText, { color: on ? p.text : p.textSecondary }]}>{seg.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={s.headerRight}>{section === 'packs' ? packsSlot?.right : null}</View>
        </>)}
        {/* зачем (Пик v2, эталон peak-scene-v2.html; координатор 22.10): «Сцена» Пика уходит под вкладки — слой цвета сцены с белыми вкладками и энергией
            поверх этой шапки, гаснет при прокрутке Пика как маска Главной; флаг SPIRE_SCENE_V2_ENABLED выключен или вкладка не «Пик» — слоя нет */}
        <SpireSceneHeaderLayer onPeak={section === 'spire'} tabs={segments} active={section} styles={s} />
      </View>
      <View style={s.body}>
        {renderSection('friends')}
        {spireVisible ? renderSection('spire') : null}
        {renderSection('packs')}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  // зачем: строка packs-simple.html — вкладки слева, кнопки раздела справа, высота по круглой кнопке 42.
  header: { paddingHorizontal: V2.screenPad, paddingTop: 12, paddingBottom: 4, minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tabs: { flexDirection: 'row', alignItems: 'flex-end', gap: 22, marginTop: 6 },
  tab: { paddingBottom: 8, borderBottomWidth: 3 }, // shadow-ok: подчёркивание активной вкладки — индикатор выбора (цвет прозрачный у неактивной), не контейнер
  // зачем: макет 17/600; шкала D145 (решение владельца 04.10: при сверке главнее 16/13) — 16.
  tabText: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // зачем (ревью 11.10, макет community-redesign #c1 экран 2): поле поиска `.sf` высотой 52 обязано помещаться в слой
  // целиком. Слой — 52, а −5 сверху и снизу съедают его из полей шапки (12/4): высота строки остаётся 58, как со
  // вкладками, — открытие поиска не сдвигает список (первый кадр = итоговая геометрия), поле не вылезает за шапку.
  headerOverlay: { flex: 1, height: 52, marginVertical: -5, justifyContent: 'center' },
  body: { flex: 1, minHeight: 0 },
  // Скрытый раздел не рисуется, но сохраняет своё состояние и скролл.
  hidden: { display: 'none' },
});
