# Скан соблазнов: «тоже верная» фраза — ES ser/estar, DE артикли/падежи, IT артикли+предлоги, FR партитив (04.11)

Скрипт: сопоставление соблазна с правильным словом по спискам форм на финальных данных (HEAD после второго прохода). Это эвристика: находки — кандидаты для проверки сильной моделью, не доказанные ошибки.

| проверка | находок | вывод |
|---|---|---|
| ES ser↔estar (тот же лицо/время) | 29 | Пара ser/estar — основное учебное противопоставление; верна только при локативе/состоянии. Список ниже на проверку. |
| DE артикль↔артикль | 0 | Артикли друг другу не соблазны (правило article) — должно быть 0. |
| DE одно слово в другом падеже/роде (mein/meinen, dies/dieser…) | 294 | В основном Ticket→Tickets (число существительного): в данной фразе неверно, не блокер. |
| IT предлог↔предлог+артикль (di/del, a/al, in/nel…) | 0 | Закрыто группами синонимов (di↔del…); осталось 0. |
| IT слитный предлог↔слитный предлог | 677 | alla→al/ai: другой род/число — фраза неверна, не блокер. |
| IT артикль↔слитный предлог | 70 | La→Nel: чужая часть речи, фраза неверна. |
| FR партитив/артикль↔партитив/артикль | 0 | Закрыто правилом article (du, des, de входят в список артиклей): 0. |
| FR артикль↔партитив | 0 | 0. |

Кванторы как соблазн (some/any/much, algunos, plusieurs, viele, alcuni…): EN 890, ES 49, FR 160, DE 12, IT 25. В основном это мусорные слова на месте артикля/глагола (неверны); FR считает «des» после предлога «à» — тоже неверно. Реально опасны только плюральные кванторы при плюральном артикле (IT: alcuni/molte при pane/genitori — перепроверить).

## ES ser↔estar: кандидаты (29)

- es:02:04 «No estamos en clase.» #1 estamos→somos
- es:02:05 «No estamos en casa.» #1 estamos→somos
- es:02:12 «No estamos lejos.» #1 estamos→somos
- es:02:20 «No estamos en la oficina.» #1 estamos→somos
- es:02:30 «No estamos en el coche.» #1 estamos→somos
- es:03:11 «¿Está Ana en casa?» #0 Está→Es
- es:03:12 «¿Está Luis en casa?» #0 Está→Es
- es:03:13 «¿Está Ana en clase?» #0 Está→Es
- es:03:14 «¿Está Luis en la oficina?» #0 Está→Es
- es:03:15 «¿Está Ana aquí?» #0 Está→Es
- es:03:16 «¿Está Luis dentro?» #0 Está→Es
- es:03:17 «¿Está Ana fuera?» #0 Está→Es
- es:03:23 «¿Está en casa?» #0 Está→Es
- es:03:31 «¿Está el móvil en casa?» #0 Está→Es
- es:03:32 «¿Está la llave en casa?» #0 Está→Es
- es:03:34 «¿Está el libro en la mesa?» #0 Está→Es
- es:03:37 «¿Está el móvil en el bolso?» #0 Está→Es
- es:03:41 «¿Está el pasaporte en la mochila?» #0 Está→Es
- es:03:42 «¿Está el pasaporte en el bolso?» #0 Está→Es
- es:03:43 «¿Está el billete en el bolsillo?» #0 Está→Es
- es:03:48 «¿Está Luis en la salida?» #0 Está→Es
- es:05:04 «¿Dónde estamos?» #1 estamos→somos
- es:08:45 «¿Está tu hermana en casa?» #0 Está→Es
- es:13:17 «¿Está Ana lista?» #0 Está→Es
- es:13:18 «¿Está Luis listo?» #0 Está→Es
- es:13:35 «¿Está libre el baño?» #0 Está→Es
- es:13:36 «¿Está libre la mesa?» #0 Está→Es
- es:13:37 «¿Está libre el médico?» #0 Está→Es
- es:13:39 «¿Está libre la médica?» #0 Está→Es
