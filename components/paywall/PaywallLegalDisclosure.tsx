// ════════════════════════════════════════════════════════════════════════════
// PaywallLegalDisclosure.tsx — полная юр-плашка автопродления для A/B/C.
//
// Комплаенс: Apple App Store Review 3.1.2 и Google Play требуют рядом с покупкой
// раскрыть: длительность/цену периода, факт АВТОПРОДЛЕНИЯ, как и когда отменить
// (минимум за 24 часа до конца периода), и — при наличии бесплатного триала —
// что списание произойдёт после его окончания. Короткой строки под кнопкой
// (subLine) и ссылок Условия/Конфиденциальность для этого недостаточно.
//
// Текст OS-зависимый (Apple ID / Google Play). Цена и период подставляются из
// стора. «equivalent /month» — только сравнение, на это есть отдельная сноска.
// ════════════════════════════════════════════════════════════════════════════
import React from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';

import { triLang, type Lang } from '../../constants/i18n';
import type { PaywallChrome } from './paywallShared';

interface Props {
  lang: Lang;
  chrome: PaywallChrome;
  /** Цена выбранного плана (строка стора). Пустая → плашка не показывает сумму. */
  priceLabel: string;
  /** «/год» | «/мес» — период списания. */
  periodLabel: string;
  /** Есть ли бесплатная intro-фаза (тогда добавляем абзац про триал). */
  hasTrial: boolean;
  /** Длительность триала в днях (для текста). */
  trialDays?: number | null;
  /** lifetime — разовая покупка без автопродления: показываем другой текст. */
  isLifetime?: boolean;
}

export default function PaywallLegalDisclosure({
  lang, chrome, priceLabel, periodLabel, hasTrial, trialDays, isLifetime,
}: Props) {
  const { textMuted } = chrome;
  const ios = Platform.OS === 'ios';
  const store = ios ? 'App Store' : 'Google Play';
  const account = ios ? 'Apple ID' : 'Google';
  const manage = ios
    ? triLang(lang, {
        ru: 'Настройки → Apple ID → Подписки', uk: 'Налаштування → Apple ID → Підписки',
        es: 'Ajustes → Apple ID → Suscripciones', 'pt-BR': 'Ajustes → Apple ID → Assinaturas',
        vi: 'Cài đặt → Apple ID → Đăng ký', id: 'Pengaturan → Apple ID → Langganan',
        tr: 'Ayarlar → Apple ID → Abonelikler', pl: 'Ustawienia → Apple ID → Subskrypcje',
      })
    : triLang(lang, {
        ru: 'Google Play → Подписки', uk: 'Google Play → Підписки', es: 'Google Play → Suscripciones',
        'pt-BR': 'Google Play → Assinaturas', vi: 'Google Play → Đăng ký', id: 'Google Play → Langganan',
        tr: 'Google Play → Abonelikler', pl: 'Google Play → Subskrypcje',
      });

  // Phraseman Pro — разовая покупка без автопродления.
  if (isLifetime) {
    const txt = triLang(lang, {
      ru: `Phraseman Pro: разовая покупка ${priceLabel} через ${store}, без подписки и автопродления.`,
      uk: `Phraseman Pro: разова покупка ${priceLabel} через ${store}, без підписки й автопродовження.`,
      es: `Phraseman Pro: compra única de ${priceLabel} en ${store}, sin suscripción ni renovación automática.`,
      'pt-BR': `Phraseman Pro: compra única de ${priceLabel} na ${store}, sem assinatura nem renovação automática.`,
      vi: `Phraseman Pro: mua một lần ${priceLabel} qua ${store}, không đăng ký, không tự gia hạn.`,
      id: `Phraseman Pro: pembelian sekali ${priceLabel} via ${store}, tanpa langganan atau perpanjangan otomatis.`,
      tr: `Phraseman Pro: ${store} üzerinden tek seferlik ${priceLabel} satın alma, abonelik ve otomatik yenileme yok.`,
      pl: `Phraseman Pro: jednorazowy zakup ${priceLabel} przez ${store}, bez subskrypcji i automatycznego odnawiania.`,
    });
    return (
      <View style={S.wrap}>
        <Text style={[S.text, { color: textMuted }]}>{txt}</Text>
      </View>
    );
  }

  const base = triLang(lang, {
    ru: `Это подписка с автопродлением: ${priceLabel}${periodLabel}, списывается с твоего ${account} через ${store}. Подписка продлевается автоматически, пока ты не отменишь её минимум за 24 часа до конца текущего периода. Управлять и отменить: ${manage}.`,
    uk: `Це підписка з автопродовженням: ${priceLabel}${periodLabel}, списується з твого ${account} через ${store}. Підписка продовжується автоматично, поки ти не скасуєш її щонайменше за 24 години до кінця поточного періоду. Керувати й скасувати: ${manage}.`,
    es: `Es una suscripción con renovación automática: ${priceLabel}${periodLabel}, se cobra a tu ${account} mediante ${store}. Se renueva automáticamente salvo que la canceles al menos 24 horas antes del fin del periodo actual. Gestionar y cancelar: ${manage}.`,
    'pt-BR': `É uma assinatura com renovação automática: ${priceLabel}${periodLabel}, cobrada no seu ${account} via ${store}. Renova automaticamente, a menos que você cancele pelo menos 24 horas antes do fim do período atual. Gerenciar e cancelar: ${manage}.`,
    vi: `Đây là gói tự động gia hạn: ${priceLabel}${periodLabel}, tính vào ${account} của bạn qua ${store}. Gói tự gia hạn trừ khi bạn hủy ít nhất 24 giờ trước khi kết thúc kỳ hiện tại. Quản lý và hủy: ${manage}.`,
    id: `Ini langganan dengan perpanjangan otomatis: ${priceLabel}${periodLabel}, ditagih ke ${account} kamu via ${store}. Diperpanjang otomatis kecuali kamu batalkan minimal 24 jam sebelum periode berjalan berakhir. Kelola dan batalkan: ${manage}.`,
    tr: `Bu, otomatik yenilenen bir aboneliktir: ${priceLabel}${periodLabel}, ${store} üzerinden ${account} hesabından tahsil edilir. Mevcut dönem bitmeden en az 24 saat önce iptal etmezsen otomatik yenilenir. Yönet ve iptal et: ${manage}.`,
    pl: `To subskrypcja z automatycznym odnawianiem: ${priceLabel}${periodLabel}, pobierana z twojego ${account} przez ${store}. Odnawia się automatycznie, chyba że anulujesz co najmniej 24 godziny przed końcem bieżącego okresu. Zarządzaj i anuluj: ${manage}.`,
  });

  const trial = hasTrial
    ? ' ' + triLang(lang, {
        ru: `Если доступны ${trialDays ?? 3} дня бесплатно: оплата спишется только после окончания пробного периода, если не отменить заранее.`,
        uk: `Якщо доступні ${trialDays ?? 3} дні безкоштовно: оплата спишеться лише після завершення пробного періоду, якщо не скасувати заздалегідь.`,
        es: `Si hay ${trialDays ?? 3} días gratis: el cobro se realiza solo al finalizar la prueba, salvo que canceles antes.`,
        'pt-BR': `Se houver ${trialDays ?? 3} dias grátis: a cobrança ocorre só ao fim do teste, a menos que você cancele antes.`,
        vi: `Nếu có ${trialDays ?? 3} ngày miễn phí: chỉ bị tính phí sau khi hết dùng thử, trừ khi bạn hủy trước.`,
        id: `Jika ada ${trialDays ?? 3} hari gratis: penagihan baru terjadi setelah masa coba berakhir, kecuali kamu batalkan dulu.`,
        tr: `${trialDays ?? 3} gün ücretsiz varsa: ücret yalnızca deneme bittikten sonra, önceden iptal etmezsen alınır.`,
        pl: `Jeśli dostępne są ${trialDays ?? 3} dni za darmo: opłata nastąpi dopiero po zakończeniu okresu próbnego, o ile nie anulujesz wcześniej.`,
      })
    : '';

  if (!priceLabel) return null;

  return (
    <View style={S.wrap}>
      <Text style={[S.text, { color: textMuted }]}>{base}{trial}</Text>
    </View>
  );
}

const S = StyleSheet.create({
  wrap: { marginTop: 14, paddingHorizontal: 4 },
  text: { fontSize: 11.5, lineHeight: 16.5, textAlign: 'center', opacity: 0.72 },
});
