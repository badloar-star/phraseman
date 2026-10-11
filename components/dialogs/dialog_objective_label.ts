/**
 * Подпись задания диалога для показа: с заглавной буквы и без точки в конце.
 *
 * зачем (Сверка dialogs-007/008/018/019, макет «Заказать капучино…»): сценарии пишут задания как продолжение фразы
 * («поздороваться…», «подтвердить финальное время.»), а в макете это пункты списка — заглавная и без точки. Меняем только
 * показ; исходный текст (и то, что уходит в разбор) остаётся прежним.
 */
export function formatDialogObjectiveLabel(label: string): string {
  const text = String(label ?? '').trim().replace(/[.。]+$/u, '').trim();
  if (!text) return text;
  const first = Array.from(text)[0] ?? '';
  return first.toLocaleUpperCase() + text.slice(first.length);
}

