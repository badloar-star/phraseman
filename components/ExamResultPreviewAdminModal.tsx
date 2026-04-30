import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import LingmanCertificateSvg from './share_cards/LingmanCertificateSvg';
import QuizShareCardSvg from './share_cards/QuizShareCardSvg';
import { shareCardFromSvgRef } from './share_cards/shareCardPng';
import CertificateNameModal from './CertificateNameModal';
import XpGainBadge from './XpGainBadge';
import ScreenGradient from './ScreenGradient';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { hapticTap } from '../hooks/use-haptics';
import { buildExamShareMessage, buildCertificateShareMessage } from '../app/exam_share';
import { STORE_URL } from '../app/config';
import type { LingmanCertificate } from '../app/exam_certificate';
import { REPORT_SCREENS_RUSSIAN_ONLY } from '../constants/report_ui_ru';
import { bundleLang, triLang } from '../constants/i18n';
import type { ShareCardLang } from './share_cards/streakCardCopy';

type Props = {
  visible: boolean;
  onClose: () => void;
  cert: LingmanCertificate;
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

export default function ExamResultPreviewAdminModal({ visible, onClose, cert }: Props) {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const { width: winW } = useWindowDimensions();

  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [mountExportExam, setMountExportExam] = useState(false);
  const [mountExportCert, setMountExportCert] = useState(false);

  const certificateSvgRef = useRef<InstanceType<typeof Svg> | null>(null);
  const examCardSvgRef = useRef<InstanceType<typeof Svg> | null>(null);

  const waitTwoFrames = () =>
    new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

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

  const cardLang: ShareCardLang = REPORT_SCREENS_RUSSIAN_ONLY ? 'ru' : bundleLang(lang);

  const handleShareExam = async () => {
    hapticTap();
    const msg = buildExamShareMessage(
      bundleLang(lang),
      cert.score,
      cert.total,
      cert.pct,
      STORE_URL,
    );
    setMountExportExam(true);
    try {
      await waitTwoFrames();
      await shareCardFromSvgRef(examCardSvgRef, {
        fileNamePrefix: 'phraseman-exam-preview',
        textFallback: msg,
      });
    } finally {
      setMountExportExam(false);
    }
  };

  const handleShareCert = async () => {
    hapticTap();
    if (!hasName) {
      // Превью без имени шарить нельзя — попадёт PNG с пустой подписью.
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
          {/* Скрытые SVG для шеринга PNG: монтируются только в момент шеринга,
              чтобы тяжёлый сертификат + quiz-карточка не висели в дереве. */}
          {(mountExportExam || mountExportCert) && (
            <View
              pointerEvents="none"
              collapsable={false}
              style={styles.hiddenExport}
            >
              {mountExportExam && (
                <QuizShareCardSvg
                  ref={examCardSvgRef}
                  right={cert.score}
                  total={cert.total}
                  pct={cert.pct}
                  lang={cardLang}
                  mode="exam"
                  layoutSize={1080}
                />
              )}
              {mountExportCert && hasName && (
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
              )}
            </View>
          )}

          {/* Admin-шапка превью (не отображается юзеру в проде) */}
          <View style={[styles.adminHeader, { borderBottomColor: t.border }]}>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={26} color={t.textPrimary} />
            </TouchableOpacity>
            <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '700', marginLeft: 12, flex: 1 }}>
              Preview · экран после экзамена
            </Text>
            <TouchableOpacity
              onPress={() => { hapticTap(); setShowCert(s => !s); }}
              style={[styles.toggleBtn, { borderColor: showCert ? '#22c55e' : '#f97316' }]}
            >
              <Text style={{ color: showCert ? '#22c55e' : '#f97316', fontSize: f.caption, fontWeight: '700' }}>
                {showCert ? (hasName ? 'WITH CERT' : 'CTA ONLY') : 'NO CERT'}
              </Text>
            </TouchableOpacity>
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
              {triLang(lang, { ru: 'Экзамен завершён!', uk: 'Іспит завершено!', es: '¡Examen terminado!' })}
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
                {triLang(lang, { ru: 'Результаты по темам', uk: 'Результати по темах', es: 'Resultados por temas' })}
              </Text>
              {topics.map((q, i) => (
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
                    {triLang(lang, { ru: q.topic, uk: q.topicUK, es: q.topicES })}
                  </Text>
                </View>
              ))}
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
                  <Text style={{ color: '#FFD700', fontSize: f.bodyLg, fontWeight: '800', letterSpacing: 1.2 }}>
                    {triLang(lang, { ru: 'СЕРТИФИКАТ', uk: 'СЕРТИФІКАТ', es: 'CERTIFICADO' })}
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
                  <Text style={{ color: '#FFD700', fontSize: f.bodyLg, fontWeight: '700' }}>
                    {triLang(lang, {
                      ru: 'Поделиться сертификатом',
                      uk: 'Поділитися сертифікатом',
                      es: 'Compartir certificado',
                    })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ paddingVertical: 8 }}
                  onPress={() => { hapticTap(); setNameModalVisible(true); }}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: '#FDE68A', fontSize: f.sub, textDecorationLine: 'underline' }}>
                    {triLang(lang, {
                      ru: 'Изменить имя на сертификате',
                      uk: 'Змінити ім\u02BCя на сертифікаті',
                      es: 'Cambiar el nombre en el diploma',
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {showCert && !hasName && (
              // Имени нет — диплом НЕ показываем, только CTA на ввод. Так и
              // должен видеть юзер на боевом экране: без имени никакой PNG-ни-
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
                  <Text style={{ color: '#FFD700', fontSize: f.bodyLg, fontWeight: '800', letterSpacing: 1.2 }}>
                    PHRASEMAN B2
                  </Text>
                </View>
                <Text style={{ color: '#FDE68A', fontSize: f.body, textAlign: 'center', lineHeight: f.body * 1.4 }}>
                  {triLang(lang, {
                    ru: 'Укажите имя — и ваш сертификат появится здесь. Без имени награда не показывается.',
                    uk: 'Вкажіть ім\u02BCя — і ваш сертифікат з\u02BCявиться тут. Без імені нагорода не показується.',
                    es: 'Indica tu nombre y tu diploma aparecerá aquí. Sin nombre no mostramos la recompensa.',
                  })}
                </Text>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  backgroundColor: '#B8860B', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18,
                  borderWidth: 1, borderColor: '#FFD700', width: '100%', marginTop: 6,
                }}>
                  <Ionicons name="create-outline" size={18} color="#FFD700" />
                  <Text style={{ color: '#FFD700', fontSize: f.bodyLg, fontWeight: '700' }}>
                    {triLang(lang, {
                      ru: 'Указать имя на награде',
                      uk: 'Вказати ім\u02BCя на нагороді',
                      es: 'Indicar nombre en el diploma',
                    })}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

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
                  ru: '🔄 Попробовать ещё раз',
                  uk: '🔄 Спробувати ще раз',
                  es: '🔄 Intentar de nuevo',
                })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginBottom: 4 }}
              onPress={() => { void handleShareExam(); }}
              activeOpacity={0.85}
            >
              <Ionicons name="share-outline" size={18} color={t.textSecond} />
              <Text style={{ color: t.textSecond, fontSize: f.bodyLg }}>
                {triLang(lang, { ru: 'Поделиться результатом', uk: 'Поділитися результатом', es: 'Compartir el resultado' })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ padding: 14 }} onPress={onClose} activeOpacity={0.7}>
              <Text style={{ color: t.textSecond, fontSize: f.bodyLg, textDecorationLine: 'underline' }}>
                {triLang(lang, { ru: 'На главную', uk: 'На головну', es: 'Volver al inicio' })}
              </Text>
            </TouchableOpacity>

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
  hiddenExport: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    left: 0,
    top: 0,
    zIndex: -1,
    overflow: 'hidden',
  },
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
