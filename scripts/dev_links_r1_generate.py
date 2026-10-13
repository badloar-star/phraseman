# Генератор docs/phraseman-2.0/DEV_LINKS_R1.md из реестра и R1_SHOT_LIST*.md (python scripts/dev_links_r1_generate.py). Правила ссылок — в списке rule(...) ниже.
import json, re, glob, collections, sys

# зачем (координатор 12.10): под-состояния и шаги тапов для строк с общей ссылкой — отдельный файл данных
sys.path.insert(0, 'C:/appsprojects/phraseman/scripts')
import dev_links_r1_steps as STEPS_DATA
import dev_links_r1_steps_spire  # noqa: F401  зачем (15.10): ссылки и шаги Шпиля лежат в отдельном модуле и добавляются в тот же STEPS_DATA.ENTRIES
import dev_links_r1_steps_cards2  # noqa: F401  зачем (12.10): ссылки и шаги Карточек для покрытия r1 (группа 2б: подмены уже есть в приложении)
import dev_links_r1_steps_dialogs2  # noqa: F401  зачем (12.10): ссылки и шаги Диалогов для покрытия r1 (группа 2а, без сервера ИИ)
import dev_links_r1_steps_misc2  # noqa: F401  зачем (12.10): Настройки и «Мои наборы» для покрытия r1 (группа 2а)
import dev_links_r1_steps_robot as STEPS_ROBOT  # зачем (12.10, Макеты): строки, которые робот Сверки пропускал (онбординг через onbstep, Режим Б, сообщество, блиц)
import dev_links_r1_steps_core1  # noqa: F401  зачем (Ядро 12.10, партия 1): ссылки и шаги по новым подменам (настройки, диалоги, друзья, промокод)
import dev_links_r1_steps_cards3  # noqa: F401  зачем (Ядро 12.10, партия 2): Карточки — сообщество без сети, отклики, жалобы, голоса; ДО links3 (двойники копируют записи)
import dev_links_r1_steps_dialogs3  # noqa: F401  зачем (Ядро 12.10, b25cab943/dfeeb913e): память диалогов, свободный разговор, каталог без сети; ДО links3
import dev_links_r1_steps_design3  # noqa: F401  зачем (Дизайн 12.10): profile-015 «отправлено» — support=sent вместо fail
import dev_links_r1_steps_links3  # noqa: F401  зачем (12.10): двойники и служебные маршруты (link_missing → ready); ПОСЛЕ всех остальных модулей шагов — копирует их записи
import dev_links_r1_steps_auth  # noqa: F401  зачем (12.10): ссылки и шаги Авторизации (auth-gap-001/002/003/008…012, profile-023) — свой модуль, общий файл шагов не трогаем
import dev_links_r1_steps_chain7  # noqa: F401  зачем (Авторизация 12.10): пропущенные Сверкой в chain7 id — ссылки из существующих подмен; ПОСЛЕ auth (копии блица)
import dev_links_r1_steps_p83  # noqa: F401  зачем (Дизайн 12.10 ночь): п.83 и chain7 Диалогов — исправления шагов dialogs-005/017/018/036, cards-027, cards-030; ПОСЛЕДНИМ, put() заменяет прежние записи тех же id
import dev_links_r1_steps_p84  # noqa: F401  зачем (Дизайн 13.10): поправки кадров Карточек/Диалогов (hidekb, scroll:up, cards=empty, quota=6, dquota=30) — ПОСЛЕ p83, перед ним нельзя: правит уже готовые записи
import dev_links_r1_steps_errfix  # noqa: F401  зачем (координатор 13.10, Темы befda6335): исправления шагов по ошибкам робота step_target_not_found — ПОСЛЕДНИМ, поверх всех модулей

R = 'C:/appsprojects/phraseman/'
reg = json.load(open(R + 'docs/phraseman-2.0/registries/visual_parity.json', encoding='utf-8'))

def it(o):
    if isinstance(o, dict):
        if 'id' in o and 'status' in o:
            yield o
        for v in o.values():
            yield from it(v)
    elif isinstance(o, list):
        for v in o:
            yield from it(v)

# зачем (координатор 12.10, Макеты): match-строки, протухшие после правок кода, надо переснимать — им тоже нужны ссылка и шаги (20 строк Сверка пропускала как «нет в DEV_LINKS_R1»)
rows = [r for r in it(reg) if (r.get('release') == 'r1' or r.get('id') in STEPS_ROBOT.INCLUDE_IDS) and r.get('status') in ('pending', 'diff', 'match')]

# ── индекс shot-list: id → (источник, заголовок, строка таблицы или шаги группы)
texts = {}
for path in sorted(glob.glob(R + 'docs/phraseman-2.0/R1_SHOT_LIST*.md')):
    name = path.split('/')[-1].replace('.md', '')
    lines = open(path, encoding='utf-8').read().split('\n')
    heading = ''
    steps = []
    for i, line in enumerate(lines):
        if re.match(r'^#{2,4} ', line):
            heading = re.sub(r'^#+\s*', '', line).strip()
            steps = []
        elif re.match(r'^\d+\. ', line):
            if len(steps) < 3:
                steps.append(line.strip())
        m = re.match(r'^\|\s*([a-z0-9-]+)\s*\|(.*)$', line)
        if m and m.group(1) not in texts:
            cols = [c.strip() for c in m.group(2).split('|')]
            col = max(cols[:4], key=len) if cols else ''
            texts[m.group(1)] = ('table', name, heading, col)
        if 'Кадры в группе' in line:
            for rid in re.findall(r'\b[a-z]+(?:-[a-z0-9]+)*-\d{3}\b', line):
                if rid not in texts:
                    texts[rid] = ('group', name, heading, ' '.join(steps))

def short(s, n=330):
    s = re.sub(r'\s+', ' ', s).replace('|', '¦')
    return s if len(s) <= n else s[:n - 1] + '…'

B = 'phraseman://dev_state?'
# ── правила: (раздел, регулярка по «экран состояние» в нижнем регистре, ссылка, подготовка)
def L(params, nxt):
    return f'`{B}{params}&next={nxt.replace("&", "%26")}`'

COMMON = 'onboarding=done&intros=seen'
RULES = []
def rule(sections, rx, link, prep=''):
    RULES.append((tuple(sections), re.compile(rx, re.I), link, prep))

# Диалоги
D = ['dialogs', 'dialogs-gap']
rule(D, r'слишком много сообщений|сервис недоступен', L(f'{COMMON}&dev_dialog_fail=service', '/ai_dialog_home'), 'открыть диалог и отправить реплику; «слишком много сообщений» — `dev_dialog_fail=rate_limited`; снять: `dev_dialog_fail=off`')
rule(D, r'временно недоступны', L(f'{COMMON}&dialogs_paused=1', '/ai_dialog_home'), 'снять: `dialogs_paused=0`')
rule(D, r'последний ответ|1/30', L(f'{COMMON}&plus=off&dquota=1', '/ai_dialog_home'), 'открыть диалог, отправить реплику — после неё лимит 0/30; снять: `dquota=reset`')
rule(D, r'не получилось начать диалог', L(f'{COMMON}&energy=3&dev_energy_fail=1', '/ai_dialog_home'), 'открыть диалог → «Начать диалог»; снять: `dev_energy_fail=0`')
rule(D, r'язык.*проверяется|язык диалогов', '', 'ручной путь: Настройки → «Язык изучения» → язык, для которого диалоги выключены таблицей готовности (D129/D130, `learning_language_surface_readiness.ts`); включает только владелец')
rule(D, r'— plus|хаб — plus', L(f'{COMMON}&plus=on&dquota=reset', '/ai_dialog_home'), 'у Plus пилюль лимита и энергии нет — так и должно быть')
rule(D, r'лимит исчерпан|на этот месяц всё|на сегодня всё|0/30|0/10', L(f'{COMMON}&plus=off&dquota=0', '/ai_dialog_home'), 'для стены внутри диалога: `dquota=1`, открыть диалог, отправить реплику')
rule(D, r'сетевая ошибка|повторить', L(f'{COMMON}&plus=off&dev_dialog_fail=service', '/ai_dialog_home'), 'открыть диалог и отправить реплику; снять: `dev_dialog_fail=off`')
rule(D, r'rate|слишком часто', L(f'{COMMON}&dev_dialog_fail=rate_limited', '/ai_dialog_home'), 'снять: `dev_dialog_fail=off`')
rule(D, r'plus.*(дн|лимит)|дневн', L(f'{COMMON}&plus=on&dev_dialog_fail=plus_daily_cap', '/ai_dialog_home'), 'снять: `dev_dialog_fail=off`')
rule(D, r'приостановлен|на паузе|рубильник|выключ', L(f'{COMMON}&dialogs_paused=1', '/ai_dialog_home'), 'снять: `dialogs_paused=0`')
rule(D, r'настроени|упало|разозл|злой', L(f'{COMMON}&dev_dialog_mood=sad', '/ai_dialog_home'), 'варианты `happy|smile|neutral|sad|angry`; открыть диалог')
rule(D, r'свободн|готовим разговор', L(f'{COMMON}&plus=on&hold=freeform_loading', '/ai_dialog_home'), 'снять: `hold=off`')
rule(D, r'энерги', L(f'{COMMON}&energy=0&dev_energy_fail=1', '/ai_dialog_home'), 'снять: `dev_energy_fail=0`, `energy=5`')
rule(D, r'хаб', L(f'{COMMON}&plus=off&dquota=reset', '/ai_dialog_home'), 'Plus: заменить `plus=on`')

# Карточки
C = ['cards', 'cards-section', 'cards-v2', 'cards-gap', 'packs-simple', 'mistakes-panel']
rule(C, r'из видео', L(f'{COMMON}&cards=demo', '/flashcards_video_packs'), 'список роликов грузится из облака: нужна живая сеть эмулятора; превью — журнал `[THUMB]`')
rule(C, r'подготовка тренировки.*нет наборов|нет наборов', L(COMMON, '/flashcards_training_setup'), 'чистый аккаунт: НЕ применять `cards=demo`')
rule(C, r'хаб.*(?<!ошибка )загрузк|(?<!ошибка )загрузка.*хаб', L(f'{COMMON}&hold=hub_loading', '/flashcards'), 'снять: `hold=off`')
rule(C, r'каталог.*(?<!ошибка )загрузк|^загрузка.*(каталог|сообщ)', L(f'{COMMON}&hold=catalog_loading', '/flashcards_packs'), 'снять: `hold=off`')
rule(C, r'сохран.*(?<!ошибка )загрузк|(?<!ошибка )загрузка.*сохран', L(f'{COMMON}&cards=demo&hold=saved_loading', '/flashcards_collection?cat=saved'), 'снять: `hold=off`')
rule(C, r'подготов.*(?<!ошибка )загрузк|(?<!ошибка )загрузка наборов|загружаем наборы', L(f'{COMMON}&cards=demo&hold=setup_loading', '/flashcards_training_setup'), 'снять: `hold=off`')
rule(C, r'голос.*загрузк|загрузка списка голосов', L(f'{COMMON}&cards=demo&hold=voices_loading', '/flashcards_voice_picker'), 'снять: `hold=off`')
rule(C, r'готовим тренировку', L(f'{COMMON}&cards=demo&hold=quota_waiting', '/flashcards'), 'снять: `hold=off`')
rule(C, r'не удалось проверить лимит', L(f'{COMMON}&cards=demo&hold=quota_failed', '/flashcards'), 'снять: `hold=off`')
rule(C, r'быстрый старт', L(f'{COMMON}&cards=demo&hold=swipe_quickstart', '/flashcards'), 'снять: `hold=off`')
rule(C, r'тренировка не открылась', L(f'{COMMON}&cards=demo&train_gate=fail_blitz', '/flashcards'), 'режимы: `fail_blitz|fail_speaking|fail_swipe_prepare|fail_swipe_quota`; снять: `train_gate=off`')
rule(C, r'ошибка загрузки|не удалось загрузить', L(f'{COMMON}&cards=demo&fail=saved_load', '/flashcards_collection?cat=saved'), 'снять: `fail=off`')
rule(C, r'не удалось сохранить|ошибка сохранения', L(f'{COMMON}&cards=demo&fail=card_write', '/flashcards_card_editor'), 'для набора: `fail=pack_write`; снять: `fail=off`')
rule(C, r'суточный лимит', L(f'{COMMON}&cards=demo_published&fail=publish_daily_limit', '/flashcards_my_packs'), 'открыть свой набор → «Открыть сообществу»; снять: `fail=off`')
rule(C, r'(устно|говорить).*(нечего|нет)|нечего говорить', L(f'{COMMON}&cards=notranslation&speech=no_speech', '/flashcards'), 'снять: `speech=off`')
rule(C, r'устно', L(f'{COMMON}&cards=demo&speech=correct', '/flashcards'), 'ответы: `correct|wrong|denied|no_speech|unavailable`; снять: `speech=off`')
rule(C, r'без перевода|нет карточек с переводом', L(f'{COMMON}&cards=notranslation', '/flashcards'), 'вернуть: `cards=demo`')
rule(C, r'каталог пуст|пока нет публикаций|здесь появятся', L(f'{COMMON}&catalog=empty', '/flashcards_packs'), 'вернуть: `catalog=demo`')
rule(C, r'каталог', L(f'{COMMON}&catalog=demo', '/flashcards_packs'), '')
rule(C, r'лимит.*(50|первые 50)|50 из 50|место.*закончилось', L(f'{COMMON}&plus=off&cards=custom50', '/flashcards_collection?cat=saved'), 'своих карточек 50/50; сохранённых 50 — `cards=demo`+`plus=off`')
rule(C, r'30 из 30|тренировки на месяц|осталось 0 из 30|лимит free', L(f'{COMMON}&plus=off&cards=demo&quota=exhausted', '/flashcards'), 'вернуть: `quota=reset`')
rule(C, r'одобрен|отклонён|доработк|снят с продаж', L(f'{COMMON}&cards=demo_published&moderation=approved', '/flashcards'), 'значения `approved|rejected|revision|removed`; окно показывается один раз')
rule(C, r'опубликован|в сообществе|править набор', L(f'{COMMON}&cards=demo_published', '/flashcards_my_packs'), '')
rule(C, r'мои наборы|набор открыт|свой набор|чужой|добавлен|отклик|жалоб|правка|создан|новый набор|новая карточка|редактор', L(f'{COMMON}&cards=demo_published&catalog=demo', '/flashcards_my_packs'), 'дальше тапами: набор → нужное состояние (см. shot list)')
rule(C, r'сохран|стопка|масштаб|колонк|карточка|список|поиск|пусто', L(f'{COMMON}&cards=demo', '/flashcards_collection?cat=saved'), 'пусто: не применять `cards=demo` (чистый аккаунт)')
rule(C, r'хаб|режим|настройк', L(f'{COMMON}&cards=demo&plus=off', '/flashcards'), 'новичок: без `cards=demo`')

# Пейволы
P = ['paywalls', 'paywall-gap']
PM = 'premium_modal?context=generic&source=settings_premium&_dev_state='
import urllib.parse
def PL(name, extra=''):
    direct = f'phraseman://{PM}{name}{extra}'
    via = f'{B}{COMMON}&next=' + urllib.parse.quote('/' + PM + name + extra, safe='')
    return f'`{direct}`; через dev_state: `{via}`'
rule(P, r'управление', L(f'{COMMON}&plus=on&plan=yearly', '/manage_subscription'), 'план: `plan=yearly|monthly|lifetime`; первые 0,3 с — скелетон; force-stop после смены плана')
rule(P, r'загрузка условий|скелет', PL('loading'), '')
rule(P, r'ошибка до checkout', PL('store_unreachable'), 'тост приходит через 0,7 с')
rule(P, r'цен нет|нет цен|ошибка цен', PL('error_no_prices'), '')
rule(P, r'магазин недоступен|billing', PL('billing_unavailable'), '')
rule(P, r'справочн|≈', PL('reference'), '')
rule(P, r'идёт оплата|проверяем покупку|оплата идёт', PL('purchasing'), '')
rule(P, r'восстанов', PL('restoring'), '')
rule(P, r'ожидание банка|родител', PL('pending'), 'окно очищается при смене состояния')
rule(P, r'результат покупки неизвестен|статус покупки не подтверждён|неизвестен.*диалог', PL('unknown_outcome'), '')
rule(P, r'статус неизвестен|покупка пока не найдена', PL('status_unknown'), 'тост; или `dev_state?toast=status_not_found`')
rule(P, r'промо|скидка', PL('store_promo'), '')
rule(P, r'plus твой|напомнить|разрешить напоминание', PL('reminder_prompt'), '')
rule(P, r'лент|пробн|бесплатно', f'`premium_modal?context=generic&source=settings_premium&_force_trial_ui=1&_force_trial_days=3` (образец N=3; сам срок в проде — из магазина)', 'нужен dev-режим без магазина')
rule(P, r'тост', f'`dev_state?{COMMON}&toast=restored&next=/(tabs)/settings`', 'тосты: `purchase_confirmed|restored|status_not_found|no_active_subscriptions|status_check_failed|restore_failed|store_unreachable`')
rule(P, r'карточк|диалог|энерги|контекст', f'`premium_modal?context=flashcard_limit&source=flashcards_collection` (контексты: `dialog_limit`, `flashcard_limit`, `energy_empty`, `generic`)', '')

# Настройки
S = ['profile', 'settings-gap']
rule(S, r'плашка|vip|выдач|промо.*доступ|доступ', L(f'{COMMON}&vip=promo', '/(tabs)/settings'), 'после ссылки force-stop → запуск (VIP читается при старте); виды `promo|promo_lifetime|referral|survey|idea|tester|admin|admin_lifetime|off`')
rule(S, r'опрос|сообщени.*(слот|вверху|внизу)|важное', L(f'{COMMON}&slot=poll', '/(tabs)/settings'), '`slot=poll|poll_voted|message|top|off`')
rule(S, r'очистк.*кеш|кеш', L(f'{COMMON}&cache=failed', '/(tabs)/settings'), 'снять: `cache=ok`')
rule(S, r'поддержк|не отправилось|отправлено', L(f'{COMMON}&support=fail', '/support_report'), 'снять: `support=ok`')
rule(S, r'язык изучения|не удалось сменить', L(f'{COMMON}&studyfail=on', '/(tabs)/settings'), 'снять: `studyfail=off`')
rule(S, r'приглашени|реферал', L(f'{COMMON}&referral=off', '/referrals'), 'снять: `referral=on`')
rule(S, r'промокод', L(f'{COMMON}&promo=ok', '/(tabs)/settings'), 'ответы `ok|lifetime|used|expired|disabled|limit|not_found|rate_limited|error|none`')
rule(S, r'выход|не удалось выйти', L(f'{COMMON}&logout=fail', '/(tabs)/settings'), '`logout=fail|precommit|ok`')
rule(S, r'удаление', L(f'{COMMON}&delete=fail', '/(tabs)/settings'), 'снять: `delete=ok`')
rule(S, r'смена аккаунта|сменить аккаунт', L(f'{COMMON}&switch=not_uploaded', '/(tabs)/settings'), '`not_uploaded|backup_blocked|unsaved_cards|pending_spend|quarantine|guard|slow|ok`')
rule(S, r'подписк|план|управление', L(f'{COMMON}&plan=yearly', '/(tabs)/settings'), '`yearly|monthly|lifetime|off`')
rule(S, r'друз', L(f'{COMMON}&dev_friends_fail=add', '/(tabs)/community?section=friends'), 'удержание: `dev_friends_hold=add_request`; приглашение: `friend_event=study_invite`')
rule(S, r'.', L(f'{COMMON}&plus=off', '/(tabs)/settings'), 'дальше тапами по группе Настроек (см. shot list)')

# Энергия / Главная / рассылки
E = ['energy-modes', 'overlays-campaigns', 'home']
rule(E, r'энерги', L(f'{COMMON}&energy=0&plus=off&mode=b', '/(tabs)/home'), 'режимы энергии `mode=a|b|server`, `energy=0..5`')
rule(E, r'рассылк|кампани|сообщени', L(f'{COMMON}', '/(tabs)/home'), 'рассылки новичку 24 ч не показываются: нужен «не новичок» (не проходить онбординг заново)')
rule(E, r'.', L(f'{COMMON}&plus=off&energy=3', '/(tabs)/home'), '')

# Шпиль/сообщество/онбординг/аккаунт — только ссылки
O = ['spire', 'spire-gap', 'community', 'onboarding', 'onboarding-paywall', 'auth-gap', 'overlays-runtime']
rule(O, r'.', '', '')  # заглушка: только текст из shot list

# зачем (Сверка 12.10, ROBOT13): learn/coins/video/overlays не входили ни в одну область — 11 id оставались «нет_в_DEV_LINKS_R1»; ссылки и шаги — scripts/dev_links_r1_steps_robot.py
# зачем (Авторизация 12.10, chain7): блиц practice.html, серия/статистика results.html и системные сообщения system.html не входили ни в одну область —
# их строки (dev_links_r1_steps_chain7.py) не выводились в таблицу
LV = ['learn', 'coins', 'video', 'overlays', 'practice', 'results', 'system']
rule(LV, r'.', '', '')

def section_of(rid):
    return rid.rsplit('-', 1)[0]

AREAS = [
    ('Карточки', C),
    ('Диалоги', D),
    ('Пейволы', P),
    ('Настройки и профиль', S),
    ('Главная, энергия, рассылки', E),
    ('Шпиль, сообщество, онбординг, аккаунт (только ссылки; фикстуры у Тем и Авторизации)', O),
    ('Обучение, монеты, видео, окна знакомства (ROBOT13; ссылки — dev_links_r1_steps_robot.py)', LV),
]

def match(row):
    sec = section_of(row['id'])
    label = f"{row.get('screen') or ''} {row.get('state') or ''}".lower()
    for secs, rx, link, prep in RULES:
        if sec in secs and rx.search(label):
            return link, prep
    return None, ''

out = []
out.append('# DEV_LINKS_R1 — как добраться до состояния (Дизайн, 12.10)\n')
out.append('Строки реестра `release=r1`, `status=pending|diff|match`. Для каждой — готовая ссылка (`dev_state`, `premium_modal?…&_dev_state=…`, `next=…`) или ручной путь, плюс что сделать перед кадром. Источники: реестр, `R1_SHOT_LIST*.md`, `app/dev_state_fixtures.ts`, `app/dev_paywall_state.ts`. Ссылки подобраны по названию состояния — если кадр не тот, смотри колонку «shot list» (точный путь тапами).\n')
out.append('## Правила перед КАЖДЫМ кадром\n')
out.append('1. `adb shell am force-stop app.phraseman` → запуск → дождаться «DEV-STATE OK» (экран `dev-state-done`).')
out.append('2. Ссылка начинается с `phraseman://dev_state?` и всегда содержит `onboarding=done&intros=seen` (**новое**: `intros=seen` помечает все окна знакомства с разделами показанными — не нужно жать «Позже» на каждом экране; `intros=reset` вернёт их).')
out.append('3. Окна и тосты прошлого кадра: перед новым состоянием пейвола очередь блокирующих окон очищается сама (6bdba4d26). Для остальных — force-stop.')
out.append('4. Свойства аккаунта: `plus=on|off` (Plus), `free=on` (без dev-Plus), `energy=0..5`, `cards=demo` (64 сохранённые, 4 набора), `catalog=demo|empty`, `quota=N|exhausted|reset`, `dquota=N|reset`. Снимать перепробованные фикстуры значением `off`/`reset`.')
out.append('5. VIP-плашка и план подписки (`vip=`, `plan=`) читаются при старте: после ссылки force-stop → запуск.')
out.append('6. Тема кадра: тёмная «Аврора» (Спокойно), если в строке не сказано иное.')
out.append('7. Колонка «тапы» — шаги после открытия ссылки (грамматика — `scripts/parity_steps.mjs`: `tap:#testID`, `tap:Текст`, `long:`, `swipe-left:`, `type:`, `back`, `wait:`); их выполняет робот `scripts/parity_batch_shoot.mjs` через `uiautomator dump`. Колонка «уникальна»: **да** — ссылка+шаги открывают ровно этот кадр (робот берёт только такие); **нет** — ссылка общая с соседями или путь не выведен, снимать руками по shot list. `cards=empty` очищает сохранённые/свои карточки и наборы (пустые кадры); `cards=demo` и `cards=empty` сбрасывают масштаб сетки и режим «стопка».\n')
out.append('8. ⚠️ **Фикстуры `cards=demo|demo_lessons|empty|custom50|demo_published|notranslation` пишут в синхронизируемые ключи карточек и наборов** (облачная синхронизация и Account V2) — поэтому работают ТОЛЬКО на анонимном госте (`pm clear` → онбординг) и отказываются на аккаунте с Google/Apple (лог `[DEV-STATE] cards=… refused: real account`). Тестовые аккаунты №2/№3 для Карточек не использовать.\n')
out.append('9. Окна рассылок, объявлений и личных сообщений на кадре гасит `overlays=off` (только память, в стор-сборке вырезано; в ссылках всех кадров, кроме самих окон). `onboarding=done` ставит и отметку завершения онбординга: тестовый гость ведёт себя как настоящий новичок (рассылка ему не приходит первые сутки).')

need = []
counts = collections.Counter()

# зачем (координатор 12.10, cards-009/010): окна рассылок/объявлений/личных сообщений портили кадры («Замочки ушли в отпуск!» поверх «Сохранённых»). Во все ссылки dev_state добавляем overlays=off
# (app/dev_overlays_off.ts: только память, в стор-сборке вырезано), кроме кадров самих окон. Слот сообщений Настроек (settings-gap-007/008/009/029) — не окно поверх экрана, но оставляем как есть: это и есть предмет кадра.
OVERLAYS_KEEP = set()  # зачем (12.10): слот сообщений Настроек — не окно, исключение не нужно; окно «Plus закончился» закрывало экран кадров gap-008 (журнал: holder=entitlementExpired), overlays=off теперь гасит и его

def add_overlays_off(rid, link):
    if not link or 'dev_state?' not in link:
        return link
    extra = ''
    if 'overlays=' not in link and rid not in OVERLAYS_KEEP:
        extra += '&overlays=off'
    # зачем (Сверка 12.10, cards-v2-033): у свежего гостя язык изучения es, а демо-карточки (`cards=demo*`, `custom50`, `notranslation`) английские — без `studyTarget=en`
    # хаб/тренировка видят пустой список («Нет карточек для тренировки», [HUB-TOPCARD] result=empty_after_filter). Строки, где язык задан явно, не трогаем.
    if re.search(r'[?&]cards=(demo|custom50|notranslation)', link) and 'studyTarget=' not in link:
        extra += '&studyTarget=en'
    if not extra:
        return link
    if '&next=' in link:
        return link.replace('&next=', extra + '&next=', 1)
    return link[:-1] + extra + '`' if link.endswith('`') else link + extra

# ── ссылка каждой строки ДО вывода: нужна, чтобы понять, общая ли она с соседями (признак «уникальна»)
def final_link(row):
    entry = STEPS_DATA.ENTRIES.get(row['id'])
    if entry:
        return add_overlays_off(row['id'], f"`{entry['link']}`")
    link, _ = match(row)
    return add_overlays_off(row['id'], link)

link_usage = collections.Counter(final_link(r) for r in rows if final_link(r))
unique_count = 0
# зачем (координатор 12.10, Макеты e1b68c470): ожидаемое состояние берём из ПРИВЯЗКИ строки (mockup.file#phone + подпись), а не из названия строки —
# cards-006 в названии про «карточка раскрыта», а привязана к макету «Удалено — вернуть». Подпись образца — в колонке «образец»; запись «да»,
# описание которой не пересекается с подписью образца, попадает в список несовпадений (печать + DEV_LINKS_R1_BINDINGS.md).
binding_flags = []

def label_tokens(text):
    words = re.findall(r'[A-Za-zА-Яа-яЁё0-9]{3,}', (text or '').lower())
    return {w[:4] for w in words}
for title, secs in AREAS:
    group = [r for r in rows if section_of(r['id']) in secs]
    if not group:
        continue
    group.sort(key=lambda r: r['id'])
    out.append(f'## {title} ({len(group)})\n')
    out.append('| id | экран · состояние | ссылка / путь | перед кадром | shot list | тапы | уникальна | образец (макет#телефон · подпись) |')
    out.append('|---|---|---|---|---|---|---|---|')
    for r in group:
        link, prep = match(r)
        entry = STEPS_DATA.ENTRIES.get(r['id'])
        steps_cell = ''
        if entry:
            link = f"`{entry['link']}`"
            prep = entry['note']
            steps_cell = '`' + '; '.join(entry['steps']) + '`' if entry['steps'] else ''
        link = add_overlays_off(r['id'], link)
        t = texts.get(r['id'])
        shot = ''
        if t:
            shot = f"{t[1].replace('R1_SHOT_LIST_', '').replace('R1_SHOT_LIST', 'ОБЩИЙ')} · {short(t[2], 60)}: {short(t[3], 150)}"
        nopath = bool(t and re.search(r'НЕТ ПУТИ', t[3]))
        label = short(f"{r.get('screen') or ''} · {r.get('state') or ''}", 90)
        if link:
            counts['link'] += 1
            cell = link
        elif link == '' and prep and secs is not O:
            counts['manual'] += 1
            cell = prep if prep.startswith('ручной путь') else 'ручной путь: ' + prep
            prep = ''
        elif secs is O:
            counts['shot'] += 1
            cell = 'ссылка — по shot list (фикстуры не мои)' if t else 'нет в shot list'
        elif nopath:
            counts['need'] += 1
            cell = '**нужна фикстура** (см. shot list)'
            need.append(r['id'])
        else:
            counts['manual'] += 1
            cell = 'ручной путь — см. shot list'
        # «уникальна»: либо данные строки это утверждают (путь выведен из кода), либо ссылка у строки ОДНА на всю таблицу и в «перед кадром» нет «тапами»
        if entry:
            is_unique = bool(entry['unique'])
        else:
            # зачем: ссылка, уникальная в таблице, ещё НЕ значит «открывает свой кадр» (она может вести лишь на хаб, а состояние добирается позже);
            # по умолчанию «да» только для прямых ссылок на состояние пейвола (premium_modal?…&_dev_state=…), остальное — явной записью в dev_links_r1_steps.py
            is_unique = bool(link) and 'premium_modal' in link and link_usage[link] == 1 and 'тапами' not in prep and secs is not O
        unique_count += 1 if is_unique else 0
        mk = r.get('mockup') or {}
        sample = f"{(mk.get('file') or '').split('/')[-1]}#{mk.get('phone')} · {mk.get('label') or '—'}" if mk.get('file') else 'нет макета'
        sample = sample.replace('|', '¦')
        if is_unique and entry and mk.get('label'):
            described = ' '.join([entry['note'], ' '.join(entry['steps']), mk.get('label') or ''])
            overlap = label_tokens(mk['label']) & label_tokens(entry['note'])
            if not overlap:
                binding_flags.append((r['id'], sample, entry['note'], f"{r.get('screen')} · {r.get('state')}"))
        if re.search(r'[?&]cards=(?:demo|demo_lessons|empty|custom50|demo_published|notranslation)(?:&|$|%26)', link or ''):
            prep = (prep + ' · ' if prep else '') + '**только гость (pm clear + онбординг)**'
        prep = prep.replace('|', '¦')  # зачем: «|» в тексте подготовки сдвигал колонки «тапы»/«уникальна» (разбор роботом по номеру колонки)
        out.append(f"| {r['id']} | {label} | {cell} | {prep} | {shot} | {steps_cell} | {'да' if is_unique else 'нет'} | {sample} |")
    out.append('')

out.append('## Итог\n')
if binding_flags:
    out.append(f'⚠️ Несовпадения «запись ↔ привязка образца» ({len(binding_flags)}): подробности — DEV_LINKS_R1_BINDINGS.md.\n')
out.append(f'Строк с признаком «уникальна: да» (робот parity_batch_shoot берёт только их): {unique_count} из {sum(counts.values())}.\n')
out.append(f"Строк в охвате: {sum(counts.values())}. Готовая ссылка: {counts['link']}. Ручной путь по shot list: {counts['manual']}. Только ссылки по shot list (Шпиль/онбординг/аккаунт): {counts['shot']}. «Нужна фикстура»: {counts['need']}" + (f" — {', '.join(need[:60])}" if need else '') + '.\n')
import os, time
bind_lines = ['# DEV_LINKS_R1 — несовпадения записи и привязки образца', '', 'Запись «уникальна: да» описывает кадр, у которого нет общих слов с подписью макета, к которому привязана строка реестра. Проверить глазами: либо запись неверна, либо привязка в реестре.', '', '| id | образец | что открывает запись | название строки |', '|---|---|---|---|']
for fid, fsample, fnote, fname in binding_flags:
    bind_lines.append('| ' + ' | '.join(x.replace('|', '¦') for x in (fid, fsample, fnote, fname)) + ' |')
open(R + 'docs/phraseman-2.0/DEV_LINKS_R1_BINDINGS.md', 'w', encoding='utf-8', newline='\n').write('\n'.join(bind_lines) + '\n')
print('binding flags:', len(binding_flags))
target = R + 'docs/phraseman-2.0/DEV_LINKS_R1.md'
# зачем: Windows иногда отвечает «Invalid argument» на открытие файла, который читает другой процесс; пишем во временный файл и подменяем, с повтором
for attempt in range(8):
    try:
        open(target + '.tmpw', 'w', encoding='utf-8', newline='\n').write('\n'.join(out))
        os.replace(target + '.tmpw', target)
        break
    except OSError as error:
        print('write retry', attempt, error)
        time.sleep(1.5)
else:
    raise SystemExit('DEV_LINKS_R1.md не записан после 8 попыток')
print(dict(counts), len(need))
