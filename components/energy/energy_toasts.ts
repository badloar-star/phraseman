import { emitAppEvent } from '../../app/events';

/**
 * Короткие сообщения режима энергии Б (макет energy-modes-states.html: Б3 «Последняя энергия…», Б6 «Plus активирован», Б8 «Энергия восстановилась»).
 * Идут через общий ActionToast: верхняя строка с плиткой-значком, звук и появление уже настроены там — своей плашки на каждом из 10 экранов занятий не нужно.
 */
export type EnergyToastKind = 'last_energy' | 'plus_resumed' | 'energy_restored';

type Copy = Readonly<{
  type: 'success' | 'warning';
  icon: string;
  ru: string; uk: string; en: string; es: string; ptBr: string; vi: string; id: string; tr: string; pl: string;
}>;

const COPY: Readonly<Record<EnergyToastKind, Copy>> = {
  last_energy: {
    type: 'warning',
    icon: 'flash-outline',
    // зачем (голос PhraseMan, VOICE.md, владелец 25.10): предупреждение живым голосом, смысл тот же
    ru: 'Аккуратнее: энергии — ровно на одну ошибку.',
    uk: 'Обережно: енергії — рівно на одну помилку.',
    en: 'Careful: you’ve got energy for exactly one mistake.',
    es: 'Cuidado: te queda energía para un solo error.',
    ptBr: 'Cuidado: só tem energia para mais um erro.',
    vi: 'Cẩn thận: năng lượng chỉ đủ cho đúng một lỗi.',
    id: 'Hati-hati: energinya cuma cukup untuk satu kesalahan.',
    tr: 'Dikkat: tam bir hatalık enerjin kaldı.',
    pl: 'Ostrożnie: energii starczy na jeden błąd.',
  },
  plus_resumed: {
    type: 'success',
    icon: 'checkmark-circle-outline',
    ru: 'Plus активирован — продолжаем с того же вопроса.',
    uk: 'Plus активовано — продовжуємо з того самого питання.',
    en: 'Plus is active — picking up at the same question.',
    es: 'Plus activado: seguimos en la misma pregunta.',
    ptBr: 'Plus ativado — continuamos na mesma pergunta.',
    vi: 'Đã kích hoạt Plus — tiếp tục từ câu hỏi đó.',
    id: 'Plus aktif — lanjut dari pertanyaan yang sama.',
    tr: 'Plus etkinleşti — aynı sorudan devam ediyoruz.',
    pl: 'Plus aktywny — wracamy do tego samego pytania.',
  },
  energy_restored: {
    type: 'success',
    icon: 'flash-outline',
    ru: 'Энергия снова полная — поехали!',
    uk: 'Енергія знову повна — поїхали!',
    en: 'Energy’s full again — let’s go!',
    es: 'Energía a tope otra vez. ¡Vamos!',
    ptBr: 'Energia cheia de novo — bora!',
    vi: 'Năng lượng đầy lại rồi — bắt đầu thôi!',
    id: 'Energi penuh lagi — ayo mulai!',
    tr: 'Enerji yine dolu — hadi başlayalım!',
    pl: 'Energia znowu pełna — lecimy!',
  },
};

export function emitEnergyToast(kind: EnergyToastKind): void {
  const c = COPY[kind];
  emitAppEvent('action_toast', {
    type: c.type,
    layout: 'top_line',
    lineIcon: c.icon,
    messageRu: c.ru,
    messageUk: c.uk,
    messageEn: c.en,
    messageEs: c.es,
    messagePtBr: c.ptBr,
    messageVi: c.vi,
    messageId: c.id,
    messageTr: c.tr,
    messagePl: c.pl,
  });
}
