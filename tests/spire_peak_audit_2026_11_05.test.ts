// зачем (дизайн-аудит ночных новинок 05.11): рельса сужается при крупном шрифте, затемнение шторки — токен кита, строки топа компактные.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const num = (src: string, name: string): number => Number((src.match(new RegExp('export const ' + name + ' = (\\d+);')) ?? [])[1]);

describe('аудит экрана Пика B', () => {
  it('рельса башни уже при крупном шрифте и узком экране', () => {
    const screen = read('components/spire/peak/PeakScreenV2.tsx');
    expect(num(screen, 'PEAK_RAIL_WIDTH_NARROW')).toBeLessThan(num(screen, 'PEAK_RAIL_WIDTH'));
    // зачем (владелец 05.11, «1 в 1» с макетом B): башня ~31 % ширины экрана, но не уже узкой рельсы
    expect(screen).toContain('Math.max(PEAK_RAIL_WIDTH_NARROW, Math.round(width * 0.31))');
    expect(num(screen, 'PEAK_ROW_COIN_SIZE')).toBeLessThanOrEqual(36);
  });

  it('затемнение шторки рекорда — токен кита, без литерала непрозрачности', () => {
    const sheet = read('components/spire/peak/PeakStepSheet.tsx');
    expect(sheet).toContain('KIT_MOTION.dimOpacity');
    expect(sheet).not.toMatch(/rgba\(0,0,0,0\.\d+\)/);
  });

  it('пока комната не прочитана (members === null) — скелет топа и «—» вместо цифр', () => {
    const screen = read('components/spire/peak/PeakScreenV2.tsx');
    expect(screen).toContain('members === null ? <PeakTopSkeleton />');
    expect(screen).toContain('loading={members === null}');
    const counter = read('components/spire/peak/PeakMyCounter.tsx');
    expect(counter).toContain("loading ? '—' : spireGroupThousands(me.value)");
    const skeleton = read('components/spire/peak/PeakTopSkeleton.tsx');
    expect(skeleton).toContain('SkeletonPulse');
    expect(skeleton).toContain('PEAK_SKELETON_ROW_HEIGHT = 56');
    expect(skeleton).not.toMatch(/borderWidth|borderColor/);
  });

  it('кнопки тура не схлопываются (поля и minWidth), пилюля лиги переносится на две строки', () => {
    const tour = read('components/spire/peak/PeakTour.tsx');
    expect(tour).toMatch(/btn: \{[^}]*paddingHorizontal: 18/);
    expect(tour).toContain('main: { flex: 1, minWidth: 120 }');
    const screen = read('components/spire/peak/PeakScreenV2.tsx');
    // макет: «Гранит • ⏱ 4 д 5 ч» одной короткой пилюлей (иконка часов, лига и срок в одну строку)
    expect(screen).toContain('<Ionicons name="time-outline"');
    expect(screen).toContain('<Text numberOfLines={1} style={[s.pillText');
    expect(screen).not.toMatch(/adjustsFontSizeToFit/);
  });

  it('«Мои монеты/Моё место» — крупные цифры без подписей (подписи для диктора), тур отключается ?tour=off', () => {
    const counter = read('components/spire/peak/PeakMyCounter.tsx');
    expect(counter).not.toMatch(/label: \{/);
    expect(counter).toContain("spireGameText(lang, 'placeN', { n: me.place })");
    expect(counter).toContain('accessibilityLabel=');
    expect(read('components/spire/peak/PeakScreenV2.tsx')).toContain("tourProp ?? (peakTourDevOff() ? 'off' : 'auto')");
    expect(read('app/dev_spire_preview.tsx')).toContain("setPeakTourDevOff(params.tour === 'off'"); // зачем (05.11): условие расширено «|| params.state === 'welcome'» — проверяем смысл, а не закрывающую скобку
    // старый тур (state=tour) при ?peakB=1 не рисуется — вместо него новый (state=peak_tour)
    expect(read('app/dev_spire_preview.tsx')).toContain("state === 'tour' && params.peakB !== '1'");
  });

  it('полноэкранный тур Пика не меряет блоки экрана и показывается сразу после выдачи слота арбитром (макет peak_tour_full_approved, владелец 05.11)', () => {
    const screen = read('components/spire/peak/PeakScreenV2.tsx');
    expect(screen).toContain('<PeakTourFull');
    expect(screen).not.toContain("measure('layout')");
    expect(screen).not.toContain('measureBlock');
    expect(screen).toContain("useOverlayVisible('peakTour'");
  });

  it('пустой список «Все участники» показывает короткую строку, а не пустое место', () => {
    const all = read('components/spire/SpireAllMembers.tsx');
    expect(all).toContain("rows.length === 0 ?");
    expect(all).toContain("spireText(lang, 'allEmpty')");
    expect(read('components/spire/spire_strings.ts')).toContain('allEmpty:');
  });

  it('в новом экране Пика нет строки «Друзья на этой неделе» (макет B)', () => {
    expect(read('components/spire/SpireHomeScreen.tsx')).toContain('{peakScreenV2On() ? null : <SpireFriendsRow');
  });

  it('счётчик «ступени / место» переносит блоки целиком и не сжимает шрифт (слова не рвутся)', () => {
    const counter = read('components/spire/peak/PeakMyCounter.tsx');
    // макет: значок-монета + крупное число и ниже «12 место» отдельной строкой; шрифт не сжимается
    expect(counter).toContain('<RuneGlyph size={34} />');
    expect(counter).not.toContain('adjustsFontSizeToFit');
    expect(counter).not.toContain('numberOfLines');
  });
});
