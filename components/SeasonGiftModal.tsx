// ════════════════════════════════════════════════════════════════════════════
// SeasonGiftModal.tsx — модалка получения награды Season Pass. У КАЖДОГО вида
// свой контент (владелец, 2026-08-03: «все должны иметь свои модалки уникальные,
// как дни премиума»): заголовок, описание эффекта, арт; спец-сценарии — выбор
// 1-из-3, отправка щита другу, золотая целебрация дней Plus, финал с живым
// переливом ника (MaskedView, тот же приём пойдёт в лидерборды).
// Кнопки «Позже»/«Применить» — слова 1:1 с components/LevelGiftModal.tsx.
// ════════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, FlatList, Image, ImageSourcePropType, Modal, Text, TouchableOpacity, View } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from './SafeLinearGradient';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import type { Theme, ThemeMode } from '../constants/theme';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { emitAppEvent, actionToastTri } from '../app/events';
import { pearlIconForTheme } from '../app/coin_icons';
import { markSeasonPassGiftUsed } from '../app/season_pass_gift_inventory';
import {
  seasonRedeemConsumableOnServer,
  seasonSendFriendShieldOnServer,
} from '../app/season_pass_server';
import {
  applySeasonRewardLocal,
  type ApplySeasonRewardResult,
} from '../app/season_reward_apply';
import {
  SEASON_AURA_STAGE_NAMES,
  getSeasonAuraStageAsset,
  getSeasonRewardIcon,
  getSeasonSecretAuraAsset,
  seasonAuraStageIndex,
  type SeasonReward,
} from '../app/season_pass_track_config';
import type { FriendEntry } from '../app/firestore_friend_requests';
import { friendsAccountStore } from '../app/friends_account_store';
import { FlowText } from './text-integrity/FlowText';
import { leaguePublicName } from '../app/league_public_name';
import SeasonAuraRing from './SeasonAuraRing';
import HybridAlertShell from './modal_fx/HybridAlertShell';
import RewardImpactRings from './celebration/RewardImpactRings';
import { useRewardImpactHybrid } from './celebration/use_reward_impact_hybrid';

const STATUS_KINDS: ReadonlySet<SeasonReward['kind']> = new Set([
  'frame', 'aura_stage', 'aura_secret', 'nick_color', 'custom_avatar', 'card_pack', 'season_finale', 'plus_days',
]);

export type Tri = Record<Lang, string>;
const T = (ru: string, uk: string, es: string, ptBR: string, vi: string, id: string, tr: string, pl: string): Tri =>
  ({ ru, uk, es, 'pt-BR': ptBR, vi, id, tr, pl });

/**
 * Уникальные тексты модалок: заголовок, что делает награда ДО применения и что
 * написано ПОСЛЕ.
 *
 * зачем 2026-08-03 (владелец: «при нажатии применить модалка просто мограет и
 * всё, никакого нового состояния, а обязано смениться и быть написано, что буст
 * такой-то бла-бла-бла действует столько-то»): после «Применить» экран оставлял
 * прежний текст и одну кнопку «Отлично» — игрок не понимал, сработало ли вообще
 * и на сколько. `applied` — отдельная строка на каждый подарок: что включилось
 * и на какой срок.
 */
export const SEASON_MODAL_COPY: Record<SeasonReward['kind'], { title: Tri; desc: Tri; applied: Tri }> = {
  pearls: {
    title: T('Жемчужины!', 'Перлини!', '¡Perlas!', 'Pérolas!', 'Ngọc trai!', 'Mutiara!', 'İnciler!', 'Perły!'),
    // зачем 2026-08-04 (владелец: «упадут на баланс» — жаргон, юмора нет ни в
    // одном desc): переписано на живую фразу с самоиронией вместо технического
    // «упадут на баланс» — сам факт (жемчужины на счёт, тратятся в магазине
    // и на бусты) сохранён без искажений.
    desc: T('Звенят в кошельке, ждут своего магазина или буста.', 'Дзвенять у гаманці, чекають на свій магазин чи буст.', 'Sonarán en tu monedero, listas para la tienda o un impulso.', 'Vão tilintar no seu bolso, prontas para a loja ou um impulso.', 'Sẽ kêu leng keng trong ví, chờ cửa hàng hoặc tăng tốc.', 'Akan berdenting di dompet, siap buat toko atau boost.', 'Cüzdanında şıngırdayacak, mağaza ya da destek için hazır.', 'Zabrzęczą w portfelu, gotowe na sklep albo boost.'),
    applied: T('Жемчужины у вас на счету. Проценты не начисляем — но и не забираем обратно.', 'Перлини на вашому рахунку.', 'Perlas en tu saldo. Sin intereses, pero tampoco se pierden.', 'Pérolas no saldo. Sem juros, mas sem perdas.', 'Ngọc trai đã vào tài khoản.', 'Mutiara sudah masuk saldo.', 'İnciler hesabında.', 'Perły na koncie.'),
  },
  battery: {
    title: T('Запасная батарея', 'Запасна батарея', 'Batería de reserva', 'Bateria reserva', 'Pin dự phòng', 'Baterai cadangan', 'Yedek batarya', 'Zapasowa bateria'),
    desc: T('Заряжает энергию под завязку одним нажатием. Держите до момента «энергия кончилась в самый неподходящий раз».', 'Заряджає енергію по вінця одним натисканням. Тримайте до моменту «енергія скінчилась у найгірший момент».', 'Recarga la energía al máximo con un toque. Guárdala para cuando se agote en el peor momento.', 'Recarrega a energia ao máximo com um toque. Guarde para quando acabar na pior hora.', 'Sạc đầy năng lượng chỉ bằng một chạm. Cất dành lúc năng lượng cạn vào thời điểm tệ nhất.', 'Isi penuh energi dengan sekali tap. Simpan untuk saat energi habis di waktu terburuk.', 'Tek dokunuşla enerjiyi doldurur. En kötü anda bitmesi için sakla.', 'Ładuje energię do pełna jednym dotknięciem. Trzymaj na moment, gdy zabraknie jej najgorzej.'),
    applied: T('Энергия заряжена под завязку. Отговорки закончились раньше энергии.', 'Енергія по вінця. Виправдання скінчилися раніше за енергію.', 'Energía al máximo. Ya no hay excusas.', 'Energia no máximo. Sem mais desculpas.', 'Năng lượng đầy. Hết cớ rồi nhé.', 'Energi penuh. Tak ada alasan lagi.', 'Enerji tam dolu. Bahane kalmadı.', 'Energia po brzegi. Koniec wymówek.'),
  },
  // зачем 2026-08-04: код (league_personal_boosts.ts, id x2_eod_pass) считает
  // durationMs = «до ЛОКАЛЬНОЙ полуночи», а не 72 часа — старый applied врал
  // про 72 часа. Текст исправлен на факт: буст живёт до конца сегодняшнего дня.
  league_boost: {
    title: T('Буст лиги ×2', 'Буст ліги ×2', 'Impulso de liga ×2', 'Impulso de liga ×2', 'Tăng tốc giải ×2', 'Dorongan liga ×2', 'Lig desteği ×2', 'Boost ligi ×2'),
    desc: T('Удваивает очки лиги до конца сегодняшнего дня. Соперники узнают об этом позже вас.', 'Подвоює очки ліги до кінця сьогоднішнього дня. Суперники дізнаються про це пізніше за вас.', 'Duplica los puntos de liga hasta el final del día. Tus rivales se enterarán después que tú.', 'Dobra os pontos da liga até o fim do dia. Seus rivais vão saber depois de você.', 'Nhân đôi điểm giải đấu đến hết ngày hôm nay. Đối thủ biết tin sau bạn.', 'Melipatgandakan poin liga sampai akhir hari ini. Rival tahu belakangan.', 'Bugünün sonuna kadar lig puanlarını ikiye katlar. Rakiplerin bunu senden sonra öğrenecek.', 'Podwaja punkty ligi do końca dzisiejszego dnia. Rywale dowiedzą się później niż Ty.'),
    applied: T('Очки лиги идут вдвойне до конца сегодняшнего дня. Соперники по таблице ещё не в курсе.', 'Очки ліги йдуть удвічі до кінця сьогоднішнього дня.', 'Puntos de liga al doble hasta el final del día.', 'Pontos de liga em dobro até o fim do dia.', 'Điểm giải đấu nhân đôi đến hết ngày hôm nay.', 'Poin liga dua kali lipat sampai akhir hari ini.', 'Lig puanları bugünün sonuna kadar iki katı.', 'Punkty ligi podwójnie do końca dzisiejszego dnia.'),
  },
  club_totem: {
    title: T('Тотем клуба', 'Тотем клубу', 'Tótem del club', 'Totem do clube', 'Vật tổ câu lạc bộ', 'Totem klub', 'Kulüp totemi', 'Totem klubu'),
    desc: T('Бесплатный буст на всю вашу группу лиги. Активируется в клубе — и все узнают, кому сказать спасибо.', 'Безплатний буст на всю вашу групу ліги. Активується в клубі — і всі дізнаються, кому дякувати.', 'Impulso gratis para todo tu grupo de liga. Se activa en el club, y todos sabrán a quién agradecer.', 'Impulso grátis para todo o seu grupo de liga. Ativado no clube — todos vão saber a quem agradecer.', 'Tăng tốc miễn phí cho cả nhóm giải đấu. Kích hoạt trong câu lạc bộ — mọi người sẽ biết cảm ơn ai.', 'Boost gratis untuk seluruh grup ligamu. Diaktifkan di klub — semua tahu harus berterima kasih ke siapa.', 'Tüm lig grubuna ücretsiz destek. Kulüpte etkinleştirilir — kime teşekkür edeceklerini herkes bilecek.', 'Darmowy boost dla całej Twojej grupy ligi. Aktywowany w klubie — wszyscy będą wiedzieć, komu dziękować.'),
    applied: T('Тотем ждёт в клубе — активируйте его там. Клуб станет заметнее, а вы — причиной этого.', 'Тотем чекає в клубі — активуйте його там.', 'Tótem listo en el club: actívalo allí.', 'Totem pronto no clube: ative-o lá.', 'Vật tổ đang chờ trong câu lạc bộ — kích hoạt tại đó.', 'Totem menunggu di klub — aktifkan di sana.', 'Totem kulüpte hazır — orada etkinleştirin.', 'Totem czeka w klubie — aktywujcie go tam.'),
  },
  golden_lesson: {
    title: T('Золотой урок', 'Золотий урок', 'Lección dorada', 'Lição dourada', 'Bài học vàng', 'Pelajaran emas', 'Altın ders', 'Złota lekcja'),
    desc: T('Утраивает опыт за один пройденный урок — какой именно, выбираете сами. Заряд ждёт своего часа.', 'Потроює досвід за один пройдений урок — який саме, обираєте самі. Заряд чекає свого часу.', 'Triplica la XP de una lección: tú eliges cuál. La carga espera su momento.', 'Triplica o XP de uma lição: você escolhe qual. A carga espera o momento certo.', 'Nhân ba XP cho một bài học — bạn chọn bài nào. Điện tích chờ đúng lúc.', 'Melipatgandakan XP satu pelajaran ×3 — kamu yang pilih yang mana. Muatan menunggu saatnya.', 'Bir dersin XP\'sini üçe katlar — hangisi olduğuna sen karar verirsin. Şarj sırasını bekliyor.', 'Potraja XP z jednej lekcji — Ty wybierasz, której. Ładunek czeka na swój moment.'),
    applied: T('Заряд активен. Следующий пройденный урок принесёт золотой опыт — один-единственный раз.', 'Заряд активний. Наступний урок принесе золотий досвід — лише один раз.', 'Cargado. La próxima lección dará XP dorada, una sola vez.', 'Carregado. A próxima lição dará XP dourada, uma única vez.', 'Đã sẵn sàng. Bài học tiếp theo cho XP vàng — chỉ một lần.', 'Aktif. Pelajaran berikutnya memberi XP emas — sekali saja.', 'Yüklü. Bir sonraki ders altın XP verir — sadece bir kez.', 'Naładowane. Następna lekcja da złote XP — tylko raz.'),
  },
  // зачем 2026-08-04: functions/src/season_pass.ts:159 фиксирует срок магнита
  // 24 часа с момента активации (a не 72, как было в старом applied).
  collection_magnet: {
    title: T('Магнит коллекции', 'Магніт колекції', 'Imán de colección', 'Ímã de coleção', 'Nam châm bộ sưu tập', 'Magnet koleksi', 'Koleksiyon mıknatısı', 'Magnes kolekcji'),
    desc: T('24 часа с момента активации карточки сокровищницы будут находиться вдвое чаще — притягиваются, как магнитом.', '24 години з моменту активації картки скарбниці траплятимуться вдвічі частіше — притягуються, мов магнітом.', '24 horas desde la activación, las cartas del tesoro aparecerán el doble de veces: como imantadas.', '24 horas a partir da ativação, as cartas do tesouro vão aparecer o dobro das vezes — como se fossem imantadas.', '24 giờ kể từ khi kích hoạt, thẻ kho báu xuất hiện nhiều gấp đôi — như bị nam châm hút.', '24 jam sejak diaktifkan, kartu harta akan muncul dua kali lebih sering — seolah tertarik magnet.', 'Etkinleştirmeden itibaren 24 saat boyunca hazine kartları iki katı sıklıkla çıkar — mıknatıs gibi çeker.', '24 godziny od aktywacji karty skarbca będą trafiać się dwa razy częściej — jakby przyciągał je magnes.'),
    applied: T('Магнит включён на 24 часа. Карточки сами липнут к вам — физика бессильна.', 'Магніт увімкнено на 24 години. Картки самі липнуть до вас.', 'Imán activo 24 h. Las cartas se pegan solas.', 'Ímã ativo por 24 h. As cartas grudam sozinhas.', 'Nam châm hoạt động 24 giờ. Thẻ tự dính vào bạn.', 'Magnet aktif 24 jam. Kartu menempel sendiri.', 'Mıknatıs 24 saat aktif. Kartlar kendiliğinden yapışıyor.', 'Magnes aktywny 24 h. Karty same się kleją.'),
  },
  // зачем 2026-08-04: applyTurboRegenOverride (boon_effects_energy.ts:36-38)
  // ставит истечение на конец текущих UTC-суток — старый applied обещал
  // 72 часа, что не совпадает с реализацией.
  turbo_regen: {
    title: T('Второе дыхание', 'Друге дихання', 'Segundo aliento', 'Segundo fôlego', 'Hồi phục nhanh', 'Napas kedua', 'İkinci nefes', 'Drugi oddech'),
    desc: T('До конца сегодняшнего дня энергия восстанавливается вдвое быстрее — как будто у батарейки открылось второе дыхание.', 'До кінця сьогоднішнього дня енергія відновлюється вдвічі швидше — ніби в батарейки відкрилося друге дихання.', 'Hasta el final del día la energía se recupera el doble de rápido, como si la batería tuviera un segundo aliento.', 'Até o fim do dia a energia recupera duas vezes mais rápido, como se a bateria tivesse fôlego extra.', 'Đến hết ngày hôm nay, năng lượng hồi phục nhanh gấp đôi — như pin vừa có thêm hơi thở thứ hai.', 'Sampai akhir hari ini, energi pulih dua kali lebih cepat — seolah baterainya dapat napas kedua.', 'Bugünün sonuna kadar enerji iki kat hızlı dolar — sanki pilin ikinci bir nefesi var.', 'Do końca dzisiejszego dnia energia regeneruje się dwa razy szybciej — jakby bateria złapała drugi oddech.'),
    applied: T('Энергия восстанавливается вдвое быстрее до конца сегодняшнего дня. Отдышка отменяется.', 'Енергія відновлюється вдвічі швидше до кінця сьогоднішнього дня.', 'La energía se recupera el doble de rápido hasta el final del día.', 'A energia recarrega duas vezes mais rápido até o fim do dia.', 'Năng lượng hồi phục nhanh gấp đôi đến hết ngày hôm nay.', 'Energi pulih dua kali lebih cepat sampai akhir hari ini.', 'Enerji bugünün sonuna kadar iki kat hızlı doluyor.', 'Energia regeneruje się dwa razy szybciej do końca dzisiejszego dnia.'),
  },
  // зачем 2026-08-04: functions/src/season_pass.ts:160 — билет сгорает через
  // 72 часа после выдачи, если не использован. Старый текст об этом молчал.
  tournament_ticket: {
    title: T('Билет на турнир', 'Квиток на турнір', 'Entrada al torneo', 'Ingresso do torneio', 'Vé giải đấu', 'Tiket turnamen', 'Turnuva bileti', 'Bilet na turniej'),
    desc: T('Пропускает мимо кассы — один вход в турнир без ставки жемчужин. На раздумья 72 часа, потом билет сгорает.', 'Проводить повз касу — один вхід у турнір без ставки перлин. На роздуми 72 години, потім квиток згорає.', 'Te salta la caja: una entrada al torneo sin apostar perlas. Tienes 72 h para decidirte antes de que caduque.', 'Passa direto pelo caixa: uma entrada no torneio sem apostar pérolas. Você tem 72 h antes de expirar.', 'Đi tắt qua quầy vé — một lần vào giải không cần cược ngọc. Có 72 giờ để cân nhắc trước khi hết hạn.', 'Lewat langsung dari loket — sekali masuk turnamen tanpa taruhan mutiara. Ada 72 jam sebelum hangus.', 'Kasadan bedava geçiş — inci yatırmadan bir turnuva girişi. Süresi dolmadan önce 72 saatiniz var.', 'Omija kasę — jedno wejście na turniej bez stawki pereł. Masz 72 h, zanim wygaśnie.'),
    applied: T('Билет в кармане — 72 часа на то, чтобы прийти. Не опоздайте.', 'Квиток у кишені — 72 години, щоб прийти. Не спізніться.', 'Entrada en el bolsillo: 72 h para presentarte. No llegues tarde.', 'Ingresso no bolso: 72 h para aparecer. Não se atrase.', 'Vé đã có — 72 giờ để tham dự. Đừng trễ hẹn.', 'Tiket di tangan — 72 jam untuk hadir. Jangan telat.', 'Bilet cepte — katılmak için 72 saat. Geç kalmayın.', 'Bilet w kieszeni — 72 h na start. Nie spóźnijcie się.'),
  },
  time_machine: {
    title: T('Машина времени', 'Машина часу', 'Máquina del tiempo', 'Máquina do tempo', 'Cỗ máy thời gian', 'Mesin waktu', 'Zaman makinesi', 'Wehikuł czasu'),
    desc: T('Латает вчерашнюю дыру в серии — как будто вчера всё было под контролем.', 'Латає вчорашню діру в серії — ніби вчора все було під контролем.', 'Repara el hueco de ayer en tu racha, como si ayer todo hubiera estado bajo control.', 'Conserta a falha de ontem na sua sequência, como se ontem tudo estivesse sob controle.', 'Vá lại lỗ hổng hôm qua trong chuỗi — như thể hôm qua mọi thứ vẫn trong tầm kiểm soát.', 'Menambal lubang kemarin di rangkaianmu — seolah kemarin semua terkendali.', 'Dünkü seri boşluğunu yamalar — sanki dün her şey kontrol altındaymış gibi.', 'Łata wczorajszą dziurę w serii — jakby wczoraj wszystko było pod kontrolą.'),
    applied: T('Серия восстановлена. Вчерашний пропуск официально не считается.', 'Серію відновлено. Вчорашній пропуск офіційно не рахується.', 'Racha restaurada. Lo de ayer no cuenta.', 'Sequência restaurada. Ontem não conta.', 'Chuỗi đã khôi phục. Hôm qua không tính.', 'Rangkaian pulih. Kemarin tidak dihitung.', 'Seri geri geldi. Dün sayılmıyor.', 'Seria przywrócona. Wczoraj się nie liczy.'),
  },
  friend_shield: {
    title: T('Щит другу', 'Щит другові', 'Escudo para un amigo', 'Escudo para um amigo', 'Khiên cho bạn', 'Perisai untuk teman', 'Arkadaşa kalkan', 'Tarcza dla znajomego'),
    desc: T('Один день защиты серии для друга по вашему выбору. Дороже цветов, дешевле извинений.', 'Один день захисту серії для друга на ваш вибір. Дорожче за квіти, дешевше за вибачення.', 'Un día de protección de racha para el amigo que elijas. Más caro que unas flores, más barato que disculparte.', 'Um dia de proteção de sequência para o amigo que você escolher. Mais caro que flores, mais barato que um pedido de desculpas.', 'Một ngày bảo vệ chuỗi cho người bạn bạn chọn. Đắt hơn hoa, rẻ hơn lời xin lỗi.', 'Satu hari perlindungan runtunan untuk teman pilihanmu. Lebih mahal dari bunga, lebih murah dari permintaan maaf.', 'Seçtiğin arkadaşına bir günlük seri koruması. Çiçekten pahalı, özürden ucuz.', 'Jeden dzień ochrony serii dla wybranego znajomego. Droższe niż kwiaty, tańsze niż przeprosiny.'),
    applied: T('Щит отправлен. Друг спасён — и наверняка это заметит.', 'Щит надіслано. Друг врятований — і напевно це помітить.', 'Escudo enviado. Tu amigo está a salvo.', 'Escudo enviado. Seu amigo está salvo.', 'Đã gửi khiên. Bạn của bạn an toàn.', 'Perisai terkirim. Temanmu aman.', 'Kalkan gönderildi. Arkadaşın kurtuldu.', 'Tarcza wysłana. Znajomy uratowany.'),
  },
  choice_3: {
    title: T('Выбор из трёх', 'Вибір із трьох', 'Elige una de tres', 'Escolha uma de três', 'Chọn một trong ba', 'Pilih satu dari tiga', 'Üçten birini seç', 'Wybór z trzech'),
    desc: T('Три награды разложены перед вами — заберёте только одну. Вечная дилемма в миниатюре.', 'Три нагороди розкладені перед вами — заберете лише одну. Вічна дилема в мініатюрі.', 'Tres recompensas sobre la mesa: solo te llevas una. El dilema eterno, en miniatura.', 'Três recompensas na mesa: você só leva uma. O dilema eterno, em miniatura.', 'Ba phần thưởng bày sẵn — bạn chỉ lấy được một. Nan đề muôn thuở, phiên bản thu nhỏ.', 'Tiga hadiah terpampang — kamu cuma bisa ambil satu. Dilema abadi versi mini.', 'Önünde üç ödül var — sadece birini alabilirsin. Ezeli ikilemin küçük hali.', 'Trzy nagrody na wyciągnięcie ręki — bierzecie tylko jedną. Odwieczny dylemat w miniaturze.'),
    applied: T('Выбор сделан, обратного пути нет. Но ведь вы не жалеете?', 'Вибір зроблено, шляху назад немає. Але ж ви не шкодуєте?', 'Elección hecha, no hay vuelta atrás.', 'Escolha feita, sem volta.', 'Đã chọn xong, không quay lại được.', 'Pilihan dibuat, tak bisa mundur.', 'Seçim yapıldı, geri dönüş yok.', 'Wybór dokonany, nie ma odwrotu.'),
  },
  xp_bank: {
    title: T('Банк опыта', 'Банк досвіду', 'Banco de XP', 'Banco de XP', 'Ngân hàng XP', 'Bank XP', 'XP bankası', 'Bank XP'),
    desc: T('Открывает счёт, с которого каждый следующий урок снимает опыт вдвойне — пока баланс не обнулится.', 'Відкриває рахунок, з якого кожен наступний урок знімає досвід удвічі — поки баланс не обнулиться.', 'Abre una cuenta de la que cada lección retira XP doble, hasta que el saldo llegue a cero.', 'Abre uma conta da qual cada lição seguinte saca XP em dobro, até o saldo zerar.', 'Mở một tài khoản mà mỗi bài học tiếp theo rút gấp đôi XP — cho đến khi hết số dư.', 'Membuka rekening yang setiap pelajaran berikutnya menarik XP dua kali lipat — sampai saldo nol.', 'Her sonraki dersin iki katı XP çektiği bir hesap açar — bakiye sıfırlanana dek.', 'Otwiera konto, z którego każda kolejna lekcja pobiera podwójne XP — aż saldo spadnie do zera.'),
    applied: T('Опыт зачислен в банк — расходуется автоматически на каждый следующий урок, пока не закончится.', 'Досвід зарахований до банку — витрачається автоматично, поки не закінчиться.', 'XP en el banco: se gasta automáticamente hasta agotarse.', 'XP no banco: é gasto automaticamente até acabar.', 'XP đã vào ngân hàng — tự động dùng đến khi hết.', 'XP masuk bank — terpakai otomatis sampai habis.', 'XP bankaya yatırıldı — bitene kadar otomatik harcanır.', 'XP w banku — wydawane automatycznie, aż się skończy.'),
  },
  plus_days: {
    title: T('Дни Plus', 'Дні Plus', 'Días Plus', 'Dias Plus', 'Ngày Plus', 'Hari Plus', 'Plus günleri', 'Dni Plus'),
    desc: T('Включает полный доступ Plus на отведённый срок: безлимит энергии и всё остальное — без подписки, без карты.', 'Вмикає повний доступ Plus на відведений термін: безліміт енергії і все інше — без підписки, без картки.', 'Activa el acceso Plus completo por el tiempo indicado: energía ilimitada y más, sin suscripción ni tarjeta.', 'Ativa o acesso Plus completo pelo tempo indicado: energia ilimitada e mais, sem assinatura, sem cartão.', 'Kích hoạt toàn quyền Plus trong thời gian quy định: năng lượng không giới hạn và hơn thế — không cần đăng ký, không cần thẻ.', 'Mengaktifkan akses Plus penuh selama masa berlaku: energi tanpa batas dan lainnya — tanpa langganan, tanpa kartu.', 'Belirtilen süre boyunca tam Plus erişimini açar: sınırsız enerji ve fazlası — abonelik yok, kart yok.', 'Aktywuje pełny dostęp Plus na wyznaczony czas: nielimitowana energia i reszta — bez subskrypcji, bez karty.'),
    applied: T('Plus активирован на весь срок. Наслаждайтесь, пока дни идут.', 'Plus активовано на весь термін. Насолоджуйтесь, поки дні йдуть.', 'Plus activado por todo el período. Disfrútalo mientras dure.', 'Plus ativado pelo período todo. Aproveite enquanto dura.', 'Đã bật Plus trọn thời hạn. Tận hưởng nhé.', 'Plus aktif untuk seluruh masa berlaku. Nikmati selagi ada.', 'Plus, süresi boyunca etkin. Tadını çıkarın.', 'Plus włączony na cały okres. Korzystajcie.'),
  },
  frame: {
    title: T('Визитка', 'Візитка', 'Tarjeta de perfil', 'Cartão de perfil', 'Thẻ hồ sơ', 'Kartu profil', 'Profil kartı', 'Wizytówka'),
    desc: T('Сезонное оформление всей вашей карточки профиля. Ставится один раз и остаётся с вами навсегда — как татуировка, только без сожалений.', 'Сезонне оформлення всієї вашої картки профілю. Ставиться один раз і лишається з вами назавжди — як татуювання, тільки без жалю.', 'Diseño de temporada para toda tu tarjeta de perfil. Se aplica una vez y se queda para siempre, como un tatuaje, pero sin arrepentimientos.', 'Visual de temporada para todo o seu cartão de perfil. Aplica-se uma vez e fica para sempre — como uma tatuagem, só que sem arrependimentos.', 'Thiết kế mùa cho toàn bộ thẻ hồ sơ. Áp dụng một lần và ở lại mãi mãi — như hình xăm, chỉ khác là không hối tiếc.', 'Tampilan musim untuk seluruh kartu profilmu. Dipasang sekali dan tinggal selamanya — seperti tato, tapi tanpa penyesalan.', 'Tüm profil kartın için sezon tasarımı. Bir kez uygulanır ve sonsuza dek kalır — dövme gibi ama pişmanlık olmadan.', 'Sezonowy wygląd całej Twojej karty profilu. Zakładany raz i zostaje na zawsze — jak tatuaż, tylko bez żalu.'),
    applied: T('Визитка на месте. Профиль теперь выглядит так, будто вы знаете, что делаете.', 'Візитка на місці. Профіль тепер має вигляд, ніби ви знаєте, що робите.', 'Tarjeta lista. Tu perfil ya parece profesional.', 'Cartão pronto. Seu perfil parece profissional.', 'Thẻ hồ sơ đã có. Trông chuyên nghiệp hẳn.', 'Kartu profil siap. Terlihat profesional.', 'Kart hazır. Profilin profesyonel duruyor.', 'Wizytówka gotowa. Profil wygląda profesjonalnie.'),
  },
  aura_stage: {
    title: T('Аура сезона', 'Аура сезону', 'Aura de temporada', 'Aura da temporada', 'Hào quang mùa', 'Aura musim', 'Sezon aurası', 'Aura sezonu'),
    desc: T('Открывает новую стадию свечения вокруг аватара. В кастомизации можно надеть любую из уже открытых — скромничать необязательно.', 'Відкриває нову стадію світіння навколо аватара. У кастомізації можна вдягнути будь-яку з уже відкритих — скромничати не обов’язково.', 'Abre una nueva etapa de brillo alrededor de tu avatar. En personalización puedes usar cualquiera de las que ya desbloqueaste — la modestia es opcional.', 'Abre um novo estágio de brilho ao redor do avatar. Na personalização, use qualquer estágio já desbloqueado — modéstia é opcional.', 'Mở cấp hào quang mới quanh avatar. Trong tùy chỉnh, bạn có thể đeo bất kỳ cấp nào đã mở — khiêm tốn là không bắt buộc.', 'Membuka tahap aura baru di sekitar avatar. Di kustomisasi, pakai tahap mana saja yang sudah terbuka — rendah hati itu opsional.', 'Avatarın etrafında yeni bir aura aşaması açar. Kişiselleştirmede açık olan herhangi birini takabilirsin — alçakgönüllülük isteğe bağlı.', 'Otwiera nowy etap poświaty wokół awatara. W personalizacji możesz nosić dowolny odblokowany etap — skromność jest opcjonalna.'),
    applied: T('Аура поднялась на стадию. Свечение усилилось, скромность — нет.', 'Аура піднялася на стадію. Сяйво посилилося, скромність — ні.', 'El aura subió de etapa. Brilla más, la modestia no.', 'A aura subiu de estágio. Brilha mais.', 'Hào quang lên cấp. Sáng hơn hẳn.', 'Aura naik tahap. Makin bersinar.', 'Aura bir aşama yükseldi. Daha parlak.', 'Aura awansowała. Świeci mocniej.'),
  },
  aura_secret: {
    title: T('Секретная аура', 'Секретна аура', 'Aura secreta', 'Aura secreta', 'Hào quang bí mật', 'Aura rahasia', 'Gizli aura', 'Sekretna aura'),
    desc: T('Пурпурный вихрь только для пятидесятого уровня. Больше его не получит никто и никогда — можете смело хвастаться.', 'Пурпуровий вихор лише для п’ятдесятого рівня. Більше його не отримає ніхто й ніколи — можете сміливо хвалитися.', 'Vórtice púrpura solo para el nivel 50. Nadie más lo tendrá jamás: puedes presumir con tranquilidad.', 'Vórtice roxo só para o nível 50. Ninguém mais o terá — pode se gabar à vontade.', 'Xoáy tím chỉ dành cho cấp 50. Không ai khác từng có được — cứ tự tin khoe khoang.', 'Pusaran ungu khusus level 50. Tak akan ada yang punya lagi — boleh pamer dengan bangga.', 'Mor girdap sadece seviye 50 için. Bunu bir daha kimse alamayacak — rahatça övünebilirsin.', 'Purpurowy wir tylko dla poziomu 50. Nikt inny go już nie zdobędzie — możecie się śmiało chwalić.'),
    applied: T('Аура включена. Выглядите дороже, чем заплатили.', 'Ауру ввімкнено. Маєте вигляд дорожчий, ніж заплатили.', 'Aura activada. Pareces más caro de lo que pagaste.', 'Aura ativada. Parece mais caro do que pagou.', 'Đã bật hào quang. Trông sang hơn hẳn.', 'Aura aktif. Terlihat lebih mahal.', 'Aura açıldı. Ödediğinden pahalı duruyorsun.', 'Aura włączona. Wyglądasz drożej niż zapłaciłeś.'),
  },
  // зачем 2026-08-04: nick_color в season_reward_apply.ts:175-177 выдаёт ДВЕ
  // вещи — цвет ника И титул сезона (SEASON1_TITLE). Старый текст обещал
  // только цвет и умалчивал про титул.
  nick_color: {
    title: T('Цвет ника', 'Колір ніка', 'Color del nombre', 'Cor do nome', 'Màu biệt danh', 'Warna nama', 'Takma ad rengi', 'Kolor nicku'),
    desc: T('Красит ник в фирменную бирюзу сезона и вешает рядом титул «Сезон 1». В таблице вас теперь видно ещё до того, как прочитают имя.', 'Фарбує нік у фірмову бірюзу сезону і додає поруч титул «Сезон 1». У таблиці вас тепер видно ще до того, як прочитають ім’я.', 'Pinta tu nombre con el turquesa de temporada y añade el título «Temporada 1». En la tabla te verán antes de leer tu nombre.', 'Pinta seu nome com o turquesa da temporada e adiciona o título «Temporada 1». Na tabela, vão te ver antes de ler seu nome.', 'Tô tên bạn màu ngọc lam của mùa và gắn thêm danh hiệu «Mùa 1». Trong bảng xếp hạng, người ta thấy bạn trước cả khi đọc tên.', 'Mewarnai namamu dengan toska musim dan menambahkan gelar «Musim 1». Di peringkat, kamu terlihat sebelum namamu terbaca.', 'Adını sezonun turkuazına boyar ve yanına «1. Sezon» unvanını ekler. Sıralamada, adın okunmadan önce sen görünürsün.', 'Maluje Twój nick na sezonowy turkus i dokłada tytuł «Sezon 1». W tabeli widać Cię, zanim ktoś przeczyta imię.'),
    applied: T('Ник перекрашен, титул «Сезон 1» присвоен. В таблице теперь видно издалека.', 'Нік перефарбовано, титул «Сезон 1» присвоєно. У таблиці видно здалеку.', 'Nombre repintado, título «Temporada 1» asignado. Se ve desde lejos.', 'Nome repintado, título «Temporada 1» atribuído. Dá para ver de longe.', 'Đã đổi màu tên, gắn danh hiệu «Mùa 1». Nhìn từ xa cũng thấy.', 'Nama diwarnai, gelar «Musim 1» diberikan. Terlihat dari jauh.', 'Ad rengi değişti, «1. Sezon» unvanı verildi. Uzaktan görünüyor.', 'Nick pomalowany, przyznano tytuł «Sezon 1». Widać z daleka.'),
  },
  custom_avatar: {
    title: T('Кастомный аватар', 'Кастомний аватар', 'Avatar personalizado', 'Avatar personalizado', 'Ảnh đại diện riêng', 'Avatar kustom', 'Özel avatar', 'Własny awatar'),
    desc: T('Добавляет новый стиль в вашу коллекцию аватаров — какой именно, решит случай, а носить его или нет, решаете вы.', 'Додає новий стиль до вашої колекції аватарів — який саме, вирішить випадок, а носити його чи ні — вирішуєте ви.', 'Añade un nuevo estilo a tu colección de avatares — cuál, lo decide el azar; si lo usas o no, lo decides tú.', 'Adiciona um novo estilo à sua coleção de avatares — qual, o acaso decide; usar ou não, é você quem decide.', 'Thêm một kiểu mới vào bộ sưu tập avatar — kiểu nào thì để may rủi quyết định, còn có đeo hay không là tùy bạn.', 'Menambah gaya baru ke koleksi avatarmu — yang mana, biar keberuntungan yang memilih, dipakai atau tidak terserah kamu.', 'Avatar koleksiyonuna yeni bir stil ekler — hangisi olduğuna şans karar verir, takıp takmamaya ise sen.', 'Dodaje nowy styl do kolekcji awatarów — który, decyduje przypadek, a czy go nosić — Ty.'),
    applied: T('Аватар ваш. Кот или закат — решать вам.', 'Аватар ваш. Кіт чи захід сонця — вирішувати вам.', 'Avatar tuyo. Gato o atardecer, tú decides.', 'Avatar é seu. Gato ou pôr do sol, você decide.', 'Ảnh đại diện của bạn. Tùy bạn chọn.', 'Avatar milikmu. Terserah kamu.', 'Avatar senin. Sen karar ver.', 'Awatar Twój. Ty decydujesz.'),
  },
  card_pack: {
    title: T('Набор карточек', 'Набір карток', 'Set de tarjetas', 'Pacote de cartões', 'Bộ thẻ', 'Paket kartu', 'Kart paketi', 'Zestaw fiszek'),
    desc: T('Открывает фирменный набор «Peaky Blinders» навсегда — без пересдачи, без срока годности.', 'Відкриває фірмовий набір «Peaky Blinders» назавжди — без перескладання, без терміну придатності.', 'Desbloquea el set «Peaky Blinders» para siempre: sin repetir el examen, sin fecha de caducidad.', 'Desbloqueia o pacote «Peaky Blinders» para sempre — sem refazer prova, sem prazo de validade.', 'Mở khóa bộ «Peaky Blinders» vĩnh viễn — không cần thi lại, không có hạn dùng.', 'Membuka paket «Peaky Blinders» selamanya — tanpa ujian ulang, tanpa kedaluwarsa.', '«Peaky Blinders» paketini sonsuza dek açar — tekrar sınav yok, son kullanma tarihi yok.', 'Odblokowuje zestaw «Peaky Blinders» na zawsze — bez podejścia do egzaminu, bez terminu ważności.'),
    applied: T('Набор «Peaky Blinders» открыт навсегда — карточки уже в коллекции. Разбирайте, пока не остыли.', 'Набір «Peaky Blinders» відкрито назавжди — картки вже в колекції.', 'Set «Peaky Blinders» desbloqueado para siempre. A revisarlas.', 'Pacote «Peaky Blinders» desbloqueado para sempre. Vá conferir.', 'Bộ «Peaky Blinders» đã mở khóa vĩnh viễn.', 'Paket «Peaky Blinders» terbuka selamanya.', '«Peaky Blinders» paketi sonsuza dek açıldı.', 'Zestaw «Peaky Blinders» odblokowany na zawsze.'),
  },
  season_finale: {
    title: T('Финал сезона!', 'Фінал сезону!', '¡Final de temporada!', 'Final da temporada!', 'Chung kết mùa!', 'Final musim!', 'Sezon finali!', 'Finał sezonu!'),
    desc: T('Переливающийся ник, легендарный титул и финальный вихрь ауры — весь набор для тех, кто дошёл до конца, а не сдался на полпути.', 'Переливчастий нік, легендарний титул і фінальний вихор аури — весь набір для тих, хто дійшов до кінця, а не здався на півдорозі.', 'Nombre iridiscente, título legendario y el vórtice final del aura: el paquete completo para quien llegó al final y no tiró la toalla a mitad de camino.', 'Nome iridescente, título lendário e o vórtice final da aura — o pacote completo para quem chegou ao fim e não desistiu no meio do caminho.', 'Biệt danh lung linh, danh hiệu huyền thoại và xoáy hào quang cuối cùng — trọn bộ dành cho ai đi đến đích, không bỏ cuộc giữa chừng.', 'Nama berkilau, gelar legendaris, dan pusaran aura final — paket lengkap untuk yang sampai ke ujung, bukan yang menyerah di tengah jalan.', 'Yanardöner ad, efsanevi unvan ve final aura girdabı — yarı yolda pes etmeyip sonuna kadar gidenler için tam paket.', 'Mieniący się nick, legendarny tytuł i finałowy wir aury — pełny zestaw dla tych, co dotarli do końca, a nie poddali się w połowie.'),
    applied: T('Сезон закрыт полностью. Путь был долгим, и вы дошли до конца. Уважение.', 'Сезон закрито повністю. Шлях був довгим, і ви дійшли до кінця.', 'Temporada completada. Fue un largo camino y llegaste. Respeto.', 'Temporada concluída. Foi um longo caminho e você chegou. Respeito.', 'Hoàn thành cả mùa. Một chặng đường dài và bạn đã tới đích.', 'Musim selesai penuh. Perjalanan panjang, dan kamu berhasil.', 'Sezon tamamen bitti. Uzun bir yoldu ve başardınız.', 'Sezon zamknięty. To była długa droga i dotarliście do końca.'),
  },
};

const CHOICE_OPTIONS: readonly { reward: SeasonReward; labelKey: keyof typeof SEASON_MODAL_COPY }[] = [
  { reward: { kind: 'battery' }, labelKey: 'battery' },
  { reward: { kind: 'league_boost' }, labelKey: 'league_boost' },
  { reward: { kind: 'pearls', amount: 15 }, labelKey: 'pearls' },
];

/**
 * Арт награды — вынесено из SeasonGiftModal, чтобы SeasonRewardInfoModal
 * (просмотровая модалка «что это такое», открывается тапом по ЛЮБОЙ карточке
 * дорожки) показывала ТОТ ЖЕ рисунок, а не копию логики с риском разойтись.
 */
export function renderSeasonRewardArt(
  reward: SeasonReward | null,
  themeMode: ThemeMode,
  t: Theme,
  pearlIcon: ImageSourcePropType,
  /**
   * зачем (аудит 2026-08-17, скрин владельца): RewardImpactRings центрируется
   * от РОДИТЕЛЯ (весь блок art), а не от иконки. Для наград с одиночной
   * центрированной иконкой это совпадает, но у 'pearls' иконка стоит СЛЕВА от
   * текста «+N» — кольцо визуально уезжало в промежуток между ними («пустой
   * кружок» на скрине). Даём вызывающей стороне вставить кольца ИМЕННО вокруг
   * иконки через этот слот, вместо угадывания сдвига по ширине текста.
   */
  impactRings?: React.ReactNode,
): React.ReactNode {
  if (!reward) return null;
  if (reward.kind === 'aura_stage') {
    const a = getSeasonAuraStageAsset(reward.amount ?? 1, themeMode);
    return <SeasonAuraRing asset={a} size={104} />;
  }
  if (reward.kind === 'aura_secret') {
    const a = getSeasonSecretAuraAsset(themeMode);
    return <SeasonAuraRing asset={a} size={112} />;
  }
  if (reward.kind === 'season_finale') {
    const a = getSeasonAuraStageAsset(4, themeMode);
    return <SeasonAuraRing asset={a} size={104} />;
  }
  if (reward.kind === 'pearls') {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
          {impactRings}
          <Image source={pearlIcon} style={{ width: 52, height: 52 }} resizeMode="contain" accessible={false} />
        </View>
        <Text style={{ color: t.textPrimary, fontSize: 34, fontWeight: '900', fontVariant: ['tabular-nums'] }}>+{reward.amount ?? 0}</Text>
      </View>
    );
  }
  if (reward.kind === 'plus_days') {
    return (
      <View style={{ alignItems: 'center', gap: 6 }}>
        <View style={{ paddingHorizontal: 22, paddingVertical: 12, borderRadius: 20, backgroundColor: t.goldBg }}>
          <Text style={{ color: t.gold, fontSize: 34, fontWeight: '900' }}>+{reward.amount ?? 0}</Text>
        </View>
      </View>
    );
  }
  const icon = getSeasonRewardIcon(reward.kind, themeMode);
  return icon ? <Image source={icon} style={{ width: 92, height: 92 }} resizeMode="contain" accessible={false} /> : null;
}

/** Живой перелив ника (MaskedView + бегущий градиент) — превью финала. */
function ShimmerNick({ name }: { name: string }) {
  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(slide, {
      toValue: 1, duration: 5200, easing: Easing.linear, useNativeDriver: true,
    }));
    loop.start();
    return () => loop.stop();
  }, [slide]);
  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [-160, 160] });
  return (
    <MaskedView maskElement={<Text style={{ fontSize: 26, fontWeight: '900', textAlign: 'center' }}>{name}</Text>}>
      <View style={{ height: 34, width: 240, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ backgroundColor: '#57C8DE', position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
        <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, transform: [{ translateX }] }}>
          <LinearGradient colors={['#57C8DE', '#CFF6FF', '#8F9FFF', '#57C8DE']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, width: 480 }} />
        </Animated.View>
      </View>
    </MaskedView>
  );
}

type Phase = 'offer' | 'choice' | 'friendPick' | 'applying' | 'done' | 'noGap' | 'serverError';

interface Props {
  visible: boolean;
  reward: SeasonReward | null;
  giftId: string | null;
  /** Ник юзера для превью финала (экран передаёт из своего стейта). */
  userName?: string | null;
  onClose: () => void;
  /**
   * зачем: гибрид «Световод + Чекан» (макет .motion-mockups/phraseman-hybrid.html,
   * сцена M3 «Сундук-награда») — герой (жемчужина/иконка награды) получает удар
   * ТОЛЬКО в фазе done (награда реально получена). Все 7 фаз (offer/choice/
   * friendPick/applying/done/noGap/serverError) и их контент — БЕЗ ИЗМЕНЕНИЙ,
   * меняется только оболочка/вход. Production default — hybrid; classic — rollback.
   */
  motionVariant?: 'classic' | 'hybrid';
}

export default function SeasonGiftModal({ visible, reward, giftId, userName, onClose, motionVariant = 'hybrid' }: Props) {
  const { theme: t, themeMode } = useTheme();
  const { lang } = useLang();
  const isHybrid = motionVariant === 'hybrid';
  const [phase, setPhase] = useState<Phase>('offer');
  const [avatarLabel, setAvatarLabel] = useState<string | null>(null);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [sentToName, setSentToName] = useState<string | null>(null);
  const pearlIcon = pearlIconForTheme(themeMode);
  const impact = useRewardImpactHybrid({
    visible: isHybrid && visible && phase === 'done',
    rarity: 'rare',
    impactSoundId: 'pm.reward.chest_open',
    scope: 'season-gift-hybrid',
  });

  // Сброс фазы на каждое новое открытие; статусные применяются СРАЗУ при
  // открытии (постоянная награда — «Позже» для неё бессмысленно).
  useEffect(() => {
    if (!visible || !reward) return;
    let cancelled = false;
    setSentToName(null);
    setAvatarLabel(null);
    if (STATUS_KINDS.has(reward.kind)) {
      setPhase('applying');
      void (async () => {
        try {
          const res = await applySeasonRewardLocal(reward, giftId ?? undefined);
          if (!res.ok) {
            if (!cancelled) setPhase('serverError');
            return;
          }
          if (giftId) void markSeasonPassGiftUsed(giftId).catch(() => {});
          if (cancelled) return;
          if (res.avatarUnlock) setAvatarLabel(res.avatarUnlock.labelRu ?? null);
          setPhase('done');
        } catch {
          if (!cancelled) setPhase('serverError');
        }
      })();
      return () => { cancelled = true; };
    }
    setPhase(reward.kind === 'choice_3' ? 'choice' : 'offer');
    return () => { cancelled = true; };
  }, [visible, reward, giftId]);

  // Друзья для щита — живой снапшот, пока открыт пикер.
  useEffect(() => {
    if (!visible || phase !== 'friendPick') return;
    const unsub = friendsAccountStore.subscribe((list: FriendEntry[]) => setFriends(list.slice(0, 24)));
    return () => { try { (unsub as unknown as () => void)?.(); } catch { /* snapshot detach best effort */ } };
  }, [visible, phase]);

  const onLater = useCallback(() => { hapticTap(); onClose(); }, [onClose]);

  const finishApplied = useCallback(() => {
    emitAppEvent('action_toast', actionToastTri('success', {
      ru: 'Применено', uk: 'Застосовано', es: 'Aplicado', 'pt-BR': 'Aplicado',
      vi: 'Đã áp dụng', id: 'Diterapkan', tr: 'Uygulandı', pl: 'Zastosowano',
    }));
  }, []);

  const onApply = useCallback(async (chosen?: SeasonReward) => {
    const target = chosen ?? reward;
    if (!target || !giftId || phase === 'applying') return;
    hapticTap();
    setPhase('applying');
    try {
      // зачем (аудит 2026-08-24): «Магнит коллекции» — единственная награда,
      // эффект которой считает СЕРВЕР. Шанс дропа карточек решает callable
      // collectiblesClaimDrop, и он читает магнит из users/{uid}.progress.
      // Раньше магнит писался только в локальный AsyncStorage, куда сервер не
      // смотрит (в cloud_sync этот ключ тоже не входит) — подарок не делал
      // ничего. Теперь активируем его серверным seasonRedeemConsumable,
      // который и пишет авторитетное поле со сроком.
      if (target.kind === 'collection_magnet') {
        const magnet = await seasonRedeemConsumableOnServer({ giftId, kind: 'collection_magnet' });
        if (!magnet?.ok) { setPhase('serverError'); return; }
        void markSeasonPassGiftUsed(giftId).catch(() => {});
        setPhase('done'); finishApplied();
        return;
      }
      const res: ApplySeasonRewardResult = await applySeasonRewardLocal(target, giftId);
      if (!res.ok && res.failReason === 'no_streak_gap') { setPhase('noGap'); return; }
      if (!res.ok) { setPhase('serverError'); return; }
      void markSeasonPassGiftUsed(giftId).catch(() => {});
      if (res.avatarUnlock) setAvatarLabel(res.avatarUnlock.labelRu ?? null);
      setPhase('done'); finishApplied();
    } catch {
      setPhase('serverError');
    }
  }, [reward, giftId, phase, finishApplied]);

  // зачем (аудит 2026-08-24): подарок называется «Щит другу» и обещает защиту
  // ДРУГУ, но раньше здесь звался applySeasonRewardLocal('friend_shield') —
  // он пишет chain_shield в СВОЁ локальное хранилище. Выбранный друг
  // использовался только для имени в тосте: игрок видел «отправлено {имя}»,
  // а щит доставался ему самому, друг не получал ничего.
  // Отправку умеет сервер — seasonSendFriendShield (functions/src/season_pass.ts):
  // он проверяет реальную дружбу с ОБЕИХ сторон и идемпотентен по giftId.
  // Локально ничего не пишем: щит адресован не нам.
  const onPickFriend = useCallback(async (friend: FriendEntry) => {
    if (!giftId || phase === 'applying') return;
    hapticTap();
    setPhase('applying');
    try {
      const res = await seasonSendFriendShieldOnServer({ giftId, friendStableId: friend.uid });
      if (!res?.ok) { setPhase('serverError'); return; }
      void markSeasonPassGiftUsed(giftId).catch(() => {});
      setSentToName(leaguePublicName(friend.displayName, friend.uid));
      setPhase('done');
    } catch {
      setPhase('serverError');
    }
  }, [giftId, phase]);

  // зачем: вынесено из общего блока art — кольца удара должны обрамлять именно
  // иконку награды, а не центр всей строки «иконка + число» (см. renderSeasonRewardArt).
  const impactRingsEl = isHybrid ? (
    <RewardImpactRings
      show={impact.showRings}
      dustCount={impact.dustCount}
      color={t.gold}
      ring0Style={impact.styles.ring0}
      ring1Style={impact.styles.ring1}
    />
  ) : null;
  const art = useMemo(
    () => renderSeasonRewardArt(reward, themeMode, t, pearlIcon, impactRingsEl),
    [pearlIcon, reward, t, themeMode, impactRingsEl],
  );

  if (!reward) return null;
  const copy = SEASON_MODAL_COPY[reward.kind];

  // зачем: тело карточки (все 7 фаз, весь контент) ОДНО и то же в classic и
  // hybrid — расходится только оболочка (Modal+fade vs HybridAlertShell) и
  // герой-арт (в hybrid художник получает удар RewardImpactRings в фазе done).
  // Так гибрид не может незаметно разойтись с classic по информации.
  const panelBody = (
    <View style={{ width: '100%', maxWidth: 370, borderRadius: 26, backgroundColor: t.bgCard, padding: 24, alignItems: 'center', gap: 14 }}>

          <View style={{ minHeight: 116, alignItems: 'center', justifyContent: 'center' }}>
            {isHybrid && reward.kind !== 'pearls' && (
              <RewardImpactRings
                show={impact.showRings}
                dustCount={impact.dustCount}
                color={t.gold}
                ring0Style={impact.styles.ring0}
                ring1Style={impact.styles.ring1}
              />
            )}
            {phase === 'applying' ? <ActivityIndicator size="large" color={t.gold} /> : art}
          </View>

          {visible && reward.kind === 'season_finale' && phase !== 'applying' && (
            <ShimmerNick name={leaguePublicName(userName, 'you') || 'Nick'} />
          )}

          <Text style={{ color: t.textPrimary, fontSize: 19, fontWeight: '900', textAlign: 'center' }}>
            {phase === 'noGap'
              ? triLang(lang, {
                  ru: 'Серия цела!', uk: 'Серія ціла!', en: 'Streak intact!', es: '¡La racha está intacta!', 'pt-BR': 'A sequência está intacta!',
                  vi: 'Chuỗi vẫn nguyên!', id: 'Runtunan utuh!', tr: 'Seri sağlam!', pl: 'Seria nienaruszona!',
                })
              : phase === 'serverError'
                ? triLang(lang, {
                    ru: 'Не получилось', uk: 'Не вдалося', en: "Didn't work", es: 'No funcionó', 'pt-BR': 'Não deu certo',
                    vi: 'Không thành công', id: 'Gagal', tr: 'Olmadı', pl: 'Nie udało się',
                  })
                : sentToName
                  ? triLang(lang, {
                      ru: `Щит улетел: ${sentToName}`, uk: `Щит полетів: ${sentToName}`, en: `Shield sent to ${sentToName}`, es: `Escudo enviado a ${sentToName}`,
                      'pt-BR': `Escudo enviado a ${sentToName}`, vi: `Đã gửi khiên cho ${sentToName}`, id: `Perisai terkirim ke ${sentToName}`,
                      tr: `Kalkan gönderildi: ${sentToName}`, pl: `Tarcza wysłana do ${sentToName}`,
                    })
                  // Заголовок тоже меняется — иначе смена состояния незаметна.
                  : phase === 'done'
                    ? triLang(lang, {
                        ru: 'Готово!', uk: 'Готово!', en: 'Done!', es: '¡Listo!', 'pt-BR': 'Pronto!',
                        vi: 'Xong!', id: 'Selesai!', tr: 'Hazır!', pl: 'Gotowe!',
                      })
                    // зачем 2026-08-04 (владелец: «аура ... стадия ее надо
                    // название добавить»): copy.title у aura_stage один и тот
                    // же на все 4 стадии («Аура сезона») — заголовок модалки
                    // не говорил, КАКАЯ именно это стадия. Имя + номер
                    // (SEASON_AURA_STAGE_NAMES) — тот же текст, что уже
                    // показывает плитка на дорожке, здесь он не расходится.
                    : reward.kind === 'aura_stage'
                      ? `${SEASON_AURA_STAGE_NAMES[lang][seasonAuraStageIndex(reward.amount)]} ${['I', 'II', 'III', 'IV'][seasonAuraStageIndex(reward.amount)]}`
                      : triLang(lang, copy.title)}
          </Text>

          <Text style={{ color: t.textSecond, fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 20 }}>
            {phase === 'noGap'
              ? triLang(lang, {
                  ru: 'Чинить нечего — вчера ты занимался. Машина времени осталась в «Подарках» на чёрный день.',
                  uk: 'Лагодити нічого — вчора ти займався. Машина часу лишилась у «Подарунках».',
                  en: 'Nothing to fix — you practiced yesterday. The time machine stays in "Gifts" for a rainy day.',
                  es: 'Nada que reparar: ayer practicaste. La máquina queda en «Regalos».',
                  'pt-BR': 'Nada a consertar: ontem você praticou. A máquina fica em «Presentes».',
                  vi: 'Không có gì để sửa — hôm qua bạn đã học. Máy vẫn ở «Quà tặng».',
                  id: 'Tidak ada yang diperbaiki — kemarin kamu belajar. Mesin tetap di «Hadiah».',
                  tr: 'Onaracak bir şey yok — dün çalıştın. Makine «Hediyeler»de kaldı.',
                  pl: 'Nie ma czego naprawiać — wczoraj ćwiczyłeś. Wehikuł został w «Prezentach».',
                })
              : phase === 'serverError'
                ? triLang(lang, {
                    ru: 'Сервер не ответил. Подарок остался в «Подарках» — попробуй ещё раз.',
                    uk: 'Сервер не відповів. Подарунок лишився в «Подарунках» — спробуй ще раз.',
                    en: 'The server did not respond. The gift stays in "Gifts" — try again.',
                    es: 'El servidor no respondió. El regalo sigue en «Regalos», inténtalo de nuevo.',
                    'pt-BR': 'O servidor não respondeu. O presente segue em «Presentes», tente de novo.',
                    vi: 'Máy chủ không phản hồi. Quà vẫn ở «Quà tặng» — thử lại nhé.',
                    id: 'Server tidak merespons. Hadiah tetap di «Hadiah» — coba lagi.',
                    tr: 'Sunucu yanıt vermedi. Hediye «Hediyeler»de — tekrar dene.',
                    pl: 'Serwer nie odpowiedział. Prezent został w «Prezentach» — spróbuj ponownie.',
                  })
                : avatarLabel
                  ? avatarLabel
                  // зачем 2026-08-03 (владелец: «при нажатии применить модалка
                  // просто моргает и всё, никакого нового состояния, а обязано
                  // смениться и быть написано, что буст такой-то действует
                  // столько-то»): после применения показываем ДРУГОЙ текст —
                  // что именно включилось и на какой срок, а не прежнее
                  // описание «что это такое».
                  : phase === 'done'
                    ? triLang(lang, copy.applied)
                    : triLang(lang, copy.desc)}
          </Text>

          {phase === 'choice' && (
            <View style={{ width: '100%', gap: 8 }}>
              {CHOICE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.labelKey}
                  testID={`season-choice-${opt.labelKey}`}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  onPress={() => onApply(opt.reward)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: t.bgSurface }}
                >
                  {opt.reward.kind === 'pearls'
                    ? <Image source={pearlIcon} style={{ width: 28, height: 28 }} resizeMode="contain" accessible={false} />
                    : <Image source={getSeasonRewardIcon(opt.reward.kind, themeMode)!} style={{ width: 28, height: 28 }} resizeMode="contain" accessible={false} />}
                  <Text style={{ flex: 1, color: t.textPrimary, fontSize: 14, fontWeight: '800' }}>
                    {triLang(lang, SEASON_MODAL_COPY[opt.labelKey].title)}{opt.reward.kind === 'pearls' ? ` +${opt.reward.amount}` : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {phase === 'friendPick' && (
            <View style={{ width: '100%', maxHeight: 240 }}>
              {friends.length === 0 ? (
                <Text /* guard-ok: пустое состояние списка друзей (empty state с путём заполнения), не подпись под названием */ style={{ color: t.textMuted, fontSize: 13, fontWeight: '600', textAlign: 'center', paddingVertical: 12 }}>
                  {triLang(lang, {
                    ru: 'Пока нет друзей — добавь их во вкладке «Друзья», щит подождёт в «Подарках».',
                    uk: 'Поки немає друзів — додай їх у вкладці «Друзі», щит почекає в «Подарунках».',
                    en: 'No friends yet — add them in the "Friends" tab, the shield will wait in "Gifts".',
                    es: 'Aún sin amigos: añádelos en «Amigos», el escudo espera en «Regalos».',
                    'pt-BR': 'Ainda sem amigos: adicione na aba «Amigos», o escudo espera em «Presentes».',
                    vi: 'Chưa có bạn — thêm ở tab «Bạn bè», khiên chờ trong «Quà tặng».',
                    id: 'Belum ada teman — tambah di tab «Teman», perisai menunggu di «Hadiah».',
                    tr: 'Henüz arkadaş yok — «Arkadaşlar» sekmesinden ekle, kalkan «Hediyeler»de bekler.',
                    pl: 'Brak znajomych — dodaj ich w «Znajomi», tarcza czeka w «Prezentach».',
                  })}
                </Text>
              ) : (
                <FlatList decelerationRate="fast"
                  data={friends}
                  keyExtractor={(f) => f.uid}
                  style={{ maxHeight: 240 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      testID={`season-friend-${item.uid}`}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      onPress={() => onPickFriend(item)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 12, marginBottom: 6, backgroundColor: t.bgSurface }}
                    >
                      <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: t.accentBg }}>
                        <Text style={{ color: t.accent, fontSize: 13, fontWeight: '900' }}>
                          {(leaguePublicName(item.displayName, item.uid) || '?').slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                      <FlowText testID={`season-friend-name-${item.uid}`} provenance="user" style={{ flex: 1, color: t.textPrimary, fontSize: 14, fontWeight: '700' }}>
                        {leaguePublicName(item.displayName, item.uid)}
                      </FlowText>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          )}

          {(phase === 'offer') && (
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity
                testID="season-gift-modal-later"
                activeOpacity={0.85}
                onPress={onLater}
                accessibilityRole="button"
                style={{ flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: t.bgSurface }}
              >
                <Text style={{ color: t.textPrimary, fontSize: 15, fontWeight: '800' }}>
                  {triLang(lang, { ru: 'Позже', uk: 'Пізніше', en: 'Later', es: 'Más tarde', 'pt-BR': 'Mais tarde', vi: 'Để sau', id: 'Nanti', tr: 'Daha sonra', pl: 'Później' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="season-gift-modal-apply"
                activeOpacity={0.85}
                onPress={() => onApply()}
                accessibilityRole="button"
                style={{ flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: t.gold }}
              >
                <Text style={{ color: t.textOnGold, fontSize: 15, fontWeight: '900' }}>
                  {triLang(lang, { ru: 'Применить', uk: 'Застосувати', en: 'Apply', es: 'Aplicar', 'pt-BR': 'Usar', vi: 'Dùng', id: 'Pakai', tr: 'Kullan', pl: 'Użyj' })}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {(phase === 'done' || phase === 'noGap') && (
            <TouchableOpacity
              testID="season-gift-modal-done"
              activeOpacity={0.85}
              onPress={onLater}
              accessibilityRole="button"
              style={{ width: '100%', borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: t.gold }}
            >
              <Text style={{ color: t.textOnGold, fontSize: 15, fontWeight: '900' }}>
                {triLang(lang, reward.kind === 'season_finale'
                  ? { ru: 'Забрать награду', uk: 'Забрати нагороду', es: 'Recoger premio', 'pt-BR': 'Pegar prêmio', vi: 'Nhận thưởng', id: 'Ambil hadiah', tr: 'Ödülü al', pl: 'Odbierz nagrodę' }
                  : { ru: 'Продолжить', uk: 'Продовжити', es: 'Continuar', 'pt-BR': 'Continuar', vi: 'Tiếp tục', id: 'Lanjutkan', tr: 'Devam et', pl: 'Kontynuuj' })}
              </Text>
            </TouchableOpacity>
          )}

          {phase === 'serverError' && (
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity activeOpacity={0.85} onPress={onLater} accessibilityRole="button"
                style={{ flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: t.bgSurface }}>
                <Text style={{ color: t.textPrimary, fontSize: 15, fontWeight: '800' }}>
                  {triLang(lang, { ru: 'Позже', uk: 'Пізніше', en: 'Later', es: 'Más tarde', 'pt-BR': 'Mais tarde', vi: 'Để sau', id: 'Nanti', tr: 'Daha sonra', pl: 'Później' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} onPress={() => onApply()} accessibilityRole="button"
                style={{ flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: t.gold }}>
                <Text style={{ color: t.textOnGold, fontSize: 15, fontWeight: '900' }}>
                  {triLang(lang, { ru: 'Повторить', uk: 'Повторити', en: 'Retry', es: 'Reintentar', 'pt-BR': 'Tentar de novo', vi: 'Thử lại', id: 'Ulangi', tr: 'Tekrar dene', pl: 'Ponów' })}
                </Text>
              </TouchableOpacity>
            </View>
          )}

    </View>
  );

  if (isHybrid) {
    return (
      <HybridAlertShell visible={visible} onRequestClose={onLater} shadowColor={t.gold} testID="season-gift-hybrid-backdrop" backdropColor="rgba(0,0,0,0.62)">
        {panelBody}
      </HybridAlertShell>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onLater}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        {panelBody}
      </View>
    </Modal>
  );
}
