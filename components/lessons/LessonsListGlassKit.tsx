import React from 'react';
import { Text, View, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { plateBoxShadow } from '../v2/ShadowSurface';
import { triLang, type Lang } from '../../constants/i18n';
import { useLineScale } from '../../hooks/useLineScale';

// зачем (владелец 2026-09-30): список уроков вкладки «Обучение» переносится «1 в 1» по макету
// learn.html A1–A9 (Liquid Glass 2.0). На эмуляторе вкладка ещё рисовала старые оливково-зелёные
// градиентные плашки с золотым Plus. Здесь собраны общие кирпичи списка — токены 13 тем
// (liquidGlassTokens), плашки без обводок (стиль «Тень» 12.10), тексты на девяти языках.
// Логика доступа, прогресса, энергии и экзаменов остаётся в app/(tabs)/lessons.tsx.

export type LessonsListGlass = ReturnType<typeof liquidGlassTokens>;

/** Прозрачность поверх hex-токена (#RRGGBB). Иной формат возвращаем как есть — без выдуманного цвета. */
export function lessonsGlassAlpha(hex: string, opacity: number): string {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return hex;
  const a = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0');
  return `${hex}${a.toUpperCase()}`;
}

/** `.card` макета: плашка стиля «Тень» — тон карточки темы и тень плашки, без кромки. */
export function lessonsGlassCardStyle(glass: LessonsListGlass, radius: number): ViewStyle {
  // зачем («Тень» 12.10): кромка 1 px убрана; overflow hidden убран — он режет тень (слои внутри карточки уже со скруглением)
  return {
    borderRadius: radius,
    backgroundColor: glass.plateFillFrom,
    boxShadow: plateBoxShadow(glass),
  };
}

/**
 * D36: 1★ ниже 60 %, 2★ 60–84 %, 3★ от 85 %. Хранимая оценка урока — 0…5, поэтому ×20.
 * Та же проекция, что lessonMenuStarCount в app/lesson_menu.tsx (там — экран меню; тянуть
 * целый экран в бандл вкладки ради трёх сравнений дорого). Нет оценки → 0 (звёзд не рисуем).
 */
export function lessonsListStarCount(score: number | null | undefined): 0 | 1 | 2 | 3 {
  if (typeof score !== 'number' || !Number.isFinite(score) || score <= 0 || score > 5) return 0;
  const pct = score * 20;
  if (pct >= 85) return 3;
  if (pct >= 60) return 2;
  return 1;
}

/** Короткие подписи списка уроков (макет A1–A9) на девяти языках. */
export const lessonsListCopy = {
  subtitle: (lang: Lang): string => triLang(lang, {
    ru: 'Учись. Практикуй. Говори увереннее.',
    uk: 'Вчися. Практикуй. Говори впевненіше.',
    en: 'Learn. Practice. Speak with confidence.',
    es: 'Aprende. Practica. Habla con más seguridad.',
    'pt-BR': 'Aprenda. Pratique. Fale com mais confiança.',
    vi: 'Học. Luyện tập. Nói tự tin hơn.',
    id: 'Belajar. Berlatih. Bicara lebih percaya diri.',
    tr: 'Öğren. Pratik yap. Daha özgüvenli konuş.',
    pl: 'Ucz się. Ćwicz. Mów pewniej.',
  }),
  lesson: (lang: Lang, num: number): string => triLang(lang, {
    ru: `Урок\u00A0${num}`, uk: `Урок\u00A0${num}`, en: `Lesson\u00A0${num}`, es: `Lección\u00A0${num}`,
    'pt-BR': `Lição\u00A0${num}`, vi: `Bài\u00A0${num}`, id: `Pelajaran\u00A0${num}`, tr: `Ders\u00A0${num}`, pl: `Lekcja\u00A0${num}`,
  }),
  done: (lang: Lang): string => triLang(lang, {
    ru: 'Пройден', uk: 'Пройдено', en: 'Completed', es: 'Completada', 'pt-BR': 'Concluída',
    vi: 'Đã hoàn thành', id: 'Selesai', tr: 'Tamamlandı', pl: 'Ukończona',
  }),
  open: (lang: Lang): string => triLang(lang, {
    ru: 'Открыт', uk: 'Відкрито', en: 'Open', es: 'Abierta', 'pt-BR': 'Aberta',
    vi: 'Đã mở', id: 'Terbuka', tr: 'Açık', pl: 'Otwarta',
  }),
  plus: (lang: Lang): string => triLang(lang, {
    ru: 'Входит в Plus', uk: 'Входить у Plus', en: 'Included in Plus', es: 'Incluida en Plus',
    'pt-BR': 'Incluída no Plus', vi: 'Có trong Plus', id: 'Termasuk dalam Plus', tr: "Plus'a dahil", pl: 'W ramach Plus',
  }),
  lockPrev: (lang: Lang, prev: number): string => triLang(lang, {
    ru: `Пройди урок\u00A0${prev}\u00A0на 2★`, uk: `Пройди урок\u00A0${prev}\u00A0на 2★`, en: `Complete lesson\u00A0${prev}\u00A0with 2★`,
    es: `Completa la lección\u00A0${prev}\u00A0con 2★`, 'pt-BR': `Conclua a lição\u00A0${prev}\u00A0com 2★`,
    vi: `Hoàn thành bài\u00A0${prev}\u00A0đạt 2★`, id: `Selesaikan pelajaran\u00A0${prev}\u00A0dengan 2★`,
    tr: `${prev}.\u00A0dersi 2★ ile tamamla`, pl: `Ukończ lekcję\u00A0${prev}\u00A0na 2★`,
  }),
  countOf: (lang: Lang, done: number, total: number): string => triLang(lang, {
    ru: `${done}\u00A0из\u00A0${total}`, uk: `${done}\u00A0з\u00A0${total}`, en: `${done}\u00A0of\u00A0${total}`, es: `${done}\u00A0de\u00A0${total}`,
    'pt-BR': `${done}\u00A0de\u00A0${total}`, vi: `${done}/${total}`, id: `${done}\u00A0dari\u00A0${total}`, tr: `${done}/${total}`, pl: `${done}\u00A0z\u00A0${total}`,
  }),
  stars: (lang: Lang, n: number): string => triLang(lang, {
    ru: `${n}\u00A0из 3 звёзд`, uk: `${n}\u00A0з 3 зірок`, en: `${n}\u00A0of 3 stars`, es: `${n}\u00A0de 3 estrellas`,
    'pt-BR': `${n}\u00A0de 3 estrelas`, vi: `${n}/3 sao`, id: `${n}\u00A0dari 3 bintang`, tr: `3 yıldızdan\u00A0${n}`, pl: `${n}\u00A0z 3 gwiazdek`,
  }),
  levelLocked: (lang: Lang): string => triLang(lang, {
    ru: 'закрыт', uk: 'закрито', en: 'locked', es: 'bloqueado', 'pt-BR': 'bloqueado',
    vi: 'đã khóa', id: 'terkunci', tr: 'kilitli', pl: 'zablokowany',
  }),
} as const;

/** Три звезды D36: зажжённые — цвет текста, погасшие — приглушённый тон темы. */
export function LessonsListStars({ glass, count, size = 16 }: {
  glass: LessonsListGlass;
  count: 0 | 1 | 2 | 3;
  size?: number;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }} accessible={false} importantForAccessibility="no-hide-descendants">
      {[1, 2, 3].map((i) => (
        <Ionicons
          key={`star-${i}`} // guard-ok: ровно три неизменные звезды, порядок фиксирован
          name="star"
          size={size}
          color={i <= count ? glass.text : lessonsGlassAlpha(glass.text, 0.18)}
        />
      ))}
    </View>
  );
}

/**
 * `.lvh` макета: «A1» 22/28 жирным, замок у закрытого уровня, справа «1 из 8».
 * Цветной палочки-акцента и линии больше нет — граница уровня читается кеглем.
 */
export const LessonsListLevelHeader = React.memo(function LessonsListLevelHeader({
  glass,
  lang,
  label,
  locked,
  countText,
  first,
}: {
  glass: LessonsListGlass;
  lang: Lang;
  label: string;
  locked: boolean;
  countText: string | null;
  first: boolean;
}) {
  const lh = useLineScale();
  return (
    <View
      testID={`legacy-lessons-level-header-${label}`}
      accessible
      accessibilityRole="header"
      accessibilityLabel={[label, locked ? lessonsListCopy.levelLocked(lang) : null, countText].filter(Boolean).join(', ')}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: first ? 26 : 28, // первый: +2 отступа списка = 28, как .lvh
        marginBottom: 5, // + 9 зазора карточки = 14, как .lvh в макете
        marginHorizontal: 22,
      }}
    >
      <Text style={{ color: glass.text, fontSize: 22, lineHeight: lh(28), fontWeight: '700', letterSpacing: -0.2 }}>
        {label}
      </Text>
      {locked ? <Ionicons name="lock-closed" size={16} color={glass.secondary} /> : null}
      {countText ? (
        <Text
          style={{
            marginLeft: 'auto',
            color: glass.secondary,
            fontSize: 13, // зачем: шкала D145 (16/13) — счётчик раздела
            fontWeight: '600',
            fontVariant: ['tabular-nums'],
          }}
        >
          {countText}
        </Text>
      ) : null}
    </View>
  );
});
