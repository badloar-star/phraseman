// ════════════════════════════════════════════════════════════════════════════
// SeasonGiftModal.tsx — модалка получения награды Season Pass. У КАЖДОГО вида
// свой контент (владелец, 2026-08-03: «все должны иметь свои модалки уникальные,
// как дни премиума»): заголовок, описание эффекта, арт; спец-сценарии — выбор
// 1-из-3, отправка щита другу, золотая целебрация дней Plus, финал с живым
// переливом ника (MaskedView, тот же приём пойдёт в лидерборды).
// Кнопки «Позже»/«Применить» — слова 1:1 с components/LevelGiftModal.tsx.
// ════════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, FlatList, Image, Modal, Text, TouchableOpacity, View } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from './SafeLinearGradient';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { hapticTap } from '../hooks/use-haptics';
import { emitAppEvent, actionToastTri } from '../app/events';
import { pearlIconForTheme } from '../app/coin_icons';
import { markSeasonPassGiftUsed } from '../app/season_pass_gift_inventory';
import {
  applySeasonRewardLocal,
  type ApplySeasonRewardResult,
} from '../app/season_reward_apply';
import {
  seasonRedeemConsumableOnServer,
  seasonSendFriendShieldOnServer,
} from '../app/season_pass_server';
import {
  getSeasonAuraStageAsset,
  getSeasonRewardIcon,
  getSeasonSecretAuraAsset,
  type SeasonReward,
} from '../app/season_pass_track_config';
import { subscribeToFriends, type FriendEntry } from '../app/firestore_friend_requests';
import { FlowText } from './text-integrity/FlowText';
import { leaguePublicName } from '../app/league_public_name';
import SeasonAuraRing from './SeasonAuraRing';

const STATUS_KINDS: ReadonlySet<SeasonReward['kind']> = new Set([
  'frame', 'aura_stage', 'aura_secret', 'nick_color', 'custom_avatar', 'card_pack', 'season_finale',
]);
/** Серверные расходники: активация подтверждается callable перед пометкой used. */
const SERVER_CONSUMABLE_KINDS: ReadonlySet<SeasonReward['kind']> = new Set([
  'collection_magnet', 'tournament_ticket',
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
const MODAL_COPY: Record<SeasonReward['kind'], { title: Tri; desc: Tri; applied: Tri }> = {
  pearls: {
    title: T('Жемчужины!', 'Перлини!', '¡Perlas!', 'Pérolas!', 'Ngọc trai!', 'Mutiara!', 'İnciler!', 'Perły!'),
    desc: T('Уже на твоём балансе — трать в магазине и на бусты.', 'Вже на твоєму балансі — витрачай у магазині та на бусти.', 'Ya están en tu saldo: gástalas en la tienda y en impulsos.', 'Já estão no seu saldo — gaste na loja e em impulsos.', 'Đã có trong số dư — dùng ở cửa hàng và tăng tốc.', 'Sudah masuk saldo — pakai di toko dan boost.', 'Bakiyene eklendi — mağazada ve desteklerde harca.', 'Już na Twoim koncie — wydawaj w sklepie i na boosty.'),
    applied: T('Жемчужины на счету. Проценты не начисляем, но и не отнимаем.', 'Перлини на рахунку.', 'Perlas en tu saldo. Sin intereses, pero tampoco se pierden.', 'Pérolas no saldo. Sem juros, mas sem perdas.', 'Ngọc trai đã vào tài khoản.', 'Mutiara sudah masuk saldo.', 'İnciler hesabında.', 'Perły na koncie.'),
  },
  battery: {
    title: T('Запасная батарея', 'Запасна батарея', 'Batería de reserva', 'Bateria reserva', 'Pin dự phòng', 'Baterai cadangan', 'Yedek batarya', 'Zapasowa bateria'),
    desc: T('Мгновенно заряжает энергию до максимума. Используй, когда она закончится.', 'Миттєво заряджає енергію до максимуму. Використай, коли вона скінчиться.', 'Recarga la energía al máximo al instante. Úsala cuando se agote.', 'Recarrega a energia ao máximo na hora. Use quando acabar.', 'Sạc đầy năng lượng ngay lập tức. Dùng khi cạn.', 'Mengisi penuh energi seketika. Pakai saat habis.', 'Enerjiyi anında doldurur. Bitince kullan.', 'Natychmiast ładuje energię do pełna. Użyj, gdy się skończy.'),
    applied: T('Энергия под завязку. Батарейка больше не оправдание.', 'Енергія по вінця. Батарейка більше не виправдання.', 'Energía al máximo. Ya no hay excusas.', 'Energia no máximo. Sem mais desculpas.', 'Năng lượng đầy. Hết cớ rồi nhé.', 'Energi penuh. Tak ada alasan lagi.', 'Enerji tam dolu. Bahane kalmadı.', 'Energia po brzegi. Koniec wymówek.'),
  },
  league_boost: {
    title: T('Буст лиги ×2', 'Буст ліги ×2', 'Impulso de liga ×2', 'Impulso de liga ×2', 'Tăng tốc giải ×2', 'Dorongan liga ×2', 'Lig desteği ×2', 'Boost ligi ×2'),
    desc: T('Очки лиги удваиваются до конца дня. Включи в воскресную гонку!', 'Бали ліги подвоюються до кінця дня. Увімкни в недільній гонці!', 'Los puntos de liga se duplican hasta el final del día.', 'Os pontos da liga dobram até o fim do dia.', 'Điểm giải đấu nhân đôi đến hết ngày.', 'Poin liga berlipat ganda sampai akhir hari.', 'Lig puanları gün sonuna kadar iki katı.', 'Punkty ligi podwojone do końca dnia.'),
    applied: T('Очки лиги идут вдвойне 72 часа. Соседи по таблице ещё не в курсе.', 'Очки ліги йдуть удвічі 72 години.', 'Puntos de liga al doble durante 72 h.', 'Pontos de liga em dobro por 72 h.', 'Điểm giải đấu nhân đôi trong 72 giờ.', 'Poin liga dua kali lipat selama 72 jam.', 'Lig puanları 72 saat boyunca iki katı.', 'Punkty ligi podwójnie przez 72 h.'),
  },
  club_totem: {
    title: T('Тотем клуба', 'Тотем клубу', 'Tótem del club', 'Totem do clube', 'Vật tổ câu lạc bộ', 'Totem klub', 'Kulüp totemi', 'Totem klubu'),
    desc: T('Бесплатный буст всей твоей группе лиги — активируй его в клубе, и все увидят, от кого он.', 'Безплатний буст усій твоїй групі ліги — активуй у клубі, і всі побачать, від кого він.', 'Impulso gratis para todo tu grupo: actívalo en el club.', 'Impulso grátis para todo o grupo: ative no clube.', 'Tăng tốc miễn phí cho cả nhóm — kích hoạt trong câu lạc bộ.', 'Boost gratis untuk seluruh grup — aktifkan di klub.', 'Tüm grubuna ücretsiz destek — kulüpte etkinleştir.', 'Darmowy boost dla całej grupy — aktywuj w klubie.'),
    applied: T('Тотем установлен. Клуб стал заметнее, а ты — его причина.', 'Тотем встановлено. Клуб помітніший.', 'Tótem colocado. El club se nota más gracias a ti.', 'Totem instalado. O clube ficou mais visível.', 'Đã đặt vật tổ. Câu lạc bộ nổi bật hơn.', 'Totem terpasang. Klub jadi lebih menonjol.', 'Totem kuruldu. Kulüp daha görünür.', 'Totem ustawiony. Klub bardziej widoczny.'),
  },
  golden_lesson: {
    title: T('Золотой урок', 'Золотий урок', 'Lección dorada', 'Lição dourada', 'Bài học vàng', 'Pelajaran emas', 'Altın ders', 'Złota lekcja'),
    desc: T('Следующий пройденный урок принесёт ×3 опыта. Заряд ждёт своего часа.', 'Наступний пройдений урок принесе ×3 досвіду. Заряд чекає свого часу.', 'La próxima lección completada dará ×3 XP.', 'A próxima lição completa dará ×3 XP.', 'Bài học tiếp theo sẽ nhận ×3 XP.', 'Pelajaran berikutnya memberi ×3 XP.', 'Sonraki ders ×3 XP verir.', 'Następna lekcja da ×3 XP.'),
    applied: T('Следующий урок принесёт золотой опыт. Один. Выбирай с умом.', 'Наступний урок принесе золотий досвід. Один.', 'La próxima lección dará XP dorada. Una. Elige bien.', 'A próxima lição dará XP dourada. Uma.', 'Bài học tới sẽ cho XP vàng. Một thôi.', 'Pelajaran berikutnya memberi XP emas. Satu saja.', 'Sonraki ders altın XP verir. Bir tane.', 'Następna lekcja da złote XP. Jedna.'),
  },
  collection_magnet: {
    title: T('Магнит коллекции', 'Магніт колекції', 'Imán de colección', 'Ímã de coleção', 'Nam châm bộ sưu tập', 'Magnet koleksi', 'Koleksiyon mıknatısı', 'Magnes kolekcji'),
    desc: T('24 часа двойной шанс найти карточку сокровищницы за занятия.', '24 години подвійний шанс знайти картку скарбниці за заняття.', '24 horas de doble probabilidad de hallar cartas del tesoro.', '24 horas de chance dupla de achar cartas do tesouro.', '24 giờ nhân đôi cơ hội tìm thẻ kho báu.', '24 jam peluang ganda menemukan kartu harta.', '24 saat hazine kartı bulma şansı iki katı.', '24 godziny podwójnej szansy na karty skarbca.'),
    applied: T('Карточки сами липнут к тебе 72 часа. Физика бессильна, магнит работает.', 'Картки самі липнуть до тебе 72 години.', 'Las cartas se pegan solas durante 72 h.', 'As cartas grudam sozinhas por 72 h.', 'Thẻ tự dính vào bạn trong 72 giờ.', 'Kartu menempel sendiri selama 72 jam.', 'Kartlar 72 saat boyunca kendiliğinden yapışıyor.', 'Karty same się kleją przez 72 h.'),
  },
  turbo_regen: {
    title: T('Второе дыхание', 'Друге дихання', 'Segundo aliento', 'Segundo fôlego', 'Hồi phục nhanh', 'Napas kedua', 'İkinci nefes', 'Drugi oddech'),
    desc: T('До конца дня энергия восстанавливается вдвое быстрее.', 'До кінця дня енергія відновлюється вдвічі швидше.', 'Hasta el final del día la energía se recupera el doble de rápido.', 'Até o fim do dia a energia recupera duas vezes mais rápido.', 'Đến hết ngày, năng lượng hồi phục nhanh gấp đôi.', 'Sampai akhir hari energi pulih dua kali lebih cepat.', 'Gün sonuna kadar enerji iki kat hızlı dolar.', 'Do końca dnia energia regeneruje się dwa razy szybciej.'),
    applied: T('Энергия восстанавливается быстрее 72 часа. Отдышка отменяется.', 'Енергія відновлюється швидше 72 години.', 'La energía se recupera más rápido durante 72 h.', 'A energia recarrega mais rápido por 72 h.', 'Năng lượng hồi nhanh hơn trong 72 giờ.', 'Energi pulih lebih cepat selama 72 jam.', 'Enerji 72 saat boyunca daha hızlı doluyor.', 'Energia regeneruje się szybciej przez 72 h.'),
  },
  tournament_ticket: {
    title: T('Билет на турнир', 'Квиток на турнір', 'Entrada al torneo', 'Ingresso do torneio', 'Vé giải đấu', 'Tiket turnamen', 'Turnuva bileti', 'Bilet na turniej'),
    desc: T('Один вход в турнир без ставки жемчужин — банк тебя всё равно ждёт.', 'Один вхід у турнір без ставки перлин — банк на тебе чекає.', 'Una entrada al torneo sin apostar perlas.', 'Uma entrada no torneio sem apostar pérolas.', 'Một lần vào giải không cần cược ngọc.', 'Sekali masuk turnamen tanpa taruhan mutiara.', 'İnci yatırmadan bir turnuva girişi.', 'Jedno wejście na turniej bez stawki pereł.'),
    applied: T('Билет в кармане. Осталось прийти вовремя и не опозориться.', 'Квиток у кишені. Лишилось прийти вчасно.', 'Entrada en el bolsillo. Solo falta llegar a tiempo.', 'Ingresso no bolso. Só falta chegar na hora.', 'Vé đã có. Chỉ cần đến đúng giờ.', 'Tiket sudah di tangan. Tinggal datang tepat waktu.', 'Bilet cepte. Zamanında gelmek kaldı.', 'Bilet w kieszeni. Zostało przyjść na czas.'),
  },
  time_machine: {
    title: T('Машина времени', 'Машина часу', 'Máquina del tiempo', 'Máquina do tempo', 'Cỗ máy thời gian', 'Mesin waktu', 'Zaman makinesi', 'Wehikuł czasu'),
    desc: T('Чинит вчерашнюю дыру в серии — как будто ты и не пропускал.', 'Лагодить вчорашню діру в серії — ніби ти й не пропускав.', 'Repara el hueco de ayer en tu racha.', 'Conserta a falha de ontem na sua sequência.', 'Sửa ngày bỏ lỡ hôm qua trong chuỗi.', 'Memperbaiki hari yang terlewat kemarin.', 'Dünkü seri boşluğunu onarır.', 'Naprawia wczorajszą lukę w serii.'),
    applied: T('Серия восстановлена. Вчерашний прогул официально не считается.', 'Серію відновлено. Вчорашній прогул не рахується.', 'Racha restaurada. Lo de ayer no cuenta.', 'Sequência restaurada. Ontem não conta.', 'Chuỗi đã khôi phục. Hôm qua không tính.', 'Rangkaian pulih. Kemarin tidak dihitung.', 'Seri geri geldi. Dün sayılmıyor.', 'Seria przywrócona. Wczoraj się nie liczy.'),
  },
  friend_shield: {
    title: T('Щит другу', 'Щит другові', 'Escudo para un amigo', 'Escudo para um amigo', 'Khiên cho bạn', 'Perisai untuk teman', 'Arkadaşa kalkan', 'Tarcza dla znajomego'),
    desc: T('Подари другу день защиты серии — выбери кому.', 'Подаруй другові день захисту серії — обери кому.', 'Regala a un amigo un día de protección de racha.', 'Dê a um amigo um dia de proteção de sequência.', 'Tặng bạn một ngày bảo vệ chuỗi.', 'Beri teman satu hari perlindungan runtunan.', 'Bir arkadaşına bir gün seri koruması hediye et.', 'Podaruj znajomemu dzień ochrony serii.'),
    applied: T('Щит отправлен. Друг спасён и, возможно, даже заметит.', 'Щит надіслано. Друг врятований.', 'Escudo enviado. Tu amigo está a salvo.', 'Escudo enviado. Seu amigo está salvo.', 'Đã gửi khiên. Bạn của bạn an toàn.', 'Perisai terkirim. Temanmu aman.', 'Kalkan gönderildi. Arkadaşın kurtuldu.', 'Tarcza wysłana. Znajomy uratowany.'),
  },
  choice_3: {
    title: T('Выбор из трёх', 'Вибір із трьох', 'Elige una de tres', 'Escolha uma de três', 'Chọn một trong ba', 'Pilih satu dari tiga', 'Üçten birini seç', 'Wybór z trzech'),
    desc: T('Три награды — заберёшь одну. Выбирай с умом.', 'Три нагороди — забереш одну. Обирай з розумом.', 'Tres recompensas: te llevas una.', 'Três recompensas: você leva uma.', 'Ba phần thưởng — chọn một.', 'Tiga hadiah — ambil satu.', 'Üç ödül — birini al.', 'Trzy nagrody — bierzesz jedną.'),
    applied: T('Выбор сделан, назад дороги нет. Но ты же не жалеешь, правда?', 'Вибір зроблено, назад дороги немає.', 'Elección hecha, no hay vuelta atrás.', 'Escolha feita, sem volta.', 'Đã chọn xong, không quay lại được.', 'Pilihan dibuat, tak bisa mundur.', 'Seçim yapıldı, geri dönüş yok.', 'Wybór dokonany, nie ma odwrotu.'),
  },
  xp_bank: {
    title: T('Банк опыта', 'Банк досвіду', 'Banco de XP', 'Banco de XP', 'Ngân hàng XP', 'Bank XP', 'XP bankası', 'Bank XP'),
    desc: T('Следующий опыт удваивается, пока банк не опустеет.', 'Наступний досвід подвоюється, поки банк не спорожніє.', 'El próximo XP se duplica hasta vaciar el banco.', 'O próximo XP dobra até esvaziar o banco.', 'XP tiếp theo nhân đôi đến khi hết ngân hàng.', 'XP berikutnya berlipat sampai bank kosong.', 'Banka boşalana dek XP iki katı.', 'Kolejny XP podwojony aż bank się opróżni.'),
    applied: T('Опыт капнул на счёт. Проценты не начисляем, но и не отнимаем.', 'Досвід капнув на рахунок.', 'XP añadida a tu cuenta.', 'XP creditada na conta.', 'XP đã vào tài khoản.', 'XP masuk ke akun.', 'XP hesabına eklendi.', 'XP dopisane do konta.'),
  },
  plus_days: {
    title: T('Дни Plus', 'Дні Plus', 'Días Plus', 'Dias Plus', 'Ngày Plus', 'Hari Plus', 'Plus günleri', 'Dni Plus'),
    desc: T('Полный доступ Plus: безлимит энергии и всё остальное — уже включено.', 'Повний доступ Plus: безліміт енергії і все інше — вже увімкнено.', 'Acceso Plus completo: energía ilimitada y más.', 'Acesso Plus completo: energia ilimitada e mais.', 'Toàn quyền Plus: năng lượng không giới hạn.', 'Akses Plus penuh: energi tanpa batas.', 'Tam Plus erişimi: sınırsız enerji.', 'Pełny dostęp Plus: nielimitowana energia.'),
    applied: T('Plus активирован. Живи красиво, пока идут дни.', 'Plus активовано. Живи красиво, поки йдуть дні.', 'Plus activado. Disfrútalo mientras dure.', 'Plus ativado. Aproveite enquanto dura.', 'Đã bật Plus. Tận hưởng nhé.', 'Plus aktif. Nikmati selagi ada.', 'Plus etkin. Tadını çıkar.', 'Plus włączony. Korzystaj.'),
  },
  frame: {
    title: T('Визитка', 'Візитка', 'Tarjeta de perfil', 'Cartão de perfil', 'Thẻ hồ sơ', 'Kartu profil', 'Profil kartı', 'Wizytówka'),
    desc: T('Сезонное оформление всей твоей пользовательской карточки — навсегда твоё.', 'Сезонне оформлення всієї твоєї картки користувача — назавжди твоє.', 'Diseño de temporada para toda tu tarjeta de usuario, tuyo para siempre.', 'Visual de temporada para todo o seu cartão de usuário, seu para sempre.', 'Thiết kế mùa cho toàn bộ thẻ người dùng — mãi mãi của bạn.', 'Tampilan musim untuk seluruh kartu penggunamu — selamanya milikmu.', 'Tüm kullanıcı kartın için sezon tasarımı — sonsuza dek senin.', 'Sezonowy wygląd całej Twojej karty użytkownika — na zawsze Twój.'),
    applied: T('Визитка на месте. Теперь профиль выглядит так, будто ты знаешь, что делаешь.', 'Візитка на місці. Профіль має вигляд, ніби ти знаєш, що робиш.', 'Tarjeta lista. Tu perfil ya parece profesional.', 'Cartão pronto. Seu perfil parece profissional.', 'Thẻ hồ sơ đã có. Trông chuyên nghiệp hẳn.', 'Kartu profil siap. Terlihat profesional.', 'Kart hazır. Profilin profesyonel duruyor.', 'Wizytówka gotowa. Profil wygląda profesjonalnie.'),
  },
  aura_stage: {
    title: T('Аура сезона', 'Аура сезону', 'Aura de temporada', 'Aura da temporada', 'Hào quang mùa', 'Aura musim', 'Sezon aurası', 'Aura sezonu'),
    desc: T('Новая стадия свечения — в разделе кастомизации, носи любую из открытых.', 'Нова стадія світіння — у розділі кастомізації, носи будь-яку з відкритих.', 'Nueva etapa de brillo en personalización.', 'Novo estágio de brilho na personalização.', 'Cấp hào quang mới trong tùy chỉnh.', 'Tahap aura baru di kustomisasi.', 'Kişiselleştirmede yeni aura aşaması.', 'Nowy etap aury w personalizacji.'),
    applied: T('Аура выросла на стадию. Свечение усилилось, скромность — нет.', 'Аура зросла на стадію. Сяйво посилилось, скромність — ні.', 'El aura subió de etapa. Brilla más, la modestia no.', 'A aura subiu de estágio. Brilha mais.', 'Hào quang lên cấp. Sáng hơn hẳn.', 'Aura naik tahap. Makin bersinar.', 'Aura bir aşama yükseldi. Daha parlak.', 'Aura awansowała. Świeci mocniej.'),
  },
  aura_secret: {
    title: T('Секретная аура', 'Секретна аура', 'Aura secreta', 'Aura secreta', 'Hào quang bí mật', 'Aura rahasia', 'Gizli aura', 'Sekretna aura'),
    desc: T('Пурпурный вихрь. Только уровень 50 — больше её не получит никто и никогда.', 'Пурпуровий вихор. Лише рівень 50 — більше її не отримає ніхто й ніколи.', 'Vórtice púrpura. Solo el nivel 50, nadie más la tendrá.', 'Vórtice roxo. Só o nível 50, ninguém mais a terá.', 'Xoáy tím. Chỉ cấp 50 — không ai khác có được.', 'Pusaran ungu. Hanya level 50 — tak ada lagi yang memilikinya.', 'Mor girdap. Sadece seviye 50 — başka kimse alamayacak.', 'Purpurowy wir. Tylko poziom 50 — nikt inny jej nie zdobędzie.'),
    applied: T('Аура включена. Выглядишь дороже, чем платил.', 'Ауру ввімкнено. Маєш вигляд дорожчий, ніж платив.', 'Aura activada. Pareces más caro de lo que pagaste.', 'Aura ativada. Parece mais caro do que pagou.', 'Đã bật hào quang. Trông sang hơn hẳn.', 'Aura aktif. Terlihat lebih mahal.', 'Aura açıldı. Ödediğinden pahalı duruyorsun.', 'Aura włączona. Wyglądasz drożej niż zapłaciłeś.'),
  },
  nick_color: {
    title: T('Цвет ника', 'Колір ніка', 'Color del nombre', 'Cor do nome', 'Màu biệt danh', 'Warna nama', 'Takma ad rengi', 'Kolor nicku'),
    desc: T('Бирюза сезона в рейтингах и лиге — видно издалека.', 'Бірюза сезону в рейтингах і лізі — видно здалеку.', 'Turquesa de temporada en rankings y liga.', 'Turquesa da temporada nos rankings e na liga.', 'Màu ngọc lam mùa trong bảng xếp hạng.', 'Toska musim di peringkat dan liga.', 'Sıralamalarda sezon turkuazı.', 'Sezonowy turkus w rankingach i lidze.'),
    applied: T('Ник перекрашен. В таблице теперь видно издалека.', 'Нік перефарбовано. У таблиці видно здалеку.', 'Nombre repintado. Se ve desde lejos en la tabla.', 'Nome repintado. Dá para ver de longe.', 'Đã đổi màu tên. Nhìn từ xa cũng thấy.', 'Nama diwarnai. Terlihat dari jauh.', 'Ad rengi değişti. Uzaktan görünüyor.', 'Nick pomalowany. Widać z daleka.'),
  },
  custom_avatar: {
    title: T('Кастомный аватар', 'Кастомний аватар', 'Avatar personalizado', 'Avatar personalizado', 'Ảnh đại diện riêng', 'Avatar kustom', 'Özel avatar', 'Własny awatar'),
    desc: T('Новый стиль уже в твоей коллекции аватаров.', 'Новий стиль уже в твоїй колекції аватарів.', 'Nuevo estilo ya en tu colección de avatares.', 'Novo estilo já na sua coleção de avatares.', 'Kiểu mới đã có trong bộ sưu tập avatar.', 'Gaya baru sudah di koleksi avatarmu.', 'Yeni stil avatar koleksiyonunda.', 'Nowy styl już w Twojej kolekcji awatarów.'),
    applied: T('Аватар твой. Хоть кот, хоть закат — решать тебе.', 'Аватар твій. Хоч кіт, хоч захід сонця — вирішувати тобі.', 'Avatar tuyo. Gato o atardecer, tú decides.', 'Avatar é seu. Gato ou pôr do sol, você decide.', 'Ảnh đại diện của bạn. Tùy bạn chọn.', 'Avatar milikmu. Terserah kamu.', 'Avatar senin. Sen karar ver.', 'Awatar Twój. Ty decydujesz.'),
  },
  card_pack: {
    title: T('Набор карточек', 'Набір карток', 'Set de tarjetas', 'Pacote de cartões', 'Bộ thẻ', 'Paket kartu', 'Kart paketi', 'Zestaw fiszek'),
    desc: T('Фирменный набор «Peaky Blinders» открыт навсегда — уже в твоих карточках.', 'Фірмовий набір «Peaky Blinders» відкрито назавжди — вже у твоїх картках.', 'El set «Peaky Blinders» desbloqueado para siempre.', 'O pacote «Peaky Blinders» desbloqueado para sempre.', 'Bộ «Peaky Blinders» mở khóa vĩnh viễn.', 'Paket «Peaky Blinders» terbuka selamanya.', '«Peaky Blinders» paketi sonsuza dek açık.', 'Zestaw «Peaky Blinders» odblokowany na zawsze.'),
    applied: T('Карточки в коллекции. Разбирай, пока не остыли.', 'Картки в колекції. Розбирай, поки не охололи.', 'Cartas en tu colección. A revisarlas.', 'Cartas na coleção. Vá conferir.', 'Thẻ đã vào bộ sưu tập.', 'Kartu masuk koleksi.', 'Kartlar koleksiyonda.', 'Karty w kolekcji.'),
  },
  season_finale: {
    title: T('Финал сезона!', 'Фінал сезону!', '¡Final de temporada!', 'Final da temporada!', 'Chung kết mùa!', 'Final musim!', 'Sezon finali!', 'Finał sezonu!'),
    desc: T('Переливающийся ник, легендарный титул и финальный вихрь. Ты дошёл до конца.', 'Переливчастий нік, легендарний титул і фінальний вихор. Ти дійшов до кінця.', 'Nombre iridiscente, título legendario y vórtice final.', 'Nome iridescente, título lendário e vórtice final.', 'Biệt danh lung linh, danh hiệu huyền thoại và xoáy cuối.', 'Nama berkilau, gelar legendaris, dan pusaran final.', 'Yanardöner ad, efsanevi unvan ve final girdabı.', 'Mieniący się nick, legendarny tytuł i finałowy wir.'),
    applied: T('Сезон закрыт полностью. Это было долго, и ты дошёл. Уважение.', 'Сезон закрито повністю. Це було довго, і ти дійшов.', 'Temporada completada. Fue largo y llegaste. Respeto.', 'Temporada concluída. Foi longo e você chegou.', 'Hoàn thành cả mùa. Đường dài và bạn đã tới.', 'Musim selesai penuh. Perjalanan panjang.', 'Sezon tamamen bitti. Uzun yoldu, başardın.', 'Sezon zamknięty. To była długa droga.'),
  },
};

const CHOICE_OPTIONS: readonly { reward: SeasonReward; labelKey: keyof typeof MODAL_COPY }[] = [
  { reward: { kind: 'battery' }, labelKey: 'battery' },
  { reward: { kind: 'league_boost' }, labelKey: 'league_boost' },
  { reward: { kind: 'pearls', amount: 15 }, labelKey: 'pearls' },
];

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
}

export default function SeasonGiftModal({ visible, reward, giftId, userName, onClose }: Props) {
  const { theme: t, themeMode } = useTheme();
  const { lang } = useLang();
  const [phase, setPhase] = useState<Phase>('offer');
  const [avatarLabel, setAvatarLabel] = useState<string | null>(null);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [sentToName, setSentToName] = useState<string | null>(null);
  const pearlIcon = pearlIconForTheme(themeMode);

  // Сброс фазы на каждое новое открытие; статусные применяются СРАЗУ при
  // открытии (постоянная награда — «Позже» для неё бессмысленно).
  useEffect(() => {
    if (!visible || !reward) return;
    setSentToName(null);
    setAvatarLabel(null);
    if (STATUS_KINDS.has(reward.kind)) {
      setPhase('applying');
      applySeasonRewardLocal(reward).then((res) => {
        if (res.avatarUnlock) setAvatarLabel(res.avatarUnlock.labelRu ?? null);
        setPhase('done');
      });
      if (giftId) void markSeasonPassGiftUsed(giftId);
      return;
    }
    if (reward.kind === 'plus_days') {
      // Дни Plus выдаёт сервер при клейме уровня (season_pass.ts) — модалка
      // празднует; vip_activated долетит событием, доступ включится сам.
      setPhase('done');
      return;
    }
    setPhase(reward.kind === 'choice_3' ? 'choice' : 'offer');
  }, [visible, reward, giftId]);

  // Друзья для щита — живой снапшот, пока открыт пикер.
  useEffect(() => {
    if (!visible || phase !== 'friendPick') return;
    const unsub = subscribeToFriends((list: FriendEntry[]) => setFriends(list.slice(0, 24)));
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
    if (target.kind === 'friend_shield') { setPhase('friendPick'); return; }
    setPhase('applying');
    if (SERVER_CONSUMABLE_KINDS.has(target.kind)) {
      const res = await seasonRedeemConsumableOnServer({ giftId, kind: target.kind });
      if (!res?.ok) { setPhase('serverError'); return; }
      await markSeasonPassGiftUsed(giftId);
      setPhase('done'); finishApplied(); return;
    }
    const res: ApplySeasonRewardResult = await applySeasonRewardLocal(target);
    if (!res.ok && res.failReason === 'no_streak_gap') { setPhase('noGap'); return; }
    if (!res.ok) { setPhase('serverError'); return; }
    await markSeasonPassGiftUsed(giftId);
    if (res.avatarUnlock) setAvatarLabel(res.avatarUnlock.labelRu ?? null);
    setPhase('done'); finishApplied();
  }, [reward, giftId, phase, finishApplied]);

  const onPickFriend = useCallback(async (friend: FriendEntry) => {
    if (!giftId || phase === 'applying') return;
    hapticTap();
    setPhase('applying');
    const res = await seasonSendFriendShieldOnServer({ giftId, friendStableId: friend.uid });
    if (!res?.ok) { setPhase('serverError'); return; }
    await markSeasonPassGiftUsed(giftId);
    setSentToName(leaguePublicName(friend.displayName, friend.uid));
    setPhase('done');
  }, [giftId, phase]);

  const art = useMemo(() => {
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
          <Image source={pearlIcon} style={{ width: 52, height: 52 }} resizeMode="contain" accessible={false} />
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
  }, [pearlIcon, reward, t, themeMode]);

  if (!reward) return null;
  const copy = MODAL_COPY[reward.kind];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onLater}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <View style={{ width: '100%', maxWidth: 370, borderRadius: 26, backgroundColor: t.bgCard, padding: 24, alignItems: 'center', gap: 14 }}>

          <View style={{ minHeight: 116, alignItems: 'center', justifyContent: 'center' }}>
            {phase === 'applying' ? <ActivityIndicator size="large" color={t.gold} /> : art}
          </View>

          {visible && reward.kind === 'season_finale' && phase !== 'applying' && (
            <ShimmerNick name={leaguePublicName(userName, 'you') || 'Nick'} />
          )}

          <Text style={{ color: t.textPrimary, fontSize: 19, fontWeight: '900', textAlign: 'center' }}>
            {phase === 'noGap'
              ? triLang(lang, {
                  ru: 'Серия цела!', uk: 'Серія ціла!', es: '¡La racha está intacta!', 'pt-BR': 'A sequência está intacta!',
                  vi: 'Chuỗi vẫn nguyên!', id: 'Runtunan utuh!', tr: 'Seri sağlam!', pl: 'Seria nienaruszona!',
                })
              : phase === 'serverError'
                ? triLang(lang, {
                    ru: 'Не получилось', uk: 'Не вдалося', es: 'No funcionó', 'pt-BR': 'Não deu certo',
                    vi: 'Không thành công', id: 'Gagal', tr: 'Olmadı', pl: 'Nie udało się',
                  })
                : sentToName
                  ? triLang(lang, {
                      ru: `Щит улетел: ${sentToName}`, uk: `Щит полетів: ${sentToName}`, es: `Escudo enviado a ${sentToName}`,
                      'pt-BR': `Escudo enviado a ${sentToName}`, vi: `Đã gửi khiên cho ${sentToName}`, id: `Perisai terkirim ke ${sentToName}`,
                      tr: `Kalkan gönderildi: ${sentToName}`, pl: `Tarcza wysłana do ${sentToName}`,
                    })
                  // Заголовок тоже меняется — иначе смена состояния незаметна.
                  : phase === 'done'
                    ? triLang(lang, {
                        ru: 'Готово!', uk: 'Готово!', es: '¡Listo!', 'pt-BR': 'Pronto!',
                        vi: 'Xong!', id: 'Selesai!', tr: 'Hazır!', pl: 'Gotowe!',
                      })
                    : triLang(lang, copy.title)}
          </Text>

          <Text style={{ color: t.textSecond, fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 20 }}>
            {phase === 'noGap'
              ? triLang(lang, {
                  ru: 'Чинить нечего — вчера ты занимался. Машина времени осталась в «Подарках» на чёрный день.',
                  uk: 'Лагодити нічого — вчора ти займався. Машина часу лишилась у «Подарунках».',
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
                    {triLang(lang, MODAL_COPY[opt.labelKey].title)}{opt.reward.kind === 'pearls' ? ` +${opt.reward.amount}` : ''}
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
                    es: 'Aún sin amigos: añádelos en «Amigos», el escudo espera en «Regalos».',
                    'pt-BR': 'Ainda sem amigos: adicione na aba «Amigos», o escudo espera em «Presentes».',
                    vi: 'Chưa có bạn — thêm ở tab «Bạn bè», khiên chờ trong «Quà tặng».',
                    id: 'Belum ada teman — tambah di tab «Teman», perisai menunggu di «Hadiah».',
                    tr: 'Henüz arkadaş yok — «Arkadaşlar» sekmesinden ekle, kalkan «Hediyeler»de bekler.',
                    pl: 'Brak znajomych — dodaj ich w «Znajomi», tarcza czeka w «Prezentach».',
                  })}
                </Text>
              ) : (
                <FlatList
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
                  {triLang(lang, { ru: 'Позже', uk: 'Пізніше', es: 'Más tarde', 'pt-BR': 'Mais tarde', vi: 'Để sau', id: 'Nanti', tr: 'Daha sonra', pl: 'Później' })}
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
                  {triLang(lang, { ru: 'Применить', uk: 'Застосувати', es: 'Aplicar', 'pt-BR': 'Usar', vi: 'Dùng', id: 'Pakai', tr: 'Kullan', pl: 'Użyj' })}
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
                  ? { ru: 'Великолепно', uk: 'Чудово', es: 'Magnífico', 'pt-BR': 'Magnífico', vi: 'Tuyệt vời', id: 'Luar biasa', tr: 'Muhteşem', pl: 'Wspaniale' }
                  : { ru: 'Отлично', uk: 'Чудово', es: 'Genial', 'pt-BR': 'Ótimo', vi: 'Tuyệt', id: 'Bagus', tr: 'Harika', pl: 'Świetnie' })}
              </Text>
            </TouchableOpacity>
          )}

          {phase === 'serverError' && (
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity activeOpacity={0.85} onPress={onLater} accessibilityRole="button"
                style={{ flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: t.bgSurface }}>
                <Text style={{ color: t.textPrimary, fontSize: 15, fontWeight: '800' }}>
                  {triLang(lang, { ru: 'Позже', uk: 'Пізніше', es: 'Más tarde', 'pt-BR': 'Mais tarde', vi: 'Để sau', id: 'Nanti', tr: 'Daha sonra', pl: 'Później' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} onPress={() => onApply()} accessibilityRole="button"
                style={{ flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: t.gold }}>
                <Text style={{ color: t.textOnGold, fontSize: 15, fontWeight: '900' }}>
                  {triLang(lang, { ru: 'Повторить', uk: 'Повторити', es: 'Reintentar', 'pt-BR': 'Tentar de novo', vi: 'Thử lại', id: 'Ulangi', tr: 'Tekrar dene', pl: 'Ponów' })}
                </Text>
              </TouchableOpacity>
            </View>
          )}

        </View>
      </View>
    </Modal>
  );
}
