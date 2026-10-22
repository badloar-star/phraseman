# Новый выбор диалогов — фильтры и пометки на 9 языках (Переводчик → 2 · ДИЗАЙН, заготовка до макетов)

Governance-ID: TG-6638F7D7397B
Status: Ready — заготовка; отдать 2 · ДИЗАЙН, когда будут макеты, и сверить с ними дословно
Owner: «10 · ПЕРЕВОДЧИК» (поручение координатора 22.10)

## Outcome

Русские слова — из поручения координатора; на макете они станут эталоном (закон «текст = макет»), и тогда таблица
сверяется с ним заново. Род и число согласованы со словом «диалоги» (es/pt — мужской, pl — неличный: «Wszystkie, Nowe»).
Слова, уже утверждённые в приложении, взяты как есть: «Все» (`allWorlds`), «Продолжить» (`continue`) из
`components/dialogs/scene/dialogs_scene_copy.ts`; «Plus» не переводится.

**Ширина.** Чип ~100 pt. Если кегль 13–14 и поля по 12, на текст остаётся ~76 pt ≈ **10 знаков**. Всё, что длиннее
10, помечено ⚠ и дан короткий вариант — какой ставить, решает макет.

| Ключ | ru | uk | en | es | pt-BR | vi | id | tr | pl |
|---|---|---|---|---|---|---|---|---|---|
| all | Все | Усі | All | Todos | Todos | Tất cả | Semua | Tümü | Wszystkie |
| new | Новые | Нові | New | Nuevos | Novos | Mới | Baru | Yeni | Nowe |
| done | Пройденные | Пройдені | Completed | Terminados | Concluídos | Đã xong | Selesai | Bitenler | Ukończone |
| byLevel | По уровню | За рівнем | By level | Por nivel | Por nível | Theo cấp độ ⚠ | Per tingkat ⚠ | Seviyeye göre ⚠ | Wg poziomu |
| byTopic | По теме | За темою | By topic | Por tema | Por tema | Theo chủ đề ⚠ | Per topik | Konuya göre ⚠ | Wg tematu |
| continue | Продолжить | Продовжити | Continue | Continuar | Continuar | Tiếp tục | Lanjutkan | Devam et | Kontynuuj |
| newDialog | Новый диалог ⚠ | Новий діалог ⚠ | New dialogue ⚠ | Diálogo nuevo ⚠ | Novo diálogo ⚠ | Hội thoại mới ⚠ | Dialog baru ⚠ | Yeni diyalog ⚠ | Nowy dialog ⚠ |
| plusOnly | Только Plus ⚠ | Лише Plus | Plus only | Solo Plus | Só Plus | Chỉ Plus | Hanya Plus | Plus’a özel ⚠ | Tylko Plus |
| locked | Закрыт | Закритий | Locked | Bloqueado | Bloqueado | Đã khóa | Terkunci | Kilitli | Zamknięty |
| minutes | {n} мин | {n} хв | {n} min | {n} min | {n} min | {n} phút | {n} mnt | {n} dk | {n} min |

### Короткие варианты для ⚠

- **byLevel / byTopic** — если в чипе: vi «Cấp độ» / «Chủ đề», id «Tingkat» / «Topik», tr «Seviye» / «Konu». Чтобы чипы
  не выглядели разнобоем, можно и во всех языках дать существительное: ru «Уровень» / «Тема», en «Level» / «Topic»,
  es «Nivel» / «Tema» и т. д. — решение за макетом.
- **newDialog** (11–13 знаков на всех языках) — это пометка на карточке, а не чип? Если всё же чип/бейдж ~100 pt —
  короткая форма совпадает с фильтром «Новые»: ru «Новый», uk «Новий», en «New», es «Nuevo», pt-BR «Novo», vi «Mới»,
  id «Baru», tr «Yeni», pl «Nowy» (род — «диалог»).
- **plusOnly** — ru «Только Plus» (11) на грани; запас: ru «Plus», tr «Plus» (значок ◆ рядом уже говорит «только»).

### Замечания

- «Закрыт» — мужской род под «диалог» (uk «Закритий», pl «Zamknięty»). Если пометка стоит на «сцене»/«теме» — род
  поменяется, сверить по макету. В приложении для закрытого диалога уже есть «Откроется на ранге N» — «Закрыт» не
  должен с ним спорить на одной карточке.
- «По уровню»: в «Диалогах» открытие идёт по **рангу** (pt-BR «rank», vi «hạng», tr «rütbe»). Если фильтр про ранг, а
  не про уровень языка — слова надо взять из ранга. Вопрос к макету.
- id «mnt» — принятое сокращение «menit»; tr «dk» — «dakika».

## Scope

In scope: тексты 10 подписей на 9 языках. Out of scope: код, макеты.

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Ширина посчитана по средней ширине знака; окончательно — по макету и снимку 6 · СВЕРКИ.
- Не проверено носителями.

## Verification

Совпадение с утверждёнными строками `dialogs_scene_copy.ts` (`allWorlds`, `continue`) проверено.

## Rollback

Удалить файл.
