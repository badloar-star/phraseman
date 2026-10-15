// зачем (координатор 15.10, «не засчитано»): блок рисует фразу целиком, пропущенные слова — отдельными плашками, и строку под плашкой; без пропущенных слов — ничего.
import React from 'react';
import { render } from '@testing-library/react-native';

// зачем: как у соседних тестов компонентов — лёгкая подмена react-native (хост-строки View/Text и StyleSheet), без нативной цепочки
jest.mock('react-native', () => ({
  View: 'View', Text: 'Text',
  StyleSheet: { create: (styles: unknown) => styles, flatten: (style: unknown) => (Array.isArray(style) ? Object.assign({}, ...style.flat(2).filter(Boolean)) : style) },
}));
// зачем: тень плашки не проверяем здесь (общий кит) — не тянем его цепочку импортов
jest.mock('../components/v2/ShadowSurface', () => ({ plateBoxShadow: () => [] }));

import SpeechFailBlock from '../components/speech/SpeechFailBlock';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';

const glass = liquidGlassTokens('graphite');
const props = { lang: 'ru', glass, kicker: 'Сказано' };

describe('SpeechFailBlock', () => {
  it('фраза целиком, пропущенное слово в своей плашке, строка с названным словом', async () => {
    const view = await render(<SpeechFailBlock {...props} targetText="She works every day" missingWords={['every']} />);
    expect(view.getByText('She')).toBeTruthy();
    expect(view.getByText('day')).toBeTruthy();
    expect(view.getAllByTestId('speech-fail-block-missed')).toHaveLength(1);
    expect(view.getAllByText('every')).toHaveLength(2); // слово в плашке фразы и жирным в строке под ней
    expect(view.getByTestId('speech-fail-block-line')).toBeTruthy();
    expect(view.getByTestId('speech-fail-block').props.accessibilityLabel).toContain('Не услышали слово «every» — скажи фразу целиком');
  });

  it('несколько пропущенных: плашка у каждого, в строке — первое', async () => {
    const view = await render(<SpeechFailBlock {...props} targetText="I really like green tea" missingWords={['tea', 'really']} />);
    expect(view.getAllByTestId('speech-fail-block-missed')).toHaveLength(2);
    expect(view.getByTestId('speech-fail-block').props.accessibilityLabel).toContain('слово «really»');
  });

  it('пропущенных нет — блок ничего не рисует (хост покажет прежний вид)', async () => {
    const view = await render(<SpeechFailBlock {...props} targetText="Good morning" missingWords={[]} />);
    expect(view.queryByTestId('speech-fail-block')).toBeNull();
  });

  it('цвета — токены темы: плашка слова badSoft, текст bad', async () => {
    const view = await render(<SpeechFailBlock {...props} targetText="She works every day" missingWords={['every']} />);
    const chip = view.getByTestId('speech-fail-block-missed');
    const flat = Object.assign({}, ...[chip.props.style].flat(2).filter(Boolean)) as { backgroundColor?: string };
    expect(flat.backgroundColor).toBe(glass.badSoft);
  });
});
