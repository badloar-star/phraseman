// ════════════════════════════════════════════════════════════════════════════
// SeasonRewardInfoModal.tsx — просмотровая модалка «что это такое» для ЛЮБОЙ
// карточки награды на дорожке Season Pass, в ЛЮБОМ статусе.
//
// зачем 2026-08-03 (владелец: «убери с полоски цифры они не нужны» + «open
// modal чтобы можно было открыть и посмотреть что это такое, текст описания
// все с юморком»): раньше тап по карточке либо сразу забирал награду
// (claimable), либо открывал тост-подсказку про пропуск (locked), либо не
// делал ничего (уже забрана / ещё не открыт уровень) — три разных, местами
// немых, поведения. Владелец подтвердил единый вход: тап на ЛЮБОЙ карточке
// открывает описание, а действие («Забрать», «Нужен пропуск») — это кнопка
// УЖЕ ВНУТРИ описания, а не побочный эффект самого тапа.
//
// Текст (заголовок + юморной desc) переиспользует SEASON_MODAL_COPY из
// SeasonGiftModal.tsx — те же строки уже написаны с юмором для модалки
// клейма («Батарейка больше не оправдание», «Выглядишь дороже, чем платил»),
// дублировать 19×8 переводов не нужно. Эта модалка READ-ONLY: не выполняет
// applySeasonRewardLocal, не трогает инвентарь/сервер — только смотрит и,
// при необходимости, передаёт управление наружу (onClaim/onNeedPass).
// ════════════════════════════════════════════════════════════════════════════
import React, { useMemo } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { pearlIconForTheme } from '../app/coin_icons';
import type { SeasonReward } from '../app/season_pass_track_config';
import { SEASON_MODAL_COPY, renderSeasonRewardArt, type Tri } from './SeasonGiftModal';

export type SeasonRewardCardStatus = 'claimable' | 'claimed' | 'locked' | 'upcoming';

/**
 * Описания-ВИТРИНЫ: что награда сделает, если её получить.
 *
 * зачем 2026-08-04: SEASON_MODAL_COPY.desc написан для момента ВЫДАЧИ и говорит
 * в прошедшем времени — «Уже на твоём балансе», «Заряд ждёт своего часа»,
 * «Полный доступ Plus — уже включено». В клейм-модалке это правда. Но эта
 * модалка открывается и на НЕЗАРАБОТАННОЙ карточке, и там тот же текст врёт:
 * игрок ничего не получил, а интерфейс уверяет, что жемчужины уже начислены.
 * Поэтому у витрины свой текст в будущем времени — тон тот же, обещание честное.
 * Награды, чей desc и так нейтрален (описывает эффект, а не факт выдачи),
 * здесь не дублируются: fallback ниже берёт исходный desc.
 */
const PREVIEW_DESC: Partial<Record<SeasonReward['kind'], Tri>> = {
  pearls: {
    ru: 'Упадут на баланс — потратишь в магазине и на бусты.',
    uk: 'Впадуть на баланс — витратиш у магазині та на бусти.',
    es: 'Irán a tu saldo: para la tienda y los impulsos.',
    'pt-BR': 'Vão para o seu saldo — para a loja e impulsos.',
    vi: 'Sẽ vào số dư — dùng ở cửa hàng và tăng tốc.',
    id: 'Akan masuk saldo — buat toko dan boost.',
    tr: 'Bakiyene eklenecek — mağaza ve destekler için.',
    pl: 'Trafią na konto — na sklep i boosty.',
  },
  golden_lesson: {
    ru: 'Один урок принесёт ×3 опыта. Выбирать будешь с умом.',
    uk: 'Один урок принесе ×3 досвіду. Обиратимеш з розумом.',
    es: 'Una lección dará ×3 XP. Habrá que elegir bien.',
    'pt-BR': 'Uma lição dará ×3 XP. Vai ter que escolher bem.',
    vi: 'Một bài học sẽ cho ×3 XP. Chọn kỹ nhé.',
    id: 'Satu pelajaran memberi ×3 XP. Pilih baik-baik.',
    tr: 'Bir ders ×3 XP verecek. İyi seçmek gerek.',
    pl: 'Jedna lekcja da ×3 XP. Trzeba wybrać mądrze.',
  },
  plus_days: {
    ru: 'Включит полный Plus: безлимит энергии и всё остальное.',
    uk: 'Увімкне повний Plus: безліміт енергії і все інше.',
    es: 'Activará Plus completo: energía ilimitada y más.',
    'pt-BR': 'Ativará o Plus completo: energia ilimitada e mais.',
    vi: 'Sẽ bật Plus đầy đủ: năng lượng không giới hạn.',
    id: 'Akan mengaktifkan Plus penuh: energi tanpa batas.',
    tr: 'Tam Plus açacak: sınırsız enerji.',
    pl: 'Włączy pełny Plus: nielimitowana energia.',
  },
  frame: {
    ru: 'Сезонное оформление всей карточки профиля — останется навсегда.',
    uk: 'Сезонне оформлення всієї картки профілю — лишиться назавжди.',
    es: 'Diseño de temporada para tu tarjeta: tuyo para siempre.',
    'pt-BR': 'Visual de temporada para o seu cartão: seu para sempre.',
    vi: 'Thiết kế mùa cho thẻ hồ sơ — giữ mãi mãi.',
    id: 'Tampilan musim untuk kartu profil — selamanya milikmu.',
    tr: 'Kartın için sezon tasarımı — sonsuza dek senin.',
    pl: 'Sezonowy wygląd karty profilu — zostanie na zawsze.',
  },
  card_pack: {
    ru: 'Откроет фирменный набор «Peaky Blinders» — навсегда.',
    uk: 'Відкриє фірмовий набір «Peaky Blinders» — назавжди.',
    es: 'Desbloqueará el set «Peaky Blinders» para siempre.',
    'pt-BR': 'Desbloqueará o pacote «Peaky Blinders» para sempre.',
    vi: 'Sẽ mở khóa bộ «Peaky Blinders» vĩnh viễn.',
    id: 'Akan membuka paket «Peaky Blinders» selamanya.',
    tr: '«Peaky Blinders» paketini sonsuza dek açacak.',
    pl: 'Odblokuje zestaw «Peaky Blinders» na zawsze.',
  },
  custom_avatar: {
    ru: 'Добавит новый стиль в твою коллекцию аватаров.',
    uk: 'Додасть новий стиль до твоєї колекції аватарів.',
    es: 'Añadirá un nuevo estilo a tu colección de avatares.',
    'pt-BR': 'Adicionará um novo estilo à sua coleção de avatares.',
    vi: 'Sẽ thêm kiểu mới vào bộ sưu tập avatar.',
    id: 'Akan menambah gaya baru ke koleksi avatarmu.',
    tr: 'Avatar koleksiyonuna yeni bir stil ekleyecek.',
    pl: 'Doda nowy styl do kolekcji awatarów.',
  },
  aura_stage: {
    ru: 'Откроет новую стадию свечения — носить можно любую из открытых.',
    uk: 'Відкриє нову стадію світіння — носити можна будь-яку з відкритих.',
    es: 'Abrirá una nueva etapa de brillo: llevarás la que quieras.',
    'pt-BR': 'Abrirá um novo estágio de brilho: use o que quiser.',
    vi: 'Sẽ mở cấp hào quang mới — đeo cấp nào tùy bạn.',
    id: 'Akan membuka tahap aura baru — pakai yang mana saja.',
    tr: 'Yeni bir aura aşaması açacak — istediğini takarsın.',
    pl: 'Otworzy nowy etap aury — nosisz dowolny odblokowany.',
  },
};

interface Props {
  visible: boolean;
  reward: SeasonReward | null;
  level: number;
  side: 'free' | 'pass';
  status: SeasonRewardCardStatus;
  onClose: () => void;
  /** Вызывается ТОЛЬКО когда status === 'claimable' и юзер нажал «Забрать». */
  onClaim: (reward: SeasonReward, level: number, side: 'free' | 'pass') => void;
  /** Вызывается когда status === 'locked' и юзер нажал «Нужен пропуск». */
  onNeedPass: () => void;
}

export default function SeasonRewardInfoModal({ visible, reward, level, side, status, onClose, onClaim, onNeedPass }: Props) {
  const { theme: t, themeMode } = useTheme();
  const { lang } = useLang();
  const pearlIcon = pearlIconForTheme(themeMode);

  const art = useMemo(
    () => renderSeasonRewardArt(reward, themeMode, t, pearlIcon),
    [pearlIcon, reward, t, themeMode],
  );

  if (!reward) return null;
  const copy = SEASON_MODAL_COPY[reward.kind];

  const onPrimaryAction = () => {
    hapticTap();
    if (status === 'claimable') { onClaim(reward, level, side); return; }
    if (status === 'locked') { onNeedPass(); return; }
    onClose();
  };
  const onDismiss = () => { hapticTap(); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <View style={{ width: '100%', maxWidth: 370, borderRadius: 26, backgroundColor: t.bgCard, padding: 24, alignItems: 'center', gap: 14 }}>

          <View style={{ minHeight: 116, alignItems: 'center', justifyContent: 'center' }}>
            {art}
          </View>

          <Text style={{ color: t.textPrimary, fontSize: 19, fontWeight: '900', textAlign: 'center' }}>
            {triLang(lang, copy.title)}
          </Text>

          {/* Уже забранную награду описываем как факт (copy.desc — «уже на
              балансе»), ещё не полученную — как обещание (PREVIEW_DESC). */}
          <Text style={{ color: t.textSecond, fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 20 }}>
            {triLang(lang, status === 'claimed' ? copy.desc : (PREVIEW_DESC[reward.kind] ?? copy.desc))}
          </Text>

          {status === 'claimed' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="checkmark-circle" size={16} color={t.gold} />
              <Text style={{ color: t.gold, fontSize: 13, fontWeight: '800' }}>
                {triLang(lang, {
                  ru: 'Уже забрано', uk: 'Вже забрано', es: 'Ya reclamado', 'pt-BR': 'Já resgatado',
                  vi: 'Đã nhận', id: 'Sudah diambil', tr: 'Zaten alındı', pl: 'Już odebrane',
                })}
              </Text>
            </View>
          )}

          {status === 'upcoming' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="lock-closed-outline" size={14} color={t.textMuted} />
              <Text /* guard-ok: самостоятельный статус-индикатор доступности («когда откроется»), не подпись-расшифровка под заголовком модалки — тот же паттерн, что и блок «Уже забрано» чуть выше */ style={{ color: t.textMuted, fontSize: 13, fontWeight: '700' }}>
                {triLang(lang, {
                  ru: `Откроется на уровне ${level}`, uk: `Відкриється на рівні ${level}`, es: `Se abre en el nivel ${level}`,
                  'pt-BR': `Abre no nível ${level}`, vi: `Mở khóa ở cấp ${level}`, id: `Terbuka di level ${level}`,
                  tr: `Seviye ${level}'de açılır`, pl: `Odblokuje się na poziomie ${level}`,
                })}
              </Text>
            </View>
          )}

          {status === 'claimable' ? (
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity
                testID="season-reward-info-later"
                activeOpacity={0.85}
                onPress={onDismiss}
                accessibilityRole="button"
                style={{ flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: t.bgSurface }}
              >
                <Text style={{ color: t.textPrimary, fontSize: 15, fontWeight: '800' }}>
                  {triLang(lang, { ru: 'Позже', uk: 'Пізніше', es: 'Más tarde', 'pt-BR': 'Mais tarde', vi: 'Để sau', id: 'Nanti', tr: 'Daha sonra', pl: 'Później' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="season-reward-info-claim"
                activeOpacity={0.85}
                onPress={onPrimaryAction}
                accessibilityRole="button"
                style={{ flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: t.gold }}
              >
                <Text style={{ color: t.textOnGold, fontSize: 15, fontWeight: '900' }}>
                  {triLang(lang, { ru: 'Забрать', uk: 'Забрати', es: 'Reclamar', 'pt-BR': 'Resgatar', vi: 'Nhận', id: 'Ambil', tr: 'Al', pl: 'Odbierz' })}
                </Text>
              </TouchableOpacity>
            </View>
          ) : status === 'locked' ? (
            <TouchableOpacity
              testID="season-reward-info-need-pass"
              activeOpacity={0.85}
              onPress={onPrimaryAction}
              accessibilityRole="button"
              style={{ width: '100%', borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: t.gold }}
            >
              <Text style={{ color: t.textOnGold, fontSize: 15, fontWeight: '900' }}>
                {triLang(lang, {
                  ru: 'Нужен пропуск', uk: 'Потрібна перепустка', es: 'Necesitas el pase', 'pt-BR': 'Precisa do passe',
                  vi: 'Cần vé mùa', id: 'Butuh pass', tr: 'Bilet gerekli', pl: 'Potrzebna przepustka',
                })}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              testID="season-reward-info-close"
              activeOpacity={0.85}
              onPress={onDismiss}
              accessibilityRole="button"
              style={{ width: '100%', borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: t.bgSurface }}
            >
              <Text style={{ color: t.textPrimary, fontSize: 15, fontWeight: '800' }}>
                {triLang(lang, { ru: 'Понятно', uk: 'Зрозуміло', es: 'Entendido', 'pt-BR': 'Entendi', vi: 'Đã hiểu', id: 'Mengerti', tr: 'Anladım', pl: 'Rozumiem' })}
              </Text>
            </TouchableOpacity>
          )}

        </View>
      </View>
    </Modal>
  );
}
