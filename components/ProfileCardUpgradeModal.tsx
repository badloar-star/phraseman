import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { emitAppEvent } from '../app/events';
import { syncToCloud } from '../app/cloud_sync';
import { getShardsBalance } from '../app/shards_system';
import {
  canUseProfileCardMotion,
  canUseProfileCardPublicFocus,
  canUseProfileCardTheme,
  getProfileCardSnapshot,
  getNextProfileCardLevel,
  getProfileCardLevelDef,
  profileCardLevelRoman,
  PROFILE_CARD_MOTIONS,
  PROFILE_CARD_PUBLIC_FOCUSES,
  PROFILE_CARD_LEVELS,
  PROFILE_CARD_MAX_LEVEL,
  PROFILE_CARD_THEMES,
  ProfileCardLevel,
  ProfileCardMotion,
  ProfileCardPublicFocus,
  ProfileCardSnapshot,
  ProfileCardTheme,
  setProfileCardMotion,
  setProfileCardPublicFocus,
  setProfileCardTheme,
  upgradeProfileCardLevel,
} from '../app/profile_card_system';
import { triLang, type Lang } from '../constants/i18n';

const SHARD_ICON = require('../assets/images/levels/OSKOLOK.webp');

type Props = {
  visible: boolean;
  level: ProfileCardLevel;
  snapshot?: ProfileCardSnapshot;
  onClose: () => void;
  onUpgraded: (level: ProfileCardLevel) => void;
  onChanged?: (snapshot: ProfileCardSnapshot) => void;
};

const FALLBACK_SNAPSHOT: ProfileCardSnapshot = {
  level: 0,
  theme: 'classic',
  motion: 'none',
  publicFocus: 'balanced',
};

export default function ProfileCardUpgradeModal({ visible, level, snapshot, onClose, onUpgraded, onChanged }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const [shards, setShards] = useState(0);
  const [busy, setBusy] = useState(false);
  const [currentSnapshot, setCurrentSnapshot] = useState<ProfileCardSnapshot>(() => snapshot ?? { ...FALLBACK_SNAPSHOT, level });

  const currentLevel = currentSnapshot.level;
  const nextLevel = useMemo(() => getNextProfileCardLevel(currentLevel), [currentLevel]);
  const currentDef = getProfileCardLevelDef(currentLevel);
  const nextDef = nextLevel === null ? null : getProfileCardLevelDef(nextLevel);
  const progress = Math.max(0, Math.min(1, currentLevel / PROFILE_CARD_MAX_LEVEL));

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setCurrentSnapshot(snapshot ?? { ...FALLBACK_SNAPSHOT, level });
    getShardsBalance().then((balance) => {
      if (!cancelled) setShards(balance);
    }).catch(() => {});
    getProfileCardSnapshot().then((next) => {
      if (!cancelled) {
        setCurrentSnapshot(next);
      }
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [visible, level, snapshot]);

  const notify = useCallback((type: 'success' | 'error' | 'info', messageRu: string) => {
    emitAppEvent('action_toast', {
      type,
      messageRu,
      messageUk: messageRu,
      messageEs: messageRu,
    });
  }, []);

  const handleUpgrade = useCallback(async () => {
    if (busy || !nextDef) return;
    setBusy(true);
    try {
      const result = await upgradeProfileCardLevel();
      if (result.ok) {
        setShards(result.balance);
        const nextSnapshot = await getProfileCardSnapshot();
        setCurrentSnapshot(nextSnapshot);
        onUpgraded(result.level);
        onChanged?.(nextSnapshot);
        void syncToCloud({ forceNow: true });
        notify('success', `Карточка улучшена до ${profileCardLevelRoman(result.level)}`);
        return;
      }
      if (result.reason === 'insufficient') {
        onClose();
        router.push({
          pathname: '/shards_shop',
          params: {
            need: String(Math.max(0, result.need ?? nextDef.cost - shards)),
            source: 'profile_card_upgrade',
          },
        } as any);
        return;
      }
      notify('error', 'Не удалось улучшить карточку');
    } finally {
      setBusy(false);
    }
  }, [busy, nextDef, notify, onChanged, onClose, onUpgraded, router, shards]);

  const applyTheme = useCallback(async (theme: ProfileCardTheme) => {
    if (busy || !canUseProfileCardTheme(currentLevel, theme) || currentSnapshot.theme === theme) return;
    setBusy(true);
    try {
      const next = await setProfileCardTheme(theme);
      setCurrentSnapshot(next);
      onChanged?.(next);
      void syncToCloud({ forceNow: true });
      notify('info', 'Стиль карточки обновлен');
    } catch {
      notify('error', 'Этот стиль пока закрыт');
    } finally {
      setBusy(false);
    }
  }, [busy, currentLevel, currentSnapshot.theme, notify, onChanged]);

  const applyMotion = useCallback(async (motion: ProfileCardMotion) => {
    if (busy || !canUseProfileCardMotion(currentLevel, motion) || currentSnapshot.motion === motion) return;
    setBusy(true);
    try {
      const next = await setProfileCardMotion(motion);
      setCurrentSnapshot(next);
      onChanged?.(next);
      void syncToCloud({ forceNow: true });
      notify('info', 'Анимация карточки обновлена');
    } catch {
      notify('error', 'Эта анимация пока закрыта');
    } finally {
      setBusy(false);
    }
  }, [busy, currentLevel, currentSnapshot.motion, notify, onChanged]);

  const applyPublicFocus = useCallback(async (focus: ProfileCardPublicFocus) => {
    if (busy || !canUseProfileCardPublicFocus(currentLevel, focus) || currentSnapshot.publicFocus === focus) return;
    setBusy(true);
    try {
      const next = await setProfileCardPublicFocus(focus);
      setCurrentSnapshot(next);
      onChanged?.(next);
      void syncToCloud({ forceNow: true });
      notify('info', 'Публичный фокус карточки обновлен');
    } catch {
      notify('error', 'Этот фокус пока закрыт');
    } finally {
      setBusy(false);
    }
  }, [busy, currentLevel, currentSnapshot.publicFocus, notify, onChanged]);

  const renderSectionTitle = (title: string, lockedAt?: ProfileCardLevel) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 8 }}>
      <Text style={{ color: t.textPrimary, fontSize: f.label, fontWeight: '900' }}>{title}</Text>
      {lockedAt && currentLevel < lockedAt ? (
        <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '800' }}>
          {triLang(lang as Lang, { ru: `CARD ${profileCardLevelRoman(lockedAt)}`, uk: `CARD ${profileCardLevelRoman(lockedAt)}`, es: `CARD ${profileCardLevelRoman(lockedAt)}` })}
        </Text>
      ) : null}
    </View>
  );

  const choiceCardStyle = (selected: boolean, locked: boolean, accent: string) => ({
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 9,
    borderRadius: 14,
    borderWidth: selected ? 1.5 : 1,
    borderColor: selected ? accent : locked ? 'rgba(148,163,184,0.22)' : t.border,
    backgroundColor: selected ? `${accent}1A` : locked ? 'rgba(148,163,184,0.06)' : t.bgSurface,
    paddingHorizontal: 11,
    paddingVertical: 10,
    marginBottom: 8,
    opacity: locked ? 0.55 : 1,
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable
          testID="profile-card-upgrade-modal"
          style={{
            backgroundColor: t.bgCard,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 18,
            paddingBottom: insets.bottom + 18,
            borderTopWidth: 1,
            borderColor: t.border,
          }}
        >
          <View style={{ width: 42, height: 4, borderRadius: 2, backgroundColor: t.border, alignSelf: 'center', marginBottom: 16 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900' }}>
                {triLang(lang as Lang, { ru: 'Улучшить карточку', uk: 'Покращити картку', es: 'Mejorar tarjeta' })}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 3, lineHeight: 18 }}>
                {triLang(lang as Lang, {
                  ru: 'Внешний статус, анимации и больше публичной информации.',
                  uk: 'Зовнішній статус, анімації та більше публічної інформації.',
                  es: 'Estado visual, animaciones y más información pública.',
                })}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.bgSurface, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 7 }}>
              <Text style={{ color: '#A78BFA', fontSize: f.body, fontWeight: '900' }}>{shards}</Text>
              <Image source={SHARD_ICON} style={{ width: 18, height: 18 }} resizeMode="contain" />
            </View>
          </View>

          <View style={{ borderRadius: 18, borderWidth: 1, borderColor: 'rgba(250,204,21,0.36)', backgroundColor: 'rgba(250,204,21,0.08)', padding: 14, marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '800' }}>
                  {triLang(lang as Lang, { ru: 'Текущий уровень', uk: 'Поточний рівень', es: 'Nivel actual' })}
                </Text>
                <Text testID="profile-card-current-level-label" style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '900', marginTop: 2 }}>
                  {currentDef.name} {currentLevel > 0 ? profileCardLevelRoman(currentLevel) : ''}
                </Text>
              </View>
              <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: '#111827', borderWidth: 1, borderColor: '#FACC15', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#FACC15', fontSize: f.body, fontWeight: '900' }}>
                  {currentLevel > 0 ? profileCardLevelRoman(currentLevel) : '0'}
                </Text>
              </View>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.10)', marginTop: 12, overflow: 'hidden' }}>
              <View style={{ width: `${progress * 100}%`, height: '100%', borderRadius: 4, backgroundColor: '#FACC15' }} />
            </View>
          </View>

          <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
            {renderSectionTitle(triLang(lang as Lang, { ru: 'Стиль карточки', uk: 'Стиль картки', es: 'Estilo de tarjeta' }), 2)}
            {PROFILE_CARD_THEMES.map((item) => {
              const selected = currentSnapshot.theme === item.id;
              const locked = !canUseProfileCardTheme(currentLevel, item.id);
              const accent = item.id === 'gold' ? '#FACC15' : item.id === 'crystal' ? '#67E8F9' : item.id === 'ember' ? '#FB7185' : item.id === 'aurora' ? '#A78BFA' : '#94A3B8';
              return (
                <TouchableOpacity
                  testID={`profile-card-theme-${item.id}`}
                  key={item.id}
                  activeOpacity={0.82}
                  disabled={busy || locked}
                  onPress={() => applyTheme(item.id)}
                  style={choiceCardStyle(selected, locked, accent)}
                >
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: `${accent}26`, borderWidth: 1, borderColor: accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={locked ? 'lock-closed' : selected ? 'checkmark' : 'sparkles'} size={13} color={accent} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '900' }}>{item.name}</Text>
                    <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 1 }} numberOfLines={2}>
                      {triLang(lang as Lang, { ru: item.descriptionRu, uk: item.descriptionUk, es: item.descriptionEs })}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {renderSectionTitle(triLang(lang as Lang, { ru: 'Движение', uk: 'Рух', es: 'Movimiento' }), 3)}
            {PROFILE_CARD_MOTIONS.map((item) => {
              const selected = currentSnapshot.motion === item.id;
              const locked = !canUseProfileCardMotion(currentLevel, item.id);
              const accent = item.id === 'elite' ? '#FACC15' : item.id === 'particles' ? '#A78BFA' : item.id === 'pulse' ? '#22D3EE' : item.id === 'gleam' ? '#FBBF24' : '#94A3B8';
              return (
                <TouchableOpacity
                  testID={`profile-card-motion-${item.id}`}
                  key={item.id}
                  activeOpacity={0.82}
                  disabled={busy || locked}
                  onPress={() => applyMotion(item.id)}
                  style={choiceCardStyle(selected, locked, accent)}
                >
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: `${accent}26`, borderWidth: 1, borderColor: accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={locked ? 'lock-closed' : selected ? 'checkmark' : 'radio-button-on'} size={13} color={accent} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '900' }}>{item.name}</Text>
                    <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 1 }} numberOfLines={2}>
                      {triLang(lang as Lang, { ru: item.descriptionRu, uk: item.descriptionUk, es: item.descriptionEs })}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {renderSectionTitle(triLang(lang as Lang, { ru: 'Публичный акцент', uk: 'Публічний акцент', es: 'Enfoque público' }), 4)}
            {PROFILE_CARD_PUBLIC_FOCUSES.map((item) => {
              const selected = currentSnapshot.publicFocus === item.id;
              const locked = !canUseProfileCardPublicFocus(currentLevel, item.id);
              const accent = item.id === 'arena' ? '#EF4444' : item.id === 'streak' ? '#F97316' : item.id === 'league' ? '#22C55E' : item.id === 'xp' ? '#60A5FA' : '#FACC15';
              return (
                <TouchableOpacity
                  testID={`profile-card-focus-${item.id}`}
                  key={item.id}
                  activeOpacity={0.82}
                  disabled={busy || locked}
                  onPress={() => applyPublicFocus(item.id)}
                  style={choiceCardStyle(selected, locked, accent)}
                >
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: `${accent}26`, borderWidth: 1, borderColor: accent, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={locked ? 'lock-closed' : selected ? 'checkmark' : 'eye'} size={13} color={accent} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '900' }}>{item.name}</Text>
                    <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 1 }} numberOfLines={2}>
                      {triLang(lang as Lang, { ru: item.descriptionRu, uk: item.descriptionUk, es: item.descriptionEs })}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {renderSectionTitle(triLang(lang as Lang, { ru: 'Лестница уровней', uk: 'Сходи рівнів', es: 'Ruta de niveles' }))}
            {PROFILE_CARD_LEVELS.slice(1).map((item) => {
              const unlocked = currentLevel >= item.level;
              const target = nextLevel === item.level;
              return (
                <View
                  key={item.level}
                  style={{
                    flexDirection: 'row',
                    gap: 10,
                    borderRadius: 16,
                    borderWidth: target ? 1.5 : 1,
                    borderColor: target ? '#FACC15' : t.border,
                    backgroundColor: unlocked ? 'rgba(34,197,94,0.08)' : target ? 'rgba(250,204,21,0.08)' : t.bgSurface,
                    padding: 12,
                    marginBottom: 8,
                  }}
                >
                  <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: unlocked ? 'rgba(34,197,94,0.20)' : 'rgba(255,255,255,0.07)' }}>
                    <Ionicons name={unlocked ? 'checkmark' : target ? 'sparkles' : 'lock-closed'} size={18} color={unlocked ? '#22C55E' : target ? '#FACC15' : t.textMuted} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                      <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '900' }}>
                        {profileCardLevelRoman(item.level)} · {item.name}
                      </Text>
                      {!unlocked && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '900' }}>{item.cost}</Text>
                          <Image source={SHARD_ICON} style={{ width: 14, height: 14 }} resizeMode="contain" />
                        </View>
                      )}
                    </View>
                    <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 3, lineHeight: 17 }}>
                      {triLang(lang as Lang, { ru: item.unlockRu, uk: item.unlockUk, es: item.unlockEs })}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            testID="profile-card-upgrade-submit"
            activeOpacity={0.86}
            disabled={busy || !nextDef}
            onPress={handleUpgrade}
            style={{
              marginTop: 14,
              borderRadius: 16,
              paddingVertical: 14,
              alignItems: 'center',
              backgroundColor: !nextDef ? t.textGhost : '#FACC15',
              opacity: busy ? 0.68 : 1,
            }}
          >
            <Text style={{ color: '#111827', fontSize: f.bodyLg, fontWeight: '900' }}>
              {nextDef
                ? triLang(lang as Lang, {
                    ru: `Улучшить за ${nextDef.cost}`,
                    uk: `Покращити за ${nextDef.cost}`,
                    es: `Mejorar por ${nextDef.cost}`,
                  })
                : triLang(lang as Lang, { ru: 'Максимальный уровень', uk: 'Максимальний рівень', es: 'Nivel máximo' })}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
