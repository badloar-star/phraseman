import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Text, useWindowDimensions, View } from 'react-native';

import { useTheme } from '../components/ThemeContext';
import { FlowText } from '../components/text-integrity/FlowText';
import { type Lang } from '../constants/i18n';

type Props = {
  /** Уже прозвучавшая часть текущей реплики — подсвечивается акцентом. */
  visibleAssistantText: string;
  /** Вся реплика целиком (включая ещё не прозвучавший хвост). */
  fullAssistantText?: string;
  completedAssistantText: string;
  /**
   * Последняя распознанная реплика ученика.
   *
   * зачем (владелец 2026-08-23): «надо чтобы у него был такт субтитров и чтобы
   * видно было что я говорю». Раньше строка показывала ТОЛЬКО речь MAX — своих
   * слов ученик не видел вовсе и не понимал, расслышали ли его.
   */
  userText?: string;
  /** Ученик говорит прямо сейчас — показываем это ожиданием, а не пустотой. */
  userSpeaking?: boolean;
  lang: Lang;
};

/**
 * Хвост реплики, если она длиннее читаемого окна.
 *
 * зачем окно вообще: субтитры не должны превращаться в растущую ленту, которую
 * невозможно догнать глазами. Но окно считается по ВСЕЙ реплике, а не по уже
 * сказанному — иначе текст уезжает влево на каждом новом куске (жалоба
 * владельца 2026-08-23: «реплики так быстро скроллятся, что не успеть ничего»).
 */
export function captionRailTail(text: string, wordLimit = 10): string {
  const words = text.trim().split(/\s+/u).filter(Boolean);
  if (words.length <= wordLimit) return text.trim();
  return `… ${words.slice(-wordLimit).join(' ')}`;
}

export function MaxCallLiveCaptionView({
  visibleAssistantText,
  fullAssistantText,
  completedAssistantText,
  userText = '',
  userSpeaking = false,
  // lang больше не нужен в разметке: подписи «MAX» и «ВЫ» убраны по просьбе
  // владельца, переводить стало нечего. Проп оставлен в типе — его передаёт
  // экран звонка, и он пригодится, если подписи когда-нибудь вернутся.
}: Props) {
  const { theme: t, f } = useTheme();
  const { fontScale } = useWindowDimensions();
  // зачем (владелец 2026-08-23): «сделай размер шрифта в два раза меньше».
  // Было f.bodyLg (16) у реплики учителя и f.body (14) у реплики ученика —
  // теперь обе половины субтитров живут на одном вдвое меньшем кегле.
  // Пол в 8 pt: ниже текст перестаёт читаться даже на крупном экране.
  const captionFontSize = Math.max(8, Math.round(f.bodyLg / 2));
  const captionLineHeight = Math.round(captionFontSize * 1.35);
  // Полосы фиксированной высоты: сколько бы строк ни принесла реплика, блок
  // занимает столько же места, и экран под ним не двигается.
  const USER_LANE_LINES = 2;
  const AI_LANE_LINES = 4;
  const USER_LANE_HEIGHT = captionLineHeight * USER_LANE_LINES;
  const AI_LANE_HEIGHT = captionLineHeight * AI_LANE_LINES;
  const CAPTION_BOX_HEIGHT = USER_LANE_HEIGHT + AI_LANE_HEIGHT + 12;
  // Окно шире прежнего: показываем реплику, а не последние пять слов. При
  // крупном системном шрифте сужаем, чтобы текст не выпирал за пределы блока.
  // Кегль вдвое меньше — в ту же ширину влезает заметно больше слов, поэтому
  // окно расширено: резать реплику раньше, чем она не помещается, незачем.
  const wordLimit = fontScale >= 1.6 ? 18 : fontScale >= 1.3 ? 26 : 34;
  const source = (fullAssistantText ?? '').trim() !== '' ? fullAssistantText! : visibleAssistantText;
  const rail = captionRailTail(source, wordLimit);
  // Свою реплику держим короче, чем реплику учителя: она нужна как
  // подтверждение «тебя услышали вот так», а не как второй экран текста.
  const userRail = captionRailTail(userText, Math.max(6, Math.round(wordLimit * 0.6)));
  const announcedRef = useRef('');

  useEffect(() => {
    const value = completedAssistantText.trim();
    if (!value || announcedRef.current === value) return;
    announcedRef.current = value;
    void AccessibilityInfo.announceForAccessibility(`MAX: ${value}`);
  }, [completedAssistantText]);

  return (
    <>
      <View
        testID="max-call-live-caption"
        accessible={false}
        // зачем (владелец 2026-08-23): «сделай чтобы экран не прыгал ниже выше
        // из-за текста». Высота была минимальной и росла под содержимое: реплика
        // ученика то появлялась, то исчезала, и всё под блоком ездило. Теперь
        // высота ФИКСИРОВАНА (height, не minHeight), а каждая половина держит
        // свою полосу постоянно — первый кадр равен финальному.
        style={{ height: CAPTION_BOX_HEIGHT, marginHorizontal: 22, marginBottom: 8, justifyContent: 'center' }}
      >
        {/* Реплика ученика — над репликой учителя, тоном тише и прижата вправо:
            две стороны читаются как диалог, без рамок и подложек.
            зачем: полоса ученика занимает место ВСЕГДА (пустая строка вместо
            условного рендера) — иначе её появление сдвигало реплику учителя вниз.
            Метка «ВЫ» убрана по просьбе владельца: сторону речи задаёт
            выравнивание вправо и более тихий тон, подпись не нужна. */}
        <View style={{ alignSelf: 'flex-end', maxWidth: '92%', height: USER_LANE_HEIGHT, justifyContent: 'flex-end' }}>
          <Text
            testID="max-call-live-caption-user-text"
            maxFontSizeMultiplier={2}
            numberOfLines={USER_LANE_LINES}
            style={{
              color: t.textSecond,
              fontSize: captionFontSize,
              fontWeight: '700',
              lineHeight: captionLineHeight,
              textAlign: 'right',
            }}
          >
            {userRail !== '' ? userRail : (userSpeaking ? '…' : ' ')}
          </Text>
        </View>
        {/* зачем (владелец 2026-08-23): «сделай так чтобы его реплики появлялись
            сразу целиком на экране и не были лаганые, то есть не прыгали туда
            сюда». Раньше строка перерисовывалась на КАЖДОМ куске речи: росла
            видимая часть и переезжала граница подсветки «сказано / ещё нет» —
            текст дёргался и перетекал между строками. Теперь показываем реплику
            целиком одним куском, без деления на сказанное и несказанное.
            Метка «MAX» убрана по просьбе владельца. */}
        <View style={{ height: AI_LANE_HEIGHT, justifyContent: 'flex-start', marginTop: 12 }}>
          <FlowText
            testID="max-call-live-caption-text"
            provenance="external"
            integrityText={rail}
            maxFontSizeMultiplier={2}
            numberOfLines={AI_LANE_LINES}
            style={{
              color: t.textPrimary,
              fontSize: captionFontSize,
              fontWeight: '800',
              lineHeight: captionLineHeight,
            }}
          >
            {rail}
          </FlowText>
        </View>
      </View>
    </>
  );
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function MaxCallLiveCaptionRouteShim() { return null; }
