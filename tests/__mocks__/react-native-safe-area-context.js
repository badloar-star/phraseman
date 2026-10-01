// зачем (координатор §48, 2026-10-01): официальный jest/mock пакета отдаёт объект как
// default-экспорт — через moduleNameMapper именованные импорты (useSafeAreaInsets)
// получались undefined. Это та же заглушка с именованными экспортами: нулевые
// отступы и кадр 320×640, провайдеры — прозрачные обёртки.
const React = require('react');

const insets = { top: 0, right: 0, bottom: 0, left: 0 };
const frame = { x: 0, y: 0, width: 320, height: 640 };
const passthrough = ({ children }) => children ?? null;

module.exports = {
  initialWindowMetrics: { insets, frame },
  useSafeAreaInsets: () => insets,
  useSafeAreaFrame: () => frame,
  SafeAreaProvider: passthrough,
  SafeAreaView: ({ children, ...props }) => React.createElement('View', props, children),
  SafeAreaInsetsContext: React.createContext(insets),
  SafeAreaFrameContext: React.createContext(frame),
  withSafeAreaInsets: (Component) => (props) => React.createElement(Component, { ...props, insets }),
};
