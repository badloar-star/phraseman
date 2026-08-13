/**
 * Cards 2.1 §5.2 — чистая логика нижнего таббара раздела «Карточки»:
 * состояние раскрытия групп, закрытие по «назад», стаггер и сборка маршрутов режимов.
 */
import {
  buildFcCreateRoute,
  buildFcTrainRoute,
  consumeFcTabBackPress,
  FC_CARDS_ROUTE,
  FC_CREATE_OPTIONS,
  FC_PACKS_ROUTE,
  FC_PLUS_ROTATION_DEG,
  FC_TABBAR_SCRIM_OPACITY,
  FC_TABBAR_STAGGER_MS,
  FC_TRAIN_OPTIONS,
  fcPlusRotationDeg,
  fcTabMenuItemDelay,
  fcTabScrimOpacity,
  fcTrainOptionPresetMode,
  isFcTabMenuKindOpen,
  isFcTabMenuOpen,
  toggleFcTabMenu,
  type FcTabMenu,
} from '../app/flashcards/tabbar_state';
import type { FcModePreset } from '../app/flashcards/mode_prefs';

const preset = (deckIds: FcModePreset['deckIds'], size: FcModePreset['size'] = 15): FcModePreset => ({
  deckId: deckIds[0],
  deckIds: [...deckIds],
  size,
});

describe('раскрытие групп таббара (§5.2)', () => {
  it('тап по кнопке раскрывает свою группу, повторный — сворачивает', () => {
    expect(toggleFcTabMenu('none', 'train')).toBe('train');
    expect(toggleFcTabMenu('train', 'train')).toBe('none');
    expect(toggleFcTabMenu('none', 'create')).toBe('create');
    expect(toggleFcTabMenu('create', 'create')).toBe('none');
  });

  it('две группы никогда не открыты одновременно', () => {
    expect(toggleFcTabMenu('train', 'create')).toBe('create');
    expect(toggleFcTabMenu('create', 'train')).toBe('train');
  });

  it('isFcTabMenuOpen / isFcTabMenuKindOpen', () => {
    expect(isFcTabMenuOpen('none')).toBe(false);
    expect(isFcTabMenuOpen('train')).toBe(true);
    expect(isFcTabMenuOpen('create')).toBe(true);
    expect(isFcTabMenuKindOpen('train', 'train')).toBe(true);
    expect(isFcTabMenuKindOpen('train', 'create')).toBe(false);
  });

  it('системный «назад» сначала сворачивает группу, потом отдаёт событие экрану', () => {
    const first = consumeFcTabBackPress('create');
    expect(first).toEqual({ menu: 'none', handled: true });
    const second = consumeFcTabBackPress(first.menu);
    expect(second).toEqual({ menu: 'none', handled: false });
  });

  it('затемнение фона включается ровно на раскрытой группе', () => {
    expect(fcTabScrimOpacity('none')).toBe(0);
    expect(fcTabScrimOpacity('train')).toBe(FC_TABBAR_SCRIM_OPACITY);
    expect(fcTabScrimOpacity('create')).toBe(FC_TABBAR_SCRIM_OPACITY);
  });

  it('«+» поворачивается в «×» только для своей группы', () => {
    const menus: FcTabMenu[] = ['none', 'train', 'create'];
    const rotations = menus.map((m) => fcPlusRotationDeg(m === 'create'));
    expect(rotations).toEqual([0, 0, FC_PLUS_ROTATION_DEG]);
  });
});

describe('стаггер появления кнопок (§5.2)', () => {
  it('при раскрытии кнопки появляются друг за другом сверху вниз', () => {
    const delays = FC_TRAIN_OPTIONS.map((_, i) =>
      fcTabMenuItemDelay(i, { open: true, total: FC_TRAIN_OPTIONS.length }),
    );
    expect(delays).toEqual([0, FC_TABBAR_STAGGER_MS, FC_TABBAR_STAGGER_MS * 2]);
  });

  it('при сворачивании порядок обратный', () => {
    const delays = FC_TRAIN_OPTIONS.map((_, i) =>
      fcTabMenuItemDelay(i, { open: false, total: FC_TRAIN_OPTIONS.length }),
    );
    expect(delays).toEqual([FC_TABBAR_STAGGER_MS * 2, FC_TABBAR_STAGGER_MS, 0]);
  });

  it('reduce motion — без стаггера; мусорный индекс не ломает расчёт', () => {
    expect(fcTabMenuItemDelay(2, { open: true, total: 3, reduceMotion: true })).toBe(0);
    expect(fcTabMenuItemDelay(NaN, { open: true, total: 3 })).toBe(0);
    expect(fcTabMenuItemDelay(-5, { open: true, total: 3 })).toBe(0);
  });

  it('каскад не растягивается на длинных списках', () => {
    expect(fcTabMenuItemDelay(99, { open: true, total: 100 })).toBe(FC_TABBAR_STAGGER_MS * 4);
  });
});

describe('маршруты пунктов «Тренировка» (§5.2)', () => {
  it('без пресета: тренер — due-очередь, слушание — сохранённые, блиц — дефолт', () => {
    expect(buildFcTrainRoute('train', null)).toEqual({
      pathname: '/trainer_words_session',
      params: { size: '15' },
    });
    expect(buildFcTrainRoute('listen', null)).toEqual({
      pathname: '/flashcards_listening_session',
      params: { deck: 'saved', size: '15' },
    });
    expect(buildFcTrainRoute('blitz', null)).toEqual({
      pathname: '/flashcards_blitz_session',
      params: {},
    });
  });

  it('пресет «слабые» не передаётся параметром: тренер идёт в due-очередь, слушание — в сохранённые', () => {
    const weak = preset(['weak'], 20);
    expect(buildFcTrainRoute('train', weak).params).toEqual({ size: '20' });
    expect(buildFcTrainRoute('listen', weak).params).toEqual({ deck: 'saved', size: '20' });
    expect(buildFcTrainRoute('blitz', weak).params).toEqual({});
  });

  it('мультивыбор колод (§6) уезжает в `?deck=` списком через запятую', () => {
    const multi = preset(['saved', 'custom', 'pack:abc'], 10);
    expect(buildFcTrainRoute('train', multi)).toEqual({
      pathname: '/trainer_words_session',
      params: { size: '10', deck: 'saved,custom,pack:abc' },
    });
    expect(buildFcTrainRoute('listen', multi).params.deck).toBe('saved,custom,pack:abc');
    expect(buildFcTrainRoute('blitz', multi).params).toEqual({ deck: 'saved,custom,pack:abc' });
  });

  it('каждый пункт читает свой пресет из mode_prefs', () => {
    expect(FC_TRAIN_OPTIONS.map(fcTrainOptionPresetMode)).toEqual(['trainer', 'listening', 'blitz']);
  });
});

describe('маршруты группы «+» и правой позиции', () => {
  it('«Создать карточку» ведёт в редактор кастомной карточки', () => {
    expect(buildFcCreateRoute('card')).toEqual({
      pathname: '/flashcards_card_editor',
      params: { create: '1', cat: 'custom' },
    });
  });

  it('«Создать набор» ведёт в создание набора сообщества', () => {
    expect(buildFcCreateRoute('pack')).toEqual({ pathname: '/community_pack_create', params: {} });
  });

  it('в группе «+» ровно две кнопки, в «Тренировке» — три', () => {
    expect(FC_CREATE_OPTIONS).toEqual(['card', 'pack']);
    expect(FC_TRAIN_OPTIONS).toEqual(['train', 'listen', 'blitz']);
  });

  it('вход в раздел — сохранённые карточки, правая позиция — каталог наборов (§5.1/§5.3)', () => {
    expect(FC_CARDS_ROUTE).toBe('/flashcards');
    expect(FC_PACKS_ROUTE).toBe('/flashcards_packs');
  });
});
