import React, { memo, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import AnimatedCountUpText from '../AnimatedCountUpText';
import { triLang, type Lang } from '../../constants/i18n';
import { pluralWord } from '../../constants/plural';
import { useLv2Glass } from '../learning-v2/LearningV2Glass';
import { MiniDots, Panel, PanelCta, PanelDock, PanelRing, PanelRow } from '../mistakes-panel/PanelKit';
import { RoundButton } from '../mistakes-panel/PracticeKit';
import {
  type MistakeRewardsSnapshot,
  type MistakeTitleId,
} from '../../modules/mistake-practice/rewards_model';

/**
 * Итог отработки — «Итог отработки» макета «Панель» (docs/design/v2-app/mistakes-panel.html, вариант Б, одобрен владельцем 04.10).
 *
 * Кольцо «9/12 верно», панель из трёх чисел (исправлено совсем · ближе к исправлению · ещё повторить), список исправленных фраз и кнопки внизу.
 * Монеты за сессию, серия исправлений и новое звание (решение владельца 04.10: монеты видны в итоге, звания остаются) — строками той же панели.
 * Всё рисуется из УЖЕ посчитанных локальных данных — экран ничего не ждёт от сервера (Optimistic UI): начисление догоняет фоном.
 */

export type MistakeFinaleFixed = Readonly<{ mistakeId: string; phrase: string; meaning: string | null }>;

type Props = {
  lang: Lang;
  /** Сколько заданий было в сессии. */
  answered: number;
  total: number;
  /** Сколько раз за сессию ответили неверно. */
  wrong: number;
  runes: number;
  /** Ошибки, ушедшие навсегда именно в этой сессии. */
  fixed: readonly MistakeFinaleFixed[];
  rewards: MistakeRewardsSnapshot | null;
  /** Звание, поднятое этой сессией (null — не поднялось). */
  newTitle: MistakeTitleId | null;
  onDone: () => void;
  /** Повторить то, что не вышло: пока в продукте нет такой сессии — кнопка рисуется, только если экран передал действие. */
  onMore?: () => void;
};

const copyFor = (lang: Lang) => triLang(lang, {
  ru: { close: 'Закрыть', correct: 'верно', fixedFully: 'Исправлено совсем', closer: 'Ближе к исправлению', repeat: 'Ещё повторить', coins: 'Монеты', fixedSection: 'Исправлено', streak: 'Серия исправлений', days: { one: 'день', few: 'дня', many: 'дней' }, newTitle: 'Новое звание', titles: { attentive: 'Внимательный', proofreader: 'Корректор', editor: 'Редактор', master: 'Мастер' }, more: 'Ещё', finish: 'Готово' },
  uk: { close: 'Закрити', correct: 'правильно', fixedFully: 'Виправлено остаточно', closer: 'Ближче до виправлення', repeat: 'Ще повторити', coins: 'Монети', fixedSection: 'Виправлено', streak: 'Серія виправлень', days: { one: 'день', few: 'дні', many: 'днів' }, newTitle: 'Нове звання', titles: { attentive: 'Уважний', proofreader: 'Коректор', editor: 'Редактор', master: 'Майстер' }, more: 'Ще', finish: 'Готово' },
  en: { close: 'Close', correct: 'correct', fixedFully: 'Fixed for good', closer: 'Closer to fixed', repeat: 'Still to repeat', coins: 'Coins', fixedSection: 'Fixed', streak: 'Fixing streak', days: { one: 'day', few: 'days', many: 'days' }, newTitle: 'New title', titles: { attentive: 'Attentive', proofreader: 'Proofreader', editor: 'Editor', master: 'Master' }, more: 'More', finish: 'Done' },
  es: { close: 'Cerrar', correct: 'correctas', fixedFully: 'Corregido para siempre', closer: 'Más cerca de corregir', repeat: 'Aún por repetir', coins: 'Monedas', fixedSection: 'Corregido', streak: 'Racha de correcciones', days: { one: 'día', few: 'días', many: 'días' }, newTitle: 'Nuevo título', titles: { attentive: 'Atento', proofreader: 'Corrector', editor: 'Editor', master: 'Maestro' }, more: 'Más', finish: 'Listo' },
  'pt-BR': { close: 'Fechar', correct: 'corretas', fixedFully: 'Corrigido para sempre', closer: 'Mais perto de corrigir', repeat: 'Ainda a repetir', coins: 'Moedas', fixedSection: 'Corrigido', streak: 'Sequência de correções', days: { one: 'dia', few: 'dias', many: 'dias' }, newTitle: 'Novo título', titles: { attentive: 'Atento', proofreader: 'Revisor', editor: 'Editor', master: 'Mestre' }, more: 'Mais', finish: 'Pronto' },
  vi: { close: 'Đóng', correct: 'đúng', fixedFully: 'Đã sửa hẳn', closer: 'Gần sửa xong', repeat: 'Còn phải lặp lại', coins: 'Xu', fixedSection: 'Đã sửa', streak: 'Chuỗi ngày sửa lỗi', days: { one: 'ngày', few: 'ngày', many: 'ngày' }, newTitle: 'Danh hiệu mới', titles: { attentive: 'Chăm chú', proofreader: 'Người soát lỗi', editor: 'Biên tập', master: 'Bậc thầy' }, more: 'Thêm', finish: 'Xong' },
  id: { close: 'Tutup', correct: 'benar', fixedFully: 'Diperbaiki selamanya', closer: 'Mendekati diperbaiki', repeat: 'Masih diulang', coins: 'Koin', fixedSection: 'Diperbaiki', streak: 'Rentetan perbaikan', days: { one: 'hari', few: 'hari', many: 'hari' }, newTitle: 'Gelar baru', titles: { attentive: 'Teliti', proofreader: 'Korektor', editor: 'Editor', master: 'Master' }, more: 'Lagi', finish: 'Selesai' },
  tr: { close: 'Kapat', correct: 'doğru', fixedFully: 'Kalıcı düzeldi', closer: 'Düzelmeye yakın', repeat: 'Hâlâ tekrar', coins: 'Jeton', fixedSection: 'Düzeltildi', streak: 'Düzeltme serisi', days: { one: 'gün', few: 'gün', many: 'gün' }, newTitle: 'Yeni unvan', titles: { attentive: 'Dikkatli', proofreader: 'Düzeltmen', editor: 'Editör', master: 'Usta' }, more: 'Daha', finish: 'Bitti' },
  pl: { close: 'Zamknij', correct: 'dobrze', fixedFully: 'Poprawione na zawsze', closer: 'Bliżej poprawy', repeat: 'Jeszcze powtórzyć', coins: 'Monety', fixedSection: 'Poprawione', streak: 'Seria poprawek', days: { one: 'dzień', few: 'dni', many: 'dni' }, newTitle: 'Nowy tytuł', titles: { attentive: 'Uważny', proofreader: 'Korektor', editor: 'Redaktor', master: 'Mistrz' }, more: 'Jeszcze', finish: 'Gotowe' },
});

function MistakeSessionFinale({
  lang, answered, total, wrong, runes, fixed, rewards, newTitle, onDone, onMore,
}: Props) {
  const g = useLv2Glass();
  const copy = useMemo(() => copyFor(lang), [lang]);
  const base = Math.max(total, answered, 0);
  const missed = Math.min(base, Math.max(0, wrong));
  const right = Math.max(0, base - missed);
  const closer = Math.max(0, right - fixed.length);
  const share = base > 0 ? right / base : 0;
  const count = (label: string, value: React.ReactNode, first?: boolean) => (
    <PanelRow g={g} first={first} title={label} right={<Text style={[styles.num, { color: g.text }]}>{value}</Text>} />
  );

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topbar}>
          <RoundButton g={g} icon="close" label={copy.close} onPress={onDone} testID="mistake-finale-close" />
        </View>
        <PanelRing g={g} progress={share}>
          <Text style={[styles.big, { color: g.text }]}>{`${right}/${base}`}</Text>
          <Text style={[styles.bigLabel, { color: g.secondary }]}>{copy.correct}</Text>
        </PanelRing>
        <Panel g={g} style={styles.counts}>
          {count(copy.fixedFully, fixed.length, true)}
          {count(copy.closer, closer)}
          {count(copy.repeat, missed)}
          {/* зачем (решение владельца 04.10): монеты видны в итоге; серия и звание остаются строками той же панели. */}
          {count(copy.coins, <AnimatedCountUpText value={runes} style={[styles.num, { color: g.text }]} accessibilityLabel={`${runes} ${copy.coins}`} />)}
          {rewards && rewards.streakDays > 0 ? count(copy.streak, `${rewards.streakDays} ${pluralWord(lang, rewards.streakDays, copy.days)}`) : null}
          {newTitle ? count(copy.newTitle, copy.titles[newTitle]) : null}
        </Panel>

        {fixed.length > 0 ? (
          <>
            <Text style={[styles.section, { color: g.secondary }]}>{copy.fixedSection}</Text>
            <Panel g={g}>
              {fixed.map((item, index) => (
                <PanelRow key={item.mistakeId} g={g} first={index === 0} title={item.phrase} subtitle={item.meaning} right={<MiniDots g={g} n={3} />} />
              ))}
            </Panel>
          </>
        ) : null}
      </ScrollView>
      <PanelDock>
        <View style={styles.actions}>
          {onMore ? <PanelCta g={g} ghost flex testID="mistake-finale-more" label={`${copy.more} ${missed}`} onPress={onMore} /> : null}
          <PanelCta g={g} flex={!!onMore} testID="mistake-finale-done" label={copy.finish} onPress={onDone} />
        </View>
      </PanelDock>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 140 },
  topbar: { height: 44, marginTop: 6, flexDirection: 'row', alignItems: 'center' },
  big: { fontSize: 58, lineHeight: 60, fontWeight: '800', letterSpacing: -1.5 },
  bigLabel: { marginTop: 2, fontSize: 15, lineHeight: 19 },
  counts: { marginTop: 22 },
  num: { marginLeft: 'auto', fontSize: 22, lineHeight: 28, fontWeight: '700' },
  section: { marginTop: 20, marginBottom: 8, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10 },
});

export default memo(MistakeSessionFinale);
