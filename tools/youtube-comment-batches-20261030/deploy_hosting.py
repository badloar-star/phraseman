"""Stage or publish only the two reviewed YouTube assets on the existing admin site.

Every other path/hash and the complete live Hosting config are copied unchanged.
Production publication fails closed if either the function or live release changed.
"""
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import urllib.parse
import urllib.request

ROOT = Path('/tmp/youtube-batches-20261030')
HOST = 'https://firebasehosting.googleapis.com/v1beta1/'
FUNCTIONS = 'https://cloudfunctions.googleapis.com/v2/'
SITE = 'sites/phraseman-ea0b3'
token = subprocess.check_output(['gcloud', 'auth', 'print-access-token'], text=True).strip()

def api(path, method='GET', body=None, host=HOST):
    request = urllib.request.Request(host + path, method=method,
        data=None if body is None else json.dumps(body).encode(),
        headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(request, timeout=45) as response:
        return json.load(response)

def files(version):
    page = api(version + '/files?pageSize=1000')
    assert not page.get('nextPageToken'), 'Unexpected file pagination; stop before publishing'
    return {item['path']: item['hash'] for item in page['files']}

before = json.loads((ROOT / 'hosting-before.json').read_text())
assert api(SITE + '/releases?pageSize=1')['releases'][0]['name'] == before['name'], 'Concurrent Hosting release; rebase first'
changes = json.loads((ROOT / 'hosting-changes.json').read_text())
assert set(changes) == {'/scripts/pages/youtube-comments.js', '/scripts/pages/youtube-comments.css'}
content = {path: gzip.compress(text.encode(), mtime=0) for path, text in changes.items()}
hashes = {path: hashlib.sha256(data).hexdigest() for path, data in content.items()}
original = files(before['version']['name'])
expected = {**original, **hashes}

if sys.argv[1] == 'stage':
    version = api(SITE + '/versions', 'POST', {'config': before['version']['config'], 'labels': {'deployment-tool': 'reviewed-youtube-batches'}})
    populated = api(version['name'] + ':populateFiles', 'POST', {'files': expected})
    by_hash = {hashes[path]: data for path, data in content.items()}
    for digest in populated.get('uploadRequiredHashes', []):
        assert digest in by_hash, 'Unrelated existing asset unexpectedly requires upload'
        request = urllib.request.Request(populated['uploadUrl'] + '/' + digest,
            data=by_hash[digest], method='POST', headers={
                'Authorization': 'Bearer ' + token, 'Content-Type': 'application/octet-stream'})
        with urllib.request.urlopen(request, timeout=60) as response:
            assert response.status in (200, 201)
    final = api(version['name'] + '?updateMask=status', 'PATCH', {'status': 'FINALIZED'})
    assert final['config'] == before['version']['config'], 'Hosting configuration changed'
    assert files(final['name']) == expected, 'Staged assets differ from reviewed manifest'
    (ROOT / 'hosting-staged.json').write_text(json.dumps(final))
    print('HOSTING_STAGED', final['name'], 'files=' + str(len(expected)), 'changed=' + str(len(changes)))
elif sys.argv[1] == 'publish':
    operation = json.loads((ROOT / 'backend-operation.json').read_text())
    result = api(operation['name'], host=FUNCTIONS)
    assert result.get('done') and not result.get('error'), 'Backend deployment has not completed successfully'
    function_before = json.loads((ROOT / 'function-before.json').read_text())
    function_after = api(function_before['name'], host=FUNCTIONS)
    assert function_after['state'] == 'ACTIVE'
    service_fields = ['availableMemory', 'availableCpu', 'timeoutSeconds', 'minInstanceCount', 'maxInstanceCount', 'maxInstanceRequestConcurrency', 'serviceAccountEmail', 'ingressSettings', 'environmentVariables', 'secretEnvironmentVariables', 'vpcConnector']
    assert all(function_before['serviceConfig'].get(k) == function_after['serviceConfig'].get(k) for k in service_fields), 'Unexpected function setting change'
    assert all(function_before['buildConfig'].get(k) == function_after['buildConfig'].get(k) for k in ['runtime', 'entryPoint', 'environmentVariables', 'serviceAccount', 'workerPool'])
    (ROOT / 'function-after.json').write_text(json.dumps(function_after))
    staged = json.loads((ROOT / 'hosting-staged.json').read_text())
    assert files(staged['name']) == expected
    assert api(staged['name'])['config'] == before['version']['config']
    assert api(SITE + '/releases?pageSize=1')['releases'][0]['name'] == before['name'], 'Concurrent Hosting release; rebase first'
    release = api(SITE + '/releases?versionName=' + urllib.parse.quote(staged['name'], safe=''), 'POST', {'message': 'YouTube: bounded 10/20/30/40/50/100 batches and short creator replies'})
    (ROOT / 'hosting-after.json').write_text(json.dumps(release))
    print('HOSTING_PUBLISHED', release['name'], release['version']['name'])
    print('FUNCTION_VERIFIED', function_after['name'], function_after['updateTime'])
else:
    raise SystemExit('Use stage or publish')
