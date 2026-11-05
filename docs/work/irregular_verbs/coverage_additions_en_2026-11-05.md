# Проход полноты 05.11 (Сайт): добавленные в словари глаголы и их английский перевод

Словари `scripts/data/irregular_verbs_<lang>.mjs` пополнены глаголами, найденными среди непокрытых слов фраз курса. Сборщик (его правит другая сессия: отделяемые приставки, `meaning.en`) требует запись в `MEANING_EN` (`scripts/data/irregular_verbs_meaning_en.mjs`) для каждой леммы. Файл сборщика и английский словарь — не мои, поэтому строки ниже НЕ вставлены, а лежат здесь для переноса владельцем этих файлов.

## de
`ankommen: 'to arrive'`, `mitkommen: 'to come along'`, `zurückkommen: 'to come back'`, `abfahren: 'to depart, to leave (transport)'`, `losfahren: 'to set off'`, `verlassen: 'to leave'`, `ausfallen: 'to be cancelled, to fail'`, `unterschreiben: 'to sign'`, `umsteigen: 'to change (trains, buses)'`, `umziehen: 'to move (house)'`, `mitnehmen: 'to take along'`, `mitbringen: 'to bring along'`, `aufschreiben: 'to write down'`, `anfangen: 'to begin'`, `bitten: 'to ask, to request'`, `behalten: 'to keep'`, `sinken: 'to sink, to fall'`, `ausgehen: 'to go out'`, `fliegen: 'to fly'`, `rennen: 'to run'`, `springen: 'to jump'`, `hinfallen: 'to fall down'`, `anhalten: 'to stop'`, `ablaufen: 'to expire'`, `waschen: 'to wash'`, `backen: 'to bake'`, `streichen: 'to paint, to cross out'`, `frieren: 'to freeze, to be cold'`, `schmelzen: 'to melt'`, `vergleichen: 'to compare'`, `vermeiden: 'to avoid'`, `schwimmen: 'to swim'`, `verbieten: 'to forbid'`

## fr
`apprendre: 'to learn'`, `reprendre: 'to take again, to resume'`, `conduire: 'to drive, to lead'`, `revenir: 'to come back'`, `offrir: 'to give, to offer'`, `peindre: 'to paint'`, `asseoir: 'to seat; s’asseoir — to sit down'`

## it
`chiedere: 'to ask, to request'`, `correre: 'to run'`, `sedere: 'to sit'`, `condividere: 'to share'`, `dipingere: 'to paint'`

## es
`recoger: 'to pick up, to collect'`

## Правки существующих форм (de)
`sein` + `sei`, `seien`; `kommen` + `kämen`; `bekommen` + `bekamt`; `anrufen` + `anriefen`, `anruft`, `anzurufen`; `aufstehen` + `aufzustehen`; из `bringen` убран `mitgebracht` (теперь у `mitbringen`).

## Состояние
Изменения словарей лежат в рабочей копии, НЕ закоммичены: пока в `MEANING_EN` нет этих лемм, сборщик другой сессии не собирает черновик (пишет «нет английского перевода для …»).
