import { useEffect, useState } from 'react';
import { triLang, type Lang } from '../../constants/i18n';

/**
 * Общие типы и хелперы статуса Лиги (арена, липкая карточка позиции).
 * Вынесено из LeagueHeroStatus при переходе на Концепцию B.
 */

export type LeagueHeroZone = 'promotion' | 'safe' | 'relegation';

export type LeagueHeroGap =
  | { kind: 'to_rank'; targetRank: number; xpNeeded: number; ratio: number }
  | { kind: 'leader'; xpAhead: number; ratio: number };

export function participantsLabel(lang: Lang, count: number): string {
  const n = Math.max(0, count);
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (lang === 'ru' || lang === 'uk') {
    const form = mod10 === 1 && mod100 !== 11 ? 0 : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 1 : 2;
    return `${n} ${(lang === 'ru' ? ['участник', 'участника', 'участников'] : ['учасник', 'учасники', 'учасників'])[form]}`;
  }
  if (lang === 'pl') {
    const form = n === 1 ? 0 : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 1 : 2;
    return `${n} ${['uczestnik', 'uczestnicy', 'uczestników'][form]}`;
  }
  return triLang(lang, {
    ru: `${n} участников`,
    uk: `${n} учасників`,
    en: `${n} participants`,
    es: `${n} participantes`,
    'pt-BR': `${n} participantes`,
    vi: `${n} người tham gia`,
    id: `${n} peserta`,
    tr: `${n} katılımcı`,
    pl: `${n} uczestników`,
  });
}

export function zoneLabel(zone: LeagueHeroZone, lang: Lang): string {
  if (zone === 'promotion') {
    return triLang(lang, { ru: '▲ Зона повышения', uk: '▲ Зона підвищення', en: '▲ Promotion zone', es: '▲ Zona de ascenso', 'pt-BR': '▲ Zona de promoção', vi: '▲ Vùng thăng hạng', id: '▲ Zona promosi', tr: '▲ Yükselme bölgesi', pl: '▲ Strefa awansu' });
  }
  if (zone === 'relegation') {
    return triLang(lang, { ru: '▼ Зона вылета', uk: '▼ Зона вильоту', en: '▼ Demotion zone', es: '▼ Zona de descenso', 'pt-BR': '▼ Zona de queda', vi: '▼ Vùng xuống hạng', id: '▼ Zona degradasi', tr: '▼ Düşme bölgesi', pl: '▼ Strefa spadku' });
  }
  return triLang(lang, { ru: 'Безопасная зона', uk: 'Безпечна зона', en: 'Safe zone', es: 'Zona segura', 'pt-BR': 'Zona segura', vi: 'Vùng an toàn', id: 'Zona aman', tr: 'Güvenli bölge', pl: 'Bezpieczna strefa' });
}

export function gapLabel(gap: LeagueHeroGap, lang: Lang): string {
  if (gap.kind === 'leader') {
    return triLang(lang, { ru: 'Вы лидируете', uk: 'Ви лідируєте', en: "You're leading", es: 'Lideras la semana', 'pt-BR': 'Você lidera', vi: 'Bạn đang dẫn đầu', id: 'Kamu memimpin', tr: 'Lidersin', pl: 'Prowadzisz' });
  }
  return triLang(lang, {
    ru: `До ${gap.targetRank}-го места`,
    uk: `До ${gap.targetRank}-го місця`,
    en: `To rank ${gap.targetRank}`,
    es: `Hasta el puesto ${gap.targetRank}`,
    'pt-BR': `Até o ${gap.targetRank}º lugar`,
    vi: `Tới hạng ${gap.targetRank}`,
    id: `Menuju peringkat ${gap.targetRank}`,
    tr: `${gap.targetRank}. sıraya`,
    pl: `Do ${gap.targetRank}. miejsca`,
  });
}

export function gapValue(gap: LeagueHeroGap, lang: Lang): string {
  if (gap.kind === 'leader') {
    return triLang(lang, {
      ru: `отрыв ${gap.xpAhead.toLocaleString()} XP`,
      uk: `відрив ${gap.xpAhead.toLocaleString()} XP`,
      en: `${gap.xpAhead.toLocaleString()} XP ahead`,
      es: `ventaja ${gap.xpAhead.toLocaleString()} XP`,
      'pt-BR': `vantagem ${gap.xpAhead.toLocaleString()} XP`,
      vi: `cách ${gap.xpAhead.toLocaleString()} XP`,
      id: `selisih ${gap.xpAhead.toLocaleString()} XP`,
      tr: `fark ${gap.xpAhead.toLocaleString()} XP`,
      pl: `przewaga ${gap.xpAhead.toLocaleString()} XP`,
    });
  }
  return `${gap.xpNeeded.toLocaleString()} XP`;
}

/** Конечный count-up 620мс (easeOutCubic), один прогон на смену значения. */
export function useCountUp(target: number, reduceMotion: boolean): number {
  const [value, setValue] = useState(reduceMotion ? target : 0);
  useEffect(() => {
    if (reduceMotion || target <= 0) {
      setValue(target);
      return undefined;
    }
    let raf = 0;
    const t0 = Date.now();
    const duration = 620;
    const tick = () => {
      const p = Math.min(1, (Date.now() - t0) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduceMotion]);
  return value;
}
