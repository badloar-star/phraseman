import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { triLang, type Lang } from '../../constants/i18n';
import { pluralWord } from '../../constants/plural';
import { useTheme } from '../ThemeContext';
import { useLv2Glass } from '../learning-v2/LearningV2Glass';
import {
  MISTAKE_TITLES,
  type MistakeRewardsSnapshot,
  type MistakeTitleId,
} from '../../modules/mistake-practice/rewards_model';

/**
 * Шапка полки исправленного (макет полки А): текущее звание, прогресс до
 * следующего и лестница порогов.
 *
 * Звания живут внутри раздела (решение владельца 2026-09-14): общий каталог
 * достижений сознательно сужен до фундаментных, и его фильтр мы не трогали.
 */

type Props = {
  lang: Lang;
  rewards: MistakeRewardsSnapshot | null;
};

const copyFor = (lang: Lang) => triLang(lang, {
  ru: { fixed: 'Исправлено навсегда', toNext: 'До звания', titles: { attentive: 'Внимательный', proofreader: 'Корректор', editor: 'Редактор', master: 'Мастер' }, ladder: 'Звания', streak: 'Серия', days: { one: "день", few: "дня", many: "дней" }, fixes: { one: "исправление", few: "исправления", many: "исправлений" } },
  uk: { fixed: 'Виправлено назавжди', toNext: 'До звання', titles: { attentive: 'Уважний', proofreader: 'Коректор', editor: 'Редактор', master: 'Майстер' }, ladder: 'Звання', streak: 'Серія', days: { one: "день", few: "дні", many: "днів" }, fixes: { one: "виправлення", few: "виправлення", many: "виправлень" } },
  en: { fixed: 'Fixed for good', toNext: 'To the title', titles: { attentive: 'Attentive', proofreader: 'Proofreader', editor: 'Editor', master: 'Master' }, ladder: 'Titles', streak: 'Streak', days: { one: "day", few: "days", many: "days" }, fixes: { one: "fix", few: "fixes", many: "fixes" } },
  es: { fixed: 'Corregido para siempre', toNext: 'Para el título', titles: { attentive: 'Atento', proofreader: 'Corrector', editor: 'Editor', master: 'Maestro' }, ladder: 'Títulos', streak: 'Racha', days: { one: "día", few: "días", many: "días" }, fixes: { one: "corrección", few: "correcciones", many: "correcciones" } },
  'pt-BR': { fixed: 'Corrigido para sempre', toNext: 'Para o título', titles: { attentive: 'Atento', proofreader: 'Revisor', editor: 'Editor', master: 'Mestre' }, ladder: 'Títulos', streak: 'Sequência', days: { one: "dia", few: "dias", many: "dias" }, fixes: { one: "correção", few: "correções", many: "correções" } },
  vi: { fixed: 'Đã sửa hẳn', toNext: 'Đến danh hiệu', titles: { attentive: 'Chăm chú', proofreader: 'Người soát lỗi', editor: 'Biên tập', master: 'Bậc thầy' }, ladder: 'Danh hiệu', streak: 'Chuỗi', days: { one: "ngày", few: "ngày", many: "ngày" }, fixes: { one: "lỗi", few: "lỗi", many: "lỗi" } },
  id: { fixed: 'Diperbaiki selamanya', toNext: 'Menuju gelar', titles: { attentive: 'Teliti', proofreader: 'Korektor', editor: 'Editor', master: 'Master' }, ladder: 'Gelar', streak: 'Rentetan', days: { one: "hari", few: "hari", many: "hari" }, fixes: { one: "perbaikan", few: "perbaikan", many: "perbaikan" } },
  tr: { fixed: 'Kalıcı olarak düzeltildi', toNext: 'Unvana', titles: { attentive: 'Dikkatli', proofreader: 'Düzeltmen', editor: 'Editör', master: 'Usta' }, ladder: 'Unvanlar', streak: 'Seri', days: { one: "gün", few: "gün", many: "gün" }, fixes: { one: "düzeltme", few: "düzeltme", many: "düzeltme" } },
  pl: { fixed: 'Poprawione na zawsze', toNext: 'Do tytułu', titles: { attentive: 'Uważny', proofreader: 'Korektor', editor: 'Redaktor', master: 'Mistrz' }, ladder: 'Tytuły', streak: 'Seria', days: { one: "dzień", few: "dni", many: "dni" }, fixes: { one: "poprawka", few: "poprawki", many: "poprawek" } },
});

function MistakeTitleShelf({ lang, rewards }: Props) {
  const { f } = useTheme();
  const g = useLv2Glass();
  const copy = useMemo(() => copyFor(lang), [lang]);
  // зачем (аудит 2026-09-15): при нуле исправленных шапка с крупным «0» и
  // лестницей замков висит над пустым списком и выглядит как сбой.
  if (!rewards || rewards.corrected < 1) return null;

  const share = rewards.nextTitle
    ? Math.min(1, rewards.corrected / rewards.nextTitle.title.threshold)
    : 1;

  return (
    <View style={styles.wrap}>
      <View style={[styles.card, { backgroundColor: g.opaqueControl }]}>
        <View style={styles.headRow}>
          <View style={[styles.medal, { backgroundColor: g.text }]}>
            <Ionicons name="ribbon" size={30} color={g.ctaInk} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.count, { color: g.text }]}>{rewards.corrected}</Text>
            <Text style={[styles.caption, { color: g.text, fontSize: f.body }]}>
              {rewards.title ? copy.titles[rewards.title.id] : copy.fixed}
            </Text>
          </View>
          {rewards.streakDays > 0 ? (
            <View style={[styles.streak, { backgroundColor: g.opaqueCard }]}>
              <Ionicons name="flame" size={16} color={g.text} />
              <Text style={[styles.streakText, { color: g.text, fontSize: f.sub }]}>
                {rewards.streakDays} {pluralWord(lang, rewards.streakDays, copy.days)}
              </Text>
            </View>
          ) : null}
        </View>
        {rewards.nextTitle ? (
          <>
            <View style={[styles.track, { backgroundColor: g.opaqueControl }]}>
              <View style={[styles.fill, { backgroundColor: g.text, width: `${share * 100}%` }]} />
            </View>
            <Text style={[styles.hint, { color: g.secondary, fontSize: f.sub }]}>
              {copy.toNext} «{copy.titles[rewards.nextTitle.title.id]}» — {rewards.nextTitle.remaining} {pluralWord(lang, rewards.nextTitle.remaining, copy.fixes)}
            </Text>
          </>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: g.opaqueCard }]}>
        <Text style={[styles.ladderTitle, { color: g.text, fontSize: f.body }]}>{copy.ladder}</Text>
        <View style={styles.ladder}>
          {MISTAKE_TITLES.map((title) => {
            const reached = rewards.corrected >= title.threshold;
            const current = rewards.title?.id === title.id;
            return (
              <View
                key={title.id}
                style={[styles.rung, { backgroundColor: current ? g.opaqueControl : reached ? g.opaqueControl : 'transparent' }]}
              >
                <View style={[styles.rungMark, { backgroundColor: reached ? g.text : g.opaqueControl }]}>
                  <Ionicons
                    name={reached ? 'checkmark' : 'lock-closed'}
                    size={16}
                    color={reached ? g.ctaInk : g.mutedText}
                  />
                </View>
                <Text style={[styles.rungName, { color: reached ? g.text : g.secondary, fontSize: f.body }]}>
                  {copy.titles[title.id as MistakeTitleId]}
                </Text>
                <Text style={[styles.rungNum, { color: g.secondary, fontSize: f.sub }]}>{title.threshold}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, paddingBottom: 4 },
  card: { borderRadius: 22, padding: 18, gap: 12 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  medal: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  count: { fontSize: 34, fontWeight: '900', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  caption: { fontWeight: '800', marginTop: 2 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 32, paddingHorizontal: 10, borderRadius: 16 },
  streakText: { fontWeight: '900', fontVariant: ['tabular-nums'] },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5 },
  hint: { fontWeight: '700' },
  ladderTitle: { fontWeight: '900' },
  ladder: { gap: 8 },
  rung: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 8, minHeight: 48 },
  rungMark: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rungName: { flex: 1, fontWeight: '800' },
  rungNum: { fontWeight: '900', fontVariant: ['tabular-nums'] },
});

export default memo(MistakeTitleShelf);
