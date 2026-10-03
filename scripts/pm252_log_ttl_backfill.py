"""PM-252: разовая проставка срока хранения (expireAt = момент создания + 90 дн.) старым записям
журналов app_errors / app_activity, созданным до выкладки log_ttl.ts (f8c948552, 2026-10-01).

зачем: TTL-политика Firestore удаляет документ только по полю expireAt. Записи до выкладки его
не имеют и живут вечно (03.10: 6377 + 4600 документов, самые старые — конец мая). Код новых записей
уже правильный — нужен только разовый догон старых. Момент создания: `createdAtMs` (число) или,
у самых старых, `createdAt` (ISO-строка).

По умолчанию — DRY-RUN: только считает (читаются лишь служебные поля — маска).
Запись — только с --apply --approved-by="<кто разрешил>" (решение координатора/владельца).
Логи: [PM252-TTL] на каждой странице и итог; записи без момента создания считаются отдельно (unknown).

Запуск:  python scripts/pm252_log_ttl_backfill.py
         python scripts/pm252_log_ttl_backfill.py --apply --approved-by="coordinator §NNN"
"""
import argparse
import datetime
import json
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request

PROJECT = 'phraseman-ea0b3'
ROOT = f'https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/(default)/documents'
COLLECTIONS = ('app_errors', 'app_activity')
TTL_MS = 90 * 24 * 60 * 60 * 1000  # = functions/src/log_ttl.ts LOG_TTL_MS
PAGE = 300
BATCH = 400


def token() -> str:
    tok = subprocess.run(['gcloud', 'auth', 'print-access-token'], capture_output=True, text=True, shell=True).stdout.strip()
    if not tok:
        sys.exit('[PM252-TTL] нет токена gcloud — остановка')
    return tok


def request(url: str, tok: str, body: dict | None = None) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method='POST' if body is not None else 'GET',
                                 headers={'Authorization': f'Bearer {tok}', 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as error:
        sys.exit(f'[PM252-TTL] HTTP {error.code}: {error.read()[:300]!r} — остановка')


def created_ms(fields: dict) -> int | None:
    raw = fields.get('createdAtMs', {})
    value = raw.get('integerValue') or raw.get('doubleValue')
    if value is not None:
        ms = int(float(value))
        return ms if ms > 0 else None
    iso_value = fields.get('createdAt', {}).get('stringValue') or fields.get('createdAt', {}).get('timestampValue')
    if iso_value:
        try:
            parsed = datetime.datetime.fromisoformat(iso_value.replace('Z', '+00:00'))
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=datetime.timezone.utc)
            return int(parsed.timestamp() * 1000)
        except ValueError:
            return None
    return None


def iso(ms: int) -> str:
    return datetime.datetime.fromtimestamp(ms / 1000, datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--approved-by', default='')
    args = parser.parse_args()
    if args.apply and not args.approved_by.strip():
        sys.exit('[PM252-TTL] --apply требует --approved-by="<кто разрешил>" — остановка')
    mode = 'APPLY' if args.apply else 'DRY-RUN'
    tok = token()
    now_ms = int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)
    print(f'[PM252-TTL] start mode={mode} approvedBy={args.approved_by or "-"}')
    mask = '&'.join(f'mask.fieldPaths={name}' for name in ('createdAtMs', 'createdAt', 'expireAt'))
    for collection in COLLECTIONS:
        total = has_ttl = missing = unknown = expired_now = written = 0
        page_token = ''
        writes: list = []
        while True:
            url = f'{ROOT}/{collection}?pageSize={PAGE}&{mask}' + (f'&pageToken={urllib.parse.quote(page_token)}' if page_token else '')
            data = request(url, tok)
            for doc in data.get('documents', []):
                total += 1
                fields = doc.get('fields', {})
                if 'expireAt' in fields:
                    has_ttl += 1
                    continue
                created = created_ms(fields)
                if created is None:
                    unknown += 1
                    continue
                missing += 1
                expire_ms = created + TTL_MS
                if expire_ms <= now_ms:
                    expired_now += 1
                if args.apply:
                    writes.append({
                        'update': {'name': doc['name'], 'fields': {'expireAt': {'timestampValue': iso(expire_ms)}}},
                        'updateMask': {'fieldPaths': ['expireAt']},
                        'currentDocument': {'exists': True},
                    })
                    if len(writes) >= BATCH:
                        request(f'{ROOT}:commit', tok, {'writes': writes})
                        written += len(writes)
                        writes = []
            print(f'[PM252-TTL] page collection={collection} scanned={total} missingTtl={missing} written={written}')
            page_token = data.get('nextPageToken', '')
            if not page_token:
                break
        if args.apply and writes:
            request(f'{ROOT}:commit', tok, {'writes': writes})
            written += len(writes)
        print(f'[PM252-TTL] result collection={collection} total={total} hasTtl={has_ttl} missingTtl={missing} '
              f'unknownCreated={unknown} wouldExpireWithin24h={expired_now} written={written}')
    print(f'[PM252-TTL] done mode={mode}')


if __name__ == '__main__':
    main()
