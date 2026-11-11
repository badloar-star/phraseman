// зачем (владелец 11.11, макет plus-screens-duo-2026-11-11): разметку экрана «Подписка» рисует ManageSubscriptionDuoView. Стенды-контракты
// экрана (tests/manage_subscription_*_liquid_glass*.test.mjs) собирают дерево без рендера, поэтому вложенный компонент надо раскрыть:
// этот помощник грузит НАСТОЯЩИЙ исходник вида (не муляж) с заглушками его зависимостей и даёт обход дерева, который вызывает компоненты-функции.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const VIEW_PATH = 'components/manage-subscription/ManageSubscriptionDuoView.tsx';
export const DUO_TIER_COLORS = { ultra: ['#FF7A59', '#FF5F8F', '#FF4FD0'], plus: ['#A99BFF', '#8E7CFF', '#5F90DB'] };
export const DUO_TIER_INK = { ultra: '#2B0717', plus: '#0F0A33' };

const nine = (...v) => ({ ru: v[0], uk: v[1], en: v[2], es: v[3], 'pt-BR': v[4], vi: v[5], id: v[6], tr: v[7], pl: v[8] });

/** Модуль настоящего вида для карты заглушек стенда: `modules['../components/manage-subscription/ManageSubscriptionDuoView'] = loadDuoViewModule(React)`. */
export function loadDuoViewModule(React) {
  const source = fs.readFileSync(VIEW_PATH, 'utf8');
  const react = { ...React, memo: component => component };
  const modules = {
    react: { __esModule: true, default: react, ...react },
    'react-native': {
      View: 'View', Text: 'Text', ActivityIndicator: 'ActivityIndicator',
      StyleSheet: { create: value => value, hairlineWidth: 0.5, absoluteFill: { position: 'absolute', inset: 0 } },
      useWindowDimensions: () => ({ width: 375, height: 780, fontScale: 1 }),
    },
    '@expo/vector-icons/Ionicons': { __esModule: true, default: 'Ionicons' },
    'react-native-svg': { __esModule: true, default: 'Svg', Defs: 'Defs', LinearGradient: 'SvgLinearGradient', Polygon: 'Polygon', Stop: 'Stop' },
    '../../app/subscription_tier': { SUBSCRIPTION_TIER_NAME: { plus: 'Plus', ultra: 'Ultra' } },
    '../paywall/duo/PaywallDuoHero': { DUO_TIER_COLORS, DUO_TIER_INK, PaywallDuoGlow: 'PaywallDuoGlow', PaywallDuoHero: 'PaywallDuoHero', useDuoTierMix: tier => ({ tier }) },
    '../paywall/duo/PaywallDuoPlans': { Sheen: 'Sheen' },
    '../paywall/PaywallPlusCopy': {
      LP: nine, pick: (lang, copy) => copy[lang] ?? copy.en,
      COPY: { year: nine('Год', 'Рік', 'Year', 'Año', 'Ano', 'Năm', 'Tahun', 'Yıllık', 'Rok'), month: nine('Месяц', 'Місяць', 'Month', 'Mes', 'Mês', 'Tháng', 'Bulan', 'Aylık', 'Miesiąc') },
    },
    '../SafeLinearGradient': { LinearGradient: 'LinearGradient' },
    '../v2/V2Pressable': { __esModule: true, default: 'V2Pressable' },
  };
  const output = ts.transpileModule(source, { fileName: VIEW_PATH, compilerOptions: { esModuleInterop: true, jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(output, { module: mod, exports: mod.exports, require: name => { assert.ok(name in modules, `view stub exists for ${name}`); return modules[name]; } }, { filename: VIEW_PATH });
  return mod.exports;
}

/** Обход дерева стенда: строковые типы — как раньше (по children), компоненты-функции вызываются со своими свойствами. */
export const visit = node => Array.isArray(node)
  ? node.flatMap(visit)
  : node && typeof node === 'object'
    ? [node, ...visit(typeof node.type === 'function' ? node.type(node.props) : node.props?.children)]
    : [];
