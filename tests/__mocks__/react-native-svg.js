// зачем (17.10, координатор: flashcards_swipe_access_behavior падал при загрузке): настоящий react-native-svg в node-окружении не грузится
// (Touchable.Mixin undefined), а через общий значок «назад» BackGlyph он попал в графы импортов почти всех экранов и китов. Тестам нужны только пустые элементы
// с теми же именами — рисовать им нечего. Тест, которому нужен свой вид, по-прежнему ставит собственный jest.mock('react-native-svg', …).
const React = require('react');

const make = (name) => {
  const Mock = (props) => React.createElement(name, props, props.children);
  Mock.displayName = name;
  return Mock;
};

const Svg = make('Svg');
module.exports = {
  __esModule: true,
  default: Svg,
  Svg,
  Circle: make('Circle'),
  ClipPath: make('ClipPath'),
  Defs: make('Defs'),
  Ellipse: make('Ellipse'),
  G: make('G'),
  Line: make('Line'),
  LinearGradient: make('LinearGradient'),
  Mask: make('Mask'),
  Path: make('Path'),
  Polygon: make('Polygon'),
  Polyline: make('Polyline'),
  RadialGradient: make('RadialGradient'),
  Rect: make('Rect'),
  Stop: make('Stop'),
  Text: make('SvgText'),
  TSpan: make('TSpan'),
};
