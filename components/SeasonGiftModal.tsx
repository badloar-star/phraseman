// ════════════════════════════════════════════════════════════════════════════
// SeasonGiftModal.tsx — модалка получения подарка сезона. Два вида (владелец,
// 2026-08-03): расходник → «Использовать сейчас / В подарки»; статус →
// сразу видимое превью на профиле, без кнопки выбора (постоянная награда).
// Кнопки «Позже»/«Применить» — тот же паттерн, что components/LevelGiftModal.tsx
// (строки 648/719/959), но не переиспользует его компонент: там завязано на
// GiftDef из level_gift_system.ts (чужая занятая зона), здесь — SeasonReward.
// ════════════════════════════════════════════════════════════════════════════
import React, { useCallback, useState } from 'react';
import { Image, Modal, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { emitAppEvent, actionToastTri } from '../app/events';
import { pearlIconForTheme } from '../app/coin_icons';
import { markSeasonPassGiftUsed } from '../app/season_pass_gift_inventory';
import { resetEnergyToMax } from '../app/energy_system';
import { activateLeagueBoost } from '../app/league_personal_boosts';
import { applyTurboRegenOverride } from '../app/boons/boon_effects_energy';
import { SEASON_AURA_STAGE_ASSETS, SEASON_REWARD_ICONS, type SeasonReward } from '../app/season_pass_track_config';
import SeasonAuraRing from './SeasonAuraRing';

const STATUS_KINDS: ReadonlySet<SeasonReward['kind']> = new Set([
  'frame', 'aura_stage', 'nick_color', 'custom_avatar', 'card_pack', 'season_finale',
]);

/** Расходники с уже готовым немедленным эффектом; остальные (§0 каталога, 🟡/🔴) TODO. */
async function applyImmediateEffect(reward: SeasonReward): Promise<boolean> {
  switch (reward.kind) {
    case 'battery':
    case 'friend_battery':
      await resetEnergyToMax();
      return true;
    case 'turbo_regen':
      await applyTurboRegenOverride();
      return true;
    case 'league_boost':
      // 'x2_eod_pass' — очки лиги ×2 до ближайшей локальной полуночи (владелец,
      // каталог §1.2 «до конца дня»), длительность пересчитывается динамически
      // в activateLeagueBoost, costShards=0 (уже оплачено уровнем сезона).
      await activateLeagueBoost('x2_eod_pass');
      return true;
    default:
      return false;
  }
}

interface Props {
  visible: boolean;
  reward: SeasonReward | null;
  giftId: string | null;
  onClose: () => void;
}

export default function SeasonGiftModal({ visible, reward, giftId, onClose }: Props) {
  const { theme: t, themeMode } = useTheme();
  const { lang } = useLang();
  const [busy, setBusy] = useState(false);
  const pearlIcon = pearlIconForTheme(themeMode);

  const isStatus = reward ? STATUS_KINDS.has(reward.kind) : false;

  const onLater = useCallback(() => {
    hapticTap();
    onClose();
  }, [onClose]);

  const onApply = useCallback(async () => {
    if (!reward || !giftId || busy) return;
    hapticTap();
    setBusy(true);
    const applied = await applyImmediateEffect(reward);
    if (giftId) await markSeasonPassGiftUsed(giftId);
    setBusy(false);
    if (applied) {
      emitAppEvent('action_toast', actionToastTri('success', {
        ru: 'Применено', uk: 'Застосовано', es: 'Aplicado', 'pt-BR': 'Aplicado',
        vi: 'Đã áp dụng', id: 'Diterapkan', tr: 'Uygulandı', pl: 'Zastosowano',
      }));
    } else {
      // guard-ok: часть эффектов (§1 каталога, 🟡/🔴) ещё не написана — честный
      // тост вместо тихого no-op, предмет остаётся в «Подарках» для следующей попытки.
      emitAppEvent('action_toast', actionToastTri('info', {
        ru: 'Эта награда скоро заработает — предмет сохранён в «Подарках»',
        uk: 'Ця нагорода скоро запрацює — предмет збережено в «Подарунках»',
        es: 'Esta recompensa estará disponible pronto — guardada en «Regalos»',
        'pt-BR': 'Esta recompensa estará disponível em breve — salva em «Presentes»',
        vi: 'Phần thưởng này sẽ sớm hoạt động — đã lưu trong «Quà tặng»',
        id: 'Hadiah ini akan segera aktif — tersimpan di «Hadiah»',
        tr: 'Bu ödül yakında çalışacak — «Hediyeler»de saklandı',
        pl: 'Ta nagroda wkrótce zadziała — zapisana w «Prezentach»',
      }));
    }
    onClose();
  }, [busy, giftId, onClose, reward]);

  if (!reward) return null;

  const icon = reward.kind === 'aura_stage' || reward.kind === 'season_finale'
    ? SEASON_AURA_STAGE_ASSETS[reward.kind === 'season_finale' ? 3 : Math.max(0, Math.min(3, (reward.amount ?? 1) - 1))].source
    : SEASON_REWARD_ICONS[reward.kind];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <View style={{ width: '100%', maxWidth: 360, borderRadius: 24, backgroundColor: t.bgCard, padding: 24, alignItems: 'center', gap: 16 }}>
          <View style={{ width: 96, height: 96, alignItems: 'center', justifyContent: 'center' }}>
            {reward.kind === 'aura_stage' || reward.kind === 'season_finale'
              ? <SeasonAuraRing source={icon!} size={88} pulse spin={reward.kind === 'season_finale'} />
              : reward.kind === 'pearls'
                ? (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Image source={pearlIcon} style={{ width: 48, height: 48 }} resizeMode="contain" accessible={false} />
                    <Text style={{ color: t.textPrimary, fontSize: 28, fontWeight: '900' }}>{reward.amount}</Text>
                  </View>)
                : icon
                  ? <Image source={icon} style={{ width: 80, height: 80 }} resizeMode="contain" accessible={false} />
                  : null}
          </View>

          <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: '900', textAlign: 'center' }}>
            {triLang(lang, {
              ru: isStatus ? 'Награда сохранена в профиле' : 'Подарок получен',
              uk: isStatus ? 'Нагороду збережено в профілі' : 'Подарунок отримано',
              es: isStatus ? 'Recompensa guardada en el perfil' : 'Regalo recibido',
              'pt-BR': isStatus ? 'Recompensa salva no perfil' : 'Presente recebido',
              vi: isStatus ? 'Phần thưởng đã lưu vào hồ sơ' : 'Đã nhận quà',
              id: isStatus ? 'Hadiah tersimpan di profil' : 'Hadiah diterima',
              tr: isStatus ? 'Ödül profile kaydedildi' : 'Hediye alındı',
              pl: isStatus ? 'Nagroda zapisana w profilu' : 'Prezent odebrany',
            })}
          </Text>

          {isStatus ? (
            <TouchableOpacity
              testID="season-gift-modal-done"
              activeOpacity={0.85}
              onPress={onLater}
              accessibilityRole="button"
              style={{ width: '100%', borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: t.gold }}
            >
              <Text style={{ color: t.textOnGold, fontSize: 15, fontWeight: '900' }}>
                {triLang(lang, { ru: 'Отлично', uk: 'Чудово', es: 'Genial', 'pt-BR': 'Ótimo', vi: 'Tuyệt', id: 'Bagus', tr: 'Harika', pl: 'Świetnie' })}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity
                testID="season-gift-modal-later"
                activeOpacity={0.85}
                onPress={onLater}
                accessibilityRole="button"
                style={{ flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: t.bgSurface }}
              >
                <Text style={{ color: t.textPrimary, fontSize: 15, fontWeight: '800' }}>
                  {triLang(lang, { ru: 'Позже', uk: 'Пізніше', es: 'Más tarde', 'pt-BR': 'Mais tarde', vi: 'Để sau', id: 'Nanti', tr: 'Daha sonra', pl: 'Później' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="season-gift-modal-apply"
                activeOpacity={0.85}
                disabled={busy}
                onPress={onApply}
                accessibilityRole="button"
                accessibilityState={{ disabled: busy, busy }}
                style={{ flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: t.gold, opacity: busy ? 0.6 : 1 }}
              >
                <Text style={{ color: t.textOnGold, fontSize: 15, fontWeight: '900' }}>
                  {triLang(lang, { ru: 'Применить', uk: 'Застосувати', es: 'Aplicar', 'pt-BR': 'Usar', vi: 'Dùng', id: 'Pakai', tr: 'Kullan', pl: 'Użyj' })}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {!isStatus && (
            <Text /* guard-ok: предупреждение о сроке действия предмета (динамическое, как GiftExpiryCountdown), не подпись-расшифровка статичного названия */ style={{ color: t.textMuted, fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
              {triLang(lang, {
                ru: 'Сохранённый подарок сгорит через 72 часа',
                uk: 'Збережений подарунок згорить через 72 години',
                es: 'El regalo guardado caduca en 72 horas',
                'pt-BR': 'O presente salvo expira em 72 horas',
                vi: 'Quà đã lưu sẽ hết hạn sau 72 giờ',
                id: 'Hadiah tersimpan kedaluwarsa dalam 72 jam',
                tr: 'Kaydedilen hediye 72 saat sonra sona erer',
                pl: 'Zapisany prezent wygaśnie po 72 godzinach',
              })}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}
