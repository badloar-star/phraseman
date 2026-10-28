// learning_v2_locale_guard.tsx — общий замок маршрута Learning V2: курс скрыт (рубильник или язык без пояснений курса) → на Главную.
// зачем (координатор 28.10, Переводчик: курс есть только на ru/uk, localized() для остальных языков подставляет русский): каждый маршрут V2
// обязан проверять язык интерфейса, иначе ссылка, уведомление или «Продолжить» откроют русский текст человеку на en/es/…. Обёртка без хуков —
// решение «скрыт» может поменяться при смене языка, а число хуков внутреннего экрана от этого не меняется.
import React, { type ComponentType } from 'react';
import { Redirect } from 'expo-router';
import { LEARNING_V2_HIDDEN_REDIRECT, isLearningV2Hidden, logLearningV2Hidden } from './learning_v2_visibility_switch';

export function withLearningV2LocaleGuardV1<P extends object>(entry: string, Screen: ComponentType<P>): ComponentType<P> {
  function LearningV2LocaleGuarded(props: P) {
    if (isLearningV2Hidden()) {
      logLearningV2Hidden(entry, LEARNING_V2_HIDDEN_REDIRECT);
      return <Redirect href={LEARNING_V2_HIDDEN_REDIRECT} />;
    }
    return <Screen {...props} />;
  }
  LearningV2LocaleGuarded.displayName = `LearningV2LocaleGuarded(${Screen.displayName ?? Screen.name ?? entry})`;
  return LearningV2LocaleGuarded;
}
