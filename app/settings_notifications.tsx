// Экран «Уведомления»: мастер-тумблер + выбор категорий + одно время напоминания.
// зачем: владелец попросил дать юзеру выбор, КАКИЕ уведомления получать. Раньше
// экран управлял только расписанием типа 'reminder' (7 дней × время), а остальные
// ~12 типов не имели выключателя. Матрица дней заменена одним временем на все дни
// (решение владельца от 2026-07-26), категории гейтятся в app/notifications.ts.
// Визуальный слой следует профилю Liquid Glass; логика расписания и разрешений
// остаётся изолированной от презентации.
import { switchOffTrackTone, switchOnTone } from '../components/settings/switch_chrome';
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
import { actionToastTri, emitAppEvent } from './events';
import { safeRouterBack } from './navigation_back';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { LinearGradient } from '../components/SafeLinearGradient';
import { actionBoxShadow, nestedBoxShadow, PlateFill, plateBoxShadow } from '../components/v2/ShadowSurface';

import { swallowError } from './debug-logger';
import { isDevRobotNoCloud, noteRobotNoCloudSkip } from './dev_robot_no_cloud';
import { getDevReminderTime } from './dev_robot_display';
import { SettingsGlassEyebrow } from '../components/settings/SettingsGlassRows';
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
        {/* зачем (стиль «Тень», владелец 12.10): окно по центру — тень на внешнем слое, клип скруглений внутренних слоёв — на внутреннем; кромки нет */}
        <View style={{ width:'100%', maxWidth:340, maxHeight:'100%', borderRadius:TIME_MODAL_PANEL_RADIUS, boxShadow:plateBoxShadow(glass) }}>
        <LinearGradient colors={[glass.opaqueSheet, glass.opaqueSheet]} style={{ flexShrink:1, minHeight:0, borderRadius:TIME_MODAL_PANEL_RADIUS, overflow:'hidden' }}>
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
            <DuoPressable wrapStyle={{ flex:1 }} style={{ minHeight:48, borderRadius:24, backgroundColor:glass.opaqueControl, boxShadow:nestedBoxShadow(glass) }} onPress={onCancel}>
              <Text style={{ color:glass.text, fontSize:16, fontWeight:'700' }}>{cancelLabel}</Text>
            </DuoPressable>
            <DuoPressable wrapStyle={{ flex:1 }} style={{ minHeight:48, borderRadius:24, backgroundColor:glass.accent, boxShadow:actionBoxShadow(glass) }} onPress={() => onConfirm(h, m)}>
              <Text style={{ color:glass.accentInk, fontSize:16, fontWeight:'700' }}>OK</Text>
            </DuoPressable>
          </View>
        </LinearGradient>
        </View>
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
  /** зачем (координатор 12.10, робот съёмки settings-gap-010/027): по тексту робот попадал в подпись строки, а не в переключатель. */
  testID?: string;
};

function LocalSwitch({ value, onValueChange, accessibilityLabel, disabled = false, glass, testID }: LocalSwitchProps) {
  // зачем (координатор 13.10, Темы 4801981d8; образец settings-gap-013/014/015/034 `.gs-sw.on`): включённый — дорожка цвета акцента
  // и «чернильный» бегунок из общего токена switchOnTone, а не тёмная дорожка glass.selected с белым бегунком.
  const onTone = switchOnTone(glass);
  return (
    <PressableHybrid
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => { hapticTap(); onValueChange(!value); }}
      withHaptic={false}
      withSound={false}
      variant="chip"
      // зачем (R1_DIFF_ONE_FIX, settings-gap-011, решение координатора 12.10): переключатель 36 + hitSlop (зона нажатия ≥ 44 dp: 36 + 8 + 8 = 52 по высоте) — минимум 48 раздувал строку до 68 dp против 64 в макете (`.gs-pl2` min-height 64; с переключателем 36 строка ровно 64)
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      style={{ width: 48, minWidth: 48, minHeight: 36, alignSelf: 'center' }}
      contentStyle={{ width: 48, minHeight: 36, justifyContent: 'center', alignItems: 'center' }}
    >
      <View style={{ width: 48, height: 29, borderRadius: 16, padding: 3, justifyContent: 'center', backgroundColor: value ? onTone.track : switchOffTrackTone(glass).track /* зачем (координатор 12.10, «Тень»): без обводки — дорожка выключенного отделяется тоном */ }}>
        <View style={{ width: 21, height: 21, borderRadius: 11, backgroundColor: value ? onTone.knob : switchOffTrackTone(glass).knob, transform: [{ translateX: value ? 19 : 0 }] }} />
      </View>
    </PressableHybrid>
  );
}

function RowIcon({ name, glass }: { name: keyof typeof Ionicons.glyphMap; glass: ReturnType<typeof liquidGlassTokens> }) {
  return (
    <View style={{ width: 41, height: 41, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: glass.dividerTone, boxShadow: nestedBoxShadow(glass) }}>
      <Ionicons name={name} size={20} color={glass.lightTint} />
    </View>
  );
}

function ToggleRow({ label, icon, value, onValueChange, disabled, glass, titleColor, rowStyle, switchTestID }: {
  switchTestID?: string;
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
      <PlateFill g={glass} radius={14} />
      <RowIcon name={icon} glass={glass} />
      <FlowText testID="notif-toggle-label" provenance="authored" style={{ color: titleColor, fontSize: 16, lineHeight: 21, fontWeight: '700', flex: 1, minWidth: 0 }}>
        {label}
      </FlowText>
      <LocalSwitch testID={switchTestID} value={value} onValueChange={onValueChange} accessibilityLabel={label} disabled={disabled} glass={glass} />
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

  // зачем (settings-gaps-states): разрешение могли отозвать в системных настройках — мастер включён, а красной плашки не было.
  // Отдельный эффект, чтобы не менять защищённый эффект гидратации выше; проверка локальная, без сети и без запроса разрешения.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void (async () => {
        try {
          const storedPrefs = await hydrateNotifPrefsFromStorage();
          const granted = await isNotificationPermissionGranted();
          if (!alive) return;
          setNeedsPermission(Boolean(storedPrefs.master) && !granted);
          console.log(`[NOTIF-SETTINGS] focus_permission master=${String(storedPrefs.master)} granted=${String(granted)}`); // guard-ok: единичный лог на вход на экран
        } catch (error: unknown) {
          console.warn(`[NOTIF-SETTINGS] focus_permission_check_failed reason=${error instanceof Error ? error.message : String(error)}`);
        }
      })();
      return () => { alive = false; };
    }, [])
  );

  // зачем (settings-gap-012, сперва логи): что экран показывает при системном запрете и что сохранено — по журналу видно, почему мастер выключен.
  useEffect(() => {
    console.log(`[NOTIF-PERM] display system_blocked=${String(needsPermission)} stored_master=${String(prefs.master)} shown_master=${String(prefs.master && !needsPermission)}`); // guard-ok: смена показа, единичный лог
  }, [needsPermission, prefs.master]);

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

  // зачем (аудит Optimistic UI «Настроек», 12.10): поздний сбой старого тапа не должен откатывать более свежий выбор — у каждой записи свой номер
  const prefsSeqRef = useRef(0);
  const scheduleSeqRef = useRef(0);
  const rollbackToast = () => emitAppEvent('action_toast', actionToastTri('error', {
        ru: 'Не удалось сохранить настройку. Попробуй ещё раз.', uk: 'Не вдалося зберегти налаштування. Спробуй ще раз.', en: "Couldn't save the setting. Try again.",
        es: 'No se pudo guardar el ajuste. Inténtalo de nuevo.', 'pt-BR': 'Não foi possível salvar a configuração. Tente de novo.', vi: 'Không lưu được cài đặt. Hãy thử lại.',
        id: 'Pengaturan tidak dapat disimpan. Coba lagi.', tr: 'Ayar kaydedilemedi. Tekrar dene.', pl: 'Nie udało się zapisać ustawienia. Spróbuj ponownie.',
      }));

  const persistPrefs = async (next: NotifPrefs, enabling: boolean) => {
    const prevPrefs = prefsRef.current;
    const seq = ++prefsSeqRef.current;
    // Optimistic: тумблер реагирует мгновенно, сеть и планирование догоняют фоном.
    setPrefs(next);
    flashSaved();
    // зачем (координатор 12.10: «записи в облако с робота — НЕТ»): dev robot_no_cloud=1 — меняется только экран; ни сохранения на
    // устройство, ни pushPrefs/push-токена в облаке, ни системного окна разрешения. Вне dev / в стор-сборке флаг всегда false.
    if (isDevRobotNoCloud()) {
      noteRobotNoCloudSkip(`notif-prefs master=${next.master} (сохранение, pushPrefs, push-токен, разрешение ОС)`); // i18n-ok: заметка для робота Сверки в журнал, не текст экрана
      return;
    }
    try {
      await saveNotifPrefs(next);
      const permitted = await ensurePermissionIfEnabling(enabling);
      await applyNotifPrefsSideEffects(next, lang as Lang, { studyTarget });
      // Мастер включили обратно — вернём и ежедневное напоминание, если оно было включено.
      if (permitted && next.master && scheduleAnyEnabled(sRef.current)) {
        scheduleNotifications(sRef.current, lang as Lang, 0, { requestPermission: false, studyTarget }).catch(swallowError('settings_notifications:persistPrefs'));
      }
    } catch (error: unknown) {
      // зачем: немого catch нет — откат тумблера и причина в журнале.
      const reason = error instanceof Error ? error.message : String(error);
      if (prefsSeqRef.current !== seq) {
        console.warn(`[NOTIF-PREFS] persist_failed rollback=skipped reason=${reason}: выбор уже изменён позже`);
        return;
      }
      console.warn(`[NOTIF-PREFS] persist_failed rollback=1 reason=${reason}`);
      setPrefs(prevPrefs);
      setSaved(false);
      rollbackToast();
    }
  };

  const persistSchedule = async (next: NotifSettings, enabling: boolean) => {
    const prevS = sRef.current;
    const seq = ++scheduleSeqRef.current;
    setS(next);
    flashSaved();
    if (isDevRobotNoCloud()) {
      noteRobotNoCloudSkip(`notif-schedule enabling=${enabling} (сохранение, планирование, разрешение ОС)`); // i18n-ok: заметка для робота Сверки в журнал, не текст экрана
      return;
    }
    try {
      await saveNotifSettings(next);
      const permitted = await ensurePermissionIfEnabling(enabling);
      if (!permitted) return;
      await scheduleNotifications(next, lang as Lang, 0, { requestPermission: false, studyTarget });
      // зачем (умное напоминание): у дней «авто» время подставил телефон — показываем фактическое, если выбор не сменился позже.
      if (scheduleSeqRef.current === seq) setS(getNotifSettingsSnapshot());
    } catch (error: unknown) {
      // зачем: раньше `catch {` откатывал тумблер/время молча — теперь причина в журнале и сообщение человеку
      const reason = error instanceof Error ? error.message : String(error);
      if (scheduleSeqRef.current !== seq) {
        console.warn(`[NOTIF-SCHEDULE] persist_failed rollback=skipped reason=${reason}: выбор уже изменён позже`);
        return;
      }
      console.warn(`[NOTIF-SCHEDULE] persist_failed rollback=1 reason=${reason}`);
      setS(prevS);
      setSaved(false);
      rollbackToast();
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
    // зачем (умное напоминание, владелец 13.10): включение без выбора времени — «авто» (время подберёт телефон);
    // если человек уже выбирал время сам (mode 'manual') — оставляем его. Выключено-включено без выбора времени — «авто».
    const keepManual = Object.values(cur.schedule).some(d => d.mode === 'manual');
    const mode: 'auto' | 'manual' = keepManual ? 'manual' : 'auto';
    const schedule = Object.fromEntries(
      Array.from({ length: 7 }, (_, d) => [d, { enabled: v, hour, minute, mode }])
    );
    console.log(`[SMART-REMINDER] ui:toggleDaily enabled=${String(v)} mode=${mode}`);
    void persistSchedule({ ...cur, schedule }, v);
  };

  const confirmTime = (h: number, m: number) => {
    setTimeOpen(false);
    const cur = sRef.current;
    const schedule = Object.fromEntries(
      // зачем (умное напоминание): человек выбрал время сам — «вручную», телефон его больше не трогает.
      Object.entries(cur.schedule).map(([d, day]) => [d, { ...day, hour: h, minute: m, mode: 'manual' as const }])
    );
    void persistSchedule({ ...cur, schedule }, scheduleAnyEnabled(cur));
  };

  const L = (copy: Record<Lang, string>) => triLang(lang as Lang, copy);

  const screenTitle = L({ ru:'Уведомления', uk:'Сповіщення', en:'Notifications', es:'Notificaciones', 'pt-BR':'Notificações', vi:'Thông báo', id:'Notifikasi', tr:'Bildirimler', pl:'Powiadomienia' });
  const masterLabel = L({ ru:'Разрешить уведомления', uk:'Дозволити сповіщення', en:'Allow notifications', es:'Permitir notificaciones', 'pt-BR':'Permitir notificações', vi:'Cho phép thông báo', id:'Izinkan notifikasi', tr:'Bildirimlere izin ver', pl:'Zezwól na powiadomienia' });
  const masterHint = L({ ru:'Системное разрешение телефона тоже должно быть включено.', uk:'Системний дозвіл телефона теж має бути ввімкнено.', en:'System notification permission must also be enabled on your phone.', es:'El permiso del sistema del teléfono también debe estar activado.', 'pt-BR':'A permissão do sistema do telefone também deve estar ativada.', vi:'Quyền thông báo hệ thống trên điện thoại cũng phải được bật.', id:'Izin notifikasi sistem di ponsel juga harus diaktifkan.', tr:'Telefonun sistem bildirim izni de açık olmalıdır.', pl:'Systemowe uprawnienie telefonu do powiadomień też musi być włączone.' });
  const backLabel = L({ ru:'Назад', uk:'Назад', en:'Back', es:'Atrás', 'pt-BR':'Voltar', vi:'Quay lại', id:'Kembali', tr:'Geri', pl:'Wstecz' });
  const sectionStudy = L({ ru:'ЗАНЯТИЯ', uk:'ЗАНЯТТЯ', en:'STUDY', es:'ESTUDIO', 'pt-BR':'ESTUDOS', vi:'HỌC TẬP', id:'BELAJAR', tr:'ÇALIŞMA', pl:'NAUKA' });
  const dailyLabel = L({ ru:'Ежедневное напоминание', uk:'Щоденне нагадування', en:'Daily reminder', es:'Recordatorio diario', 'pt-BR':'Lembrete diário', vi:'Nhắc nhở hằng ngày', id:'Pengingat harian', tr:'Günlük hatırlatıcı', pl:'Codzienne przypomnienie' });
  const timeLabel = L({ ru:'Время', uk:'Час', en:'Time', es:'Hora', 'pt-BR':'Horário', vi:'Thời gian', id:'Waktu', tr:'Saat', pl:'Godzina' });
  const streakLabel = L({ ru:'Серия под угрозой', uk:'Серія під загрозою', en:'Streak at risk', es:'Racha en riesgo', 'pt-BR':'Sequência em risco', vi:'Chuỗi gặp nguy', id:'Streak terancam', tr:'Seri risk altında', pl:'Seria zagrożona' });
  const phraseLabel = L({ ru:'Фраза дня', uk:'Вислів дня', en:'Phrase of the day', es:'Frase del día', 'pt-BR':'Frase do dia', vi:'Cụm từ hôm nay', id:'Frasa hari ini', tr:'Günün ifadesi', pl:'Zwrot dnia' });
  const energyLabel = L({ ru:'Энергия восстановилась', uk:'Енергію відновлено', en:'Energy restored', es:'Energía recargada', 'pt-BR':'Energia recarregada', vi:'Năng lượng đã hồi', id:'Energi pulih', tr:'Enerji doldu', pl:'Energia odnowiona' });
  const sectionRecaps = L({ ru:'ИТОГИ', uk:'ПІДСУМКИ', en:'RECAPS', es:'RESÚMENES', 'pt-BR':'RESUMOS', vi:'TỔNG KẾT', id:'RINGKASAN', tr:'ÖZETLER', pl:'PODSUMOWANIA' });
  const weeklyLabel = L({ ru:'Итоги недели', uk:'Підсумки тижня', en:'Weekly recap', es:'Resumen semanal', 'pt-BR':'Resumo da semana', vi:'Tổng kết tuần', id:'Ringkasan mingguan', tr:'Haftalık özet', pl:'Podsumowanie tygodnia' });
  const monthlyLabel = L({ ru:'Итоги месяца', uk:'Підсумки місяця', en:'Monthly recap', es:'Resumen mensual', 'pt-BR':'Resumo do mês', vi:'Tổng kết tháng', id:'Ringkasan bulanan', tr:'Aylık özet', pl:'Podsumowanie miesiąca' });
  const sectionMore = L({ ru:'ЕЩЁ', uk:'ЩЕ', en:'MORE', es:'MÁS', 'pt-BR':'MAIS', vi:'KHÁC', id:'LAINNYA', tr:'DİĞER', pl:'WIĘCEJ' });
  // «Вместе»: пуш «Позвал(а)» от друга — отдельная категория (владелец, 2026-08-16).
  // зачем: паритет profile.html PRF-04 (13.10) — Шпиль в первом выпуске, его пуши можно выключить отдельно.
  const spireLabel = L({ ru:'События Пика', uk:'Події Піка', en:'Peak events', es:'Eventos del Pico', 'pt-BR':'Eventos do Pico', vi:'Sự kiện Đỉnh', id:'Acara Puncak', tr:'Zirve etkinlikleri', pl:'Wydarzenia Szczytu' });
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

  // зачем (бэклог №18, settings-gap-028): dev_state?reminderTime=HH:MM — витрина для робота: напоминание показано включённым, чтобы шаг
  // «Время» всегда открывал окно (стартовое состояние гостя между прогонами разное). Только показ, только dev (getDevReminderTime в сторе = null).
  const devShowcase = getDevReminderTime() !== null;
  const dailyEnabled = devShowcase || scheduleAnyEnabled(s);
  const { hour, minute } = scheduleTime(s);
  // зачем (settings-gap-012, образец settings-gaps-states №12): пока телефон запрещает уведомления, ни одно не придёт — экран показывает
  // ФАКТИЧЕСКОЕ состояние: мастер выключен, строки выключены и приглушены. Сохранённые выборы человека не трогаем — после разрешения они вернутся.
  const master = (prefs.master || devShowcase) && !needsPermission;
  const timeRowActive = master && dailyEnabled;

  // зачем: паритет с макетом profile.html PRF-04 — заголовок секции как eyebrow (SettingsGlassEyebrow: secondary, 1.7)
  // зачем (EN-проход 13.10, координатор): заголовки разделов — тот же eyebrow, что в Настройках (SettingsGlassEyebrow: 13 по D145,
  // разрядка 1.7, прописные — как `.eyebrow` макета profile.html); раньше свой стиль без прописных («Study», «Занятия»).
  const statusCardStyle = { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, gap: 12, flexDirection: 'row' as const, alignItems: 'flex-start' as const, backgroundColor: glass.plateFillFrom, boxShadow: plateBoxShadow(glass) }; // зачем (стиль «Тень»): плашка с тенью, без кромки и клипа
  const rowStyle = { minHeight: 64, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, gap: 14, flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: glass.plateFillFrom, boxShadow: plateBoxShadow(glass) };

  return (
    <ScreenGradient>
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }}>
        <ContentWrap>
          <BouncyScrollView decelerationRate="fast" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 /* зачем: паритет profile.html (13.10): поля экрана 20 */, paddingBottom: 40 }}>
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
                <Ionicons name="checkmark-circle-outline" size={16} color={t.correct} />
                <Text style={{ color: t.correct, fontSize: 13 }}>{savedLabel}</Text>
              </View>
            </View>

            <Text maxFontSizeMultiplier={1.15} style={{ color: t.textPrimary, fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5, marginTop: 10 }}>
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
                contentStyle={{ minHeight: 64, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, gap: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: t.wrongBg ?? glass.plateFillFrom, boxShadow: plateBoxShadow(glass) }}
              >
                <Ionicons name="notifications-off" size={18} color={t.wrong ?? t.textPrimary} />
                <FlowText testID="notif-permission-denied-label" provenance="authored" style={{ color: t.wrong ?? t.textPrimary, fontSize: 13, flex: 1, lineHeight: 18 }}>
                  {permissionLabel}
                </FlowText>
              </PressableHybrid>
            )}

            <View style={[statusCardStyle, { marginTop: 18 }]}>
              <PlateFill g={glass} radius={14} />
              <Ionicons name="chatbubble-outline" size={20} color={glass.lightTint} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <FlowText testID="notif-master-label" provenance="authored" style={{ color: t.textPrimary, fontSize: 16, lineHeight: 22, fontWeight: '700' }}>
                  {masterLabel}
                </FlowText>
                <FlowText testID="notif-master-hint" provenance="authored" style={{ color: t.textMuted, fontSize: 13, lineHeight: 18, marginTop: 3 }}>
                  {masterHint}
                </FlowText>
              </View>
              <LocalSwitch testID="notif-master-switch" value={master} onValueChange={toggleMaster} accessibilityLabel={masterLabel} glass={glass} />
            </View>

            {/* Категории видны всегда; мастер приглушает их и делает недоступными для нажатия и accessibility. */}
            <View style={{ opacity: master ? 1 : 0.45 }}>
              <SettingsGlassEyebrow glass={glass} title={sectionStudy} />
              <View style={{ gap: 10 }}>
                <ToggleRow label={dailyLabel} icon="flame-outline" value={master && dailyEnabled} onValueChange={toggleDaily} disabled={!master} glass={glass} titleColor={t.textPrimary} rowStyle={rowStyle} switchTestID="notif-daily-switch" />
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
                  style={{ opacity: timeRowActive || !master ? 1 : 0.45 }}
                  contentStyle={rowStyle}
                >
                  <PlateFill g={glass} radius={14} />
                  <RowIcon name="time-outline" glass={glass} />
                  <FlowText testID="notif-time-label" provenance="authored" style={{ color: t.textPrimary, fontSize: 16, lineHeight: 21, fontWeight: '700', flex: 1, minWidth: 0 }}>{timeLabel}</FlowText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 /* зачем (settings-gaps-states .gs-nval): значение и шеврон через 14, шеврон 18 */, marginLeft: 8 }}>
                    <FlowText testID="notif-time-value" provenance="authored" style={{ color: glass.secondary, fontSize: 13, lineHeight: 18, fontWeight: '400' }}>{pad(hour)}:{pad(minute)}</FlowText>
                    <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
                  </View>
                </PressableHybrid>
                <ToggleRow label={streakLabel} icon="flame-outline" value={master && prefs.categories.streak} onValueChange={toggleCategory('streak')} disabled={!master} glass={glass} titleColor={t.textPrimary} rowStyle={rowStyle} switchTestID="notif-switch-streak" />
                <ToggleRow label={phraseLabel} icon="bookmark-outline" value={master && prefs.categories.phrase_of_day} onValueChange={toggleCategory('phrase_of_day')} disabled={!master} glass={glass} titleColor={t.textPrimary} rowStyle={rowStyle} switchTestID="notif-switch-phrase_of_day" />
                <ToggleRow label={energyLabel} icon="flash-outline" value={master && prefs.categories.energy} onValueChange={toggleCategory('energy')} disabled={!master} glass={glass} titleColor={t.textPrimary} rowStyle={rowStyle} switchTestID="notif-switch-energy" />
              </View>

              <SettingsGlassEyebrow glass={glass} title={sectionRecaps} />
              <View style={{ gap: 10 }}>
                <ToggleRow label={weeklyLabel} icon="trending-up-outline" value={master && prefs.categories.weekly_recap} onValueChange={toggleCategory('weekly_recap')} disabled={!master} glass={glass} titleColor={t.textPrimary} rowStyle={rowStyle} switchTestID="notif-switch-weekly_recap" />
                <ToggleRow label={monthlyLabel} icon="calendar-outline" value={master && prefs.categories.monthly_recap} onValueChange={toggleCategory('monthly_recap')} disabled={!master} glass={glass} titleColor={t.textPrimary} rowStyle={rowStyle} switchTestID="notif-switch-monthly_recap" />
                <ToggleRow label={spireLabel} icon="people-outline" value={master && prefs.categories.spire} onValueChange={toggleCategory('spire')} disabled={!master} glass={glass} titleColor={t.textPrimary} rowStyle={rowStyle} switchTestID="notif-switch-spire" />
              </View>

              <SettingsGlassEyebrow glass={glass} title={sectionMore} />
              <View style={{ gap: 10 }}>
                {/* «Вместе» (friends_together §4/§5): категория «Друзья» — пуш «Позвал(а)». */}
                <ToggleRow label={friendsLabel} icon="people-outline" value={master && prefs.categories.friends} onValueChange={toggleCategory('friends')} disabled={!master} glass={glass} titleColor={t.textPrimary} rowStyle={rowStyle} switchTestID="notif-switch-friends" />
                <ToggleRow label={offersLabel} icon="pricetag-outline" value={master && prefs.categories.offers} onValueChange={toggleCategory('offers')} disabled={!master} glass={glass} titleColor={t.textPrimary} rowStyle={rowStyle} switchTestID="notif-switch-offers" />
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
