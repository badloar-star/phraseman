/**
 * ConsentReverifyHost — блокирующий модал ПОВТОРНОГО согласия для СУЩЕСТВУЮЩИХ
 * пользователей (которые уже прошли онбординг до введения возрастного гейта и
 * согласий, поэтому никогда не видели новый первый экран).
 *
 * Юридический смысл: чтобы привести всех пользователей к одному состоянию
 * (возраст известен + Terms/Privacy приняты + выбор по аналитике сделан), при
 * первом входе после обновления показываем модал, который НЕЛЬЗЯ закрыть, пока:
 *   1) указан год рождения,
 *   2) приняты Terms + Privacy (обязательно),
 *   3) сделан выбор по аналитике (разрешить/не сейчас — оба валидны).
 *
 * Возраст:
 *   - 16+ → полный доступ (adult);
 *   - 13–15 → безопасный режим (teen_safe) — НЕ выкидываем существующего юзера,
 *     но рискованные фичи выключатся (см. age_gate / safe-mode гейты);
 *   - <13 → under13 (доступ к рискованным фичам закрыт; жёсткого выхода из
 *     приложения для уже существующего аккаунта здесь не делаем — это решение
 *     продукта, безопасный режим уже отрезает чувствительные фичи).
 *
 * Текст мягкий, намекающий, что это для юридической защиты, без давления.
 *
 * Монтируется из _layout.tsx. Показывается ПОВЕРХ всего; не использует обычную
 * OverlayArbiter-логику дисмисса, т.к. должен блокировать интерфейс.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useLang } from './LangContext';
import { triLang, type Lang } from '../constants/i18n';
import {
  isPlausibleBirthYear,
  setBirthYear,
  hasAgeDecision,
} from '../app/age_gate';
import { setAnalyticsConsent, hasAnalyticsConsentDecision } from '../app/analytics_consent';
import { recordConsentToCloud } from '../app/age_consent_cloud';

const REVERIFY_DONE_KEY = 'consent_reverify_done_v1';

// ── Барабан выбора года (iOS-style wheel picker, без сторонних зависимостей) ──
const WHEEL_ITEM_HEIGHT = 44; // высота одной строки года
const WHEEL_VISIBLE_ROWS = 5; // нечётное: 2 сверху + центр + 2 снизу
const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ROWS;
const WHEEL_PAD_ROWS = Math.floor(WHEEL_VISIBLE_ROWS / 2); // пустые строки сверху/снизу

interface YearWheelProps {
  years: readonly number[]; // от новых к старым (сверху вниз)
  value: number;
  onChange: (year: number) => void;
}

/**
 * Прокручиваемый «барабан» лет с магнитной привязкой к центру (snap) и
 * подсветкой выбранного года в центральной рамке. Полностью заменяет ввод с
 * клавиатуры — пользователь просто крутит колесо, как на iPhone.
 */
function clampIndex(idx: number, len: number): number {
  return Math.min(Math.max(idx, 0), len - 1);
}

function YearWheel({ years, value, onChange }: YearWheelProps) {
  const scrollRef = useRef<ScrollView>(null);
  const initialIndex = Math.max(0, years.indexOf(value));

  // Активный индекс ведём ЛОКАЛЬНО и обновляем прямо во время скролла, чтобы
  // подсветка центрального года шла за пальцем без задержки (раньше она ждала
  // конца прокрутки, отсюда «не поспевает»).
  const [liveIndex, setLiveIndex] = useState(initialIndex);
  // Последний год, о котором уже сообщили родителю — чтобы не дёргать onChange
  // на каждый кадр скролла, только при реальной смене.
  const reportedIndexRef = useRef(initialIndex);

  // Установить колесо на стартовое значение при монтировании.
  useEffect(() => {
    const y = initialIndex * WHEEL_ITEM_HEIGHT;
    // requestAnimationFrame даёт ScrollView смонтироваться до scrollTo.
    const id = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y, animated: false });
    });
    return () => cancelAnimationFrame(id);
    // Только при первом монтировании: дальше позицией управляет пользователь.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Реальный-тайм: на каждый кадр скролла пересчитываем центральный индекс,
  // двигаем подсветку и (при смене) сообщаем год родителю.
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = clampIndex(Math.round(e.nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT), years.length);
    if (idx !== liveIndex) setLiveIndex(idx);
    if (idx !== reportedIndexRef.current) {
      reportedIndexRef.current = idx;
      onChange(years[idx]);
    }
  };

  return (
    <View style={styles.wheelWrap}>
      {/* Центральная рамка-индикатор выбранного года */}
      <View pointerEvents="none" style={styles.wheelSelection} />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        nestedScrollEnabled
        scrollEventThrottle={16}
        onScroll={onScroll}
        contentContainerStyle={styles.wheelContent}
      >
        {years.map((y, i) => {
          const active = i === liveIndex;
          return (
            <View key={y} style={styles.wheelItem}>
              <Text style={[styles.wheelText, active && styles.wheelTextActive]}>{y}</Text>
            </View>
          );
        })}
      </ScrollView>
      {/* Мягкие затемнения сверху/снизу для эффекта «уходящего» барабана */}
      <View pointerEvents="none" style={[styles.wheelFade, styles.wheelFadeTop]} />
      <View pointerEvents="none" style={[styles.wheelFade, styles.wheelFadeBottom]} />
    </View>
  );
}

function makeL(lang: Lang) {
  return (ru: string, uk: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) =>
    triLang(lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });
}

interface ConsentReverifyHostProps {
  /**
   * Админ-превью: принудительно показать модал, минуя обычные гейты
   * (onboarding_done / reverify_done / уже принятые решения). Ничего НЕ
   * сохраняет в storage и не пишет в облако — «Продолжить»/закрытие просто
   * вызывают onForceClose. Нужно для кнопки в админ-панели (раздел «Онбординг»).
   */
  forceVisible?: boolean;
  /** Вызывается при закрытии в режиме forceVisible. */
  onForceClose?: () => void;
}

export default function ConsentReverifyHost({ forceVisible, onForceClose }: ConsentReverifyHostProps = {}) {
  const { lang } = useLang();
  const L = makeL(lang as Lang);

  const [visible, setVisible] = useState(false);
  const [birthYear, setBirthYearSel] = useState<number | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [analyticsChoice, setAnalyticsChoice] = useState<'granted' | 'denied' | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Админ-превью управляет видимостью извне — обычные гейты не запускаем.
    if (forceVisible) return;
    let alive = true;
    (async () => {
      try {
        // Показываем только существующим (прошедшим онбординг) и только если
        // нужное состояние ещё не собрано.
        const [onboardingDone, reverifyDone] = await Promise.all([
          AsyncStorage.getItem('onboarding_done'),
          AsyncStorage.getItem(REVERIFY_DONE_KEY),
        ]);
        if (!alive) return;
        if (onboardingDone !== '1') return; // новый юзер — его ведёт онбординг-гейт
        if (reverifyDone === '1') return;
        // Если по какой-то причине решения уже есть — закрываем латч и не показываем.
        if (hasAgeDecision() && hasAnalyticsConsentDecision()) {
          await AsyncStorage.setItem(REVERIFY_DONE_KEY, '1');
          return;
        }
        setVisible(true);
      } catch {
        /* best-effort: не блокируем запуск */
      }
    })();
    return () => {
      alive = false;
    };
  }, [forceVisible]);

  const isPreview = forceVisible === true;

  // Список лет для барабана: от текущего (сверху) вниз до текущего − 120.
  // Дефолт центрируем на правдоподобном «взрослом» году (текущий − 30).
  const { wheelYears, defaultYear } = useMemo(() => {
    const now = new Date().getFullYear();
    const ys: number[] = [];
    for (let y = now; y >= now - 120; y -= 1) ys.push(y);
    return { wheelYears: ys, defaultYear: now - 30 };
  }, []);

  // Барабан всегда показывает значение → используем дефолт, пока юзер не крутил.
  const effectiveYear = birthYear ?? defaultYear;
  const yearValid = birthYear !== null && isPlausibleBirthYear(birthYear);
  const canSubmit = yearValid && acceptTerms && acceptPrivacy && analyticsChoice !== null && !busy;

  const openLegal = (which: 'terms' | 'privacy') => {
    try {
      router.push(which === 'terms' ? '/terms_screen' : '/privacy_screen');
    } catch {
      /* no-op */
    }
  };

  const submit = async () => {
    if (!canSubmit || birthYear === null) return;
    // Админ-превью: ничего не сохраняем, просто закрываем.
    if (isPreview) {
      onForceClose?.();
      return;
    }
    setBusy(true);
    try {
      await setBirthYear(birthYear);
      await setAnalyticsConsent(analyticsChoice === 'granted' ? 'granted' : 'denied');
      void recordConsentToCloud(); // best-effort учёт в облако (для админки)
      await AsyncStorage.setItem(REVERIFY_DONE_KEY, '1');
      setVisible(false);
    } catch {
      // Оставляем модал открытым — пользователь попробует ещё раз.
      setBusy(false);
    }
  };

  const copy = useMemo(
    () => ({
      title: L(
        'Пара формальностей', 'Пара формальностей', 'Un par de formalidades', 'Algumas formalidades',
        'Một vài thủ tục', 'Beberapa formalitas', 'Birkaç formalite', 'Kilka formalności',
      ),
      intro: L(
        'Чтобы продолжить пользоваться приложением, подтверди пару моментов — это нужно для соблюдения правил и защиты и тебя, и нас. Займёт несколько секунд.',
        'Щоб продовжити користуватися додатком, підтверди кілька моментів — це потрібно для дотримання правил і захисту і тебе, і нас. Займе кілька секунд.',
        'Para seguir usando la app, confirma un par de cosas: es para cumplir las normas y proteger a ambos. Toma unos segundos.',
        'Para continuar usando o app, confirme algumas coisas — é para cumprir as regras e proteger você e nós. Leva alguns segundos.',
        'Để tiếp tục dùng ứng dụng, hãy xác nhận vài điều — để tuân thủ quy định và bảo vệ cả bạn và chúng tôi. Chỉ mất vài giây.',
        'Untuk terus memakai aplikasi, konfirmasi beberapa hal — demi mematuhi aturan dan melindungi kita berdua. Hanya beberapa detik.',
        'Uygulamayı kullanmaya devam etmek için birkaç şeyi onayla — kurallara uymak ve ikimizi de korumak için. Birkaç saniye sürer.',
        'Aby dalej korzystać z aplikacji, potwierdź kilka rzeczy — to dla zgodności z przepisami i ochrony nas obojga. Zajmie kilka sekund.',
      ),
      yearLabel: L(
        'Год рождения', 'Рік народження', 'Año de nacimiento', 'Ano de nascimento',
        'Năm sinh', 'Tahun lahir', 'Doğum yılı', 'Rok urodzenia',
      ),
      acceptTerms: L(
        'Я принимаю Условия использования', 'Я приймаю Умови використання', 'Acepto los Términos de uso',
        'Aceito os Termos de uso', 'Tôi chấp nhận Điều khoản sử dụng', 'Saya menerima Ketentuan Penggunaan',
        'Kullanım Koşullarını kabul ediyorum', 'Akceptuję Warunki korzystania',
      ),
      acceptPrivacy: L(
        'Я принимаю Политику конфиденциальности', 'Я приймаю Політику конфіденційності', 'Acepto la Política de privacidad',
        'Aceito a Política de privacidade', 'Tôi chấp nhận Chính sách quyền riêng tư', 'Saya menerima Kebijakan Privasi',
        'Gizlilik Politikasını kabul ediyorum', 'Akceptuję Politykę prywatności',
      ),
      analyticsQ: L(
        'Можно собирать анонимную статистику, чтобы улучшать приложение? Менять можно в любой момент в настройках.',
        'Чи можна збирати анонімну статистику, щоб покращувати додаток? Змінити можна будь-коли в налаштуваннях.',
        '¿Podemos recopilar estadísticas anónimas para mejorar la app? Puedes cambiarlo cuando quieras en ajustes.',
        'Podemos coletar estatísticas anônimas para melhorar o app? Você pode mudar quando quiser nas configurações.',
        'Chúng tôi có thể thu thập thống kê ẩn danh để cải thiện ứng dụng không? Bạn có thể đổi bất cứ lúc nào trong cài đặt.',
        'Bolehkah kami mengumpulkan statistik anonim untuk meningkatkan aplikasi? Bisa diubah kapan saja di pengaturan.',
        'Uygulamayı geliştirmek için anonim istatistik toplayabilir miyiz? İstediğin zaman ayarlardan değiştirebilirsin.',
        'Czy możemy zbierać anonimowe statystyki, aby ulepszać aplikację? Możesz to zmienić w każdej chwili w ustawieniach.',
      ),
      allow: L('Разрешить', 'Дозволити', 'Permitir', 'Permitir', 'Cho phép', 'Izinkan', 'İzin ver', 'Zezwól'),
      notNow: L('Не сейчас', 'Не зараз', 'Ahora no', 'Agora não', 'Không phải bây giờ', 'Tidak sekarang', 'Şimdi değil', 'Nie teraz'),
      continue: L('Продолжить', 'Продовжити', 'Continuar', 'Continuar', 'Tiếp tục', 'Lanjut', 'Devam et', 'Kontynuuj'),
    }),
    [lang], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const shown = isPreview ? true : visible;
  if (!shown) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => {
        // В админ-превью разрешаем закрыть (Back/жест). В проде — блокирующий.
        if (isPreview) onForceClose?.();
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.box}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.intro}>{copy.intro}</Text>

            <Text style={styles.label}>{copy.yearLabel}</Text>
            <YearWheel
              years={wheelYears}
              value={effectiveYear}
              onChange={(y) => setBirthYearSel(y)}
            />

            <Pressable style={styles.row} onPress={() => setAcceptTerms((v) => !v)}>
              <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
                {acceptTerms && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.rowText}>
                <Text onPress={() => openLegal('terms')} style={styles.link}>{copy.acceptTerms}</Text>
              </Text>
            </Pressable>

            <Pressable style={styles.row} onPress={() => setAcceptPrivacy((v) => !v)}>
              <View style={[styles.checkbox, acceptPrivacy && styles.checkboxChecked]}>
                {acceptPrivacy && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.rowText}>
                <Text onPress={() => openLegal('privacy')} style={styles.link}>{copy.acceptPrivacy}</Text>
              </Text>
            </Pressable>

            <Text style={[styles.intro, { marginTop: 18 }]}>{copy.analyticsQ}</Text>
            <View style={styles.analyticsRow}>
              <Pressable
                style={[styles.analyticsBtn, analyticsChoice === 'granted' && styles.analyticsBtnActive]}
                onPress={() => setAnalyticsChoice('granted')}
              >
                <Text style={styles.analyticsBtnText}>{copy.allow}</Text>
              </Pressable>
              <Pressable
                style={[styles.analyticsBtn, analyticsChoice === 'denied' && styles.analyticsBtnActive]}
                onPress={() => setAnalyticsChoice('denied')}
              >
                <Text style={styles.analyticsBtnText}>{copy.notNow}</Text>
              </Pressable>
            </View>

            <Pressable
              style={[styles.continueBtn, !canSubmit && styles.continueBtnDisabled]}
              onPress={() => { void submit(); }}
              disabled={!canSubmit}
            >
              <Text style={styles.continueText}>{copy.continue}</Text>
            </Pressable>

            {isPreview && (
              <Pressable style={styles.previewClose} onPress={() => onForceClose?.()}>
                <Text style={styles.previewCloseText}>✕ Закрыть превью (админ)</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  box: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '88%',
    backgroundColor: '#161a1f',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 22,
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 10 },
  intro: { color: '#c7ccd2', fontSize: 14, lineHeight: 20 },
  label: { color: '#9aa0a6', fontSize: 13, fontWeight: '700', marginTop: 18, marginBottom: 6 },
  // ── Барабан выбора года ──
  wheelWrap: {
    height: WHEEL_HEIGHT,
    borderRadius: 12,
    backgroundColor: '#0f1216',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  wheelContent: {
    // Пустые отступы сверху/снизу, чтобы первый и последний год могли встать в центр.
    paddingVertical: WHEEL_PAD_ROWS * WHEEL_ITEM_HEIGHT,
  },
  wheelItem: {
    height: WHEEL_ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelText: { color: '#5c636b', fontSize: 20, fontWeight: '600', letterSpacing: 2 },
  wheelTextActive: { color: '#fff', fontSize: 24, fontWeight: '800' },
  wheelSelection: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: WHEEL_PAD_ROWS * WHEEL_ITEM_HEIGHT,
    height: WHEEL_ITEM_HEIGHT,
    borderRadius: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(52,211,153,0.5)',
    backgroundColor: 'rgba(52,211,153,0.08)',
  },
  wheelFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: WHEEL_ITEM_HEIGHT * 1.4,
    backgroundColor: '#0f1216',
    opacity: 0.55,
  },
  wheelFadeTop: { top: 0 },
  wheelFadeBottom: { bottom: 0 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 10 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#34D399', borderColor: '#34D399' },
  checkmark: { color: '#0b0f0c', fontSize: 15, fontWeight: '900' },
  rowText: { flex: 1, color: '#c7ccd2', fontSize: 14 },
  link: { color: '#7fb4ff', textDecorationLine: 'underline' },
  analyticsRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  analyticsBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1f242b',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  analyticsBtnActive: { borderColor: '#34D399', backgroundColor: 'rgba(52,211,153,0.12)' },
  analyticsBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  continueBtn: {
    marginTop: 22,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#34D399',
    alignItems: 'center',
  },
  continueBtnDisabled: { backgroundColor: '#2a3a33', opacity: 0.6 },
  continueText: { color: '#0b0f0c', fontSize: 16, fontWeight: '800' },
  previewClose: { marginTop: 12, paddingVertical: 10, alignItems: 'center' },
  previewCloseText: { color: '#9aa0a6', fontSize: 13, fontWeight: '600' },
});
