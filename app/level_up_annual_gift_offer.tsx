import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import BouncyScrollView from '../components/BouncyScrollView';
import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
import TapScale from '../components/TapScale';
import { useTheme } from '../components/ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import { safeRouterBack } from './navigation_back';
import { getLevelUpAnnualGiftOffer, loadSavedLevelUpAnnualGiftOffer, purchaseLevelUpAnnualGift, saveLevelUpAnnualGiftOffer, type LevelUpAnnualGiftOffer } from './level_up_annual_gift';
import { levelUpAnnualGiftArtForTheme } from './level_up_annual_gift_assets';

function remaining(expiresAtMs: number, nowMs: number): string {
  const seconds = Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000));
  return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function LevelUpAnnualGiftOfferScreen() {
  const router = useRouter();
  const { preview } = useLocalSearchParams<{ preview?: string | string[] }>();
  const isAdminPreview = preview === 'admin';
  const { theme: t, f, themeMode } = useTheme();
  const [offer, setOffer] = useState<LevelUpAnnualGiftOffer | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const saved = await loadSavedLevelUpAnnualGiftOffer();
    if (!saved) return;
    setOffer(saved);
    if (saved.preview || isAdminPreview) return;
    try {
      const current = await getLevelUpAnnualGiftOffer(saved.level);
      await saveLevelUpAnnualGiftOffer(current);
      setOffer(current);
    } catch { /* preserve server-issued local snapshot for offline viewing */ }
  }, [isAdminPreview]);

  useFocusEffect(useCallback(() => { void refresh(); return undefined; }, [refresh]));
  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const canPurchase = !isAdminPreview && !offer?.preview && !!offer && offer.offerExpiresAtMs > nowMs && (offer.state === 'available' || offer.state === 'trial_pending');
  const buy = async () => {
    if (!offer || !canPurchase || purchasing) return;
    hapticTap(); setPurchasing(true); setError(null);
    try { await purchaseLevelUpAnnualGift(offer); await refresh(); }
    catch { setError('Не удалось открыть оплату. Проверьте подключение и попробуйте ещё раз.'); }
    finally { setPurchasing(false); }
  };

  return (
    <ScreenGradient artBackdrop="levelGifts"><SafeAreaView style={{ flex: 1 }}><ContentWrap>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 }}>
        <TapScale onPress={() => safeRouterBack(router)} hitSlop={12}><Ionicons name="chevron-back" size={28} color={t.textPrimary} /></TapScale>
        <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', marginLeft: 8 }}>Подарок за уровень</Text>
      </View>
      <BouncyScrollView contentContainerStyle={{ padding: 16, paddingTop: 24, gap: 16 }}>
        <View style={{ backgroundColor: '#1A211E', borderRadius: 28, padding: 24, gap: 14, overflow: 'hidden' }}>
          <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 28, right: 28, height: 3, backgroundColor: '#D5FF4B' }} />
          <Image
            source={levelUpAnnualGiftArtForTheme(themeMode)}
            contentFit="contain"
            accessibilityLabel="Подарок за уровень"
            style={{ width: '100%', height: 172, marginBottom: -4 }}
          />
          <View style={{ width: 58, height: 58, borderRadius: 19, backgroundColor: 'rgba(213,255,75,0.13)', justifyContent: 'center', alignItems: 'center' }}><Ionicons name="gift-outline" size={30} color="#D5FF4B" /></View>
          <Text style={{ color: '#F4F7F4', fontSize: 27, lineHeight: 32, fontWeight: '900' }}>18 месяцев Premium{`\n`}за цену года</Text>
          <Text style={{ color: '#B6C0BA', fontSize: f.body, lineHeight: f.body + 7 }}>Только для этого уровня. Подарок добавится после первой успешной оплаты годового доступа.</Text>
          {isAdminPreview && <Text accessibilityRole="alert" style={{ color: '#D5FF4B', fontSize: f.caption, fontWeight: '900' }}>DEV-ПРЕДПРОСМОТР · оплата и бонус выключены</Text>}
          {offer ? <View style={{ alignSelf: 'flex-start', borderRadius: 999, backgroundColor: 'rgba(213,255,75,0.14)', paddingHorizontal: 13, paddingVertical: 8 }}><Text style={{ color: '#D5FF4B', fontWeight: '900' }}>Окно: {remaining(offer.offerExpiresAtMs, nowMs)}</Text></View> : <ActivityIndicator color="#D5FF4B" />}
        </View>
        <View style={{ backgroundColor: t.bgCard, borderRadius: 20, padding: 18, gap: 10 }}>
          <Text style={{ color: t.textPrimary, fontWeight: '900', fontSize: f.bodyLg }}>Как это работает</Text>
          <Text style={{ color: t.textMuted, fontSize: f.body, lineHeight: f.body + 7 }}>Оформите годовой доступ сейчас — после первой успешной оплаты к сроку доступа добавятся 6 месяцев. Подписка продлевается ежегодно, пока вы не отмените её.</Text>
        </View>
        {!!error && <Text accessibilityRole="alert" style={{ color: '#FF9CA3', textAlign: 'center', lineHeight: 20 }}>{error}</Text>}
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Оформить годовой доступ с подарком" disabled={!canPurchase || purchasing} onPress={buy} style={{ minHeight: 54, borderRadius: 18, backgroundColor: canPurchase ? '#D5FF4B' : '#536051', opacity: purchasing ? 0.72 : 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#07110A', fontSize: f.body, fontWeight: '900' }}>{purchasing ? 'Открываем оплату…' : isAdminPreview ? 'Предпросмотр — оплата выключена' : canPurchase ? 'Получить 18 месяцев' : 'Предложение завершено'}</Text>
        </TouchableOpacity>
      </BouncyScrollView>
    </ContentWrap></SafeAreaView></ScreenGradient>
  );
}
