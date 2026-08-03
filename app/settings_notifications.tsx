// Экран «Уведомления»: мастер-тумблер + выбор категорий + одно время напоминания.
// зачем: владелец попросил дать юзеру выбор, КАКИЕ уведомления получать. Раньше
// экран управлял только расписанием типа 'reminder' (7 дней × время), а остальные
// ~12 типов не имели выключателя. Матрица дней заменена одним временем на все дни
// (решение владельца от 2026-07-26), категории гейтятся в app/notifications.ts.
// Шапка — общий стандарт «шторки раздела» (SectionSheetHeader), контент под ней свой.
import React, { useState, useRef, useCallback, useEffect } from 'react';
import TapScale from '../components/TapScale';
import { View, Text, Modal } from 'react-native';
import { FlowText } from '../components/text-integrity/FlowText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import CustomSwitch from '../components/CustomSwitch';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
import SectionSheetHeader from '../components/SectionSheetHeader';
import BouncyScrollView from '../components/BouncyScrollView';
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

const HOURS   = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const ITEM_H  = 48;
const VISIBLE = 5;
const PAD     = ITEM_H * 2;
const pad     = (n: number) => String(n).padStart(2, '0');

function SimplePicker({ values, value, onChange }: {
  values: number[]; value: number; onChange: (v: number) => void;
}) {
  const { theme: t } = useTheme();
  const ref   = useRef<any>(null);
  const yRef  = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const idx = values.indexOf(value);
    setTimeout(() => ref.current?.scrollTo({ y: Math.max(0, idx) * ITEM_H, animated: false }), 80);
  }, [value, values]);

  const snapNow = useCallback(() => {
    const idx = Math.round(yRef.current / ITEM_H);
    const c   = Math.max(0, Math.min(idx, values.length - 1));
    ref.current?.scrollTo({ y: c * ITEM_H, animated: true });
    onChange(values[c]);
  }, [values, onChange]);

  return (
    <View style={{ width: 88, height: ITEM_H * VISIBLE, overflow: 'hidden' }}>
      <View pointerEvents="none" style={{ position:'absolute', zIndex:3, top:PAD, left:6, right:6, height:ITEM_H, borderTopWidth:1.5, borderBottomWidth:1.5, borderColor:t.textSecond }}/>{/* guard-ok: не обводка контейнера — верх/низ рамки текущего часа/минуты в колёсике */}
      <View pointerEvents="none" style={{ position:'absolute', zIndex:2, top:0, left:0, right:0, height:PAD, backgroundColor:t.bgSurface, opacity:0.65 }}/>
      <View pointerEvents="none" style={{ position:'absolute', zIndex:2, bottom:0, left:0, right:0, height:PAD, backgroundColor:t.bgSurface, opacity:0.65 }}/>
      <BouncyScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: PAD }}
        onScroll={(e: any) => { yRef.current = e.nativeEvent.contentOffset.y; }}
        onScrollEndDrag={() => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(snapNow, 80); }}
        onMomentumScrollBegin={() => { if (timer.current) clearTimeout(timer.current); }}
        onMomentumScrollEnd={snapNow}
      >
        {values.map((v) => (
          <View key={v} style={{ height: ITEM_H, justifyContent:'center', alignItems:'center' }}>
            <Text style={{ fontSize:22, fontWeight:'400', color:t.textPrimary }}>{pad(v)}</Text>
          </View>
        ))}
      </BouncyScrollView>
    </View>
  );
}

function TimeModal({ visible, hour, minute, timeTitle, cancelLabel, onConfirm, onCancel }: {
  visible: boolean; hour: number; minute: number; timeTitle: string; cancelLabel: string;
  onConfirm: (h: number, m: number) => void;
  onCancel: () => void;
}) {
  const { theme: t } = useTheme();
  const [h, setH] = useState(hour);
  const [m, setM] = useState(minute);
  useEffect(() => { if (visible) { setH(hour); setM(minute); } }, [hour, minute, visible]);
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.55)', justifyContent:'center', alignItems:'center' }}>
        <View style={{ width:'88%', maxWidth:280, backgroundColor:t.bgCard, borderRadius:18, overflow:'hidden' }}>
          <View style={{ padding:16, borderBottomWidth:0.5, borderBottomColor:t.border, alignItems:'center' }}>
            <Text style={{ color:t.textPrimary, fontSize:16, fontWeight:'600' }}>{timeTitle}</Text>
          </View>
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', paddingVertical:6, backgroundColor:t.bgSurface }}>
            <SimplePicker values={HOURS}   value={h} onChange={setH}/>
            <Text style={{ color:t.textPrimary, fontSize:30, fontWeight:'200', marginHorizontal:2 }}>:</Text>
            <SimplePicker values={MINUTES} value={m} onChange={setM}/>
          </View>
          <View style={{ flexDirection:'row', borderTopWidth:0.5, borderTopColor:t.border }}>
            <TapScale style={{ flex:1, padding:16, alignItems:'center', borderRightWidth:0.5, borderRightColor:t.border }} onPress={onCancel}>
              <Text style={{ color:t.textMuted, fontSize:16 }}>{cancelLabel}</Text>
            </TapScale>
            <TapScale style={{ flex:1, padding:16, alignItems:'center' }} onPress={() => onConfirm(h, m)}>
              <Text style={{ color:t.textSecond, fontSize:16, fontWeight:'700' }}>OK</Text>
            </TapScale>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Ряд «название + тумблер». Всегда отрендерен (стабильная геометрия первого кадра). */
function ToggleRow({ label, value, onChange, last }: {
  label: string; value: boolean; onChange: (v: boolean) => void; last?: boolean;
}) {
  const { theme: t } = useTheme();
  return (
    <View style={{
      flexDirection:'row', alignItems:'center', justifyContent:'space-between',
      paddingHorizontal:16, paddingVertical:13,
      borderBottomWidth: last ? 0 : 0.5, borderBottomColor: t.border,
    }}>
      {/* зачем: text-integrity — название тумблера переносится целиком, ряд растёт. */}
      <FlowText testID="notif-toggle-label" provenance="authored" style={{ color:t.textPrimary, fontSize:15, fontWeight:'500', flex:1, marginRight:12 }}>
        {label}
      </FlowText>
      <CustomSwitch value={value} onValueChange={(v: boolean) => { hapticTap(); onChange(v); }} />
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
  const { theme: t } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();

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
        scheduleNotifications(sRef.current, lang as Lang, 0, { requestPermission: false, studyTarget }).catch(() => {});
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

  const screenTitle = L({ ru:'Уведомления', uk:'Сповіщення', es:'Notificaciones', 'pt-BR':'Notificações', vi:'Thông báo', id:'Notifikasi', tr:'Bildirimler', pl:'Powiadomienia' });
  const masterLabel = L({ ru:'Разрешить уведомления', uk:'Дозволити сповіщення', es:'Permitir notificaciones', 'pt-BR':'Permitir notificações', vi:'Cho phép thông báo', id:'Izinkan notifikasi', tr:'Bildirimlere izin ver', pl:'Zezwól na powiadomienia' });
  const sectionStudy = L({ ru:'Занятия', uk:'Заняття', es:'Estudio', 'pt-BR':'Estudos', vi:'Học tập', id:'Belajar', tr:'Çalışma', pl:'Nauka' });
  const dailyLabel = L({ ru:'Ежедневное напоминание', uk:'Щоденне нагадування', es:'Recordatorio diario', 'pt-BR':'Lembrete diário', vi:'Nhắc nhở hằng ngày', id:'Pengingat harian', tr:'Günlük hatırlatıcı', pl:'Codzienne przypomnienie' });
  const timeLabel = L({ ru:'Время', uk:'Час', es:'Hora', 'pt-BR':'Horário', vi:'Thời gian', id:'Waktu', tr:'Saat', pl:'Godzina' });
  const streakLabel = L({ ru:'Серия под угрозой', uk:'Серія під загрозою', es:'Racha en riesgo', 'pt-BR':'Sequência em risco', vi:'Chuỗi gặp nguy', id:'Streak terancam', tr:'Seri risk altında', pl:'Seria zagrożona' });
  const phraseLabel = L({ ru:'Фраза дня', uk:'Фраза дня', es:'Frase del día', 'pt-BR':'Frase do dia', vi:'Cụm từ hôm nay', id:'Frasa hari ini', tr:'Günün ifadesi', pl:'Zwrot dnia' });
  const energyLabel = L({ ru:'Энергия восстановилась', uk:'Енергію відновлено', es:'Energía recargada', 'pt-BR':'Energia recarregada', vi:'Năng lượng đã hồi', id:'Energi pulih', tr:'Enerji doldu', pl:'Energia odnowiona' });
  const sectionRecaps = L({ ru:'Итоги', uk:'Підсумки', es:'Resúmenes', 'pt-BR':'Resumos', vi:'Tổng kết', id:'Ringkasan', tr:'Özetler', pl:'Podsumowania' });
  const weeklyLabel = L({ ru:'Итоги недели', uk:'Підсумки тижня', es:'Resumen semanal', 'pt-BR':'Resumo da semana', vi:'Tổng kết tuần', id:'Ringkasan mingguan', tr:'Haftalık özet', pl:'Podsumowanie tygodnia' });
  const monthlyLabel = L({ ru:'Итоги месяца', uk:'Підсумки місяця', es:'Resumen mensual', 'pt-BR':'Resumo do mês', vi:'Tổng kết tháng', id:'Ringkasan bulanan', tr:'Aylık özet', pl:'Podsumowanie miesiąca' });
  const sectionMore = L({ ru:'Ещё', uk:'Ще', es:'Más', 'pt-BR':'Mais', vi:'Khác', id:'Lainnya', tr:'Diğer', pl:'Więcej' });
  const leagueLabel = L({ ru:'События лиги', uk:'Події ліги', es:'Eventos de la liga', 'pt-BR':'Eventos da liga', vi:'Sự kiện giải đấu', id:'Acara liga', tr:'Lig olayları', pl:'Wydarzenia ligi' });
  // зачем (2026-08-02, владелец): пуш «подарок сгорит» — отдельный тумблер,
  // не «Предложения»: это предупреждение о потере своего добра, не маркетинг.
  const giftsLabel = L({ ru:'Подарок сгорает', uk:'Подарунок згорає', es:'Regalo por caducar', 'pt-BR':'Presente expirando', vi:'Quà sắp hết hạn', id:'Hadiah akan hangus', tr:'Hediye yanmak üzere', pl:'Prezent wygasa' });
  const offersLabel = L({ ru:'Скидки и предложения', uk:'Знижки та пропозиції', es:'Descuentos y ofertas', 'pt-BR':'Descontos e ofertas', vi:'Giảm giá và ưu đãi', id:'Diskon dan penawaran', tr:'İndirimler ve teklifler', pl:'Zniżki i oferty' });
  const savedLabel = L({ ru:'Сохранено', uk:'Збережено', es:'Guardado', 'pt-BR':'Salvo', vi:'Đã lưu', id:'Tersimpan', tr:'Kaydedildi', pl:'Zapisano' });
  const cancelLabel = L({ ru:'Отмена', uk:'Скасувати', es:'Cancelar', 'pt-BR':'Cancelar', vi:'Hủy', id:'Batal', tr:'İptal', pl:'Anuluj' });
  const permissionLabel = L({
    ru:'Уведомления выключены в настройках телефона. Нажмите, чтобы включить.',
    uk:'Сповіщення вимкнені в налаштуваннях телефона. Натисніть, щоб увімкнути.',
    es:'Las notificaciones están desactivadas en el teléfono. Toca para activarlas.',
    'pt-BR':'As notificações estão desativadas no telefone. Toque para ativar.',
    vi:'Thông báo đang tắt trong cài đặt điện thoại. Nhấn để bật.',
    id:'Notifikasi dimatikan di pengaturan ponsel. Ketuk untuk mengaktifkan.',
    tr:'Bildirimler telefon ayarlarında kapalı. Açmak için dokunun.',
    pl:'Powiadomienia są wyłączone w ustawieniach telefonu. Dotknij, aby włączyć.',
  });

  const dailyEnabled = scheduleAnyEnabled(s);
  const { hour, minute } = scheduleTime(s);
  const master = prefs.master;
  const timeRowActive = master && dailyEnabled;

  const sectionTitleStyle = { color:t.textMuted, fontSize:12, fontWeight:'600' as const, marginLeft:22, marginTop:18, marginBottom:8, letterSpacing:0.3 };
  const groupStyle = { marginHorizontal:16, borderRadius:18, backgroundColor:t.bgCard, overflow:'hidden' as const };

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex:1 }}>
      <ContentWrap>
      <SectionSheetHeader
        title={screenTitle}
        onClose={() => {
          hapticTap();
          // Экран открывается из вкладки «Настройки» — возвращаемся на settings, не на home.
          safeRouterBack(router, '/(tabs)/settings' as any);
        }}
        accessory={saved && !needsPermission ? (
          <View style={{ flexDirection:'row', alignItems:'center', gap:4 }}>
            <Ionicons name="checkmark-circle" size={16} color={t.correct}/>
            <Text style={{ color:t.correct, fontSize:13 }}>{savedLabel}</Text>
          </View>
        ) : null}
      />

      <BouncyScrollView decelerationRate="normal" contentContainerStyle={{ paddingBottom:40 }}>
        {needsPermission && (
          <TapScale
            onPress={async () => {
              hapticTap();
              const res = await requestNotificationPermissionWithFallback({ openSettingsIfBlocked: true });
              if (res.granted) {
                setNeedsPermission(false);
                await applyNotifPrefsSideEffects(prefsRef.current, lang as Lang, { studyTarget });
                if (scheduleAnyEnabled(sRef.current)) {
                  await scheduleNotifications(sRef.current, lang as Lang, 0, { requestPermission: false, studyTarget });
                }
              }
            }}
            style={{
              flexDirection:'row', alignItems:'center', gap:10,
              marginHorizontal:16, marginTop:12, paddingVertical:12, paddingHorizontal:14,
              borderRadius:14, backgroundColor:t.wrongBg ?? t.bgCard,
            }}
          >
            <Ionicons name="notifications-off" size={18} color={t.wrong ?? t.textPrimary} />
            <Text style={{ color:t.wrong ?? t.textPrimary, fontSize:13, flex:1, lineHeight:18 }}>
              {permissionLabel}
            </Text>
          </TapScale>
        )}

        <View style={{ ...groupStyle, marginTop:14, backgroundColor:t.bgSurface }}>
          <ToggleRow label={masterLabel} value={master} onChange={toggleMaster} last />
        </View>

        {/* Категории видны всегда (стабильная геометрия); при выключенном мастере — приглушены. */}
        <View style={{ opacity: master ? 1 : 0.45 }} pointerEvents={master ? 'auto' : 'none'}>
          <Text style={sectionTitleStyle}>{sectionStudy}</Text>
          <View style={groupStyle}>
            <ToggleRow label={dailyLabel} value={dailyEnabled} onChange={toggleDaily} />
            <TapScale
              onPress={() => { if (!timeRowActive) return; hapticTap(); setTimeOpen(true); }}
              style={{
                flexDirection:'row', alignItems:'center', justifyContent:'space-between',
                paddingHorizontal:16, paddingVertical:12,
                borderBottomWidth:0.5, borderBottomColor:t.border,
                backgroundColor:t.bgSurface,
                opacity: timeRowActive ? 1 : 0.45,
              }}
            >
              <Text style={{ color:t.textMuted, fontSize:14 }}>{timeLabel}</Text>
              <View style={{ flexDirection:'row', alignItems:'center', gap:2 }}>
                <Text style={{ color:t.textSecond, fontSize:14, fontWeight:'600' }}>{pad(hour)}:{pad(minute)}</Text>
                <Ionicons name="chevron-forward" size={14} color={t.textSecond} />
              </View>
            </TapScale>
            <ToggleRow label={streakLabel} value={prefs.categories.streak} onChange={toggleCategory('streak')} />
            <ToggleRow label={phraseLabel} value={prefs.categories.phrase_of_day} onChange={toggleCategory('phrase_of_day')} />
            <ToggleRow label={energyLabel} value={prefs.categories.energy} onChange={toggleCategory('energy')} last />
          </View>

          <Text style={sectionTitleStyle}>{sectionRecaps}</Text>
          <View style={groupStyle}>
            <ToggleRow label={weeklyLabel} value={prefs.categories.weekly_recap} onChange={toggleCategory('weekly_recap')} />
            <ToggleRow label={monthlyLabel} value={prefs.categories.monthly_recap} onChange={toggleCategory('monthly_recap')} last />
          </View>

          <Text style={sectionTitleStyle}>{sectionMore}</Text>
          <View style={groupStyle}>
            <ToggleRow label={leagueLabel} value={prefs.categories.league} onChange={toggleCategory('league')} />
            <ToggleRow label={giftsLabel} value={prefs.categories.gifts} onChange={toggleCategory('gifts')} />
            <ToggleRow label={offersLabel} value={prefs.categories.offers} onChange={toggleCategory('offers')} last />
          </View>
        </View>
      </BouncyScrollView>

      <TimeModal
        visible={timeOpen}
        hour={hour}
        minute={minute}
        timeTitle={timeLabel}
        cancelLabel={cancelLabel}
        onConfirm={confirmTime}
        onCancel={() => setTimeOpen(false)}
      />
      </ContentWrap>
    </SafeAreaView>
    </ScreenGradient>
  );
}
