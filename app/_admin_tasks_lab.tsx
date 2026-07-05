import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
/**
 * _admin_tasks_lab.tsx — DEV-редактор «Заданий-опросов» с телефона.
 *
 * Владелец вводит ВСЁ на русском (название задания, описание, вопросы с вариантами
 * или свободным текстом, награду, цвет плашки, текст финального экрана). При
 * «Создать» тексты автоматически переводятся ИИ на все языки (adminTranslateMessage)
 * и опрос сохраняется СРАЗУ включённым → появляется 4-й плашкой в «Вызовах дня».
 * Ниже — список созданных заданий с кнопкой убрать.
 *
 * Открывается только под ENABLE_DEV_TOOLS; в проде вырезается стабом.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ENABLE_DEV_TOOLS } from './config';
import { useTheme } from '../components/ThemeContext';
import { hapticTap, hapticSuccess } from '../hooks/use-haptics';
import {
  adminListShardSurveys,
  adminWriteShardSurvey,
  adminDeleteShardSurvey,
  localizeRuStrings,
  type AdminSurveyRow,
  type ShardSurveyConfigInput,
} from './survey_client';

// Пресеты цвета плашки — «не такой как все» (обычные задания на bgCard).
const COLOR_SWATCHES = ['#6C47FF', '#EF6461', '#2EC4B6', '#F4A259', '#3A86FF', '#E85D9E', '#63D98F', '#8A5CF6'];

type DraftOption = { id: string; label: string };
type DraftQuestion = { id: string; type: 'single_choice' | 'text'; text: string; options: DraftOption[] };

function makeQuestion(n: number): DraftQuestion {
  return { id: `q${n}`, type: 'single_choice', text: '', options: [{ id: 'opt1', label: '' }, { id: 'opt2', label: '' }] };
}

export default function AdminTasksLab() {
  const router = useRouter();
  const insets = useStableSafeAreaInsets();
  const { theme: t } = useTheme();

  const [rows, setRows] = useState<AdminSurveyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState('');

  // Черновик нового задания (всё на русском).
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [reward, setReward] = useState(3);
  const [accentColor, setAccentColor] = useState(COLOR_SWATCHES[0]);
  const [tier, setTier] = useState<'any' | 'free' | 'premium'>('any');
  const [finalTitle, setFinalTitle] = useState('Спасибо!');
  const [finalSubtitle, setFinalSubtitle] = useState('Твой ответ поможет сделать приложение лучше.');
  const [questions, setQuestions] = useState<DraftQuestion[]>([makeQuestion(1)]);

  useEffect(() => {
    if (!ENABLE_DEV_TOOLS) router.replace('/(tabs)/home' as any);
  }, [router]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setRows(await adminListShardSurveys()); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  // ── Мутаторы черновика ────────────────────────────────────────────────────
  const setQ = (i: number, patch: Partial<DraftQuestion>) =>
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  const setOpt = (qi: number, oi: number, label: string) =>
    setQuestions((prev) => prev.map((q, idx) => idx !== qi ? q
      : { ...q, options: q.options.map((o, j) => (j === oi ? { ...o, label } : o)) }));
  const addQuestion = () => { hapticTap(); setQuestions((prev) => [...prev, makeQuestion(prev.length + 1)]); };
  const removeQuestion = (i: number) => { hapticTap(); setQuestions((prev) => prev.filter((_, idx) => idx !== i)); };
  const addOption = (qi: number) => setQuestions((prev) => prev.map((q, idx) => idx !== qi ? q
    : { ...q, options: [...q.options, { id: `opt${q.options.length + 1}`, label: '' }] }));
  const removeOption = (qi: number, oi: number) => setQuestions((prev) => prev.map((q, idx) => idx !== qi ? q
    : { ...q, options: q.options.filter((_, j) => j !== oi) }));
  const toggleType = (i: number) => setQ(i, { type: questions[i].type === 'text' ? 'single_choice' : 'text' });

  const canCreate = useMemo(() => {
    if (!title.trim()) return false;
    return questions.length > 0 && questions.every((q) =>
      q.text.trim() && (q.type === 'text' || q.options.filter((o) => o.label.trim()).length >= 2));
  }, [title, questions]);

  // ── Создать (перевод ИИ + запись) ──────────────────────────────────────────
  const createTask = useCallback(async () => {
    if (!canCreate || creating) return;
    hapticTap();
    setCreating(true);
    setMsg('Перевожу тексты ИИ на все языки…');
    try {
      // Нормализуем вопросы: у choice оставляем только непустые варианты. Именно
      // эти строки (и в этом порядке) идут в ИИ-перевод и обратно — чтобы индексы
      // не разъехались.
      const normQuestions = questions.map((q) => ({
        id: q.id,
        type: q.type,
        text: q.text,
        options: q.type === 'text' ? [] : q.options.filter((o) => o.label.trim()),
      }));
      // Собираем ВСЕ русские строки в один массив для одного ИИ-вызова.
      const ru: string[] = [title, subtitle, finalTitle, finalSubtitle];
      normQuestions.forEach((q) => {
        ru.push(q.text);
        q.options.forEach((o) => ru.push(o.label));
      });
      const loc = await localizeRuStrings(ru);
      let k = 0;
      const titleL = loc[k++]; const subtitleL = loc[k++];
      const finalTitleL = loc[k++]; const finalSubtitleL = loc[k++];
      const questionsL = normQuestions.map((q) => {
        const textL = loc[k++];
        const options = q.options.map((o) => ({ id: o.id, label: loc[k++] }));
        return { id: q.id, type: q.type, text: textL, options };
      });

      // surveyId должен быть латиницей (^[a-z0-9_]+$). Русское название в id не
      // кладём — берём просто custom_<порядковый номер среди существующих>.
      const usedNums = rows
        .map((r) => /^custom_(\d+)/.exec(r.surveyId)?.[1])
        .filter(Boolean).map(Number);
      const nextNum = (usedNums.length ? Math.max(...usedNums) : 0) + 1;
      const surveyId = `custom_${nextNum}`;
      const survey: ShardSurveyConfigInput = {
        surveyId,
        enabled: true,
        title: titleL,
        subtitle: subtitleL,
        rewardShards: reward,
        minDaysBetweenSurveys: 1,
        audience: { tier },
        accentColor,
        finalScreen: { title: finalTitleL, subtitle: finalSubtitleL },
        questions: questionsL,
      };
      setMsg('Сохраняю задание…');
      await adminWriteShardSurvey(survey);
      hapticSuccess();
      setMsg('Готово! Задание появится 4-й плашкой в «Вызовах дня».');
      // Сброс черновика.
      setTitle(''); setSubtitle(''); setReward(3); setAccentColor(COLOR_SWATCHES[0]); setTier('any');
      setFinalTitle('Спасибо!'); setFinalSubtitle('Твой ответ поможет сделать приложение лучше.');
      setQuestions([makeQuestion(1)]);
      await refresh();
    } catch (e) {
      setMsg('Ошибка: ' + String((e as { message?: string })?.message ?? e));
    } finally {
      setCreating(false);
    }
  }, [canCreate, creating, title, subtitle, finalTitle, finalSubtitle, questions, reward, accentColor, rows.length, refresh]);

  const removeTask = useCallback(async (row: AdminSurveyRow) => {
    hapticTap(); setBusyId(row.surveyId); setMsg('');
    try { await adminDeleteShardSurvey(row.surveyId); await refresh(); }
    catch (e) { setMsg('Ошибка: ' + String((e as { message?: string })?.message ?? e)); }
    finally { setBusyId(null); }
  }, [refresh]);

  const inputStyle = [styles.input, { color: t.textPrimary, backgroundColor: t.bgSurface, borderColor: t.border }];

  return (
    <View style={[styles.root, { backgroundColor: t.bgPrimary, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.textPrimary }]}>Новое задание-опрос</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 60, gap: 12 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
        <Text style={[styles.label, { color: t.textSecond }]}>Название задания (увидит юзер)</Text>
        <TextInput value={title} onChangeText={setTitle} placeholder="Напр. «Первое впечатление»" placeholderTextColor={t.textMuted} style={inputStyle} />

        <Text style={[styles.label, { color: t.textSecond }]}>Описание (подпись под названием)</Text>
        <TextInput value={subtitle} onChangeText={setSubtitle} placeholder="Напр. «Пара вопросов — и осколки твои»" placeholderTextColor={t.textMuted} style={inputStyle} />

        <Text style={[styles.label, { color: t.textSecond }]}>Цвет плашки</Text>
        <View style={styles.swatchRow}>
          {COLOR_SWATCHES.map((c) => (
            <TouchableOpacity key={c} onPress={() => { hapticTap(); setAccentColor(c); }}
              style={[styles.swatch, { backgroundColor: c, borderColor: accentColor === c ? '#fff' : 'transparent' }]} />
          ))}
        </View>

        <Text style={[styles.label, { color: t.textSecond }]}>Награда за прохождение</Text>
        <View style={styles.stepperRow}>
          <TouchableOpacity onPress={() => { hapticTap(); setReward((r) => Math.max(1, r - 1)); }} style={[styles.stepBtn, { backgroundColor: t.bgSurface }]}>
            <Ionicons name="remove" size={20} color={t.textPrimary} />
          </TouchableOpacity>
          <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '800', minWidth: 60, textAlign: 'center' }}>💎 {reward}</Text>
          <TouchableOpacity onPress={() => { hapticTap(); setReward((r) => Math.min(20, r + 1)); }} style={[styles.stepBtn, { backgroundColor: t.bgSurface }]}>
            <Ionicons name="add" size={20} color={t.textPrimary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { color: t.textSecond }]}>Кому показывать</Text>
        <View style={styles.tierRow}>
          {([['any', 'Всем'], ['free', 'Только Free'], ['premium', 'Только Plus']] as const).map(([val, label]) => (
            <TouchableOpacity
              key={val}
              onPress={() => { hapticTap(); setTier(val); }}
              style={[styles.tierPill, { backgroundColor: tier === val ? t.accent : t.bgSurface }]}
            >
              <Text style={{ color: tier === val ? t.bgPrimary : t.textSecond, fontWeight: '700', fontSize: 13 }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Вопросы */}
        <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>Вопросы ({questions.length})</Text>
        {questions.map((q, qi) => (
          <View key={qi} style={[styles.qCard, { backgroundColor: t.bgCard, borderColor: t.border }]}>
            <View style={styles.qHeader}>
              <Text style={{ color: t.textMuted, fontWeight: '700' }}>Вопрос {qi + 1}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TouchableOpacity onPress={() => { hapticTap(); toggleType(qi); }} style={[styles.typePill, { backgroundColor: t.bgSurface }]}>
                  <Text style={{ color: t.textSecond, fontSize: 12, fontWeight: '700' }}>
                    {q.type === 'text' ? 'Свободный текст' : 'Варианты'}
                  </Text>
                </TouchableOpacity>
                {questions.length > 1 && (
                  <TouchableOpacity onPress={() => removeQuestion(qi)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color="#EF6461" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <TextInput value={q.text} onChangeText={(v) => setQ(qi, { text: v })} placeholder="Текст вопроса" placeholderTextColor={t.textMuted} style={inputStyle} />
            {q.type === 'single_choice' && (
              <View style={{ gap: 6, marginTop: 8 }}>
                {q.options.map((o, oi) => (
                  <View key={oi} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TextInput value={o.label} onChangeText={(v) => setOpt(qi, oi, v)} placeholder={`Вариант ${oi + 1}`} placeholderTextColor={t.textMuted} style={[inputStyle, { flex: 1, marginTop: 0 }]} />
                    {q.options.length > 2 && (
                      <TouchableOpacity onPress={() => removeOption(qi, oi)} hitSlop={8}>
                        <Ionicons name="close-circle" size={20} color={t.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                <TouchableOpacity onPress={() => { hapticTap(); addOption(qi); }} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                  <Text style={{ color: t.accent, fontWeight: '700', fontSize: 13 }}>＋ вариант</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
        <TouchableOpacity onPress={addQuestion} style={[styles.addQuestionBtn, { borderColor: t.border }]}>
          <Ionicons name="add-circle-outline" size={18} color={t.accent} />
          <Text style={{ color: t.accent, fontWeight: '700' }}>Добавить вопрос</Text>
        </TouchableOpacity>

        {/* Финальный экран */}
        <Text style={[styles.sectionTitle, { color: t.textPrimary }]}>Финальный экран</Text>
        <TextInput value={finalTitle} onChangeText={setFinalTitle} placeholder="Заголовок (напр. «Спасибо!»)" placeholderTextColor={t.textMuted} style={inputStyle} />
        <TextInput value={finalSubtitle} onChangeText={setFinalSubtitle} placeholder="Текст благодарности" placeholderTextColor={t.textMuted} style={inputStyle} />

        {/* Создать */}
        <TouchableOpacity onPress={createTask} disabled={!canCreate || creating}
          style={[styles.createBtn, { backgroundColor: canCreate && !creating ? accentColor : t.bgCard, opacity: creating ? 0.7 : 1 }]}>
          {creating ? <ActivityIndicator color="#fff" /> : (
            <Text style={{ color: canCreate ? '#fff' : t.textMuted, fontWeight: '800', fontSize: 16 }}>
              Создать задание
            </Text>
          )}
        </TouchableOpacity>
        {!!msg && <Text style={{ color: t.textSecond, fontSize: 13 }}>{msg}</Text>}

        {/* Список созданных */}
        <View style={styles.listHeaderRow}>
          <Text style={{ color: t.textPrimary, fontWeight: '700', fontSize: 15 }}>Созданные задания ({rows.length})</Text>
          <TouchableOpacity onPress={() => { hapticTap(); void refresh(); }} hitSlop={10}>
            <Ionicons name="refresh" size={20} color={t.textSecond} />
          </TouchableOpacity>
        </View>
        {loading && <ActivityIndicator color={t.accent} />}
        {!loading && rows.length === 0 && <Text style={{ color: t.textMuted, fontSize: 13 }}>Пока нет заданий.</Text>}
        {rows.map((row) => (
          <View key={row.surveyId} style={[styles.card, { backgroundColor: t.bgCard }]}>
            <View style={[styles.rowDot, { backgroundColor: row.accentColor || t.accent }]} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.textPrimary, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{row.title?.ru || row.surveyId}</Text>
              <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 2 }}>
                {row.enabled ? '🟢 показывается' : '⚪️ выключено'} · 💎{row.rewardShards} · {row.questions?.length ?? 0} вопр. · ответов: {row.totalResponses ?? 0}
              </Text>
            </View>
            {busyId === row.surveyId ? <ActivityIndicator color={t.accent} /> : (
              <TouchableOpacity onPress={() => void removeTask(row)} hitSlop={10} style={{ padding: 6 }}>
                <Ionicons name="trash-outline" size={20} color="#EF6461" />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 17, fontWeight: '800', flex: 1 },
  label: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginTop: 12 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginTop: 4 },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 2 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 },
  tierRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  tierPill: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12 },
  stepBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  qCard: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 4 },
  qHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  typePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  addQuestionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', paddingVertical: 12 },
  createBtn: { borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, marginTop: 8 },
  listHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14 },
  rowDot: { width: 10, height: 10, borderRadius: 5 },
});
