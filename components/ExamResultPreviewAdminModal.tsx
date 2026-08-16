import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo, useRef, useState } from 'react';
import {
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import DuoPressable from './DuoPressable';
import PressableHybrid from './PressableHybrid';
import Svg from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import LingmanCertificateSvg from './share_cards/LingmanCertificateSvg';
import { shareCardFromSvgRef } from './share_cards/shareCardPng';
import CertificateNameModal from './CertificateNameModal';
import XpGainBadge from './XpGainBadge';
import ScreenGradient from './ScreenGradient';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { monoIcon } from '../constants/monoIcon';
import { hapticTap } from '../hooks/use-haptics';
import { buildExamShareMessage, buildCertificateShareMessage } from '../app/exam_share';
import { STORE_URL } from '../app/config';
import type { LingmanCertificate } from '../app/exam_certificate';
import { bundleLang, triLang } from '../constants/i18n';

type Props = {
  visible: boolean;
  onClose: () => void;
  cert: LingmanCertificate;
  /** dev-only: витрина движения запускает гибрид «Световод» рядом с боевым видом. Default 'classic'. */
  motionVariant?: 'classic' | 'hybrid';
};

// Демо-список тем для разбивки результатов в превью.
// Имитируем реалистичный профиль: большинство корректных + несколько ошибок.
const STUB_TOPICS: Array<{ topic: string; topicUK: string; topicES: string; correct: boolean }> = [
  { topic: 'Глагол be',                  topicUK: 'Дієслово be',           topicES: 'El verbo be',           correct: true  },
  { topic: 'Present Simple',             topicUK: 'Present Simple',        topicES: 'Present Simple',       correct: true  },
  { topic: 'Артикль a/an/the',           topicUK: 'Артикль a/an/the',      topicES: 'El artículo a/an/the', correct: true  },
  { topic: 'Множественное число',        topicUK: 'Множина',               topicES: 'Plural',               correct: false },
  { topic: 'Местоимения',                topicUK: 'Займенники',            topicES: 'Pronombres',            correct: true  },
  { topic: 'Past Simple',                topicUK: 'Past Simple',         topicES: 'Past Simple',          correct: true  },
  { topic: 'Will / Future',              topicUK: 'Will / Future',         topicES: 'Will / futuro',        correct: true  },
  { topic: 'Модальные can/must',         topicUK: 'Модальні can/must',     topicES: 'Modales can/must',     correct: true  },
  { topic: 'Сравнительная степень',      topicUK: 'Ступінь порівняння',    topicES: 'Comparativos',         correct: false },
  { topic: 'Present Continuous',         topicUK: 'Present Continuous',  topicES: 'Present Continuous',   correct: true  },
  { topic: 'Предлоги места',             topicUK: 'Прийменники місця',     topicES: 'Preposiciones de lugar', correct: true  },
  { topic: 'Some / any',                 topicUK: 'Some / any',            topicES: 'Some / any',           correct: true  },
  { topic: 'There is / there are',       topicUK: 'There is / there are',  topicES: 'There is / there are', correct: true  },
  { topic: 'Притяжательные',             topicUK: 'Присвійні',             topicES: 'Adjetivos posesivos', correct: true  },
  { topic: 'Past Continuous',            topicUK: 'Past Continuous',     topicES: 'Past Continuous',     correct: true  },
  { topic: 'Going to',                   topicUK: 'Going to',              topicES: 'Going to',              correct: true  },
  { topic: 'Условные I типа',            topicUK: 'Умовні I типу',         topicES: 'Condicional tipo I',    correct: true  },
  { topic: 'Герундий (-ing)',            topicUK: 'Герундій (-ing)',       topicES: 'Gerundio (-ing)',       correct: true  },
  { topic: 'Inf / -ing',                 topicUK: 'Inf / -ing',            topicES: 'Infinitivo / -ing',     correct: true  },
  { topic: 'Present Perfect',            topicUK: 'Present Perfect',     topicES: 'Present Perfect',       correct: true  },
];

type PlannedTopicCopy = {
  'pt-BR': string;
  vi: string;
  id: string;
  tr: string;
  pl: string;
};

const STUB_TOPIC_PLANNED: Record<string, PlannedTopicCopy> = {
  'Глагол be': { 'pt-BR': 'Verbo be', vi: 'Động từ be', id: 'Kata kerja be', tr: 'be fiili', pl: 'Czasownik be' },
  'Present Simple': { 'pt-BR': 'Present Simple', vi: 'Present Simple', id: 'Present Simple', tr: 'Present Simple', pl: 'Present Simple' },
  'Артикль a/an/the': { 'pt-BR': 'Artigo a/an/the', vi: 'Mạo từ a/an/the', id: 'Artikel a/an/the', tr: 'a/an/the artikelleri', pl: 'Przedimki a/an/the' },
  'Множественное число': { 'pt-BR': 'Plural', vi: 'Số nhiều', id: 'Bentuk jamak', tr: 'Çoğul', pl: 'Liczba mnoga' },
  'Местоимения': { 'pt-BR': 'Pronomes', vi: 'Đại từ', id: 'Kata ganti', tr: 'Zamirler', pl: 'Zaimki' },
  'Past Simple': { 'pt-BR': 'Past Simple', vi: 'Past Simple', id: 'Past Simple', tr: 'Past Simple', pl: 'Past Simple' },
  'Will / Future': { 'pt-BR': 'Will / futuro', vi: 'Will / tương lai', id: 'Will / future', tr: 'Will / gelecek', pl: 'Will / przyszłość' },
  'Модальные can/must': { 'pt-BR': 'Modais can/must', vi: 'Động từ khuyết thiếu can/must', id: 'Modal can/must', tr: 'Can/must modal fiilleri', pl: 'Czasowniki modalne can/must' },
  'Сравнительная степень': { 'pt-BR': 'Comparativos', vi: 'Dạng so sánh hơn', id: 'Tingkat perbandingan', tr: 'Karşılaştırma derecesi', pl: 'Stopień wyższy' },
  'Present Continuous': { 'pt-BR': 'Present Continuous', vi: 'Present Continuous', id: 'Present Continuous', tr: 'Present Continuous', pl: 'Present Continuous' },
  'Предлоги места': { 'pt-BR': 'Preposições de lugar', vi: 'Giới từ chỉ nơi chốn', id: 'Preposisi tempat', tr: 'Yer edatları', pl: 'Przyimki miejsca' },
  'Some / any': { 'pt-BR': 'Some / any', vi: 'Some / any', id: 'Some / any', tr: 'Some / any', pl: 'Some / any' },
  'There is / there are': { 'pt-BR': 'There is / there are', vi: 'There is / there are', id: 'There is / there are', tr: 'There is / there are', pl: 'There is / there are' },
  'Притяжательные': { 'pt-BR': 'Possessivos', vi: 'Từ sở hữu', id: 'Possessive', tr: 'İyelik yapıları', pl: 'Formy dzierżawcze' },
  'Past Continuous': { 'pt-BR': 'Past Continuous', vi: 'Past Continuous', id: 'Past Continuous', tr: 'Past Continuous', pl: 'Past Continuous' },
  'Going to': { 'pt-BR': 'Going to', vi: 'Going to', id: 'Going to', tr: 'Going to', pl: 'Going to' },
  'Условные I типа': { 'pt-BR': 'Condicional tipo I', vi: 'Câu điều kiện loại 1', id: 'Conditional type I', tr: '1. tip koşul cümlesi', pl: 'Pierwszy tryb warunkowy' },
  'Герундий (-ing)': { 'pt-BR': 'Gerúndio (-ing)', vi: 'Danh động từ (-ing)', id: 'Gerund (-ing)', tr: 'Gerund (-ing)', pl: 'Gerundium (-ing)' },
  'Inf / -ing': { 'pt-BR': 'Infinitivo / -ing', vi: 'Infinitive / -ing', id: 'Infinitive / -ing', tr: 'Infinitive / -ing', pl: 'Infinitive / -ing' },
  'Present Perfect': { 'pt-BR': 'Present Perfect', vi: 'Present Perfect', id: 'Present Perfect', tr: 'Present Perfect', pl: 'Present Perfect' },
};

const plannedTopicFor = (topic: string): PlannedTopicCopy =>
  STUB_TOPIC_PLANNED[topic] ?? { 'pt-BR': topic, vi: topic, id: topic, tr: topic, pl: topic };

export default function ExamResultPreviewAdminModal({ visible, onClose, cert, motionVariant = 'classic' }: Props) {
  const { theme: t, f, themeMode } = useTheme();
  const { lang } = useLang();
  const { width: winW } = useWindowDimensions();
  const isHybrid = motionVariant === 'hybrid';

  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [mountExportCert, setMountExportCert] = useState(false);
  const certificateSvgRef = useRef<InstanceType<typeof Svg> | null>(null);

  // На реальном экране результат — всегда есть сертификат после прохождения.
  // Но у юзера он может быть «без имени» — это нормальный кейс, имя ставится модалкой.
  // Показываем оба сценария: переключатель «с сертификатом / без».
  const [showCert, setShowCert] = useState(true);
  /**
   * Локально введённое имя в превью.
   * ВСЕГДА стартует пустым — ровно как у юзера после реальной сдачи экзамена
   * (см. app/exam.tsx: cert создаётся с `name: ''`, и до явного ввода имени
   * в CertificateNameModal никакого диплома показывать нельзя — иначе юзер
   * либо видит чужое имя из пресета, либо случайно расшарит пустую подпись).
   * Имя из переданного cert.name — это данные cert-конструктора (admin может
   * заполнить «Anna Levchenko» в полях), но превью эмулирует JUST-PASSED-EXAM,
   * где имени ещё нет. Чтобы протестировать WITH-NAME состояние — admin тапает
   * «Указать имя на награде» и вводит имя.
   */
  const [enteredName, setEnteredName] = useState<string>('');
  // При повторном открытии превью (visible снова true) сбрасываем введённое
  // имя обратно в '' — каждый запуск превью начинается с CTA-состояния.
  React.useEffect(() => { if (visible) setEnteredName(''); }, [visible]);
  // Эффективный cert для рендера в этом экране — с локально-введённым именем
  // (НЕ с cert.name из конструктора — иначе залипает «Anna Levchenko»).
  const effectiveCert = useMemo<LingmanCertificate>(
    () => ({ ...cert, name: enteredName }),
    [cert, enteredName],
  );
  const hasName = !!enteredName.trim();

  const waitTwoFrames = () =>
    new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

  // Адаптивная ширина превью карточки сертификата на «экране результата»
  // (внутри ScrollView с padding 24).
  const certCardWidth = Math.min(420, Math.max(220, winW - 96));

  const examXp = useMemo(
    () => (cert.pct >= 90 ? 10000 : 50 + Math.round(cert.pct / 2)),
    [cert.pct],
  );

  // Демо-вопросы под текущий total: берём из стаба, докручиваем правильные/неправильные
  // под cert.score, чтобы цифры в шапке и галочки в списке били друг с другом.
  const topics = useMemo(() => {
    const total = Math.max(1, Math.min(STUB_TOPICS.length, cert.total));
    const slice = STUB_TOPICS.slice(0, total).map(x => ({ ...x }));
    // Сначала всё считаем корректным, потом гасим (total - score) последних
    // тем — это даёт стабильный детерминированный вид.
    for (let i = 0; i < slice.length; i++) slice[i]!.correct = true;
    const wrong = Math.max(0, total - Math.min(cert.score, total));
    for (let i = slice.length - 1; i >= 0 && slice.length - 1 - i < wrong; i--) {
      slice[i]!.correct = false;
    }
    return slice;
  }, [cert.score, cert.total]);

  const handleShareExam = async () => {
    hapticTap();
    const msg = buildExamShareMessage(
      bundleLang(lang),
      cert.score,
      cert.total,
      cert.pct,
      STORE_URL,
    );
    await Share.share({ message: msg }).catch(() => {});
  };

  const handleShareCert = async () => {
    hapticTap();
    if (!hasName) {
      // Превью без имени шарить нельзя: подпись будет неполной.
      setNameModalVisible(true);
      return;
    }
    const msg = buildCertificateShareMessage(effectiveCert.lang, effectiveCert.name, effectiveCert.pct, STORE_URL);
    setMountExportCert(true);
    try {
      await waitTwoFrames();
      await shareCardFromSvgRef(certificateSvgRef, {
        fileNamePrefix: `phraseman-certificate-preview-${effectiveCert.certId}`,
        textFallback: msg,
        width: 1500,
        height: 1080,
      });
    } finally {
      setMountExportCert(false);
    }
  };

  const handleNameSave = (n: string) => {
    hapticTap();
    // Обновляем локальное имя в превью — ровно так, как видит юзер на проде:
    // после ввода имени диплом перерисовывается с этим именем (а до ввода
    // диплом вообще не рендерится, см. блок showCert ниже).
    setEnteredName(n);
    setNameModalVisible(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <ScreenGradient>
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          {mountExportCert && hasName && (
            <View
              pointerEvents="none"
              collapsable={false}
              style={{ position: 'absolute', width: 1, height: 1, opacity: 0, left: 0, top: 0, zIndex: -1, overflow: 'hidden' }}
            >
              <LingmanCertificateSvg
                ref={certificateSvgRef}
                name={effectiveCert.name}
                score={effectiveCert.score}
                total={effectiveCert.total}
                pct={effectiveCert.pct}
                certId={effectiveCert.certId}
                completedAt={effectiveCert.completedAt}
                lang={effectiveCert.lang}
                layoutWidth={1500}
              />
            </View>
          )}
          {/* Admin-шапка превью (не отображается юзеру в проде) */}
          <View style={[styles.adminHeader, { borderBottomColor: t.border }]}>
            {isHybrid ? (
              <PressableHybrid variant="icon" onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={triLang(lang, { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' })}>
                <Ionicons name="close" size={26} color={t.textPrimary} />
              </PressableHybrid>
            ) : (
              <TouchableOpacity onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={26} color={t.textPrimary} />
              </TouchableOpacity>
            )}
            <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700', marginLeft: 12, flex: 1 }}>
              Preview · экран после экзамена
            </Text>
            {isHybrid ? (
              <PressableHybrid
                variant="chip"
                onPress={() => { setShowCert(s => !s); }}
                style={[styles.toggleBtn, { backgroundColor: showCert ? 'rgba(34,197,94,0.14)' : 'rgba(249,115,22,0.14)' }]}
              >
                <Text style={{ color: showCert ? '#22c55e' : '#f97316', fontSize: f.caption, fontWeight: '700' }}>
                  {showCert ? (hasName ? 'WITH CERT' : 'CTA ONLY') : 'NO CERT'}
                </Text>
              </PressableHybrid>
            ) : (
              // guard-ok: classic-путь не трогаем (владелец не просил менять
              // существующий вид) — обводка-индикатор тут pre-existing.
              <TouchableOpacity
                onPress={() => { hapticTap(); setShowCert(s => !s); }}
                style={[styles.toggleBtn, { borderColor: showCert ? '#22c55e' : '#f97316' }]}
              >
                <Text style={{ color: showCert ? '#22c55e' : '#f97316', fontSize: f.caption, fontWeight: '700' }}>
                  {showCert ? (hasName ? 'WITH CERT' : 'CTA ONLY') : 'NO CERT'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Реальный визуал «phase === result» из app/exam.tsx */}
          <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center' }}>
            <View
              style={{
                width: 100, height: 100, borderRadius: 50,
                backgroundColor: t.bgCard, borderWidth: 1.5, borderColor: t.border,
                justifyContent: 'center', alignItems: 'center',
                marginTop: 20, marginBottom: 20,
              }}
            >
              <Ionicons name="ribbon" size={44} color={t.textSecond} />
            </View>
            <Text style={{ color: t.textPrimary, fontSize: f.numLg, fontWeight: '700', marginBottom: 8 }}>
              {triLang(lang, { ru: 'Экзамен завершён!', uk: 'Іспит завершено!', es: '¡Examen terminado!', 'pt-BR': 'Exame concluído!', vi: 'Bài kiểm tra đã hoàn tất!', id: 'Ujian selesai!', tr: 'Sınav tamamlandı!', pl: 'Egzamin ukończony!' })}
            </Text>
            <Text style={{ color: t.textSecond, fontSize: f.h2, marginBottom: 24 }}>
              {cert.score} / {cert.total} — {cert.pct}%
            </Text>
            <View style={{ marginBottom: 16 }}>
              <XpGainBadge amount={examXp} visible={true} />
            </View>

            <View
              style={{
                backgroundColor: t.bgCard, borderRadius: 16, padding: 20,
                borderWidth: 0.5, borderColor: t.border, width: '100%', marginBottom: 16,
              }}
            >
              <Text style={{ color: t.textMuted, fontSize: f.caption, marginBottom: 12, textAlign: 'center' }}>
                {triLang(lang, { ru: 'Результаты по темам', uk: 'Результати по темах', es: 'Resultados por temas', 'pt-BR': 'Resultados por tema', vi: 'Kết quả theo chủ đề', id: 'Hasil per topik', tr: 'Konuya göre sonuçlar', pl: 'Wyniki według tematów' })}
              </Text>
              {topics.map((q, i) => {
                const planned = plannedTopicFor(q.topic);
                return (
                  <View
                    key={i}
                    style={{
                      flexDirection: 'row', alignItems: 'center', paddingVertical: 6,
                      borderBottomWidth: i < topics.length - 1 ? 0.5 : 0, borderBottomColor: t.border,
                    }}
                  >
                    <Ionicons
                      name={q.correct ? 'checkmark-circle' : 'close-circle'}
                      size={16}
                      color={q.correct ? t.correct : t.wrong}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={{ color: t.textMuted, fontSize: f.label, marginRight: 6, width: 26 }}>{i + 1}.</Text>
                    <Text style={{ color: q.correct ? t.textPrimary : t.textSecond, fontSize: f.sub, flex: 1 }}>
                      {triLang(lang, { ru: q.topic, uk: q.topicUK, es: q.topicES, 'pt-BR': planned['pt-BR'], vi: planned.vi, id: planned.id, tr: planned.tr, pl: planned.pl })}
                    </Text>
                  </View>
                );
              })}
            </View>

            {showCert && hasName && (
              // Имя введено — показываем сам диплом + кнопки.
              <View
                style={{
                  backgroundColor: '#0a1620', borderRadius: 18, padding: 18,
                  borderWidth: 1.2, borderColor: '#d4a017', width: '100%',
                  alignItems: 'center', marginBottom: 16,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Ionicons name="ribbon" size={22} color="#FFD700" />
                  <Text style={{ color: monoIcon(themeMode, '#FFD700'), fontSize: f.bodyLg, fontWeight: '800', letterSpacing: 1.2 }}>
                    {triLang(lang, { ru: 'СЕРТИФИКАТ', uk: 'СЕРТИФІКАТ', es: 'CERTIFICADO', 'pt-BR': 'CERTIFICADO', vi: 'CHỨNG CHỈ', id: 'SERTIFIKAT', tr: 'SERTİFİKA', pl: 'CERTYFIKAT' })}
                  </Text>
                </View>
                <View style={{ borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#d4a017', marginBottom: 12 }}>
                  <LingmanCertificateSvg
                    name={effectiveCert.name}
                    score={effectiveCert.score}
                    total={effectiveCert.total}
                    pct={effectiveCert.pct}
                    certId={effectiveCert.certId}
                    completedAt={effectiveCert.completedAt}
                    lang={effectiveCert.lang}
                    layoutWidth={certCardWidth}
                  />
                </View>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                    backgroundColor: '#B8860B', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18,
                    borderWidth: 1, borderColor: '#FFD700', width: '100%', marginBottom: 8,
                  }}
                  onPress={() => { void handleShareCert(); }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="share-outline" size={18} color="#FFD700" />
                  <Text style={{ color: monoIcon(themeMode, '#FFD700'), fontSize: f.bodyLg, fontWeight: '700' }}>
                    {triLang(lang, {
                      ru: 'Поделиться сертификатом',
                      uk: 'Поділитися сертифікатом',
                      es: 'Compartir certificado',
                      'pt-BR': 'Compartilhar certificado',
                      vi: 'Chia sẻ chứng chỉ',
                      id: 'Bagikan sertifikat',
                      tr: 'Sertifikayı paylaş',
                      pl: 'Udostępnij certyfikat',
                    })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ paddingVertical: 8 }}
                  onPress={() => { hapticTap(); setNameModalVisible(true); }}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: monoIcon(themeMode, '#FDE68A'), fontSize: f.sub, textDecorationLine: 'underline' }}>
                    {triLang(lang, {
                      ru: 'Изменить имя на сертификате',
                      uk: 'Змінити ім\u02BCя на сертифікаті',
                      es: 'Cambiar el nombre en el diploma',
                      'pt-BR': 'Alterar nome no certificado',
                      vi: 'Đổi tên trên chứng chỉ',
                      id: 'Ubah nama di sertifikat',
                      tr: 'Sertifikadaki adı değiştir',
                      pl: 'Zmień imię na certyfikacie',
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {showCert && !hasName && (
              // Имени нет — диплом НЕ показываем, только CTA на ввод. Так и
              // должен видеть юзер на боевом экране: без имени никакой
              // подписи на дипломе он не получит.
              <TouchableOpacity
                activeOpacity={0.88}
                onPress={() => { hapticTap(); setNameModalVisible(true); }}
                style={{
                  backgroundColor: '#0a1620', borderRadius: 18, padding: 20,
                  borderWidth: 1.2, borderColor: '#d4a017', width: '100%',
                  alignItems: 'center', marginBottom: 16, gap: 10,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="ribbon" size={22} color="#FFD700" />
                  <Text style={{ color: monoIcon(themeMode, '#FFD700'), fontSize: f.bodyLg, fontWeight: '800', letterSpacing: 1.2 }}>
                    PHRASEMAN B2
                  </Text>
                </View>
                <Text style={{ color: monoIcon(themeMode, '#FDE68A'), fontSize: f.body, textAlign: 'center', lineHeight: f.body * 1.4 }}>
                  {triLang(lang, {
                    ru: 'Укажи имя — и твой сертификат появится здесь. Без имени награда не показывается.',
                    uk: 'Вкажіть ім\u02BCя — і ваш сертифікат з\u02BCявиться тут. Без імені нагорода не показується.',
                    es: 'Indica tu nombre y tu diploma aparecerá aquí. Sin nombre no mostramos la recompensa.',
                    'pt-BR': 'Informe seu nome e o certificado aparecerá aqui. Sem nome, a recompensa não é exibida.',
                    vi: 'Nhập tên của bạn, chứng chỉ sẽ xuất hiện ở đây. Không có tên thì phần thưởng không hiển thị.',
                    id: 'Masukkan namamu, sertifikat akan muncul di sini. Tanpa nama, hadiah tidak ditampilkan.',
                    tr: 'Adını gir, sertifikan burada görünsün. İsim olmadan ödül gösterilmez.',
                    pl: 'Podaj imię, a certyfikat pojawi się tutaj. Bez imienia nagroda nie jest pokazywana.',
                  })}
                </Text>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  backgroundColor: '#B8860B', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18,
                  borderWidth: 1, borderColor: '#FFD700', width: '100%', marginTop: 6,
                }}>
                  <Ionicons name="create-outline" size={18} color="#FFD700" />
                  <Text style={{ color: monoIcon(themeMode, '#FFD700'), fontSize: f.bodyLg, fontWeight: '700' }}>
                    {triLang(lang, {
                      ru: 'Указать имя на награде',
                      uk: 'Вказати ім\u02BCя на нагороді',
                      es: 'Indicar nombre en el diploma',
                      'pt-BR': 'Informar nome no certificado',
                      vi: 'Nhập tên trên chứng chỉ',
                      id: 'Masukkan nama di sertifikat',
                      tr: 'Ödüle isim ekle',
                      pl: 'Podaj imię na nagrodzie',
                    })}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {isHybrid ? (
              <DuoPressable
                edgeColor={t.border}
                edgeHeight={5}
                style={{ backgroundColor: t.bgCard, borderRadius: 14, padding: 16, marginBottom: 12 }}
                onPress={() => {}}
              >
                <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '600' }}>
                  {triLang(lang, {
                    ru: 'Попробовать ещё раз',
                    uk: 'Спробувати ще раз',
                    es: 'Intentar de nuevo',
                    'pt-BR': 'Tentar novamente',
                    vi: 'Thử lại',
                    id: 'Coba lagi',
                    tr: 'Tekrar dene',
                    pl: 'Spróbuj ponownie',
                  })}
                </Text>
              </DuoPressable>
            ) : (
              <TouchableOpacity
                style={{
                  backgroundColor: t.bgCard, borderRadius: 14, padding: 16,
                  width: '100%', alignItems: 'center', borderWidth: 0.5, borderColor: t.border, marginBottom: 12,
                }}
                onPress={() => { hapticTap(); }}
                activeOpacity={0.85}
              >
                <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '600' }}>
                  {triLang(lang, {
                    ru: 'Попробовать ещё раз',
                    uk: 'Спробувати ще раз',
                    es: 'Intentar de nuevo',
                    'pt-BR': 'Tentar novamente',
                    vi: 'Thử lại',
                    id: 'Coba lagi',
                    tr: 'Tekrar dene',
                    pl: 'Spróbuj ponownie',
                  })}
                </Text>
              </TouchableOpacity>
            )}
            {isHybrid ? (
              <PressableHybrid
                variant="secondary"
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, marginBottom: 4 }}
                onPress={() => { void handleShareExam(); }}
              >
                <Ionicons name="share-outline" size={18} color={t.textSecond} />
                <Text style={{ color: t.textSecond, fontSize: f.bodyLg }}>
                  {triLang(lang, { ru: 'Поделиться результатом', uk: 'Поділитися результатом', es: 'Compartir el resultado', 'pt-BR': 'Compartilhar resultado', vi: 'Chia sẻ kết quả', id: 'Bagikan hasil', tr: 'Sonucu paylaş', pl: 'Udostępnij wynik' })}
                </Text>
              </PressableHybrid>
            ) : (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginBottom: 4 }}
                onPress={() => { void handleShareExam(); }}
                activeOpacity={0.85}
              >
                <Ionicons name="share-outline" size={18} color={t.textSecond} />
                <Text style={{ color: t.textSecond, fontSize: f.bodyLg }}>
                  {triLang(lang, { ru: 'Поделиться результатом', uk: 'Поділитися результатом', es: 'Compartir el resultado', 'pt-BR': 'Compartilhar resultado', vi: 'Chia sẻ kết quả', id: 'Bagikan hasil', tr: 'Sonucu paylaş', pl: 'Udostępnij wынik' })}
                </Text>
              </TouchableOpacity>
            )}
            {isHybrid ? (
              <PressableHybrid variant="secondary" style={{ padding: 14 }} onPress={onClose}>
                <Text style={{ color: t.textSecond, fontSize: f.bodyLg, textDecorationLine: 'underline', textAlign: 'center' }}>
                  {triLang(lang, { ru: 'На главную', uk: 'На головну', es: 'Volver al inicio', 'pt-BR': 'Ir para o início', vi: 'Về trang chính', id: 'Ke beranda', tr: 'Ana sayfaya dön', pl: 'Na stronę główną' })}
                </Text>
              </PressableHybrid>
            ) : (
              <TouchableOpacity style={{ padding: 14 }} onPress={onClose} activeOpacity={0.7}>
                <Text style={{ color: t.textSecond, fontSize: f.bodyLg, textDecorationLine: 'underline' }}>
                  {triLang(lang, { ru: 'На главную', uk: 'На головну', es: 'Volver al inicio', 'pt-BR': 'Ir para o início', vi: 'Về trang chính', id: 'Ke beranda', tr: 'Ana sayfaya dön', pl: 'Na stronę główną' })}
                </Text>
              </TouchableOpacity>
            )}

            {/* Admin-only: явно открыть модалку ввода имени */}
            <View style={{ height: 1, backgroundColor: t.border, alignSelf: 'stretch', marginVertical: 18, opacity: 0.5 }} />
            <TouchableOpacity
              style={[styles.adminAction, { backgroundColor: t.bgCard, borderColor: t.border }]}
              onPress={() => { hapticTap(); setNameModalVisible(true); }}
              activeOpacity={0.85}
            >
              <Ionicons name="create-outline" size={20} color={t.textPrimary} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }}>
                  Открыть модалку ввода имени
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 2 }}>
                  Тот же CertificateNameModal, который видит юзер при тапе «Добавить имя»
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
            </TouchableOpacity>
          </ScrollView>

          <CertificateNameModal
            visible={nameModalVisible}
            initialName={enteredName}
            onSave={handleNameSave}
            onSkip={() => setNameModalVisible(false)}
          />
        </SafeAreaView>
      </ScreenGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  adminHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  adminAction: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: '100%',
  },
});
