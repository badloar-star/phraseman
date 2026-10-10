/**
 * Раскрытая карточка — макет docs/design/v2-app/cards-section.html (кадры «Своя карточка», «Карточка — оборот», «Карточка из чужого набора»).
 *
 * зачем (владелец 04.10: «во всех разделах карточки открываются горизонтальными красивыми разворачивающимися»): вместо шторки снизу карточка
 * раскрывается по центру — горизонтальный разворот (поворот вокруг левого края 760 мс), тап по карточке переворачивает её на перевод,
 * затемнение с размытием закрывает. Под карточкой — пример и действия: у своей карточки «Изменить / Сохранено / Удалить», у чужой «Сохранить».
 * Размеры из замера макета (430×932): карточка 230 высотой r28, поля 20, английское слово 34/600, перевод 30/600, затемнение rgba(2,2,4,.72).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { KitCard, KitCta } from '../../components/cards-grid/CardsKit';
import { useLineScale } from '../../components/cards-grid/useLineScale';
import { useLv2Glass } from '../../components/learning-v2/LearningV2Glass';
import { LinearGradient } from '../../components/SafeLinearGradient';
import { bevelShadow, mixDark, themePair } from '../../components/mistakes-panel/panelPaint';
import { triLang, type Lang } from '../../constants/i18n';

export type ExpandedCardData = Readonly<{
  id: string;
  front: string;
  ipa?: string | null;
  back: string;
  /** Сколько из четырёх точек «силы слова» закрашено. */
  dots?: number;
  example?: string | null;
  exampleTr?: string | null;
}>;

type Props = Readonly<{
  card: ExpandedCardData | null;
  lang: Lang;
  /** Подпись над карточкой: название набора (и автор у чужого). */
  overline: string;
  /** own — «Изменить / Сохранено / Удалить»; foreign — «Сохранить»; none — без действий. */
  footer: 'own' | 'foreign' | 'none';
  saved: boolean;
  /** Показать «Удалить» (нельзя у карточек, которые нельзя удалить отсюда). */
  canDelete: boolean;
  canEdit: boolean;
  /** Показывать «Сохранить / Сохранено» (в самих «Сохранённых» карточка уже сохранена — плитки нет). */
  showSave?: boolean;
  onClose: () => void;
  onSpeak: (text: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleSave: () => void;
}>;

const copyFor = (lang: Lang) => triLang(lang, {
  ru: { example: 'Пример', edit: 'Изменить', saved: 'Сохранено', save: 'Сохранить', del: 'Удалить', speak: 'Озвучить', close: 'Закрыть' },
  uk: { example: 'Приклад', edit: 'Змінити', saved: 'Збережено', save: 'Зберегти', del: 'Видалити', speak: 'Озвучити', close: 'Закрити' },
  en: { example: 'Example', edit: 'Edit', saved: 'Saved', save: 'Save', del: 'Delete', speak: 'Listen', close: 'Close' },
  es: { example: 'Ejemplo', edit: 'Editar', saved: 'Guardada', save: 'Guardar', del: 'Eliminar', speak: 'Escuchar', close: 'Cerrar' },
  'pt-BR': { example: 'Exemplo', edit: 'Editar', saved: 'Salvo', save: 'Salvar', del: 'Excluir', speak: 'Ouvir', close: 'Fechar' },
  vi: { example: 'Ví dụ', edit: 'Sửa', saved: 'Đã lưu', save: 'Lưu', del: 'Xóa', speak: 'Nghe', close: 'Đóng' },
  id: { example: 'Contoh', edit: 'Ubah', saved: 'Tersimpan', save: 'Simpan', del: 'Hapus', speak: 'Dengarkan', close: 'Tutup' },
  tr: { example: 'Örnek', edit: 'Düzenle', saved: 'Kaydedildi', save: 'Kaydet', del: 'Sil', speak: 'Dinle', close: 'Kapat' },
  pl: { example: 'Przykład', edit: 'Edytuj', saved: 'Zapisano', save: 'Zapisz', del: 'Usuń', speak: 'Posłuchaj', close: 'Zamknij' },
});

const SIDE = 18;
const UNFOLD_MS = 760;
const FLIP_MS = 320;
/** Высота карточки по макету (системный шрифт 100%); при крупном шрифте карточка растёт по тексту, а не режет его. */
const CARD_MIN_H = 230;
/** Вертикальный запас внутри грани: паддинги 20+20 и место под кнопку звука / точки силы. */
const FACE_PAD_V = 40;

function ExpandedCardInner({ card, lang, overline, footer, saved, canDelete, canEdit, showSave = true, onClose, onSpeak, onEdit, onDelete, onToggleSave }: Props) {
  const g = useLv2Glass();
  const copy = useMemo(() => copyFor(lang), [lang]);
  const { width: screenW } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const lh = useLineScale();
  const w = screenW - SIDE * 2;
  const [a, b] = themePair(g);
  const unfold = useSharedValue(reduceMotion ? 1 : 0);
  const flip = useSharedValue(0);
  const [flipped, setFlipped] = useState(false);
  // зачем (координатор 05.10, «ExpandedCardV2 при крупном системном шрифте»; правило владельца — лечим вёрсткой, не сжатием шрифта):
  // высота карточки = максимум из высоты макета и фактической высоты текста обеих сторон, измеренной onLayout.
  const [frontH, setFrontH] = useState(0);
  const [backH, setBackH] = useState(0);
  const cardH = Math.max(CARD_MIN_H, frontH + FACE_PAD_V, backH + FACE_PAD_V);

  // зачем: при открытии новой карточки — заново «разворот» и лицевая сторона
  useEffect(() => {
    if (!card) return;
    setFlipped(false);
    setFrontH(0);
    setBackH(0);
    flip.value = 0;
    if (reduceMotion) { unfold.value = 1; return; }
    unfold.value = 0;
    unfold.value = withTiming(1, { duration: UNFOLD_MS, easing: Easing.bezier(0.2, 1, 0.3, 1) });
  }, [card?.id, flip, unfold, reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps -- реагируем только на смену карточки

  const toggleFlip = useCallback(() => {
    setFlipped((prev) => {
      const next = !prev;
      flip.value = withTiming(next ? 1 : 0, { duration: reduceMotion ? 0 : FLIP_MS, easing: Easing.out(Easing.cubic) });
      return next;
    });
  }, [flip, reduceMotion]);

  const unfoldStyle = useAnimatedStyle(() => {
    const p = unfold.value;
    return {
      opacity: Math.min(1, p / 0.55),
      // вращение вокруг ЛЕВОГО края карточки (transform-origin: 0 50% в макете)
      transform: [{ perspective: 1400 }, { translateX: -w / 2 }, { rotateY: `${-88 * (1 - p)}deg` }, { translateX: w / 2 }, { scale: 0.88 + 0.12 * p }],
    };
  });
  const frontStyle = useAnimatedStyle(() => ({ transform: [{ perspective: 1400 }, { rotateY: `${flip.value * 180}deg` }] }));
  const backStyle = useAnimatedStyle(() => ({ transform: [{ perspective: 1400 }, { rotateY: `${flip.value * 180 - 180}deg` }] }));
  const dimStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, unfold.value / 0.3) }));

  if (!card) return null;
  // зачем (Сверка 10.10, светлая тема): лицо карточки на светлых темах светлое — белый текст на нём не читался; в светлой берём текст темы,
  // в тёмных остаётся прежний (mediaInk).
  const faceInk = g.isLight ? g.text : g.mediaInk;
  const faceInkSoft = g.isLight ? g.secondary : g.mediaInkSoft;
  const faceShadow = [{ offsetX: 0, offsetY: 14, blurRadius: 30, spreadDistance: -14, color: g.dropShadow }];
  // зачем (замечание владельца 10.10): базы карточки — токены темы (deepBase/deepBaseAlt), а не литералы под «Аврору».
  const colors = [`${mixDark(a, g.deepBase, 0.46)}E6`, `${g.deepBaseAlt}DB`, `${mixDark(b, g.deepBaseAlt, 0.4)}DB`] as const;
  const faceLayers = (key: string) => (
    <>
      <LinearGradient pointerEvents="none" colors={colors} locations={[0, 0.56, 1]} start={{ x: 0.18, y: 0.0 }} end={{ x: 0.82, y: 1 }} style={StyleSheet.absoluteFill} />
      <LinearGradient pointerEvents="none" colors={[`${g.mediaInk}29`, `${g.mediaInk}0A`, `${g.mediaInk}00`, `${g.mediaInk}0D`]} locations={[0, 0.28, 0.54, 1]} start={{ x: 0.25, y: 0.07 }} end={{ x: 0.75, y: 0.93 }} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.glow}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id={`xg-${key}`} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={a} stopOpacity={0.7} />
              <Stop offset="1" stopColor={a} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx="50" cy="50" r="50" fill={`url(#xg-${key})`} />
        </Svg>
      </View>
    </>
  );

  return (
    <View testID="fc-expanded-card" style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, dimStyle]}>
        <Pressable accessibilityRole="button" accessibilityLabel={copy.close} onPress={onClose} style={StyleSheet.absoluteFill}>
          <BlurView intensity={Platform.OS === 'android' ? 30 : 40} tint="dark" experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : 'none'} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.dim]} />
        </Pressable>
      </Animated.View>
      {/* зачем: при крупном шрифте стопка (карточка + пример + кнопки) может не поместиться — прокручивается, а не обрезается */}
      <ScrollView pointerEvents="box-none" style={StyleSheet.absoluteFill} contentContainerStyle={styles.center} showsVerticalScrollIndicator={false} bounces={false}>
        <View pointerEvents="box-none" style={styles.stack}>
          <Text style={[styles.overline, { color: g.secondary, lineHeight: lh(16) }]}>{overline}</Text>
          <Animated.View style={[styles.cardWrap, { height: cardH }, unfoldStyle]}>
            <Pressable testID="fc-expanded-card-flip" accessibilityRole="button" accessibilityLabel={flipped ? card.back : card.front} onPress={toggleFlip} style={styles.card}>
              <Animated.View style={[styles.face, { boxShadow: faceShadow }, frontStyle]}>
                {faceLayers(`${card.id}f`)}
                <View style={styles.faceText} onLayout={(e) => setFrontH(Math.ceil(e.nativeEvent.layout.height))}>
                  <Text style={[styles.en, { color: faceInk, lineHeight: lh(40) }]}>{card.front}</Text>
                  {card.ipa ? <Text style={[styles.ipa, { color: faceInkSoft, lineHeight: lh(22) }]}>{card.ipa}</Text> : null}
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={copy.speak} hitSlop={8} onPress={() => onSpeak(card.front)} style={[styles.speak, { backgroundColor: `${faceInk}1F` }]}>
                  <Ionicons name="volume-high" size={16} color={faceInk} />
                </Pressable>
                {card.dots ? (
                  <View style={styles.dots} pointerEvents="none">
                    {[0, 1, 2, 3].map((d) => <View key={d} /* guard-ok: ровно четыре точки */ style={[styles.dot, { backgroundColor: d < (card.dots ?? 0) ? g.accent : `${faceInk}38` }]} />)}
                  </View>
                ) : null}
                <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 28, boxShadow: bevelShadow(g.bevelHi, `${a}66`, g.bevelLo) }]} />
              </Animated.View>
              <Animated.View style={[styles.face, styles.faceBack, { boxShadow: faceShadow }, backStyle]}>
                {faceLayers(`${card.id}b`)}
                <View style={styles.faceText} onLayout={(e) => setBackH(Math.ceil(e.nativeEvent.layout.height))}>
                  <Text style={[styles.ru, { color: faceInk, lineHeight: lh(36) }]}>{card.back}</Text>
                </View>
                <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 28, boxShadow: bevelShadow(g.bevelHi, `${a}66`, g.bevelLo) }]} />
              </Animated.View>
            </Pressable>
          </Animated.View>
          {card.example ? (
            <View style={styles.exampleWrap}>
              <KitCard g={g} style={styles.example}>
                <View style={styles.examplePad}>
                  <Text style={[styles.exampleLabel, { color: g.secondary, lineHeight: lh(16) }]}>{copy.example}</Text>
                  <Text style={[styles.exampleText, { color: g.text, lineHeight: lh(23) }]}>{card.example}</Text>
                  {card.exampleTr ? <Text style={[styles.exampleTr, { color: g.secondary, lineHeight: lh(20) }]}>{card.exampleTr}</Text> : null}
                </View>
              </KitCard>
            </View>
          ) : null}
          {footer === 'own' ? (
            <View style={styles.acts}>
              {canEdit ? <ActTile g={g} icon="create-outline" label={copy.edit} testID="fc-expanded-edit" onPress={onEdit} /> : null}
              {showSave ? <ActTile g={g} icon={saved ? 'bookmark' : 'bookmark-outline'} label={saved ? copy.saved : copy.save} testID="fc-expanded-save" onPress={onToggleSave} /> : null}
              {canDelete ? <ActTile g={g} icon="trash-outline" label={copy.del} testID="fc-expanded-delete" onPress={onDelete} /> : null}
            </View>
          ) : null}
          {footer === 'foreign' ? (
            <View style={styles.foot}>
              <KitCta g={g} label={saved ? copy.saved : copy.save} icon={saved ? 'bookmark' : 'bookmark-outline'} onPress={onToggleSave} testID="fc-expanded-save" />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function ActTile({ g, icon, label, onPress, testID }: Readonly<{ g: ReturnType<typeof useLv2Glass>; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; testID: string }>) {
  const lh = useLineScale();
  return (
    <View style={styles.act}>
      <KitCard g={g} solid={g.opaqueControl} onPress={onPress} testID={testID} accessibilityLabel={label} style={styles.actCard}>
        <View style={styles.actInner}>
          <Ionicons name={icon} size={22} color={g.text} />
          <Text style={[styles.actText, { color: g.text, lineHeight: lh(20) }]}>{label}</Text>
        </View>
      </KitCard>
    </View>
  );
}

export const ExpandedCardV2 = memo(ExpandedCardInner);

const styles = StyleSheet.create({
  dim: { backgroundColor: 'rgba(2,2,4,0.72)' }, // theme-exempt: затемнение под карточкой — тёмный скрим в любой теме
  center: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: SIDE, paddingVertical: 24 },
  stack: { alignSelf: 'stretch' },
  overline: { textAlign: 'center', marginBottom: 12, fontSize: 13, lineHeight: 16, fontWeight: '700', letterSpacing: 3, textTransform: 'uppercase' },
  cardWrap: { minHeight: CARD_MIN_H },
  // текст граней на всю ширину грани, как в макете; высоту измеряем onLayout
  faceText: { alignSelf: 'stretch', alignItems: 'center' },
  card: { flex: 1 },
  face: { ...StyleSheet.absoluteFillObject, borderRadius: 28, padding: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backfaceVisibility: 'hidden' },
  faceBack: {},
  glow: { position: 'absolute', width: '80%', aspectRatio: 1, right: '-30%', top: '-40%', opacity: 0.55 },
  en: { width: '100%', textAlign: 'center', fontSize: 34, lineHeight: 40, fontWeight: '600', letterSpacing: -0.2 },
  ipa: { marginTop: 8, fontSize: 16, lineHeight: 22, fontStyle: 'italic', textAlign: 'center' },
  ru: { width: '100%', textAlign: 'center', fontSize: 30, lineHeight: 36, fontWeight: '600' },
  speak: { position: 'absolute', right: 14, top: 14, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dots: { position: 'absolute', left: 20, bottom: 18, flexDirection: 'row', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  exampleWrap: { marginTop: 14 },
  example: { minHeight: 0 },
  examplePad: { paddingVertical: 14, paddingHorizontal: 18 },
  exampleLabel: { fontSize: 13, lineHeight: 16, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
  exampleText: { marginTop: 8, fontSize: 16, lineHeight: 23 },
  exampleTr: { marginTop: 4, fontSize: 16, lineHeight: 20 },
  acts: { marginTop: 14, flexDirection: 'row', gap: 10 },
  act: { flex: 1 },
  actCard: { minHeight: 86 },
  actInner: { alignItems: 'center', justifyContent: 'center', gap: 10, flex: 1, paddingVertical: 12, paddingHorizontal: 6 },
  actText: { fontSize: 16, lineHeight: 20, fontWeight: '600', textAlign: 'center' },
  foot: { marginTop: 14 },
});
