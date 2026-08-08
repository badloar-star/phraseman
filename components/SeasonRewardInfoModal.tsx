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
import { SEASON_AURA_STAGE_NAMES, seasonAuraStageIndex, type SeasonReward } from '../app/season_pass_track_config';
import { seasonPassStarsToUnlockLevel } from '../app/season_pass_model';
import { SEASON_MODAL_COPY, renderSeasonRewardArt, type Tri } from './SeasonGiftModal';

export type SeasonRewardCardStatus = 'claimable' | 'claimed' | 'locked' | 'upcoming';

/**
 * Описания-ВИТРИНЫ: что награда сделает, если её получить.
 *
 * зачем 2026-08-04: после переписи SEASON_MODAL_COPY.desc на живой,
 * будущевременной тон («Звенят в кошельке, ждут своего магазина», «Красит ник
 * в бирюзу и вешает титул») он одинаково честен что в просмотре незаработанной
 * карточки, что до клейма — своего текста здесь больше не требуется, fallback
 * ниже всегда берёт SEASON_MODAL_COPY.desc. Карта пуста намеренно: как только
 * появится kind, чей desc снова станет говорить о свершившемся факте
 * («уже на счету», «титул присвоен»), сюда добавляется override в будущем
 * времени — тот же приём, что раньше был у pearls/nick_color.
 */
const PREVIEW_DESC: Partial<Record<SeasonReward['kind'], Tri>> = {};

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
  const starsToUnlock = seasonPassStarsToUnlockLevel(level);

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
            {/* зачем 2026-08-04 (владелец: «аура ... стадия ее надо название
                добавить»): copy.title у aura_stage один на все 4 стадии
                («Аура сезона») — просмотровая модалка не говорила, какая
                именно стадия открыта. Имя + номер — тот же текст, что и на
                плитке дорожки (season_pass.tsx) и в клейм-модалке. */}
            {reward.kind === 'aura_stage'
              ? `${SEASON_AURA_STAGE_NAMES[lang][seasonAuraStageIndex(reward.amount)]} ${['I', 'II', 'III', 'IV'][seasonAuraStageIndex(reward.amount)]}`
              : triLang(lang, copy.title)}
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
              <Ionicons name="star" size={14} color={t.textMuted} />
              {/* зачем 2026-08-04 (владелец: «исправь "откроется на уровне" на
                  нужно накопить звёзд, как в других игровых механиках»): номер
                  уровня ничего не говорил игроку — на карточке цена подарка уже
                  давно считается в звёздах (seasonPassStarsToUnlockLevel), эта
                  подсказка была последним местом, где ещё жил абстрактный
                  уровень вместо реальной цены. */}
              <Text /* guard-ok: самостоятельный статус-индикатор доступности («сколько ещё нужно»), не подпись-расшифровка под заголовком модалки — тот же паттерн, что и блок «Уже забрано» чуть выше */ style={{ color: t.textMuted, fontSize: 13, fontWeight: '700' }}>
                {triLang(lang, {
                  ru: `Нужно накопить ${starsToUnlock} ⭐`, uk: `Потрібно назбирати ${starsToUnlock} ⭐`, es: `Necesitas ${starsToUnlock} ⭐`,
                  'pt-BR': `Precisa juntar ${starsToUnlock} ⭐`, vi: `Cần tích ${starsToUnlock} ⭐`, id: `Perlu kumpulkan ${starsToUnlock} ⭐`,
                  tr: `${starsToUnlock} ⭐ toplaman gerekiyor`, pl: `Potrzebujesz ${starsToUnlock} ⭐`,
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
