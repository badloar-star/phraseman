'use strict';

module.exports = {
  preset: 'react-native',
  roots: ['<rootDir>/tests', '<rootDir>/components', '<rootDir>/app'],
  // зачем (координатор §47, 2026-10-01): наборы клиентского MAX сняты вместе с ним (D81);
  // два из них уже были удалены, но оставались в списке.
  // зачем (03.10): запись про удалённый tests/learning_v2_rune_flight_lifecycle.test.tsx убрана — раннер искал несуществующий файл,
  // а tests/text_integrity_primitives.test.tsx (сторож «каждая запись существует») из-за этого был красным.
  testMatch: [
    '<rootDir>/tests/text_integrity_primitives.test.tsx',
    '<rootDir>/tests/survey_offer_render.test.tsx',
    '<rootDir>/tests/survey_sheet_modal.test.tsx',
    '<rootDir>/tests/kit_touchable.test.tsx',
    '<rootDir>/tests/survey_flow_controller.test.tsx',
    '<rootDir>/tests/survey_screen_submission_behavior.test.tsx',
    '<rootDir>/tests/hybrid_sheet_shell_observer_runtime.test.tsx',
    '<rootDir>/tests/registration_prompt_modal_lifecycle.test.ts',
    '<rootDir>/tests/nickname_edit_modal_availability.test.tsx',
    '<rootDir>/tests/friends_together_dev_bots_sheet.test.tsx',
    '<rootDir>/tests/learning_v2_intro_reader_a.test.tsx',
    '<rootDir>/tests/ai_dialog_energy_target_remount.test.tsx',
    '<rootDir>/tests/friend_list_row.test.tsx',
    '<rootDir>/tests/friend_together_sheet.test.tsx',
    '<rootDir>/tests/avatar_view_v2_fallback.test.tsx',
    '<rootDir>/tests/home_rune_balance_render.test.tsx',
    // зачем (координатор §47, 2026-10-01): эти .test.tsx не стояли НИ В ОДНОМ testMatch —
    // ни основной конфиг (только **/*.test.ts), ни этот их не исполняли; «зелёный» был
    // иллюзией. Каждый новый .tsx-тест вписывать сюда поимённо.
    '<rootDir>/tests/fc_blitz_attempts_integration.test.tsx',
    '<rootDir>/tests/fc_speaking_attempts_integration.test.tsx',
    '<rootDir>/tests/fc_swipe_attempts_integration.test.tsx',
    '<rootDir>/tests/irregular_verbs_attempts_integration.test.tsx',
    '<rootDir>/tests/learning_v2_horizons_native.test.tsx',
    '<rootDir>/tests/learning_v2_new_word_encounter_overlay.test.tsx',
    '<rootDir>/tests/learning_v2_practice_viewport.test.tsx',
    '<rootDir>/tests/learning_v2_mode_feedback_lane.test.tsx',
    '<rootDir>/tests/lesson_session_attempts_integration.test.tsx',
    '<rootDir>/tests/lesson_words_attempts_integration.test.tsx',
    '<rootDir>/tests/mistake_practice_attempts_integration.test.tsx',
    '<rootDir>/tests/session_attempts_hud.test.tsx',
    '<rootDir>/tests/theme_selection_runtime.test.tsx',
    '<rootDir>/tests/use_session_attempts.test.tsx',
    '<rootDir>/tests/flashcard_grant_boot_maintenance_schedule.test.tsx',
    // зачем (координатор 13.10, башни лиг): бюджет узлов SVG ≤ +55 на каждую из 12 лиг — настоящая сборка SpireTowerSvg
    '<rootDir>/tests/spire_tower_skins_nodes.test.tsx',
    // зачем (координатор 14.10): общий персонаж-монета моментов v3 — все настроения рисуются, reduceMotion = статичная монета
    '<rootDir>/tests/moment_coin_contract.test.tsx',
    // зачем (координатор 15.10): замер каскада перерисовок вкладок — настоящая разметка, патчи TABS_RENDER в памяти
    '<rootDir>/tests/tabs_render_cascade_measure.test.tsx',
    // зачем (координатор 15.10, TABS_RENDER_2 + INSETS_MEMO): focusTick в своём контексте; insets — та же ссылка при тех же числах
    '<rootDir>/tests/tab_focus_tick_context.test.tsx',
    '<rootDir>/tests/stable_safe_area_insets_memo.test.tsx',
    // зачем (координатор 15.10, разбор красных): новые .test.tsx дня не стояли ни в одном раннере — сторож test_runner_coverage
    '<rootDir>/tests/combo_moment_m08.test.tsx',
    '<rootDir>/tests/dialogue_chain_m18.test.tsx',
    '<rootDir>/tests/dialogue_incoming_call_m16.test.tsx',
    '<rootDir>/tests/done_chain_m10.test.tsx',
    '<rootDir>/tests/lesson_boundary_context_plus.test.tsx',
    '<rootDir>/tests/moment_count_text_contract.test.tsx',
    '<rootDir>/tests/render_cause_probe.test.tsx',
    '<rootDir>/tests/speech_fail_block.test.tsx',
    '<rootDir>/tests/spire_rise_queue_p17.test.tsx',
    '<rootDir>/tests/use_guarded_nav_stable.test.tsx',
    '<rootDir>/tests/use_voice_attempt_gate.test.tsx',
    '<rootDir>/tests/voice_allowance_d194_contract.test.tsx',
  ],
  // Официальная настройка gesture-handler для jest (без неё — «RNGestureHandlerModule could not be found»).
  setupFiles: ['react-native-gesture-handler/jestSetup'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup_jest_write_guard.js'],
  transformIgnorePatterns: [
    '<rootDir>/tests/setup_jest_write_guard.js',
    // expo-* / @expo/* поставляются как ESM — без трансформации набор не загружался
    // (expo-linear-gradient, expo-blur, expo/virtual/env).
    // + react-native-* (reanimated mock.ts) и @react-navigation/* (через expo-router) — тоже ESM.
    // зачем (координатор 13.10, ночная регрессия 18959e709): под pnpm пакет лежит в
    // node_modules/.pnpm/<pkg@ver>/node_modules/<pkg>/ — после первого `node_modules/` стоит `.pnpm`, и прежний
    // паттерн игнорировал ВСЁ: react-native/jest/setup.js не трансформировался, раннер выполнял 0 тестов.
    // Необязательная приставка `.pnpm/<pkg@ver>/node_modules/` пропускает тот же список и в pnpm-размещении.
    // `@react-native(-[a-z-]+)?` вместо `(-community)?`: @react-native-masked-view (иконка энергии, HUD) — тоже ESM.
    'node_modules/(?!(\\.pnpm/[^/]+/node_modules/)?((jest-)?react-native(-[a-z-]+)?|@react-native(-[a-z-]+)?|@react-navigation/[a-z-]+|expo(-[a-z-]+)?|@expo(/[a-z-]+)?)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(png|jpg|jpeg|gif|svg|webp|avif|mp3|wav|m4a|ogg|aac|ttf|otf)$': '<rootDir>/tests/__mocks__/fileMock.js',
    '^expo-constants$': '<rootDir>/tests/__mocks__/expo-constants.js',
    '^expo-secure-store$': '<rootDir>/tests/__mocks__/expo-secure-store.js',
    '^expo-crypto$': '<rootDir>/tests/__mocks__/expo-crypto.js',
    '^expo-haptics$': '<rootDir>/tests/__mocks__/expo-haptics.js',
    // Официальный мок пакета: без нативного модуля импорт падал на PlatformLocalStorage.
    '^@react-native-async-storage/async-storage$': '@react-native-async-storage/async-storage/jest/async-storage-mock',
    // Нативные expo-модули (EventEmitter expo-modules-core) — простые хост-заглушки.
    '^expo-linear-gradient$': '<rootDir>/tests/__mocks__/expo-linear-gradient.js',
    '^expo-blur$': '<rootDir>/tests/__mocks__/expo-blur.js',
    '^expo/virtual/env$': '<rootDir>/tests/__mocks__/expo-virtual-env.js',
    '^@react-native-firebase/app$': '<rootDir>/tests/__mocks__/react-native-firebase-app.js',
    // зачем (координатор §48): остальные firebase-модули — ESM, заглушки уже лежат в
    // tests/__mocks__ (ими пользуется основной конфиг); reanimated — официальный мок.
    '^@react-native-firebase/functions$': '<rootDir>/tests/__mocks__/react-native-firebase-functions.js',
    '^@react-native-firebase/firestore$': '<rootDir>/tests/__mocks__/react-native-firebase-firestore.js',
    '^@react-native-firebase/auth$': '<rootDir>/tests/__mocks__/react-native-firebase-auth.js',
    '^react-native-reanimated$': 'react-native-reanimated/mock',
    '^expo-router$': '<rootDir>/tests/__mocks__/expo-router.js',
    '^expo-audio$': '<rootDir>/tests/__mocks__/expo-audio.js',
    '^expo-speech$': '<rootDir>/tests/__mocks__/expo-speech.js',
    // Отступы безопасной зоны без нативного провайдера (именованные экспорты).
    '^react-native-safe-area-context$': '<rootDir>/tests/__mocks__/react-native-safe-area-context.js',
  },
  forceExit: true,
  maxWorkers: 1,
};
