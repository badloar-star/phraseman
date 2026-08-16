#!/usr/bin/env node
/**
 * Первое заполнение устава Phraseman.
 *
 * зачем (владелец, 2026-08-16): «изучи продукт и дай ему фулл описание… пиши
 * сразу устав где-то в админке». Панель без содержимого бесполезна: открыть её
 * и увидеть семь пустых полей — не то же самое, что открыть готовый устав и
 * поправить одну строку.
 *
 * Содержимое собрано чтением самого приложения и перепроверено: раздел
 * «Компас» в приложение НЕ входит (сторожит tests/compass_center_release_
 * boundary.test.ts), турниры выключены флагом ENABLE_TOURNAMENTS в
 * app/config.ts, звёзды зарабатываются в Арене, а не тратятся на вход.
 *
 * Запуск один раз:
 *   node scripts/seed_product_charter.mjs            # показать, что запишет
 *   node scripts/seed_product_charter.mjs --apply    # записать
 *
 * Повторный запуск с --apply НЕ перезапишет заполненный устав: правки
 * владельца из панели дороже этого текста.
 */
import admin from 'firebase-admin';
import { existsSync, readFileSync } from 'fs';

const APPLY = process.argv.includes('--apply');

if (admin.apps.length === 0) {
  let projectId;
  try { projectId = JSON.parse(readFileSync('.firebaserc', 'utf8'))?.projects?.default; } catch {}
  const credential = existsSync('./service-account.json')
    ? admin.credential.cert(JSON.parse(readFileSync('./service-account.json', 'utf8')))
    : admin.credential.applicationDefault();
  admin.initializeApp(projectId ? { credential, projectId } : { credential });
}
const db = admin.firestore();

const SECTIONS = [
  {
    key: 'about',
    body: [
      'Phraseman — мобильное приложение для изучения английского, iOS и Android.',
      'Аудитория преимущественно русскоязычная, интерфейс переведён на восемь языков.',
      'Учат живым разговорным фразам, а не грамматическим правилам по учебнику.',
    ].join('\n'),
  },
  {
    key: 'navigation',
    body: [
      'Внизу четыре вкладки: Главная, Уроки, Друзья, Настройки. По центру — кнопка Арены.',
      'На Главной: серия дней, уровень и опыт, кольца дня (Урок, Практика, Карточки), лига и сундук.',
      'Остальные разделы открываются с Главной и из Уроков: Магазин, Биржа, Клуб, Диалоги, MAX, Тест уровня, Экзамен.',
    ].join('\n'),
  },
  {
    key: 'learning',
    body: [
      'Уроки — основной курс, последовательные уроки с живыми английскими фразами.',
      'Практика (тренажёр) — точечное повторение того, что человек начал забывать.',
      'Карточки — повторение фраз карточками, есть режим прослушивания.',
      'Тест уровня — короткая диагностика в начале. Экзамен — проверка после пройденных уроков.',
      'Диалоги — разговорная практика с ИИ перепиской.',
      'MAX — голосовой звонок с ИИ-репетитором, разговор голосом в реальном времени.',
      'Арена — дуэль на скорость с другим игроком, за победы дают звёзды.',
    ].join('\n'),
  },
  {
    key: 'currencies',
    body: [
      'Жемчужины — единственная валюта приложения. Дают за уроки, задания и подарки друзей,',
      'тратятся в Магазине, на бусты Клуба и обмениваются на звёзды на Бирже.',
      'Звёзды — счёт Арены: их зарабатывают в матчах, а не платят за вход.',
      'Энергия восстанавливается со временем и тратится на начало занятий; на платном доступе не кончается.',
      'Опыт (XP) копится за занятия, поднимает уровень и считается в недельной лиге.',
      'Серия (стрик) — сколько дней подряд человек занимался, её можно заморозить.',
      'Слова «осколки» и «shards» в интерфейсе нет — это старое внутреннее название жемчужины.',
    ].join('\n'),
  },
  {
    key: 'money',
    body: [
      'Тарифа два, и доступ у них одинаковый. Разница только в способе оплаты:',
      'Plus — подписка на месяц или год; Pro — разовая покупка навсегда.',
      'Платный доступ снимает лимит энергии, открывает все уроки и уровни, второй язык,',
      'безлимитный тренажёр, темы оформления, разборы ошибок и голосовые ответы.',
      'Оплата из России: телеграм-бот https://t.me/PhrasemanPremiumBot и страница https://knowlyapps.com/russia/',
      'Подарочный сертификат https://knowlyapps.com/gift/ — его можно купить и себе, активируется промокодом.',
    ].join('\n'),
  },
  {
    key: 'social',
    body: [
      'Друзья — список друзей, «дай пять», подарки и приглашение по коду.',
      'Лига — недельное соревнование по опыту с другими игроками, есть сундук и цель.',
      'Клуб — командные бусты внутри лиги, покупаются за жемчужины.',
      'Награда за друга: приглашённый оформляет платный доступ, пригласивший получает ключ',
      'и меняет его на бесплатные дни доступа.',
    ].join('\n'),
  },
  {
    key: 'disabled',
    body: [
      'Компаса в приложении НЕТ. Это незаконченная разработка: голосовой компаньон и экран-брифинг',
      'под таким названием в сборку не входят, открыть их нельзя. Отдельный тест следит, чтобы эти',
      'файлы не попали в релиз. Голосовой разговор называется MAX — на вопрос про Компас отвечаем про MAX.',
      'Турниры отключены: вкладка не открывается, человек их не видит. Обещать турнир нельзя.',
      'Не называть внутренние имена из кода — человек видит другие слова и не поймёт, о чём речь.',
      'Раздела нет в уставе — честно сказать, что уточните, а не сочинять.',
    ].join('\n'),
  },
];

function nextReviewDate(nowMs) {
  const date = new Date(nowMs);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString().slice(0, 10);
}

async function main() {
  const ref = db.collection('admin_config').doc('product_charter');
  const snap = await ref.get();
  const existing = snap.exists ? snap.data() : null;
  const existingSections = Array.isArray(existing?.sections) ? existing.sections : [];

  if (existingSections.length > 0) {
    console.log(`Устав уже заполнен: версия ${existing?.revision ?? 0}, разделов ${existingSections.length}.`);
    console.log('Ничего не меняю — правки из панели дороже этого текста.');
    return;
  }

  const nowMs = Date.now();
  const payload = {
    sections: SECTIONS,
    revision: 1,
    reviewBy: nextReviewDate(nowMs),
    updatedAtMs: nowMs,
    updatedBy: 'seed_product_charter',
  };

  const totalChars = SECTIONS.reduce((sum, s) => sum + s.body.length, 0);
  console.log(`Разделов: ${SECTIONS.length}, символов: ${totalChars}, пересмотр: ${payload.reviewBy}`);
  if (!APPLY) {
    console.log('Это пробный прогон. Запустите с --apply, чтобы записать.');
    return;
  }

  const historyRef = db.collection('product_charter_history').doc();
  const batch = db.batch();
  batch.set(ref, payload);
  batch.create(historyRef, {
    revision: 1,
    timestamp: new Date(nowMs).toISOString(),
    actorUid: 'seed_product_charter',
    reason: 'Первое заполнение устава: описание продукта собрано чтением приложения',
    changes: SECTIONS.map((s) => ({ key: s.key, title: s.key, kind: 'added' })),
    sections: SECTIONS,
  });
  await batch.commit();
  console.log('Устав записан, версия 1. История создана.');
}

main().then(() => process.exit(0)).catch((error) => {
  console.error('Не получилось:', error?.message || error);
  process.exit(1);
});
