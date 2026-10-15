import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import type { YoutubeChannelSnapshot } from '../../shared/youtube_catalog_contract';
import TapScale from '../TapScale';
import { useLang } from '../LangContext';
import { useTheme } from '../ThemeContext';
import { triLang } from '../../constants/i18n';
import { V2, V2_TYPE } from '../../constants/v2Style';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { plateBoxShadow } from '../v2/ShadowSurface';
import { FlowText } from '../text-integrity';
import type { StudyTarget } from '../../app/study_target';

// зачем (video.html `.lang`): флаг 24×15 изучаемого языка в пилюле «EN ⌄».
const STUDY_FLAG: Record<StudyTarget, number> = {
  en: require('../../assets/images/language_flags/language_en.webp'),
  es: require('../../assets/images/language_flags/language_es_dev.webp'),
  fr: require('../../assets/images/language_flags/language_fr_dev.webp'),
  de: require('../../assets/images/language_flags/language_de.webp'),
  it: require('../../assets/images/language_flags/language_it.webp'),
};

/**
 * Шапка раздела видео в стиле 2.0: крупный заголовок, под ним пилюля канала
 * (аватар/инициалы + название + шеврон), как `.chbtn` макета.
 * зачем (владелец 05.10 11:10, решение 5): справа — пилюля языка «🇬🇧 EN ⌄» по video.html `.lang` вместо кнопки
 * YouTube. Она рабочая: канал задаётся языком обучения, поэтому пилюля ведёт на экран выбора языка.
 * Без onOpenLanguage (экраны с «Назад») остаётся кнопка YouTube.
 */
export default function YoutubeChannelHeader({ channel, title, onBack, onOpenChannels, onOpenYoutube, studyTarget, onOpenLanguage, hideChannel = false }: {
  channel: YoutubeChannelSnapshot;
  /** Крупный заголовок; по умолчанию — название канала. */
  title?: string;
  onBack?: () => void;
  /** Без обработчика пилюля только показывает канал (канал задаётся языком обучения). */
  onOpenChannels?: () => void;
  onOpenYoutube: () => void;
  /** Текущий язык обучения для пилюли «EN ⌄». */
  studyTarget?: StudyTarget;
  /** Открыть выбор языка обучения; есть — вместо кнопки YouTube рисуется пилюля языка. */
  onOpenLanguage?: () => void;
  /** зачем (Ревизор/Макеты 15.10, #26/R59): канала этого языка нет или он ещё не известен — пилюлю канала не рисуем, чтобы не мелькал канал по умолчанию («Английский») над «нет роликов». */
  hideChannel?: boolean;
}) {
  const { lang } = useLang();
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const languageLabel = triLang(lang, { ru: 'Язык обучения', uk: 'Мова навчання', en: 'Learning language', es: 'Idioma de estudio', 'pt-BR': 'Idioma de estudo', vi: 'Ngôn ngữ học', id: 'Bahasa belajar', tr: 'Öğrenilen dil', pl: 'Język nauki' });
  const allChannels = triLang(lang, { ru: 'Все наши каналы', uk: 'Усі наші канали', en: 'All our channels', es: 'Todos nuestros canales', 'pt-BR': 'Todos os nossos canais', vi: 'Tất cả kênh', id: 'Semua kanal kami', tr: 'Tüm kanallarımız', pl: 'Wszystkie nasze kanały' });
  const channelAccessibilityLabel = `${allChannels}: ${channel.displayName}`;
  const back = triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Volver', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' });
  // зачем: в макете слева в пилюле круглая аватарка канала (`.chav`): картинка, а без неё — инициалы.
  const initials = channel.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join('');
  // зачем (Тень 12.10): круглая кнопка и пилюли шапки — плашки с тенью, без кромки `glassEdge`
  const plate = { backgroundColor: g.plateFillFrom, boxShadow: plateBoxShadow(g) };
  const actionButton = [styles.actionButton, plate];
  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        {onBack ? (
          <TapScale accessibilityRole="button" accessibilityLabel={back} onPress={onBack} style={actionButton}>
            <Ionicons name="chevron-back" size={22} color={g.text} />
          </TapScale>
        ) : null}
        <FlowText testID="youtube-channel-title" provenance={title ? 'authored' : 'external'} accessibilityRole="header" style={[styles.title, { color: g.text }]}>{title ?? channel.displayName}</FlowText>
        {onOpenLanguage && studyTarget ? (
          <TapScale testID="youtube-study-language" accessibilityRole="button" accessibilityLabel={`${languageLabel}: ${studyTarget.toUpperCase()}`} onPress={onOpenLanguage} style={[styles.langPill, plate]}>
            {/* зачем (Сверка video-001 🔴): TapScale кладёт детей в обёртку анимации, а стиль — на внешний Pressable, поэтому
                flexDirection:'row' пилюли не действовал и флаг/EN/⌄ вставали столбиком. Строка — во внутреннем View. */}
            <View style={styles.langRow}>
              <Image source={STUDY_FLAG[studyTarget]} style={styles.langFlag} contentFit="cover" accessible={false} />
              <Text style={[styles.langText, { color: g.text }]}>{studyTarget.toUpperCase()}</Text>
              <Ionicons name="chevron-down" size={16} color={g.text} />
            </View>
          </TapScale>
        ) : (
          <TapScale accessibilityRole="button" accessibilityLabel="YouTube" onPress={onOpenYoutube} style={actionButton}>
            <Ionicons name="logo-youtube" size={20} color={g.text} />
          </TapScale>
        )}
      </View>
      {hideChannel ? null : (() => {
      const pillBody = (
        <View style={styles.channelPillContent}>
          {channel.avatarUrl
            ? <Image testID="youtube-channel-avatar" accessible={false} source={{ uri: channel.avatarUrl }} style={styles.avatar} contentFit="cover" />
            : <View testID="youtube-channel-avatar" style={[styles.avatar, { backgroundColor: g.opaqueControl }]}><Text style={[styles.avatarText, { color: g.text }]}>{initials}</Text></View>}
          <FlowText testID="youtube-channel-name" provenance="external" style={[styles.channelName, { color: g.text }]}>{channel.displayName}</FlowText>
          {onOpenChannels ? <Ionicons name="chevron-down" size={17} color={g.secondary} style={styles.channelChevron} /> : null}
        </View>
      );
      // зачем (владелец 01.10): каждый канал — отдельный контур по языку обучения; выбора каналов нет.
      return onOpenChannels ? (
        <TapScale testID="youtube-all-channels" accessibilityRole="button" accessibilityLabel={channelAccessibilityLabel} onPress={onOpenChannels} style={[styles.channelPill, plate]}>
          {pillBody}
        </TapScale>
      ) : (
        <View testID="youtube-channel-pill" accessible accessibilityLabel={channel.displayName} style={[styles.channelPill, plate]}>
          {pillBody}
        </View>
      );
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: V2.iconButton },
  actionButton: { width: V2.iconButton, height: V2.iconButton, borderRadius: V2.iconButton / 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  title: { ...V2_TYPE.largeTitle, flex: 1, minWidth: 0 },
  channelPill: { minHeight: 44, alignSelf: 'flex-start', maxWidth: '100%', borderRadius: 22, marginTop: 14, paddingLeft: 6, paddingRight: 14, justifyContent: 'center' },
  channelPillContent: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
  avatarText: { fontSize: 13, fontWeight: '800' },
  // зачем (Сверка video-001: в пилюле было только фото): flex:1 в пилюле шириной по содержимому давал названию 0 px —
  // имя канала схлопывалось. Теперь ширина по тексту, сжимается только при нехватке места; `.chbtn` 16/700.
  channelName: { ...V2_TYPE.body, fontWeight: '700', flexShrink: 1, minWidth: 0 },
  channelChevron: { flexShrink: 0 },
  // video.html `.lang`: высота 35, поля 10/12, r18, зазор 8, текст 15/700; флаг 24×15 r3
  langPill: { height: 35, borderRadius: 18, justifyContent: 'center', flexShrink: 0 },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 10, paddingRight: 12 },
  langFlag: { width: 24, height: 15, borderRadius: 3 },
  langText: { fontSize: 16, fontWeight: '700' },
});
