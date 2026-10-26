// зачем (владелец 25.10, макет account-delete-variant-b «Да, так»; сервер 713677ddd): окно 1 — «Удалить через 14 дней» без ввода
// слова, «Отмена», тихая ссылка «Удалить навсегда сейчас»; окно 2 — «Удалить навсегда» только после слова «УДАЛИТЬ», «Назад».
// «Навсегда» идёт той же цепочкой удаления с полем deleteNow; всё — за флагом «Пульта», гость и флаг выкл — окно прежнее.
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { readSource } from './helpers/read_source';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  Pressable: ({ children, onPress, disabled, testID, accessibilityState }: { children: unknown; onPress?: () => void; disabled?: boolean; testID?: string; accessibilityState?: unknown }) => {
    const React = jest.requireActual('react');
    return React.createElement('Pressable', { onPress: disabled ? undefined : onPress, testID, accessibilityState }, typeof children === 'function' ? (children as (s: { pressed: boolean }) => unknown)({ pressed: false }) : children);
  },
  ActivityIndicator: 'ActivityIndicator',
  Platform: { OS: 'ios', select: (o: Record<string, unknown>) => o.ios ?? o.default },
  StyleSheet: { create: (s: unknown) => s, flatten: (s: unknown) => s },
}));

/* eslint-disable import/first */
import { DeleteAccountVariantBBody, type DeleteAccountVariantBBodyProps } from '../components/account/DeleteAccountVariantBBody';
import { deleteAccountVariantBCopy } from '../components/account/delete_account_variant_b_copy';

const glass = { text: '#111', secondary: '#555', mutedText: '#999', buttonFill: '#ddd', opaqueControl: '#eee' };

function props(overrides: Partial<DeleteAccountVariantBBodyProps> = {}): DeleteAccountVariantBBodyProps {
  return {
    step: 'grace',
    glass,
    fontSizes: { h2: 22, body: 16, caption: 13 },
    copy: deleteAccountVariantBCopy('ru'),
    title: 'Удалить аккаунт?',
    cancelLabel: 'Отмена',
    confirmLabel: 'Введи «УДАЛИТЬ» для подтверждения:',
    confirmWord: 'УДАЛИТЬ',
    confirmInput: '',
    confirmMatches: false,
    deleting: false,
    gracePaint: { fill: '#b33', ink: '#fff' },
    linkColor: '#a22',
    nowPaint: { fill: '#ccc', ink: '#888' },
    inputShadow: [],
    onChangeInput: jest.fn(),
    onSubmitInput: jest.fn(),
    onConfirmGrace: jest.fn(),
    onOpenNow: jest.fn(),
    onConfirmNow: jest.fn(),
    onBack: jest.fn(),
    onCancel: jest.fn(),
    ...overrides,
  };
}

describe('окно 1: «Удалить через 14 дней»', () => {
  it('тексты макета; кнопка без ввода слова; ссылка открывает окно 2; отмена', async () => {
    const p = props();
    await render(<DeleteAccountVariantBBody {...p} />);
    expect(screen.getByText('Удалить через 14 дней')).toBeTruthy();
    expect(screen.getByText('через 14 дней')).toBeTruthy();
    expect(screen.getByText('Подписка в App Store или Google Play сама не отменится.')).toBeTruthy();
    expect(screen.queryByTestId('delete-account-confirm-input')).toBeNull();
    await fireEvent.press(screen.getByTestId('delete-account-grace-confirm'));
    expect(p.onConfirmGrace).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByTestId('delete-account-delete-now-link'));
    expect(p.onOpenNow).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByTestId('delete-account-cancel'));
    expect(p.onCancel).toHaveBeenCalledTimes(1);
  });

  it('во время удаления кнопки не нажимаются (защита от двойного тапа)', async () => {
    const p = props({ deleting: true });
    await render(<DeleteAccountVariantBBody {...p} />);
    // зачем: fireEvent библиотеки зовёт onPress родителя-обёртки и при disabled; настоящий Pressable при disabled не жмётся,
    // поэтому проверяем сам признак disabled, который получает Pressable (и видит программа чтения экрана).
    expect(screen.getByTestId('delete-account-grace-confirm').props.accessibilityState).toMatchObject({ disabled: true, busy: true });
    expect(screen.getByTestId('delete-account-delete-now-link').props.accessibilityState).toMatchObject({ disabled: true });
    expect(screen.getByTestId('delete-account-cancel').props.accessibilityState).toMatchObject({ disabled: true });
  });
});

describe('окно 2: «Удалить навсегда?»', () => {
  it('пока слово не введено — «Удалить навсегда» не срабатывает; после — срабатывает; «Назад» возвращает', async () => {
    const p = props({ step: 'now' });
    await render(<DeleteAccountVariantBBody {...p} />);
    expect(screen.getByText('Удалить навсегда?')).toBeTruthy();
    expect(screen.getByText('сразу')).toBeTruthy();
    expect(screen.getByTestId('delete-account-confirm').props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.changeText(screen.getByTestId('delete-account-confirm-input'), 'удалить');
    expect(p.onChangeInput).toHaveBeenCalledWith('удалить');
    await screen.rerender(<DeleteAccountVariantBBody {...p} confirmInput="УДАЛИТЬ" confirmMatches />);
    expect(screen.getByTestId('delete-account-confirm').props.accessibilityState).toMatchObject({ disabled: false });
    await fireEvent.press(screen.getByTestId('delete-account-confirm'));
    expect(p.onConfirmNow).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByTestId('delete-account-now-back'));
    expect(p.onBack).toHaveBeenCalledTimes(1);
  });
});

describe('проводка: флаг, режим «навсегда», поле deleteNow', () => {
  it('окно: новые окна только для Google/Apple при флаге; «навсегда» — beginAccountDeletionNow; «через 14 дней» — без слова', () => {
    const modal = readSource('components/DeleteAccountConfirmModal.tsx');
    expect(modal).toContain("hasProviderSignIn && getRemoteBool('account_delete_variant_b_ui_enabled') === true");
    expect(modal).toContain("const attemptHandoff = async (): Promise<DeleteAccountHandoff> => (mode === 'now' ? await beginAccountDeletionNow() : await beginAccountDeletion());");
    expect(modal).toContain('const res = variantB ? await retryAccountDeleteHandoffQuietly(attemptHandoff, mode) : await attemptHandoff();');
    expect(modal).toContain("(mode !== 'grace' && (!deleteConfirmMatches && !retryApproved))");
    expect(modal).toContain('const dialogBody = variantBBody ?? (');
  });

  it('удаление: признак «сейчас» взводится и снимается; постановка шлёт deleteNow только при признаке', () => {
    const auth = readSource('app/auth_provider.ts');
    expect(auth).toContain('export async function beginAccountDeletionNow(): Promise<DeleteAccountHandoff> {\n  armAccountDeleteNow();\n  try {\n    return await beginAccountDeletion();\n  } finally {\n    disarmAccountDeleteNow();\n  }\n}');
    const sync = readSource('app/cloud_sync.ts');
    expect(sync).toContain('const deleteNowArmed = takeArmedAccountDeleteNow();');
    expect(sync).toContain('const deleteNow = await resolveAccountDeleteNow(proof.operationId, deleteNowArmed);');
    expect(sync).toContain('const res = await fn(deleteNow ? { ...base, deleteNow: true as const } : base);');
    const flags = readSource('app/remote_flags.ts');
    // зачем (владелец 26.10): вариант Б ВКЛ по умолчанию в 2.0.3 (146) — сервер выложен утром
    expect(flags).toContain('account_delete_variant_b_ui_enabled: true,');
  });
});

// зачем (координатор 25.10): после 3 неудачных тихих повторов — тихая строка в окне (не модалка), кнопка снова активна.
describe('строка «Не получилось» после тихих повторов', () => {
  it('видна под кнопками в обоих окнах, кнопки активны; без признака — строки нет', async () => {
    const note = deleteAccountVariantBCopy('ru').handoffFailed;
    expect(note).toBe('Не получилось. Проверь интернет и нажми ещё раз.');
    await render(<DeleteAccountVariantBBody {...props({ failureNote: note })} />);
    expect(screen.getByTestId('delete-account-failure-note').props.children).toBe(note);
    expect(screen.getByTestId('delete-account-grace-confirm').props.accessibilityState).toMatchObject({ disabled: false });
    await render(<DeleteAccountVariantBBody {...props({ step: 'now', failureNote: note })} />);
    expect(screen.getByTestId('delete-account-failure-note')).toBeTruthy();
    await render(<DeleteAccountVariantBBody {...props({ failureNote: null })} />);
    expect(screen.queryByTestId('delete-account-failure-note')).toBeNull();
  });

  it('окно ставит признак только на ветках отказа variantB, снимает при новой попытке и смене шага; лог с причиной', () => {
    const modal = readSource('components/DeleteAccountConfirmModal.tsx');
    expect(modal.split('setHandoffFailedNote(true);').length - 1).toBe(2);
    // открытие, новая попытка, «Удалить навсегда сейчас», «Назад», системная «назад» из окна 2
    expect(modal.split('setHandoffFailedNote(false);').length - 1).toBe(5);
    expect(modal).toContain("console.warn('[ACCOUNT-DELETE]', JSON.stringify({ step: 'handoff_failed_note_shown', mode, lastReason: res.reason }));");
    expect(modal).toContain('failureNote={handoffFailedNote ? variantBCopy.handoffFailed : null}');
    const confirm = modal.slice(modal.indexOf('const handleConfirmDelete'), modal.indexOf('const handleCancel'));
    for (const branch of ['if (!res.ok) {', '} catch (error: unknown) {']) {
      const body = confirm.slice(confirm.indexOf(branch));
      const variantB = body.slice(body.indexOf('if (variantB) {'), body.indexOf('showInfoAlert('));
      expect(variantB).toContain('setHandoffFailedNote(true);');
    }
  });
});

// зачем (координатор 26.10, аудит «назад»): системная «назад» окна удаления — туда, откуда пришли; во время удаления — ничего.
describe('системная «назад» окна удаления', () => {
  const modal = readSource('components/DeleteAccountConfirmModal.tsx');
  const handler = modal.slice(modal.indexOf('const handleSystemBack = useCallback(() => {'), modal.indexOf('}, [deleting, onRequestClose, variantB, variantBStep]);'));

  it('обе оболочки окна (гибридная и Modal) зовут одну функцию', () => {
    expect(modal.split('onRequestClose={handleSystemBack}').length - 1).toBe(2);
    expect(modal).not.toContain('if (!deleting) onRequestClose();');
  });

  it('пока идёт удаление — ничего не делает (необратимый шаг не прерывается); окно 2 → окно 1; иначе закрыть', () => {
    expect(handler.indexOf('if (deleting || deleteInFlightRef.current) {')).toBeGreaterThan(-1);
    expect(handler.indexOf("console.log('[ACCOUNT-DELETE-UI] back ignored reason=in_flight');")).toBeLessThan(handler.indexOf("if (variantB && variantBStep === 'now') {"));
    const toGrace = handler.slice(handler.indexOf("if (variantB && variantBStep === 'now') {"), handler.indexOf('onRequestClose();'));
    expect(toGrace).toContain("setVariantBStep('grace');");
    expect(toGrace).toContain('return;');
    expect(handler.trim().endsWith('onRequestClose();')).toBe(true);
  });
});
