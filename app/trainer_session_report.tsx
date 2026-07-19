import React from 'react';
import DuoPressable from '../components/DuoPressable';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import CompassDepthSurface from '../components/CompassDepthSurface';
import { triLang } from '../constants/i18n';
import { COMPASS_RICH, compassShadow } from '../constants/compassTheme';
import { buttonForegroundForBackground } from '../constants/color_contrast';

type TrainerReportQueue = 'words' | 'phrases' | 'arena';

interface TrainerSessionReportProps {
  queue: TrainerReportQueue;
  correct: number;
  wrong: number;
  total: number;
  accent: string;
  onDone: () => void;
  onPracticeMore?: () => void;
  /** Цепочка микса: «Дальше: Слова · n» — переход в следующую непустую очередь. */
  nextLabel?: string;
  onNext?: () => void;
}

export default function TrainerSessionReport({
  correct,
  wrong,
  total,
  accent,
  onDone,
  onPracticeMore,
  nextLabel,
  onNext,
}: TrainerSessionReportProps) {
  const { theme: t, f } = useTheme();
  const isCompassTheme = false;
  const reportAccent = isCompassTheme ? COMPASS_RICH.champagne : accent;
  const primaryTextColor = isCompassTheme
    ? COMPASS_RICH.textDark
    : buttonForegroundForBackground(accent);
  const { lang } = useLang();
  const attempted = Math.max(total, correct + wrong);
  const isEmpty = attempted === 0;
  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
  const perfect = attempted > 0 && wrong === 0;
  const title = isEmpty
    ? triLang(lang, {
      ru: 'Очередь чистая',
      uk: 'Черга чиста',
      es: 'Cola limpia',
      'pt-BR': 'Fila limpa',
      vi: 'Hàng đợi đã trống',
      id: 'Antrean bersih',
      tr: 'Kuyruk temiz',
      pl: 'Kolejka czysta',
    })
    : perfect
      ? triLang(lang, {
        ru: 'Закрыто без ошибок',
        uk: 'Закрито без помилок',
        es: 'Cerrado sin errores',
        'pt-BR': 'Fechado sem erros',
        vi: 'Hoàn thành không lỗi',
        id: 'Selesai tanpa kesalahan',
        tr: 'Hatasız kapatıldı',
        pl: 'Zamknięte bez błędów',
      })
      : triLang(lang, {
        ru: 'Есть что добрать',
        uk: 'Є що добрати',
        es: 'Queda por reforzar',
        'pt-BR': 'Ainda falta reforçar',
        vi: 'Còn phần cần củng cố',
        id: 'Masih perlu diperkuat',
        tr: 'Pekiştirilecek şeyler var',
        pl: 'Jest co utrwalić',
      });
  return (
    <View style={styles.root}>
      <View style={[styles.hero, isCompassTheme && compassShadow(2), { backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard, borderRadius: isCompassTheme ? 10 : 20, overflow: isCompassTheme ? 'hidden' : 'visible' }]}>
        {isCompassTheme ? <CompassDepthSurface radius={10} selected /> : null}
        <View style={[styles.iconWrap, { backgroundColor: isCompassTheme ? COMPASS_RICH.washStrong : accent + '22', borderRadius: isCompassTheme ? 12 : 20 }]}>
          <Ionicons
            name={isEmpty ? 'checkmark-done' : perfect ? 'shield-checkmark' : 'analytics'}
            size={30}
            color={reportAccent}
          />
        </View>
        <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', textAlign: 'center' }}>
          {title}
        </Text>
      </View>

      <View style={styles.metrics}>
        <Metric
          label={triLang(lang, {
            ru: 'точность',
            uk: 'точність',
            es: 'precisión',
            'pt-BR': 'precisão',
            vi: 'độ chính xác',
            id: 'akurasi',
            tr: 'doğruluk',
            pl: 'dokładność',
          })}
          value={isEmpty ? '-' : `${accuracy}%`}
          color={reportAccent}
        />
        <Metric
          label={triLang(lang, {
            ru: 'закреплено',
            uk: 'закріплено',
            es: 'fijadas',
            'pt-BR': 'fixadas',
            vi: 'đã củng cố',
            id: 'dikuasai',
            tr: 'pekiştirildi',
            pl: 'utrwalone',
          })}
          value={String(correct)}
          color={isCompassTheme ? COMPASS_RICH.champagne : t.correct}
        />
        <Metric
          label={triLang(lang, {
            ru: 'вернётся',
            uk: 'повернеться',
            es: 'vuelven',
            'pt-BR': 'voltam',
            vi: 'sẽ quay lại',
            id: 'muncul lagi',
            tr: 'geri döner',
            pl: 'wróci',
          })}
          value={String(wrong)}
          color={isCompassTheme ? COMPASS_RICH.peach : t.wrong}
        />
      </View>

      <View style={styles.actions}>
        {onNext && nextLabel ? (
          <DuoPressable onPress={onNext} wrapStyle={styles.actionButtonWrap} style={[styles.secondaryBtn, isCompassTheme && compassShadow(1), { backgroundColor: isCompassTheme ? COMPASS_RICH.wash : accent + '22', borderRadius: isCompassTheme ? 9 : 16, overflow: isCompassTheme ? 'hidden' : 'visible' }]}>
            {isCompassTheme ? <CompassDepthSurface radius={9} quiet /> : null}
            <Text style={{ color: reportAccent, fontSize: f.sub, fontWeight: '900' }}>
              {nextLabel}
            </Text>
          </DuoPressable>
        ) : onPracticeMore && !isEmpty ? (
          <DuoPressable onPress={onPracticeMore} wrapStyle={styles.actionButtonWrap} style={[styles.secondaryBtn, isCompassTheme && compassShadow(1), { backgroundColor: isCompassTheme ? COMPASS_RICH.wash : accent + '22', borderRadius: isCompassTheme ? 9 : 16, overflow: isCompassTheme ? 'hidden' : 'visible' }]}>
            {isCompassTheme ? <CompassDepthSurface radius={9} quiet /> : null}
            <Text style={{ color: reportAccent, fontSize: f.sub, fontWeight: '900' }}>
              {triLang(lang, {
                ru: 'Ещё слабые',
                uk: 'Ще слабкі',
                es: 'Más débiles',
                'pt-BR': 'Mais fracas',
                vi: 'Phần còn yếu',
                id: 'Yang masih lemah',
                tr: 'Zayıf kalanlar',
                pl: 'Jeszcze słabe',
              })}
            </Text>
          </DuoPressable>
        ) : null}
        <DuoPressable onPress={onDone} wrapStyle={styles.actionButtonWrap} style={[styles.primaryBtn, isCompassTheme && compassShadow(1), { backgroundColor: isCompassTheme ? COMPASS_RICH.champagne : accent, borderRadius: isCompassTheme ? 9 : 16, overflow: isCompassTheme ? 'hidden' : 'visible' }]}>
          {isCompassTheme ? <CompassDepthSurface radius={9} cream /> : null}
          <Text style={{ color: primaryTextColor, fontSize: f.sub, fontWeight: '900' }}>
            {triLang(lang, {
              ru: 'Готово',
              uk: 'Готово',
              es: 'Listo',
              'pt-BR': 'Pronto',
              vi: 'Xong',
              id: 'Selesai',
              tr: 'Bitti',
              pl: 'Gotowe',
            })}
          </Text>
        </DuoPressable>
      </View>
    </View>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  const { theme: t, f } = useTheme();
  const isCompassTheme = false;
  return (
    <View style={[styles.metric, isCompassTheme && compassShadow(1), { backgroundColor: isCompassTheme ? COMPASS_RICH.charcoalRaised : t.bgCard, borderRadius: isCompassTheme ? 9 : 14, overflow: isCompassTheme ? 'hidden' : 'visible' }]}>
      {isCompassTheme ? <CompassDepthSurface radius={9} quiet /> : null}
      <Text style={{ color, fontSize: f.numMd, fontWeight: '900' }}>{value}</Text>
      <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '800' }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    gap: 14,
  },
  hero: {
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metrics: {
    flexDirection: 'row',
    gap: 8,
  },
  metric: {
    flex: 1,
    minHeight: 76,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButtonWrap: { flex: 1 },
  primaryBtn: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  secondaryBtn: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
});
