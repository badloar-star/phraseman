import { getSoundSettingsSnapshot, subscribeSoundSettings } from './sound_settings';

export class VoicePlaybackPolicy {
  private generation = 0;
  private readonly stopCallbacks = new Set<() => void>();

  constructor(private enabled: boolean) {}

  captureStart(): number | null {
    return this.enabled ? this.generation : null;
  }

  canStart(token: number | null): boolean {
    return token !== null && this.enabled && token === this.generation;
  }

  /**
   * Подписать источник звука на глушение по тумблеру «Озвучивание».
   *
   * зачем (аудит порядка загрузки, 2026-09-15): раньше при ВЫКЛЮЧЕННОМ голосе
   * подписка не сохранялась — обработчик вызывался один раз и терялся. Но
   * тумблер это СОСТОЯНИЕ, меняемое многократно, а регистрация считалась
   * разовым событием. Экран, смонтированный при выключенном голосе, навсегда
   * выпадал из списка глушения: после «включил → послушал → выключил» его звук
   * уже никто не останавливал. Сегодня это перекрывает арбитр владения, то есть
   * защита держалась на одном звене вместо двух — снятый предохранитель.
   *
   * Немедленный вызов при выключенном голосе сохранён: вызывающий вправе
   * ожидать тишины прямо сейчас. Теряется теперь только сам звук, а не подписка.
   */
  registerStop(stop: () => void): () => void {
    this.stopCallbacks.add(stop);
    if (!this.enabled) {
      try { stop(); } catch (e) {
      console.warn('[silent-catch] voice_playback_policy:registerStop', e instanceof Error ? e.message : String(e));
    }
    }
    return () => this.stopCallbacks.delete(stop);
  }

  setEnabled(enabled: boolean): void {
    if (enabled === this.enabled) return;
    this.enabled = enabled;
    this.generation += 1;
    if (enabled) return;
    for (const stop of Array.from(this.stopCallbacks)) {
      try { stop(); } catch (e) {
      console.warn('[silent-catch] voice_playback_policy:constructor', e instanceof Error ? e.message : String(e));
    }
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export const voicePlaybackPolicy = new VoicePlaybackPolicy(
  getSoundSettingsSnapshot().voiceEnabled,
);

subscribeSoundSettings(() => {
  voicePlaybackPolicy.setEnabled(getSoundSettingsSnapshot().voiceEnabled);
});

