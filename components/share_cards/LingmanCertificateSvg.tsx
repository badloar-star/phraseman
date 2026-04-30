import React, { forwardRef, memo } from 'react';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
  Text,
} from 'react-native-svg';
import { formatCertDate, type CertLang } from '../../app/exam_certificate';

export type LingmanCertificateSvgProps = {
  name: string;
  score: number;
  total: number;
  pct: number;
  certId: string;
  completedAt: number;
  lang: CertLang;
  /** On-screen render width. Height = width × (CERT_H / CERT_W). PNG-export = 1500×1080. */
  layoutWidth?: number;
};

/** Landscape A4-like aspect (1.389:1) — реальные дипломные пропорции. */
export const CERT_W = 1500;
export const CERT_H = 1080;
export const CERT_ASPECT = CERT_W / CERT_H;

/**
 * Уровень владения языком, который присуждается за прохождение финального теста.
 * Вынесено в константу — если в будущем mapping станет зависеть от pct
 * (например, ≥95% → C1), достаточно поменять здесь и заголовок/achievement
 * автоматически обновятся.
 *
 * ВАЖНО (юридическое позиционирование, см. footer disclaimer):
 *   Это внутренняя награда приложения, а НЕ официальная квалификация.
 *   Уровень — самооценка по дескрипторам CEFR (общественный стандарт
 *   Совета Европы), а не присуждение от аккредитованного провайдера
 *   (Cambridge English / Goethe / DELE и т.п.). Тексты сознательно
 *   избегают слов «сертификат», «академия», «профессор» и не имитируют
 *   официальный документ, чтобы не вводить юзеров в заблуждение
 *   и не нарушать законы о защите потребителей (UCPD в EU, FTC в US,
 *   ст. 14.7 КоАП в РФ, ЗПС в Україні).
 */
const CERT_LEVEL = 'B2';

const COPY = {
  ru: {
    eyebrow: 'PHRASEMAN APP',
    sub: 'Внутренний тест · 2026',
    title: `PHRASEMAN ${CERT_LEVEL}`,
    presented: 'Награда вручена пользователю',
    achievement: `достиг(ла) уровня ${CERT_LEVEL} по тесту приложения`,
    // Раньше было «Профессора Лингмана» — убрано как намёк на учебное заведение.
    professor: 'Phraseman App',
    scoreLabel: 'Результат',
    accuracyLabel: 'Точность',
    dateLabel: 'Дата',
    signatureLabel: 'Подпись',
    professorName: 'Phraseman App',
    disclaimerLine1: 'Внутренняя награда приложения · Не является официальной квалификацией',
    disclaimerLine2: 'Уровень — самооценка по дескрипторам CEFR (Совет Европы)',
  },
  uk: {
    eyebrow: 'PHRASEMAN APP',
    sub: 'Внутрішній тест · 2026',
    title: `PHRASEMAN ${CERT_LEVEL}`,
    presented: 'Нагороду вручено користувачу',
    achievement: `досяг(ла) рівня ${CERT_LEVEL} за тестом застосунку`,
    professor: 'Phraseman App',
    scoreLabel: 'Результат',
    accuracyLabel: 'Точність',
    dateLabel: 'Дата',
    signatureLabel: 'Підпис',
    professorName: 'Phraseman App',
    disclaimerLine1: 'Внутрішня нагорода застосунку · Не є офіційною кваліфікацією',
    disclaimerLine2: 'Рівень — самооцінка за дескрипторами CEFR (Рада Європи)',
  },
  es: {
    eyebrow: 'PHRASEMAN APP',
    sub: 'Prueba interna · 2026',
    title: `PHRASEMAN ${CERT_LEVEL}`,
    presented: 'Recompensa otorgada al usuario',
    achievement: `ha alcanzado el nivel ${CERT_LEVEL} en la prueba de la aplicación`,
    professor: 'Phraseman App',
    scoreLabel: 'Resultado',
    accuracyLabel: 'Precisión',
    dateLabel: 'Fecha',
    signatureLabel: 'Firma',
    professorName: 'Phraseman App',
    disclaimerLine1: 'Recompensa interna de la aplicación · No constituye una cualificación oficial',
    disclaimerLine2: 'El nivel es una autoevaluación según los descriptores del MCER del Consejo de Europa',
  },
} as const;

function fitNameFontSize(name: string): number {
  const len = name.length;
  if (len <= 12) return 110;
  if (len <= 18) return 92;
  if (len <= 24) return 76;
  return 62;
}

function fitTitleFontSize(title: string): number {
  // длинные локализованные заголовки могут не влезать в ширину
  const len = title.length;
  if (len <= 20) return 70;
  if (len <= 26) return 60;
  return 52;
}

function clipName(name: string, max = 30): string {
  if (name.length <= max) return name;
  return name.slice(0, max - 1) + '\u2026';
}

function CornerOrnament({ x, y, rotation }: { x: number; y: number; rotation: number }) {
  return (
    <G transform={`translate(${x},${y}) rotate(${rotation})`}>
      <Path
        d="M0,0 L52,0 M0,0 L0,52"
        stroke="url(#certGoldEdge)"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Path
        d="M16,16 L34,16 L34,34 L16,34 Z"
        fill="none"
        stroke="url(#certGoldEdge)"
        strokeWidth={1.5}
      />
      <Circle cx={25} cy={25} r={3.5} fill="url(#certGoldEdge)" />
    </G>
  );
}

function Seal({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <G transform={`translate(${x},${y}) scale(${scale})`}>
      <Circle cx={0} cy={0} r={62} fill="url(#certSealBg)" stroke="url(#certGoldEdge)" strokeWidth={2.5} />
      <Circle cx={0} cy={0} r={50} fill="none" stroke="#d4a017" strokeWidth={1} opacity={0.7} />
      <Path
        d="M-26,-10 L-13,16 L0,-20 L13,16 L26,-10 L18,26 L-18,26 Z"
        fill="url(#certGoldFill)"
        opacity={0.95}
      />
      <Text
        x={0}
        y={-34}
        textAnchor="middle"
        fill="#fde68a"
        fontFamily="System"
        fontSize={10}
        fontWeight="700"
        letterSpacing={1.6}
      >
        VERIFIED
      </Text>
      <Text
        x={0}
        y={44}
        textAnchor="middle"
        fill="#fde68a"
        fontFamily="System"
        fontSize={10}
        fontWeight="700"
        letterSpacing={1.6}
      >
        PHRASEMAN
      </Text>
    </G>
  );
}

const LingmanCertificateSvg = memo(
  forwardRef<InstanceType<typeof Svg>, LingmanCertificateSvgProps>(
    function LingmanCertificateSvg(
      { name, score, total, pct, certId, completedAt, lang, layoutWidth = CERT_W },
      ref
    ) {
      const c = COPY[lang];
      // Если имя ещё не введено — НЕ ставим фолбэк («Студент Phraseman» и т.п.):
      // пусть линия для подписи остаётся пустой, имя появится только после ввода.
      const trimmedName = (name || '').trim();
      const safeName = trimmedName ? clipName(trimmedName) : '';
      const nameFontSize = safeName ? fitNameFontSize(safeName) : 80;
      const titleFontSize = fitTitleFontSize(c.title);
      const pctClamped = Math.max(0, Math.min(100, Math.round(pct)));
      const dateStr = formatCertDate(completedAt, lang);
      const layoutHeight = Math.round(layoutWidth / CERT_ASPECT);

      // Y-координаты ключевых блоков (viewBox 0 0 1500 1080)
      const Y_EYEBROW = 168;
      const Y_SUB = 206;
      const Y_TITLE = 296;
      const Y_PRESENTED = 384;
      const Y_NAME = 384 + Math.round(nameFontSize * 0.95);
      const Y_NAME_LINE = Y_NAME + 28;
      const Y_ACHIEVEMENT = 600;
      const Y_PROFESSOR = 644;
      // ── НИЖНЯЯ ПОЛОВИНА (≤ 996, верх внутренней рамки = 84) ──
      // Раскладка построена так, чтобы НИКАКИЕ строки не пересекались с
      // печатью (раньше disclaimer наезжал на текст PHRASEMAN внутри печати,
      // ID почти упирался в рамку — см. скриншот 2026-04-29).
      //
      // Score-блок:        670 .. 800  (h=130)
      // Подпись-ряд:       label 830 / value 860 / line 878
      // Печать (центр):    855, scale 0.65 → r≈40 → 815 .. 895
      // Disclaimer 1:      918  (gap 23 от низа печати)
      // Disclaimer 2:      940
      // ID:                975  (top text ≈ 965, gap 21 до рамки 996)
      const SCORE_TOP = 670;
      const SCORE_H = 130;
      const SCORE_LEFT = 270;
      const SCORE_W = 960;
      const Y_FOOTER = 880;
      const Y_LABEL = Y_FOOTER - 50;      // 830 — gap 30 от score-блока
      const Y_DATE_VALUE = Y_FOOTER - 20; // 860
      const Y_SIG_VALUE = Y_FOOTER - 16;  // 864
      const Y_FOOTER_LINE = Y_FOOTER - 2; // 878
      const SEAL_Y = Y_FOOTER - 25;       // 855 (центр печати)
      const SEAL_SCALE = 0.65;            // эффективный радиус 62×0.65 ≈ 40
      const Y_DISCLAIMER_1 = 918;
      const Y_DISCLAIMER_2 = 940;
      const Y_ID = 975;                   // внутри внутренней рамки (≤ 996)

      return (
        <Svg
          ref={ref}
          width={layoutWidth}
          height={layoutHeight}
          viewBox={`0 0 ${CERT_W} ${CERT_H}`}
        >
          <Defs>
            <LinearGradient id="certBg" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#0c1a22" />
              <Stop offset="50%" stopColor="#06121a" />
              <Stop offset="100%" stopColor="#020a10" />
            </LinearGradient>
            <RadialGradient id="certGlow" cx="50%" cy="42%" r="55%">
              <Stop offset="0%" stopColor="#d4a017" stopOpacity={0.18} />
              <Stop offset="55%" stopColor="#d4a017" stopOpacity={0.04} />
              <Stop offset="100%" stopColor="#06121a" stopOpacity={0} />
            </RadialGradient>
            <LinearGradient id="certGoldFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#fde68a" />
              <Stop offset="55%" stopColor="#f5b942" />
              <Stop offset="100%" stopColor="#b45309" />
            </LinearGradient>
            <LinearGradient id="certGoldEdge" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#fde68a" />
              <Stop offset="100%" stopColor="#d4a017" />
            </LinearGradient>
            <LinearGradient id="certSealBg" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#1f2933" />
              <Stop offset="100%" stopColor="#0a151c" />
            </LinearGradient>
          </Defs>

          {/* Background */}
          <Rect width={CERT_W} height={CERT_H} fill="url(#certBg)" />
          <Rect width={CERT_W} height={CERT_H} fill="url(#certGlow)" />

          {/* Outer golden double border */}
          <Rect
            x={60}
            y={60}
            width={CERT_W - 120}
            height={CERT_H - 120}
            rx={16}
            fill="none"
            stroke="url(#certGoldEdge)"
            strokeWidth={3}
            opacity={0.95}
          />
          <Rect
            x={84}
            y={84}
            width={CERT_W - 168}
            height={CERT_H - 168}
            rx={12}
            fill="none"
            stroke="#8c5a0b"
            strokeWidth={1.2}
            opacity={0.7}
          />

          {/* Corner ornaments */}
          <CornerOrnament x={108} y={108} rotation={0} />
          <CornerOrnament x={CERT_W - 108} y={108} rotation={90} />
          <CornerOrnament x={CERT_W - 108} y={CERT_H - 108} rotation={180} />
          <CornerOrnament x={108} y={CERT_H - 108} rotation={270} />

          {/* Eyebrow */}
          <Text
            x={CERT_W / 2}
            y={Y_EYEBROW}
            textAnchor="middle"
            fill="#fde68a"
            fontFamily="System"
            fontSize={28}
            fontWeight="700"
            letterSpacing={6.5}
          >
            {c.eyebrow}
          </Text>
          <Text
            x={CERT_W / 2}
            y={Y_SUB}
            textAnchor="middle"
            fill="#a78648"
            fontFamily="System"
            fontSize={20}
            fontWeight="500"
            letterSpacing={3}
          >
            {c.sub}
          </Text>

          {/* Decorative flourish */}
          <Line
            x1={520}
            y1={236}
            x2={720}
            y2={236}
            stroke="url(#certGoldEdge)"
            strokeWidth={1.5}
            opacity={0.6}
          />
          <Circle cx={CERT_W / 2} cy={236} r={5} fill="url(#certGoldFill)" />
          <Circle cx={CERT_W / 2} cy={236} r={11} fill="none" stroke="url(#certGoldEdge)" strokeWidth={1} />
          <Line
            x1={780}
            y1={236}
            x2={980}
            y2={236}
            stroke="url(#certGoldEdge)"
            strokeWidth={1.5}
            opacity={0.6}
          />

          {/* Title (без английского дубля) */}
          <Text
            x={CERT_W / 2}
            y={Y_TITLE}
            textAnchor="middle"
            fill="url(#certGoldFill)"
            fontFamily="System"
            fontSize={titleFontSize}
            fontWeight="800"
            letterSpacing={3.5}
          >
            {c.title}
          </Text>

          {/* Presented-to */}
          <Text
            x={CERT_W / 2}
            y={Y_PRESENTED}
            textAnchor="middle"
            fill="#94a3b8"
            fontFamily="System"
            fontSize={26}
            fontStyle="italic"
          >
            {c.presented}
          </Text>

          {/* Recipient name. Если имени нет — рисуем только подпись-линию (как
              пустое поле под имя на бумажном дипломе); сам текст не рендерим. */}
          {safeName ? (
            <Text
              x={CERT_W / 2}
              y={Y_NAME}
              textAnchor="middle"
              fill="url(#certGoldFill)"
              fontFamily="System"
              fontSize={nameFontSize}
              fontWeight="700"
              letterSpacing={1.5}
            >
              {safeName}
            </Text>
          ) : null}
          <Line
            x1={350}
            y1={Y_NAME_LINE}
            x2={CERT_W - 350}
            y2={Y_NAME_LINE}
            stroke="url(#certGoldEdge)"
            strokeWidth={1.5}
            opacity={0.55}
          />

          {/* Achievement description */}
          <Text
            x={CERT_W / 2}
            y={Y_ACHIEVEMENT}
            textAnchor="middle"
            fill="#cbd5e1"
            fontFamily="System"
            fontSize={28}
          >
            {c.achievement}
          </Text>
          <Text
            x={CERT_W / 2}
            y={Y_PROFESSOR}
            textAnchor="middle"
            fill="#fde68a"
            fontFamily="System"
            fontSize={32}
            fontWeight="700"
            letterSpacing={1.6}
          >
            {c.professor}
          </Text>

          {/* Score block — широкий, цельный, без TSpan-разнобоя */}
          <Rect
            x={SCORE_LEFT}
            y={SCORE_TOP}
            width={SCORE_W}
            height={SCORE_H}
            rx={16}
            fill="#0a1620"
            stroke="url(#certGoldEdge)"
            strokeWidth={1.4}
            opacity={0.92}
          />
          <Line
            x1={CERT_W / 2}
            y1={SCORE_TOP + 22}
            x2={CERT_W / 2}
            y2={SCORE_TOP + SCORE_H - 22}
            stroke="#8c5a0b"
            strokeWidth={1}
            opacity={0.6}
          />
          {/* — left column: Score — */}
          <Text
            x={SCORE_LEFT + SCORE_W / 4}
            y={SCORE_TOP + 48}
            textAnchor="middle"
            fill="#94a3b8"
            fontFamily="System"
            fontSize={20}
            letterSpacing={3}
          >
            {c.scoreLabel.toUpperCase()}
          </Text>
          <Text
            x={SCORE_LEFT + SCORE_W / 4}
            y={SCORE_TOP + 116}
            textAnchor="middle"
            fill="url(#certGoldFill)"
            fontFamily="System"
            fontSize={56}
            fontWeight="800"
            letterSpacing={2}
          >
            {`${score} / ${total}`}
          </Text>
          {/* — right column: Accuracy — */}
          <Text
            x={SCORE_LEFT + (SCORE_W * 3) / 4}
            y={SCORE_TOP + 48}
            textAnchor="middle"
            fill="#94a3b8"
            fontFamily="System"
            fontSize={20}
            letterSpacing={3}
          >
            {c.accuracyLabel.toUpperCase()}
          </Text>
          <Text
            x={SCORE_LEFT + (SCORE_W * 3) / 4}
            y={SCORE_TOP + 116}
            textAnchor="middle"
            fill="url(#certGoldFill)"
            fontFamily="System"
            fontSize={56}
            fontWeight="800"
            letterSpacing={2}
          >
            {`${pctClamped}%`}
          </Text>

          {/* Date (left) | Seal (center) | Signature (right) */}
          <Text
            x={250}
            y={Y_LABEL}
            fill="#7c8ea0"
            fontFamily="System"
            fontSize={16}
            letterSpacing={2.4}
          >
            {c.dateLabel.toUpperCase()}
          </Text>
          <Text
            x={250}
            y={Y_DATE_VALUE}
            fill="#fde68a"
            fontFamily="System"
            fontSize={26}
            fontWeight="700"
          >
            {dateStr}
          </Text>
          <Line x1={250} y1={Y_FOOTER_LINE} x2={460} y2={Y_FOOTER_LINE} stroke="#8c5a0b" strokeWidth={1} opacity={0.6} />

          <Seal x={CERT_W / 2} y={SEAL_Y} scale={SEAL_SCALE} />

          <Text
            x={CERT_W - 250}
            y={Y_LABEL}
            textAnchor="end"
            fill="#7c8ea0"
            fontFamily="System"
            fontSize={16}
            letterSpacing={2.4}
          >
            {c.signatureLabel.toUpperCase()}
          </Text>
          <Text
            x={CERT_W - 250}
            y={Y_SIG_VALUE}
            textAnchor="end"
            fill="#fde68a"
            fontFamily="System"
            fontSize={32}
            fontStyle="italic"
            fontWeight="600"
          >
            {c.professorName}
          </Text>
          <Line
            x1={CERT_W - 460}
            y1={Y_FOOTER_LINE}
            x2={CERT_W - 250}
            y2={Y_FOOTER_LINE}
            stroke="#8c5a0b"
            strokeWidth={1}
            opacity={0.6}
          />

          {/* Footer disclaimer (юридический): две строки мелким светло-серым
              курсивом по центру, ниже линий подписи. Это критично для защиты
              от претензий о «мнимой официальности» сертификата. */}
          <Text
            x={CERT_W / 2}
            y={Y_DISCLAIMER_1}
            textAnchor="middle"
            fill="#94a3b8"
            fontFamily="System"
            fontSize={14}
            fontStyle="italic"
            letterSpacing={0.3}
          >
            {c.disclaimerLine1}
          </Text>
          <Text
            x={CERT_W / 2}
            y={Y_DISCLAIMER_2}
            textAnchor="middle"
            fill="#7c8ea0"
            fontFamily="System"
            fontSize={13}
            fontStyle="italic"
            letterSpacing={0.3}
          >
            {c.disclaimerLine2}
          </Text>

          {/* Footer: только бренд + ID. Y вписан внутрь внутренней рамки
              и имеет зазор от печати, чтобы не пересекаться. */}
          <Text
            x={CERT_W / 2}
            y={Y_ID}
            textAnchor="middle"
            fill="#3d5a66"
            fontFamily="System"
            fontSize={13}
            letterSpacing={2.4}
          >
            ID · {certId}
          </Text>
        </Svg>
      );
    }
  )
);

export default LingmanCertificateSvg;
