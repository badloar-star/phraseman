// Owner policy: production SFX/music is removed independently of user preferences and remote flags.
export function isProductionSfxMusicAllowed(): boolean {
  return false;
}

// зачем (владелец 11.11, «Да, открыть»): он прослушал лабораторию и выбрал звук для каждого события набора V2.
// Открыт ТОЛЬКО этот набор (modules/sound_v2): музыка празднований и старые эффекты pm.* без пары в V2 по-прежнему
// убраны функцией выше. Закрыть набор обратно — вернуть здесь false, остальной код не трогать.
// 11.11, вечер — владелец: «Вернуть тишину»: выбранные тогда звуки и два набора из нейросети ему не понравились на телефоне.
// 11.11, поздний вечер — владелец принял набор «Тёплые палочки» (записи живой маримбы, prototypes/sound-lab/set_mallets.py),
// выбрал вариант для каждого из 38 мест и велел: «все подключай». Выключатель открыт. Закрыть звук целиком — вернуть здесь false:
// тот же выключатель управляет и звуками в старых слотах (isOwnerChosenLegacySound).
const OWNER_CHOSEN_SOUNDS_ENABLED = true;

export function isProductionSoundV2Allowed(): boolean {
  return OWNER_CHOSEN_SOUNDS_ENABLED;
}

// зачем (владелец 11.11, «Да, подключай» про звуки старого набора): у этих 15 событий нет слота в наборе V2, поэтому
// выбранный в лаборатории звук лежит в их старом файле (assets/audio/sfx/v1) и играет старым путём. Разрешены ТОЛЬКО они:
// остальные старые эффекты и музыка по-прежнему убраны. Список = prototypes/sound-lab/apply_legacy_to_app.py.
// 11.11, поздний вечер: из 15 осталось 9 — начало урока, «не расслышали», тосты «получилось» и «сообщение», потеря попытки и
// переворот карточки убраны из набора по исследованию (частые или дублирующие события) и снова молчат.
const OWNER_CHOSEN_LEGACY_SOUND_EVENTS: ReadonlySet<string> = new Set([
  'pm.exam.begin', 'pm.learn.timer_warning', 'pm.learn.timer_expired',
  'pm.voice.record_ready',
  'pm.system.warning', 'pm.system.error_recoverable',
  'pm.social.friend_added', 'pm.dialog.victory', 'pm.dialog.retry',
]);

export function isOwnerChosenLegacySound(eventId: string): boolean {
  return OWNER_CHOSEN_SOUNDS_ENABLED && OWNER_CHOSEN_LEGACY_SOUND_EVENTS.has(eventId);
}
