# Известная проблема: tests/paywall_c_native_render.test.tsx не запускается (окружение jest), 05.11

- Что: тест падает при загрузке — `SyntaxError: Cannot use import statement outside a module`. Он берёт настоящий `react-native` через
  `jest.mock('react-native', () => jest.requireActual('react-native/index.js'))`, а в конфигурации jest этого репозитория нет пресета React Native
  (другие тесты компонентов подменяют `react-native` вручную). Тесты пейвола, не лезущие в настоящий react-native, зелёные.
- Не регрессия пейвола: падает на импорте до первого утверждения; смысл проверок (рендер плиток и дока C) закрыт контрактными тестами
  paywall_plan_rows_wiring, paywall_store_promo_price_contract, paywall_v3_source_contract и кадрами Сверки.
- Решение: не чинить окружение jest перед сборкой 150; вернуться — переписать тест на ручную подмену `react-native` (как tests/community_podium_navigation.test.tsx)
  или подключить пресет RN для отдельного проекта jest. Владелец зоны: Дизайн/Ядро.
