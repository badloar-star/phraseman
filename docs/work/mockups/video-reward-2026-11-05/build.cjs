// vr_build.cjs — макет «Награда +500 за полный просмотр видео» на РЕАЛЬНЫХ кадрах (список «Видео», Главная с лентой, плеер, история «Открытие раздела»).
const fs = require('fs'); const sharp = require('C:/appsprojects/phraseman/node_modules/sharp'); const R = 'C:/appsprojects/phraseman/';
const OUT = R + 'docs/work/mockups/video-reward-2026-11-05/';
const b64 = (b, t) => 'data:' + t + ';base64,' + b.toString('base64');
(async () => {
  const jpg = async (f, w, q) => b64(await sharp(R + f).resize({ width: w }).jpeg({ quality: q || 80 }).toBuffer(), 'image/jpeg');
  const png = async (f, w) => b64(await sharp(R + f).resize({ width: w }).png().toBuffer(), 'image/png');
  const coin = async (n) => b64(await sharp(R + 'assets/images/coins/coin_rank_' + n + '.webp').resize({ width: 160 }).png().toBuffer(), 'image/png');
  const D = {
    list: await jpg('docs/design/v2-app/assets/real/now_video_graphite_dark.png', 900),
    home: await jpg('docs/phraseman-2.0/evidence/modals_1018/walk/04_dark_friends.png', 900),
    play: await jpg('docs/phraseman-2.0/evidence/full_check/c1_video2/p1_watch.png', 900),
    stDark: await png('docs/work/golden/approved-rev8/rev8-unlock-video-dark.png', 780),
    stLight: await png('docs/work/golden/approved-rev8/rev8-unlock-video-light.png', 780),
    c0: await coin('00'), c3: await coin('03'), c6: await coin('06'), c9: await coin('09'),
  };
  const tpl = fs.readFileSync(__dirname + '/vr_template.html', 'utf8');
  const html = tpl.replace('/*__DATA__*/', 'var DATA=' + JSON.stringify(D) + ';');
  fs.writeFileSync(OUT + 'video_reward.html', html); console.log('ok', (html.length / 1048576).toFixed(2), 'MB');
})();
