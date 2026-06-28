import type { Lang } from '../constants/i18n';
import {
  ENERGY_MESSAGES_ES,
  ENERGY_MESSAGES_RU,
  ENERGY_MESSAGES_UK,
} from './lesson1_energy';
import { spanishLessonUiStringsActive } from './spanish_content_gate';
import type { StudyTargetLang } from './study_target_lang_dev';

/** Тексты подсказок до уроков 20/21 (артикли / some-any). */
export type GrammarHintTrilingual = {
  textRu: string;
  textUk: string;
  textEs: string;
  textPtBr?: string;
  textVi?: string;
  textId?: string;
  textTr?: string;
  textPl?: string;
};

const GRAMMAR_HINT_TEXT_FIELD_BY_LANG = {
  ru: 'textRu',
  uk: 'textUk',
  es: 'textEs',
  'pt-BR': 'textPtBr',
  vi: 'textVi',
  id: 'textId',
  tr: 'textTr',
  pl: 'textPl',
} as const satisfies Record<Lang, keyof GrammarHintTrilingual>;

const ENERGY_MESSAGES_PT_BR = [
  'Dê um tempo para o conteúdo assentar. +1 ⚡ volta em {time}. Com Plus, você continua sem pausas.',
  'Você mandou bem. +1 ⚡ será recuperado em {time}. No Plus, a energia não acaba.',
  'Seu cérebro merece uma pausa curta. +1 ⚡ volta em {time}. Quer estudar sem parar? Plus libera o caminho.',
  'Energia zerada, progresso em alta. +1 ⚡ volta em {time}; com Plus, não precisa esperar.',
  'Respire um pouco. +1 ⚡ volta em {time}. Ou remova os limites com Plus.',
];

const ENERGY_MESSAGES_VI = [
  'Hãy để kiến thức ngấm thêm một chút. +1 ⚡ sẽ trở lại sau {time}. Với Plus, bạn học tiếp không cần chờ.',
  'Bạn đã học rất tốt. +1 ⚡ sẽ hồi lại sau {time}. Plus thì năng lượng không hết.',
  'Não bộ của bạn xứng đáng nghỉ ngắn. +1 ⚡ sẽ trở lại sau {time}. Muốn học liền mạch? Plus mở đường.',
  'Năng lượng đã về 0, nhưng tiến độ vẫn tốt. +1 ⚡ sẽ hồi lại sau {time}; Plus giúp bạn khỏi chờ.',
  'Tạm nghỉ một nhịp. +1 ⚡ sẽ trở lại sau {time}. Hoặc gỡ giới hạn bằng Plus.',
];

const ENERGY_MESSAGES_ID = [
  'Beri waktu agar materi meresap. +1 ⚡ kembali dalam {time}. Dengan Plus, kamu lanjut tanpa jeda.',
  'Kerjamu bagus. +1 ⚡ akan pulih dalam {time}. Di Plus, energi tidak habis.',
  'Otakmu pantas mendapat istirahat singkat. +1 ⚡ kembali dalam {time}. Mau belajar tanpa berhenti? Plus membuka jalan.',
  'Energi nol, progres tetap tinggi. +1 ⚡ pulih dalam {time}; dengan Plus kamu tidak perlu menunggu.',
  'Ambil jeda sebentar. +1 ⚡ kembali dalam {time}. Atau hapus batas dengan Plus.',
];

const ENERGY_MESSAGES_TR = [
  'Bilginin biraz oturmasına izin ver. +1 ⚡ {time} içinde döner. Plus ile beklemeden devam edersin.',
  'İyi çalıştın. +1 ⚡ {time} içinde yenilenir. Plusda enerji bitmez.',
  'Beynin kısa bir molayı hak etti. +1 ⚡ {time} içinde döner. Durmadan çalışmak ister misin? Plus yolu açar.',
  'Enerji sıfır, ilerleme yüksek. +1 ⚡ {time} içinde yenilenir; Plus ile beklemek yok.',
  'Kısa bir nefes alalım. +1 ⚡ {time} içinde döner. Ya da Plus ile sınırları kaldır.',
];

const ENERGY_MESSAGES_PL = [
  'Daj wiedzy chwilę, żeby się ułożyła. +1 ⚡ wróci za {time}. Z Plus uczysz się bez przerw.',
  'Dobra robota. +1 ⚡ odnowi się za {time}. W Plus energia się nie kończy.',
  'Twój mózg zasłużył na krótką pauzę. +1 ⚡ wróci za {time}. Chcesz uczyć się bez zatrzymania? Plus otwiera drogę.',
  'Energia na zerze, ale postęp jest mocny. +1 ⚡ wróci za {time}; z Plus nie czekasz.',
  'Zróbmy krótki oddech. +1 ⚡ wróci za {time}. Albo zdejmij limity dzięki Plus.',
];

const ENERGY_MESSAGES_BY_LANG = {
  ru: ENERGY_MESSAGES_RU,
  uk: ENERGY_MESSAGES_UK,
  es: ENERGY_MESSAGES_ES,
  'pt-BR': ENERGY_MESSAGES_PT_BR,
  vi: ENERGY_MESSAGES_VI,
  id: ENERGY_MESSAGES_ID,
  tr: ENERGY_MESSAGES_TR,
  pl: ENERGY_MESSAGES_PL,
} as const satisfies Record<Lang, readonly string[]>;

export function grammarHintLine(
  lang: Lang,
  hint: GrammarHintTrilingual,
  studyTarget: StudyTargetLang = 'en',
): string {
  if (spanishLessonUiStringsActive(lang, studyTarget)) return hint.textEs;
  const field = GRAMMAR_HINT_TEXT_FIELD_BY_LANG[lang];
  const localized = hint[field];
  return typeof localized === 'string' && localized.trim() ? localized : '';
}

/** Случайное сообщение модалки нулевой энергии выбирается из этого массива. */
export function lessonEnergyMessages(
  lang: Lang,
  studyTarget: StudyTargetLang = 'en',
): readonly string[] {
  const effectiveLang = spanishLessonUiStringsActive(lang, studyTarget) ? 'es' : lang;
  return ENERGY_MESSAGES_BY_LANG[effectiveLang];
}
