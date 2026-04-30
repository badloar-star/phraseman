import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import LingmanCertificateSvg from './share_cards/LingmanCertificateSvg';
import { shareCardFromSvgRef } from './share_cards/shareCardPng';
import ExamResultPreviewAdminModal from './ExamResultPreviewAdminModal';
import { buildCertificateShareMessage } from '../app/exam_share';
import { STORE_URL } from '../app/config';
import {
  LINGMAN_CERT_NAME_MAX_LEN,
  LINGMAN_CERT_STORAGE_KEY,
  buildLingmanCertificate,
  formatCertDate,
  loadLingmanCertificate,
  saveLingmanCertificate,
  type CertLang,
  type LingmanCertificate,
} from '../app/exam_certificate';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from './ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import { emitAppEvent, actionToastTri } from '../app/events';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const PRESETS: { label: string; cert: () => LingmanCertificate }[] = [
  {
    label: 'Excellent · 96%',
    cert: () => buildLingmanCertificate({
      name: 'Anna Levchenko', score: 48, total: 50, pct: 96, lang: 'ru',
    }),
  },
  {
    label: 'Just passed · 80%',
    cert: () => buildLingmanCertificate({
      name: 'Сашко', score: 40, total: 50, pct: 80, lang: 'uk',
    }),
  },
  {
    label: 'Long name · 90%',
    cert: () => buildLingmanCertificate({
      name: 'Александр Иванов-Петровский',
      score: 45, total: 50, pct: 90, lang: 'ru',
    }),
  },
  {
    label: 'No name · 88%',
    cert: () => buildLingmanCertificate({
      name: '', score: 44, total: 50, pct: 88, lang: 'ru',
    }),
  },
];

export default function CertificatePreviewAdminModal({ visible, onClose }: Props) {
  const { theme: t, f } = useTheme();
  const { width: winW } = useWindowDimensions();
  // Превью адаптивное: ширина экрана минус горизонтальные паддинги (16+16 на ScrollView,
  // плюс 1.2px рамка с каждой стороны), и не более 460 для планшетов/web.
  const previewWidth = Math.min(460, Math.max(220, winW - 40));
  const certificateSvgRef = useRef<InstanceType<typeof Svg> | null>(null);

  // Дефолт — пустое имя, чтобы при первом открытии конструктора admin
  // не видел залипшее «Anna Levchenko» (оно осталось бы и в дочернем
  // ExamResultPreviewAdminModal как «вид после экзамена»). Имя задаётся
  // явно: либо вводом в поле NAME, либо тапом по пресету «Excellent · 96%».
  const [name, setName] = useState('');
  const [score, setScore] = useState('48');
  const [total, setTotal] = useState('50');
  const [pct, setPct] = useState('96');
  const [lang, setLang] = useState<CertLang>('ru');
  const [completedAt, setCompletedAt] = useState<number>(Date.now());
  const [certId, setCertId] = useState<string>('PHM-2026-PREVIEW');
  const [stored, setStored] = useState<LingmanCertificate | null>(null);
  const [resultPreviewVisible, setResultPreviewVisible] = useState(false);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      const cur = await loadLingmanCertificate();
      setStored(cur);
      if (cur) {
        setName(cur.name);
        setScore(String(cur.score));
        setTotal(String(cur.total));
        setPct(String(cur.pct));
        setLang(cur.lang);
        setCompletedAt(cur.completedAt);
        setCertId(cur.certId);
      } else {
        // Дефолт без stored cert — берём «No name · 88%», чтобы конструктор
        // открывался с CTA-видом, а не с чужим именем. Цифры из этого пресета
        // дают реалистичный пример (88%, 44/50). Admin может тапнуть любой
        // другой пресет для проверки WITH-NAME состояния.
        const c = PRESETS[3]!.cert();
        setName(c.name);
        setScore(String(c.score));
        setTotal(String(c.total));
        setPct(String(c.pct));
        setLang(c.lang);
        setCompletedAt(c.completedAt);
        setCertId(c.certId);
      }
    })();
  }, [visible]);

  const cert = useMemo<LingmanCertificate>(() => {
    const sNum = Math.max(0, Math.min(999, Number(score) || 0));
    const tNum = Math.max(1, Math.min(999, Number(total) || 1));
    const pNum = Math.max(0, Math.min(100, Number(pct) || 0));
    return {
      name: name || '',
      score: sNum,
      total: tNum,
      pct: pNum,
      completedAt,
      certId,
      lang,
    };
  }, [name, score, total, pct, completedAt, certId, lang]);

  const applyPreset = (p: typeof PRESETS[number]) => {
    hapticTap();
    const c = p.cert();
    setName(c.name);
    setScore(String(c.score));
    setTotal(String(c.total));
    setPct(String(c.pct));
    setLang(c.lang);
    setCompletedAt(c.completedAt);
    setCertId(c.certId);
  };

  const handleShare = async () => {
    hapticTap();
    const msg = buildCertificateShareMessage(cert.lang, cert.name, cert.pct, STORE_URL);
    await shareCardFromSvgRef(certificateSvgRef, {
      fileNamePrefix: `phraseman-certificate-${cert.certId}`,
      textFallback: msg,
      width: 1500,
      height: 1080,
    });
  };

  const handleSeed = async () => {
    hapticTap();
    await saveLingmanCertificate(cert);
    setStored(cert);
    emitAppEvent(
      'action_toast',
      actionToastTri('success', {
        ru: 'Сертификат сохранён в AsyncStorage',
        uk: 'Сертифікат збережено в AsyncStorage',
        es: 'Certificado guardado en AsyncStorage.',
      }),
    );
  };

  const handleClear = async () => {
    hapticTap();
    await AsyncStorage.removeItem(LINGMAN_CERT_STORAGE_KEY);
    setStored(null);
    emitAppEvent(
      'action_toast',
      actionToastTri('info', {
        ru: 'Сохранённый сертификат удалён',
        uk: 'Збережений сертифікат видалено',
        es: 'Se eliminó el certificado guardado.',
      }),
    );
  };

  const handleReloadStored = async () => {
    hapticTap();
    const cur = await loadLingmanCertificate();
    setStored(cur);
    if (cur) {
      setName(cur.name);
      setScore(String(cur.score));
      setTotal(String(cur.total));
      setPct(String(cur.pct));
      setLang(cur.lang);
      setCompletedAt(cur.completedAt);
      setCertId(cur.certId);
      emitAppEvent(
        'action_toast',
        actionToastTri('success', {
          ru: 'Загружено из AsyncStorage',
          uk: 'Завантажено з AsyncStorage',
          es: 'Cargado desde AsyncStorage.',
        }),
      );
    } else {
      emitAppEvent(
        'action_toast',
        actionToastTri('info', {
          ru: 'Сертификат не сохранён',
          uk: 'Сертифікат не збережено',
          es: 'No hay ningún certificado guardado.',
        }),
      );
    }
  };

  const handleNewId = () => {
    hapticTap();
    const fresh = buildLingmanCertificate({
      name: cert.name,
      score: cert.score,
      total: cert.total,
      pct: cert.pct,
      lang: cert.lang,
    });
    setCompletedAt(fresh.completedAt);
    setCertId(fresh.certId);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bgPrimary }}>
        {/* Hidden 1080×1080 for share-export */}
        <View
          pointerEvents="none"
          collapsable={false}
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, left: 0, top: 0, zIndex: -1, overflow: 'hidden' }}
        >
          <LingmanCertificateSvg
            ref={certificateSvgRef}
            name={cert.name}
            score={cert.score}
            total={cert.total}
            pct={cert.pct}
            certId={cert.certId}
            completedAt={cert.completedAt}
            lang={cert.lang}
            layoutWidth={1500}
          />
        </View>

        <View style={[styles.header, { borderBottomColor: t.border }]}>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={28} color={t.textPrimary} />
          </TouchableOpacity>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginLeft: 12, flex: 1 }}>
            Cert preview · admin
          </Text>
          <View style={[styles.statusPill, { borderColor: stored ? '#22c55e' : '#f97316' }]}>
            <Text style={{ color: stored ? '#22c55e' : '#f97316', fontSize: f.caption, fontWeight: '700' }}>
              {stored ? 'STORED' : 'EMPTY'}
            </Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
          {/* Превью */}
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={{ borderRadius: 14, overflow: 'hidden', borderWidth: 1.2, borderColor: '#d4a017' }}>
              <LingmanCertificateSvg
                name={cert.name}
                score={cert.score}
                total={cert.total}
                pct={cert.pct}
                certId={cert.certId}
                completedAt={cert.completedAt}
                lang={cert.lang}
                layoutWidth={previewWidth}
              />
            </View>
            <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 6 }}>
              ID: {cert.certId} · {formatCertDate(cert.completedAt, cert.lang)}
            </Text>
          </View>

          {/* Пресеты */}
          <Text style={[styles.sectionTitle, { color: t.textSecond, fontSize: f.label }]}>PRESETS</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {PRESETS.map(p => (
              <TouchableOpacity
                key={p.label}
                style={[styles.chip, { backgroundColor: t.bgCard, borderColor: t.border }]}
                onPress={() => applyPreset(p)}
                activeOpacity={0.7}
              >
                <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '600' }}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Поля */}
          <Text style={[styles.sectionTitle, { color: t.textSecond, fontSize: f.label }]}>FIELDS</Text>

          <Field label="Name" value={name} onChange={(v) => setName(v.slice(0, LINGMAN_CERT_NAME_MAX_LEN))} t={t} f={f} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Field label="Score" value={score} onChange={setScore} keyboardType="number-pad" t={t} f={f} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Total" value={total} onChange={setTotal} keyboardType="number-pad" t={t} f={f} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="%" value={pct} onChange={setPct} keyboardType="number-pad" t={t} f={f} />
            </View>
          </View>
          <Field label="Cert ID" value={certId} onChange={setCertId} t={t} f={f} />

          {/* Lang switch */}
          <View style={{ marginTop: 6, marginBottom: 14 }}>
            <Text style={{ color: t.textMuted, fontSize: f.caption, marginBottom: 6, letterSpacing: 1 }}>LANG</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(['ru', 'uk', 'es'] as CertLang[]).map(L => (
                <Pressable
                  key={L}
                  onPress={() => { hapticTap(); setLang(L); }}
                  style={[
                    styles.langChip,
                    { borderColor: lang === L ? '#d4a017' : t.border, backgroundColor: lang === L ? 'rgba(212,160,23,0.12)' : t.bgCard },
                  ]}
                >
                  <Text style={{ color: lang === L ? '#FFD700' : t.textPrimary, fontWeight: '700' }}>{L.toUpperCase()}</Text>
                </Pressable>
              ))}
              <TouchableOpacity
                style={[styles.langChip, { borderColor: t.border, backgroundColor: t.bgCard, marginLeft: 'auto' }]}
                onPress={handleNewId}
                activeOpacity={0.7}
              >
                <Text style={{ color: t.textSecond, fontWeight: '600' }}>New ID + date</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Действия */}
          <Text style={[styles.sectionTitle, { color: t.textSecond, fontSize: f.label }]}>ACTIONS</Text>
          <ActionButton icon="eye-outline" label="Показать экран после экзамена"
            sub="Что юзер видит: «Экзамен завершён», темы, карточка сертификата + модалка ввода имени"
            onPress={() => { hapticTap(); setResultPreviewVisible(true); }} t={t} f={f} />
          <ActionButton icon="share-outline" label="Поделиться этим превью (PNG 1080×1080)"
            onPress={handleShare} t={t} f={f} primary />
          <ActionButton icon="save-outline" label="Сохранить в AsyncStorage как мой сертификат"
            sub="Сразу появится на /exam при следующем заходе"
            onPress={handleSeed} t={t} f={f} />
          <ActionButton icon="reload-outline" label="Перечитать из AsyncStorage"
            sub="Сбросить локальные правки полей"
            onPress={handleReloadStored} t={t} f={f} />
          <ActionButton icon="trash-outline" label="Удалить сохранённый сертификат"
            sub="Юзер снова попадёт на intro экзамена"
            onPress={handleClear} t={t} f={f} danger />

          {Platform.OS === 'web' && (
            <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 14, textAlign: 'center' }}>
              На web SVG → PNG может не работать; используй native dev-build для проверки шеринга.
            </Text>
          )}
        </ScrollView>
      </SafeAreaView>

      <ExamResultPreviewAdminModal
        visible={resultPreviewVisible}
        onClose={() => setResultPreviewVisible(false)}
        cert={cert}
      />
    </Modal>
  );
}

function Field({ label, value, onChange, keyboardType, t, f }: {
  label: string; value: string; onChange: (v: string) => void;
  keyboardType?: 'default' | 'number-pad';
  t: any; f: any;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ color: t.textMuted, fontSize: f.caption, marginBottom: 4, letterSpacing: 1 }}>{label.toUpperCase()}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          color: t.textPrimary,
          backgroundColor: t.bgCard,
          borderColor: t.border,
          borderWidth: 1,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: f.body,
        }}
      />
    </View>
  );
}

function ActionButton({ icon, label, sub, onPress, t, f, primary, danger }: {
  icon: string; label: string; sub?: string; onPress: () => void;
  t: any; f: any; primary?: boolean; danger?: boolean;
}) {
  const fg = danger ? '#FF6B6B' : primary ? '#FFD700' : t.textPrimary;
  const bg = primary ? '#B8860B' : danger ? 'rgba(255,107,107,0.08)' : t.bgCard;
  const bd = primary ? '#FFD700' : danger ? 'rgba(255,107,107,0.45)' : t.border;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: bg,
        borderColor: bd, borderWidth: 1,
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8,
      }}
    >
      <Ionicons name={icon as any} size={20} color={fg} style={{ marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: fg, fontSize: f.bodyLg, fontWeight: '700' }}>{label}</Text>
        {sub && <Text style={{ color: danger ? '#FF9090' : t.textMuted, fontSize: f.caption, marginTop: 2 }}>{sub}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={fg} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  sectionTitle: {
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  langChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
});
