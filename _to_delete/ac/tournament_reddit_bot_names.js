"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REDDIT_BOT_NAMES = exports.TOURNAMENT_REDDIT_BOT_PROFILE_IDS = exports.TOURNAMENT_REDDIT_BOT_NAMES_SHA256 = exports.TOURNAMENT_REDDIT_BOT_PERSONA_SEED = exports.TOURNAMENT_REDDIT_BOT_SEED_VERSION = exports.TOURNAMENT_REDDIT_BOT_PROFILE_COUNT = void 0;
exports.isAcceptedTournamentBotSeedVersion = isAcceptedTournamentBotSeedVersion;
exports.isSafeTournamentBotName = isSafeTournamentBotName;
/**
 * Tournament display-name corpus: 200 invented handles.
 *
 * зачем 2026-08-01 (аудит турнира): раньше здесь лежали 100 НАСТОЯЩИХ ников
 * реальных пользователей Reddit, взятых из обсуждений про изучение языков без
 * согласия этих людей — и использовавшихся как имена соперников в игре на
 * реальные жемчужины. Их пришлось убрать целиком.
 *
 * зачем 2026-08-02 (владелец: «ники все очень однотипные, нет ни одного
 * игрового»): первая замена была плохой. Она брала реальные ники и крутила в
 * них буквы (Gulbasaur → Gullpasaur, BeautyAndGlamour → BeaotyAndGlamaur) —
 * получались нечитаемые опечатки, а не имена. Вторая сотня была ещё хуже:
 * механическая решётка 10 префиксов × 10 существительных (тихий_лис,
 * сонный_кот, рыжий_сова…), где все 100 имён построены по одному шаблону и
 * читаются как список, а не как живые игроки.
 *
 * Теперь корпус собран вручную и намеренно РАЗНОРОДЕН — как в реальном лобби,
 * где ники приходят из разных привычек и поколений игроков:
 *   • слитные слова (frostbyte, tigerlily, moonrunner)
 *   • CamelCase (SilentComet, PixelWarden)
 *   • с подчёркиванием (echo_valley, mint_owl)
 *   • с точкой (nova.k, rain.exe)
 *   • с цифрами — годами, датами, «счастливыми» числами (kite77, vega_2011)
 *   • «детские»/тёплые (пуговка, лисёнок, kittenpaws)
 *   • брутальные (ЖелезныйГром, VoidHunter)
 *   • ленивые строчные (qwe, mmmk, ага)
 *   • кириллица разных стилей (Северянка, кот_на_крыше, Тихий)
 *   • язык/учёба, но без штампов (verbcrush, падежи_бесят)
 * Длины тоже разные: от 3 символов до 18 — как у людей.
 *
 * Персоны ботов (винрейт, цвет, ранг, сложность) НЕ перегенерируются: они
 * привязаны к TOURNAMENT_REDDIT_BOT_PERSONA_SEED, который намеренно оставлен
 * на legacy-версии. Меняются только отображаемые имена.
 *
 * Runtime never contacts Reddit; this reviewed snapshot is the complete source.
 * Corpus SHA-256 (names joined with `\n`) — см. TOURNAMENT_REDDIT_BOT_NAMES_SHA256.
 */
exports.TOURNAMENT_REDDIT_BOT_PROFILE_COUNT = 200;
exports.TOURNAMENT_REDDIT_BOT_SEED_VERSION = 'tournament-bots-v5-handcrafted-20260802';
const TOURNAMENT_REDDIT_BOT_LEGACY_SEED_VERSION = 'tournament-bots-v2-reddit-20260801';
/** Freezes rank, color, titles, and win rate; avatar visuals use their own versioned stream. */
exports.TOURNAMENT_REDDIT_BOT_PERSONA_SEED = TOURNAMENT_REDDIT_BOT_LEGACY_SEED_VERSION;
/**
 * SHA-256 корпуса. ВНИМАНИЕ: считается как sha256(names.join('\n') + '\n') —
 * с завершающим переводом строки. Именно так это делает hashNames() в
 * functions/scripts/seed_tournament_bots.js, и именно это значение скрипт
 * требует повторить флагом --expected-names-sha256 перед записью в прод.
 * Хеш без хвостового '\n' даст другое число и уронит сев.
 */
exports.TOURNAMENT_REDDIT_BOT_NAMES_SHA256 = '1c924a54c39262a7ddafb5f290e9254f987e7226b1a5148384e16c7614011603';
exports.TOURNAMENT_REDDIT_BOT_PROFILE_IDS = Object.freeze(Array.from({ length: exports.TOURNAMENT_REDDIT_BOT_PROFILE_COUNT }, (_, index) => `bot_${String(index + 1).padStart(3, '0')}`));
/**
 * Корпус имён. Порядок намеренно ПЕРЕМЕШАН по стилям: соседние боты в лобби
 * берутся подряд по индексу, и если сгруппировать имена по типам, комната
 * получится «полосатой» — сначала пять латинских, потом пять кириллических.
 */
const HANDCRAFTED_BOT_NAMES = Object.freeze([
    // 001-020
    'frostbyte', 'Северянка', 'kite77', 'mmmk', 'PixelWarden',
    'лисёнок', 'echo_valley', 'nova.k', 'ЖелезныйГром', 'verbcrush',
    'tigerlily', 'ага', 'SilentComet', 'кот_на_крыше', 'rain.exe',
    'vega_2011', 'пуговка', 'VoidHunter', 'mint_owl', 'qwe',
    // 021-040
    'moonrunner', 'Тихий', 'salt_and_pine', 'k1wi', 'ГромкийШёпот',
    'kittenpaws', 'падежи_бесят', 'AshenFox', 'дядя_боря', 'lumen.7',
    'clovercat', 'НеСплю', 'BrassLantern', 'ёжик_в_тумане', 'zed',
    'harborlight', 'Мурлыка', 'GlassTiger', 'три_кота', 'nyx_88',
    // 041-060
    'peppermint', 'Забияка', 'IronPetal', 'сонная_муха', 'drift.io',
    'wolfsbane', 'Кекс', 'NightQuill', 'бабуля_вжарила', 'sol_23',
    'amberwave', 'Пельмень', 'CobaltJay', 'валенок', 'fizz',
    'starlingsky', 'Хмурый', 'RustyCompass', 'чайка_над_морем', 'ivy.05',
    // 061-080
    'thunderpaw', 'Морошка', 'PaleLantern', 'не_мой_день', 'koda',
    'velvetmoth', 'Скворец', 'GoldenHush', 'печенька', 'arc_9',
    'wildfern', 'Барсук', 'SlateHarbor', 'уставший_кит', 'lynx.dev',
    'coppervine', 'Ледышка', 'QuietStorm', 'два_чая', 'orb',
    // 081-100
    'silverbirch', 'Ромашка', 'EmberFinch', 'снежный_ком', 'plum_42',
    'nightjar', 'Кисточка', 'BrightHollow', 'ветер_в_поле', 'tux',
    'foxglove', 'Гроза', 'MistyOak', 'сырок_дружба', 'hex_11',
    'ravenbloom', 'Улитка', 'PineFrost', 'мокрый_асфальт', 'jem',
    // 101-120
    'sunspill', 'Валежник', 'CedarWolf', 'кофе_остыл', 'nim',
    'glacierpine', 'Пряник', 'AmberHollow', 'седьмое_небо', 'vox_3',
    'birchsong', 'Сойка', 'DuskWillow', 'ленивый_пёс', 'kobo',
    'sagebloom', 'Крапива', 'FrostQuill', 'третий_лишний', 'ada.7',
    // 121-140
    'hollowmoon', 'Шишка', 'IronBirch', 'опять_дождь', 'yuki',
    'thistledown', 'Свиристель', 'PaleHarbor', 'без_сахара', 'zen_5',
    'brambleway', 'Оладушек', 'SlateFinch', 'мятный_чай', 'obi',
    'lichenwood', 'Чиж', 'GoldenReef', 'дальний_свет', 'ren.02',
    // 141-160
    'fernwhistle', 'Подорожник', 'DimLantern', 'ночная_смена', 'kai',
    'stonepetal', 'Клюква', 'RustBloom', 'первый_снег', 'ono_6',
    'willowdrift', 'Хорёк', 'AshHarbor', 'громкий_сосед', 'mox',
    'nettlecraft', 'Ольха', 'PineWhisper', 'сонное_царство', 'lior',
    // 161-180
    'duskfeather', 'Смородина', 'CoalFinch', 'вторник_опять', 'suki',
    'mosswing', 'Тетерев', 'FrostHollow', 'горячий_шоколад', 'aze_4',
    'reedwhisper', 'Морозко', 'AmberFinch', 'домой_бы', 'pip',
    'briarlight', 'Зорька', 'SlateWillow', 'полный_вперёд', 'uma.9',
    // 181-200
    'cindervale', 'Рябина', 'PaleOak', 'просто_мимо', 'nori',
    'hazelfrost', 'Совёнок', 'IronReef', 'на_чиле', 'vik_8',
    'larkspur', 'Багульник', 'DimWillow', 'солнце_в_окно', 'juno',
    'quillfeather', 'Ветрогон', 'CedarHush', 'между_делом', 'axo.3',
]);
const DISALLOWED_NAME_PATTERN = /bot|admin|mod(?:erator)?|fuck|shit|cunt|nazi|porn|sex|nipple|racist|hitler|asshole|penis|fart|dick|cock|boob|tits|whore|slut|rape|huesos|khuesos|хуесос|хуй|пизд|бляд|ебан|ёбан/iu;
function isAcceptedTournamentBotSeedVersion(value) {
    return value === exports.TOURNAMENT_REDDIT_BOT_SEED_VERSION
        || value === TOURNAMENT_REDDIT_BOT_LEGACY_SEED_VERSION;
}
function isSafeTournamentBotName(name) {
    const normalized = name.normalize('NFKC').trim().toLowerCase();
    const compact = normalized.replace(/[^\p{L}\p{N}]/gu, '');
    // Точка разрешена наравне с подчёркиванием и дефисом: ники вида nova.k и
    // rain.exe — часть той самой разнородности, ради которой корпус переписан.
    return /^[\p{L}\p{N}._-]{3,20}$/u.test(normalized)
        && !DISALLOWED_NAME_PATTERN.test(compact)
        && !/^(?:\[deleted\]|automoderator)$/iu.test(normalized);
}
exports.REDDIT_BOT_NAMES = Object.freeze([...HANDCRAFTED_BOT_NAMES]);
if (exports.REDDIT_BOT_NAMES.length !== exports.TOURNAMENT_REDDIT_BOT_PROFILE_COUNT
    || new Set(exports.REDDIT_BOT_NAMES.map((name) => name.toLowerCase())).size
        !== exports.TOURNAMENT_REDDIT_BOT_PROFILE_COUNT
    || !exports.REDDIT_BOT_NAMES.every(isSafeTournamentBotName)) {
    throw new Error('tournament_bot_name_corpus_invalid');
}
