import type { Lang } from '../constants/i18n';

export const AVATAR_DNA_LOCALES = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
export type AvatarDNALocale = (typeof AVATAR_DNA_LOCALES)[number];

export type AvatarDNACopy = Readonly<{
  title: string; close: string; undo: string; redo: string; save: string;
  base: string; face: string; hair: string; look: string; scene: string;
  portrait: string; studio: string; variants: string; free: string; rewardLocked: string; rewardSelected: string;
  selected: string; createCharacter: string; noticeUndo: string; hoodNotice: string;
  skin03: string; face01: string; body01: string; eyes01: string; irisBrown: string;
  brows01: string; nose01: string; mouth01: string; hair01: string; hairWavy01: string;
  hairBrown: string; outfit01: string; backgroundCream: string; assassinHood: string;
}>;

const ru: AvatarDNACopy = {
  title: 'Студия персонажа', close: 'Закрыть Студию', undo: 'Отменить изменение', redo: 'Повторить изменение', save: 'Сохранить персонажа',
  base: 'Основа', face: 'Лицо', hair: 'Волосы', look: 'Образ', scene: 'Сцена', portrait: 'Портрет', studio: 'По пояс', variants: 'Варианты',
  free: 'бесплатно', rewardLocked: 'награда, не получен', rewardSelected: 'награда, выбран', selected: 'выбран', createCharacter: 'Создать персонажа', noticeUndo: 'Отменить',
  hoodNotice: 'Капюшон скрывает верх причёски и уши. Они вернутся после снятия.',
  skin03: 'Тёплый тон кожи', face01: 'Мягкое лицо', body01: 'Базовая фигура', eyes01: 'Выразительные глаза', irisBrown: 'Карие глаза', brows01: 'Мягкие брови', nose01: 'Аккуратный нос', mouth01: 'Добрая улыбка', hair01: 'Классическая причёска', hairWavy01: 'Волнистые волосы', hairBrown: 'Каштановый цвет', outfit01: 'Терракотовый образ', backgroundCream: 'Кремовый фон', assassinHood: 'Капюшон ассасина',
};

const make = (primary: Partial<AvatarDNACopy>): AvatarDNACopy => ({ ...ru, ...primary });

export const AVATAR_DNA_COPY: Readonly<Record<AvatarDNALocale, AvatarDNACopy>> = {
  ru,
  uk: make({ title: 'Студія персонажа', close: 'Закрити Студію', undo: 'Скасувати зміну', redo: 'Повторити зміну', save: 'Зберегти персонажа', base: 'Основа', face: 'Обличчя', hair: 'Волосся', look: 'Образ', scene: 'Сцена', portrait: 'Портрет', studio: 'До пояса', variants: 'Варіанти', free: 'безкоштовно', rewardLocked: 'нагорода, не отримано', selected: 'вибрано', createCharacter: 'Створити персонажа', noticeUndo: 'Скасувати', assassinHood: 'Каптур асасина' }),
  es: make({ title: 'Estudio de personaje', close: 'Cerrar el Estudio', undo: 'Deshacer cambio', redo: 'Rehacer cambio', save: 'Guardar personaje', base: 'Base', face: 'Rostro', hair: 'Cabello', look: 'Estilo', scene: 'Escena', portrait: 'Retrato', studio: 'Medio cuerpo', variants: 'Variantes', free: 'gratis', rewardLocked: 'recompensa, no obtenida', selected: 'seleccionado', createCharacter: 'Crear personaje', noticeUndo: 'Deshacer', assassinHood: 'Capucha de asesino' }),
  'pt-BR': make({ title: 'Estúdio de personagem', close: 'Fechar o Estúdio', undo: 'Desfazer alteração', redo: 'Refazer alteração', save: 'Salvar personagem', base: 'Base', face: 'Rosto', hair: 'Cabelo', look: 'Visual', scene: 'Cena', portrait: 'Retrato', studio: 'Meio corpo', variants: 'Variações', free: 'grátis', rewardLocked: 'recompensa, não obtida', selected: 'selecionado', createCharacter: 'Criar personagem', noticeUndo: 'Desfazer', assassinHood: 'Capuz de assassino' }),
  vi: make({ title: 'Xưởng nhân vật', close: 'Đóng Xưởng', undo: 'Hoàn tác thay đổi', redo: 'Làm lại thay đổi', save: 'Lưu nhân vật', base: 'Cơ bản', face: 'Khuôn mặt', hair: 'Tóc', look: 'Trang phục', scene: 'Khung cảnh', portrait: 'Chân dung', studio: 'Nửa người', variants: 'Tùy chọn', free: 'miễn phí', rewardLocked: 'phần thưởng, chưa nhận', selected: 'đã chọn', createCharacter: 'Tạo nhân vật', noticeUndo: 'Hoàn tác', assassinHood: 'Mũ trùm sát thủ' }),
  id: make({ title: 'Studio karakter', close: 'Tutup Studio', undo: 'Urungkan perubahan', redo: 'Ulangi perubahan', save: 'Simpan karakter', base: 'Dasar', face: 'Wajah', hair: 'Rambut', look: 'Gaya', scene: 'Latar', portrait: 'Potret', studio: 'Setengah badan', variants: 'Pilihan', free: 'gratis', rewardLocked: 'hadiah, belum didapat', selected: 'dipilih', createCharacter: 'Buat karakter', noticeUndo: 'Urungkan', assassinHood: 'Tudung pembunuh' }),
  tr: make({ title: 'Karakter Stüdyosu', close: 'Stüdyoyu kapat', undo: 'Değişikliği geri al', redo: 'Değişikliği yinele', save: 'Karakteri kaydet', base: 'Temel', face: 'Yüz', hair: 'Saç', look: 'Görünüm', scene: 'Sahne', portrait: 'Portre', studio: 'Bel planı', variants: 'Seçenekler', free: 'ücretsiz', rewardLocked: 'ödül, alınmadı', selected: 'seçildi', createCharacter: 'Karakter oluştur', noticeUndo: 'Geri al', assassinHood: 'Suikastçı kapüşonu' }),
  pl: make({ title: 'Studio postaci', close: 'Zamknij Studio', undo: 'Cofnij zmianę', redo: 'Ponów zmianę', save: 'Zapisz postać', base: 'Baza', face: 'Twarz', hair: 'Włosy', look: 'Styl', scene: 'Scena', portrait: 'Portret', studio: 'Półpostać', variants: 'Warianty', free: 'bezpłatne', rewardLocked: 'nagroda, niezdobyta', selected: 'wybrano', createCharacter: 'Utwórz postać', noticeUndo: 'Cofnij', assassinHood: 'Kaptur asasyna' }),
};

export const avatarDNACopy = (lang: Lang): AvatarDNACopy => AVATAR_DNA_COPY[lang as AvatarDNALocale] ?? ru;

export const avatarDNAItemName = (itemId: string, copy: AvatarDNACopy): string => ({
  skin_03: copy.skin03, face_01: copy.face01, body_01: copy.body01, eyes_01: copy.eyes01,
  iris_brown: copy.irisBrown, brows_01: copy.brows01, nose_01: copy.nose01, mouth_01: copy.mouth01,
  hair_01: copy.hair01, hair_wavy_01: copy.hairWavy01, hair_brown: copy.hairBrown,
  outfit_01: copy.outfit01, background_cream: copy.backgroundCream,
  'headwear.assassin_hood.01': copy.assassinHood,
} as Record<string, string>)[itemId] ?? itemId;
