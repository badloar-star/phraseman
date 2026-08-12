import { triLang, type Lang } from '../../constants/i18n';

const NAMES: Readonly<Record<string, readonly [string, string, string, string, string, string, string, string]>> = {
  title_rising_challenger: ['Восходящий претендент', 'Висхідний претендент', 'Aspirante en ascenso', 'Desafiante em ascensão', 'Đối thủ đang lên', 'Penantang baru', 'Yükselen rakip', 'Rosnący pretendent'],
  title_clutch_player: ['Решающий игрок', 'Вирішальний гравець', 'Jugador decisivo', 'Jogador decisivo', 'Người chơi quyết định', 'Pemain penentu', 'Kritik oyuncu', 'Decydujący gracz'],
  title_wordsmith: ['Мастер слова', 'Майстер слова', 'Artesano de palabras', 'Mestre das palavras', 'Bậc thầy ngôn từ', 'Ahli kata', 'Söz ustası', 'Mistrz słowa'],
  reactions_respect: ['Реакции «Уважение»', 'Реакції «Повага»', 'Reacciones Respeto', 'Reações Respeito', 'Phản ứng Tôn trọng', 'Reaksi Hormat', 'Saygı tepkileri', 'Reakcje Szacunek'],
  reactions_comeback: ['Реакции «Возвращение»', 'Реакції «Повернення»', 'Reacciones Remontada', 'Reações Virada', 'Phản ứng Lội ngược dòng', 'Reaksi Bangkit', 'Geri dönüş tepkileri', 'Reakcje Powrót'],
  result_midnight: ['Результат «Полночь»', 'Результат «Північ»', 'Resultado Medianoche', 'Resultado Meia-noite', 'Kết quả Nửa đêm', 'Hasil Tengah malam', 'Gece yarısı sonucu', 'Wynik Północ'],
  result_lime: ['Результат «Лайм»', 'Результат «Лайм»', 'Resultado Lima', 'Resultado Lima', 'Kết quả Chanh xanh', 'Hasil Limau', 'Limon sonucu', 'Wynik Limonka'],
  result_champion_gold: ['Золото чемпиона', 'Золото чемпіона', 'Oro de campeón', 'Ouro de campeão', 'Vàng vô địch', 'Emas juara', 'Şampiyon altını', 'Złoto mistrza'],
  victory_clean_sweep: ['Печать «Сухая победа»', 'Печатка «Суха перемога»', 'Sello Victoria perfecta', 'Selo Vitória perfeita', 'Dấu Ấn thắng tuyệt đối', 'Stempel Menang mutlak', 'Kusursuz zafer damgası', 'Pieczęć Czyste zwycięstwo'],
  victory_clutch: ['Печать «Решающий момент»', 'Печатка «Вирішальний момент»', 'Sello Momento decisivo', 'Selo Momento decisivo', 'Dấu Khoảnh khắc quyết định', 'Stempel Momen penentu', 'Kritik an damgası', 'Pieczęć Decydujący moment'],
  entry_cyan_trail: ['Бирюзовый след', 'Бірюзовий слід', 'Estela cian', 'Rastro ciano', 'Vệt xanh ngọc', 'Jejak sian', 'Camgöbeği izi', 'Cyjanowy ślad'],
  entry_gold_burst: ['Золотая вспышка', 'Золотий спалах', 'Destello dorado', 'Explosão dourada', 'Tia vàng', 'Kilatan emas', 'Altın parıltı', 'Złoty błysk'],
  entry_legend_crown: ['Корона легенды', 'Корона легенди', 'Corona de leyenda', 'Coroa da lenda', 'Vương miện huyền thoại', 'Mahkota legenda', 'Efsane tacı', 'Korona legendy'],
};

export function arenaStoreItemTitle(lang: Lang, itemId: string): string | null {
  const value = NAMES[itemId];
  if (!value) return null;
  const [ru, uk, es, ptBR, vi, id, tr, pl] = value;
  return triLang(lang, { ru, uk, es, 'pt-BR': ptBR, vi, id, tr, pl });
}

export const ARENA_LOCALIZED_STORE_ITEM_IDS = Object.freeze([
  'title_rising_challenger', 'title_clutch_player', 'title_wordsmith', 'reactions_respect',
  'reactions_comeback', 'result_midnight', 'result_lime', 'result_champion_gold',
  'victory_clean_sweep', 'victory_clutch', 'entry_cyan_trail', 'entry_gold_burst', 'entry_legend_crown',
] as const);
export type ArenaStoreItemId = (typeof ARENA_LOCALIZED_STORE_ITEM_IDS)[number];
