import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BouncyScrollView from '../components/BouncyScrollView';
import ContentWrap from '../components/ContentWrap';
import ScreenGradient from '../components/ScreenGradient';
import SectionSheetHeader from '../components/SectionSheetHeader';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import HybridAlertShell from '../components/modal_fx/HybridAlertShell';
import PrimaryButton from '../components/ui/PrimaryButton';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import {
  clearMaxMemory,
  deleteMaxMemoryItem,
  getMaxMemory,
  updateMaxMemory,
  type MaxMemoryProjection,
  type MaxMemoryUpdate,
} from './max_memory_client';
import { safeRouterBack } from './navigation_back';

interface Text8 {
  ru: string; uk: string; es: string; 'pt-BR': string;
  vi: string; id: string; tr: string; pl: string;
}

type EditableField = 'preferredName' | 'learningGoal';
type EditState = { kind: 'field'; field: EditableField; value: string } | { kind: 'hook'; itemId: string; value: string };
type ConfirmState = { kind: 'clear' } | { kind: 'delete'; itemId: string; label: string };

const COPY = {
  title: { ru: 'Память MAX', uk: 'Пам’ять MAX', es: 'Memoria de MAX', 'pt-BR': 'Memória do MAX', vi: 'Bộ nhớ MAX', id: 'Memori MAX', tr: 'MAX hafızası', pl: 'Pamięć MAX' },
  privacy: { ru: 'Здесь только короткие учебные заметки — не запись разговора. На сервере аудио и полный текст разговора не хранятся.', uk: 'Тут лише короткі навчальні нотатки — не запис розмови. На сервері аудіо й повний текст розмови не зберігаються.', es: 'Aquí solo hay notas breves de aprendizaje, no una grabación. El audio y la conversación completa no se guardan en el servidor.', 'pt-BR': 'Aqui ficam apenas notas curtas de estudo, não uma gravação. O áudio e a conversa completa não ficam salvos no servidor.', vi: 'Đây chỉ là ghi chú học tập ngắn, không phải bản ghi cuộc trò chuyện. Âm thanh và toàn bộ nội dung không được lưu trên máy chủ.', id: 'Di sini hanya ada catatan belajar singkat, bukan rekaman percakapan. Audio dan teks lengkap tidak disimpan di server.', tr: 'Burada yalnızca kısa öğrenme notları bulunur; konuşma kaydı değildir. Ses ve tam konuşma metni sunucuda saklanmaz.', pl: 'Są tu tylko krótkie notatki do nauki, nie zapis rozmowy. Dźwięk ani pełny tekst rozmowy nie są przechowywane na serwerze.' },
  loading: { ru: 'Загружаю память MAX…', uk: 'Завантажую пам’ять MAX…', es: 'Cargando la memoria de MAX…', 'pt-BR': 'Carregando a memória do MAX…', vi: 'Đang tải bộ nhớ MAX…', id: 'Memuat memori MAX…', tr: 'MAX hafızası yükleniyor…', pl: 'Wczytywanie pamięci MAX…' },
  error: { ru: 'Не удалось загрузить память. Проверь соединение и попробуй снова.', uk: 'Не вдалося завантажити пам’ять. Перевір з’єднання й спробуй ще раз.', es: 'No se pudo cargar la memoria. Comprueba la conexión e inténtalo de nuevo.', 'pt-BR': 'Não foi possível carregar a memória. Verifique a conexão e tente novamente.', vi: 'Không thể tải bộ nhớ. Hãy kiểm tra kết nối và thử lại.', id: 'Memori tidak dapat dimuat. Periksa koneksi lalu coba lagi.', tr: 'Hafıza yüklenemedi. Bağlantını kontrol edip tekrar dene.', pl: 'Nie udało się wczytać pamięci. Sprawdź połączenie i spróbuj ponownie.' },
  retry: { ru: 'Попробовать снова', uk: 'Спробувати ще раз', es: 'Intentar de nuevo', 'pt-BR': 'Tentar novamente', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie' },
  retryHint: { ru: 'Снова загружает учебные заметки MAX', uk: 'Знову завантажує навчальні нотатки MAX', es: 'Vuelve a cargar las notas de aprendizaje de MAX', 'pt-BR': 'Carrega novamente as notas de aprendizado do MAX', vi: 'Tải lại ghi chú học tập của MAX', id: 'Memuat lagi catatan belajar MAX', tr: 'MAX öğrenme notlarını yeniden yükler', pl: 'Ponownie wczytuje notatki MAX' },
  emptyTitle: { ru: 'MAX пока ничего не запомнил', uk: 'MAX поки нічого не запам’ятав', es: 'MAX aún no recuerda nada', 'pt-BR': 'O MAX ainda não memorizou nada', vi: 'MAX chưa ghi nhớ điều gì', id: 'MAX belum mengingat apa pun', tr: 'MAX henüz bir şey hatırlamıyor', pl: 'MAX jeszcze niczego nie zapamiętał' },
  emptyBody: { ru: 'После следующих разговоров здесь появятся полезные факты, учебные цели и исправленные трудности.', uk: 'Після наступних розмов тут з’являться корисні факти, навчальні цілі та виправлені труднощі.', es: 'Tras las próximas conversaciones aparecerán datos útiles, objetivos y dificultades superadas.', 'pt-BR': 'Depois das próximas conversas aparecerão fatos úteis, metas e dificuldades superadas.', vi: 'Sau các cuộc trò chuyện tiếp theo, thông tin hữu ích, mục tiêu và khó khăn đã cải thiện sẽ xuất hiện ở đây.', id: 'Setelah percakapan berikutnya, fakta berguna, tujuan, dan kesulitan yang sudah membaik akan muncul di sini.', tr: 'Sonraki konuşmalardan sonra yararlı bilgiler, hedefler ve aşılan zorluklar burada görünür.', pl: 'Po kolejnych rozmowach pojawią się tu przydatne fakty, cele i pokonane trudności.' },
  profile: { ru: 'Твои настройки', uk: 'Твої налаштування', es: 'Tus preferencias', 'pt-BR': 'Suas preferências', vi: 'Tùy chọn của bạn', id: 'Preferensimu', tr: 'Tercihlerin', pl: 'Twoje ustawienia' },
  name: { ru: 'Как к тебе обращаться', uk: 'Як до тебе звертатися', es: 'Cómo llamarte', 'pt-BR': 'Como chamar você', vi: 'Cách gọi bạn', id: 'Cara memanggilmu', tr: 'Sana nasıl hitap edilsin', pl: 'Jak się do Ciebie zwracać' },
  goal: { ru: 'Цель обучения', uk: 'Мета навчання', es: 'Objetivo de aprendizaje', 'pt-BR': 'Objetivo de aprendizado', vi: 'Mục tiêu học tập', id: 'Tujuan belajar', tr: 'Öğrenme hedefi', pl: 'Cel nauki' },
  notSet: { ru: 'Не указано', uk: 'Не вказано', es: 'Sin especificar', 'pt-BR': 'Não informado', vi: 'Chưa đặt', id: 'Belum diatur', tr: 'Belirtilmedi', pl: 'Nie ustawiono' },
  language: { ru: 'Больше языка', uk: 'Більше мови', es: 'Uso del idioma', 'pt-BR': 'Uso do idioma', vi: 'Mức dùng ngôn ngữ', id: 'Penggunaan bahasa', tr: 'Dil kullanımı', pl: 'Użycie języka' },
  pace: { ru: 'Темп речи', uk: 'Темп мовлення', es: 'Ritmo al hablar', 'pt-BR': 'Ritmo da fala', vi: 'Tốc độ nói', id: 'Kecepatan bicara', tr: 'Konuşma hızı', pl: 'Tempo mówienia' },
  default: { ru: 'По ситуации', uk: 'За ситуацією', es: 'Según la situación', 'pt-BR': 'Conforme a situação', vi: 'Theo tình huống', id: 'Sesuai situasi', tr: 'Duruma göre', pl: 'Zależnie od sytuacji' },
  target: { ru: 'Изучаемого', uk: 'Мови навчання', es: 'Idioma estudiado', 'pt-BR': 'Idioma estudado', vi: 'Ngôn ngữ đang học', id: 'Bahasa target', tr: 'Hedef dil', pl: 'Języka nauki' },
  native: { ru: 'Родного', uk: 'Рідної мови', es: 'Idioma nativo', 'pt-BR': 'Idioma nativo', vi: 'Tiếng mẹ đẻ', id: 'Bahasa ibu', tr: 'Ana dil', pl: 'Języka ojczystego' },
  slower: { ru: 'Медленнее', uk: 'Повільніше', es: 'Más lento', 'pt-BR': 'Mais devagar', vi: 'Chậm hơn', id: 'Lebih lambat', tr: 'Daha yavaş', pl: 'Wolniej' },
  normal: { ru: 'Обычно', uk: 'Звичайно', es: 'Normal', 'pt-BR': 'Normal', vi: 'Bình thường', id: 'Normal', tr: 'Normal', pl: 'Normalnie' },
  faster: { ru: 'Быстрее', uk: 'Швидше', es: 'Más rápido', 'pt-BR': 'Mais rápido', vi: 'Nhanh hơn', id: 'Lebih cepat', tr: 'Daha hızlı', pl: 'Szybciej' },
  remembers: { ru: 'MAX помнит', uk: 'MAX пам’ятає', es: 'MAX recuerda', 'pt-BR': 'MAX lembra', vi: 'MAX ghi nhớ', id: 'MAX mengingat', tr: 'MAX hatırlıyor', pl: 'MAX pamięta' },
  working: { ru: 'Сейчас работаем над', uk: 'Зараз працюємо над', es: 'En qué estamos trabajando', 'pt-BR': 'No que estamos trabalhando', vi: 'Đang luyện tập', id: 'Sedang dilatih', tr: 'Şu anda çalışılanlar', pl: 'Nad czym teraz pracujemy' },
  improved: { ru: 'Уже стало лучше', uk: 'Уже стало краще', es: 'Ya ha mejorado', 'pt-BR': 'Já melhorou', vi: 'Đã tiến bộ', id: 'Sudah membaik', tr: 'Artık daha iyi', pl: 'Już jest lepiej' },
  edit: { ru: 'Изменить', uk: 'Змінити', es: 'Editar', 'pt-BR': 'Editar', vi: 'Sửa', id: 'Ubah', tr: 'Düzenle', pl: 'Edytuj' },
  delete: { ru: 'Удалить', uk: 'Видалити', es: 'Eliminar', 'pt-BR': 'Excluir', vi: 'Xóa', id: 'Hapus', tr: 'Sil', pl: 'Usuń' },
  save: { ru: 'Сохранить', uk: 'Зберегти', es: 'Guardar', 'pt-BR': 'Salvar', vi: 'Lưu', id: 'Simpan', tr: 'Kaydet', pl: 'Zapisz' },
  cancel: { ru: 'Отмена', uk: 'Скасувати', es: 'Cancelar', 'pt-BR': 'Cancelar', vi: 'Hủy', id: 'Batal', tr: 'İptal', pl: 'Anuluj' },
  clear: { ru: 'Очистить всю память MAX', uk: 'Очистити всю пам’ять MAX', es: 'Borrar toda la memoria de MAX', 'pt-BR': 'Limpar toda a memória do MAX', vi: 'Xóa toàn bộ bộ nhớ MAX', id: 'Hapus seluruh memori MAX', tr: 'Tüm MAX hafızasını temizle', pl: 'Wyczyść całą pamięć MAX' },
  clearTitle: { ru: 'Очистить память MAX?', uk: 'Очистити пам’ять MAX?', es: '¿Borrar la memoria de MAX?', 'pt-BR': 'Limpar a memória do MAX?', vi: 'Xóa bộ nhớ MAX?', id: 'Hapus memori MAX?', tr: 'MAX hafızası temizlensin mi?', pl: 'Wyczyścić pamięć MAX?' },
  clearBody: { ru: 'Учебные заметки исчезнут без возможности восстановления. Новые разговоры смогут создать память заново.', uk: 'Навчальні нотатки зникнуть без можливості відновлення. Нові розмови зможуть створити пам’ять знову.', es: 'Las notas desaparecerán sin posibilidad de recuperarlas. Las conversaciones nuevas podrán crear memoria otra vez.', 'pt-BR': 'As notas serão apagadas sem recuperação. Novas conversas poderão criar a memória novamente.', vi: 'Ghi chú sẽ bị xóa và không thể khôi phục. Các cuộc trò chuyện mới có thể tạo lại bộ nhớ.', id: 'Catatan akan hilang dan tidak dapat dipulihkan. Percakapan baru dapat membuat memori lagi.', tr: 'Notlar geri alınamayacak şekilde silinir. Yeni konuşmalar hafızayı yeniden oluşturabilir.', pl: 'Notatki znikną bez możliwości odzyskania. Nowe rozmowy mogą utworzyć pamięć ponownie.' },
  deleteTitle: { ru: 'Удалить эту заметку?', uk: 'Видалити цю нотатку?', es: '¿Eliminar esta nota?', 'pt-BR': 'Excluir esta nota?', vi: 'Xóa ghi chú này?', id: 'Hapus catatan ini?', tr: 'Bu not silinsin mi?', pl: 'Usunąć tę notatkę?' },
  saving: { ru: 'Сохраняю…', uk: 'Зберігаю…', es: 'Guardando…', 'pt-BR': 'Salvando…', vi: 'Đang lưu…', id: 'Menyimpan…', tr: 'Kaydediliyor…', pl: 'Zapisywanie…' },
  editHint: { ru: 'Открывает поле для изменения этой заметки', uk: 'Відкриває поле для зміни цієї нотатки', es: 'Abre un campo para editar esta nota', 'pt-BR': 'Abre um campo para editar esta nota', vi: 'Mở trường để sửa ghi chú này', id: 'Membuka kolom untuk mengubah catatan ini', tr: 'Bu notu düzenlemek için bir alan açar', pl: 'Otwiera pole do edycji tej notatki' },
  chooseHint: { ru: 'Сохраняет этот вариант для следующих разговоров', uk: 'Зберігає цей варіант для наступних розмов', es: 'Guarda esta opción para las próximas conversaciones', 'pt-BR': 'Salva esta opção para as próximas conversas', vi: 'Lưu lựa chọn này cho các cuộc trò chuyện sau', id: 'Menyimpan pilihan ini untuk percakapan berikutnya', tr: 'Bu seçeneği sonraki konuşmalar için kaydeder', pl: 'Zapisuje tę opcję dla kolejnych rozmów' },
  deleteHint: { ru: 'Открывает подтверждение удаления этой заметки', uk: 'Відкриває підтвердження видалення цієї нотатки', es: 'Abre la confirmación para eliminar esta nota', 'pt-BR': 'Abre a confirmação para excluir esta nota', vi: 'Mở xác nhận xóa ghi chú này', id: 'Membuka konfirmasi untuk menghapus catatan ini', tr: 'Bu notu silmek için onay açar', pl: 'Otwiera potwierdzenie usunięcia tej notatki' },
  clearHint: { ru: 'Открывает подтверждение удаления всех учебных заметок MAX', uk: 'Відкриває підтвердження видалення всіх навчальних нотаток MAX', es: 'Abre la confirmación para borrar todas las notas de MAX', 'pt-BR': 'Abre a confirmação para apagar todas as notas do MAX', vi: 'Mở xác nhận xóa tất cả ghi chú học tập của MAX', id: 'Membuka konfirmasi untuk menghapus semua catatan belajar MAX', tr: 'Tüm MAX öğrenme notlarını silmek için onay açar', pl: 'Otwiera potwierdzenie usunięcia wszystkich notatek MAX' },
  saveHint: { ru: 'Сохраняет изменение в памяти MAX', uk: 'Зберігає зміну в пам’яті MAX', es: 'Guarda el cambio en la memoria de MAX', 'pt-BR': 'Salva a alteração na memória do MAX', vi: 'Lưu thay đổi vào bộ nhớ MAX', id: 'Menyimpan perubahan ke memori MAX', tr: 'Değişikliği MAX hafızasına kaydeder', pl: 'Zapisuje zmianę w pamięci MAX' },
  cancelHint: { ru: 'Закрывает окно без сохранения изменений', uk: 'Закриває вікно без збереження змін', es: 'Cierra la ventana sin guardar cambios', 'pt-BR': 'Fecha a janela sem salvar alterações', vi: 'Đóng cửa sổ mà không lưu thay đổi', id: 'Menutup jendela tanpa menyimpan perubahan', tr: 'Değişiklikleri kaydetmeden pencereyi kapatır', pl: 'Zamyka okno bez zapisywania zmian' },
  confirmHint: { ru: 'Удаляет выбранные учебные заметки без возможности восстановления', uk: 'Видаляє вибрані навчальні нотатки без можливості відновлення', es: 'Elimina las notas seleccionadas sin posibilidad de recuperación', 'pt-BR': 'Exclui as notas selecionadas sem possibilidade de recuperação', vi: 'Xóa các ghi chú đã chọn và không thể khôi phục', id: 'Menghapus catatan terpilih tanpa dapat dipulihkan', tr: 'Seçilen öğrenme notlarını geri alınamayacak şekilde siler', pl: 'Usuwa wybrane notatki bez możliwości odzyskania' },
} satisfies Record<string, Text8>;

function hasLearnerMemory(memory: MaxMemoryProjection): boolean {
  return Boolean(memory.preferredName || memory.learningGoal || memory.languagePreference || memory.pacePreference
    || memory.conversationHooks.length || memory.activeIssues.length || memory.resolvedIssues.length);
}

export default function MaxMemorySettings() {
  const router = useRouter();
  const { theme: t, f, ds } = useTheme();
  const { lang } = useLang();
  const L = useCallback((key: keyof typeof COPY) => triLang(lang, COPY[key]), [lang]);
  const [memory, setMemory] = useState<MaxMemoryProjection | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setMemory(await getMaxMemory());
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const mutate = useCallback(async (update: MaxMemoryUpdate) => {
    if (busy) return;
    setBusy(true);
    try {
      setMemory(await updateMaxMemory(update));
      setEdit(null);
      setStatus('ready');
    } catch {
      setStatus('error');
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const confirmAction = useCallback(async () => {
    if (!confirm || busy) return;
    setBusy(true);
    try {
      if (confirm.kind === 'clear') {
        await clearMaxMemory();
        setConfirm(null);
        await load();
      } else {
        setMemory(await deleteMaxMemoryItem(confirm.itemId));
        setConfirm(null);
        setStatus('ready');
      }
    } catch {
      setConfirm(null);
      setStatus('error');
    } finally {
      setBusy(false);
    }
  }, [busy, confirm, load]);

  const sectionTitleStyle = useMemo(() => ({ color: t.textPrimary, fontSize: f.h2, fontWeight: '900' as const }), [f.h2, t.textPrimary]);
  const cardStyle = useMemo(() => ({ backgroundColor: t.bgCard, borderColor: t.border, borderRadius: ds.radius.xl }), [ds.radius.xl, t.bgCard, t.border]);

  const fieldRow = (field: EditableField, label: string, value: string | null) => (
    <Pressable
      key={field}
      testID={`max-memory-${field}`}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value || L('notSet')}. ${L('edit')}`}
      accessibilityHint={L('editHint')}
      onPress={() => { void hapticTap(); setEdit({ kind: 'field', field, value: value ?? '' }); }}
      style={({ pressed }) => [styles.fieldRow, { opacity: pressed ? 0.72 : 1 }]}
    >
      <View style={styles.flex}>
        <Text style={{ color: t.textMuted, fontSize: f.body, fontWeight: '700' }}>{label}</Text>
        <Text style={{ color: value ? t.textPrimary : t.textMuted, fontSize: f.bodyLg, lineHeight: 24, fontWeight: '800', marginTop: 4 }}>{value || L('notSet')}</Text>
      </View>
      <Text style={{ color: t.accent, fontSize: f.body, fontWeight: '900' }}>{L('edit')}</Text>
    </Pressable>
  );

  const preference = (
    label: string,
    values: { label: string; value: string | null }[],
    selected: string | null,
    field: 'languagePreference' | 'pacePreference',
  ) => (
    <View style={styles.preferenceBlock}>
      <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '800' }}>{label}</Text>
      <View style={styles.chips}>
        {values.map((item) => {
          const active = selected === item.value;
          return (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityHint={L('chooseHint')}
              accessibilityState={{ selected: active, disabled: busy }}
              disabled={busy}
              onPress={() => {
                void hapticTap();
                void mutate(field === 'languagePreference'
                  ? { field, value: (item.value ?? 'default') as 'default' | 'more_target' | 'more_native' }
                  : { field, value: item.value as 'slower' | 'normal' | 'faster' | null });
              }}
              style={({ pressed }) => [styles.chip, {
                backgroundColor: active ? t.accent : t.bgSurface2,
                borderColor: active ? t.accent : t.border,
                opacity: pressed ? 0.75 : 1,
              }]}
            >
              <Text style={{ color: active ? t.correctText : t.textPrimary, fontSize: f.body, fontWeight: '800' }}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const memoryRow = (item: { id: string; label: string }, editable: boolean) => (
    <View key={item.id} style={[styles.memoryRow, { borderBottomColor: t.border }]}>
      <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, lineHeight: 24, fontWeight: '700', flex: 1 }}>{item.label}</Text>
      <View style={styles.rowActions}>
        {editable && (
          <Pressable accessibilityRole="button" accessibilityLabel={`${L('edit')}: ${item.label}`} accessibilityHint={L('editHint')} hitSlop={10} onPress={() => setEdit({ kind: 'hook', itemId: item.id, value: item.label })} style={styles.iconAction}>
            <Ionicons name="pencil" size={22} color={t.accent} />
          </Pressable>
        )}
        <Pressable accessibilityRole="button" accessibilityLabel={`${L('delete')}: ${item.label}`} accessibilityHint={L('deleteHint')} hitSlop={10} onPress={() => setConfirm({ kind: 'delete', itemId: item.id, label: item.label })} style={styles.iconAction}>
          <Ionicons name="trash-outline" size={22} color={t.wrong} />
        </Pressable>
      </View>
    </View>
  );

  const listSection = (title: string, items: { id: string; label: string }[], editable = false) => items.length ? (
    <View style={styles.section}>
      <Text style={sectionTitleStyle}>{title}</Text>
      <View style={[styles.card, cardStyle]}>{items.map((item) => memoryRow(item, editable))}</View>
    </View>
  ) : null;

  return (
    <ScreenGradient>
      <SafeAreaView style={styles.flex}>
        <ContentWrap>
          <SectionSheetHeader title={L('title')} onClose={() => safeRouterBack(router, '/privacy_settings' as never)} />
          <BouncyScrollView decelerationRate="fast" contentContainerStyle={styles.content}>
            <Text style={{ color: t.textSecond, fontSize: f.bodyLg, lineHeight: 25, fontWeight: '600' }}>{L('privacy')}</Text>

            {status === 'loading' && (
              <View testID="max-memory-loading" style={styles.state} accessibilityLiveRegion="polite">
                <ActivityIndicator color={t.accent} size="large" />
                <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '800', marginTop: 16 }}>{L('loading')}</Text>
              </View>
            )}

            {status === 'error' && (
              <View testID="max-memory-error" style={[styles.state, styles.card, cardStyle]} accessibilityLiveRegion="assertive">
                <Text style={{ color: t.textPrimary, fontSize: f.h2, lineHeight: 28, textAlign: 'center', fontWeight: '900' }}>{L('error')}</Text>
                <View style={styles.retryButton}><PrimaryButton label={L('retry')} accessibilityHint={L('retryHint')} onPress={() => void load()} /></View>
              </View>
            )}

            {status === 'ready' && memory && !hasLearnerMemory(memory) && (
              <View testID="max-memory-empty" style={[styles.state, styles.card, cardStyle]}>
                <Text style={{ color: t.textPrimary, fontSize: f.h2, textAlign: 'center', fontWeight: '900' }}>{L('emptyTitle')}</Text>
                <Text style={{ color: t.textSecond, fontSize: f.bodyLg, lineHeight: 25, textAlign: 'center', fontWeight: '600', marginTop: 10 }}>{L('emptyBody')}</Text>
              </View>
            )}

            {status === 'ready' && memory && hasLearnerMemory(memory) && (
              <>
                <View style={styles.section}>
                  <Text style={sectionTitleStyle}>{L('profile')}</Text>
                  <View style={[styles.card, cardStyle]}>
                    {fieldRow('preferredName', L('name'), memory.preferredName)}
                    <View style={{ height: 1, backgroundColor: t.border }} />
                    {fieldRow('learningGoal', L('goal'), memory.learningGoal)}
                    <View style={{ height: 1, backgroundColor: t.border }} />
                    {preference(L('language'), [
                      { label: L('default'), value: null }, { label: L('target'), value: 'more_target' }, { label: L('native'), value: 'more_native' },
                    ], memory.languagePreference, 'languagePreference')}
                    <View style={{ height: 1, backgroundColor: t.border }} />
                    {preference(L('pace'), [
                      { label: L('default'), value: null }, { label: L('slower'), value: 'slower' }, { label: L('normal'), value: 'normal' }, { label: L('faster'), value: 'faster' },
                    ], memory.pacePreference, 'pacePreference')}
                  </View>
                </View>
                {listSection(L('remembers'), memory.conversationHooks.map((item) => ({ id: item.id, label: item.text })), true)}
                {listSection(L('working'), memory.activeIssues)}
                {listSection(L('improved'), memory.resolvedIssues)}
                <Pressable
                  testID="max-memory-clear"
                  accessibilityRole="button"
                  accessibilityLabel={L('clear')}
                  accessibilityHint={L('clearHint')}
                  onPress={() => { void hapticTap(); setConfirm({ kind: 'clear' }); }}
                  style={({ pressed }) => [styles.clearButton, { borderColor: t.wrong, opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text style={{ color: t.wrong, fontSize: f.bodyLg, fontWeight: '900' }}>{L('clear')}</Text>
                </Pressable>
              </>
            )}
          </BouncyScrollView>
        </ContentWrap>
      </SafeAreaView>

      <HybridAlertShell visible={edit !== null} onRequestClose={() => !busy && setEdit(null)} testID="max-memory-edit-modal" shadowColor={t.accent}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBody}>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900' }}>{edit?.kind === 'field' ? (edit.field === 'preferredName' ? L('name') : L('goal')) : L('remembers')}</Text>
          <TextInput
            testID="max-memory-edit-input"
            value={edit?.value ?? ''}
            onChangeText={(value) => setEdit((current) => current ? { ...current, value } : current)}
            editable={!busy}
            autoFocus
            maxLength={edit?.kind === 'field' && edit.field === 'preferredName' ? 60 : edit?.kind === 'field' ? 160 : 140}
            multiline={edit?.kind !== 'field' || edit.field === 'learningGoal'}
            style={[styles.input, { color: t.textPrimary, backgroundColor: t.bgSurface2, borderColor: t.border, fontSize: f.bodyLg }]}
          />
          <PrimaryButton
            label={busy ? L('saving') : L('save')}
            accessibilityHint={L('saveHint')}
            disabled={busy || !edit?.value.trim()}
            onPress={() => {
              if (!edit) return;
              void mutate(edit.kind === 'field'
                ? { field: edit.field, value: edit.value.trim() }
                : { itemId: edit.itemId, text: edit.value.trim() });
            }}
          />
          <Pressable accessibilityRole="button" accessibilityLabel={L('cancel')} accessibilityHint={L('cancelHint')} disabled={busy} onPress={() => setEdit(null)} style={styles.cancelButton}>
            <Text style={{ color: t.textSecond, fontSize: f.bodyLg, fontWeight: '800' }}>{L('cancel')}</Text>
          </Pressable>
        </KeyboardAvoidingView>
      </HybridAlertShell>

      <HybridAlertShell visible={confirm !== null} onRequestClose={() => !busy && setConfirm(null)} testID="max-memory-confirm-modal" shadowColor={t.wrong}>
        <View style={styles.modalBody}>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, lineHeight: 29, fontWeight: '900', textAlign: 'center' }}>{confirm?.kind === 'clear' ? L('clearTitle') : L('deleteTitle')}</Text>
          <Text style={{ color: t.textSecond, fontSize: f.bodyLg, lineHeight: 25, fontWeight: '600', textAlign: 'center' }}>{confirm?.kind === 'clear' ? L('clearBody') : confirm?.label}</Text>
          <Pressable
            testID="max-memory-confirm-action"
            accessibilityRole="button"
            accessibilityLabel={confirm?.kind === 'clear' ? L('clear') : L('delete')}
            accessibilityHint={L('confirmHint')}
            disabled={busy}
            onPress={() => void confirmAction()}
            style={({ pressed }) => [styles.destructiveButton, { backgroundColor: t.wrong, opacity: pressed || busy ? 0.7 : 1 }]}
          >
            <Text style={{ color: '#FFFFFF', fontSize: f.bodyLg, fontWeight: '900' }}>{busy ? L('saving') : L('delete')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={L('cancel')} accessibilityHint={L('cancelHint')} disabled={busy} onPress={() => setConfirm(null)} style={styles.cancelButton}>
            <Text style={{ color: t.textSecond, fontSize: f.bodyLg, fontWeight: '800' }}>{L('cancel')}</Text>
          </Pressable>
        </View>
      </HybridAlertShell>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: 14, paddingHorizontal: 2, paddingBottom: 48 },
  section: { marginTop: 28 },
  card: { borderWidth: 1, overflow: 'hidden', marginTop: 12 },
  state: { minHeight: 190, marginTop: 26, alignItems: 'center', justifyContent: 'center', padding: 24 },
  retryButton: { width: '100%', marginTop: 22 },
  fieldRow: { minHeight: 76, paddingHorizontal: 18, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', gap: 16 },
  preferenceBlock: { paddingHorizontal: 18, paddingVertical: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 13 },
  chip: { minHeight: 46, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 16, borderWidth: 1 },
  memoryRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 16 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 22, minHeight: 44 },
  iconAction: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  clearButton: { minHeight: 58, borderWidth: 1.5, borderRadius: 18, marginTop: 32, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  modalBody: { width: '100%', gap: 18, padding: 20 },
  input: { minHeight: 58, maxHeight: 150, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, fontWeight: '700', textAlignVertical: 'top' },
  cancelButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  destructiveButton: { minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
});
