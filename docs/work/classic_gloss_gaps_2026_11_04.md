# Классические курсы: пробелы в словарях (для Переводчика)

Источник: архив Classic (EN v3 и общий архив ES). Пересобирать модули не нужно — это список для вычитки перевода; конвертер `scripts/classic_course_pack.mjs` ничего не выдумывает.

## EN v3: 45 глосс без переводов (в рантайме показываем английское значение)

Нужно перевести на ru, uk, es, pt-BR, vi, id, tr, pl.

| ключ | слово | английское значение | первый урок |
|---|---|---|---|
| use | use | to employ something | 3 |
| leads | leads | goes to | 6 |
| belongs | belongs | is owned by | 6 |
| saturdays | saturdays | the days named Saturday | 8 |
| spoons | spoons | tools for eating soup or stirring | 9 |
| blankets | blankets | warm bed covers | 9 |
| forks | forks | eating tools with prongs | 9 |
| reached | reached | arrived at | 11 |
| shorter | shorter | less long | 14 |
| instructions | instructions | directions for what to do | 14 |
| gloves | gloves | hand coverings | 15 |
| boots | boots | footwear that covers the foot and ankle | 15 |
| older | older | having existed for more time | 15 |
| boiling | boiling | bubbling from being very hot | 17 |
| ignoring | ignoring | deliberately not paying attention to | 17 |
| responding | responding | reacting or answering | 17 |
| louder | louder | with more volume | 18 |
| happened | happened | took place | 21 |
| talking | talking | speaking together | 22 |
| suggested | suggested | proposed an idea | 22 |
| talked | talked | spoke | 22 |
| apologised | apologised | said sorry | 22 |
| insisted | insisted | said firmly that something must happen | 22 |
| considered | considered | thought about as a possibility | 22 |
| shown | shown | displayed or presented | 23 |
| bins | bins | containers for rubbish | 23 |
| allowed | allowed | permitted | 23 |
| served | served | provided to customers | 23 |
| processed | processed | handled through a system | 23 |
| replaced | replaced | taken out and another put in its place | 23 |
| resurfaced | resurfaced | given a new road surface | 23 |
| boiled | boiled | reached boiling point | 24 |
| sticks | sticks | becomes hard to move | 26 |
| jams | jams | becomes blocked and stops working | 26 |
| reminded | reminded | helped someone remember | 28 |
| promised | promised | committed to doing something | 28 |
| tested | tested | checked how well someone knew something | 28 |
| escaped | escaped | got free or got away | 30 |
| eyes | eyes | organs used for seeing | 31 |
| expected | expected | believed would happen | 31 |
| confirmed | confirmed | verified or stated to be certain | 32 |
| faces | faces | looks towards | 32 |
| appeared | appeared | showed up | 32 |
| use.past-habit | used to | a past habit or state, usually no longer true | 29 |
| use.become-accustomed | be/get used to | be or become accustomed to | 29 |

## EN v3: подозрительная глосса

- `ready` — pl «Przygotuj się» («приготовься», команда) вместо «gotowy» / «przygotowany».

## ES: 15 лемм, где pt-BR / tr / pl дают инфинитив глагола вместо значения слова (эвристика: не-глагол + окончание инфинитива)

| лемма | часть речи | урок | подозрительные переводы | ru |
|---|---|---|---|---|
| abierto | adjective | es:13 | {"pt-BR": "abrir", "tr": "açmak"} | открытый |
| limpio | adjective | es:13 | {"pt-BR": "limpar", "tr": "temizlemek"} | чистый |
| ascensor | noun | es:05 | {"pt-BR": "elevador"} | лифт |
| azúcar | noun | es:07 | {"pt-BR": "açúcar"} | сахар |
| cargador | noun | es:08 | {"pt-BR": "carregador"} | зарядное устройство |
| cliente | noun | es:26 | {"pt-BR": "cliente, comprador"} | клиент, покупатель |
| favor | noun | es:15 | {"pt-BR": "serviço; por favor — por favor"} | услуга; por favor — пожалуйста |
| gracias | noun | es:26 | {"pt-BR": "obrigado; dar las gracias — agradecer"} | спасибо; dar las gracias — благодарить |
| volumen | noun | es:25 | {"pl": "głośność"} | громкость |
| móvil | noun | es:01 | {"pt-BR": "Celular"} | мобильный телефон |
| cena | noun | es:16 | {"pt-BR": "jantar"} | ужин |
| mensaje | noun | es:10 | {"pl": "wiadomość"} | сообщение |
| noche | noun | es:28 | {"pt-BR": "noite; entardecer"} | ночь; вечер |
| pan | noun | es:16 | {"tr": "ekmek"} | хлеб |
| salida | noun | es:03 | {"pt-BR": "Sair"} | выход |

Эвристика грубая: часть записей может быть верной (например, существительное на «-ar»). Проверять глазами.
