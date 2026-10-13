import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { Text, View } from 'react-native';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import BouncyScrollView from '../BouncyScrollView';
import ContentWrap from '../ContentWrap';
import PressableHybrid from '../PressableHybrid';
import { nestedBoxShadow, PlateFill, plateBoxShadow } from '../v2/ShadowSurface';
import ScreenGradient from '../ScreenGradient';
import { FONT_SCALE, useTheme } from '../ThemeContext';
import { keepEmailsUnbroken } from './legal_text_format';

export type LegalDocumentSection = Readonly<{
  heading: string;
  body: string;
}>;

type LegalDocumentSheetProps = Readonly<{
  title: string;
  closeAccessibilityLabel: string;
  externalAccessibilityLabel: string;
  sections: readonly LegalDocumentSection[];
  onClose: () => void;
  onOpenExternal: () => void;
}>;

export default function LegalDocumentSheet({
  title,
  closeAccessibilityLabel,
  externalAccessibilityLabel,
  sections,
  onClose,
  onOpenExternal,
}: LegalDocumentSheetProps) {
  const { theme: t, fontSize, uiScale, liquidGlassThemeId } = useTheme();
  const insets = useStableSafeAreaInsets();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const designScale = FONT_SCALE[fontSize] / FONT_SCALE.medium * uiScale;
  const scaled = (value: number) => Math.round(value * designScale);

  return (
    <ScreenGradient artBackdrop="settings">
      <View
        testID="legal-document-safe-frame"
        style={{
          flex: 1,
          paddingTop: insets.top,
          paddingRight: insets.right,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
        }}
      >
        <ContentWrap>
          <View
            testID="legal-document-header"
            style={{
              minHeight: 48,
              marginTop: 8,
              marginHorizontal: 20,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <PressableHybrid
              testID="legal-document-close"
              accessibilityLabel={closeAccessibilityLabel}
              accessibilityRole="button"
              hitSlop={3}
              onPress={onClose}
              variant="icon"
              withHaptic={true}
              withSound={false}
              style={{ width: 42, height: 42, alignSelf: 'center' }}
              contentStyle={{
                width: 42,
                height: 42,
                borderRadius: 21,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: glass.opaqueControl,
                boxShadow: nestedBoxShadow(glass), // зачем (стиль «Тень», владелец 12.10): кнопка без кромки — малая тень
              }}
            >
              <Ionicons name="close" size={20} color={glass.lightTint} />
            </PressableHybrid>

            <Text
              testID="legal-document-title"
              allowFontScaling={true}
              style={{
                flex: 1,
                minWidth: 0,
                paddingHorizontal: 10,
                color: t.textPrimary,
                fontSize: scaled(16),
                lineHeight: scaled(21),
                fontWeight: '700',
                textAlign: 'center',
              }}
            >
              {title}
            </Text>

            <PressableHybrid
              testID="legal-document-external"
              accessibilityLabel={externalAccessibilityLabel}
              accessibilityRole="button"
              hitSlop={3}
              onPress={onOpenExternal}
              variant="icon"
              withHaptic={false}
              withSound={false}
              style={{ width: 42, height: 42, alignSelf: 'center' }}
              contentStyle={{
                width: 42,
                height: 42,
                borderRadius: 21,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: glass.opaqueControl,
                boxShadow: nestedBoxShadow(glass), // зачем (стиль «Тень»): кнопка без кромки — малая тень
              }}
            >
              {/* зачем: паритет с макетом profile.html PRF-07/08 — на кнопке сайта стрелка вправо (arrowR) */}
              <Ionicons name="arrow-forward" size={19} color={glass.lightTint} />
            </PressableHybrid>
          </View>

          <View
            testID="legal-document-card"
            style={{
              flex: 1,
              flexShrink: 1,
              minHeight: 0,
              maxHeight: 690,
              marginTop: 18,
              marginHorizontal: 20,
              borderRadius: 22,
              // зачем (стиль «Тень»): карточка документа — плашка с тенью без кромки; тень на внешнем слое, клип скруглений прокручиваемого текста — на внутреннем
              backgroundColor: glass.plateFillFrom,
              boxShadow: plateBoxShadow(glass),
            }}
          >
            <View testID="legal-document-card-clip" style={{ flex: 1, minHeight: 0, borderRadius: 22, overflow: 'hidden' }}>
            <PlateFill g={glass} radius={22} />
            <BouncyScrollView
              testID="legal-document-scroll"
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 20 }}
              decelerationRate="fast"
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
            >
              {sections.map((section, index) => {
                const isFirst = index === 0;
                const isLast = index === sections.length - 1;
                return (
                  <View
                    key={`${index}:${section.heading}`}
                    testID={`legal-document-section-${index}`}
                    style={{ marginBottom: isLast ? 0 : 22 }}
                  >
                    <Text
                      testID={`legal-document-heading-${index}`}
                      allowFontScaling={true}
                      style={{
                        color: t.textPrimary,
                        fontSize: scaled(isFirst ? 19 : 16),
                        lineHeight: scaled(isFirst ? 24 : 21),
                        fontWeight: '700',
                      }}
                    >
                      {section.heading}
                    </Text>
                    <Text
                      testID={`legal-document-body-${index}`}
                      allowFontScaling={true}
                      style={{
                        marginTop: isFirst ? 9 : 7,
                        color: glass.secondary,
                        fontSize: scaled(15),
                        lineHeight: scaled(24),
                        fontWeight: '400',
                      }}
                    >
                      {keepEmailsUnbroken(section.body)}
                    </Text>
                  </View>
                );
              })}
            </BouncyScrollView>
            </View>
          </View>
        </ContentWrap>
      </View>
    </ScreenGradient>
  );
}
