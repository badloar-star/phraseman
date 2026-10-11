// Экран «Уведомления»: мастер-тумблер + выбор категорий + одно время напоминания.
// зачем: владелец попросил дать юзеру выбор, КАКИЕ уведомления получать. Раньше
// экран управлял только расписанием типа 'reminder' (7 дней × время), а остальные
// ~12 типов не имели выключателя. Матрица дней заменена одним временем на все дни
// (решение владельца от 2026-07-26), категории гейтятся в app/notifications.ts.
// Визуальный слой следует профилю Liquid Glass; логика расписания и разрешений
// остаётся изолированной от презентации.
import { switchTrackBorder } from '../components/settings/switch_chrome';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import DuoPressable from '../components/DuoPressable';
import { View, Text, Modal, ScrollView, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent, type StyleProp, type ViewStyle } from 'react-native';
import { FlowText } from '../components/text-integrity/FlowText';
import { useRouter, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
import BouncyScrollView from '../components/BouncyScrollView';
import PressableHybrid from '../components/PressableHybrid';
import { hapticTap } from '../hooks/use-haptics';
import {
  NotifSettings, NotifPrefs, NotifCategory,
  loadNotifSettings, saveNotifSettings, scheduleNotifications,
  getNotifSettingsSnapshot, getNotifPrefsSnapshot,
  hydrateNotifPrefsFromStorage, saveNotifPrefs, applyNotifPrefsSideEffects,
  isNotificationPermissionGranted, requestNotificationPermissionWithFallback,
} from './notifications';
import { triLang, type Lang } from '../constants/i18n';
import { safeRouterBack } from './navigation_back';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { LinearGradient } from '../components/SafeLinearGradient';

import { swallowError } from './debug-logger';
const HOURS   = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const VISIBLE = 3;
const TIME_MODAL_PANEL_RADIUS = 26;
const TIME_MODAL_TITLE_SIZE = 25;
const pad     = (n: number) => String(n).padStart(2, '0');

function SimplePicker({ values, value, onChange }: {
  values: number[]; value: number; onChange: (v: number) => void;
}) {
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const { fontScale } = useWindowDimensions();
  const itemHeight = Math.max(48, Math.ceil(36 * fontScale + 12));
  const padHeight = itemHeight;
  const ref   = useRef<ScrollView | null>(null);
  const yRef  = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const idx = values.indexOf(value);
    const resetTimer = setTimeout(() => ref.current?.scrollTo({ y: Math.max(0, idx) * itemHeight, animated: false }), 80);
    return () => clearTimeout(resetTimer);
  }, [itemHeight, value, values]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const snapNow = useCallback(() => {
    const idx = Math.round(yRef.current / itemHeight);
    const c   = Math.max(0, Math.min(idx, values.length - 1));
    ref.current?.scrollTo({ y: c * itemHeight, animated: true });
    onChange(values[c]);
  }, [itemHeight, values, onChange]);

  return (
    <View style={{ width: 88, height: itemHeight * VISIBLE, overflow: 'hidden' }}>
      <View pointerEvents="none" style={{ position:'absolute', zIndex:0, top:padHeight, left:5, right:5, height:itemHeight, borderRadius:12, backgroundColor:glass.selected }}/>
      <View pointerEvents="none" style={{ position:'absolute', zIndex:3, top:padHeight, left:6, right:6, height:itemHeight, borderTopWidth:1.5, borderBottomWidth:1.5, borderColor:glass.glassEdge }}/>{/* guard-ok: не обводка контейнера — верх/низ рамки текущего часа/минуты в колёсике */}
      <View pointerEvents="none" style={{ position:'absolute', zIndex:2, top:0, left:0, right:0, height:padHeight, backgroundColor:glass.sheet, opacity:0.65 }}/>
      <View pointerEvents="none" style={{ position:'absolute', zIndex:2, bottom:0, left:0, right:0, height:padHeight, backgroundColor:glass.sheet, opacity:0.65 }}/>
      <BouncyScrollView
        ref={ref}
        nestedScrollEnabled
        style={{ zIndex:1 }}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: padHeight }}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => { yRef.current = e.nativeEvent.contentOffset.y; }}
        onScrollEndDrag={() => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(snapNow, 80); }}
        onMomentumScrollBegin={() => { if (timer.current) clearTimeout(timer.current); }}
        onMomentumScrollEnd={snapNow}
      >
        {values.map((v) => {
          const distance = Math.abs(values.indexOf(v) - values.indexOf(value));
          return (
          <View key={v} style={{ height: itemHeight, justifyContent:'center', alignItems:'center' }}>
            <Text style={{ fontSize: v === value ? 27 : distance === 1 ? 16 : 16, lineHeight: v === value ? 32 : 20, fontWeight: v === value ? '700' : '400', color: v === value ? glass.text : distance === 1 ? glass.secondary : glass.mutedText }}>{pad(v)}</Text>
          </View>
          );
        })}
      </BouncyScrollView>
    </View>
  );
}

function TimeModal({ visible, hour, minute, timeTitle, cancelLabel, onConfirm, onCancel }: {
  visible: boolean; hour: number; minute: number; timeTitle: string; cancelLabel: string;
  onConfirm: (h: number, m: number) => void;
  onCancel: () => void;
}) {
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const insets = useStableSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [h, setH] = useState(hour);
  const [m, setM] = useState(minute);
  useEffect(() => { if (visible) { setH(hour); setM(minute); } }, [hour, minute, visible]);
  if (!visible) return null;
  return (
    <Modal visible transparent animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={onCancel}>
      <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.55)', justifyContent:'center', alignItems:'center', paddingTop:Math.max(20, insets.top), paddingBottom:Math.max(20, insets.bottom), paddingHorizontal:20 }}>{/* theme-exempt: затемнение под окном — чёрное в любой теме */}
        <LinearGradient colors={[glass.opaqueSheet, glass.opaqueSheet]} style={{ width:'100%', maxWidth:340, maxHeight:'100%', borderRadius:TIME_MODAL_PANEL_RADIUS, overflow:'hidden', borderWidth:1, borderColor:glass.glassEdge }}>
          <View pointerEvents="none" style={{ position:'absolute', inset:0 }}>
            <View style={{ position:'absolute', inset:0, backgroundColor:glass.sheet }}/>
            <LinearGradient colors={[glass.selected, 'transparent']} start={{ x:0.04, y:0 }} end={{ x:0.9, y:1 }} style={{ position:'absolute', inset:0 }}/>
          </View>
          <ScrollView nestedScrollEnabled style={{ flexShrink:1, minHeight:0 }} contentContainerStyle={{ flexGrow:1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false} decelerationRate="fast">
            <View style={{ paddingHorizontal:21, paddingTop:21, paddingBottom:18, alignItems:'center' }}>
              <Text style={{ color:glass.text, fontSize:TIME_MODAL_TITLE_SIZE, lineHeight:31, fontWeight:'700', textAlign:'center' }}>{timeTitle}</Text>
            </View>
            <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', paddingVertical:18, paddingHorizontal:28, backgroundColor:glass.opaqueControl }}>
              <SimplePicker values={HOURS}   value={h} onChange={setH}/>
              <Text style={{ color:glass.text, fontSize:30, fontWeight:'300', width:28, textAlign:'center' }}>:</Text>
              <SimplePicker values={MINUTES} value={m} onChange={setM}/>
            </View>
          </ScrollView>
          <View style={{ flexDirection:'row', gap:10, paddingHorizontal:21, paddingTop:16, paddingBottom:21 }}>
            <DuoPressable wrapStyle={{ flex:1 }} style={{ minHeight:48, borderRadius:24, backgroundColor:'transparent', borderWidth:1, borderColor:glass.glassEdge }} onPress={onCancel}>
              <Text style={{ color:glass.text, fontSize:16, fontWeight:'700' }}>{cancelLabel}</Text>
            </DuoPressable>
            <DuoPressable wrapStyle={{ flex:1 }} style={{ minHeight:48, borderRadius:24, backgroundColor:glass.accent }} onPress={() => onConfirm(h, m)}>
              <Text style={{ color:glass.accentInk, fontSize:16, fontWeight:'700' }}>OK</Text>
            </DuoPressable>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

type LocalSwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
  glass: ReturnType<typeof liquidGlassTokens>;
};

function LocalSwitch({ value, onValueChange, accessibilityLabel, disabled = false, glass }: LocalSwitchProps) {
  return (
    <PressableHybrid
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => { hapticTap(); onValueChange(!value); }}
      withHaptic={false}
      withSound={false}
      variant="chip"
      style={{ width: 48, minWidth: 48, minHeight: 48, alignSelf: 'center' }}
      contentStyle={{ width: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' }}
    >
      <View style={{ width: 48, height: 29, borderRadius: 16, padding: 3, justifyContent: 'center', backgroundColor: value ? glass.selected : glass.opaqueControl, borderWidth: 1, borderColor: switchTrackBorder(glass) }}>
        <View style={{ width: 21, height: 21, borderRadius: 11, backgroundColor: value ? glass.lightTint : glass.secondary, transform: [{ translateX: value ? 19 : 0 }] }} />
      </View>
    </PressableHybrid>
  );
}

function RowIcon({ name, glass }: { name: keyof typeof Ionicons.glyphMap; glass: ReturnType<typeof liquidGlassTokens> }) {
  return (
    <View style={{ width: 41, height: 41, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: glass.opaqueControl, borderWidth: 1, borderColor: glass.glassEdge }}>
      <Ionicons name={name} size={20} color={glass.lightTint} />
    </View>
  );
}

function ToggleRow({ label, icon, value, onValueChange, disabled, glass, titleColor, rowStyle }: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled: boolean;
  glass: ReturnType<typeof liquidGlassTokens>;
  titleColor: string;
  rowStyle: StyleProp<ViewStyle>;
}) {
  return (
    <View style={rowStyle}>
      <LinearGradient pointerEvents="none" colors={[glass.selected, 'transparent']} style={{ position: 'absolute', inset: 0 }} />
      <RowIcon name={icon} glass={glass} />
      <FlowText testID="notif-toggle-label" provenance="authored" style={{ color: titleColor, fontSize: 16, lineHeight: 21, fontWeight: '700', flex: 1, minWidth: 0 }}>
        {label}
      </FlowText>
      <LocalSwitch value={value} onValueChange={onValueChange} accessibilityLabel={label} disabled={disabled} glass={glass} />
    </View>
  );
}

/** Первое включённое время расписания (для строки «Время»), иначе 19:00. */
function scheduleTime(s: NotifSettings): { hour: number; minute: number } {
  const enabled = Object.values(s.schedule).find(d => d.enabled);
  const any = enabled ?? s.schedule[0];
  return { hour: any?.hour ?? 19, minute: any?.minute ?? 0 };
}

function scheduleAnyEnabled(s: NotifSettings): boolean {
  return Object.values(s.schedule).some(d => d.enabled);
}

export default function SettingsNotifications() {
  const router = useRouter();
  const { theme: t, liquidGlassThemeId } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const insets = useStableSafeAreaInsets();
  const glass = liquidGlassTokens(liquidGlassThemeId);

  const [prefs, setPrefs] = useState<NotifPrefs>(() => getNotifPrefsSnapshot());
  const [s, setS]         = useState<NotifSettings>(() => getNotifSettingsSnapshot());
  const [saved, setSaved] = useState(false);
  // Разрешение на уведомления отсутствует → честно показываем это и ведём в настройки.
  const [needsPermission, setNeedsPermission] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);

  const prefsRef = useRef(prefs); prefsRef.current = prefs;
  const sRef = useRef(s); sRef.current = s;

  useFocusEffect(
    useCallback(() => {
      void loadNotifSettings().then(setS);
      void hydrateNotifPrefsFromStorage().then(setPrefs);
    }, [])
  );

  const flashSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 1400); };

  // Общий хвост: сохранение фоном, проверка разрешения при включении, откат при ошибке.
  const ensurePermissionIfEnabling = async (enabling: boolean): Promise<boolean> => {
    if (!enabling) { setNeedsPermission(false); return true; }
    if (await isNotificationPermissionGranted()) { setNeedsPermission(false); return true; }
    const res = await requestNotificationPermissionWithFallback();
    if (!res.granted) { setSaved(false); setNeedsPermission(true); return false; }
    setNeedsPermission(false);
    return true;
  };

  const persistPrefs = async (next: NotifPrefs, enabling: boolean) => {
    const prevPrefs = prefsRef.current;
    // Optimistic: тумблер реагирует мгновенно, сеть и планирование догоняют фоном.
    setPrefs(next);
    flashSaved();
    try {
      await saveNotifPrefs(next);
      const permitted = await ensurePermissionIfEnabling(enabling);
      await applyNotifPrefsSideEffects(next, lang as Lang, { studyTarget });
      // Мастер включили обратно — вернём и ежедневное напоминание, если оно было включено.
      if (permitted && next.master && scheduleAnyEnabled(sRef.current)) {
        scheduleNotifications(sRef.current, lang as Lang, 0, { requestPermission: false, studyTarget }).catch(swallowError('settings_notifications:persistPrefs'));
      }
    } catch {
      setPrefs(prevPrefs);
      setSaved(false);
    }
  };

  const persistSchedule = async (next: NotifSettings, enabling: boolean) => {
    const prevS = sRef.current;
    setS(next);
    flashSaved();
    try {
      await saveNotifSettings(next);
      const permitted = await ensurePermissionIfEnabling(enabling);
      if (!permitted) return;
      await scheduleNotifications(next, lang as Lang, 0, { requestPermission: false, studyTarget });
    } catch {
      setS(prevS);
      setSaved(false);
    }
  };

  const toggleMaster = (v: boolean) => {
    void persistPrefs({ ...prefsRef.current, categories: { ...prefsRef.current.categories }, master: v }, v);
  };

  const toggleCategory = (cat: NotifCategory) => (v: boolean) => {
    const cur = prefsRef.current;
    void persistPrefs({ ...cur, categories: { ...cur.categories, [cat]: v } }, v);
  };

  const toggleDaily = (v: boolean) => {
    const cur = sRef.current;
    const { hour, minute } = scheduleTime(cur);
    const schedule = Object.fromEntries(
      Array.from({ length: 7 }, (_, d) => [d, { enabled: v, hour, minute }])
    );
    void persistSchedule({ ...cur, schedule }, v);
  };

  const confirmTime = (h: number, m: number) => {
    setTimeOpen(false);
    const cur = sRef.current;
    const schedule = Object.fromEntries(
      Object.entries(cur.schedule).map(([d, day]) => [d, { ...day, hour: h, minute: m }])
    );
    void persistSchedule({ ...cur, schedule }, scheduleAnyEnabled(cur));
  };

  const L = (copy: Record<Lang, string>) => triLang(lang as Lang, copy);

  const screenTitle = L({ ru:'Уведомления', uk:'Сповіщення', en:'Notifications', es:'Notificaciones', 'pt-BR':'Notificações', vi:'Thông báo', id:'Notifikasi', tr:'Bildirimler', pl:'Powiadomienia' });
  const masterLabel = L({ ru:'Разрешить уведомления', uk:'Дозволити сповіщення', en:'Allow notifications', es:'Permitir notificaciones', 'pt-BR':'Permitir notificações', vi:'Cho phép thông báo', id:'Izinkan notifikasi', tr:'Bildirimlere izin ver', pl:'Zezwól na powiadomienia' });
  const masterHint = L({ ru:'Системное разрешение телефона тоже должно быть включено.', uk:'Системний дозвіл телефона теж має бути ввімкнено.', en:'System notification permission must also be enabled on your phone.', es:'El permiso del sistema del teléfono también debe estar activado.', 'pt-BR':'A permissão do sistema do telefone também deve estar ativada.', vi:'Quyền thông báo hệ thống trên điện thoại cũng phải được bật.', id:'Izin notifikasi sistem di ponsel juga harus diaktifkan.', tr:'Telefonun sistem bildirim izni de açık olmalıdır.', pl:'Systemowe uprawnienie telefonu do powiadomień też musi być włączone.' });
  const backLabel = L({ ru:'Назад', uk:'Назад', en:'Back', es:'Atrás', 'pt-BR':'Voltar', vi:'Quay lại', id:'Kembali', tr:'Geri', pl:'Wstecz' });
  const sectionStudy = L({ ru:'Занятия', uk:'Заняття', en:'Study', es:'Estudio', 'pt-BR':'Estudos', vi:'Học tập', id:'Belajar', tr:'Çalışma', pl:'Nauka' });
  const dailyLabel = L({ ru:'Ежедневное напоминание', uk:'Щоденне нагадування', en:'Daily reminder', es:'Recordatorio diario', 'pt-BR':'Lembrete diário', vi:'Nhắc nhở hằng ngày', id:'Pengingat harian', tr:'Günlük hatırlatıcı', pl:'Codzienne przypomnienie' });
  const timeLabel = L({ ru:'Время', uk:'Час', en:'Time', es:'Hora', 'pt-BR':'Horário', vi:'Thời gian', id:'Waktu', tr:'Saat', pl:'Godzina' });
  const streakLabel = L({ ru:'Серия под угрозой', uk:'Серія під загрозою', en:'Streak at risk', es:'Racha en riesgo', 'pt-BR':'Sequência em risco', vi:'Chuỗi gặp nguy', id:'Streak terancam', tr:'Seri risk altında', pl:'Seria zagrożona' });
  const phraseLabel = L({ ru:'Фраза дня', uk:'Фраза дня', en:'Phrase of the day', es:'Frase del día', 'pt-BR':'Frase do dia', vi:'Cụm từ hôm nay', id:'Frasa hari ini', tr:'Günün ifadesi', pl:'Zwrot dnia' });
  const energyLabel = L({ ru:'Энергия восстановилась', uk:'Енергію відновлено', en:'Energy restored', es:'Energía recargada', 'pt-BR':'Energia recarregada', vi:'Năng lượng đã hồi', id:'Energi pulih', tr:'Enerji doldu', pl:'Energia odnowiona' });
  const sectionRecaps = L({ ru:'Итоги', uk:'Підсумки', en:'Recaps', es:'Resúmenes', 'pt-BR':'Resumos', vi:'Tổng kết', id:'Ringkasan', tr:'Özetler', pl:'Podsumowania' });
  const weeklyLabel = L({ ru:'Итоги недели', uk:'Підсумки тижня', en:'Weekly recap', es:'Resumen semanal', 'pt-BR':'Resumo da semana', vi:'Tổng kết tuần', id:'Ringkasan mingguan', tr:'Haftalık özet', pl:'Podsumowanie tygodnia' });
  const monthlyLabel = L({ ru:'Итоги месяца', uk:'Підсумки місяця', en:'Monthly recap', es:'Resumen mensual', 'pt-BR':'Resumo do mês', vi:'Tổng kết tháng', id:'Ringkasan bulanan', tr:'Aylık özet', pl:'Podsumowanie miesiąca' });
  const sectionMore = L({ ru:'Ещё', uk:'Ще', en:'More', es:'Más', 'pt-BR':'Mais', vi:'Khác', id:'Lainnya', tr:'Diğer', pl:'Więcej' });
  // «Вместе»: пуш «Позвал(а)» от друга — отдельная категория (владелец, 2026-08-16).
  const friendsLabel = L({ ru:'Друзья', uk:'Друзі', en:'Friends', es:'Amigos', 'pt-BR':'Amigos', vi:'Bạn bè', id:'Teman', tr:'Arkadaşlar', pl:'Znajomi' });
  const offersLabel = L({ ru:'Скидки и предложения', uk:'Знижки та пропозиції', en:'Discounts and offers', es:'Descuentos y ofertas', 'pt-BR':'Descontos e ofertas', vi:'Giảm giá và ưu đãi', id:'Diskon dan penawaran', tr:'İndirimler ve teklifler', pl:'Zniżki i oferty' });
  const savedLabel = L({ ru:'Сохранено', uk:'Збережено', en:'Saved', es:'Guardado', 'pt-BR':'Salvo', vi:'Đã lưu', id:'Tersimpan', tr:'Kaydedildi', pl:'Zapisano' });
  const cancelLabel = L({ ru:'Отмена', uk:'Скасувати', en:'Cancel', es:'Cancelar', 'pt-BR':'Cancelar', vi:'Hủy', id:'Batal', tr:'İptal', pl:'Anuluj' });
  const permissionLabel = L({
    ru:'Телефон не разрешает уведомления. Проверь разрешение в настройках телефона — переключателя в приложении недостаточно.',
    uk:'Телефон не дозволяє сповіщення. Перевір дозвіл у налаштуваннях телефона — перемикача в застосунку недостатньо.',
    en:'Your phone is blocking notifications. Check permission in phone settings — the in-app switch alone is not enough.',
    es:'El teléfono bloquea las notificaciones. Revisa el permiso en sus ajustes: el interruptor de la app no basta.',
    'pt-BR':'O telefone bloqueia as notificações. Confira a permissão nos ajustes do telefone — só o botão do app não basta.',
    vi:'Điện thoại đang chặn thông báo. Hãy kiểm tra quyền trong cài đặt điện thoại — bật trong ứng dụng thôi chưa đủ.',
    id:'Ponsel memblokir notifikasi. Periksa izin di pengaturan ponsel — tombol dalam aplikasi saja belum cukup.',
    tr:'Telefonun bildirimleri engelliyor. Telefon ayarlarından izni kontrol et — uygulamadaki düğme tek başına yeterli değil.',
    pl:'Telefon blokuje powiadomienia. Sprawdź uprawnienie w ustawieniach telefonu — sam przełącznik w aplikacji nie wystarczy.',
  });

  const dailyEnabled = scheduleAnyEnabled(s);
  const { hour, minute } = scheduleTime(s);
  const master = prefs.master;
  const timeRowActive = master && dailyEnabled;

  // зачем: паритет с макетом profile.html PRF-04 — заголовок секции как eyebrow (SettingsGlassEyebrow: secondary, 1.7)
  const sectionTitleStyle = { color: glass.secondary, fontSize: 13, lineHeight: 18, fontWeight: '700' as const, letterSpacing: 1.7, marginTop: 24, marginHorizontal: 4, marginBottom: 10 };
  const statusCardStyle = { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, gap: 12, flexDirection: 'row' as const, alignItems: 'flex-start' as const, backgroundColor: glass.opaqueCard, borderWidth: 1, borderColor: glass.glassEdge, overflow: 'hidden' as const };
  const rowStyle = { minHeight: 64, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, gap: 14, flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: glass.opaqueCard, borderWidth: 1, borderColor: glass.glassEdge, overflow: 'hidden' as const };

  return (
    <ScreenGradient>
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }}>
        <ContentWrap>
          <BouncyScrollView decelerationRate="fast" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <PressableHybrid
                accessibilityLabel={backLabel}
                accessibilityRole="button"
        onPress={() => {
          hapticTap();
          // Экран открывается из вкладки «Настройки» — возвращаемся на settings, не на home.
          safeRouterBack(router, '/(tabs)/settings' as any);
        }}
                withHaptic={false}
                withSound={false}
                variant="icon"
                style={{ width: 48, height: 44, alignSelf: 'flex-start', marginTop: 4 }}
                // зачем (profile.html `.rb.bare`): «назад» — голый шеврон слева, без круга и кромки; область нажатия 48×44.
                contentStyle={{ width: 48, height: 44, alignItems: 'flex-start', justifyContent: 'center' }}
              >
                {/* зачем: паритет с макетом profile.html — иконка «назад» это шеврон (kit.js back) */}
              <Ionicons name="chevron-back" size={21} color={glass.text} />
              </PressableHybrid>
              <View
                pointerEvents="none"
                accessibilityElementsHidden={!saved || needsPermission}
                importantForAccessibility={saved && !needsPermission ? 'auto' : 'no-hide-descendants'}
                style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 4, opacity: saved && !needsPermission ? 1 : 0 }}
              >
                <Ionicons name="checkmark-circle" size={16} color={t.correct} />
                <Text style={{ color: t.correct, fontSize: 13 }}>{savedLabel}</Text>
              </View>
            </View>

            <Text style={{ color: t.textPrimary, fontSize: 34, lineHeight: 40, fontWeight: '700', marginTop: 10 }}>
              {screenTitle}
            </Text>

            {needsPermission && (
              <PressableHybrid
                accessibilityLabel={permissionLabel}
                accessibilityRole="button"
            onPress={async () => {
              hapticTap();
              // зачем (FINAL_PHASE п.7): исключение из разрешения/планирования было необработанным отказом без следа.
              try {
                const res = await requestNotificationPermissionWithFallback({ openSettingsIfBlocked: true });
                console.warn(`[NOTIF-PERMISSION] settings: granted=${res.granted}`);
                if (res.granted) {
                  setNeedsPermission(false);
                  await applyNotifPrefsSideEffects(prefsRef.current, lang as Lang, { studyTarget });
                  if (scheduleAnyEnabled(sRef.current)) {
                    await scheduleNotifications(sRef.current, lang as Lang, 0, { requestPermission: false, studyTarget });
                  }
                }
              } catch (error) {
                console.warn('[NOTIF-PERMISSION] settings: запрос разрешения или планирование не удались', error);
              }
            }}
                withHaptic={false}
                withSound={false}
                variant="card"
                style={{ marginTop: 12 }}
                contentStyle={{ minHeight: 64, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, gap: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: t.wrongBg ?? glass.opaqueCard, borderWidth: 1, borderColor: glass.glassEdge }}
              >
                <Ionicons name="notifications-off" size={18} color={t.wrong ?? t.textPrimary} />
                <FlowText testID="notif-permission-denied-label" provenance="authored" style={{ color: t.wrong ?? t.textPrimary, fontSize: 13, flex: 1, lineHeight: 18 }}>
                  {permissionLabel}
                </FlowText>
              </PressableHybrid>
            )}

            <View style={[statusCardStyle, { marginTop: 18 }]}>
              <LinearGradient pointerEvents="none" colors={[glass.selected, 'transparent']} style={{ position: 'absolute', inset: 0 }} />
              <Ionicons name="chatbubble-outline" size={20} color={glass.lightTint} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <FlowText testID="notif-master-label" provenance="authored" style={{ color: t.textPrimary, fontSize: 16, lineHeight: 22, fontWeight: '700' }}>
                  {masterLabel}
                </FlowText>
                <FlowText testID="notif-master-hint" provenance="authored" style={{ color: t.textMuted, fontSize: 13, lineHeight: 18, marginTop: 2 }}>
                  {masterHint}
                </FlowText>
              </View>
              <LocalSwitch value={master} onValueChange={toggleMaster} accessibilityLabel={masterLabel} glass={glass} />
            </View>

            {/* Категории видны всегда; мастер приглушает их и делает недоступными для нажатия и accessibility. */}
            <View style={{ opacity: master ? 1 : 0.45 }}>
              <Text style={sectionTitleStyle}>{sectionStudy}</Text>
              <View style={{ gap: 10 }}>
                <ToggleRow label={dailyLabel} icon="flame-outline" value={dailyEnabled} onValueChange={toggleDaily} disabled={!master} glass={glass} titleColor={t.textPrimary} rowStyle={rowStyle} />
                <PressableHybrid
                  accessibilityLabel={timeLabel}
                  accessibilityRole="button"
                  accessibilityValue={{ text: `${pad(hour)}:${pad(minute)}` }}
                  accessibilityState={{ disabled: !timeRowActive }}
                  disabled={!timeRowActive}
                  onPress={() => { if (!timeRowActive) return; hapticTap(); setTimeOpen(true); }}
                  withHaptic={false}
                  withSound={false}
                  variant="card"
                  style={{ opacity: master && !dailyEnabled ? 0.45 : 1 }}
                  contentStyle={rowStyle}
                >
                  <LinearGradient pointerEvents="none" colors={[glass.selected, 'transparent']} style={{ position: 'absolute', inset: 0 }} />
                  <RowIcon name="time-outline" glass={glass} />
                  <FlowText testID="notif-time-label" provenance="authored" style={{ color: t.textPrimary, fontSize: 16, lineHeight: 21, fontWeight: '700', flex: 1, minWidth: 0 }}>{timeLabel}</FlowText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 8 }}>
                    <FlowText testID="notif-time-value" provenance="authored" style={{ color: glass.secondary, fontSize: 13, lineHeight: 18, fontWeight: '400' }}>{pad(hour)}:{pad(minute)}</FlowText>
                    <Ionicons name="chevron-forward" size={20} color={t.textMuted} />
                  </View>
                </PressableHybrid>
                <ToggleRow label={streakLabel} icon="flame-outline" value={prefs.categories.streak} onValueChange={toggleCategory('streak')} disabled={!master} glass={glass} titleColor={t.textPrimary} rowStyle={rowStyle} />
                <ToggleRow label={phraseLabel} icon="bookmark-outline" value={prefs.categories.phrase_of_day} onValueChange={toggleCategory('phrase_of_day')} disabled={!master} glass={glass} titleColor={t.textPrimary} rowStyle={rowStyle} />
                <ToggleRow label={energyLabel} icon="flash-outline" value={prefs.categories.energy} onValueChange={toggleCategory('energy')} disabled={!master} glass={glass} titleColor={t.textPrimary} rowStyle={rowStyle} />
              </View>

              <Text style={sectionTitleStyle}>{sectionRecaps}</Text>
              <View style={{ gap: 10 }}>
                <ToggleRow label={weeklyLabel} icon="trending-up-outline" value={prefs.categories.weekly_recap} onValueChange={toggleCategory('weekly_recap')} disabled={!master} glass={glass} titleColor={t.textPrimary} rowStyle={rowStyle} />
                <ToggleRow label={monthlyLabel} icon="calendar-outline" value={prefs.categories.monthly_recap} onValueChange={toggleCategory('monthly_recap')} disabled={!master} glass={glass} titleColor={t.textPrimary} rowStyle={rowStyle} />
              </View>

              <Text style={sectionTitleStyle}>{sectionMore}</Text>
              <View style={{ gap: 10 }}>
                {/* «Вместе» (friends_together §4/§5): категория «Друзья» — пуш «Позвал(а)». */}
                <ToggleRow label={friendsLabel} icon="people-outline" value={prefs.categories.friends} onValueChange={toggleCategory('friends')} disabled={!master} glass={glass} titleColor={t.textPrimary} rowStyle={rowStyle} />
                <ToggleRow label={offersLabel} icon="pricetag-outline" value={prefs.categories.offers} onValueChange={toggleCategory('offers')} disabled={!master} glass={glass} titleColor={t.textPrimary} rowStyle={rowStyle} />
              </View>
            </View>
          </BouncyScrollView>
        </ContentWrap>
      <TimeModal
        visible={timeOpen}
        hour={hour}
        minute={minute}
        timeTitle={timeLabel}
        cancelLabel={cancelLabel}
        onConfirm={confirmTime}
        onCancel={() => setTimeOpen(false)}
      />
      </View>
    </ScreenGradient>
  );
}
