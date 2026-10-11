# Шпиль: локальный release packet всех языковых контуров — 2026-10-03

## Итог

Локальный пакет **PASS** для `en/es/fr/de/it`. Production не изменялся: deploy,
Firestore write, Hosting, Rules, Remote Config, Storage publication, OTA, EAS и
store submission не выполнялись.

- Durable payload: `.codex-tmp/spire-local-release-packet-2026-10-03` (122 файлов,
  188942337 bytes; intentionally ignored because the 120 pack payloads are ~189 MB)
- Tracked canonical receipt: `docs/phraseman-2.0/evidence/spire-local-release-packet-2026-10-03/release-manifest.json`
- Tracked staged config: `docs/phraseman-2.0/evidence/spire-local-release-packet-2026-10-03/config.spire_v1.staged.json`
- Manifest SHA-256: `fa853815f475eea294e525928976632bb5e8df234f0ebe55484fd3a256344056`
- Недели: `2026-W40`, `2026-W41`
- Шпили: `0..11` (12 на язык)
- Файлы пакетов: `120` (`5 языков × 2 недели × 12 шпилей`)
- Каждый пакет: `4050` игровых слотов
- Проверка файлов: `120/120` SHA-256 и byte length совпали, ошибок `0`
- `unavailableLangs`: `{}`
- Staged config: `config.spire_v1.staged.json`, `enabled=true`; в облако не применён
- Production `config/spire_v1`: отсутствовал при read-only preflight (HTTP 404)

## Канонические источники

| Контур | Реальные задания | Listen/dictate | Source manifest | Release state |
|---|---:|---:|---|---|
| EN | 4000 | 611 | `8ec778fef78045b148e077be7efdf2dcdc081a275005e4bcf713a1a3754a00e5` | legacy Arena publication, Merkle-proof verified |
| ES | 4000 | 0 | `ae3c10751a8d98915020f2587f7762297c2bfa508c61235317b2fe43d7f7023b` | PASS / releaseEligible |
| FR | 4000 | 0 | `60380ee7b6929e96d6b279b16ff2ac05c1c4ab960ce1786e5de6cdc1344023c5` | PASS / releaseEligible |
| DE | 4000 | 0 | `86efada205818f2787578f59f0d6e7790580acc46bedc09429effa6d126d677f` | PASS / releaseEligible |
| IT | 4000 | 0 | `178aac0d5992742f96ac43584a8cd2fd706569e31ef300b0889797b0ea80125b` | PASS / releaseEligible |

Перед сборкой сделан read-only snapshot `config/spire_task_flags_{lang}` для всех
пяти языков. Во всех пяти документах активных quarantine ID было `0`. Builder
передаёт exact snapshot в `excludedTaskIds`; невалидный flags-документ или ошибка
чтения делает язык unavailable и завершает сборку с ненулевым exit code.

## Независимые receipts

- ES linguistic receipt: `9d27ac003e580bbdbf96e17db08b3793f82385e2dd1ed0dacdb2ddba6b94c810`
- FR linguistic receipt: `49f2f412cc0a6b6a297e1874dfffdb24e32f869a96225b7875d2ef17d653eeaa`
- DE linguistic receipt: `05366c7c147a1fb4c7de603102ade34bec973f635eb021471f8286a93b1db63d`
- IT linguistic receipt: `8629ce9f73e450c3ea857dd181a71d3e87d46affa46c88450d36e1b42d8c3a52`
- Publication decisions: ES `D155`, FR `D156`, DE `D157`, IT `D154`

`cefrEvidenceStatus=not_claimed` не является блоком: контуры не делают CEFR-
заявление. Лингвистическая пригодность и публикационная авторизация проверяются
отдельно и fail-closed.

## Воспроизводимая локальная сборка

Offline-проверка уже собранных байтов не читает сеть и сверяет self-hash
tracked manifest, все 120 SHA-256/byte lengths, матрицу 5×2×12, staged config,
локальные ES/FR/DE/IT release manifests и exact EN publication provenance:

```powershell
node scripts/verify_spire_local_release_packet.mjs `
  --packet-root .codex-tmp/spire-local-release-packet-2026-10-03
```

Expected: `ok=true`, `manifestSha256=fa853815...4056`, `verified=120`,
`bad=[]`. Guard: `node --test tests/spire_local_release_packet_evidence.test.mjs`.

Полная fresh-сборка ниже заново читает production **только read-only**. EN source
не хранится в Git: его provenance привязан к `poolVersion`, publication
fingerprint, source manifest SHA и Merkle root внутри tracked receipt. Поэтому
production drift может законно дать другой packet hash; прежний packet считается
воспроизведённым только при exact совпадении `manifestSha256` с tracked receipt.

```powershell
npm --prefix functions run build
$env:PHRASEMAN_FIRESTORE_READ_TOKEN = gcloud auth print-access-token
node scripts/build_spire_local_release_packet.mjs `
  --output .codex-tmp/spire-local-release-packet-2026-10-03 `
  --as-of 2026-10-03
Remove-Item Env:PHRASEMAN_FIRESTORE_READ_TOKEN
```

Скрипт делает только Firestore `GET` и `documents:runQuery` для английского
контентного пула и flags snapshots. Он не содержит callable, cloud write или
deploy-пути. Краткоживущий OAuth token не сохраняется.

## Гейты

- multilingual generator: `5/5 PASS`
- exact reproducibility: `PASS`
- connected report/quarantine/server: `80/80 PASS`
- Functions TypeScript build + copied assets + runtime parity: `PASS`
- Spire source contract: `14/14 PASS`
- pure pack/game state: `8/8 PASS`
- admin control: `12/12 PASS`
- local packet builder contract: `2/2 PASS`
- tracked receipt + durable payload checksum verification: `2/2 PASS`, 120/120
- independent ES/FR/DE/IT linguistic review: `PASS`
- no cross-language fallback: source/readiness/runtime guards `PASS`

## Staged enablement и rollback (не выполнены)

Следующая отдельная release-команда должна сначала повторить все гейты на exact
commit, затем опубликовать 120 hash-bound Storage объектов, создать валидный
`config/spire_v1` из staged JSON и только последним шагом включить `enabled=true`.
До этого клиент честно получает `pack_missing`/disabled, а не задания другого
языка.

Rollback после будущей публикации: первым действием поставить
`config/spire_v1.enabled=false`; пакеты immutable и не удаляются в аварийном
шаге. Возврат конкретного задания делается только через снятие quarantine флага
после исправления и сборку следующей недели/осознанный force rebuild по контракту.
