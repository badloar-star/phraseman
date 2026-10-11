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
    ru: 'Последняя энергия: следующая ошибка остановит занятие.',
    uk: 'Остання енергія: наступна помилка зупинить заняття.',
    en: 'Last energy: the next mistake will pause the lesson.',
    es: 'Última energía: el próximo error pausará la lección.',
    ptBr: 'Última energia: o próximo erro pausa a lição.',
    vi: 'Năng lượng cuối: lỗi tiếp theo sẽ dừng bài học.',
    id: 'Energi terakhir: kesalahan berikutnya menjeda pelajaran.',
    tr: 'Son enerji: bir sonraki hata dersi duraklatır.',
    pl: 'Ostatnia energia: kolejny błąd wstrzyma lekcję.',
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
    ru: 'Энергия восстановилась — можно начинать.',
    uk: 'Енергія відновилась — можна починати.',
    en: 'Energy is back — you can start.',
    es: 'La energía se recuperó: ya puedes empezar.',
    ptBr: 'A energia voltou — você já pode começar.',
    vi: 'Năng lượng đã hồi — bạn có thể bắt đầu.',
    id: 'Energi pulih — kamu bisa mulai.',
    tr: 'Enerji yenilendi — başlayabilirsin.',
    pl: 'Energia wróciła — możesz zaczynać.',
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
