"""Narrow source-only update of the already deployed adminYoutubeComments function.

Run in an authenticated Google Cloud Shell after fetching the function and its exact
source archive into /tmp/admin-repair-20261030. No tokens are written or printed.
Only buildConfig.source is patched; runtime, secrets, IAM and limits are preserved.
"""
import hashlib
import io
import json
from pathlib import Path
import subprocess
import urllib.request
import zipfile

ROOT = Path('/tmp/admin-repair-20261030')
BASE = 'https://cloudfunctions.googleapis.com/v2/'
EXPECTED = {'lib/functions/src/youtube_comments.js': '38d97bbe799efac3b25d9381dfc23ff0eda36c39ac9ae2640606e48f6105a3b8'}

token = subprocess.check_output(['gcloud', 'auth', 'print-access-token'], text=True).strip()

def api(path, method='GET', body=None):
    req = urllib.request.Request(BASE + path, method=method,
        data=None if body is None else json.dumps(body).encode(),
        headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=45) as response:
        return json.load(response)

before = json.loads((ROOT / 'function-before.json').read_text())
current = api(before['name'])
assert current['state'] == 'ACTIVE', 'Function is not ready for a source update'
assert current['updateTime'] == before['updateTime'], 'Concurrent function update; rebase first'
assert current['buildConfig']['source'] == before['buildConfig']['source']
changed = json.loads((ROOT / 'backend-changes.json').read_text())
assert set(changed) == set(EXPECTED), 'Only the reviewed YouTube backend module may change'
buffer = io.BytesIO()
with zipfile.ZipFile(ROOT / 'source-before.zip') as original, zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as output:
    assert set(EXPECTED).issubset(original.namelist())
    for item in original.infolist():
        data = original.read(item.filename)
        if item.filename in EXPECTED:
            assert hashlib.sha256(data.replace(b'\r\n', b'\n')).hexdigest() == EXPECTED[item.filename], item.filename
            data = changed[item.filename].encode()
            subprocess.run(['node', '--check', '-'], input=data, check=True, capture_output=True)
        output.writestr(item, data)
archive = buffer.getvalue()
(ROOT / 'source-after.zip').write_bytes(archive)
upload = api('projects/phraseman-ea0b3/locations/us-central1/functions:generateUploadUrl', 'POST', {'environment': 'GEN_2'})
with urllib.request.urlopen(urllib.request.Request(upload['uploadUrl'], data=archive, method='PUT', headers={'Content-Type': 'application/zip'}), timeout=60) as response:
    assert response.status in (200, 201)
# Check the deployment lease again after preparation and before changing production.
assert api(before['name'])['updateTime'] == before['updateTime'], 'Concurrent function update; rebase first'
operation = api(before['name'] + '?updateMask=buildConfig.source', 'PATCH', {
    'name': before['name'], 'buildConfig': {'source': {'storageSource': upload['storageSource']}}
})
(ROOT / 'backend-operation.json').write_text(json.dumps(operation))
print('BACKEND_OPERATION', operation['name'], 'done=' + str(operation.get('done', False)))
print('CHANGED_MODULES', json.dumps({name: hashlib.sha256(text.encode()).hexdigest() for name, text in changed.items()}))
