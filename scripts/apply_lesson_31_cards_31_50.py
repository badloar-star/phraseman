# -*- coding: utf-8 -*-
"""Replace lesson 31 flash cards 31-50 in app/lesson_cards_data.ts (fix duplicate card text)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PATH = ROOT / "app" / "lesson_cards_data.ts"

# Unique anchors: the erroneous recycled block start and the next lesson 32 first card.
START = (
    '    31: {\n'
    '      correctRu: "Вы превосходно уловили суть принуждения. Глагол make в этой конструкции'
)
NEW = r'''    31: {
      correctRu: "Отлично: с глаголом see (видеть) мы цепляем весь сценарий сразу — субъект (собаку) и движение (перебежать) без to.",
      correctUk: "Добре: з дієсловом see (бачити) ви з’єднуєте цілий сценарій — об’єкт (собаку) і рух (перебігти) без to.",
      wrongRu: "Здесь важен порядок «тот, кто ведет собаку», затем сама собака, потом её шаг, и только в конце улица. Иначе предложение разваливается.",
      wrongUk: "Тут важливий порядок: «той, хто веде собаку», далі сама собака, потім її крок і лише в кінці вулиця. Інакше речення «роз’їдеться».",
      secretRu: "Stray (бродячий) с тем же корнем, что strayer — буквально «тот, кто ушел с пути».",
      secretUk: "Stray (бродячий) споріднене зі спокусою «вийти з дороги» — той, хто заблудив.\n\n---"
    },
    32: {
      correctRu: "Услышал не звук, а вопрошание целиком: hear + объект (ученик) + глагол ask в начальной форме, без to.",
      correctUk: "Почули не «шум», а ціле запитання: hear + об’єкт (студент) + ask у початковій формі, без to.",
      wrongRu: "Нужна связка: сначала «тихо», потом to ask, и только потом вопрос — иначе как в формальном письме.",
      wrongUk: "Потрібна конструкція: спочатку «тихо», потім to ask, і тільки потім питання — ніби для офіційного листа.",
      secretRu: "Слово question пишется с digraph qu — в латинской традиции, как quis «кто».",
      secretUk: "Слово question пишуть з qu — за латинською традицією, як quis «хто».\n\n---"
    },
    33: {
      correctRu: "Feel связывает вас, источник ощущения (солнечный свет) и движение (reach) в одной короткой цепочке — это тот самый complex object.",
      correctUk: "Feel пов’язує вас, джерело відчуття (світло) і рух (reach) в одному короткому ланцюжку — це і є складний додаток.",
      wrongRu: "Свет — это вещь, поэтому сначала to reach, и только потом глазам — тогда слышитесь как кальку с русского.",
      wrongUk: "Світло — «річ», тож спочатку to reach, і лише потім очам — вийде калькуючи з українського.",
      secretRu: "Sunlight на 50% — видимый свет, остальное в инфракрасной и ультрафиолетовой области.",
      secretUk: "Сонячне світло приблизно наполовину видиме, решта в інфрачервоному та ультрафіолеті.\n\n---"
    },
    34: {
      correctRu: "С notice (заметить) после объекта сразу идет смена в действии: leave без to — динамичная, почти кинематографичная схема.",
      correctUk: "Після notice (помітити) одразу йде нова дія: leave без to — кінематографічна схема.",
      wrongRu: "Сначала объявляем, что вокзал важен, и только потом, что незнакомца «оставили уходить» в пассиве — так теряется эффект слежки.",
      wrongUk: "Спочатку оголошуємо, що вокзал важливий, а потім «незнайомця залишили уходить» пасивом — зникає ефект спостереження.",
      secretRu: "Stranger (незнакомец) в правовом англии — «чужой, не из местных»; этимологически от Old French estraié 'потерянный, сбившийся с пути'.",
      secretUk: "Stranger — «чужий» (strange); у сучасних офіційних колоквіалізмах — людина без супроводу на події (контраст 'registered guest').\n\n---"
    },
    35: {
      correctRu: "Make + человек, которого ведут + базовая форма follow: спасатели в учебниках именно так формулируют команду, без to.",
      correctUk: "Make + того, кого ведуть + follow у базовій формі: у навчальних сценаріях саме так, без to.",
      wrongRu: "Иногда думают, что 'made... to follow' вежливее, но в английском to здесь нарушает закон make.",
      wrongUk: "Іноді здається, що 'made... to follow' ввічливіше, але в англійському to тут ламає правило make.",
      secretRu: "Пожарные (firefighter) в US чаще говорят exit; в UK sign чаще пишут Way out.",
      secretUk: "Пожежники: у UK частіше emergency exit, у публічних місцях ілюміновані піктограми — зелена фігурка кудись «до виходу».\n\n---"
    },
    36: {
      correctRu: "Hear + пара + that-clause/инфинитивный план: вы слышали не 'шум', а план (plan) в явном виде.",
      correctUk: "Hear + пара + plan: ви чули не гул, а саме план у повній формі.",
      wrongRu: "Если поставить to plan, получится, что план в будущем — слышатели 'предсказывают', а не фиксируют услышанное.",
      wrongUk: "Якщо втиснути to plan, вийде, що план 'на трохи пізніше', а треба зафіксовану розмову, яку чули цілком.",
      secretRu: "Wedding (свадьба) от германск. root, родственно wedge — то, что 'скрепляет' двоих.",
      secretUk: "Wedding (весілля) пов’язане з ідеєю 'з’єднати' (індоєвропейські корені близькі до bond).\n\n---"
    },
    37: {
      correctRu: "See + кандидат + sign: свидетель увидел завершенный акт (подпись) — снова цельная 'кинематографическая' цепь без to.",
      correctUk: "See + кандидат + sign: свідок бачить завершену дію (підпис) — знову одна ціла ланка без to.",
      wrongRu: "Глагол 'увидел, как он хочет подписать' потребует инфинитива с to — но в данных вы видели факт, не намерение.",
      wrongUk: "«Побачив, як хоче підписати» — інша конструкція; тут — факт підпису, не намір наперед.",
      secretRu: "Document от лат. documentum — 'учение, наставление', позже 'бумажное удостоверение'.",
      secretUk: "Document: лат. 'доказ', у юридичних колоквіалізмах — 'письмове підтвердження' з підписом.\n\n---"
    },
    38: {
      correctRu: "Let + художник + paint: 'позволили рисовать' — классическое make/let-семейство, где to не вставляют.",
      correctUk: "Let + митець + paint: 'дозволили малювати' — кластер без to, як learn/teach/let з інфінітивом після об’єкта в деяких моделях.",
      wrongRu: "Хочется 'let to paint' как в нормальном to-infinitive, но let — исключение.",
      wrongUk: "Кортиться 'let to paint', як у звичних to-інфінітивах, але let — виняток (bare infinitive).",
      secretRu: "Mural (мурал) в современном англии — от лат. murus 'стена'.",
      secretUk: "Mural — від лат. murus «стіна»; colloquially wall painting.\n\n---"
    },
    39: {
      correctRu: "Feel + ветер + push: в природных коллокациях bare infinitive 'толкать' встанет сразу после объекта, который вы 'ощущаете' как силу.",
      correctUk: "Feel + вітер + push: після об’єкта одразу bare infinitive — 'штовхає' як силу, а не 'щоб штовхнув' окремо.",
      wrongRu: "Если 'ветер' одушевлённо 'продолжает' толкать, добавляем -ing — тогда смысл: процесс, не один толчок.",
      wrongUk: "З -ing (pushing) це вже 'потроху, безкінечно' — тут важлива мить імпульсу, не тривалість.",
      secretRu: "Слово cart (телега) в англ. диалектах с XIX в. сравнивали с 'рогами' извозчиков, отсюда cart-horse, cart-road.",
      secretUk: "Cart (віз) у фразеологізмах — про перевезення (shopping cart, golf cart) без 'людини як двигуна'.\n\n---"
    },
    40: {
      correctRu: "Hear + учитель + read: вы слышали не отдельные слова, а акт чтения списка; infinitive read (одна форма с present) встаёт в конце цепи.",
      correctUk: "Hear + вчитель + read: чули цілий акт читання, не 'окремі уривки'; read лишається у вигляді, що збігається з формою 'читаю'.",
      wrongRu: "Если бы был только фрагмент, добавили бы reading, но 'список правил' слышали в континууме, как 'прочтение' целиком.",
      wrongUk: "reading було б для процесу на фоні, а тут — цілеспрямоване 'прочитав список' як подію у сприйнятті.",
      secretRu: "Слово rule от лат. regula 'линейка' — 'править линейкой', выравнивать.",
      secretUk: "Rule: лат. 'лінійка' → 'узагальнена норма', як «лінія поведінки».\n\n---"
    },
    41: {
      correctRu: "Make + ребенок + take: медицинская, почти 'жёсткая' схема, где take (принять лекарство) не получает to после make.",
      correctUk: "Make + дитина + take: 'змусив прийняти' — take без to після make, як у класичних прикладах підручників.",
      wrongRu: "Kind nurse (добрая) иногда путают с 'could' и вставляют to take — make этого не выносит.",
      wrongUk: "«Добра сестра» легко вводить в оману: to take після make сюди не вставляють ні в US, ні в UK EFL.",
      secretRu: "Bitter (горький) вкус — эволюционно сигнал 'осторожно, возможно токсично' — важно в лексике лекарств.",
      secretUk: "Bitter: еволюційно «токсин?»; у colloquial ‘a bitter pill’ = неприємна правда.\n\n---"
    },
    42: {
      correctRu: "Notice + old man + drop: вы зафиксировали, как ключ 'ушел' вниз, без to после drop, потому что это смена 'кадра' в наблюдении.",
      correctUk: "Notice + old man + drop: зафіксовано мить: ключ упав униз, без to після drop, бо це окремий кадр спостереження.",
      wrongRu: "С storm drain (ливнёвка) путают: будто 'drop' требует into отдельным предлоговым пакетом — в данных всё в одной цепи.",
      wrongUk: "Storm drain: не плутати 'drop' з окремим to drop into як новою клаузою; тут інфінітив одним блоком після об’єкта.",
      secretRu: "Storm water drain (ливнёвка) в UK часто gully, в US catch basin; слово 'drain' от drēahnian 'осушать'.",
      secretUk: "Зливовий стік: у брит. іноді gully, у US catch basin; drain — від ідеї «відвести воду вниз».\n\n---"
    },
    43: {
      correctRu: "See + лошадь + jump: то же, что 'увидел прыжок' целиком — субъект и сказуемое-инфинитив (jump) в одной оптике.",
      correctUk: "See + кінь + jump: бачите цілий стриб — об’єкт і jump в одному зоровому кадрі.",
      wrongRu: "С jump иногда путают: jumping как процесс, но 'перепрыгнул' как событие требует короткого сказуемого (bare inf).",
      wrongUk: "З jumping вийшов би 'процес, що розтягується'; тут сувора мить перетину паркану, не 'хронометр стрибка'.",
      secretRu: "Fence (забор) от fens, defensive line — 'линия, которую нельзя перейти' без вести/участия.",
      secretUk: "Fence: від ‘оборонна лінія’; colloquial ‘sit on the fence’ = не визначився в дискусії.\n\n---"
    },
    44: {
      correctRu: "Hear + judge + announce: публичная речь, закончившаяся вердиктом, — ещё один 'цельный' infinitive после субъекта, который вы слышали.",
      correctUk: "Hear + judge + оголосив вердикт: чули ціле оголошення, не 'озвучене речення зверху вниз' окремо.",
      wrongRu: "Если бы 'announce' было бы сложно с grammatic, добавили that-clause, но в данных глагол announce стоит как завершенное действие.",
      wrongUk: "that the judge announced… було б іншою схемою; тут bare infinitive після об’єкта — класична модель 'сприйняття мови'.",
      secretRu: "Verdict (вердикт) от лат. vere dictum 'сказанное по правде'.",
      secretUk: "Verdict: лат. 'істинно сказане' — термін, що дожив з нормандського суду (XI ст.).\n\n---"
    },
    45: {
      correctRu: "Почувствовали, как 'здание' само (building) shake, без to: отличие от to shake — 'оно' дрожит как глагол, не 'начало дрожать' как инфинитивный проект.",
      correctUk: "Felt the building shake: shake без to; не 'to shake' як план, а дія, яку цілком відчуваєш у тремтінні конструкції.",
      wrongRu: "Сейсмика в учебниках: иногда 'felt shaking' — с герундием, но 'shake' короче, если событие одно.",
      wrongUk: "Felt… shaking = процес; felt… shake = цілий 'уда́р' вібрації, коротше й різкіше (часто в коротких EFL-прикладах).",
      secretRu: "Слово earthquake: earth + quake, quake от 'cwacian' — дрожь.",
      secretUk: "Earthquake: earth + quake, quake (дзиґ) — 'тремтіти' у давньоанглійському.\n\n---"
    },
    46: {
      correctRu: "Let + гид + show + to group: 'позволили' не переносит to к show; цепь show (что) (кому) идет после 'разрешивших'.",
      correctUk: "Let + гід + show: після let bare infinitive; конструкція 'show the map to the group' виступає як один сенсорний блок (побачив дозвіл+дія).",
      wrongRu: "Let to show — неверный коллокат в современном стандартном EFL; to появляется в других конструкциях, не после let+object-bare inf.",
      wrongUk: "‘Let to show’ не існує; show тут після let у формі, що збігається з інфінітивом без to.",
      secretRu: "Guide от фр. guider, от frankish *wītan 'смотреть, показывать путь'.",
      secretUk: "Guide: ‘показувати шлях’; group tourist: колокація, що часто в навчальних ‘excursion B1’ сценаріях.\n\n---"
    },
    47: {
      correctRu: "Firm manager + make + late employee + finish: канцелярский 'сделал закончить отчет' в типичной EFL-формуле без to — вы попали в неё.",
      correctUk: "Firm manager + make + late employee + finish: ‘змусив закінчити звіт’ — типова формула, без to після make.",
      wrongRu: "Finish sometimes confused with to finish: make never licenses 'to' before bare inf. complement.",
      wrongUk: "Плутанина: make… to finish — *типова помилка* українсько/рус. носіїв, бо ‘щоб завершив’ плутають з to-infinitive of purpose у рідних мовах.",
      secretRu: "Boring (скучный) — от 'to bore' (сверлить) метафора: 'сверлит' внимание дырами внимания.",
      secretUk: "Boring: у розм. ‘як свердлить’ нудьгу; EFL: ‘a boring report’ = нецікавий, не ‘нудьгуючий’.\n\n---"
    },
    48: {
      correctRu: "Hear + mechanic + explain: вы подслушали/услышали 'объяснение проблемы' как длинное целое — explain без to, потому что это 'услышанный акт речи' целиком.",
      correctUk: "Hear + механік + explain: читаємо/чуємо цілий act of explaining — explain стоїть bare після суб’єкта, як у моделі 'сприймання цілої вистави'.",
      wrongRu: "With 'explain' some insert 'to explain' — that would be purpose, not perception; hear wants object+verb.",
      wrongUk: "‘heard… to explain’ — *не* стандарт: hear зазвичай + object + bare, або that-clause, не to-infinitive після об’єкта в цій EFL-моделі.",
      secretRu: "Engineer инженер vs mechanic механик: первый 'проектирует', второй 'в руках у станка'.",
      secretUk: "Engine (двигун) vs ‘engineer’: одне кореневе сімейство, але colloquial ‘мотор’ у авто-контексті.\n\n---"
    },
    49: {
      correctRu: "See + branch + fall: падение 'куда' (onto car) в цепи после see — визуализация, не отдельный to fall.",
      correctUk: "See + гілка + fall: 'депозит' після onto залишається природним хвостом, bare fall — як коротка подія.",
      wrongRu: "Falling (continuous) = дольше, как лист, медленно: для сухой ветки 'fall' в completed sense.",
      wrongUk: "falling = процес; fall = цілий 'урх' на авто, що відповідає 'одному знімку' (completed perception).",
      secretRu: "Branch (ветка) от PIE *bʰreHg- 'ломать, ветвить' — 'то, что ветвится' от ствола.",
      secretUk: "Branch: «відгалуження»; colloquial ‘branch of government’ = гілка влади, та сама метафора.\n\n---"
    },
    50: {
      correctRu: "Felt + hand + touch: тактильная сцена, где 'touch' — одномоментно, иначе 'touching' было бы 'теребило', не щелчок контакта.",
      correctUk: "Felt + hand + touch: дотик-іспит; ‘touching’ дало б тривалість, а сцена — коротка холодна мить.",
      wrongRu: "Bare arm: arm confused with 'weapon' — in English 'arm' limb, homonym but different sense family.",
      wrongUk: "‘Bare’ тут = оголене, не ‘оголене-політ’; не плутати з bear (ведмідь/носити) у друкарських помилках EFL.",
      secretRu: "Phrasal touch (on) vs touch = прикоснуться; bare touch как глагол T — контакт, не 'эссе' 'on topic'.",
      secretUk: "Homophone bear/bare у навчальних вправі часта орфографія; тут only bare = ‘without covering’.\n\n---"
    },
'''


def main() -> None:
    text = PATH.read_text(encoding="utf-8")
    if START not in text:
        raise SystemExit("start anchor not found")
    i = text.index(START)
    j = text.find("  },\n  32: {\n    1: {", i)
    if j < 0:
        raise SystemExit("end anchor (lesson 32) not found after card 31 block")
    new_text = text[:i] + NEW + text[j:]
    PATH.write_text(new_text, encoding="utf-8")
    print("patched", PATH, "chars", len(NEW))


if __name__ == "__main__":
    main()
