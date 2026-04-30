import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const serviceAccount = require(join(__dirname, '../service-account.json'));

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const questions = [
  // A1 — fill_blank
  {
    id: 'dq_001', level: 'A1', type: 'fill_blank',
    question: 'I need to look ___ this word in the dictionary.',
    options: ['up', 'on', 'at', 'for'], correct: 'up',
    rule: 'look up = найти информацию в справочнике',
    source: 'Swan §224',
  },
  {
    id: 'dq_002', level: 'A1', type: 'fill_blank',
    question: 'Please turn ___ the lights before you leave.',
    options: ['off', 'on', 'up', 'down'], correct: 'off',
    rule: 'turn off = выключить (свет, прибор)',
    source: 'Murphy B1 Unit 58',
  },
  {
    id: 'dq_003', level: 'A1', type: 'fill_blank',
    question: "I'm looking forward ___ seeing you.",
    options: ['to', 'for', 'at', 'on'], correct: 'to',
    rule: 'look forward to + -ing (предлог to, не инфинитив)',
    source: 'Swan §312',
  },
  // A1 — translate_meaning
  {
    id: 'dq_004', level: 'A1', type: 'translate_meaning',
    question: '"He gave up smoking" means:',
    options: ['он бросил курить', 'он начал курить', 'он дал сигарету', 'он забыл о сигаретах'],
    correct: 'он бросил курить',
    rule: 'give up = прекратить делать что-либо',
    source: 'Swan',
  },
  {
    id: 'dq_005', level: 'A1', type: 'translate_meaning',
    question: '"Can you look after my dog?" means:',
    options: ['Ты можешь присмотреть за моей собакой?', 'Ты видишь мою собаку?', 'Найди мою собаку', 'Покорми мою собаку'],
    correct: 'Ты можешь присмотреть за моей собакой?',
    rule: 'look after = присматривать, заботиться',
    source: 'Murphy B1',
  },
  // A2 — complete_phrasal
  {
    id: 'dq_006', level: 'A2', type: 'complete_phrasal',
    question: 'They ran ___ of milk so we need to buy some.',
    options: ['out', 'off', 'up', 'away'], correct: 'out',
    rule: 'run out of = закончиться, исчерпаться',
    source: 'Murphy',
  },
  {
    id: 'dq_007', level: 'A2', type: 'complete_phrasal',
    question: 'She broke ___ with her boyfriend last week.',
    options: ['up', 'down', 'out', 'in'], correct: 'up',
    rule: 'break up = расстаться (о паре)',
    source: 'Murphy B1',
  },
  {
    id: 'dq_008', level: 'A2', type: 'complete_phrasal',
    question: 'He put ___ the meeting until Thursday.',
    options: ['off', 'up', 'on', 'out'], correct: 'off',
    rule: 'put off = откладывать на потом',
    source: 'Swan §384',
  },
  // A2 — translate_meaning
  {
    id: 'dq_009', level: 'A2', type: 'translate_meaning',
    question: '"They fell out over money" means:',
    options: ['они поссорились из-за денег', 'они упали', 'они потеряли деньги', 'они вышли из дома'],
    correct: 'они поссорились из-за денег',
    rule: 'fall out (with sb) = поссориться',
    source: 'Cambridge',
  },
  // B1 — fill_blank
  {
    id: 'dq_010', level: 'B1', type: 'fill_blank',
    question: 'She insisted ___ paying for everyone at dinner.',
    options: ['on', 'in', 'at', 'for'], correct: 'on',
    rule: 'insist on + gerund (Swan §178)',
    source: 'Swan',
  },
  {
    id: 'dq_011', level: 'B1', type: 'fill_blank',
    question: 'We need to come ___ with a solution quickly.',
    options: ['up', 'out', 'in', 'on'], correct: 'up',
    rule: 'come up with = придумать, предложить идею',
    source: 'Murphy B2',
  },
  // B1 — find_error
  {
    id: 'dq_012', level: 'B1', type: 'find_error',
    question: 'Which sentence has an error?',
    options: [
      'He looks up to his mentor.',
      'She called off the meeting.',
      'They put up with the noise.',
      'I look forward to hear from you.',
    ],
    correct: 'I look forward to hear from you.',
    rule: 'look forward to требует -ing: "to hearing from you"',
    source: 'Swan §312',
  },
  {
    id: 'dq_013', level: 'B1', type: 'find_error',
    question: 'Find the sentence with a mistake:',
    options: [
      'She gave up eating meat.',
      'He ran out of patience.',
      'They broke up last month.',
      'I am used to get up early.',
    ],
    correct: 'I am used to get up early.',
    rule: 'be used to + -ing: "used to getting up early"',
    source: 'Murphy B1 Unit 61',
  },
  // B1 — choose_phrasal
  {
    id: 'dq_014', level: 'B1', type: 'choose_phrasal',
    question: '"Мне нужно разобраться с этой проблемой" → choose the best phrase:',
    options: ['deal with the problem', 'deal the problem', 'make up the problem', 'get away the problem'],
    correct: 'deal with the problem',
    rule: 'deal with = справляться, разбираться с чем-либо',
    source: 'Cambridge',
  },
  // B2 — fill_blank
  {
    id: 'dq_015', level: 'B2', type: 'fill_blank',
    question: 'The project is being carried ___ by a team of experts.',
    options: ['out', 'on', 'off', 'up'], correct: 'out',
    rule: 'carry out = выполнять, осуществлять',
    source: 'Swan §97',
  },
  {
    id: 'dq_016', level: 'B2', type: 'fill_blank',
    question: 'She had to call ___ the presentation due to illness.',
    options: ['off', 'up', 'out', 'in'], correct: 'off',
    rule: 'call off = отменить (событие)',
    source: 'Murphy B2',
  },
  // B2 — find_error
  {
    id: 'dq_017', level: 'B2', type: 'find_error',
    question: 'Which sentence is incorrect?',
    options: [
      'He backed out of the deal.',
      'They were let down by their leader.',
      'She brought up an interesting point.',
      'We need to catch up for lost time.',
    ],
    correct: 'We need to catch up for lost time.',
    rule: 'make up for lost time — правильная коллокация, не "catch up for"',
    source: 'Cambridge',
  },
  // B2 — choose_phrasal
  {
    id: 'dq_018', level: 'B2', type: 'choose_phrasal',
    question: '"Он разочаровал команду" → best translation:',
    options: ['He let down the team', 'He put down the team', 'He pulled down the team', 'He fell down the team'],
    correct: 'He let down the team',
    rule: 'let sb down = подвести кого-либо',
    source: 'Swan',
  },
  // C1 — translate_meaning
  {
    id: 'dq_019', level: 'C1', type: 'translate_meaning',
    question: '"The plan backfired on them" means:',
    options: [
      'план обернулся против них',
      'план сработал отлично',
      'план был отменён',
      'они поняли план неправильно',
    ],
    correct: 'план обернулся против них',
    rule: 'backfire (on sb) = иметь обратный, нежелательный эффект',
    source: 'Cambridge Advanced',
  },
  // C1 — find_error
  {
    id: 'dq_020', level: 'C1', type: 'find_error',
    question: 'Spot the error:',
    options: [
      'She turned down the job offer.',
      'He was taken aback by the news.',
      'They phased out the old system gradually.',
      'We should look up to solve this problem.',
    ],
    correct: 'We should look up to solve this problem.',
    rule: 'look into = расследовать/изучить проблему; look up to = уважать (человека)',
    source: 'Murphy C1',
  },
];

async function seed() {
  const batch = db.batch();
  for (const q of questions) {
    const ref = db.collection('arena_questions').doc(q.id);
    batch.set(ref, q);
  }
  await batch.commit();
  console.log(`Uploaded ${questions.length} questions to arena_questions`);
}

seed().catch(err => { console.error(err); process.exit(1); });
