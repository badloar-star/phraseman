import type { TodayDestinationId, TodayLocalizedCopy } from './types';

export const TODAY_FALLBACK_RECOMMENDATION: Readonly<{
  ruleId: 'today.lessons.explore';
  destinationId: TodayDestinationId;
  variants: readonly { variantId: string; copy: TodayLocalizedCopy }[];
}> = {
  ruleId: 'today.lessons.explore',
  destinationId: 'lessons',
  variants: [
    { variantId: 'today.lessons.explore.a', copy: { ru: 'Выбери урок, который подходит твоему настроению сегодня.', uk: 'Обери урок, який пасує твоєму настрою сьогодні.', es: 'Elige una lección que encaje con tu ánimo de hoy.', 'pt-BR': 'Escolha uma lição que combine com seu ritmo de hoje.', vi: 'Chọn một bài học hợp với nhịp của bạn hôm nay.', id: 'Pilih pelajaran yang cocok dengan suasana hatimu hari ini.', tr: 'Bugünkü ruhuna uyan bir ders seç.', pl: 'Wybierz lekcję pasującą do twojego dzisiejszego nastroju.' } },
    { variantId: 'today.lessons.explore.b', copy: { ru: 'Открой урок, к которому хочется вернуться именно сегодня.', uk: 'Відкрий урок, до якого хочеться повернутися саме сьогодні.', es: 'Abre la lección a la que te apetece volver hoy.', 'pt-BR': 'Abra a lição à qual você quer voltar hoje.', vi: 'Mở bài học bạn muốn quay lại hôm nay.', id: 'Buka pelajaran yang ingin kamu ulang hari ini.', tr: 'Bugün dönmek istediğin dersi aç.', pl: 'Otwórz lekcję, do której chcesz dziś wrócić.' } },
  ],
};
