// зачем (координатор §47, 2026-10-01): expo-linear-gradient тянет нативный
// EventEmitter из expo-modules-core — в jest.rntl.config наборы падали на импорте
// («Cannot read properties of undefined (reading 'EventEmitter')»), не дойдя до
// проверок. Градиент в тестах не нужен: хост-элемент с теми же детьми.
const React = require('react');

function LinearGradient({ children, ...props }) {
  return React.createElement('LinearGradient', props, children);
}

module.exports = { LinearGradient };
