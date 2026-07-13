import type { Lang } from '../constants/i18n';
import type { PercentileSampleMeta } from './leaderboard_stats';
import type { RuntimeStudyTarget } from './target_storage_keys';

export type StatsInsightBlockKey = 'week' | 'longTerm' | 'comparison' | 'lifetime';

export interface StatsInsightObservation {
  id: string;
  block: StatsInsightBlockKey;
  priority: number;
  facts: Array<string | number>;
  allowedClaim: string;
  allowedAction: string | null;
  fallback: Record<Lang, string>;
}

export interface StatsInsightAnalysis {
  fingerprint: string;
  blocks: Record<StatsInsightBlockKey, StatsInsightObservation>;
  generatedFromCompleteSnapshot: true;
}

export interface StatsInsightSelectionPolicy {
  preferredObservationIds?: readonly string[];
  previousObservationIds?: readonly string[];
}

/**
 * Complete, already joined stats input used by both deterministic fallback copy and
 * the later server request. `dailyMinutes7` is an array (rather than TypeScript's
 * misleading `number[7]`, which means a one-item tuple); normalization enforces
 * exactly seven finite, non-negative entries without mutating the caller's value.
 */
export interface StatsInsightsSnapshot {
  lang: Lang;
  studyTarget: RuntimeStudyTarget;
  week: {
    activeDays7: number;
    minutes7: number;
    xp7: number;
    previousMinutes7: number | null;
    bestDayLabel: string | null;
    dailyMinutes7: number[];
  };
  longTerm: {
    activeDays365: number;
    currentStreak: number;
    longestStreak: number;
    bestMonthLabel: string | null;
    last30ActiveDays: number;
    previous30ActiveDays: number | null;
    goalPct: number;
  };
  comparison: {
    sample: PercentileSampleMeta;
    totalXpPercentile: number | null;
    daily7XpPercentile: number | null;
    daily7TimePercentile: number | null;
  };
  lifetime: {
    words: number;
    phrases: number;
    quizzes: number;
    arenaWins: number;
    daysActive: number;
  };
  weakCategories: Array<{ label: string; pct: number }>;
}

type Localized = Record<Lang, string>;
type Candidate = StatsInsightObservation;

const localized = (copy: Localized): Localized => copy;

const INCOMPLETE_SNAPSHOT_ERROR = 'stats_insights_incomplete_snapshot';

const incompleteSnapshot = (): never => {
  throw new Error(INCOMPLETE_SNAPSHOT_ERROR);
};

const count = (value: unknown, max = 1_000_000_000): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max) {
    return incompleteSnapshot();
  }
  return Math.round(value);
};

const nullableCount = (value: unknown, max = 1_000_000_000): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max) return null;
  return Math.round(value);
};

const percentile = (value: unknown): number | null => {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 99) {
    return incompleteSnapshot();
  }
  return Math.round(value);
};

const shortText = (value: unknown, max = 80): string | null => {
  if (typeof value !== 'string') return null;
  const clean = value.replace(/\s+/g, ' ').trim().slice(0, max).trim();
  return clean || null;
};

const normalize = (input: StatsInsightsSnapshot) => {
  if (!input || typeof input !== 'object' || !input.week || !input.longTerm || !input.comparison
    || !input.comparison.sample || !input.lifetime) {
    return incompleteSnapshot();
  }
  if (!(['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as readonly unknown[]).includes(input.lang)) {
    return incompleteSnapshot();
  }
  if (input.studyTarget !== 'en' && input.studyTarget !== 'fr') return incompleteSnapshot();

  const rawDays = input.week.dailyMinutes7;
  if (!Array.isArray(rawDays) || rawDays.length !== 7) return incompleteSnapshot();
  const dailyMinutes7 = rawDays.map((minutes) => count(minutes));
  const sample = input.comparison.sample;
  const status = sample.status;
  if (status !== 'available' && status !== 'below_sample_floor' && status !== 'unavailable') {
    return incompleteSnapshot();
  }
  if (typeof sample.isStale !== 'boolean') return incompleteSnapshot();

  const weakCategories = (Array.isArray(input.weakCategories) ? input.weakCategories : [])
    .map((category) => {
      const label = shortText(category?.label);
      const pct = category?.pct;
      if (!label || typeof pct !== 'number' || !Number.isFinite(pct) || pct < 0 || pct > 100) return null;
      return { label, pct: Math.round(pct) };
    })
    .filter((category): category is { label: string; pct: number } => category !== null)
    .slice(0, 3);

  return {
    lang: input.lang,
    studyTarget: shortText(input.studyTarget, 30),
    week: {
      activeDays7: count(input.week.activeDays7, 7),
      minutes7: count(input.week.minutes7),
      xp7: count(input.week.xp7),
      previousMinutes7: nullableCount(input.week.previousMinutes7),
      bestDayLabel: shortText(input.week.bestDayLabel),
      dailyMinutes7,
      hasSevenMeasuredDays: true,
    },
    longTerm: {
      activeDays365: count(input.longTerm.activeDays365, 365),
      currentStreak: count(input.longTerm.currentStreak, 365_000),
      longestStreak: count(input.longTerm.longestStreak, 365_000),
      bestMonthLabel: shortText(input.longTerm.bestMonthLabel),
      last30ActiveDays: count(input.longTerm.last30ActiveDays, 30),
      previous30ActiveDays: nullableCount(input.longTerm.previous30ActiveDays, 30),
      goalPct: count(input.longTerm.goalPct, 100),
    },
    comparison: {
      sample: {
        status,
        userTotalXp: count(sample.userTotalXp),
        minimumSampleXp: count(sample.minimumSampleXp),
        totalUsers: count(sample.totalUsers),
        updatedAtMs: nullableCount(sample.updatedAtMs, Number.MAX_SAFE_INTEGER),
        isStale: sample.isStale === true,
      },
      totalXpPercentile: percentile(input.comparison.totalXpPercentile),
      daily7XpPercentile: percentile(input.comparison.daily7XpPercentile),
      daily7TimePercentile: percentile(input.comparison.daily7TimePercentile),
    },
    lifetime: {
      words: count(input.lifetime.words),
      phrases: count(input.lifetime.phrases),
      quizzes: count(input.lifetime.quizzes),
      arenaWins: count(input.lifetime.arenaWins),
      daysActive: count(input.lifetime.daysActive),
    },
    weakCategories,
  };
};

type Normalized = ReturnType<typeof normalize>;

const candidate = (
  block: StatsInsightBlockKey,
  id: string,
  priority: number,
  facts: Array<string | number>,
  allowedClaim: string,
  allowedAction: string | null,
  fallback: Localized,
): Candidate => ({ id: `${block}.${id}`, block, priority, facts, allowedClaim, allowedAction, fallback });

const meaningfulChange = (current: number, previous: number, minimumAbsolute: number): boolean => {
  const difference = Math.abs(current - previous);
  if (difference < minimumAbsolute) return false;
  if (previous === 0) return current > 0;
  return difference / previous >= 0.15;
};

const weekCandidates = (s: Normalized): Candidate[] => {
  const w = s.week;
  const result: Candidate[] = [];
  if (w.previousMinutes7 !== null && meaningfulChange(w.minutes7, w.previousMinutes7, 5)) {
    const up = w.minutes7 > w.previousMinutes7;
    result.push(candidate('week', `minutes-trend-${up ? 'up' : 'down'}`, 500,
      [w.minutes7, w.previousMinutes7],
      `The verified seven-day study time ${up ? 'increased' : 'decreased'} from the previous seven-day period; cite only the two supplied minute totals.`,
      up ? 'Keep the study rhythm that produced this increase.' : 'Choose one manageable session to rebuild the weekly rhythm.',
      localized({
        ru: `За 7 дней — ${w.minutes7} мин против ${w.previousMinutes7} мин ранее. ${up ? 'Ритм вырос — его стоит сохранить.' : 'Темп снизился; один посильный урок поможет вернуться в ритм.'}`,
        uk: `За 7 днів — ${w.minutes7} хв проти ${w.previousMinutes7} хв раніше. ${up ? 'Ритм зріс — його варто зберегти.' : 'Темп знизився; одне посильне заняття допоможе повернутися до ритму.'}`,
        es: `En 7 días: ${w.minutes7} min frente a ${w.previousMinutes7} min antes. ${up ? 'El ritmo creció; conviene mantenerlo.' : 'El ritmo bajó; una sesión asequible puede ayudar a recuperarlo.'}`,
        'pt-BR': `Em 7 dias: ${w.minutes7} min contra ${w.previousMinutes7} min antes. ${up ? 'O ritmo cresceu; vale mantê-lo.' : 'O ritmo caiu; uma sessão possível pode ajudar a retomá-lo.'}`,
        vi: `Trong 7 ngày: ${w.minutes7} phút, so với ${w.previousMinutes7} phút trước đó. ${up ? 'Nhịp học đã tăng; hãy duy trì.' : 'Nhịp học đã giảm; một buổi học vừa sức có thể giúp lấy lại đà.'}`,
        id: `Dalam 7 hari: ${w.minutes7} menit, sebelumnya ${w.previousMinutes7} menit. ${up ? 'Ritmenya meningkat; pertahankan.' : 'Ritmenya menurun; satu sesi ringan dapat membantu memulihkannya.'}`,
        tr: `7 günde ${w.minutes7} dk; önceki dönemde ${w.previousMinutes7} dk. ${up ? 'Ritim yükseldi; bunu korumaya değer.' : 'Tempo düştü; yapılabilir tek bir çalışma ritmi geri getirebilir.'}`,
        pl: `W 7 dni: ${w.minutes7} min wobec wcześniejszych ${w.previousMinutes7} min. ${up ? 'Rytm wzrósł — warto go utrzymać.' : 'Tempo spadło; jedna osiągalna sesja pomoże wrócić do rytmu.'}`,
      })));
  }

  if (w.hasSevenMeasuredDays) {
    const measuredActive = w.dailyMinutes7.filter((minutes) => minutes > 0).length;
    if (measuredActive > 0) {
      const consistent = measuredActive >= 4;
      result.push(candidate('week', `measured-${consistent ? 'consistency' : 'spread'}`, 400,
        [measuredActive, 7],
        consistent ? 'Activity was verified on the stated number of the seven measured days.' : 'Activity was concentrated in the stated number of the seven measured days.',
        consistent ? 'Repeat the established distribution across the week.' : 'Add one short session on another day if that feels sustainable.',
        localized({
          ru: consistent ? `Активность есть в ${measuredActive} из 7 измеренных дней — это устойчивый недельный ритм.` : `Занятия пришлись на ${measuredActive} из 7 измеренных дней. Короткая сессия в другой день сделает ритм ровнее.`,
          uk: consistent ? `Активність є у ${measuredActive} із 7 виміряних днів — це сталий тижневий ритм.` : `Заняття припали на ${measuredActive} із 7 виміряних днів. Коротка сесія в інший день зробить ритм рівнішим.`,
          es: consistent ? `Hubo actividad en ${measuredActive} de 7 días medidos: es un ritmo semanal estable.` : `La actividad se concentró en ${measuredActive} de 7 días medidos. Una sesión breve otro día repartiría mejor el ritmo.`,
          'pt-BR': consistent ? `Houve atividade em ${measuredActive} de 7 dias medidos: um ritmo semanal estável.` : `A atividade ficou em ${measuredActive} de 7 dias medidos. Uma sessão curta em outro dia deixaria o ritmo mais regular.`,
          vi: consistent ? `Có hoạt động trong ${measuredActive}/7 ngày được đo — đây là nhịp học tuần ổn định.` : `Hoạt động tập trung trong ${measuredActive}/7 ngày được đo. Thêm một buổi ngắn vào ngày khác sẽ giúp nhịp đều hơn.`,
          id: consistent ? `Ada aktivitas pada ${measuredActive} dari 7 hari terukur—ritme mingguan yang stabil.` : `Aktivitas terkumpul pada ${measuredActive} dari 7 hari terukur. Satu sesi singkat di hari lain akan meratakan ritme.`,
          tr: consistent ? `Ölçülen 7 günün ${measuredActive} gününde etkinlik var; bu istikrarlı bir haftalık ritim.` : `Etkinlik, ölçülen 7 günün ${measuredActive} gününde toplandı. Başka bir güne kısa bir çalışma eklemek ritmi dengeler.`,
          pl: consistent ? `Aktywność była w ${measuredActive} z 7 zmierzonych dni — to stabilny rytm tygodnia.` : `Nauka skupiła się w ${measuredActive} z 7 zmierzonych dni. Krótka sesja w innym dniu wyrówna rytm.`,
        })));
    }
  }

  if (w.bestDayLabel && w.minutes7 > 0 && w.activeDays7 > 0) {
    result.push(candidate('week', 'best-day', 300, [w.bestDayLabel],
      'This label identifies the verified most active day in the current seven-day period; do not infer its numeric duration.',
      'Use the strongest day as a practical anchor for another session.',
      localized({
        ru: `${w.bestDayLabel} — самый активный день этой недели. Его можно использовать как опору для следующего занятия.`,
        uk: `${w.bestDayLabel} — найактивніший день цього тижня. Його можна використати як опору для наступного заняття.`,
        es: `${w.bestDayLabel} fue el día más activo de esta semana. Puede servir como punto de apoyo para la próxima sesión.`,
        'pt-BR': `${w.bestDayLabel} foi o dia mais ativo desta semana. Ele pode servir de apoio para a próxima sessão.`,
        vi: `${w.bestDayLabel} là ngày hoạt động nhiều nhất tuần này. Có thể dùng ngày đó làm điểm tựa cho buổi học tiếp theo.`,
        id: `${w.bestDayLabel} adalah hari paling aktif minggu ini. Hari itu bisa menjadi pijakan untuk sesi berikutnya.`,
        tr: `${w.bestDayLabel} bu haftanın en aktif günüydü. Sonraki çalışma için dayanak olabilir.`,
        pl: `${w.bestDayLabel} to najbardziej aktywny dzień tego tygodnia. Może być punktem odniesienia dla kolejnej sesji.`,
      })));
  }

  result.push(candidate('week', w.minutes7 > 0 || w.xp7 > 0 ? 'verified-summary' : 'first-activity', 100,
    [w.activeDays7, w.minutes7, w.xp7],
    'Summarize only the verified current-week active-day, minute, and XP totals; no prior-period direction is known.',
    w.minutes7 > 0 || w.xp7 > 0 ? 'Continue with one realistic next session.' : 'Start with one short first session.',
    localized({
      ru: w.minutes7 > 0 || w.xp7 > 0 ? `За неделю: ${w.activeDays7} активных дней, ${w.minutes7} мин и ${w.xp7} XP. Это проверенная точка отсчёта без сравнения с прошлой неделей.` : 'За эту неделю активности пока нет. Первый короткий урок создаст честную точку отсчёта.',
      uk: w.minutes7 > 0 || w.xp7 > 0 ? `За тиждень: ${w.activeDays7} активних днів, ${w.minutes7} хв і ${w.xp7} XP. Це перевірена точка відліку без порівняння з минулим тижнем.` : 'Цього тижня активності поки немає. Перше коротке заняття створить чесну точку відліку.',
      es: w.minutes7 > 0 || w.xp7 > 0 ? `Esta semana: ${w.activeDays7} días activos, ${w.minutes7} min y ${w.xp7} XP. Es una referencia verificada, sin compararla con la semana anterior.` : 'Esta semana aún no hay actividad. Una primera sesión corta creará un punto de partida real.',
      'pt-BR': w.minutes7 > 0 || w.xp7 > 0 ? `Nesta semana: ${w.activeDays7} dias ativos, ${w.minutes7} min e ${w.xp7} XP. É uma referência verificada, sem comparação com a semana anterior.` : 'Ainda não há atividade nesta semana. Uma primeira sessão curta criará um ponto de partida real.',
      vi: w.minutes7 > 0 || w.xp7 > 0 ? `Tuần này: ${w.activeDays7} ngày hoạt động, ${w.minutes7} phút và ${w.xp7} XP. Đây là mốc đã xác minh, chưa so với tuần trước.` : 'Tuần này chưa có hoạt động. Một buổi học ngắn đầu tiên sẽ tạo mốc khởi đầu thực tế.',
      id: w.minutes7 > 0 || w.xp7 > 0 ? `Minggu ini: ${w.activeDays7} hari aktif, ${w.minutes7} menit, dan ${w.xp7} XP. Ini titik acuan terverifikasi tanpa perbandingan minggu lalu.` : 'Minggu ini belum ada aktivitas. Sesi singkat pertama akan membuat titik awal yang nyata.',
      tr: w.minutes7 > 0 || w.xp7 > 0 ? `Bu hafta: ${w.activeDays7} aktif gün, ${w.minutes7} dk ve ${w.xp7} XP. Bu, geçen haftayla kıyaslanmamış doğrulanmış bir başlangıç noktasıdır.` : 'Bu hafta henüz etkinlik yok. İlk kısa çalışma gerçek bir başlangıç noktası oluşturur.',
      pl: w.minutes7 > 0 || w.xp7 > 0 ? `Ten tydzień: ${w.activeDays7} aktywne dni, ${w.minutes7} min i ${w.xp7} XP. To zweryfikowany punkt odniesienia bez porównania z poprzednim tygodniem.` : 'W tym tygodniu nie ma jeszcze aktywności. Pierwsza krótka sesja stworzy rzetelny punkt wyjścia.',
    })));
  return result;
};

const longTermCandidates = (s: Normalized): Candidate[] => {
  const l = s.longTerm;
  const result: Candidate[] = [];
  if (l.previous30ActiveDays !== null && meaningfulChange(l.last30ActiveDays, l.previous30ActiveDays, 2)) {
    const up = l.last30ActiveDays > l.previous30ActiveDays;
    result.push(candidate('longTerm', `active-days-trend-${up ? 'up' : 'down'}`, 500,
      [l.last30ActiveDays, l.previous30ActiveDays],
      `Verified active-day count ${up ? 'increased' : 'decreased'} between the latest and previous 30-day periods.`,
      up ? 'Protect the routine that supported the increase.' : 'Pick a sustainable day for the next return.',
      localized({
        ru: `За последние 30 дней — ${l.last30ActiveDays} активных дней против ${l.previous30ActiveDays} ранее. ${up ? 'Регулярность выросла.' : 'Регулярность снизилась; лучше начать с достижимого дня.'}`,
        uk: `За останні 30 днів — ${l.last30ActiveDays} активних днів проти ${l.previous30ActiveDays} раніше. ${up ? 'Регулярність зросла.' : 'Регулярність знизилась; краще почати з досяжного дня.'}`,
        es: `En los últimos 30 días hubo ${l.last30ActiveDays} días activos frente a ${l.previous30ActiveDays} antes. ${up ? 'La regularidad aumentó.' : 'La regularidad bajó; conviene volver con un día alcanzable.'}`,
        'pt-BR': `Nos últimos 30 dias houve ${l.last30ActiveDays} dias ativos contra ${l.previous30ActiveDays} antes. ${up ? 'A regularidade aumentou.' : 'A regularidade caiu; vale retomar com um dia possível.'}`,
        vi: `30 ngày gần nhất có ${l.last30ActiveDays} ngày hoạt động, trước đó là ${l.previous30ActiveDays}. ${up ? 'Độ đều đặn đã tăng.' : 'Độ đều đặn đã giảm; hãy trở lại bằng một ngày vừa sức.'}`,
        id: `Dalam 30 hari terakhir ada ${l.last30ActiveDays} hari aktif, sebelumnya ${l.previous30ActiveDays}. ${up ? 'Keteraturan meningkat.' : 'Keteraturan menurun; mulai kembali dengan satu hari yang realistis.'}`,
        tr: `Son 30 günde ${l.last30ActiveDays} aktif gün; önceki dönemde ${l.previous30ActiveDays}. ${up ? 'Düzenlilik arttı.' : 'Düzenlilik azaldı; ulaşılabilir tek bir günle dönmek iyi olur.'}`,
        pl: `W ostatnich 30 dniach było ${l.last30ActiveDays} aktywnych dni wobec wcześniejszych ${l.previous30ActiveDays}. ${up ? 'Regularność wzrosła.' : 'Regularność spadła; warto wrócić od osiągalnego dnia.'}`,
      })));
  }
  if (l.currentStreak > 0 || l.longestStreak > 0) {
    result.push(candidate('longTerm', l.currentStreak > 0 && l.currentStreak === l.longestStreak ? 'streak-record' : 'streak', 400,
      [l.currentStreak, l.longestStreak],
      'State only the verified current and longest streak lengths.',
      l.currentStreak > 0 ? 'A small session can protect the current streak.' : 'Use the personal record as evidence that consistency is achievable.',
      localized({
        ru: `Текущая серия — ${l.currentStreak} дней, личный рекорд — ${l.longestStreak}. ${l.currentStreak > 0 ? 'Небольшое занятие поможет сохранить ход.' : 'Рекорд показывает, что устойчивый ритм уже получался.'}`,
        uk: `Поточна серія — ${l.currentStreak} днів, особистий рекорд — ${l.longestStreak}. ${l.currentStreak > 0 ? 'Невелике заняття допоможе зберегти хід.' : 'Рекорд показує, що сталий ритм уже вдавався.'}`,
        es: `La racha actual es de ${l.currentStreak} días y el récord personal, de ${l.longestStreak}. ${l.currentStreak > 0 ? 'Una sesión pequeña puede mantenerla.' : 'El récord demuestra que ya lograste un ritmo constante.'}`,
        'pt-BR': `A sequência atual é de ${l.currentStreak} dias e o recorde pessoal, de ${l.longestStreak}. ${l.currentStreak > 0 ? 'Uma sessão pequena pode preservá-la.' : 'O recorde mostra que você já conseguiu um ritmo constante.'}`,
        vi: `Chuỗi hiện tại là ${l.currentStreak} ngày, kỷ lục cá nhân là ${l.longestStreak}. ${l.currentStreak > 0 ? 'Một buổi học nhỏ có thể giữ chuỗi.' : 'Kỷ lục cho thấy bạn từng duy trì được nhịp ổn định.'}`,
        id: `Rangkaian saat ini ${l.currentStreak} hari, rekor pribadi ${l.longestStreak}. ${l.currentStreak > 0 ? 'Sesi kecil dapat menjaganya.' : 'Rekor ini menunjukkan bahwa ritme stabil pernah tercapai.'}`,
        tr: `Mevcut seri ${l.currentStreak} gün, kişisel rekor ${l.longestStreak} gün. ${l.currentStreak > 0 ? 'Kısa bir çalışma seriyi koruyabilir.' : 'Bu rekor, istikrarlı ritmin daha önce kurulabildiğini gösteriyor.'}`,
        pl: `Obecna seria to ${l.currentStreak} dni, a rekord osobisty — ${l.longestStreak}. ${l.currentStreak > 0 ? 'Mała sesja pomoże ją utrzymać.' : 'Rekord pokazuje, że stabilny rytm był już możliwy.'}`,
      })));
  }
  if (l.bestMonthLabel) {
    result.push(candidate('longTerm', 'best-month', 300, [l.bestMonthLabel],
      'This label is the verified best month; do not infer a score or margin.',
      'Recall what made that month workable and reuse one element.',
      localized({
        ru: `${l.bestMonthLabel} — лучший подтверждённый месяц. Можно вспомнить, что тогда помогало заниматься, и повторить один элемент.`,
        uk: `${l.bestMonthLabel} — найкращий підтверджений місяць. Можна згадати, що тоді допомагало вчитися, і повторити один елемент.`,
        es: `${l.bestMonthLabel} es el mejor mes verificado. Vale recordar qué facilitó estudiar entonces y repetir un elemento.`,
        'pt-BR': `${l.bestMonthLabel} é o melhor mês verificado. Vale lembrar o que facilitou estudar naquele período e repetir um elemento.`,
        vi: `${l.bestMonthLabel} là tháng tốt nhất đã được xác minh. Hãy nhớ điều gì từng giúp việc học thuận lợi và lặp lại một yếu tố.`,
        id: `${l.bestMonthLabel} adalah bulan terbaik yang terverifikasi. Ingat hal yang membantu saat itu dan ulangi satu elemennya.`,
        tr: `${l.bestMonthLabel}, doğrulanmış en iyi ay. O dönemde çalışmayı kolaylaştıran bir şeyi yeniden kullanabilirsin.`,
        pl: `${l.bestMonthLabel} to najlepszy zweryfikowany miesiąc. Warto przypomnieć sobie, co wtedy pomagało, i powtórzyć jeden element.`,
      })));
  }
  result.push(candidate('longTerm', l.activeDays365 > 0 || l.goalPct > 0 ? 'year-goal-summary' : 'first-routine', 100,
    [l.activeDays365, l.goalPct],
    'Summarize only verified active days in the last year and verified goal completion; do not infer a trend.',
    l.activeDays365 > 0 ? 'Choose a realistic next active day.' : 'Begin building the long-term record with one session.',
    localized({
      ru: l.activeDays365 > 0 || l.goalPct > 0 ? `За год отмечено ${l.activeDays365} активных дней; цель выполнена на ${l.goalPct}%. Это текущий итог без вывода о динамике.` : 'Долгосрочная история пока начинается. Первое занятие положит начало личному ритму.',
      uk: l.activeDays365 > 0 || l.goalPct > 0 ? `За рік відзначено ${l.activeDays365} активних днів; ціль виконано на ${l.goalPct}%. Це поточний підсумок без висновку про динаміку.` : 'Довгострокова історія поки починається. Перше заняття започаткує особистий ритм.',
      es: l.activeDays365 > 0 || l.goalPct > 0 ? `En el año constan ${l.activeDays365} días activos y un ${l.goalPct}% de la meta. Es el estado actual, sin afirmar una tendencia.` : 'El historial a largo plazo acaba de empezar. La primera sesión iniciará tu propio ritmo.',
      'pt-BR': l.activeDays365 > 0 || l.goalPct > 0 ? `No ano há ${l.activeDays365} dias ativos e ${l.goalPct}% da meta concluída. É o estado atual, sem afirmar tendência.` : 'O histórico de longo prazo está começando. A primeira sessão dará início ao seu ritmo.',
      vi: l.activeDays365 > 0 || l.goalPct > 0 ? `Trong năm có ${l.activeDays365} ngày hoạt động và hoàn thành ${l.goalPct}% mục tiêu. Đây là kết quả hiện tại, không suy diễn xu hướng.` : 'Lịch sử dài hạn đang bắt đầu. Buổi học đầu tiên sẽ mở ra nhịp học riêng của bạn.',
      id: l.activeDays365 > 0 || l.goalPct > 0 ? `Dalam setahun tercatat ${l.activeDays365} hari aktif dan ${l.goalPct}% target tercapai. Ini kondisi saat ini, tanpa menyimpulkan tren.` : 'Riwayat jangka panjang baru dimulai. Sesi pertama akan memulai ritmemu sendiri.',
      tr: l.activeDays365 > 0 || l.goalPct > 0 ? `Yılda ${l.activeDays365} aktif gün ve hedefin %${l.goalPct} kadarı kaydedildi. Bu, eğilim yorumu içermeyen mevcut durumdur.` : 'Uzun vadeli geçmiş yeni başlıyor. İlk çalışma kendi ritmini başlatacak.',
      pl: l.activeDays365 > 0 || l.goalPct > 0 ? `W roku odnotowano ${l.activeDays365} aktywnych dni i ${l.goalPct}% realizacji celu. To stan obecny, bez wniosku o trendzie.` : 'Historia długoterminowa dopiero się zaczyna. Pierwsza sesja zapoczątkuje własny rytm.',
    })));
  return result;
};

const comparisonCandidates = (s: Normalized): Candidate[] => {
  const c = s.comparison;
  const sample = c.sample;
  if (sample.status === 'unavailable') {
    return [candidate('comparison', 'temporarily-unavailable', 100, [],
      'The cohort comparison is temporarily unavailable for system/sample reasons; never attribute this to insufficient user activity.', null,
      localized({
        ru: 'Сравнение с общей выборкой временно недоступно. Это не оценка твоего прогресса.',
        uk: 'Порівняння із загальною вибіркою тимчасово недоступне. Це не оцінка твого прогресу.',
        es: 'La comparación con la muestra general no está disponible temporalmente. No es una valoración de tu progreso.',
        'pt-BR': 'A comparação com a amostra geral está temporariamente indisponível. Isso não avalia seu progresso.',
        vi: 'So sánh với mẫu chung tạm thời không khả dụng. Đây không phải là đánh giá về tiến bộ của bạn.',
        id: 'Perbandingan dengan sampel umum sementara tidak tersedia. Ini bukan penilaian atas progresmu.',
        tr: 'Genel örneklemle karşılaştırma geçici olarak kullanılamıyor. Bu, ilerlemenin değerlendirmesi değildir.',
        pl: 'Porównanie z ogólną próbą jest chwilowo niedostępne. To nie jest ocena Twoich postępów.',
      }))];
  }
  if (sample.status === 'below_sample_floor') {
    const remaining = Math.max(0, sample.minimumSampleXp - sample.userTotalXp);
    return [candidate('comparison', 'below-sample-floor', 100,
      [sample.userTotalXp, sample.minimumSampleXp, remaining],
      'State exact current XP, comparison threshold, and remaining XP only; do not invent or imply a rank.',
      remaining > 0 ? 'Continue at a comfortable pace toward the verified comparison threshold.' : null,
      localized({
        ru: `Сейчас ${sample.userTotalXp} XP из ${sample.minimumSampleXp} XP, нужных для сравнения. До этого порога осталось ${remaining} XP.`,
        uk: `Зараз ${sample.userTotalXp} XP із ${sample.minimumSampleXp} XP, потрібних для порівняння. До цього порога залишилося ${remaining} XP.`,
        es: `Ahora tienes ${sample.userTotalXp} XP de los ${sample.minimumSampleXp} XP necesarios para comparar. Faltan ${remaining} XP para ese umbral.`,
        'pt-BR': `Agora você tem ${sample.userTotalXp} XP dos ${sample.minimumSampleXp} XP necessários para comparar. Faltam ${remaining} XP para esse limite.`,
        vi: `Hiện có ${sample.userTotalXp} XP trên ${sample.minimumSampleXp} XP cần để so sánh. Còn ${remaining} XP để đạt ngưỡng đó.`,
        id: `Saat ini ada ${sample.userTotalXp} XP dari ${sample.minimumSampleXp} XP yang diperlukan untuk perbandingan. Kurang ${remaining} XP untuk mencapai ambang itu.`,
        tr: `Karşılaştırma için gereken ${sample.minimumSampleXp} XP'nin ${sample.userTotalXp} XP'si var. Bu eşiğe ${remaining} XP kaldı.`,
        pl: `Masz teraz ${sample.userTotalXp} XP z ${sample.minimumSampleXp} XP potrzebnych do porównania. Do tego progu brakuje ${remaining} XP.`,
      }))];
  }

  const metrics = [
    { key: 'total XP', value: c.totalXpPercentile, labels: localized({ ru: 'общий XP', uk: 'загальний XP', es: 'XP total', 'pt-BR': 'XP total', vi: 'tổng XP', id: 'total XP', tr: 'toplam XP', pl: 'łączny XP' }) },
    { key: 'seven-day XP', value: c.daily7XpPercentile, labels: localized({ ru: 'XP за 7 дней', uk: 'XP за 7 днів', es: 'XP de 7 días', 'pt-BR': 'XP de 7 dias', vi: 'XP trong 7 ngày', id: 'XP 7 hari', tr: '7 günlük XP', pl: 'XP z 7 dni' }) },
    { key: 'seven-day study time', value: c.daily7TimePercentile, labels: localized({ ru: 'время занятий за 7 дней', uk: 'час занять за 7 днів', es: 'tiempo de estudio de 7 días', 'pt-BR': 'tempo de estudo de 7 dias', vi: 'thời gian học trong 7 ngày', id: 'waktu belajar 7 hari', tr: '7 günlük çalışma süresi', pl: 'czas nauki z 7 dni' }) },
  ].filter((metric): metric is { key: string; value: number; labels: Localized } => metric.value !== null);
  const best = [...metrics].sort((a, b) => b.value - a.value || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))[0];
  if (!best) {
    return [candidate('comparison', 'available-own-pace', 100, [sample.totalUsers],
      'The sample is available but no numeric percentile is verified; provide an own-pace line and no rank.',
      'Use personal history as the reliable reference until a numeric comparison is present.',
      localized({
        ru: 'Выборка доступна, но подтверждённого числового сравнения сейчас нет. Надёжнее ориентироваться на собственный ритм.',
        uk: 'Вибірка доступна, але підтвердженого числового порівняння зараз немає. Надійніше орієнтуватися на власний ритм.',
        es: 'La muestra está disponible, pero ahora no hay una comparación numérica verificada. Es más fiable seguir tu propio ritmo.',
        'pt-BR': 'A amostra está disponível, mas não há comparação numérica verificada agora. É mais confiável acompanhar seu próprio ritmo.',
        vi: 'Mẫu đã có, nhưng hiện chưa có so sánh số liệu được xác minh. Theo dõi nhịp riêng sẽ đáng tin cậy hơn.',
        id: 'Sampel tersedia, tetapi belum ada perbandingan angka yang terverifikasi. Lebih andal mengikuti ritmemu sendiri.',
        tr: 'Örneklem mevcut, ancak doğrulanmış sayısal karşılaştırma yok. Kendi ritmini izlemek daha güvenilir.',
        pl: 'Próba jest dostępna, ale nie ma teraz zweryfikowanego porównania liczbowego. Najpewniej śledzić własny rytm.',
      }))];
  }
  if (best.value < 50) {
    return [candidate('comparison', 'available-hidden-own-dynamics', 100, [sample.totalUsers],
      'A below-median percentile exists but is intentionally hidden; focus only on own dynamics and never claim insufficient data or state a rank.',
      'Use the verified personal-history observations to choose the next step.',
      localized({
        ru: 'Общая выборка доступна; здесь полезнее смотреть на собственную динамику и следующий достижимый шаг.',
        uk: 'Загальна вибірка доступна; тут корисніше дивитися на власну динаміку й наступний досяжний крок.',
        es: 'La muestra general está disponible; aquí resulta más útil mirar tu propia evolución y el siguiente paso alcanzable.',
        'pt-BR': 'A amostra geral está disponível; aqui é mais útil observar sua própria evolução e o próximo passo possível.',
        vi: 'Mẫu chung đã có; lúc này nên tập trung vào tiến bộ của chính bạn và bước tiếp theo vừa sức.',
        id: 'Sampel umum tersedia; di sini lebih berguna melihat perkembanganmu sendiri dan langkah berikutnya yang realistis.',
        tr: 'Genel örneklem mevcut; burada kendi gelişimine ve ulaşılabilir bir sonraki adıma odaklanmak daha yararlı.',
        pl: 'Ogólna próba jest dostępna; tutaj lepiej skupić się na własnej dynamice i kolejnym osiągalnym kroku.',
      }))];
  }

  const freshness = sample.isStale ? 'stored' : 'current';
  return [candidate('comparison', `verified-${best.key.replace(/\s+/g, '-')}`, 200,
    [best.key, best.labels[s.lang], best.value, sample.totalUsers, freshness],
    `The best verified available comparison is the supplied percentile for ${best.key}; describe it conservatively with sample size and ${freshness} freshness, without converting it into an exact leaderboard place.`, null,
    localized({
      ru: `Лучший доступный ориентир — ${best.value}-й процентиль по показателю «${best.labels.ru}» в выборке из ${sample.totalUsers} пользователей${sample.isStale ? '; данные сохранённые, не свежие' : ''}. Это ориентир, а не точное место.`,
      uk: `Найкращий доступний орієнтир — ${best.value}-й процентиль за показником «${best.labels.uk}» у вибірці з ${sample.totalUsers} користувачів${sample.isStale ? '; дані збережені, не свіжі' : ''}. Це орієнтир, а не точне місце.`,
      es: `La mejor referencia disponible es el percentil ${best.value} en «${best.labels.es}», dentro de una muestra de ${sample.totalUsers} usuarios${sample.isStale ? '; son datos guardados, no recientes' : ''}. Es una referencia, no un puesto exacto.`,
      'pt-BR': `A melhor referência disponível é o percentil ${best.value} em “${best.labels['pt-BR']}”, numa amostra de ${sample.totalUsers} usuários${sample.isStale ? '; os dados estão armazenados, não recentes' : ''}. É uma referência, não uma posição exata.`,
      vi: `Mốc tham khảo tốt nhất hiện có là phân vị ${best.value} ở “${best.labels.vi}”, trong mẫu ${sample.totalUsers} người dùng${sample.isStale ? '; đây là dữ liệu đã lưu, không phải dữ liệu mới' : ''}. Đây là mốc tham khảo, không phải vị trí chính xác.`,
      id: `Acuan terbaik yang tersedia adalah persentil ${best.value} untuk “${best.labels.id}”, pada sampel ${sample.totalUsers} pengguna${sample.isStale ? '; datanya tersimpan, bukan data terbaru' : ''}. Ini acuan, bukan posisi pasti.`,
      tr: `Mevcut en iyi gösterge, ${sample.totalUsers} kullanıcılık örnekte “${best.labels.tr}” için ${best.value}. yüzdelik dilimdir${sample.isStale ? '; veriler kayıtlıdır, güncel değildir' : ''}. Bu bir gösterge, kesin sıra değil.`,
      pl: `Najlepszy dostępny punkt odniesienia to ${best.value}. percentyl dla „${best.labels.pl}” w próbie ${sample.totalUsers} użytkowników${sample.isStale ? '; dane są zapisane, ale nie świeże' : ''}. To wskazówka, nie dokładne miejsce.`,
    }))];
};

const lifetimeCandidates = (s: Normalized): Candidate[] => {
  const result: Candidate[] = [];
  const weak = s.weakCategories[0];
  if (weak && weak.pct < 100) {
    result.push(candidate('lifetime', 'weak-category', 400, [weak.label, weak.pct],
      'This is one verified area for improvement and its exact percentage; do not claim it is the weakest area or diagnose a cause.',
      `Offer focused practice in ${weak.label} as an optional concrete next step.`,
      localized({
        ru: `Одна подтверждённая зона роста — «${weak.label}» (${weak.pct}%). Короткая целевая практика даст понятный следующий шаг.`,
        uk: `Одна підтверджена зона зростання — «${weak.label}» (${weak.pct}%). Коротка цільова практика дасть зрозумілий наступний крок.`,
        es: `Un área de mejora verificada es «${weak.label}» (${weak.pct}%). Una práctica breve y específica ofrece un siguiente paso claro.`,
        'pt-BR': `Uma área de melhoria verificada é “${weak.label}” (${weak.pct}%). Uma prática curta e específica oferece um próximo passo claro.`,
        vi: `Một mảng cải thiện đã được xác minh là “${weak.label}” (${weak.pct}%). Bài luyện ngắn, đúng trọng tâm sẽ tạo bước tiếp theo rõ ràng.`,
        id: `Satu area peningkatan yang terverifikasi adalah “${weak.label}” (${weak.pct}%). Latihan singkat dan terarah memberi langkah berikutnya yang jelas.`,
        tr: `Doğrulanmış bir gelişim alanı “${weak.label}” (%${weak.pct}). Kısa ve odaklı pratik net bir sonraki adım sunar.`,
        pl: `Jednym zweryfikowanym obszarem do poprawy jest „${weak.label}” (${weak.pct}%). Krótka, ukierunkowana praktyka daje jasny kolejny krok.`,
      })));
  }

  // Milestone levels are product-defined within each category. Raw counts from
  // unlike units are never compared; ties use an explicit, stable product order.
  const milestones = [
    { key: 'words', value: s.lifetime.words, thresholds: [1, 100, 500, 1000], productPriority: 5, labels: localized({ ru: 'изученные слова', uk: 'вивчені слова', es: 'palabras estudiadas', 'pt-BR': 'palavras estudadas', vi: 'từ đã học', id: 'kata yang dipelajari', tr: 'öğrenilen kelimeler', pl: 'poznane słowa' }) },
    { key: 'phrases', value: s.lifetime.phrases, thresholds: [1, 50, 250, 500], productPriority: 4, labels: localized({ ru: 'изученные фразы', uk: 'вивчені фрази', es: 'frases estudiadas', 'pt-BR': 'frases estudadas', vi: 'cụm từ đã học', id: 'frasa yang dipelajari', tr: 'öğrenilen ifadeler', pl: 'poznane zwroty' }) },
    { key: 'quizzes', value: s.lifetime.quizzes, thresholds: [1, 10, 50, 100], productPriority: 3, labels: localized({ ru: 'пройденные квизы', uk: 'пройдені квізи', es: 'cuestionarios completados', 'pt-BR': 'quizzes concluídos', vi: 'bài kiểm tra đã hoàn thành', id: 'kuis yang diselesaikan', tr: 'tamamlanan testler', pl: 'ukończone quizy' }) },
    { key: 'arena wins', value: s.lifetime.arenaWins, thresholds: [1, 5, 10, 25], productPriority: 2, labels: localized({ ru: 'победы на Арене', uk: 'перемоги на Арені', es: 'victorias en la Arena', 'pt-BR': 'vitórias na Arena', vi: 'chiến thắng Đấu trường', id: 'kemenangan Arena', tr: 'Arena galibiyetleri', pl: 'zwycięstwa na Arenie' }) },
    { key: 'active days', value: s.lifetime.daysActive, thresholds: [1, 7, 30, 100], productPriority: 1, labels: localized({ ru: 'активные дни', uk: 'активні дні', es: 'días activos', 'pt-BR': 'dias ativos', vi: 'ngày hoạt động', id: 'hari aktif', tr: 'aktif günler', pl: 'aktywne dni' }) },
  ].map((item) => {
    const thresholdIndex = item.thresholds.reduce(
      (reached, threshold, index) => item.value >= threshold ? index : reached,
      -1,
    );
    return thresholdIndex < 0 ? null : { ...item, thresholdIndex, threshold: item.thresholds[thresholdIndex] };
  }).filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.thresholdIndex - a.thresholdIndex
      || b.productPriority - a.productPriority
      || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const milestone = milestones[0];
  if (milestone) {
    result.push(candidate('lifetime', `milestone-${milestone.key.replace(/\s+/g, '-')}-${milestone.threshold}`, 300,
      [milestone.key, milestone.labels[s.lang], milestone.value, milestone.threshold],
      `This is a verified lifetime milestone for ${milestone.key}: the supplied count reached the product-defined ${milestone.threshold} threshold; do not compare raw counts across unit types.`, null,
      localized({
        ru: `Подтверждённый накопительный рубеж: ${milestone.value} по показателю «${milestone.labels.ru}». Это реальная часть личной истории.`,
        uk: `Підтверджений накопичувальний рубіж: ${milestone.value} за показником «${milestone.labels.uk}». Це реальна частина особистої історії.`,
        es: `Hito acumulado verificado: ${milestone.value} en «${milestone.labels.es}». Ya forma parte real de tu trayectoria.`,
        'pt-BR': `Marco acumulado verificado: ${milestone.value} em “${milestone.labels['pt-BR']}”. Isso já é uma parte real da sua trajetória.`,
        vi: `Cột mốc tích lũy đã xác minh: ${milestone.value} ở “${milestone.labels.vi}”. Đây là một phần thật trong hành trình của bạn.`,
        id: `Tonggak akumulatif terverifikasi: ${milestone.value} pada “${milestone.labels.id}”. Ini bagian nyata dari perjalananmu.`,
        tr: `Doğrulanmış birikimli dönüm noktası: “${milestone.labels.tr}” alanında ${milestone.value}. Bu, kişisel yolculuğunun gerçek bir parçası.`,
        pl: `Zweryfikowany łączny kamień milowy: ${milestone.value} w kategorii „${milestone.labels.pl}”. To realna część Twojej historii.`,
      })));
  }
  result.push(candidate('lifetime', milestone ? 'verified-summary' : 'first-milestone', 100,
    [s.lifetime.words, s.lifetime.phrases, s.lifetime.quizzes, s.lifetime.arenaWins, s.lifetime.daysActive],
    'Summarize only the five supplied lifetime totals; when all are zero, say that the first milestone is still ahead.',
    milestone ? null : 'Complete one learning activity to create the first lifetime milestone.',
    localized({
      ru: milestone ? 'Накопленные результаты подтверждены в пяти категориях; их можно использовать как личную базовую линию.' : 'Первый накопительный результат ещё впереди. Одно завершённое занятие создаст первый честный рубеж.',
      uk: milestone ? 'Накопичені результати підтверджені у п’яти категоріях; їх можна використати як особисту базову лінію.' : 'Перший накопичувальний результат ще попереду. Одне завершене заняття створить перший чесний рубіж.',
      es: milestone ? 'Los resultados acumulados están verificados en cinco categorías y sirven como referencia personal.' : 'El primer hito acumulado aún está por llegar. Una actividad completada creará el primer logro real.',
      'pt-BR': milestone ? 'Os resultados acumulados estão verificados em cinco categorias e servem como referência pessoal.' : 'O primeiro marco acumulado ainda está por vir. Uma atividade concluída criará o primeiro resultado real.',
      vi: milestone ? 'Kết quả tích lũy đã được xác minh ở năm hạng mục và có thể làm mốc cá nhân.' : 'Cột mốc tích lũy đầu tiên vẫn đang ở phía trước. Hoàn thành một hoạt động sẽ tạo thành quả thực đầu tiên.',
      id: milestone ? 'Hasil akumulatif terverifikasi dalam lima kategori dan dapat menjadi garis dasar pribadi.' : 'Pencapaian akumulatif pertama masih menanti. Menyelesaikan satu aktivitas akan membuat tonggak nyata pertama.',
      tr: milestone ? 'Birikmiş sonuçlar beş kategoride doğrulandı ve kişisel başlangıç çizgisi olarak kullanılabilir.' : 'İlk birikimli dönüm noktası henüz ileride. Tamamlanan tek bir etkinlik ilk gerçek eşiği oluşturur.',
      pl: milestone ? 'Łączne wyniki są zweryfikowane w pięciu kategoriach i mogą służyć jako osobisty punkt bazowy.' : 'Pierwszy łączny kamień milowy jest jeszcze przed Tobą. Jedna ukończona aktywność stworzy pierwszy rzetelny próg.',
    })));
  return result;
};

const choose = (
  candidates: Candidate[],
  preferredIds: ReadonlySet<string>,
  previousIds: ReadonlySet<string>,
): Candidate => {
  const ranked = [...candidates].sort((a, b) => b.priority - a.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const preferred = ranked.find((item) => preferredIds.has(item.id));
  if (preferred) return preferred;
  return ranked.find((item) => !previousIds.has(item.id)) ?? ranked[0];
};

const selectionPolicy = (
  value: readonly string[] | StatsInsightSelectionPolicy,
): Required<StatsInsightSelectionPolicy> => {
  if (Array.isArray(value)) {
    return { preferredObservationIds: [], previousObservationIds: value };
  }
  const policy = value as StatsInsightSelectionPolicy;
  return {
    preferredObservationIds: policy.preferredObservationIds ?? [],
    previousObservationIds: policy.previousObservationIds ?? [],
  };
};

const stableFingerprint = (semantic: unknown): string => {
  const value = JSON.stringify(semantic);
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `stats-v1-${hash.toString(16).padStart(8, '0')}`;
};

export function buildStatsInsightAnalysis(
  snapshot: StatsInsightsSnapshot,
  selection: readonly string[] | StatsInsightSelectionPolicy = [],
): StatsInsightAnalysis {
  const normalized = normalize(snapshot);
  const policy = selectionPolicy(selection);
  const preferredIds = new Set(policy.preferredObservationIds);
  const previousIds = new Set(policy.previousObservationIds);
  const blocks: StatsInsightAnalysis['blocks'] = {
    week: choose(weekCandidates(normalized), preferredIds, previousIds),
    longTerm: choose(longTermCandidates(normalized), preferredIds, previousIds),
    comparison: choose(comparisonCandidates(normalized), preferredIds, previousIds),
    lifetime: choose(lifetimeCandidates(normalized), preferredIds, previousIds),
  };
  const selectedIds = [blocks.week.id, blocks.longTerm.id, blocks.comparison.id, blocks.lifetime.id];

  return {
    fingerprint: stableFingerprint({ snapshot: normalized, selectedObservationIds: selectedIds }),
    blocks,
    generatedFromCompleteSnapshot: true,
  };
}
