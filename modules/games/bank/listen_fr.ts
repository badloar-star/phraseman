/**
 * Банк игры «На слух» — французский классический курс, уроки 1–8 (D207). 6 заданий на урок.
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «фразы должны корректно подбираться».
 * Правила вычитки: произносится дословная фраза урока; каждый неверный вариант отличается от неё ровно
 * одним словом, остаётся правильной французской фразой и собран из пройденных слов. Подмена различима на
 * слух: нет пар, которые звучат одинаково (fermé / fermée, prêt / prêts, es / est, parle / parles).
 * Пояснение — перевод прозвучавшей фразы.
 * Проверка: tests/game_task_bank_de_fr.test.ts.
 */
import type { QuizRound } from '../quiz_core';
import { listenRound } from './make_de_fr';

const r = (lesson: number, n: number, text: string, wrong: readonly [string, string], at: number, note: string): QuizRound =>
  listenRound('fr', lesson, n, text, wrong, at, note);

export const LISTEN_BANK_FR: Readonly<Record<number, readonly QuizRound[]>> = {
  1: [
    r(1, 1, 'Je suis ici', ['Je suis là', 'Je suis prêt'], 0, 'Я здесь'),
    r(1, 2, 'Léa est à la gare', ['Léa est à la maison', 'Paul est à la gare'], 1, 'Леа на вокзале'),
    r(1, 3, 'La porte est ouverte', ['La fenêtre est ouverte', 'La porte est fermée'], 2, 'Дверь открыта'),
    r(1, 4, 'Nous sommes ensemble', ['Nous sommes ici', 'Nous sommes prêts'], 0, 'Мы вместе'),
    r(1, 5, 'Le café est fermé', ['Le café est calme', 'Le café est loin'], 1, 'Кафе закрыто'),
    r(1, 6, 'Paul est seul', ['Paul est là', 'Paul est libre'], 2, 'Поль один'),
  ],
  2: [
    r(2, 1, 'Je ne suis pas prêt', ['Je ne suis pas seul', 'Je ne suis pas ici'], 1, 'Я не готов'),
    r(2, 2, 'Le bus n’est pas loin', ['Le bus n’est pas là', 'Le bus n’est pas libre'], 0, 'Автобус недалеко'),
    r(2, 3, 'La salle n’est pas vide', ['La salle n’est pas libre', 'La table n’est pas vide'], 2, 'Комната не пуста'),
    r(2, 4, 'Le verre n’est pas sale', ['Le verre n’est pas propre', 'Le verre n’est pas là'], 1, 'Стакан не грязный'),
    r(2, 5, 'Les clés ne sont pas ici', ['Les clés ne sont pas là', 'Les billets ne sont pas ici'], 0, 'Ключей здесь нет'),
    r(2, 6, 'Le train n’est pas en retard', ['Le bus n’est pas en retard', 'Le train n’est pas en avance'], 2, 'Поезд не опаздывает'),
  ],
  3: [
    r(3, 1, 'La sortie est à gauche ?', ['La sortie est à droite ?', 'La pharmacie est à gauche ?'], 0, 'Выход слева?'),
    r(3, 2, 'Tu es prêt ?', ['Tu es là ?', 'Tu es seul ?'], 1, 'Ты готов?'),
    r(3, 3, 'Le guichet est ouvert ?', ['Le musée est ouvert ?', 'Le magasin est ouvert ?'], 2, 'Касса открыта?'),
    r(3, 4, 'Est-ce que la salle est libre ?', ['Est-ce que la salle est vide ?', 'Est-ce que la table est libre ?'], 0, 'Комната свободна?'),
    r(3, 5, 'L’arrêt est loin ?', ['L’arrêt est là ?', 'L’arrêt est ici ?'], 1, 'Остановка далеко?'),
    r(3, 6, 'Les enfants sont avec vous ?', ['Les enfants sont avec toi ?', 'Les billets sont avec vous ?'], 2, 'Дети с вами?'),
  ],
  4: [
    r(4, 1, 'C’est mon frère', ['C’est ton frère', 'C’est mon père'], 1, 'Это мой брат'),
    r(4, 2, 'C’est une carte', ['C’est une clé', 'C’est une photo'], 0, 'Это карта'),
    r(4, 3, 'Ce sont nos billets', ['Ce sont vos billets', 'Ce sont nos places'], 2, 'Это наши билеты'),
    r(4, 4, 'C’est un cadeau', ['C’est un billet', 'C’est un reçu'], 1, 'Это подарок'),
    r(4, 5, 'C’est le dernier bus', ['C’est le prochain bus', 'C’est le dernier train'], 0, 'Это последний автобус'),
    r(4, 6, 'Ce n’est pas mon sac', ['Ce n’est pas ton sac', 'Ce n’est pas son sac'], 2, 'Это не моя сумка'),
  ],
  5: [
    r(5, 1, 'J’ai faim', ['J’ai froid', 'J’ai soif'], 0, 'Я голоден'),
    r(5, 2, 'Vous avez chaud', ['Vous avez froid', 'Vous avez soif'], 1, 'Вам жарко'),
    r(5, 3, 'Léa a trente ans', ['Léa a vingt ans', 'Léa a dix ans'], 2, 'Леа тридцать лет'),
    r(5, 4, 'Elle a deux enfants', ['Elle a trois enfants', 'Elle a cinq enfants'], 0, 'У неё двое детей'),
    r(5, 5, 'Ils ont un billet', ['Ils ont un plan', 'Ils ont un sac'], 1, 'У них есть билет'),
    r(5, 6, 'Paul a une question', ['Paul a une idée', 'Paul a une réservation'], 2, 'У Поля есть вопрос'),
  ],
  6: [
    r(6, 1, 'La clé est sur la table', ['La clé est sous la table', 'La clé est sur la chaise'], 1, 'Ключ лежит на столе'),
    r(6, 2, 'J’aime le thé', ['J’aime le café', 'J’aime le cinéma'], 0, 'Мне нравится чай'),
    r(6, 3, 'La soupe est chaude', ['La soupe est froide', 'La soupe est prête'], 2, 'Суп горячий'),
    r(6, 4, 'L’entrée est à droite', ['L’entrée est à gauche', 'L’école est à droite'], 1, 'Вход справа'),
    r(6, 5, 'Les gants sont dans le sac', ['Les gants sont dans le tiroir', 'Les gants sont sur le sac'], 0, 'Перчатки в сумке'),
    r(6, 6, 'Le marché est ouvert', ['Le musée est ouvert', 'Le magasin est ouvert'], 2, 'Рынок открыт'),
  ],
  7: [
    r(7, 1, 'Je parle français', ['Je parle anglais', 'Je parle espagnol'], 0, 'Я говорю по-французски'),
    r(7, 2, 'Nous cherchons une adresse', ['Nous cherchons une place', 'Nous cherchons une chambre'], 1, 'Мы ищем адрес'),
    r(7, 3, 'Je commande un thé', ['Je commande un café', 'Je prépare un thé'], 2, 'Я заказываю чай'),
    r(7, 4, 'Elle réserve une chambre', ['Elle cherche une chambre', 'Elle réserve une place'], 0, 'Она бронирует номер'),
    r(7, 5, 'Tu fermes la fenêtre', ['Tu fermes la porte', 'Tu cherches la fenêtre'], 1, 'Ты закрываешь окно'),
    r(7, 6, 'Ils visitent le musée', ['Ils cherchent le musée', 'Ils visitent le marché'], 2, 'Они посещают музей'),
  ],
  8: [
    r(8, 1, 'Où est la sortie ?', ['Où est la gare ?', 'Où est la banque ?'], 1, 'Где выход?'),
    r(8, 2, 'Quand ferme la banque ?', ['Quand ouvre la banque ?', 'Quand ferme la gare ?'], 0, 'Когда закрывается банк?'),
    r(8, 3, 'À quelle heure ouvre le musée ?', ['À quelle heure ferme le musée ?', 'À quelle heure ouvre le marché ?'], 2, 'Во сколько открывается музей?'),
    r(8, 4, 'Combien coûte le billet ?', ['Combien coûte le ticket ?', 'Combien coûte le vélo ?'], 1, 'Сколько стоит билет?'),
    r(8, 5, 'Qui prépare le dîner ?', ['Qui prépare le déjeuner ?', 'Qui commande le dîner ?'], 0, 'Кто готовит ужин?'),
    r(8, 6, 'Où habites-tu ?', ['Où travailles-tu ?', 'Où es-tu ?'], 2, 'Где ты живёшь?'),
  ],
};
