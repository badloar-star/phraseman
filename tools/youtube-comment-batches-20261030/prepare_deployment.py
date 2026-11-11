"""Capture the current authorized deployment and prepare the dated bounded-batch patch.

Read-only remote operations. Run in Google Cloud Shell with the intended project
and account already selected. Deployment is performed by separate scripts.
"""
import json
from pathlib import Path
import subprocess
import urllib.parse
import urllib.request

HERE = Path(__file__).resolve().parent
ROOT = Path('/tmp/youtube-batches-20261030')
PROJECT = 'phraseman-ea0b3'
ROOT.mkdir(exist_ok=True)
assert not (ROOT / 'function-before.json').exists(), 'An existing deployment checkpoint must not be overwritten'
token = subprocess.check_output(['gcloud', 'auth', 'print-access-token'], text=True).strip()

def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'Authorization': 'Bearer ' + token}), timeout=45) as response:
        return response.read()

function = json.loads(get('https://cloudfunctions.googleapis.com/v2/projects/' + PROJECT + '/locations/us-central1/functions/adminYoutubeComments'))
source = function['buildConfig']['source']['storageSource']
archive = get('https://storage.googleapis.com/storage/v1/b/' + source['bucket'] + '/o/' + urllib.parse.quote(source['object'], safe='') + '?alt=media&generation=' + source['generation'])
release = json.loads(get('https://firebasehosting.googleapis.com/v1beta1/sites/' + PROJECT + '/releases?pageSize=1'))['releases'][0]
(ROOT / 'function-before.json').write_text(json.dumps(function))
(ROOT / 'source-before.zip').write_bytes(archive)
(ROOT / 'hosting-before.json').write_text(json.dumps(release))
changes = {'lib/functions/src/' + name: (HERE / 'changed' / name).read_text() for name in ['youtube_comments.js', 'youtube_reply_instructions.js']}
(ROOT / 'backend-changes.json').write_text(json.dumps(changes, ensure_ascii=False))
(ROOT / 'hosting-changes.json').write_text(json.dumps({
    '/scripts/pages/youtube-comments.js': (HERE / 'changed/youtube-comments.js').read_text(),
    '/scripts/pages/youtube-comments.css': (HERE / 'base/youtube-comments.css').read_text(),
}, ensure_ascii=False))
print('CHECKPOINT_READY', ROOT, function['updateTime'], release['version']['name'])
