import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  clearDialogueV2Memory,
  type DialogueV2MemoryStudyTarget,
  type DialogueV2MemoryView,
  viewDialogueV2Memory,
} from './dialogue_v2_memory_client';
import {
  clearDialogueV2MemoryDiskCache,
  readDialogueV2MemoryDiskCache,
  writeDialogueV2MemoryDiskCache,
} from './dialogue_v2_memory_disk_cache';
import { captureAccountGeneration } from './account_generation';
import { accountScopeKey } from './account_scope_key';
import {
  fetchReleasedDialogueV2Catalogue,
  peekDialogueV2Catalogue,
  type DialogueV2CatalogueReleaseEnvelope,
} from './dialogue_v2_catalogue_client';
import { triLang } from '../constants/i18n';
import { V2, V2_TYPE } from '../constants/v2Style';
import { useLang } from '../components/LangContext';
import { usePremium } from '../components/PremiumContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { PressableScale } from '../components/feedback/PressableScale';
import { PlateFill, plateBoxShadow, useShadowGlass } from '../components/v2/ShadowSurface';
import ThemedConfirmModal from '../components/ThemedConfirmModal';
import { useV2Palette } from '../components/v2/useV2Palette';
import { safeRouterBack } from './navigation_back';

const V2_TARGETS = new Set(['en', 'es', 'fr', 'de']);

type MemoryState =
  | Readonly<{ kind: 'loading' }>
  | Readonly<{ kind: 'unavailable' }>
  | Readonly<{ kind: 'available'; memory: DialogueV2MemoryView }>;

type CatalogueLabels = Readonly<{
  scenarioTitles: ReadonlyMap<string, string>;
  objectiveLabels: ReadonlyMap<string, string>;
}>;

function supportedTarget(value: unknown): value is DialogueV2MemoryStudyTarget {
  return typeof value === 'string' && V2_TARGETS.has(value);
}

function record(value: unknown): Record<string, unknown> | null {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Reflect.ownKeys(descriptors).some((key) => typeof key !== 'string')) return null;
    const result: Record<string, unknown> = {};
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (!descriptor.enumerable || !('value' in descriptor)) return null;
      result[key] = descriptor.value;
    }
    return result;
  } catch {
    return null;
  }
}

function visibleText(value: unknown, maxLength: number): string | null {
  return typeof value === 'string'
    && value === value.trim()
    && value.length > 0
    && value.length <= maxLength
    && !/[\u0000-\u001f\u007f]/.test(value)
    ? value
    : null;
}

/** Builds display labels only; malformed catalogue fragments are ignored and never rendered. */
function catalogueLabels(
  envelope: DialogueV2CatalogueReleaseEnvelope | null,
  expectedTarget: DialogueV2MemoryStudyTarget,
): CatalogueLabels {
  const scenarioTitles = new Map<string, string>();
  const objectiveLabels = new Map<string, string>();
  for (const rawPacket of envelope?.packets ?? []) {
    const packet = record(rawPacket);
    const scenario = record(packet?.scenario);
    const content = record(packet?.content);
    const scenarioId = visibleText(scenario?.id, 64);
    const title = visibleText(content?.title, 120);
    if (packet?.studyTarget !== expectedTarget || !scenarioId || !title) continue;
    scenarioTitles.set(scenarioId, title);
    if (!Array.isArray(scenario?.objectives)) continue;
    for (const rawObjective of scenario.objectives.slice(0, 12)) {
      const objective = record(rawObjective);
      const objectiveId = visibleText(objective?.id, 64);
      const label = visibleText(objective?.label, 240);
      if (objectiveId && label) objectiveLabels.set(objectiveId, label);
    }
  }
  return Object.freeze({ scenarioTitles, objectiveLabels });
}

function memoryCopy(lang: ReturnType<typeof useLang>['lang']) {
  return Object.freeze({
    title: triLang(lang, { ru: 'Память диалогов', uk: 'Пам’ять діалогів', en: 'Dialogue memory', es: 'Memoria de diálogos', fr: 'Mémoire des dialogues', de: 'Dialoggedächtnis', 'pt-BR': 'Memória dos diálogos', vi: 'Bộ nhớ hội thoại', id: 'Memori dialog', tr: 'Diyalog hafızası', pl: 'Pamięć dialogów' }),
    back: triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Volver', fr: 'Retour', de: 'Zurück', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' }),
    intro: triLang(lang, {
      ru: 'Здесь хранится только краткая учебная сводка и место продолжения для выбранного языка. Сообщения и голосовые записи здесь не сохраняются.',
      uk: 'Тут зберігається лише короткий навчальний підсумок і місце продовження для вибраної мови. Повідомлення та голосові записи тут не зберігаються.',
      en: 'Only a short learning summary and resume points for this language are kept here. Messages and voice recordings are not stored here.',
      es: 'Aquí solo se guardan un resumen breve y los puntos de continuación de este idioma. No se guardan mensajes ni grabaciones de voz.',
      fr: 'Seuls un bref résumé pédagogique et les points de reprise de cette langue sont conservés ici. Les messages et enregistrements vocaux ne le sont pas.',
      de: 'Hier werden nur eine kurze Lernzusammenfassung und Fortsetzungspunkte für diese Sprache gespeichert. Nachrichten und Sprachaufnahmen werden hier nicht gespeichert.',
      'pt-BR': 'Aqui fica apenas um breve resumo de estudo e os pontos de retomada deste idioma. Mensagens e gravações de voz não são salvas aqui.', vi: 'Ở đây chỉ lưu bản tóm tắt học tập ngắn và điểm tiếp tục cho ngôn ngữ này. Tin nhắn và bản ghi giọng nói không được lưu ở đây.', id: 'Di sini hanya disimpan ringkasan belajar singkat dan titik lanjutan untuk bahasa ini. Pesan dan rekaman suara tidak disimpan di sini.', tr: 'Burada bu dil için yalnızca kısa bir öğrenme özeti ve devam noktaları tutulur. Mesajlar ve ses kayıtları burada saklanmaz.', pl: 'Przechowujemy tu tylko krótkie podsumowanie nauki i miejsca kontynuacji dla tego języka. Wiadomości i nagrania głosowe nie są tu zapisywane.',
    }),
    plusRequired: triLang(lang, { ru: 'Память диалогов доступна в Plus', uk: 'Пам’ять діалогів доступна в Plus', en: 'Dialogue memory is available with Plus', es: 'La memoria de diálogos está disponible con Plus', fr: 'La mémoire des dialogues est disponible avec Plus', de: 'Dialoggedächtnis ist mit Plus verfügbar', 'pt-BR': 'A memória dos diálogos está disponível no Plus', vi: 'Bộ nhớ hội thoại có trong Plus', id: 'Memori dialog tersedia di Plus', tr: 'Diyalog hafızası Plus ile kullanılabilir', pl: 'Pamięć dialogów jest dostępna w Plus' }),
    openPlus: triLang(lang, { ru: 'Посмотреть Plus', uk: 'Переглянути Plus', en: 'View Plus', es: 'Ver Plus', fr: 'Voir Plus', de: 'Plus ansehen', 'pt-BR': 'Ver o Plus', vi: 'Xem Plus', id: 'Lihat Plus', tr: 'Plus\'ı gör', pl: 'Zobacz Plus' }),
    empty: triLang(lang, { ru: 'Для этого языка пока ничего не сохранено.', uk: 'Для цієї мови ще нічого не збережено.', en: 'Nothing has been saved for this language yet.', es: 'Todavía no hay nada guardado para este idioma.', fr: 'Rien n’est encore mémorisé pour cette langue.', de: 'Für diese Sprache wurde noch nichts gespeichert.', 'pt-BR': 'Ainda não há nada salvo para este idioma.', vi: 'Chưa có gì được lưu cho ngôn ngữ này.', id: 'Belum ada yang tersimpan untuk bahasa ini.', tr: 'Bu dil için henüz bir şey kaydedilmedi.', pl: 'Dla tego języka nic jeszcze nie zapisano.' }),
    summary: triLang(lang, { ru: 'Учебная сводка', uk: 'Навчальний підсумок', en: 'Learning summary', es: 'Resumen de aprendizaje', fr: 'Résumé pédagogique', de: 'Lernzusammenfassung', 'pt-BR': 'Resumo de estudo', vi: 'Tóm tắt học tập', id: 'Ringkasan belajar', tr: 'Öğrenme özeti', pl: 'Podsumowanie nauki' }),
    strengths: triLang(lang, { ru: 'Получается хорошо', uk: 'Добре виходить', en: 'Going well', es: 'Va bien', fr: 'Points forts', de: 'Läuft gut', 'pt-BR': 'Indo bem', vi: 'Làm tốt', id: 'Sudah bagus', tr: 'İyi gidiyor', pl: 'Idzie dobrze' }),
    focus: triLang(lang, { ru: 'На чём сосредоточиться', uk: 'На чому зосередитися', en: 'Focus next', es: 'Próximo enfoque', fr: 'À travailler', de: 'Nächster Fokus', 'pt-BR': 'No que focar', vi: 'Cần tập trung', id: 'Fokus berikutnya', tr: 'Odaklanılacaklar', pl: 'Na czym się skupić' }),
    completed: triLang(lang, { ru: 'Выполнено задач', uk: 'Виконано завдань', en: 'Tasks completed', es: 'Tareas completadas', fr: 'Objectifs terminés', de: 'Erledigte Aufgaben', 'pt-BR': 'Tarefas concluídas', vi: 'Nhiệm vụ đã hoàn thành', id: 'Tugas selesai', tr: 'Tamamlanan görevler', pl: 'Wykonane zadania' }),
    progress: triLang(lang, { ru: 'Продолжение диалогов', uk: 'Продовження діалогів', en: 'Dialogue progress', es: 'Progreso de diálogos', fr: 'Progression des dialogues', de: 'Dialogfortschritt', 'pt-BR': 'Progresso dos diálogos', vi: 'Tiến độ hội thoại', id: 'Kemajuan dialog', tr: 'Diyalog ilerlemesi', pl: 'Postęp dialogów' }),
    nextTask: triLang(lang, { ru: 'Следующая задача', uk: 'Наступне завдання', en: 'Next task', es: 'Siguiente tarea', fr: 'Prochain objectif', de: 'Nächste Aufgabe', 'pt-BR': 'Próxima tarefa', vi: 'Nhiệm vụ tiếp theo', id: 'Tugas berikutnya', tr: 'Sonraki görev', pl: 'Następne zadanie' }),
    savedTask: triLang(lang, { ru: 'Сохранённая задача', uk: 'Збережене завдання', en: 'Saved task', es: 'Tarea guardada', fr: 'Objectif mémorisé', de: 'Gespeicherte Aufgabe', 'pt-BR': 'Tarefa salva', vi: 'Nhiệm vụ đã lưu', id: 'Tugas tersimpan', tr: 'Kaydedilen görev', pl: 'Zapisane zadanie' }),
    dialogue: triLang(lang, { ru: 'Диалог', uk: 'Діалог', en: 'Dialogue', es: 'Diálogo', fr: 'Dialogue', de: 'Dialog', 'pt-BR': 'Diálogo', vi: 'Hội thoại', id: 'Dialog', tr: 'Diyalog', pl: 'Dialog' }),
    clear: triLang(lang, { ru: 'Очистить память этого языка', uk: 'Очистити пам’ять цієї мови', en: 'Clear memory for this language', es: 'Borrar la memoria de este idioma', fr: 'Effacer la mémoire de cette langue', de: 'Speicher für diese Sprache löschen', 'pt-BR': 'Limpar a memória deste idioma', vi: 'Xóa bộ nhớ của ngôn ngữ này', id: 'Hapus memori bahasa ini', tr: 'Bu dilin hafızasını temizle', pl: 'Wyczyść pamięć tego języka' }),
    deleteOnly: triLang(lang, {
      ru: 'Даже без Plus ты можешь удалить всю сохранённую память выбранного языка. Просмотр сводки и точек продолжения останется недоступен.',
      uk: 'Навіть без Plus ти можеш видалити всю збережену пам’ять вибраної мови. Перегляд підсумку й точок продовження залишиться недоступним.',
      en: 'Even without Plus, you can delete all saved memory for this language. Learning summaries and resume points remain unavailable to view.',
      es: 'Incluso sin Plus, puedes borrar toda la memoria guardada de este idioma. Los resúmenes y puntos de continuación no se pueden consultar.',
      fr: 'Même sans Plus, vous pouvez effacer toute la mémoire enregistrée pour cette langue. Les résumés et points de reprise restent indisponibles.',
      de: 'Auch ohne Plus können Sie alle gespeicherten Erinnerungen für diese Sprache löschen. Zusammenfassungen und Fortsetzungspunkte bleiben verborgen.',
      'pt-BR': 'Mesmo sem Plus, você pode apagar toda a memória salva deste idioma. O resumo e os pontos de retomada continuam indisponíveis para visualizar.', vi: 'Kể cả không có Plus, bạn vẫn có thể xóa toàn bộ bộ nhớ đã lưu của ngôn ngữ này. Bản tóm tắt và các điểm tiếp tục vẫn không xem được.', id: 'Tanpa Plus pun, kamu bisa menghapus semua memori tersimpan untuk bahasa ini. Ringkasan dan titik lanjutan tetap tidak bisa dilihat.', tr: 'Plus olmadan da bu dil için kaydedilen tüm hafızayı silebilirsin. Özet ve devam noktaları görüntülenemez.', pl: 'Nawet bez Plus możesz usunąć całą zapisaną pamięć tego języka. Podsumowanie i miejsca kontynuacji pozostaną niedostępne do podglądu.',
    }),
    clearing: triLang(lang, { ru: 'Очищаем…', uk: 'Очищаємо…', en: 'Clearing…', es: 'Borrando…', fr: 'Effacement…', de: 'Wird gelöscht…', 'pt-BR': 'Limpando…', vi: 'Đang xóa…', id: 'Menghapus…', tr: 'Temizleniyor…', pl: 'Czyszczenie…' }),
    clearFailed: triLang(lang, { ru: 'Не удалось очистить память. Попробуй ещё раз.', uk: 'Не вдалося очистити пам’ять. Спробуй ще раз.', en: 'Memory could not be cleared. Please try again.', es: 'No se pudo borrar la memoria. Inténtalo de nuevo.', fr: 'Impossible d’effacer la mémoire. Réessayez.', de: 'Der Speicher konnte nicht gelöscht werden. Bitte erneut versuchen.', 'pt-BR': 'Não foi possível limpar a memória. Tente de novo.', vi: 'Không thể xóa bộ nhớ. Hãy thử lại.', id: 'Memori tidak bisa dihapus. Coba lagi.', tr: 'Hafıza temizlenemedi. Tekrar dene.', pl: 'Nie udało się wyczyścić pamięci. Spróbuj ponownie.' }),
    confirmTitle: triLang(lang, { ru: 'Очистить память?', uk: 'Очистити пам’ять?', en: 'Clear memory?', es: '¿Borrar la memoria?', fr: 'Effacer la mémoire ?', de: 'Speicher löschen?', 'pt-BR': 'Limpar a memória?', vi: 'Xóa bộ nhớ?', id: 'Hapus memori?', tr: 'Hafıza temizlensin mi?', pl: 'Wyczyścić pamięć?' }),
    confirmBody: triLang(lang, { ru: 'Удалятся учебная сводка и прогресс всех диалогов только для выбранного языка. Это действие нельзя отменить.', uk: 'Буде видалено навчальний підсумок і прогрес усіх діалогів лише для вибраної мови. Цю дію не можна скасувати.', en: 'The learning summary and all dialogue progress for this language will be deleted. This cannot be undone.', es: 'Se eliminarán el resumen y todo el progreso de diálogos de este idioma. Esta acción no se puede deshacer.', fr: 'Le résumé et toute la progression des dialogues de cette langue seront supprimés. Cette action est irréversible.', de: 'Die Lernzusammenfassung und der gesamte Dialogfortschritt dieser Sprache werden gelöscht. Dies kann nicht rückgängig gemacht werden.', 'pt-BR': 'O resumo de estudo e todo o progresso dos diálogos serão apagados apenas para este idioma. Isso não pode ser desfeito.', vi: 'Bản tóm tắt học tập và toàn bộ tiến độ hội thoại sẽ bị xóa, chỉ cho ngôn ngữ này. Không thể hoàn tác.', id: 'Ringkasan belajar dan semua kemajuan dialog akan dihapus, hanya untuk bahasa ini. Tindakan ini tidak bisa dibatalkan.', tr: 'Öğrenme özeti ve tüm diyalog ilerlemesi yalnızca bu dil için silinecek. Bu işlem geri alınamaz.', pl: 'Podsumowanie nauki i cały postęp dialogów zostaną usunięte tylko dla tego języka. Tej operacji nie można cofnąć.' }),
    cancel: triLang(lang, { ru: 'Отмена', uk: 'Скасувати', en: 'Cancel', es: 'Cancelar', fr: 'Annuler', de: 'Abbrechen', 'pt-BR': 'Cancelar', vi: 'Hủy', id: 'Batal', tr: 'İptal', pl: 'Anuluj' }),
  });
}

/** Последняя полученная память по языку — только в памяти процесса (без диска: это данные Plus-аккаунта). */
const memoryCacheByTarget = new Map<string, DialogueV2MemoryView>();
// зачем (04.10): кэш процесса привязан к аккаунту — после смены аккаунта память прошлого не мелькнёт.
function memoryCacheKey(studyTarget: string): string {
  return `${accountScopeKey(captureAccountGeneration()) ?? "no-account"}|${studyTarget}`;
}
const MEMORY_SILENT_RETRIES = 5;
const MEMORY_SILENT_RETRY_MS = 20_000;

export default function DialogueV2MemoryRoute() {
  const router = useRouter();
  const { studyTarget } = useStudyTarget();
  const { lang } = useLang();
  const { accessResolved, hasPremiumAccess } = usePremium();
  const p = useV2Palette();
  const g = useShadowGlass();
  const copy = useMemo(() => memoryCopy(lang), [lang]);
  // зачем (владелец 01.10: «никаких загружается / не загрузилось»): повторный заход — сразу последняя
  // полученная память этого языка; сбой сети — тихий повтор в фоне, текста об ошибке нет.
  const [state, setState] = useState<MemoryState>(() => {
    const cached = typeof studyTarget === 'string' ? memoryCacheByTarget.get(memoryCacheKey(studyTarget)) : undefined;
    return cached ? { kind: 'available', memory: cached } : { kind: 'loading' };
  });
  const [retryTick, setRetryTick] = useState(0);
  // зачем (правило «мгновенное открытие», 04.10): названия сцен — сразу из локального каталога (встроенный
  // снимок), а не английская заглушка с подменой после сети.
  const [labels, setLabels] = useState<CatalogueLabels>(() => (
    supportedTarget(studyTarget) ? catalogueLabels(peekDialogueV2Catalogue(studyTarget), studyTarget) : catalogueLabels(null, 'en')
  ));
  const [clearing, setClearing] = useState(false);
  // зачем (чек-лист 2.0, нативные Alert → стекло): подтверждение — стеклянное окно, отказ — строка
  // под кнопкой, а не системный диалог поверх стеклянного экрана.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clearFailed, setClearFailed] = useState(false);

  useEffect(() => {
    if (!accessResolved || !hasPremiumAccess) return undefined;
    if (!supportedTarget(studyTarget)) {
      setState({ kind: 'unavailable' });
      return undefined;
    }
    let active = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    // зачем (правило «мгновенное открытие», 04.10): после холодного старта — копия с устройства, пока сеть
    // не ответила; ответ сети её заменяет (состояние меняем только из 'loading', поздний диск не затрёт сеть).
    if (!memoryCacheByTarget.has(memoryCacheKey(studyTarget))) {
      void readDialogueV2MemoryDiskCache(studyTarget).then((disk) => {
        if (!active || !disk) return;
        setState((prev) => (prev.kind === 'loading' ? { kind: 'available', memory: disk } : prev));
      });
    }
    const scheduleRetry = (reason: string) => {
      if (retryTick >= MEMORY_SILENT_RETRIES) {
        console.warn('[DIALOGUE-V2] memory: silent retries exhausted', { studyTarget, reason, retryTick });
        return;
      }
      console.warn('[DIALOGUE-V2] memory: load failed, silent retry scheduled', { studyTarget, reason, retryTick });
      retryTimer = setTimeout(() => { if (active) setRetryTick((n) => n + 1); }, MEMORY_SILENT_RETRY_MS);
    };
    void Promise.all([
      viewDialogueV2Memory({ studyTarget }),
      fetchReleasedDialogueV2Catalogue(studyTarget),
    ]).then(([memory, envelope]) => {
      if (!active) return;
      setLabels(catalogueLabels(envelope, studyTarget));
      if (memory) {
        console.log('[DIALOG-MEMORY] source=network', JSON.stringify({ studyTarget, checkpoints: memory.scenarioCheckpoints.length, summary: Boolean(memory.sharedSummary) }));
        memoryCacheByTarget.set(memoryCacheKey(studyTarget), memory);
        void writeDialogueV2MemoryDiskCache(memory);
        setState({ kind: 'available', memory });
      } else {
        scheduleRetry('empty_response');
      }
    }).catch((error: unknown) => {
      if (active) scheduleRetry(error instanceof Error ? error.message : String(error));
    });
    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [accessResolved, hasPremiumAccess, retryTick, studyTarget]);

  const clearMemory = useCallback(async () => {
    if (clearing || !supportedTarget(studyTarget)) return;
    setClearing(true);
    setClearFailed(false);
    try {
      const receipt = await clearDialogueV2Memory({ studyTarget });
      if (receipt) {
        const cleared: DialogueV2MemoryView = { ok: true, studyTarget, sharedSummary: null, scenarioCheckpoints: [] };
        memoryCacheByTarget.set(memoryCacheKey(studyTarget), cleared);
        // зачем: «Очистить память» стирает и копию на устройстве (так обещает политика).
        void clearDialogueV2MemoryDiskCache(studyTarget);
        setState({ kind: 'available', memory: cleared });
      }
    } catch (error: unknown) {
      console.warn('[DIALOGUE-V2] memory: clear failed', { studyTarget, message: error instanceof Error ? error.message : String(error) });
      setClearFailed(true);
    } finally {
      setClearing(false);
    }
  }, [clearing, studyTarget]);

  const confirmClear = useCallback(() => setConfirmOpen(true), []);

  const renderHeader = () => (
    <View style={{ height: 60, paddingHorizontal: V2.screenPad, flexDirection: 'row', alignItems: 'center', gap: V2.gap }}>
      <PressableScale
        onPress={() => safeRouterBack(router, '/ai_dialog_home' as never)}
        variant="flat"
        accessibilityRole="button"
        accessibilityLabel={copy.back}
        style={{ width: V2.iconButton, height: V2.iconButton, borderRadius: V2.iconButton / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: p.control }}
      >
        <Ionicons name="chevron-back" size={23} color={p.text} />
      </PressableScale>
      <Text accessibilityRole="header" style={{ flex: 1, color: p.text, ...V2_TYPE.title }}>{copy.title}</Text>
    </View>
  );

  const renderClearControl = () => (
    <PressableScale
      testID="dialogue-v2-memory-clear-confirm"
      onPress={confirmClear}
      disabled={clearing || !supportedTarget(studyTarget)}
      accessibilityRole="button"
      accessibilityState={{ disabled: clearing || !supportedTarget(studyTarget) }}
      // зачем (владелец 13.10, dialogs-gap-001/002): «Очистить память этого языка» — красный текст БЕЗ заливки и плашки; опасное действие не должно выглядеть главной кнопкой.
      style={{ minHeight: V2.cta.height, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, opacity: clearing ? 0.65 : 1 }}
    >
      <Text style={{ color: p.wrong, ...V2_TYPE.headline, textAlign: 'center' }}>{clearing ? copy.clearing : copy.clear}</Text>
    </PressableScale>
  );

  const renderClearFeedback = () => (
    <>
      {clearFailed ? (
        <Text testID="dialogue-v2-memory-clear-failed" accessibilityLiveRegion="polite" style={{ color: p.wrong, ...V2_TYPE.body, textAlign: 'center' }}>{copy.clearFailed}</Text>
      ) : null}
      <ThemedConfirmModal
        visible={confirmOpen}
        title={copy.confirmTitle}
        message={copy.confirmBody}
        cancelLabel={copy.cancel}
        confirmLabel={copy.clear}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => { setConfirmOpen(false); void clearMemory(); }}
        destructive
        // зачем (съёмка R1 dialogs-gap-005/006): с префиксом «dialogue-v2-memory-clear» кнопка окна получала тот же id
        // «…-clear-confirm», что и кнопка экрана под окном, — робот жал не ту. Отдельный префикс окна.
        testIDPrefix="dialogue-v2-memory-clear-dialog"
      />
    </>
  );

  if (!accessResolved) {
    return <SafeAreaView testID="dialogue-v2-memory-access-checking" style={{ flex: 1, backgroundColor: p.bg }} />;
  }

  if (!hasPremiumAccess) {
    return (
      <View style={{ flex: 1, backgroundColor: p.bg }}>
        <SafeAreaView style={{ flex: 1 }}>
          {renderHeader()}
          <View style={{ flex: 1, padding: V2.screenPad, justifyContent: 'center', gap: V2.gap }}>
            <Text style={{ color: p.text, ...V2_TYPE.section, textAlign: 'center' }}>{copy.plusRequired}</Text>
            <PressableScale
              onPress={() => router.push({ pathname: '/premium_modal', params: { context: 'dialog_limit', source: 'dialogue_v2_memory' } } as never)}
              accessibilityRole="button"
              style={{ minHeight: V2.cta.height, borderRadius: V2.cta.radius, backgroundColor: p.cta, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: p.ctaText, ...V2_TYPE.headline }}>{copy.openPlus}</Text>
            </PressableScale>
            <View testID="dialogue-v2-memory-delete-only" style={{ gap: V2.gapTight }}>
              <Text style={{ color: p.textSecondary, ...V2_TYPE.body, textAlign: 'center' }}>{copy.deleteOnly}</Text>
              {renderClearControl()}
              {renderClearFeedback()}
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const memory = state.kind === 'available' ? state.memory : null;
  const hasMemory = Boolean(memory?.sharedSummary || memory?.scenarioCheckpoints.length);

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }} testID="dialogue-v2-memory-screen">
      <SafeAreaView style={{ flex: 1 }}>
        {renderHeader()}
        <ScrollView contentContainerStyle={{ paddingHorizontal: V2.screenPad, paddingBottom: 32, gap: V2.gap }} decelerationRate="fast">
          <Text style={{ color: p.textSecondary, ...V2_TYPE.body }}>{copy.intro}</Text>

          {memory && !hasMemory ? <Text style={{ color: p.textSecondary, ...V2_TYPE.body }}>{copy.empty}</Text> : null}

          {memory?.sharedSummary ? (
            <View style={{ borderRadius: V2.radius.card, boxShadow: plateBoxShadow(g), padding: 14, gap: V2.gapTight }}>
              <PlateFill g={g} radius={V2.radius.card} />{/* зачем (стиль «Тень»): плашка без обводки */}
              <Text style={{ color: p.text, ...V2_TYPE.section }}>{copy.summary}</Text>
              <Text style={{ color: p.textSecondary, ...V2_TYPE.body }}>{copy.completed}: {memory.sharedSummary.completedObjectives}</Text>
              {memory.sharedSummary.strengths.length ? (
                <View style={{ gap: 4 }}>
                  <Text style={{ color: p.text, ...V2_TYPE.headline }}>{copy.strengths}</Text>
                  {memory.sharedSummary.strengths.map((id, index) => (
                    <Text key={`${id}-${index}`} style={{ color: p.textSecondary, ...V2_TYPE.body }}>• {labels.objectiveLabels.get(id) ?? copy.savedTask}</Text>
                  ))}
                </View>
              ) : null}
              {memory.sharedSummary.focusAreas.length ? (
                <View style={{ gap: 4 }}>
                  <Text style={{ color: p.text, ...V2_TYPE.headline }}>{copy.focus}</Text>
                  {memory.sharedSummary.focusAreas.map((id, index) => (
                    <Text key={`${id}-${index}`} style={{ color: p.textSecondary, ...V2_TYPE.body }}>• {labels.objectiveLabels.get(id) ?? copy.savedTask}</Text>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          {memory?.scenarioCheckpoints.length ? (
            <View style={{ gap: 10 /* стиль «Тень»: плашкам нужен зазор ≥10, чтобы тень «дышала» */ }}>
              <Text style={{ color: p.text, ...V2_TYPE.section }}>{copy.progress}</Text>
              {memory.scenarioCheckpoints.map((checkpoint) => (
                <View key={checkpoint.scenarioId} style={{ borderRadius: V2.radius.card, boxShadow: plateBoxShadow(g), padding: 14, gap: 4 }}>
                  <PlateFill g={g} radius={V2.radius.card} />
                  <Text style={{ color: p.text, ...V2_TYPE.headline }}>{labels.scenarioTitles.get(checkpoint.scenarioId) ?? copy.dialogue}</Text>
                  <Text style={{ color: p.textSecondary, ...V2_TYPE.body }}>{copy.completed}: {checkpoint.completedObjectiveIds.length}</Text>
                  <Text style={{ color: p.textMuted, ...V2_TYPE.caption }}>{copy.nextTask}: {checkpoint.nextObjectiveIndex + 1}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {renderClearControl()}
          {renderClearFeedback()}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
