import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity,
  Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import CustomSwitch from '../components/CustomSwitch';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
import { hapticTap } from '../hooks/use-haptics';
import {
  NotifSettings,
  loadNotifSettings, saveNotifSettings, scheduleNotifications,
  getNotifSettingsSnapshot,
} from './notifications';
import { triLang, type Lang } from '../constants/i18n';

const DAYS_RU = ['Понедельник','Вторник','Среда','Четвер','Пятница','Суббота','Воскресенье'];
const DAYS_UK = ['Понеділок','Вівторок','Середа','Четвер','П\'ятниця','Субота','Неділя'];
const DAYS_ES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
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
  const ref   = useRef<ScrollView>(null);
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
      <View pointerEvents="none" style={{ position:'absolute', zIndex:3, top:PAD, left:6, right:6, height:ITEM_H, borderTopWidth:1.5, borderBottomWidth:1.5, borderColor:t.textSecond }}/>
      <View pointerEvents="none" style={{ position:'absolute', zIndex:2, top:0, left:0, right:0, height:PAD, backgroundColor:t.bgSurface, opacity:0.65 }}/>
      <View pointerEvents="none" style={{ position:'absolute', zIndex:2, bottom:0, left:0, right:0, height:PAD, backgroundColor:t.bgSurface, opacity:0.65 }}/>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: PAD }}
        onScroll={e => { yRef.current = e.nativeEvent.contentOffset.y; }}
        onScrollEndDrag={() => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(snapNow, 80); }}
        onMomentumScrollBegin={() => { if (timer.current) clearTimeout(timer.current); }}
        onMomentumScrollEnd={snapNow}
      >
        {values.map((v, i) => (
          <View key={i} style={{ height: ITEM_H, justifyContent:'center', alignItems:'center' }}>
            <Text style={{ fontSize:22, fontWeight:'400', color:t.textPrimary }}>{pad(v)}</Text>
          </View>
        ))}
      </ScrollView>
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
        <View style={{ width:280, backgroundColor:t.bgCard, borderRadius:18, overflow:'hidden', borderWidth:0.5, borderColor:t.border }}>
          <View style={{ padding:16, borderBottomWidth:0.5, borderBottomColor:t.border, alignItems:'center' }}>
            <Text style={{ color:t.textPrimary, fontSize:16, fontWeight:'600' }}>{timeTitle}</Text>
          </View>
          <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'center', paddingVertical:6, backgroundColor:t.bgSurface }}>
            <SimplePicker values={HOURS}   value={h} onChange={setH}/>
            <Text style={{ color:t.textPrimary, fontSize:30, fontWeight:'200', marginHorizontal:2 }}>:</Text>
            <SimplePicker values={MINUTES} value={m} onChange={setM}/>
          </View>
          <View style={{ flexDirection:'row', borderTopWidth:0.5, borderTopColor:t.border }}>
            <TouchableOpacity style={{ flex:1, padding:16, alignItems:'center', borderRightWidth:0.5, borderRightColor:t.border }} onPress={onCancel}>
              <Text style={{ color:t.textMuted, fontSize:16 }}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flex:1, padding:16, alignItems:'center' }} onPress={() => onConfirm(h, m)}>
              <Text style={{ color:t.textSecond, fontSize:16, fontWeight:'700' }}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function SettingsNotifications() {
  const router = useRouter();
  const { theme: t } = useTheme();
  const { lang } = useLang();

  const [s, setS]         = useState<NotifSettings>(() => getNotifSettingsSnapshot());
  const [saved, setSaved] = useState(false);
  const [pickerDay, setPickerDay] = useState<number|null>(null);
  const [pickerH,   setPickerH]   = useState(20);
  const [pickerM,   setPickerM]   = useState(0);

  useFocusEffect(
    useCallback(() => {
      void loadNotifSettings().then(setS);
    }, [])
  );

  const persist = async (next: NotifSettings) => {
    setS(next);
    await saveNotifSettings(next);
    await scheduleNotifications(next, lang as Lang, 0);
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  };

  const days = lang === 'uk' ? DAYS_UK : lang === 'es' ? DAYS_ES : DAYS_RU;
  const timeModalTitle = triLang(lang as Lang, { ru: 'Время', uk: 'Час', es: 'Hora' });
  const timeModalCancel = triLang(lang as Lang, { ru: 'Отмена', uk: 'Скасувати', es: 'Cancelar' });
  const screenTitle = triLang(lang as Lang, {
    uk: 'Розклад занять',
    ru: 'Расписание занятий',
    es: 'Horario de recordatorios',
  });
  const savedLabel = triLang(lang as Lang, { ru: 'Сохранено', uk: 'Збережено', es: 'Guardado' });
  const footerHint = triLang(lang as Lang, {
    uk: 'Повідомлення можна вимкнути в налаштуваннях телефону або тут.',
    ru: 'Уведомления можно отключить в настройках телефона или здесь.',
    es: 'Puedes desactivar las notificaciones en los ajustes del teléfono o desde esta pantalla.',
  });

  return (
    <ScreenGradient>
    <SafeAreaView style={{ flex:1 }}>
      <ContentWrap>
      <View style={{ flexDirection:'row', alignItems:'center', padding:15, borderBottomWidth:0.5, borderBottomColor:t.border }}>
        <TouchableOpacity onPress={() => {
          hapticTap();
          if (router.canGoBack()) router.back();
          else router.replace('/(tabs)/home' as any);
        }}>
          <Ionicons name="chevron-back" size={28} color={t.textPrimary}/>
        </TouchableOpacity>
        <Text style={{ color:t.textPrimary, fontSize:18, fontWeight:'700', marginLeft:8 }}>
          {screenTitle}
        </Text>
        {saved && (
          <View style={{ marginLeft:'auto', flexDirection:'row', alignItems:'center', gap:4 }}>
            <Ionicons name="checkmark-circle" size={16} color={t.correct}/>
            <Text style={{ color:t.correct, fontSize:13 }}>{savedLabel}</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom:40 }}>
        {days.map((dayName, d) => {
          const day = s.schedule[d];
          if (!day) return null;
          return (
            <View key={d} style={{ flexDirection:'row', alignItems:'center', paddingHorizontal:20, paddingVertical:16, borderBottomWidth:0.5, borderBottomColor:t.border }}>
              <View style={{ width:40, height:40, borderRadius:20, backgroundColor:day.enabled ? t.bgSurface : t.bgCard, borderWidth:0.5, borderColor:day.enabled ? t.textSecond : t.border, justifyContent:'center', alignItems:'center', marginRight:14 }}>
                <Ionicons name="alarm-outline" size={20} color={day.enabled ? t.textSecond : t.textGhost}/>
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ color:t.textPrimary, fontSize:16, fontWeight:'500' }}>{dayName}</Text>
                <TouchableOpacity
                  onPress={() => { if (!day.enabled) return; setPickerDay(d); setPickerH(day.hour); setPickerM(day.minute); }}
                  activeOpacity={day.enabled ? 0.6 : 1}
                  hitSlop={{ top:8, bottom:8, left:0, right:40 }}
                >
                  <Text style={{ color:day.enabled ? t.textSecond : t.textGhost, fontSize:13, marginTop:2 }}>
                    {pad(day.hour) + ':' + pad(day.minute)}
                  </Text>
                </TouchableOpacity>
              </View>
              <CustomSwitch
                value={!!day.enabled}
                onValueChange={v => {
                  void persist({ ...s, schedule: { ...s.schedule, [d]: { ...day, enabled: v } } });
                }}
              />
            </View>
          );
        })}
        <View style={{ flexDirection:'row', alignItems:'flex-start', gap:10, margin:16, padding:14, backgroundColor:t.bgCard, borderRadius:12, borderWidth:0.5, borderColor:t.border }}>
          <Ionicons name="information-circle-outline" size={18} color={t.textMuted} style={{ marginTop:1 }}/>
          <Text style={{ color:t.textMuted, fontSize:12, flex:1, lineHeight:18 }}>
            {footerHint}
          </Text>
        </View>
      </ScrollView>

      <TimeModal
        visible={pickerDay !== null}
        hour={pickerH}
        minute={pickerM}
        timeTitle={timeModalTitle}
        cancelLabel={timeModalCancel}
        onConfirm={(h, m) => {
          if (pickerDay === null) return;
          persist({ ...s, schedule:{ ...s.schedule, [pickerDay]:{ ...s.schedule[pickerDay], hour:h, minute:m } } });
          setPickerDay(null);
        }}
        onCancel={() => setPickerDay(null)}
      />
      </ContentWrap>
    </SafeAreaView>
    </ScreenGradient>
  );
}
