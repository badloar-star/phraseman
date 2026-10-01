// зачем (координатор §47, 2026-10-01): expo-blur, как и expo-linear-gradient, тянет
// нативный EventEmitter — наборы с BlurView падали на импорте. Размытие в тестах не
// проверяется: хост-элемент с теми же детьми.
const React = require('react');

function BlurView({ children, ...props }) {
  return React.createElement('BlurView', props, children);
}

module.exports = { BlurView, default: BlurView };
