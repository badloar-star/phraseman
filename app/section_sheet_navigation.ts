// ════════════════════════════════════════════════════════════════════════════
// section_sheet_navigation.ts — опции native-stack для «шторок разделов».
//
// зачем: владелец задал стандарт (ориентир — Bevel): разделы внутри приложения
// открываются как модальная страница с выездом снизу и так же закрываются.
// presentation:'modal' даёт на iOS нативный pageSheet (скруглённые углы,
// подложенный назад предыдущий экран, системный свайп-вниз), на Android —
// полноэкранный модал с выездом снизу и обратным выездом на Back.
//
// Безопасность анимации: slide_from_bottom для MODAL-презентации — тот же
// класс перехода, что у продовых пейволов (paywallShared.tsx), он НЕ относится
// к card-push slide, ронявшему Android/Fabric (см. app/config.ts →
// ENABLE_SCREEN_TRANSITIONS). Гейт по флагу SECTION_SHEET_TRANSITIONS
// сохраняет требование Библии «переходы только через флаги config.ts».
// Контракт: tests/navigation_back_underlay_contract.test.ts.
// ════════════════════════════════════════════════════════════════════════════
import { Platform } from 'react-native';
import { SCREEN_FADE_TRANSITIONS, SECTION_SHEET_TRANSITIONS } from './config';

/** Fallback при выключенном kill-switch'ем выезде: как manage_subscription до
 *  редизайна — modal-презентация остаётся, анимация мягкий fade (iOS) / none. */
const SECTION_SHEET_FALLBACK_ANIMATION = SCREEN_FADE_TRANSITIONS && Platform.OS === 'ios'
  ? ({ animation: 'fade', animationDuration: 140 } as const)
  : ({ animation: 'none', animationDuration: 0 } as const);

export const SECTION_SHEET_STACK_OPTIONS = SECTION_SHEET_TRANSITIONS
  ? ({ presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: true } as const)
  : ({ presentation: 'modal', gestureEnabled: true, ...SECTION_SHEET_FALLBACK_ANIMATION } as const);
