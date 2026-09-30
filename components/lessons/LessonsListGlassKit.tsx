import React from 'react';
import { Text, View, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { triLang, type Lang } from '../../constants/i18n';

// зачем (владелец 2026-09-30): список уроков вкладки «Обучение» переносится «1 в 1» по макету
// learn.html A1–A9 (Liquid Glass 2.0). На эмуляторе вкладка ещё рисовала старые оливково-зелёные
// градиентные плашки с золотым Plus. Здесь собраны общие кирпичи списка — токены 13 тем
// (liquidGlassTokens), тонкая 1 px полупрозрачная кромка, тексты на девяти языках.
// Логика доступа, прогресса, энергии и экзаменов остаётся в app/(tabs)/lessons.tsx.

export type LessonsListGlass = ReturnType<typeof liquidGlassTokens>;

/** Прозрачность поверх hex-токена (#RRGGBB). Иной формат возвращаем как есть — без выдуманного цвета. */
export function lessonsGlassAlpha(hex: string, opacity: number): string {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return hex;
  const a = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0');
  return `${hex}${a.toUpperCase()}`;
}

/** `.card` макета: тон карточки темы + тонкая полупрозрачная кромка стекла. */
export function lessonsGlassCardStyle(glass: LessonsListGlass, radius: number): ViewStyle {
  return {
    borderRadius: radius,
    backgroundColor: glass.opaqueCard,
    borderWidth: 1, // guard-ok: тонкая 1 px полупрозрачная кромка PhraseMan 2.0, как в макете
    borderColor: glass.glassEdge, // guard-ok: 1 px кромка стекла 2.0
    overflow: 'hidden',
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
    ru: `Урок ${num}`, uk: `Урок ${num}`, en: `Lesson ${num}`, es: `Lección ${num}`,
    'pt-BR': `Lição ${num}`, vi: `Bài ${num}`, id: `Pelajaran ${num}`, tr: `Ders ${num}`, pl: `Lekcja ${num}`,
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
    ru: `Пройди урок ${prev} на 2★`, uk: `Пройди урок ${prev} на 2★`, en: `Complete lesson ${prev} with 2★`,
    es: `Completa la lección ${prev} con 2★`, 'pt-BR': `Conclua a lição ${prev} com 2★`,
    vi: `Hoàn thành bài ${prev} đạt 2★`, id: `Selesaikan pelajaran ${prev} dengan 2★`,
    tr: `${prev}. dersi 2★ ile tamamla`, pl: `Ukończ lekcję ${prev} na 2★`,
  }),
  countOf: (lang: Lang, done: number, total: number): string => triLang(lang, {
    ru: `${done} из ${total}`, uk: `${done} з ${total}`, en: `${done} of ${total}`, es: `${done} de ${total}`,
    'pt-BR': `${done} de ${total}`, vi: `${done}/${total}`, id: `${done} dari ${total}`, tr: `${done}/${total}`, pl: `${done} z ${total}`,
  }),
  stars: (lang: Lang, n: number): string => triLang(lang, {
    ru: `${n} из 3 звёзд`, uk: `${n} з 3 зірок`, en: `${n} of 3 stars`, es: `${n} de 3 estrellas`,
    'pt-BR': `${n} de 3 estrelas`, vi: `${n}/3 sao`, id: `${n} dari 3 bintang`, tr: `3 yıldızdan ${n}`, pl: `${n} z 3 gwiazdek`,
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
      <Text style={{ color: glass.text, fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.2 }}>
        {label}
      </Text>
      {locked ? <Ionicons name="lock-closed" size={16} color={glass.secondary} /> : null}
      {countText ? (
        <Text
          style={{
            marginLeft: 'auto',
            color: glass.secondary,
            fontSize: 15,
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
