// HomeSheetTextGuard.tsx — предохранитель содержимого шторок Главной (опрос, анкета) с журналом [TEXT-OUTSIDE].
// зачем (координатор 25.10, Сверка: красная ошибка «Text strings must be rendered within a <Text> component» при шторке «Опрос»;
// стека нет — журнал эмулятора очищен, разбор кода чист): «сперва логи». При ошибке рендера пишем имя шторки, текст ошибки,
// стек компонентов (точное место) и снимок данных — в консоль и в сохраняемый журнал. Вместо содержимого — пусто: в релизе
// падает одна шторка, а не вся Главная. Новое открытие (resetKey) пробует снова.
import React from 'react';

import { DebugLogger } from '../../app/debug-logger';

type Props = Readonly<{
  /** Имя шторки в журнале. */
  name: string;
  /** Меняется при новом открытии — предохранитель снова пробует рендер. */
  resetKey: string;
  /** Снимок данных для журнала: без текстов вопросов/ответов — только фазы, номера, количества, типы. */
  details?: () => Readonly<Record<string, unknown>>;
  children: React.ReactNode;
}>;

type State = Readonly<{ failed: boolean }>;

const TEXT_OUTSIDE = /Text strings must be rendered within a <Text> component/;

// зачем (тест 25.10: сброс через getDerivedStateFromProps не возвращал содержимое после падения): новое открытие
// пересоздаёт предохранитель по ключу — состояние гарантированно чистое. Содержимое шторки при закрытии и так выгружается.
export default function HomeSheetTextGuard(props: Props): React.ReactElement {
  return <SheetTextGuardBoundary key={props.resetKey} {...props} />;
}

class SheetTextGuardBoundary extends React.Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    let details: Record<string, unknown>;
    try {
      details = { ...(this.props.details?.() ?? {}) };
    } catch (detailsError: unknown) {
      details = { detailsFailed: detailsError instanceof Error ? detailsError.message : String(detailsError) };
    }
    const message = typeof error?.message === 'string' ? error.message : String(error);
    const componentStack = (info.componentStack ?? '').split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 25);
    console.warn('[TEXT-OUTSIDE]', JSON.stringify({ // guard-ok: только при ошибке рендера, нужен и в релизе
      sheet: this.props.name, textOutside: TEXT_OUTSIDE.test(message), message: message.slice(0, 300), details, componentStack,
      shown: 'empty_sheet_content',
    }));
    DebugLogger.error(`[TEXT-OUTSIDE] ${this.props.name}`, new Error(`${message.slice(0, 300)} | ${componentStack.slice(0, 12).join(' < ')}`), 'critical');
  }

  render(): React.ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}
