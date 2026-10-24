import { triLang, type Lang } from '../constants/i18n';
import type { PremiumThemeId, PremiumThemeProgress } from './premium_theme_catalog';

type Copy = Readonly<Record<Lang, string>>;
type ThemeCopy = Readonly<{ title: Copy; joke: Copy }>;

const all = (ru: string, uk: string, en: string, es: string, pt: string, vi: string, id: string, tr: string, pl: string): Copy =>
  Object.freeze({ ru, uk, en, es, 'pt-BR': pt, vi, id, tr, pl });

const COPY: Readonly<Record<PremiumThemeId, ThemeCopy>> = Object.freeze({
  grad_full_olive: {
    title: all('Керамика открыта', 'Кераміку відкрито', 'Ceramic unlocked', 'Cerámica desbloqueada', 'Cerâmica desbloqueada', 'Ceramic unlocked', 'Keramik terbuka', 'Seramik açıldı', 'Ceramika odblokowana'),
    // зачем (30.09 «ТЕМЫ ВСЕ ФРИ», координатор 24.10): шутка про покупку Plus снята — тема не продаётся; новая — когда владелец назначит достижение
    joke: all('', '', '', '', '', '', '', '', ''),
  },
  grad_full_ref_signal_lime: {
    title: all('Обсидиан открыт', 'Обсидіан відкрито', 'Obsidian unlocked', 'Obsidiana desbloqueada', 'Obsidiana desbloqueada', 'Obsidian unlocked', 'Obsidian terbuka', 'Obsidyen açıldı', 'Obsydian odblokowany'),
    joke: all('Последний ранг монеты. Финансовый отдел приложения просит автограф.', 'Останній ранг монети. Фінансовий відділ застосунку просить автограф.', 'Final coin rank. The app’s finance department wants your autograph.', 'Último rango de moneda. Finanzas quiere tu autógrafo.', 'Último rank da moeda. O financeiro quer seu autógrafo.', 'Hạng xu cuối. Phòng tài chính của ứng dụng xin chữ ký.', 'Peringkat koin terakhir. Bagian keuangan minta tanda tanganmu.', 'Son jeton rütbesi. Finans departmanı imzanı istiyor.', 'Ostatnia ranga monety. Dział finansów prosi o autograf.'),
  },
  grad_full_ref_storm_violet: {
    title: all('Аметист открыт', 'Аметист відкрито', 'Amethyst unlocked', 'Amatista desbloqueada', 'Ametista desbloqueada', 'Amethyst unlocked', 'Ametis terbuka', 'Ametist açıldı', 'Ametyst odblokowany'),
    joke: all('365 дней. Погода внутри приложения теперь официально под твоим контролем.', '365 днів. Погода всередині застосунку тепер офіційно під твоїм контролем.', '365 days. The weather inside the app is officially under your control.', '365 días. El clima de la app está oficialmente bajo tu control.', '365 dias. O clima do app agora está sob seu controle.', '365 ngày. Thời tiết trong ứng dụng giờ chính thức do bạn điều khiển.', '365 hari. Cuaca di aplikasi kini resmi di bawah kendalimu.', '365 gün. Uygulamadaki hava artık resmen senin kontrolünde.', '365 dni. Pogoda w aplikacji jest oficjalnie pod twoją kontrolą.'),
  },
  grad_full_titanium: {
    title: all('Титан открыт', 'Титан відкрито', 'Titanium unlocked', 'Titanio desbloqueado', 'Titânio desbloqueado', 'Đã mở Titan', 'Titanium terbuka', 'Titanyum açıldı', 'Tytan odblokowany'),
    joke: all('Последняя башня взята. Лифт дальше не едет — зато тема приехала.', 'Останню вежу взято. Ліфт далі не їде — зате тема приїхала.', 'Final tower conquered. The elevator stops here, but your theme arrived.', 'Última torre conquistada. El ascensor para aquí, pero llegó tu tema.', 'Última torre conquistada. O elevador para aqui, mas o tema chegou.', 'Đã chinh phục tháp cuối. Thang máy dừng, còn chủ đề đã tới.', 'Menara terakhir ditaklukkan. Lift berhenti, temanya tiba.', 'Son kule fethedildi. Asansör durdu, tema geldi.', 'Ostatnia wieża zdobyta. Winda dalej nie jedzie, ale motyw dotarł.'),
  },
  grad_full_horizon: {
    title: all('Атмосфера открыта', 'Атмосферу відкрито', 'Atmosphere unlocked', 'Atmósfera desbloqueada', 'Atmosfera desbloqueada', 'Atmosphere unlocked', 'Atmosfer terbuka', 'Atmosfer açıldı', 'Atmosfera odblokowana'),
    joke: all('200 часов видео. Ты посмотрел дальше, чем смотрит горизонт.', '200 годин відео. Ти подивився далі, ніж бачить горизонт.', '200 video hours. You watched farther than the horizon can see.', '200 horas de vídeo. Viste más lejos que el horizonte.', '200 horas de vídeo. Você viu além do horizonte.', '200 giờ video. Bạn đã xem xa hơn cả đường chân trời.', '200 jam video. Kamu menonton melampaui cakrawala.', '200 saat video. Ufkun görebildiğinden daha uzağı izledin.', '200 godzin wideo. Zajrzałeś dalej niż horyzont.'),
  },
  grad_full_ref_gravity_blue: {
    title: all('Сингулярность открыта', 'Сингулярність відкрито', 'Singularity unlocked', 'Singularidad desbloqueada', 'Singularidade desbloqueada', 'Singularity unlocked', 'Singularitas terbuka', 'Tekillik açıldı', 'Osobliwość odblokowana'),
    joke: all('Весь Learning V2 пройден. Гравитация пыталась остановить тебя. Не вышло.', 'Увесь Learning V2 пройдено. Гравітація намагалася тебе зупинити. Не вийшло.', 'Learning V2 complete. Gravity tried to stop you. It failed.', 'Learning V2 completado. La gravedad intentó detenerte. Falló.', 'Learning V2 concluído. A gravidade tentou parar você. Falhou.', 'Đã hoàn thành Learning V2. Trọng lực đã cố ngăn bạn. Không thành.', 'Learning V2 selesai. Gravitasi mencoba menghentikanmu. Gagal.', 'Learning V2 tamamlandı. Yerçekimi seni durdurmaya çalıştı. Başaramadı.', 'Learning V2 ukończony. Grawitacja próbowała cię zatrzymać. Nie dała rady.'),
  },
});

export function premiumThemeUnlockCopy(themeId: PremiumThemeId, lang: Lang): Readonly<{ title: string; joke: string }> {
  const copy = COPY[themeId];
  return { title: triLang(lang, copy.title) ?? copy.title.en, joke: triLang(lang, copy.joke) ?? copy.joke.en };
}

const REQUIREMENT: Readonly<Record<PremiumThemeId, Copy>> = Object.freeze({
  // зачем (30.09, координатор 24.10): условие «покупка Plus» снято — тема скрыта из выбора до назначения достижения владельцем
  grad_full_olive: all('', '', '', '', '', '', '', '', ''),
  grad_full_ref_signal_lime: all('Последний ранг монеты', 'Останній ранг монети', 'Reach the final coin rank', 'Alcanza el último rango de moneda', 'Alcance o último rank da moeda', 'Đạt hạng xu cuối', 'Capai peringkat koin terakhir', 'Son jeton rütbesine ulaş', 'Osiągnij ostatnią rangę monety'),
  grad_full_ref_storm_violet: all('Серия 365 дней', 'Серія 365 днів', 'Reach a 365-day streak', 'Alcanza una racha de 365 días', 'Alcance uma série de 365 dias', 'Đạt chuỗi 365 ngày', 'Capai rentetan 365 hari', '365 günlük seriye ulaş', 'Osiągnij serię 365 dni'),
  grad_full_titanium: all('Достичь последнего Шпиля', 'Дістатися останнього Шпиля', 'Reach the final Spire', 'Alcanza el último Pináculo', 'Alcance o último Pináculo', 'Đạt Tháp cuối', 'Capai Puncak terakhir', 'Son Kuleye ulaş', 'Dotrzyj do ostatniej Iglicy'),
  grad_full_horizon: all('200 часов видео', '200 годин відео', 'Watch 200 hours of video', 'Mira 200 horas de vídeo', 'Assista a 200 horas de vídeo', 'Xem 200 giờ video', 'Tonton 200 jam video', '200 saat video izle', 'Obejrzyj 200 godzin wideo'),
  grad_full_ref_gravity_blue: all('Пройти весь Learning V2', 'Пройти весь Learning V2', 'Complete all of Learning V2', 'Completa todo Learning V2', 'Conclua todo o Learning V2', 'Hoàn thành toàn bộ Learning V2', 'Selesaikan seluruh Learning V2', 'Learning V2’nin tamamını bitir', 'Ukończ cały Learning V2'),
});

export function premiumThemeRequirement(themeId: PremiumThemeId, lang: Lang): string {
  const row = REQUIREMENT[themeId];
  return triLang(lang, row) ?? row.en;
}

const REWARD_SECTION = all('Темы', 'Теми', 'Themes', 'Temas', 'Temas', 'Themes', 'Tema', 'Temalar', 'Motywy');
const REQUIREMENT_LABEL = all('Условие', 'Умова', 'Requirement', 'Requisito', 'Requisito', 'Điều kiện', 'Syarat', 'Koşul', 'Warunek');
const PROGRESS_LABEL = all('Прогресс', 'Прогрес', 'Progress', 'Progreso', 'Progresso', 'Tiến độ', 'Progres', 'İlerleme', 'Postęp');
const PROGRESS_UNAVAILABLE = all('Прогресс временно недоступен', 'Прогрес тимчасово недоступний', 'Progress is temporarily unavailable', 'El progreso no está disponible temporalmente', 'O progresso está temporariamente indisponível', 'Tiến độ tạm thời không khả dụng', 'Progres sementara tidak tersedia', 'İlerleme geçici olarak kullanılamıyor', 'Postęp jest chwilowo niedostępny');

export function premiumThemeRewardSectionTitle(lang: Lang): string {
  return triLang(lang, REWARD_SECTION) ?? REWARD_SECTION.en;
}

export function premiumThemeRequirementLabel(lang: Lang): string {
  return triLang(lang, REQUIREMENT_LABEL) ?? REQUIREMENT_LABEL.en;
}

export function premiumThemeProgressLabel(lang: Lang): string {
  return triLang(lang, PROGRESS_LABEL) ?? PROGRESS_LABEL.en;
}

export function premiumThemeProgressUnavailable(lang: Lang): string {
  return triLang(lang, PROGRESS_UNAVAILABLE) ?? PROGRESS_UNAVAILABLE.en;
}

export function premiumThemeProgressValue(progress: PremiumThemeProgress, lang: Lang): string {
  const suffix = (() => {
    switch (progress.unit) {
      case 'days': return triLang(lang, all('дн.', 'дн.', 'days', 'días', 'dias', 'ngày', 'hari', 'gün', 'dni'));
      case 'hours': return triLang(lang, all('ч', 'год', 'h', 'h', 'h', 'giờ', 'jam', 'sa', 'godz.'));
      case 'sessions': return triLang(lang, all('сессий', 'сесій', 'sessions', 'sesiones', 'sessões', 'buổi', 'sesi', 'oturum', 'sesji'));
      case 'rank': return triLang(lang, all('ранг', 'ранг', 'rank', 'rango', 'rank', 'hạng', 'peringkat', 'rütbe', 'ranga'));
      case 'tier': return triLang(lang, all('уровень', 'рівень', 'tier', 'nivel', 'nível', 'bậc', 'tingkat', 'seviye', 'poziom'));
      case 'purchase': return triLang(lang, all('покупка', 'покупка', 'purchase', 'compra', 'compra', 'lần mua', 'pembelian', 'satın alma', 'zakup'));
      default: return '';
    }
  })();
  return `${progress.current} / ${progress.target}${suffix ? ` ${suffix}` : ''}`;
}

