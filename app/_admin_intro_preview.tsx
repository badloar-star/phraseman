/**
 * Admin Intro Preview — превью онбординг-экранов уроков (1–32).
 *
 * Доступен только из админ-панели `settings_testers` (DEV / DEV_MODE).
 * Позволяет:
 *   - быстро увидеть, у каких уроков уже есть intro-контент, а у каких пусто;
 *   - открыть тот же `LessonIntroScreens`, что увидит пользователь, и проверить
 *     анимацию/верстку не запуская сам урок и не сбрасывая флаги;
 *   - одной кнопкой сбросить флаги показа `lesson${id}_intro_shown` для всех уроков —
 *     чтобы интро снова сработало при первом реальном входе.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
  Animated,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { emitAppEvent } from './events';
import LessonIntroScreens from './lesson_intro_screens';
import { getLessonIntroScreens } from './lesson_data_all';
import { DEV_MODE } from './config';

const SCREEN_W = Dimensions.get('window').width;

const RED = '#FF2020';
const RED_DIM = '#CC0000';
const RED_BORDER = 'rgba(255,32,32,0.35)';

const LESSON_IDS = Array.from({ length: 32 }, (_, i) => i + 1);

function levelOf(lessonId: number): 'A1' | 'A2' | 'B1' | 'B2' {
  if (lessonId <= 8) return 'A1';
  if (lessonId <= 18) return 'A2';
  if (lessonId <= 28) return 'B1';
  return 'B2';
}

const LEVEL_COLORS: Record<string, string> = {
  A1: '#4CAF72',
  A2: '#40B4E8',
  B1: '#D4A017',
  B2: '#DC6428',
};

/** Подпись «N блок(ов)» для плитки превью (RU/UK/ES). */
function formatIntroBlocksCount(lang: Lang, count: number): string {
  if (lang === 'es') {
    return `${count} ${count === 1 ? 'bloque' : 'bloques'}`;
  }
  if (lang === 'uk') {
    const mod10 = count % 10;
    const mod100 = count % 100;
    const word =
      mod10 === 1 && mod100 !== 11
        ? 'блок'
        : mod10 >= 2 &&
            mod10 <= 4 &&
            (mod100 < 10 || mod100 >= 20)
          ? 'блоки'
          : 'блоків';
    return `${count} ${word}`;
  }
  const ruWord =
    count === 1 ? 'блок' : count >= 2 && count <= 4 ? 'блока' : 'блоков';
  return `${count} ${ruWord}`;
}

interface LessonTileMeta {
  id: number;
  level: 'A1' | 'A2' | 'B1' | 'B2';
  hasIntro: boolean;
  blocksCount: number;
  introShown: boolean;
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ color: '#FFB0B0', fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

interface LessonTileProps {
  meta: LessonTileMeta;
  width: number;
  lang: Lang;
  onPress: () => void;
}

function LessonTile({ meta, width, lang, onPress }: LessonTileProps) {
  const press = useMemo(() => new Animated.Value(1), []);
  const lvlColor = LEVEL_COLORS[meta.level];
  const ready = meta.hasIntro;
  const emptyLabel = triLang(lang, { ru: 'пусто', uk: 'порожньо', es: 'vacío' });

  const handlePressIn = () => {
    Animated.spring(press, { toValue: 0.96, useNativeDriver: true, tension: 220, friction: 7 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(press, { toValue: 1, useNativeDriver: true, tension: 220, friction: 7 }).start();
  };

  const containerStyle: ViewStyle = {
    width,
    aspectRatio: 0.9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ready ? `${lvlColor}99` : 'rgba(255,80,80,0.25)',
    backgroundColor: ready ? `${lvlColor}1A` : 'rgba(60,0,0,0.45)',
    padding: 8,
    justifyContent: 'space-between',
  };

  return (
    <Animated.View style={{ transform: [{ scale: press }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.85}
        style={containerStyle}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Text style={{ color: lvlColor, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 }}>
            {meta.level}
          </Text>
          {meta.introShown && (
            <Ionicons name="eye" size={10} color="#FF8080" />
          )}
        </View>

        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 2 }}>
          <Text style={{ color: ready ? '#FFFFFF' : '#FF8080', fontSize: 22, fontWeight: '900', letterSpacing: 0.5 }}>
            {meta.id}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
          {ready ? (
            <>
              <Ionicons name="checkmark-circle" size={11} color={lvlColor} />
              <Text style={{ color: lvlColor, fontSize: 9, fontWeight: '700' }}>
                {formatIntroBlocksCount(lang, meta.blocksCount)}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="ellipse-outline" size={10} color="#FF8080" />
              <Text style={{ color: '#FF8080', fontSize: 9, fontWeight: '700' }}>{emptyLabel}</Text>
            </>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function AdminIntroPreview() {
  const router = useRouter();
  const { f } = useTheme();
  const { lang } = useLang();

  const [previewLessonId, setPreviewLessonId] = useState<number | null>(null);
  const [tiles, setTiles] = useState<LessonTileMeta[]>([]);
  const [shownFlagsCount, setShownFlagsCount] = useState(0);

  // Защита от deep-link на проде
  useEffect(() => {
    if (!__DEV__ && !DEV_MODE) {
      router.replace('/(tabs)/settings' as any);
    }
  }, [router]);

  const loadMeta = async () => {
    const introShownPairs = await AsyncStorage.multiGet(
      LESSON_IDS.map((id) => `lesson${id}_intro_shown`),
    );
    const shownMap = new Map<number, boolean>();
    introShownPairs.forEach(([key, val], idx) => {
      shownMap.set(LESSON_IDS[idx], val === 'true' || val === '1');
    });
    const next: LessonTileMeta[] = LESSON_IDS.map((id) => {
      const blocks = getLessonIntroScreens(id);
      return {
        id,
        level: levelOf(id),
        hasIntro: blocks.length > 0,
        blocksCount: blocks.length,
        introShown: shownMap.get(id) === true,
      };
    });
    setTiles(next);
    setShownFlagsCount(next.filter((m) => m.introShown).length);
  };

  useEffect(() => {
    void loadMeta();
  }, []);

  const handleOpenPreview = (id: number) => {
    hapticTap();
    setPreviewLessonId(id);
  };

  const handleClosePreview = () => {
    setPreviewLessonId(null);
  };

  const handleResetAllFlags = async () => {
    hapticTap();
    await AsyncStorage.multiRemove(LESSON_IDS.map((id) => `lesson${id}_intro_shown`));
    await loadMeta();
    emitAppEvent('action_toast', {
      type: 'success',
      messageRu: 'Флаги показа интро сброшены для всех 32 уроков',
      messageUk: 'Прапори показу інтро скинуто для всіх 32 уроків',
      messageEs: 'Reinicio de intros: las 32 lecciones vuelven a mostrar la intro.',
    });
  };

  // Сетка 4 в ряд
  const gap = 10;
  const sidePad = 16;
  const cols = 4;
  const tileW = Math.floor((SCREEN_W - sidePad * 2 - gap * (cols - 1)) / cols);

  const totalWith = useMemo(() => tiles.filter((m) => m.hasIntro).length, [tiles]);
  const totalEmpty = useMemo(() => tiles.length - totalWith, [tiles, totalWith]);

  const headerTitle = triLang(lang, {
    ru: '📖 Превью интро уроков',
    uk: '📖 Попередній перегляд інтро уроків',
    es: '📖 Vista previa de intros de lección',
  });
  const headerSubtitle = triLang(lang, {
    ru: `Готово ${totalWith}/32 · пусто ${totalEmpty} · флаг «показано»: ${shownFlagsCount}`,
    uk: `Готово ${totalWith}/32 · порожньо ${totalEmpty} · прапор «показано»: ${shownFlagsCount}`,
    es: `Con intro ${totalWith}/32 · vacío ${totalEmpty} · marca «vista»: ${shownFlagsCount}`,
  });
  const resetTitle = triLang(lang, {
    ru: 'Сбросить флаги показа всех 32 уроков',
    uk: 'Скинути прапори показу всіх 32 уроків',
    es: 'Reiniciar marcas de intro de las 32 lecciones',
  });
  const resetSubtitle = triLang(lang, {
    ru: 'Удаляет lesson{id}_intro_shown — интро снова появится при первом реальном входе',
    uk: 'Видаляє lesson{id}_intro_shown — інтро знову з’явиться під час першого реального входу',
    es: 'Elimina lesson{id}_intro_shown — la intro vuelve en la primera visita real',
  });
  const howTitle = triLang(lang, {
    ru: 'Как пользоваться',
    uk: 'Як користуватися',
    es: 'Cómo usar esto',
  });
  const howBody = triLang(lang, {
    ru:
      '• Тап по плитке урока — откроет тот же экран онбординга, что увидит пользователь.\n'
      + '• «Начать урок» или ✕ внутри превью просто закроют оверлей. Сам урок не запустится.\n'
      + '• Превью можно открывать сколько угодно раз — флаг показа НЕ записывается.',
    uk:
      '• Тап по плитці уроку — відкриє той самий екран онбордингу, що бачить користувач.\n'
      + '• «Розпочати урок» або ✕ у прев’ю просто закриють оверлей. Сам урок не запускається.\n'
      + '• Прев’ю можна відкривати скільки завгодно — прапор показу НЕ записується.',
    es:
      '• Toca una lección: verás la misma intro que el usuario.\n'
      + '• «Empezar la lección» o ✕ solo cierran la superposición; no arranca la lección.\n'
      + '• Puedes abrir la vista previa las veces que quieras: no se guarda ningún marcador.',
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#0D0000' }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 18,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: RED_BORDER,
            backgroundColor: 'rgba(13,0,0,0.92)',
          }}
        >
          <TouchableOpacity onPress={() => { hapticTap(); router.back(); }} hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}>
            <Ionicons name="chevron-back" size={28} color={RED} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text
              style={{
                color: RED,
                fontSize: f.h2,
                fontWeight: '900',
                textShadowColor: RED_DIM,
                textShadowRadius: 8,
                textShadowOffset: { width: 0, height: 0 },
              }}
            >
              {headerTitle}
            </Text>
            <Text style={{ color: '#FF8080', fontSize: f.caption, marginTop: 2 }}>
              {headerSubtitle}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: sidePad, paddingTop: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Action bar */}
          <View style={{ marginBottom: 16, gap: 10 }}>
            <TouchableOpacity
              onPress={handleResetAllFlags}
              activeOpacity={0.78}
              style={{
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: RED,
                backgroundColor: 'rgba(255,0,0,0.10)',
                paddingHorizontal: 14,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Ionicons name="refresh-circle-outline" size={22} color={RED} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFB0B0', fontSize: 15, fontWeight: '800' }}>
                  {resetTitle}
                </Text>
                <Text style={{ color: '#FF8080', fontSize: 12, marginTop: 2 }}>
                  {resetSubtitle}
                </Text>
              </View>
            </TouchableOpacity>

            <View
              style={{
                borderRadius: 12,
                borderWidth: 0.5,
                borderColor: RED_BORDER,
                backgroundColor: 'rgba(30,0,0,0.55)',
                padding: 12,
                gap: 6,
              }}
            >
              <Text style={{ color: '#FFB0B0', fontSize: 13, fontWeight: '700' }}>
                {howTitle}
              </Text>
              <Text style={{ color: '#FF8080', fontSize: 12, lineHeight: 17 }}>
                {howBody}
              </Text>
            </View>
          </View>

          {/* Легенда */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
            <LegendDot color="#4CAF72" label="A1 (1–8)" />
            <LegendDot color="#40B4E8" label="A2 (9–18)" />
            <LegendDot color="#D4A017" label="B1 (19–28)" />
            <LegendDot color="#DC6428" label="B2 (29–32)" />
          </View>

          {/* Grid 4×8 */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
            {tiles.map((m) => (
              <LessonTile
                key={m.id}
                meta={m}
                width={tileW}
                lang={lang}
                onPress={() => handleOpenPreview(m.id)}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Полноэкранный модал с настоящим LessonIntroScreens — НО без записи флага */}
      <Modal
        visible={previewLessonId !== null}
        animationType="fade"
        presentationStyle="overFullScreen"
        transparent={false}
        onRequestClose={handleClosePreview}
      >
        {previewLessonId !== null && (
          <View style={{ flex: 1 }}>
            <LessonIntroScreens
              introScreens={getLessonIntroScreens(previewLessonId)}
              lessonId={previewLessonId}
              onComplete={handleClosePreview}
            />
            {/* Маленький бейдж «PREVIEW» в углу, чтобы не путать с реальным запуском */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 56,
                left: 12,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 8,
                backgroundColor: RED,
                opacity: 0.92,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>
                PREVIEW · LESSON {previewLessonId}
              </Text>
            </View>
          </View>
        )}
      </Modal>

      {/* tiny screen reader hint — не отображается, но улучшает локальный диалект */}
      <Text style={{ position: 'absolute', left: -9999 }} accessible={false}>
        {triLang(lang, {
          ru: 'превью интро уроков',
          uk: 'превʼю інтро уроків',
          es: 'vista previa de intros de lección',
        })}
      </Text>
    </View>
  );
}
