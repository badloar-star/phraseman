import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Keyboard,
    KeyboardAvoidingView, Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ContentWrap from '../components/ContentWrap';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { Flashcard, loadFlashcards, removeFlashcard } from '../hooks/use-flashcards';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CUSTOM_KEY = 'custom_flashcards_v2';
const CARD_H  = 260;   // full card height — never changes
const PEEK    = 56;    // visible top strip of each non-active card
const LIST_PAD = Math.round((SCREEN_H - CARD_H) / 2); // center first card
const GAP = 92;    // extra separation pushed away from active card during scroll

// ─── Types ────────────────────────────────────────────────────────────────────
type CategoryId = 'emotions' | 'fillers' | 'reactions' | 'traps' | 'phrasal' | 'situations' | 'connectors' | 'saved' | 'custom';

interface Category {
  id: CategoryId;
  icon: string;
  labelRU: string;
  labelUK: string;
}

interface CardItem {
  id: string;
  en: string;
  ru: string;
  uk: string;
  categoryId: CategoryId;
  isSystem: boolean;
  source?: string;
  sourceId?: string;
}

// ─── Strings ──────────────────────────────────────────────────────────────────
const STR = {
  ru: {
    title: 'Карточки', empty: 'Нет карточек', emptySub: 'Добавьте карточки или выберите другую категорию',
    done: 'Все карточки просмотрены!', doneSub: 'Отличная работа', restart: 'Начать заново',
    cardOf: (a: number, b: number) => `${a} / ${b}`,
    tapFlip: 'Нажми чтобы перевернуть', delete: 'Удалить',
    deleteConfirm: 'Удалить карточку?', deleteConfirmSub: 'Она будет удалена.',
    cancel: 'Отмена', back: 'Назад',
    editFront: 'Английская сторона', editBack: 'Перевод', next: 'Далее →',
    save: 'Сохранить', editCard: 'Редактировать карточку', newCard: 'Новая карточка',
    systemCannotDelete: 'Системные карточки нельзя удалять',
    enterEN: 'Введи английский текст...', enterRU: 'Введи перевод...',
    noDelete: 'Это системная карточка',
    source: { lesson: 'Урок', word: 'Слово', verb: 'Глагол', dialog: 'Диалог' },
  },
  uk: {
    title: 'Картки', empty: 'Немає карток', emptySub: 'Додай картки або вибери іншу категорію',
    done: 'Всі картки переглянуто!', doneSub: 'Чудова робота', restart: 'Почати знову',
    cardOf: (a: number, b: number) => `${a} / ${b}`,
    tapFlip: 'Натисни щоб перевернути', delete: 'Видалити',
    deleteConfirm: 'Видалити картку?', deleteConfirmSub: 'Вона буде видалена.',
    cancel: 'Скасувати', back: 'Назад',
    editFront: 'Англійська сторона', editBack: 'Переклад', next: 'Далі →',
    save: 'Зберегти', editCard: 'Редагувати картку', newCard: 'Нова картка',
    systemCannotDelete: 'Системні картки не можна видаляти',
    enterEN: 'Введи англійський текст...', enterRU: 'Введи переклад...',
    noDelete: 'Це системна картка',
    source: { lesson: 'Урок', word: 'Слово', verb: 'Дієслово', dialog: 'Діалог' },
  },
};

// ─── Static data ──────────────────────────────────────────────────────────────
const CATEGORIES: Category[] = [
  { id: 'saved',      icon: 'bookmark-outline',             labelRU: 'Сохр.',     labelUK: 'Збер.'     },
  { id: 'emotions',   icon: 'heart-outline',               labelRU: 'Эмоции',    labelUK: 'Емоції'    },
  { id: 'fillers',    icon: 'chatbubble-ellipses-outline',  labelRU: 'Филлеры',   labelUK: 'Філери'    },
  { id: 'reactions',  icon: 'flash-outline',                labelRU: 'Реакции',   labelUK: 'Реакції'   },
  { id: 'traps',      icon: 'alert-circle-outline',         labelRU: 'Ловушки',   labelUK: 'Пастки'    },
  { id: 'phrasal',    icon: 'git-branch-outline',           labelRU: 'Глаголы',   labelUK: 'Дієслова'  },
  { id: 'situations',  icon: 'map-outline',                  labelRU: 'Ситуации',  labelUK: 'Ситуації'  },
  { id: 'connectors',  icon: 'git-network-outline',          labelRU: 'Связки',    labelUK: 'Зв\'язки'  },
];

const SOURCE_COLORS: Record<string, string> = {
  lesson: '#4A90D9', word: '#7B68EE', verb: '#E87D3E', dialog: '#50BFA0',
};

function getCardTint(card: CardItem): string | null {
  if (!card.source) return null;
  if (card.source === 'lesson' && card.sourceId) {
    const n = parseInt(card.sourceId, 10);
    if (n <= 8)  return '#4CAF72'; // A1 green
    if (n <= 18) return '#40B4E8'; // A2 blue
    if (n <= 28) return '#D4A017'; // B1 gold
    return '#DC6428';              // B2 orange
  }
  return SOURCE_COLORS[card.source] ?? null;
}

const SYSTEM_CARDS: CardItem[] = [
  // ─── Emotions ─────────────────────────────────────────────────────────────
  { id:'em1',  en:'frustrated',        ru:'раздражён / в тупике',           uk:'роздратований / у безвиході',      categoryId:'emotions', isSystem:true },
  { id:'em2',  en:'overwhelmed',       ru:'захлестнуло / не справляюсь',    uk:'захлинаюсь / не справляюсь',       categoryId:'emotions', isSystem:true },
  { id:'em3',  en:'anxious',           ru:'тревожно / волнуюсь',            uk:'тривожно / хвилююсь',              categoryId:'emotions', isSystem:true },
  { id:'em4',  en:'exhausted',         ru:'вымотан / без сил',              uk:'вимотаний / без сил',              categoryId:'emotions', isSystem:true },
  { id:'em5',  en:'relieved',          ru:'с облегчением / гора с плеч',    uk:'з полегшенням / гора з плечей',    categoryId:'emotions', isSystem:true },
  { id:'em6',  en:'devastated',        ru:'убит горем / раздавлен',         uk:'приголомшений / розбитий',         categoryId:'emotions', isSystem:true },
  { id:'em7',  en:'fed up',            ru:'сыт по горло / надоело',         uk:'набридло / сит по горло',          categoryId:'emotions', isSystem:true },
  { id:'em8',  en:'thrilled',          ru:'в восторге / как я рад!',        uk:'у захваті / надзвичайно радий',    categoryId:'emotions', isSystem:true },
  { id:'em9',  en:'nervous',           ru:'нервничаю / не по себе',         uk:'нервуюсь / не по собі',            categoryId:'emotions', isSystem:true },
  { id:'em10', en:'terrified',         ru:'до смерти напуган / в ужасе',    uk:'страшенно наляканий / в жаху',     categoryId:'emotions', isSystem:true },
  { id:'em11', en:'gutted',            ru:'убит / очень расстроен',         uk:'дуже засмучений / вбитий горем',   categoryId:'emotions', isSystem:true },
  { id:'em12', en:'pumped up',         ru:'заряжен / полон энергии',        uk:'заряджений / сповнений енергії',   categoryId:'emotions', isSystem:true },
  { id:'em13', en:'burnt out',         ru:'выгорел / на нуле',              uk:'вигорів / на нулі',                categoryId:'emotions', isSystem:true },
  { id:'em14', en:'homesick',          ru:'скучаю по дому',                 uk:'сумую за домом',                   categoryId:'emotions', isSystem:true },
  { id:'em15', en:'heartbroken',       ru:'разбито сердце / убит',          uk:'розбите серце / знищений',         categoryId:'emotions', isSystem:true },
  { id:'em16', en:'awkward',           ru:'неловко / неудобная ситуация',   uk:'незручно / ніяково',               categoryId:'emotions', isSystem:true },
  { id:'em17', en:'jealous',           ru:'завидую / ревную',               uk:'заздрю / ревную',                  categoryId:'emotions', isSystem:true },
  { id:'em18', en:'nostalgic',         ru:'ностальгия / тоска по прошлому', uk:'ностальгія / туга за минулим',     categoryId:'emotions', isSystem:true },
  { id:'em19', en:'stressed out',      ru:'в стрессе / на взводе',          uk:'у стресі / на межі',               categoryId:'emotions', isSystem:true },
  { id:'em20', en:'hyped',             ru:'заряжен / жду с нетерпением',    uk:'заряджений / в нетерпінні',        categoryId:'emotions', isSystem:true },

  // ─── Fillers ──────────────────────────────────────────────────────────────
  { id:'fi1',  en:'kind of',           ru:'как бы / немного',               uk:'якось / трохи',                    categoryId:'fillers', isSystem:true },
  { id:'fi2',  en:'basically',         ru:'в общем / короче / по сути',     uk:'взагалі / коротше / по суті',      categoryId:'fillers', isSystem:true },
  { id:'fi3',  en:'literally',         ru:'буквально / вот реально',        uk:'буквально / от реально',           categoryId:'fillers', isSystem:true },
  { id:'fi4',  en:'you know',          ru:'ну ты понимаешь / вот',          uk:'ну ти розумієш / от',              categoryId:'fillers', isSystem:true },
  { id:'fi5',  en:'I mean',            ru:'ну то есть / в смысле',          uk:'ну тобто / в сенсі',               categoryId:'fillers', isSystem:true },
  { id:'fi6',  en:'like',              ru:'ну / как бы (в речи)',           uk:'ну / як би (в мовленні)',           categoryId:'fillers', isSystem:true },
  { id:'fi7',  en:'anyway',            ru:'ладно / в общем / так вот',      uk:'ладно / загалом / так от',         categoryId:'fillers', isSystem:true },
  { id:'fi8',  en:'sort of',           ru:'типа / вроде / как бы',          uk:'типу / ніби / якось',              categoryId:'fillers', isSystem:true },
  { id:'fi9',  en:'whatever',          ru:'ну и ладно / всё равно',         uk:'ну і ладно / байдуже',             categoryId:'fillers', isSystem:true },
  { id:'fi10', en:'obviously',         ru:'ну очевидно / ясное дело',       uk:'ну очевидно / ясна річ',           categoryId:'fillers', isSystem:true },
  { id:'fi11', en:'apparently',        ru:'похоже / оказывается',           uk:'схоже / виявляється',              categoryId:'fillers', isSystem:true },
  { id:'fi12', en:'to be fair',        ru:'справедливости ради',            uk:'справедливості ради',              categoryId:'fillers', isSystem:true },
  { id:'fi13', en:'no offense',        ru:'без обид',                       uk:'без образ',                        categoryId:'fillers', isSystem:true },
  { id:'fi14', en:'by the way',        ru:'кстати / между прочим',          uk:'до речі / між іншим',              categoryId:'fillers', isSystem:true },
  { id:'fi15', en:'honestly',          ru:'честно говоря',                  uk:'чесно кажучи',                     categoryId:'fillers', isSystem:true },
  { id:'fi16', en:'at the end of the day', ru:'в конечном счёте / итого',  uk:'врешті-решт / у підсумку',         categoryId:'fillers', isSystem:true },
  { id:'fi17', en:'to be honest',      ru:'честно говоря',                  uk:'чесно кажучи',                     categoryId:'fillers', isSystem:true },
  { id:'fi18', en:'you see',           ru:'понимаешь / видишь ли',          uk:'розумієш / бачиш',                 categoryId:'fillers', isSystem:true },
  { id:'fi19', en:'right?',            ru:'правда? / да? (ожидаешь согласия)', uk:'правда? / так?',               categoryId:'fillers', isSystem:true },
  { id:'fi20', en:'come to think of it', ru:'если подумать / вот смотри',  uk:'якщо подумати / от дивись',        categoryId:'fillers', isSystem:true },

  // ─── Reactions ────────────────────────────────────────────────────────────
  { id:'re1',  en:'Fair enough',       ru:'ну ладно / принято',             uk:'ну ладно / прийнято',              categoryId:'reactions', isSystem:true },
  { id:'re2',  en:'No way!',           ru:'Не может быть! / Серьёзно?!',    uk:'Не може бути! / Серйозно?!',       categoryId:'reactions', isSystem:true },
  { id:'re3',  en:"That's rough",      ru:'Это тяжело / Сочувствую',        uk:'Це важко / Співчуваю',             categoryId:'reactions', isSystem:true },
  { id:'re4',  en:'Tell me about it!', ru:'Да не говори! / Знаю-знаю!',    uk:'Та не кажи! / Знаю-знаю!',        categoryId:'reactions', isSystem:true },
  { id:'re5',  en:'Good for you!',     ru:'Молодец! / За тебя рад!',        uk:'Молодець! / Радий за тебе!',       categoryId:'reactions', isSystem:true },
  { id:'re6',  en:'That makes sense',  ru:'Это понятно / Логично',          uk:'Це зрозуміло / Логічно',           categoryId:'reactions', isSystem:true },
  { id:'re7',  en:'Come on!',          ru:'Да ладно! / Ну же! / Серьёзно?', uk:'Та ладно! / Ну ж! / Серйозно?',  categoryId:'reactions', isSystem:true },
  { id:'re8',  en:'Oh wow',            ru:'Ого / Вот это да',               uk:'Ого / Оце так',                    categoryId:'reactions', isSystem:true },
  { id:'re9',  en:'Seriously?',        ru:'Серьёзно? / Ты не шутишь?',      uk:'Серйозно? / Ти не жартуєш?',      categoryId:'reactions', isSystem:true },
  { id:'re10', en:'About time!',       ru:'Наконец-то! / Давно пора!',      uk:'Нарешті! / Давно час!',            categoryId:'reactions', isSystem:true },
  { id:'re11', en:'No kidding!',       ru:'Неужели! / Да ты что!',          uk:'Невже! / Та ти що!',               categoryId:'reactions', isSystem:true },
  { id:'re12', en:"That's awesome!",   ru:'Это круто! / Вот это да!',       uk:'Це круто! / Оце так!',             categoryId:'reactions', isSystem:true },
  { id:'re13', en:'Bummer',            ru:'Жаль / Облом / Не повезло',      uk:'Шкода / Облом / Не пощастило',     categoryId:'reactions', isSystem:true },
  { id:'re14', en:'What a shame',      ru:'Как жаль / Какая жалость',       uk:'Яка жалість / Як прикро',          categoryId:'reactions', isSystem:true },
  { id:'re15', en:'I hear you',        ru:'Понимаю / Слышу тебя',           uk:'Розумію / Чую тебе',               categoryId:'reactions', isSystem:true },
  { id:'re16', en:'My bad',            ru:'Моя вина / Облажался',           uk:'Моя вина / Проштрафився',          categoryId:'reactions', isSystem:true },
  { id:'re17', en:'Get out of here!',  ru:'Да ладно! / Иди ты! (удивление)', uk:'Та ладно! / Іди ти! (здивування)', categoryId:'reactions', isSystem:true },
  { id:'re18', en:"You're telling me!", ru:'Ты мне говоришь! / И я о том же', uk:'Та кажи мені! / І я про те ж',  categoryId:'reactions', isSystem:true },
  { id:'re19', en:'Not bad at all',    ru:'Совсем неплохо / Весьма неплохо', uk:'Зовсім непогано / Дуже навіть',  categoryId:'reactions', isSystem:true },
  { id:'re20', en:'I knew it!',        ru:'Я так и знал! / Так и думал!',   uk:'Я так і знав! / Так і думав!',    categoryId:'reactions', isSystem:true },

  // ─── Traps / False friends ────────────────────────────────────────────────
  { id:'tr1',  en:'Actually',          ru:'на самом деле ≠ актуально',      uk:'насправді ≠ актуально',            categoryId:'traps', isSystem:true },
  { id:'tr2',  en:'Eventually',        ru:'в конце концов ≠ скоро',         uk:'зрештою ≠ незабаром',              categoryId:'traps', isSystem:true },
  { id:'tr3',  en:'Embarrassed',       ru:'стыдно / неловко ≠ беременная',  uk:'соромно / ніяково ≠ вагітна',      categoryId:'traps', isSystem:true },
  { id:'tr4',  en:'Accurate',          ru:'точный ≠ аккуратный',            uk:'точний ≠ акуратний',               categoryId:'traps', isSystem:true },
  { id:'tr5',  en:'Sympathetic',       ru:'сочувствующий ≠ симпатичный',    uk:'співчутливий ≠ симпатичний',       categoryId:'traps', isSystem:true },
  { id:'tr6',  en:'Magazine',          ru:'журнал ≠ магазин',               uk:'журнал ≠ магазин',                 categoryId:'traps', isSystem:true },
  { id:'tr7',  en:'Upset',             ru:'расстроен ≠ уставший',           uk:'засмучений ≠ втомлений',           categoryId:'traps', isSystem:true },
  { id:'tr8',  en:'Sensible',          ru:'здравомыслящий ≠ сенсационный',  uk:'розсудливий ≠ сенсаційний',        categoryId:'traps', isSystem:true },
  { id:'tr9',  en:'Decade',            ru:'десятилетие ≠ декада (10 дней)', uk:'десятиліття ≠ декада (10 днів)',   categoryId:'traps', isSystem:true },
  { id:'tr10', en:'Pretend',           ru:'притворяться ≠ претендовать',    uk:'вдавати ≠ претендувати',           categoryId:'traps', isSystem:true },
  { id:'tr11', en:'Realize',           ru:'осознать / понять ≠ реализовать', uk:'усвідомити ≠ реалізувати',        categoryId:'traps', isSystem:true },
  { id:'tr12', en:'Ordinary',          ru:'обычный ≠ посредственный',       uk:'звичайний ≠ посередній',           categoryId:'traps', isSystem:true },
  { id:'tr13', en:'Intelligent',       ru:'умный ≠ интеллигентный (рус.)',   uk:'розумний ≠ інтелігентний (укр.)', categoryId:'traps', isSystem:true },
  { id:'tr14', en:'Nervous',           ru:'нервничающий ≠ нервный тип',     uk:'знервований ≠ нервова людина',     categoryId:'traps', isSystem:true },
  { id:'tr15', en:'Prospect',          ru:'перспектива ≠ проспект (улица)', uk:'перспектива ≠ проспект (вулиця)',  categoryId:'traps', isSystem:true },
  { id:'tr16', en:'Brilliant',         ru:'замечательный (брит.) ≠ яркий',  uk:'чудовий (брит.) ≠ лише яскравий', categoryId:'traps', isSystem:true },
  { id:'tr17', en:'Cabinet',           ru:'шкаф / каб. министров ≠ кабинет врача', uk:'шафа / кабінет міністрів ≠ кабінет лікаря', categoryId:'traps', isSystem:true },
  { id:'tr18', en:'Phrase',            ru:'фраза ≠ предложение (sentence)', uk:'фраза ≠ речення (sentence)',       categoryId:'traps', isSystem:true },
  { id:'tr19', en:'Proper',            ru:'настоящий / правильный ≠ собственный', uk:'справжній ≠ власний',       categoryId:'traps', isSystem:true },
  { id:'tr20', en:'Comprehensive',     ru:'полный / всеобъемлющий ≠ понятный', uk:'повний ≠ зрозумілий (comprehensible)', categoryId:'traps', isSystem:true },

  // ─── Phrasal verbs ────────────────────────────────────────────────────────
  { id:'ph1',  en:'figure out',        ru:'разобраться / понять',           uk:'розібратись / зрозуміти',          categoryId:'phrasal', isSystem:true },
  { id:'ph2',  en:'follow up',         ru:'уточнить / напомнить',           uk:'уточнити / нагадати',              categoryId:'phrasal', isSystem:true },
  { id:'ph3',  en:'grow apart',        ru:'отдалиться / разойтись',         uk:'віддалитись / розійтись',          categoryId:'phrasal', isSystem:true },
  { id:'ph4',  en:'give up',           ru:'сдаться / бросить',              uk:'здатись / кинути',                 categoryId:'phrasal', isSystem:true },
  { id:'ph5',  en:'look into',         ru:'изучить / разобраться с',        uk:'вивчити / розібратись з',          categoryId:'phrasal', isSystem:true },
  { id:'ph6',  en:'come up with',      ru:'придумать / предложить идею',    uk:'придумати / запропонувати ідею',   categoryId:'phrasal', isSystem:true },
  { id:'ph7',  en:'run out of',        ru:'закончиться / иссякнуть',        uk:'закінчитись / вичерпатись',        categoryId:'phrasal', isSystem:true },
  { id:'ph8',  en:'put off',           ru:'откладывать / переносить',       uk:'відкладати / переносити',          categoryId:'phrasal', isSystem:true },
  { id:'ph9',  en:'get along',         ru:'ладить / уживаться',             uk:'ладнати / порозумітися',           categoryId:'phrasal', isSystem:true },
  { id:'ph10', en:'bring up',          ru:'поднять тему / упомянуть',       uk:'підняти тему / згадати',           categoryId:'phrasal', isSystem:true },
  { id:'ph11', en:'let down',          ru:'разочаровать / подвести',        uk:'розчарувати / підвести',           categoryId:'phrasal', isSystem:true },
  { id:'ph12', en:'catch up',          ru:'наверстать / встретиться',       uk:'надолужити / побачитись',          categoryId:'phrasal', isSystem:true },
  { id:'ph13', en:'deal with',         ru:'разобраться / справиться',       uk:'розібратись / впоратись',          categoryId:'phrasal', isSystem:true },
  { id:'ph14', en:'end up',            ru:'оказаться в итоге',              uk:'опинитись у підсумку',             categoryId:'phrasal', isSystem:true },
  { id:'ph15', en:'fall apart',        ru:'разваливаться / рассыпаться',    uk:'розвалюватись / розсипатись',      categoryId:'phrasal', isSystem:true },
  { id:'ph16', en:'get over',          ru:'пережить / справиться с потерей', uk:'пережити / впоратись з втратою', categoryId:'phrasal', isSystem:true },
  { id:'ph17', en:'hold on',           ru:'подождите / держись',            uk:'почекайте / тримайся',             categoryId:'phrasal', isSystem:true },
  { id:'ph18', en:'make up',           ru:'помириться; придумать (историю)', uk:'помиритись; вигадати',            categoryId:'phrasal', isSystem:true },
  { id:'ph19', en:'point out',         ru:'указать / обратить внимание',    uk:'вказати / звернути увагу',         categoryId:'phrasal', isSystem:true },
  { id:'ph20', en:'turn out',          ru:'оказаться / выясниться',         uk:"виявитись / з'ясуватись",          categoryId:'phrasal', isSystem:true },

  // ─── Situations ───────────────────────────────────────────────────────────
  { id:'si1',  en:'Sorry to keep you waiting', ru:'Прости, что заставил ждать', uk:'Вибач, що змусив чекати',    categoryId:'situations', isSystem:true },
  { id:'si2',  en:"What's taking so long?",    ru:'Ну и сколько тебя ждать?',    uk:'Ну і скільки тебе чекати?', categoryId:'situations', isSystem:true },
  { id:'si3',  en:'Something came up',         ru:'Кое-что случилось / Возникло дело', uk:'Дещо трапилось / Виникла справа', categoryId:'situations', isSystem:true },
  { id:'si4',  en:"Let's call it a day",       ru:'На сегодня хватит / Заканчиваем', uk:'На сьогодні досить / Закінчуємо', categoryId:'situations', isSystem:true },
  { id:'si5',  en:"I'll get back to you",      ru:'Я дам ответ позже',          uk:'Я дам відповідь пізніше',      categoryId:'situations', isSystem:true },
  { id:'si6',  en:'Can we reschedule?',        ru:'Можем перенести встречу?',    uk:'Можемо перенести зустріч?',    categoryId:'situations', isSystem:true },
  { id:'si7',  en:"I'm on my way",             ru:'Я уже еду / иду к тебе',      uk:'Я вже їду / іду до тебе',      categoryId:'situations', isSystem:true },
  { id:'si8',  en:'That works for me',         ru:'Мне подходит / Меня устраивает', uk:'Мені підходить / Мене влаштовує', categoryId:'situations', isSystem:true },
  { id:'si9',  en:'It slipped my mind',        ru:'Вылетело из головы / Забыл',  uk:'Вилетіло з голови / Забув',    categoryId:'situations', isSystem:true },
  { id:'si10', en:'I owe you one',             ru:'Я твой должник / Буду должен', uk:'Я твій боржник',              categoryId:'situations', isSystem:true },
  { id:'si11', en:'Just checking in',          ru:'Просто хотел узнать как дела', uk:'Просто хотів дізнатись як справи', categoryId:'situations', isSystem:true },
  { id:'si12', en:'Bear with me',              ru:'Потерпи немного / Дай мне время', uk:'Потерпи трохи / Дай мені час', categoryId:'situations', isSystem:true },
  { id:'si13', en:'Long story short',          ru:'Короче говоря / Если вкратце', uk:'Коротше кажучи / Якщо коротко', categoryId:'situations', isSystem:true },
  { id:'si14', en:'My hands are full',         ru:'Я очень занят / Рук не хватает', uk:'Я дуже зайнятий / Рук не вистачає', categoryId:'situations', isSystem:true },
  { id:'si15', en:"I'll keep that in mind",    ru:'Я учту это / Буду иметь в виду', uk:'Я врахую це / Матиму на увазі', categoryId:'situations', isSystem:true },
  { id:'si16', en:"Sorry, I'm running late",   ru:'Извини, я опаздываю',         uk:'Вибач, я спізнююсь',           categoryId:'situations', isSystem:true },
  { id:'si17', en:'You had me worried',        ru:'Ты меня напугал / Я беспокоился', uk:'Ти мене налякав / Я хвилювався', categoryId:'situations', isSystem:true },
  { id:'si18', en:'Could you do me a favor?',  ru:'Ты не мог бы мне помочь?',    uk:'Ти не міг би мені допомогти?', categoryId:'situations', isSystem:true },
  { id:'si19', en:"Let's touch base",          ru:'Давай свяжемся / Поговорим',  uk:"Давай зв'яжемось / Поговоримо", categoryId:'situations', isSystem:true },
  { id:'si20', en:"I'll take your word for it",ru:'Верю тебе на слово',          uk:'Вірю тобі на слово',           categoryId:'situations', isSystem:true },

  // ─── Connectors / Discourse markers ──────────────────────────────────────
  // Чтобы начать мысль
  { id:'co1',  en:'First of all',           ru:'Прежде всего / Для начала',      uk:'Перш за все / Для початку',        categoryId:'connectors', isSystem:true },
  { id:'co2',  en:'To begin with',          ru:'Начнём с того, что / Для начала', uk:'Почнімо з того, що / Для початку', categoryId:'connectors', isSystem:true },
  { id:'co3',  en:"Let's start with",       ru:'Начнём с...',                    uk:'Почнімо з...',                     categoryId:'connectors', isSystem:true },
  { id:'co4',  en:'The first thing is',     ru:'Первое, что важно...',           uk:'Перше, що важливо...',             categoryId:'connectors', isSystem:true },
  { id:'co5',  en:'To start off',           ru:'Для начала / Начну с того',      uk:'Для початку / Почну з того',       categoryId:'connectors', isSystem:true },
  // Чтобы продолжить
  { id:'co6',  en:'Also',                   ru:'Также / К тому же',              uk:'Також / До того ж',                categoryId:'connectors', isSystem:true },
  { id:'co7',  en:'Moreover',               ru:'Более того / Кроме того',        uk:'Більш того / Крім того',           categoryId:'connectors', isSystem:true },
  { id:'co8',  en:'In addition',            ru:'Вдобавок / Помимо этого',        uk:'На додаток / Окрім цього',         categoryId:'connectors', isSystem:true },
  { id:'co9',  en:'Besides',               ru:'К тому же / Помимо этого',        uk:'До того ж / Крім цього',           categoryId:'connectors', isSystem:true },
  { id:'co10', en:"What's more",            ru:'Что ещё важнее / Мало того',     uk:'Що ще важливіше / Мало того',      categoryId:'connectors', isSystem:true },
  // Чтобы сравнить
  { id:'co11', en:'Similarly',              ru:'Аналогично / Похожим образом',   uk:'Аналогічно / Схожим чином',        categoryId:'connectors', isSystem:true },
  { id:'co12', en:'Likewise',              ru:'Так же / Аналогично',             uk:'Так само / Аналогічно',            categoryId:'connectors', isSystem:true },
  { id:'co13', en:'In the same way',        ru:'Таким же образом',               uk:'Таким же чином',                   categoryId:'connectors', isSystem:true },
  { id:'co14', en:'Compared to',            ru:'По сравнению с...',              uk:'Порівняно з...',                   categoryId:'connectors', isSystem:true },
  { id:'co15', en:'Just like',              ru:'Точно так же, как...',           uk:'Так само, як...',                  categoryId:'connectors', isSystem:true },
  // Чтобы объяснить причину
  { id:'co16', en:'Because',                ru:'Потому что / Так как',           uk:'Тому що / Оскільки',               categoryId:'connectors', isSystem:true },
  { id:'co17', en:'Since',                  ru:'Поскольку / Так как',            uk:'Оскільки / Так як',                categoryId:'connectors', isSystem:true },
  { id:'co18', en:'As',                     ru:'Так как / Поскольку (в начале)', uk:'Так як / Оскільки (на початку)',   categoryId:'connectors', isSystem:true },
  { id:'co19', en:"That's why",             ru:'Вот почему / Поэтому',           uk:'Ось чому / Тому',                  categoryId:'connectors', isSystem:true },
  { id:'co20', en:'Due to',                 ru:'Из-за / Благодаря (чему-то)',    uk:'Через / Завдяки (чомусь)',          categoryId:'connectors', isSystem:true },
  // Чтобы уточнить
  { id:'co21', en:'In fact',                ru:'На самом деле / Фактически',     uk:'Насправді / Фактично',             categoryId:'connectors', isSystem:true },
  { id:'co22', en:'In other words',         ru:'Другими словами / То есть',      uk:'Іншими словами / Тобто',           categoryId:'connectors', isSystem:true },
  { id:'co23', en:'To be more precise',     ru:'Если быть точнее',              uk:'Якщо бути точнішим',               categoryId:'connectors', isSystem:true },
  { id:'co24', en:'Specifically',           ru:'Конкретно / В частности',        uk:'Конкретно / Зокрема',              categoryId:'connectors', isSystem:true },
  { id:'co25', en:'That is to say',         ru:'То есть / Иными словами',        uk:'Тобто / Іншими словами',           categoryId:'connectors', isSystem:true },
  // Чтобы структурировать
  { id:'co26', en:'Firstly',                ru:'Во-первых',                      uk:'По-перше',                         categoryId:'connectors', isSystem:true },
  { id:'co27', en:'Secondly',               ru:'Во-вторых',                      uk:'По-друге',                         categoryId:'connectors', isSystem:true },
  { id:'co28', en:'Then',                   ru:'Затем / Потом',                  uk:'Потім / Після цього',              categoryId:'connectors', isSystem:true },
  { id:'co29', en:'After that',             ru:'После этого / Затем',            uk:'Після цього / Потім',              categoryId:'connectors', isSystem:true },
  { id:'co30', en:'Finally',                ru:'Наконец / В конце концов',       uk:'Нарешті / Врешті-решт',            categoryId:'connectors', isSystem:true },
  // Чтобы вставить мнение
  { id:'co31', en:'I think',                ru:'Я думаю / По-моему',             uk:'Я думаю / На мою думку',           categoryId:'connectors', isSystem:true },
  { id:'co32', en:'I believe',              ru:'Я считаю / Я убеждён',           uk:'Я вважаю / Я переконаний',         categoryId:'connectors', isSystem:true },
  { id:'co33', en:'In my opinion',          ru:'По моему мнению',               uk:'На мою думку',                     categoryId:'connectors', isSystem:true },
  { id:'co34', en:'From my point of view',  ru:'С моей точки зрения',           uk:'З моєї точки зору',                categoryId:'connectors', isSystem:true },
  { id:'co35', en:'Personally',             ru:'Лично я / Если спросить меня',   uk:'Особисто я / Якщо запитати мене', categoryId:'connectors', isSystem:true },
];

const savedToCard = (f: Flashcard): CardItem => ({
  id: f.id, en: f.en, ru: f.ru, uk: f.uk ?? f.ru,
  categoryId: 'saved', isSystem: false,
  source: f.source, sourceId: f.sourceId,
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function FlashcardsScreen() {
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const router   = useRouter();
  const s        = STR[lang];
  const insets   = useSafeAreaInsets();

  // ── State ──────────────────────────────────────────────────────────────────
  const [activeCat, setActiveCat]     = useState<CategoryId>('saved');
  const [cards, setCards]             = useState<CardItem[]>([]);
  const [filteredCards, setFilteredCards] = useState<CardItem[]>([]);
  const [activeFilter, setActiveFilter]   = useState<string>('all');
  const [filterOpen, setFilterOpen]       = useState(false);
  const [savedCards, setSavedCards]   = useState<CardItem[]>([]);
  const [customCards, setCustomCards] = useState<CardItem[]>([]);
  const [index, setIndex]             = useState(0);
  const [isFlipped, setIsFlipped]     = useState(false);
  const [allFlipped, setAllFlipped]   = useState(false);
  const [isFlipping, setIsFlipping]   = useState(false);
  const cardFlipAnims                 = useRef<Animated.Value[]>([]);
  const isFlippedRef                  = useRef(false);
  const [loading, setLoading]         = useState(true);
  const sessionDoneRef                = useRef(false); // achievement fired once per session
  // Create / Edit / Practice mode
  const [mode, setMode]               = useState<'view' | 'create' | 'edit' | 'practice'>('view');
  const [createStep, setCreateStep]   = useState<'front' | 'back'>('front');
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [draftEN, setDraftEN]         = useState('');
  const [draftTR, setDraftTR]         = useState(''); // translation

  // Refs
  const backInputRef     = useRef<any>(null);
  const practiceInputRef = useRef<any>(null);
  const flatListRef      = useRef<any>(null);

  // Practice state
  const [practiceQueue,  setPracticeQueue]  = useState<CardItem[]>([]);
  const [practiceInput,  setPracticeInput]  = useState('');
  const [practiceStatus, setPracticeStatus] = useState<'idle'|'correct'|'wrong'>('idle');

  // Animations
  const flipAnim    = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(0)).current;
  const createFlipAnim = useRef(new Animated.Value(0)).current;
  const scrollY     = useRef(new Animated.Value(0)).current;
  const focusAnim   = useRef(new Animated.Value(1)).current;


  // ── Load ───────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    const [saved, customRaw] = await Promise.all([
      loadFlashcards(),
      AsyncStorage.getItem(CUSTOM_KEY),
    ]);
    const custom: CardItem[] = customRaw ? JSON.parse(customRaw) : [];
    setSavedCards(saved.map(savedToCard));
    setCustomCards(custom);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, []);

  // ── Active cards for current category ──────────────────────────────────────
  useEffect(() => {
    let list: CardItem[] = [];
    if (activeCat === 'saved')  list = savedCards;
    else if (activeCat === 'custom') list = customCards;
    else list = SYSTEM_CARDS.filter(c => c.categoryId === activeCat);
    setCards(list);
    setActiveFilter('all');
    setIndex(0);
    setIsFlipped(false);
    flipAnim.setValue(0);
    cardFlipAnims.current.forEach(a => a.setValue(0));
  }, [activeCat, savedCards, customCards]);

  // ── Apply filter ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeFilter === 'all') {
      setFilteredCards(cards);
    } else {
      setFilteredCards(cards.filter(c => {
        if (activeFilter.startsWith('lesson:')) {
          return c.source === 'lesson' && c.sourceId === activeFilter.slice(7);
        }
        return c.source === activeFilter;
      }));
    }
    setIndex(0);
    setIsFlipped(false);
    flipAnim.setValue(0);
  }, [activeFilter, cards]);

  // ── Reset flip + pulse focus on card change ────────────────────────────────
  useEffect(() => {
    setIsFlipped(false);
    flipAnim.setValue(0);
    focusAnim.setValue(0.96);
    Animated.spring(focusAnim, { toValue: 1, useNativeDriver: true, friction: 7, tension: 120 }).start();
  }, [index]);

  // ── Sync per-card flip anims array ────────────────────────────────────────
  useEffect(() => {
    const cur = cardFlipAnims.current;
    while (cur.length < filteredCards.length) cur.push(new Animated.Value(0));
  }, [filteredCards.length]);

  const currentCard = filteredCards[index] ?? null;

  // ── Category switch with slide animation ───────────────────────────────────
  const switchCategory = (catId: CategoryId) => {
    if (catId === activeCat) return;
    Animated.timing(slideAnim, { toValue: -SCREEN_W, duration: 200, useNativeDriver: true }).start(() => {
      setActiveCat(catId);
      slideAnim.setValue(SCREEN_W);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 8, tension: 80 }).start();
    });
  };

  // ── Flip ───────────────────────────────────────────────────────────────────
  const handleFlip = () => {
    const toValue = isFlipped ? 0 : 1;
    const next = !isFlipped;
    setIsFlipped(next);
    isFlippedRef.current = next;
    const cardAnim = cardFlipAnims.current[index];
    const cfg = { useNativeDriver: true, friction: 9, tension: 120 };
    setIsFlipping(true);
    if (cardAnim) Animated.spring(cardAnim, { toValue, ...cfg }).start();
    Animated.spring(flipAnim, { toValue, ...cfg }).start(() => setIsFlipping(false));
  };

  // ── Flip all cards top-to-bottom with 80ms stagger ────────────────────────
  const handleFlipAll = useCallback(() => {
    const toValue = allFlipped ? 0 : 1;
    const cfg = { useNativeDriver: true, friction: 8, tension: 80 };
    // Active card (flipAnim) flips immediately
    Animated.spring(flipAnim, { toValue, ...cfg }).start();
    // All other cards flip with stagger
    cardFlipAnims.current.slice(0, filteredCards.length).forEach((anim, i) => {
      setTimeout(() => Animated.spring(anim, { toValue, ...cfg }).start(), i * 80);
    });
    setAllFlipped(!allFlipped);
    setIsFlipped(toValue === 1);
    isFlippedRef.current = toValue === 1;
  }, [allFlipped, filteredCards.length, flipAnim]);

  // ── Flip back then change index ────────────────────────────────────────────
  const pendingIndexRef = useRef<number | null>(null);
  const isAnimatingFlipBack = useRef(false);

  const changeIndex = useCallback((newIdx: number) => {
    if (!isFlippedRef.current) {
      setIndex(newIdx);
      return;
    }
    if (isAnimatingFlipBack.current) return;
    isAnimatingFlipBack.current = true;
    pendingIndexRef.current = newIdx;
    Animated.spring(flipAnim, { toValue: 0, useNativeDriver: true, friction: 8, tension: 70 }).start(() => {
      setIsFlipped(false);
      isFlippedRef.current = false;
      isAnimatingFlipBack.current = false;
      if (pendingIndexRef.current !== null) {
        setIndex(pendingIndexRef.current);
        pendingIndexRef.current = null;
      }
    });
  }, [flipAnim]);

  // ── Filter options — must be before any early return ─────────────────────
  const SOURCE_LABELS: Record<string, string> = {
    word: 'Слова', verb: 'Глаголы', dialog: 'Диалоги',
    quiz: 'Квизы', daily_phrase: 'Фраза дня',
  };
  const filterOptions: { key: string; label: string }[] = useMemo(() => {
    if (activeCat !== 'saved' && activeCat !== 'custom') return [];
    const lessons = new Map<string, number>(); // sourceId → num
    const others  = new Map<string, string>(); // source → label
    for (const c of cards) {
      if (c.source === 'lesson' && c.sourceId) {
        const n = parseInt(c.sourceId, 10);
        if (!isNaN(n)) lessons.set(c.sourceId, n);
      } else if (c.source) {
        if (!others.has(c.source)) {
          others.set(c.source, SOURCE_LABELS[c.source] ?? c.source);
        }
      }
    }
    if (lessons.size === 0 && others.size === 0) return [];
    const lessonOpts = Array.from(lessons.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([id]) => ({ key: `lesson:${id}`, label: `Урок ${id}` }));
    const otherOpts = Array.from(others.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([key, label]) => ({ key, label }));
    return [
      { key: 'all', label: lang === 'uk' ? 'Всі' : 'Все' },
      ...lessonOpts,
      ...otherOpts,
    ];
  }, [cards, activeCat, lang]);

  // Reset session-done flag when category or cards change
  useEffect(() => { sessionDoneRef.current = false; }, [activeCat, cards.length]);

  // ── Scroll to card when category switches ─────────────────────────────────
  useEffect(() => {
    if (flatListRef.current) {
      (flatListRef.current as any).scrollTo({ y: 0, animated: false });
    }
  }, [activeCat]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = () => {
    if (!currentCard) return;
    if (currentCard.isSystem) { Alert.alert(s.noDelete, s.systemCannotDelete); return; }
    Alert.alert(s.deleteConfirm, s.deleteConfirmSub, [
      { text: s.cancel, style: 'cancel' },
      {
        text: s.delete, style: 'destructive',
        onPress: async () => {
          if (currentCard.categoryId === 'saved') {
            await removeFlashcard(currentCard.id);
            await loadAll();
          } else if (currentCard.categoryId === 'custom') {
            const updated = customCards.filter(c => c.id !== currentCard.id);
            await AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(updated));
            setCustomCards(updated);
          }
          const updated = cards.filter(c => c.id !== currentCard.id);
          setCards(updated);
          const ni = Math.min(index, updated.length - 1);
          setIndex(Math.max(0, ni));
          setIsFlipped(false); flipAnim.setValue(0);
        },
      },
    ]);
  };

  // ── Create / Edit ──────────────────────────────────────────────────────────
  const startCreate = () => {
    setDraftEN(''); setDraftTR('');
    setEditingId(null);
    setCreateStep('front');
    createFlipAnim.setValue(0);
    setMode('create');
  };

  const startEdit = (card: CardItem) => {
    setDraftEN(card.en); setDraftTR(lang === 'uk' ? card.uk : card.ru);
    setEditingId(card.id);
    setCreateStep('front');
    createFlipAnim.setValue(0);
    setMode('edit');
  };

  const handleCreateNext = () => {
    if (!draftEN.trim()) return;
    setCreateStep('back');
    Animated.spring(createFlipAnim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 70 }).start(() => {
      backInputRef.current?.focus();
    });
  };

  const handleSave = async () => {
    if (!draftTR.trim()) return;
    Keyboard.dismiss();
    const newCard: CardItem = {
      id: editingId ?? `custom_${Date.now()}`,
      en: draftEN.trim(),
      ru: lang === 'uk' ? draftTR.trim() : draftTR.trim(),
      uk: lang === 'uk' ? draftTR.trim() : draftTR.trim(),
      categoryId: 'custom',
      isSystem: false,
    };
    let updated: CardItem[];
    if (editingId) {
      updated = customCards.map(c => c.id === editingId ? newCard : c);
    } else {
      updated = [...customCards, newCard];
    }
    await AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(updated));
    setCustomCards(updated);
    slideAnim.setValue(0);
    setActiveCat('custom');
    setMode('view');
  };

  const cancelCreate = () => {
    setMode('view');
    setCreateStep('front');
    createFlipAnim.setValue(0);
  };

  // ── Practice ───────────────────────────────────────────────────────────────
  const startPractice = () => {
    if (customCards.length === 0) return;
    const shuffled = shuffle([...customCards]);
    setPracticeQueue(shuffled);
    setPracticeInput('');
    setPracticeStatus('idle');
    setMode('practice');
  };

  const submitPractice = () => {
    if (practiceStatus !== 'idle' || practiceQueue.length === 0) return;
    const card = practiceQueue[0];
    const answer = practiceInput.trim().toLowerCase();
    const correct = (lang === 'uk' ? card.uk : card.ru).trim().toLowerCase();
    setPracticeStatus(answer === correct ? 'correct' : 'wrong');
  };

  const practiceGoNext = () => {
    if (practiceStatus === 'correct') {
      setPracticeQueue(q => q.slice(1));
    } else {
      setPracticeQueue(q => [...q.slice(1), q[0]]);
    }
    setPracticeInput('');
    setPracticeStatus('idle');
    setTimeout(() => practiceInputRef.current?.focus(), 50);
  };

  // ── Flip interpolations ────────────────────────────────────────────────────
  const frontRotate = flipAnim.interpolate({ inputRange:[0,1], outputRange:['0deg','180deg'] });
  const backRotate  = flipAnim.interpolate({ inputRange:[0,1], outputRange:['180deg','360deg'] });
  const frontOp     = flipAnim.interpolate({ inputRange:[0,0.49,0.5,1], outputRange:[1,1,0,0] });
  const backOp      = flipAnim.interpolate({ inputRange:[0,0.49,0.5,1], outputRange:[0,0,1,1] });

  const cfFrontRot  = createFlipAnim.interpolate({ inputRange:[0,1], outputRange:['0deg','180deg'] });
  const cfBackRot   = createFlipAnim.interpolate({ inputRange:[0,1], outputRange:['180deg','360deg'] });
  const cfFrontOp   = createFlipAnim.interpolate({ inputRange:[0,0.49,0.5,1], outputRange:[1,1,0,0] });
  const cfBackOp    = createFlipAnim.interpolate({ inputRange:[0,0.49,0.5,1], outputRange:[0,0,1,1] });

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) return (
    <ScreenGradient>
    <SafeAreaView style={[st.safe, { justifyContent:'center', alignItems:'center' }]}>
      <ActivityIndicator color={t.accent} size="large" />
    </SafeAreaView>
    </ScreenGradient>
  );

  // ── Create / Edit mode ────────────────────────────────────────────────────
  if (mode === 'create' || mode === 'edit') {
    return (
      <ScreenGradient>
      <SafeAreaView style={[st.safe]}>
        <StatusBar barStyle="light-content" />
        <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Top section — shrinks when keyboard opens */}
        <View style={{ flex:1 }}>
          {/* Header */}
          <View style={[st.header, { borderBottomColor: t.border }]}>
            <TouchableOpacity onPress={cancelCreate} style={{ width: 40 }}>
              <Ionicons name="close" size={26} color={t.textMuted} />
            </TouchableOpacity>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700' }}>
              {mode === 'edit' ? s.editCard : s.newCard}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Step indicator */}
          <View style={{ flexDirection:'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 }}>
            <View style={{ flex:1, height:3, borderRadius:2, backgroundColor: t.accent }} />
            <View style={{ flex:1, height:3, borderRadius:2, backgroundColor: createStep === 'back' ? t.accent : t.border }} />
          </View>

          {/* Card */}
          <View style={{ height: 260, marginHorizontal: 16, position:'relative' }}>
            {/* Front — EN input */}
            <Animated.View style={[st.card, {
              backgroundColor: t.bgCard, borderColor: t.border,
              transform: [{ perspective:1200 }, { rotateY: cfFrontRot }],
              opacity: cfFrontOp,
            }]}>
              <Text style={{ color: t.textGhost, fontSize: 11, fontWeight:'800', letterSpacing:1.5, marginBottom:12 }}>EN</Text>
              <TextInput
                style={{ color: t.textPrimary, fontSize: f.h1, fontWeight:'700', textAlign:'center', width:'100%' }}
                placeholder={s.enterEN}
                placeholderTextColor={t.textGhost}
                value={draftEN}
                onChangeText={setDraftEN}
                autoFocus={createStep === 'front'}
                returnKeyType="next"
                onSubmitEditing={handleCreateNext}
                blurOnSubmit={false}
                maxLength={80}
              />
            </Animated.View>

            {/* Back — Translation input */}
            <Animated.View style={[st.card, {
              backgroundColor: t.bgSurface, borderColor: t.accent,
              transform: [{ perspective:1200 }, { rotateY: cfBackRot }],
              opacity: cfBackOp,
            }]}>
              <Text style={{ color: t.accent, fontSize: 11, fontWeight:'800', letterSpacing:1.5, marginBottom:12 }}>
                {lang === 'uk' ? 'UK' : 'RU'}
              </Text>
              <TextInput
                ref={backInputRef}
                style={{ color: t.textPrimary, fontSize: f.h1, fontWeight:'700', textAlign:'center', width:'100%' }}
                placeholder={s.enterRU}
                placeholderTextColor={t.textGhost}
                value={draftTR}
                onChangeText={setDraftTR}
                returnKeyType="done"
                onSubmitEditing={handleSave}
                blurOnSubmit={true}
                maxLength={80}
              />
              <Text style={{ color: t.textGhost, fontSize: f.sub, marginTop: 12, textAlign:'center', fontStyle:'italic' }}>
                {draftEN}
              </Text>
            </Animated.View>
          </View>

          {/* Action buttons — directly under card */}
          <View style={{ paddingHorizontal:16, paddingTop:12, gap: 10 }}>
            {/* Flip button */}
            {createStep === 'back' && (
              <TouchableOpacity
                style={[st.navBtnPrimary, { backgroundColor: t.bgSurface, borderWidth: 1, borderColor: t.accent }]}
                onPress={handleCreateNext}
              >
                <Ionicons name="swap-horizontal-outline" size={18} color={t.accent} style={{ marginRight: 8 }} />
                <Text style={{ color: t.accent, fontSize: f.body, fontWeight:'700' }}>{lang === 'uk' ? 'Обернути' : 'Перевернуть'}</Text>
              </TouchableOpacity>
            )}

            {/* Primary action button */}
            {createStep === 'front' ? (
              <TouchableOpacity
                style={[st.navBtnPrimary, { backgroundColor: draftEN.trim() ? t.accent : t.bgSurface }]}
                onPress={handleCreateNext}
                disabled={!draftEN.trim()}
              >
                <Text style={{ color: draftEN.trim() ? t.correctText : t.textGhost, fontSize: f.body, fontWeight:'700' }}>{s.next}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[st.navBtnPrimary, { backgroundColor: draftTR.trim() ? t.correct : t.bgSurface }]}
                onPress={handleSave}
                disabled={!draftTR.trim()}
              >
                <Ionicons name="checkmark" size={18} color={draftTR.trim() ? '#fff' : t.textGhost} style={{ marginRight: 8 }} />
                <Text style={{ color: draftTR.trim() ? '#fff' : t.textGhost, fontSize: f.body, fontWeight:'700' }}>{s.save}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      </ScreenGradient>
    );
  }

  // ── Category bar (tab-bar style, horizontally scrollable) ─────────────────
  const CategoryBar = () => (
    <View style={{ borderTopWidth:0.5, borderTopColor:t.border, backgroundColor: t.bgPrimary }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingTop:6, paddingBottom:4 }}>
        {CATEGORIES.map(cat => {
          const active = cat.id === activeCat;
          const color = active ? t.textPrimary : t.textMuted;
          const label = lang === 'uk' ? cat.labelUK : cat.labelRU;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => switchCategory(cat.id)}
              activeOpacity={0.7}
              style={{ width:68, alignItems:'center', gap:2, position:'relative' }}
            >
              {active && (
                <View style={{ position:'absolute', bottom:-4, left:'25%', right:'25%', height:2, borderRadius:1, backgroundColor:t.textPrimary }} />
              )}
              <Ionicons name={cat.icon as any} size={33} color={color} />
              <Text style={{ fontSize:10, color, fontWeight: active ? '600' : '400', letterSpacing:0.1 }} numberOfLines={1} adjustsFontSizeToFit>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {/* Right-edge fade — hints that there are more tabs to scroll to */}
      <View pointerEvents="none" style={{ position:'absolute', right:0, top:0, bottom:0, width:40, flexDirection:'row' }}>
        {[0, 0.15, 0.4, 0.75].map((opacity, i) => (
          <View key={i} style={{ flex:1, backgroundColor: t.bgPrimary, opacity }} />
        ))}
      </View>
    </View>
  );

  // ── Practice mode ──────────────────────────────────────────────────────────
  if (mode === 'practice') {
    const practiceCard = practiceQueue[0] ?? null;
    const practiceTr = practiceCard ? (lang === 'uk' ? practiceCard.uk : practiceCard.ru) : '';
    const totalPr = customCards.length;

    if (practiceQueue.length === 0) {
      return (
        <ScreenGradient>
        <SafeAreaView style={[st.safe]}>
          <ContentWrap>
            <View style={[st.header, { borderBottomColor: t.border }]}>
              <TouchableOpacity onPress={() => setMode('view')} style={{ width: 40 }}>
                <Ionicons name="arrow-back" size={24} color={t.textPrimary} />
              </TouchableOpacity>
              <Text style={[st.headerTitle, { color: t.textPrimary, fontSize: f.h2 }]}>
                {lang==='uk'?'Тренування':'Тренировка'}
              </Text>
              <View style={{ width: 40 }} />
            </View>
            <View style={st.centerState}>
              <Ionicons name="checkmark-circle" size={72} color={t.correct} />
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight:'700', marginTop: 16, textAlign:'center' }}>
                {lang==='uk'?'Всі картки відпрацьовано!':'Все карточки отработаны!'}
              </Text>
              <TouchableOpacity
                style={{ marginTop: 24, backgroundColor: t.accent, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 }}
                onPress={startPractice}
              >
                <Text style={{ color: t.correctText, fontWeight:'700', fontSize: f.body }}>
                  {lang==='uk'?'Почати знову':'Начать заново'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginTop: 14 }} onPress={() => setMode('view')}>
                <Text style={{ color: t.textSecond, fontSize: f.body }}>
                  {lang==='uk'?'Повернутися до карток':'Вернуться к карточкам'}
                </Text>
              </TouchableOpacity>
            </View>
          </ContentWrap>
        </SafeAreaView>
        </ScreenGradient>
      );
    }

    return (
      <ScreenGradient>
      <SafeAreaView style={[st.safe]}>
        <StatusBar barStyle="light-content" />
        <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ContentWrap>
          <View style={[st.header, { borderBottomColor: t.border }]}>
            <TouchableOpacity onPress={() => setMode('view')} style={{ width: 40 }}>
              <Ionicons name="arrow-back" size={24} color={t.textPrimary} />
            </TouchableOpacity>
            <Text style={[st.headerTitle, { color: t.textPrimary, fontSize: f.h2 }]}>
              {lang==='uk'?'Тренування':'Тренировка'}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.sub, minWidth: 40, textAlign:'right' }}>
              {practiceQueue.length} / {totalPr}
            </Text>
          </View>

          {/* Card */}
          <View style={[st.cardArea, { marginTop: 8 }]}>
            <View style={[st.card, {
              backgroundColor: t.bgCard,
              borderColor: practiceStatus === 'correct' ? t.correct : practiceStatus === 'wrong' ? t.wrong : t.border,
              borderWidth: practiceStatus !== 'idle' ? 2 : 1,
              position: 'relative',
            }]}>
              <Text style={{ color: t.textGhost, fontSize:11, fontWeight:'800', letterSpacing:1.5, marginBottom:12 }}>EN</Text>
              <Text style={{ color: t.textPrimary, fontSize: f.h1+4, fontWeight:'700', textAlign:'center' }}>
                {practiceCard!.en}
              </Text>
              <TouchableOpacity
                onPress={() => Speech.speak(practiceCard!.en, { language: 'en-US' })}
                hitSlop={{ top:8, bottom:8, left:8, right:8 }}
                style={{ marginTop: 12 }}
              >
                <Ionicons name="volume-medium-outline" size={20} color={t.textGhost} />
              </TouchableOpacity>
              {practiceStatus !== 'idle' && (
                <Text style={{ color: practiceStatus === 'correct' ? t.correct : t.wrong, fontSize: f.body, fontWeight:'600', marginTop: 12, textAlign:'center' }}>
                  {practiceTr}
                </Text>
              )}
            </View>
          </View>

          {/* Input */}
          <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
            <TextInput
              ref={practiceInputRef}
              style={{
                backgroundColor: t.bgCard, borderWidth: 1.5,
                borderColor: practiceStatus === 'correct' ? t.correct : practiceStatus === 'wrong' ? t.wrong : t.border,
                borderRadius: 14, padding: 14,
                color: t.textPrimary, fontSize: f.body, textAlign: 'center',
              }}
              placeholder={lang==='uk'?'Введи переклад...':'Введи перевод...'}
              placeholderTextColor={t.textGhost}
              value={practiceInput}
              onChangeText={text => { if (practiceStatus === 'idle') setPracticeInput(text); }}
              returnKeyType="done"
              onSubmitEditing={practiceStatus === 'idle' ? submitPractice : practiceGoNext}
              editable={practiceStatus === 'idle'}
            />
          </View>

          {/* Button */}
          <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 }}>
            <TouchableOpacity
              style={[st.navBtnPrimary, {
                backgroundColor: practiceStatus === 'correct' ? t.correct : practiceStatus === 'wrong' ? t.wrong : t.accent,
              }]}
              onPress={practiceStatus === 'idle' ? submitPractice : practiceGoNext}
            >
              <Text style={{ color: t.correctText, fontSize: f.body, fontWeight:'700' }}>
                {practiceStatus === 'idle'
                  ? (lang==='uk'?'Перевірити':'Проверить')
                  : (lang==='uk'?'Далі →':'Дальше →')}
              </Text>
            </TouchableOpacity>
          </View>
        </ContentWrap>
        </KeyboardAvoidingView>
      </SafeAreaView>
      </ScreenGradient>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (filteredCards.length === 0) return (
    <ScreenGradient>
    <SafeAreaView style={[st.safe]}>
      <StatusBar barStyle="light-content" />
      <ContentWrap>
        <View style={[st.header, { borderBottomColor: t.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 40 }}>
            <Ionicons name="arrow-back" size={24} color={t.textPrimary} />
          </TouchableOpacity>
          <Text style={[st.headerTitle, { color: t.textPrimary, fontSize: f.h2 }]}>{s.title}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={st.centerState}>
          <Ionicons name="bookmark-outline" size={56} color={t.textGhost} />
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight:'700', marginTop: 12 }}>{s.empty}</Text>
          <Text style={{ color: t.textMuted, fontSize: f.body, textAlign:'center', marginTop: 6 }}>{s.emptySub}</Text>
        </View>
      </ContentWrap>
      <View style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
        <CategoryBar />
      </View>
    </SafeAreaView>
    </ScreenGradient>
  );

  // ── Main card view ─────────────────────────────────────────────────────────
  const translation = lang === 'uk' ? (currentCard?.uk ?? '') : (currentCard?.ru ?? '');
  const sourceBadgeColor = SOURCE_COLORS[currentCard?.source ?? 'lesson'] ?? '#4A90D9';
  const sourceLabel = currentCard?.source ? (s.source as any)[currentCard.source] : null;
  const canDelete = !(currentCard?.isSystem ?? true);

  return (
    <ScreenGradient>
    <SafeAreaView style={[st.safe]}>
      <StatusBar barStyle="light-content" backgroundColor={t.bgPrimary} />

        {/* Header */}
        <View style={[st.header, { borderBottomColor: t.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 40 }} hitSlop={{ top:12,bottom:12,left:12,right:12 }}>
            <Ionicons name="arrow-back" size={24} color={t.textPrimary} />
          </TouchableOpacity>
          <Text style={[st.headerTitle, { color: t.textPrimary, fontSize: f.h2 }]}>{s.title}</Text>
          <View style={{ flexDirection:'row', justifyContent:'flex-end', alignItems:'center', gap: 12, minWidth: 40 }}>
            {filterOptions.length > 0 && (
              <View style={{ position: 'relative' }}>
                <TouchableOpacity
                  onPress={() => setFilterOpen(o => !o)}
                  hitSlop={{ top:8,bottom:8,left:8,right:8 }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 3,
                    paddingHorizontal: 10, paddingVertical: 5,
                    borderRadius: 12, borderWidth: 1,
                    borderColor: activeFilter !== 'all' ? t.accent : t.border,
                    backgroundColor: activeFilter !== 'all' ? t.accent + '18' : 'transparent',
                  }}
                >
                  <Ionicons name="filter-outline" size={12} color={activeFilter !== 'all' ? t.accent : t.textSecond} />
                  <Text style={{ fontSize: f.caption, fontWeight: '600', color: activeFilter !== 'all' ? t.accent : t.textSecond }}>
                    {activeFilter === 'all'
                      ? (lang === 'uk' ? 'Фільтр' : 'Фильтр')
                      : (filterOptions.find(o => o.key === activeFilter)?.label ?? 'Фильтр')}
                  </Text>
                  <Ionicons name={filterOpen ? 'chevron-up' : 'chevron-down'} size={10} color={activeFilter !== 'all' ? t.accent : t.textSecond} />
                </TouchableOpacity>
                {filterOpen && (
                  <View style={{
                    position: 'absolute', top: 32, left: 0, zIndex: 9999,
                    backgroundColor: t.bgSurface, borderRadius: 14, borderWidth: 1,
                    borderColor: t.border, minWidth: 160,
                    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25, shadowRadius: 12, elevation: 20,
                    overflow: 'hidden',
                  }}>
                    {filterOptions.map((opt, i) => {
                      const active = activeFilter === opt.key;
                      return (
                        <TouchableOpacity
                          key={opt.key}
                          onPress={() => { setActiveFilter(opt.key); setFilterOpen(false); }}
                          style={{
                            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                            paddingHorizontal: 16, paddingVertical: 12,
                            borderTopWidth: i === 0 ? 0 : 0.5, borderTopColor: t.border,
                          }}
                        >
                          <Text style={{ fontSize: f.body, color: active ? t.accent : t.textPrimary, fontWeight: active ? '700' : '400' }}>
                            {opt.label}
                          </Text>
                          {active && <Ionicons name="checkmark" size={16} color={t.accent} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
            {canDelete && (
              <TouchableOpacity onPress={handleDelete} hitSlop={{ top:14,bottom:14,left:14,right:14 }} style={{ padding: 4 }}>
                <Ionicons name="trash-outline" size={22} color={t.wrong} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Flip all button */}
        {filteredCards.length > 0 && (
          <TouchableOpacity
            onPress={handleFlipAll}
            style={{
              marginHorizontal: 16, marginTop: 8, marginBottom: 4,
              paddingVertical: 8, paddingHorizontal: 16,
              borderRadius: 20, borderWidth: 1,
              borderColor: allFlipped ? t.accent : t.border,
              backgroundColor: allFlipped ? t.accent + '18' : 'transparent',
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <Ionicons name="sync-outline" size={15} color={allFlipped ? t.accent : t.textSecond} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: allFlipped ? t.accent : t.textSecond }}>
              {lang === 'uk' ? 'Розгорнути всі' : 'Развернуть все'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Card stack: all cards full size, stacked with PEEK overlap, active on top */}
        {(() => {
          // Total scroll content: first card centered, each card adds PEEK
          const contentH = LIST_PAD * 2 + CARD_H + (filteredCards.length - 1) * PEEK;
          return (
            <Animated.ScrollView
              ref={flatListRef as any}
              style={{ flex: 1 }}
              contentContainerStyle={{ height: contentH }}
              showsVerticalScrollIndicator={false}
              decelerationRate="normal"
              scrollEventThrottle={16}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                {
                  useNativeDriver: false,
                  listener: (e: any) => {
                    const y = e.nativeEvent.contentOffset.y;
                    const fi = Math.round(y / PEEK);
                    const clamped = Math.max(0, Math.min(fi, filteredCards.length - 1));
                    setIndex(clamped);
                  },
                }
              )}
            >
              <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
                {/* Overlay: blocks overlapping cards behind active card during flip */}
                {isFlipping && (
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: LIST_PAD + index * PEEK,
                      left: 16, right: 16,
                      height: CARD_H,
                      zIndex: 998,
                      elevation: 19,
                      backgroundColor: t.bgCard,
                      borderRadius: 20,
                    }}
                  />
                )}
                {filteredCards.map((item, itemIdx) => {
                  const isActive = itemIdx === index;
                  const cardTop = LIST_PAD + itemIdx * PEEK;
                  const cardBorderColor = isActive ? t.accent + '80' : t.border;
                  const tr = lang === 'uk' ? item.uk : item.ru;
                  const srcBadgeColor = SOURCE_COLORS[item.source ?? 'lesson'] ?? '#4A90D9';
                  const srcLabel = item.source ? (s.source as any)[item.source] : null;

                  // Per-card flip animation
                  const cAnim = cardFlipAnims.current[itemIdx] ?? new Animated.Value(0);
                  const fAnim = isActive ? flipAnim : cAnim;
                  // scaleX squeeze flip — card narrows to 0 then expands with back face
                  // No transparency at any point → no see-through artifacts
                  const cFrontScaleX = fAnim.interpolate({ inputRange:[0,0.5,1], outputRange:[1,0,0] });
                  const cBackScaleX  = fAnim.interpolate({ inputRange:[0,0.5,1], outputRange:[0,0,1] });
                  const cFrontOp     = fAnim.interpolate({ inputRange:[0,0.49,0.5,1], outputRange:[1,1,0,0] });
                  const cBackOp      = fAnim.interpolate({ inputRange:[0,0.49,0.5,1], outputRange:[0,0,1,1] });

                  return (
                    <View
                      key={item.id}
                      style={{
                        position: 'absolute',
                        top: cardTop,
                        left: 16, right: 16,
                        height: CARD_H,
                        zIndex: isActive ? 999 : itemIdx,
                        elevation: isActive ? 20 : itemIdx + 1,
                        backgroundColor: 'transparent',
                      }}
                    >
                      <TouchableOpacity
                        activeOpacity={isActive ? 0.92 : 1}
                        onPress={isActive ? handleFlip : () => {
                          (flatListRef.current as any)?.scrollTo({ y: itemIdx * PEEK, animated: true });
                        }}
                        style={{ flex: 1 }}
                      >

                        {/* Front face */}
                        <Animated.View style={[st.card, {
                          backgroundColor: t.bgCard,
                          borderColor: cardBorderColor,
                          transform: [
                            { scaleX: cFrontScaleX },
                            { scale: isActive ? focusAnim : 1 },
                          ],
                          opacity: cFrontOp,
                          shadowOpacity: isActive ? 0.28 : 0.08,
                          shadowRadius: isActive ? 14 : 6,
                        }]}>
                          {/* EN label always visible at top so non-active peek strip shows which side */}
                          <Text style={{ position: 'absolute', top: 14, color: t.textGhost, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 }}>EN</Text>
                          {srcLabel && (
                            <View style={[st.sourceBadge, { backgroundColor: `${srcBadgeColor}22`, borderColor: `${srcBadgeColor}55` }]}>
                              <Text style={[st.sourceBadgeText, { color: srcBadgeColor }]}>
                                {srcLabel}{item.sourceId ? ` ${item.sourceId}` : ''}
                              </Text>
                            </View>
                          )}
                          {isActive && (
                            <>
                              <Text style={{ color: t.textGhost, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 14 }}>EN</Text>
                              <Text style={{ color: t.textPrimary, fontSize: f.h1 + 2, fontWeight: '700', textAlign: 'center' }}>{item.en}</Text>
                              <Text style={{ position: 'absolute', bottom: 18, color: t.textGhost, fontSize: f.caption }}>{s.tapFlip}</Text>
                            </>
                          )}
                        </Animated.View>

                        {/* Back face */}
                        <Animated.View style={[st.card, {
                          backgroundColor: t.bgSurface,
                          borderColor: cardBorderColor,
                          transform: [
                            { scaleX: cBackScaleX },
                            { scale: isActive ? focusAnim : 1 },
                          ],
                          opacity: cBackOp,
                          shadowOpacity: isActive ? 0.28 : 0.08,
                          shadowRadius: isActive ? 14 : 6,
                        }]}>
                          {/* RU/UK label always visible at top so non-active peek strip shows which side */}
                          <Text style={{ position: 'absolute', top: 14, color: t.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 }}>
                            {lang === 'uk' ? 'UK' : 'RU'}
                          </Text>
                          {srcLabel && (
                            <View style={[st.sourceBadge, { backgroundColor: `${srcBadgeColor}22`, borderColor: `${srcBadgeColor}55` }]}>
                              <Text style={[st.sourceBadgeText, { color: srcBadgeColor }]}>
                                {srcLabel}{item.sourceId ? ` ${item.sourceId}` : ''}
                              </Text>
                            </View>
                          )}
                          <Text style={{ color: t.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 14 }}>
                            {lang === 'uk' ? 'UK' : 'RU'}
                          </Text>
                          {tr.includes('≠') ? (
                            <>
                              <Text style={{ color: t.correct, fontSize: f.h1 + 2, fontWeight: '700', textAlign: 'center' }}>{tr.split('≠')[0].trim()}</Text>
                              <Text style={{ color: t.wrong, fontSize: f.body, fontWeight: '600', textAlign: 'center', marginTop: 8, textDecorationLine: 'line-through' }}>{tr.split('≠')[1].trim()}</Text>
                            </>
                          ) : (
                            <Text style={{ color: t.textPrimary, fontSize: f.h1 + 2, fontWeight: '700', textAlign: 'center' }}>{tr}</Text>
                          )}
                          {/* Hide EN hint when flip-all active — practice RU→EN */}
                          {!allFlipped && (
                            <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 14, textAlign: 'center', fontStyle: 'italic' }}>{item.en}</Text>
                          )}
                        </Animated.View>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </Animated.View>
            </Animated.ScrollView>
          );
        })()}

      {/* Category bar — bottom, above Android nav buttons */}
      <View style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
        <CategoryBar />
      </View>
    </SafeAreaView>
    </ScreenGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  safe:         { flex:1 },
  header:       { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingTop:12, paddingBottom:8, borderBottomWidth:0.5 },
  headerTitle:  { fontWeight:'700', letterSpacing:0.2 },
  progressWrap: { flexDirection:'row', alignItems:'center', marginVertical:8, gap:10 },
  progressTrack:{ flex:1, height:6, borderRadius:3, overflow:'hidden' },
  progressFill: { height:'100%', borderRadius:3 },
  cardArea:     { paddingHorizontal:0, justifyContent:'center', alignItems:'center' },
  cardTouchable:{ width:'100%', height:CARD_H },
  card:         { position:'absolute', top:0, left:0, right:0, bottom:0, borderRadius:20, borderWidth:1, padding:28, alignItems:'center', justifyContent:'center', backfaceVisibility:'hidden', shadowColor:'#000', shadowOffset:{width:0,height:6}, shadowOpacity:0.15, shadowRadius:10, elevation:5 },
  sourceBadge:  { position:'absolute', top:18, left:18, paddingHorizontal:10, paddingVertical:4, borderRadius:20, borderWidth:1 },
  sourceBadgeText: { fontSize:11, fontWeight:'700', textTransform:'uppercase', letterSpacing:0.6 },
  swipeHint:    { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:32, paddingTop:8, paddingBottom:32 },
  navBtnPrimary:{ flex:1, height:56, borderRadius:28, alignItems:'center', justifyContent:'center' },
  centerState:  { flex:1, alignItems:'center', justifyContent:'center', paddingHorizontal:32 },
});
