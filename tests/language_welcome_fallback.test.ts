// зачем (аудит «назад» 26.10, зона 5 · ВХОД): «Новый язык» открывают из «Настроек», «Языка» и видео Lingman; запасной путь
// «назад» (когда истории нет) — корень раздела «Настройки», как в реестре ролей, а не «Язык».
import { readSource } from './helpers/read_source';

it('language_welcome: запасной путь «назад» — корень раздела Настроек', () => {
  const src = readSource('app/language_welcome.tsx');
  expect(src).toContain("safeRouterBack(router, '/(tabs)/settings' as never);");
  expect(src).not.toContain("safeRouterBack(router, '/settings_language'");
});
