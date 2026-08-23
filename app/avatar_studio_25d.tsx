// зачем: владельцу нужен кастомизатор аватара в стиле утверждённого макета
// («Твоя студия»: крем/какао/терракота, 5 вкладок, цельные 2.5D-рендеры).
// Экран — каркас конвейера AVATAR STUDIO: каталог читается из
// assets/avatar-25d (наполняется только через приёмку check_render),
// весь выбор локальный и мгновенный, сети нет вообще.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  avatar25dItemKey,
  avatar25dItemsForSlot,
  parseAvatar25dCatalog,
  type Avatar25dCatalog,
  type Avatar25dCatalogItem,
  type Avatar25dSlot,
} from '../modules/avatar-25d/catalog';
import { AVATAR_25D_ASSETS } from '../assets/avatar-25d/asset_map.generated';
import {
  AVATAR_25D_DEFAULT_SELECTION,
  loadAvatar25dSelection,
  saveAvatar25dSelection,
  type Avatar25dSelection,
} from '../modules/avatar-25d/storage';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';

// Палитра утверждённого макета студии: сцена совпадает с фоном рендеров
// (#F7EFE4), чтобы портрет сливался с карточкой без «рамки» из шва.
const scene = {
  bg: '#F7EFE4',
  surface: '#EFE3D0',
  tile: '#FBF6EC',
  portrait: '#F1E7D6',
  ink: '#37281B',
  muted: '#8A7663',
  accent: '#C05B36',
  onAccent: '#FFF6EF',
} as const;

type StudioTabId = 'core' | 'face' | 'hair' | 'look' | 'stage';

function makeStudioCopy(lang: Lang) {
  return {
    title: triLang(lang, { ru: 'Твоя студия', uk: 'Твоя студія', es: 'Tu estudio', 'pt-BR': 'Seu estúdio', vi: 'Xưởng của bạn', id: 'Studiomu', tr: 'Stüdyon', pl: 'Twoje studio' }),
    back: triLang(lang, { ru: 'Назад', uk: 'Назад', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' }),
    undo: triLang(lang, { ru: 'Отменить', uk: 'Скасувати', es: 'Deshacer', 'pt-BR': 'Desfazer', vi: 'Hoàn tác', id: 'Urungkan', tr: 'Geri al', pl: 'Cofnij' }),
    redo: triLang(lang, { ru: 'Вернуть', uk: 'Повернути', es: 'Rehacer', 'pt-BR': 'Refazer', vi: 'Làm lại', id: 'Ulangi', tr: 'Yinele', pl: 'Ponów' }),
    tabs: {
      core: triLang(lang, { ru: 'Основа', uk: 'Основа', es: 'Base', 'pt-BR': 'Base', vi: 'Cơ bản', id: 'Dasar', tr: 'Temel', pl: 'Baza' }),
      face: triLang(lang, { ru: 'Лицо', uk: 'Обличчя', es: 'Cara', 'pt-BR': 'Rosto', vi: 'Khuôn mặt', id: 'Wajah', tr: 'Yüz', pl: 'Twarz' }),
      hair: triLang(lang, { ru: 'Волосы', uk: 'Волосся', es: 'Pelo', 'pt-BR': 'Cabelo', vi: 'Tóc', id: 'Rambut', tr: 'Saç', pl: 'Włosy' }),
      look: triLang(lang, { ru: 'Образ', uk: 'Образ', es: 'Look', 'pt-BR': 'Look', vi: 'Diện mạo', id: 'Gaya', tr: 'Stil', pl: 'Styl' }),
      stage: triLang(lang, { ru: 'Сцена', uk: 'Сцена', es: 'Escena', 'pt-BR': 'Cena', vi: 'Bối cảnh', id: 'Latar', tr: 'Sahne', pl: 'Scena' }),
    } satisfies Record<StudioTabId, string>,
    slots: {
      base: triLang(lang, { ru: 'Персонаж', uk: 'Персонаж', es: 'Personaje', 'pt-BR': 'Personagem', vi: 'Nhân vật', id: 'Karakter', tr: 'Karakter', pl: 'Postać' }),
      skin: triLang(lang, { ru: 'Тон кожи', uk: 'Тон шкіри', es: 'Tono de piel', 'pt-BR': 'Tom de pele', vi: 'Màu da', id: 'Warna kulit', tr: 'Ten rengi', pl: 'Odcień skóry' }),
      eyes: triLang(lang, { ru: 'Глаза', uk: 'Очі', es: 'Ojos', 'pt-BR': 'Olhos', vi: 'Mắt', id: 'Mata', tr: 'Gözler', pl: 'Oczy' }),
      emotion: triLang(lang, { ru: 'Эмоция', uk: 'Емоція', es: 'Emoción', 'pt-BR': 'Emoção', vi: 'Cảm xúc', id: 'Emosi', tr: 'İfade', pl: 'Emocja' }),
      hair: triLang(lang, { ru: 'Причёска', uk: 'Зачіска', es: 'Peinado', 'pt-BR': 'Penteado', vi: 'Kiểu tóc', id: 'Gaya rambut', tr: 'Saç modeli', pl: 'Fryzura' }),
      outfit: triLang(lang, { ru: 'Одежда', uk: 'Одяг', es: 'Ropa', 'pt-BR': 'Roupa', vi: 'Trang phục', id: 'Pakaian', tr: 'Kıyafet', pl: 'Ubranie' }),
      headwear: triLang(lang, { ru: 'Головной убор', uk: 'Головний убір', es: 'Gorro', 'pt-BR': 'Chapéu', vi: 'Mũ', id: 'Penutup kepala', tr: 'Başlık', pl: 'Nakrycie głowy' }),
      accessory: triLang(lang, { ru: 'Аксессуар', uk: 'Аксесуар', es: 'Accesorio', 'pt-BR': 'Acessório', vi: 'Phụ kiện', id: 'Aksesori', tr: 'Aksesuar', pl: 'Akcesorium' }),
    } satisfies Partial<Record<Avatar25dSlot, string>>,
    none: triLang(lang, { ru: 'Без этого', uk: 'Без цього', es: 'Sin esto', 'pt-BR': 'Sem isso', vi: 'Không dùng', id: 'Tanpa ini', tr: 'Bunsuz', pl: 'Bez tego' }),
    emptyCatalog: triLang(lang, { ru: 'Каталог пуст. Детали появятся после приёмки в конвейере.', uk: 'Каталог порожній. Деталі з’являться після приймання в конвеєрі.', es: 'El catálogo está vacío. Las piezas llegarán tras la aceptación.', 'pt-BR': 'O catálogo está vazio. As peças chegam após a aceitação.', vi: 'Danh mục trống. Các chi tiết sẽ xuất hiện sau khi được duyệt.', id: 'Katalog kosong. Item muncul setelah diterima.', tr: 'Katalog boş. Parçalar onaydan sonra gelecek.', pl: 'Katalog jest pusty. Elementy pojawią się po akceptacji.' }),
    baseMissing: triLang(lang, { ru: 'Эталон этой базы ещё не опубликован.', uk: 'Еталон цієї бази ще не опубліковано.', es: 'La base aún no está publicada.', 'pt-BR': 'A base ainda não foi publicada.', vi: 'Bản gốc này chưa được xuất bản.', id: 'Basis ini belum dipublikasikan.', tr: 'Bu taban henüz yayınlanmadı.', pl: 'Ta baza nie została jeszcze opublikowana.' }),
    stageSoon: triLang(lang, { ru: 'Сцены и фоны приедут следующей волной каталога.', uk: 'Сцени й фони приїдуть наступною хвилею каталогу.', es: 'Escenas y fondos llegarán en la próxima ola.', 'pt-BR': 'Cenas e fundos chegam na próxima leva.', vi: 'Bối cảnh và nền sẽ đến trong đợt sau.', id: 'Latar dan background datang di gelombang berikutnya.', tr: 'Sahneler ve arka planlar sonraki dalgada gelecek.', pl: 'Sceny i tła pojawią się w następnej fali.' }),
    slotEmpty: triLang(lang, { ru: 'Пока пусто — детали принимаются конвейером.', uk: 'Поки порожньо — деталі приймає конвеєр.', es: 'Aún vacío: las piezas llegan por el pipeline.', 'pt-BR': 'Ainda vazio: as peças chegam pelo pipeline.', vi: 'Còn trống — chi tiết sẽ được duyệt dần.', id: 'Masih kosong — item sedang diproses.', tr: 'Şimdilik boş — parçalar sırayla ekleniyor.', pl: 'Na razie pusto — elementy są w drodze.' }),
    save: triLang(lang, { ru: 'Сохранить персонажа', uk: 'Зберегти персонажа', es: 'Guardar personaje', 'pt-BR': 'Salvar personagem', vi: 'Lưu nhân vật', id: 'Simpan karakter', tr: 'Karakteri kaydet', pl: 'Zapisz postać' }),
    savedDone: triLang(lang, { ru: 'Сохранено ✓', uk: 'Збережено ✓', es: 'Guardado ✓', 'pt-BR': 'Salvo ✓', vi: 'Đã lưu ✓', id: 'Tersimpan ✓', tr: 'Kaydedildi ✓', pl: 'Zapisano ✓' }),
    portrait: triLang(lang, { ru: 'Портрет персонажа', uk: 'Портрет персонажа', es: 'Retrato del personaje', 'pt-BR': 'Retrato do personagem', vi: 'Chân dung nhân vật', id: 'Potret karakter', tr: 'Karakter portresi', pl: 'Portret postaci' }),
  };
}
type StudioCopy = ReturnType<typeof makeStudioCopy>;

const STUDIO_TAB_IDS: readonly StudioTabId[] = ['core', 'face', 'hair', 'look', 'stage'];

const TAB_SLOTS: Record<StudioTabId, ReadonlyArray<{ slot: Avatar25dSlot; optional: boolean }>> = {
  core: [
    { slot: 'base', optional: false },
    { slot: 'skin', optional: true },
  ],
  face: [
    { slot: 'eyes', optional: true },
    { slot: 'emotion', optional: true },
  ],
  hair: [{ slot: 'hair', optional: true }],
  look: [
    { slot: 'outfit', optional: true },
    { slot: 'headwear', optional: true },
    { slot: 'accessory', optional: true },
  ],
  stage: [],
};

function loadPublishedCatalog(): Avatar25dCatalog {
  try {
    return parseAvatar25dCatalog(require('../assets/avatar-25d/manifest.json'));
  } catch {
    // Кривой манифест = пустой каталог; экран живёт, конвейер чинится отдельно.
    return { version: 1, items: [] };
  }
}

export default function AvatarStudio25dScreen() {
  const insets = useStableSafeAreaInsets();
  const { lang } = useLang();
  const copy = useMemo(() => makeStudioCopy(lang), [lang]);
  // Каталог статичен на время жизни экрана: бандл-ассеты, ноль сети.
  const catalog = useMemo(loadPublishedCatalog, []);
  const [selection, setSelection] = useState<Avatar25dSelection>(AVATAR_25D_DEFAULT_SELECTION);
  const [activeTab, setActiveTab] = useState<StudioTabId>('core');
  const [saved, setSaved] = useState(false);
  const history = useRef<{ past: Avatar25dSelection[]; future: Avatar25dSelection[] }>({ past: [], future: [] });
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    loadAvatar25dSelection().then(stored => { if (alive) setSelection(stored); });
    return () => {
      alive = false;
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  const applySelection = useCallback((next: Avatar25dSelection) => {
    setSelection(current => {
      history.current.past.push(current);
      history.current.future = [];
      return next;
    });
    setSaved(false);
  }, []);

  const undo = useCallback(() => {
    const previous = history.current.past.pop();
    if (!previous) return;
    setSelection(current => { history.current.future.push(current); return previous; });
    setSaved(false);
  }, []);

  const redo = useCallback(() => {
    const next = history.current.future.pop();
    if (!next) return;
    setSelection(current => { history.current.past.push(current); return next; });
    setSaved(false);
  }, []);

  const pick = useCallback((slot: Avatar25dSlot, id: string | null) => {
    applySelection({ ...selection, [slot]: slot === 'base' && id === null ? selection.base : id });
  }, [applySelection, selection]);

  const onSave = useCallback(() => {
    // Optimistic: подтверждение мгновенно, запись локальная; при провале
    // записи возвращаем кнопку в исходное состояние (единственный «откат»).
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1400);
    void saveAvatar25dSelection(selection).then(ok => { if (!ok) setSaved(false); });
  }, [selection]);

  // Портрет: пока каталог наполняется, показываем эталон выбранной базы;
  // полная матрица wholeRender(base, look) подключится вместе с публикацией.
  const portraitAsset: number | null =
    AVATAR_25D_ASSETS[`base/${selection.base}`] ?? null;

  const catalogEmpty = catalog.items.length === 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <StudioIconButton label={copy.back} glyph="‹" onPress={() => router.back()} />
        <Text style={styles.title}>{copy.title}</Text>
        <View style={styles.headerActions}>
          <StudioIconButton label={copy.undo} glyph="↺" onPress={undo} />
          <StudioIconButton label={copy.redo} glyph="↻" onPress={redo} />
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={[styles.bodyContent, { paddingBottom: insets.bottom + 108 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.portraitCard}>
          {portraitAsset !== null ? (
            <Image source={portraitAsset} style={styles.portraitImage} resizeMode="cover" accessibilityLabel={copy.portrait} />
          ) : (
            <View style={styles.portraitEmpty}>
              <View style={styles.portraitEmptyHead} />
              <View style={styles.portraitEmptyBody} />
              <Text style={styles.portraitEmptyText}>
                {catalogEmpty ? copy.emptyCatalog : copy.baseMissing}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.tabRail}>
          {STUDIO_TAB_IDS.map(tabId => {
            const active = tabId === activeTab;
            return (
              <Pressable
                key={tabId}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setActiveTab(tabId)}
                style={({ pressed }) => [
                  styles.tab,
                  active && styles.tabActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{copy.tabs[tabId]}</Text>
              </Pressable>
            );
          })}
        </View>

        {activeTab === 'stage' ? (
          <EmptySlotPanel text={copy.stageSoon} />
        ) : (
          TAB_SLOTS[activeTab].map(section => (
            <SlotSection
              key={section.slot}
              title={copy.slots[section.slot] ?? section.slot}
              optional={section.optional}
              copy={copy}
              items={avatar25dItemsForSlot(catalog, section.slot).filter(
                // зачем: детали привязаны к своей базе (мальчик/девочка) —
                // чужие в каталоге вкладки не показываем
                item => !item.base || item.base === `${selection.base}.png`,
              )}
              selectedId={selection[section.slot]}
              onPick={id => pick(section.slot, id)}
            />
          ))
        )}
      </ScrollView>

      <View style={[styles.saveDock, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <Pressable
          accessibilityRole="button"
          onPress={onSave}
          style={({ pressed }) => [styles.saveButton, pressed && styles.savePressed]}
        >
          <Text style={styles.saveText}>{saved ? copy.savedDone : copy.save}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function StudioIconButton({ label, glyph, onPress }: { label: string; glyph: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
    >
      <Text style={styles.iconGlyph}>{glyph}</Text>
    </Pressable>
  );
}

function SlotSection({
  title,
  optional,
  copy,
  items,
  selectedId,
  onPick,
}: {
  title: string;
  optional: boolean;
  copy: StudioCopy;
  items: readonly Avatar25dCatalogItem[];
  selectedId: string | null;
  onPick: (id: string | null) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.length === 0 ? (
        <EmptySlotPanel text={copy.slotEmpty} />
      ) : (
        <View style={styles.grid}>
          {optional && (
            <OptionTile
              label={copy.none}
              asset={null}
              selected={selectedId === null}
              onPress={() => onPick(null)}
            />
          )}
          {items.map(item => (
            <OptionTile
              key={item.id}
              label={item.label ?? item.id.replace(/^[a-z]+_/, '').replace(/_/g, ' ')}
              asset={AVATAR_25D_ASSETS[avatar25dItemKey(item)] ?? null}
              selected={selectedId === item.id}
              onPress={() => onPick(item.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function OptionTile({
  label,
  asset,
  selected,
  onPress,
}: {
  label: string;
  asset: number | null;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        selected && styles.tileSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.tileThumb}>
        {asset !== null && (
          // Превью декоративное: имя варианта уже озвучивает сам Pressable.
          <Image source={asset} style={styles.tileImage} resizeMode="cover" accessible={false} />
        )}
      </View>
      <Text numberOfLines={1} style={[styles.tileLabel, selected && styles.tileLabelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function EmptySlotPanel({ text }: { text: string }) {
  return (
    <View style={styles.emptyPanel}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: scene.bg },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerActions: { flexDirection: 'row', gap: 8 },
  title: { fontSize: 22, fontWeight: '800', color: scene.ink, letterSpacing: 0.2 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: scene.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlyph: { fontSize: 20, color: scene.ink, fontWeight: '700' },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: 20, gap: 18 },
  portraitCard: {
    // Первый кадр = финальная геометрия: пропорция паспорта кадра 4:5.
    width: '100%',
    aspectRatio: 4 / 5,
    maxHeight: 430,
    borderRadius: 28,
    backgroundColor: scene.portrait,
    overflow: 'hidden',
    shadowColor: '#7A5A3A',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  portraitImage: { width: '100%', height: '100%' },
  portraitEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 },
  portraitEmptyHead: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: scene.surface,
  },
  portraitEmptyBody: {
    width: 168,
    height: 84,
    borderTopLeftRadius: 84,
    borderTopRightRadius: 84,
    backgroundColor: scene.surface,
    marginBottom: 6,
  },
  portraitEmptyText: { textAlign: 'center', color: scene.muted, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  tabRail: {
    flexDirection: 'row',
    backgroundColor: scene.surface,
    borderRadius: 22,
    padding: 5,
    gap: 4,
  },
  tab: {
    flex: 1,
    height: 44,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: scene.tile,
    shadowColor: '#7A5A3A',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  tabText: { fontSize: 13.5, fontWeight: '700', color: scene.muted }, // guard-ok: лейбл неактивной вкладки, не подпись-расшифровка
  tabTextActive: { color: scene.ink },
  section: { gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: scene.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    width: 104,
    borderRadius: 20,
    backgroundColor: scene.tile,
    padding: 8,
    gap: 6,
    shadowColor: '#7A5A3A',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  tileSelected: { backgroundColor: scene.accent },
  tileThumb: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: scene.portrait,
    overflow: 'hidden',
  },
  tileImage: { width: '100%', height: '100%' },
  tileLabel: { fontSize: 12.5, fontWeight: '700', color: scene.ink, textAlign: 'center' },
  tileLabelSelected: { color: scene.onAccent },
  emptyPanel: {
    borderRadius: 20,
    backgroundColor: scene.surface,
    paddingVertical: 22,
    paddingHorizontal: 20,
  },
  emptyText: { color: scene.muted, fontSize: 14, lineHeight: 20, fontWeight: '600', textAlign: 'center' },
  saveDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: scene.bg,
  },
  saveButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: scene.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8A3A1E',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  savePressed: { transform: [{ scale: 0.98 }] },
  pressed: { transform: [{ scale: 0.97 }] },
  saveText: { color: scene.onAccent, fontSize: 16.5, fontWeight: '800', letterSpacing: 0.2 },
});
