# Ядро · scripts/ota_from_head.sh — подготовка обновления по воздуху из HEAD одной командой (25.10)

Governance-ID: TG-DA2455BB08DA

## Outcome
Решение владельца: одно обновление по воздуху на 2.0.2 из HEAD, когда недельный лимит дойдёт до 95 %. Публикует координатор.
Скрипт делает всё ДО публикации по проверенной схеме OTA-2 и пишет журнал. В момент 95 % это одна команда, потом
`eas update --skip-bundler --input-dir …` координатора.

## Scope
scripts/ota_from_head.sh:
1. снимок HEAD (git archive, core.autocrlf=false);
2. npm ci;
3. release:precheck в снимке (временный .git без ветки) — пропускает только красный PARITY-GATE (решение владельца);
4. eas env:pull production → .env в снимке (значения не печатаются);
5. экспорт iOS и Android ОТДЕЛЬНО (TMP/TEMP=C:\Temp\claude\ota_tmp, --max-workers 1, 8 ГБ, STORE_RELEASE=1, AI_DIALOG, EXPLAIN);
6. проверка dev-строк по каждой платформе (с картой);
7. склейка dist-ota (metadata.json как merge_meta.cjs OTA-2), проверка «ничего не потеряно»;
8. печать команды публикации — НЕ публикует.
Репетиция на текущем HEAD.

## Architecture
Bash, по шагам, с журналом; любой шаг упал — СТОП с причиной. Тяжёлое — под светофором (запуск через slot.sh run).

## Security and privacy
Ключи и токены не печатаются; .env из EAS лежит только в снимке во временной папке. Публикация не выполняется.

## Technical debt
Новой не добавляется. Скрипт повторяет ручную схему OTA-2. Если `eas update` на этой машине починят, склейка станет не нужна.

## Verification
Репетиция на HEAD: все шаги PASS, dist-ota собран, проверка dev-строк чистая.

## Rollback
Скрипт ничего не публикует; снимок во временной папке.
