"""Replace exactly three Stories assets on the existing admin Hosting release.
No Functions, Firestore, YouTube, hosting configuration, or other assets change.
Requires explicit --apply and an existing Google Application Default Credential.
References: https://firebase.google.com/docs/hosting/api-deploy
"""
from __future__ import annotations
import argparse
import gzip
import hashlib
import json
import re
import time
from pathlib import Path
from typing import Callable, Any

SITE = 'phraseman-ea0b3'
API = 'https://firebasehosting.googleapis.com/v1beta1/'
BUILD = '2026.10.30.5'
PAYLOADS = {
    '/scripts/pages/story_announcements_v2.js': 'c3e9753f4e77f6482049fcfbd35d4b5a3066d657',
    '/scripts/pages/story_announcements_v2.css': '08cd75ca1602950556799fe7fb18042ad41f2fe9',
    '/scripts/pages/story_announcements_v2_preview.html': '9b71e884b59eb3531780e834cc74efcac5849fa0',
}
BASE_BLOBS = {
    '/scripts/pages/story_announcements_v2.js': {
        '0200a3a2acf6f62954cfc73badf12ea9ffd048fa',
        # Same reviewed baseline with CRLF line endings, as served by Hosting.
        '8c43ed2a0fda3691f48f718812ddf59dbdbcca3b',
        'ba66281630f28f2b66ff5504f6ef2de5146bc6d4',
        '5851bb68b9f19321eb0bb3f01269fde08042eb9f',
        '03bc8596d95a27e7c7f7dba05322573fcff2f0f3',
        'ab87461f8c3320a8302a356bddc0fd656d02c11f',
        '4f1b03709d7139416a3e221463cba372405aca5b',
    },
    '/scripts/pages/story_announcements_v2.css': {
        '80d07bb45d0a9e5c01c2746a51234a028f4154fe',
        # Same reviewed baseline with CRLF line endings, as served by Hosting.
        '9d37379e9d61d8868cdccd1cfb3c455b9c15ce09',
        'c466b0ddee7db666f42837279a6af8aa37ce93d1',
        'c2ecfb3b42a0c753204bfcdf34d57e69b68e5a5d',
    },
    '/scripts/pages/story_announcements_v2_preview.html': {
        'b71bedd26198a1853a35cadc1c5d6fbc573c63cf',
        # Exact CRLF bytes served by the reviewed prior Hosting release.
        '5ee2434ddee06eb6a1a33055dfbf789ec2e834e0',
        'd171018f436041bf7f08fe09eec3d3ba2995a3b8',
    },
}
REQUIRED = {'/legacy.html', '/scripts/pages/youtube-comments.js',
            '/scripts/pages/story_announcements_v2_preview.html', *PAYLOADS}


def blob_sha(data: bytes) -> str:
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()


def checked_version(name: str) -> str:
    if not isinstance(name, str) or not re.fullmatch(r'sites/' + SITE + r'/versions/[A-Za-z0-9_-]+', name):
        raise RuntimeError('Unexpected Hosting version or site; refusing deployment.')
    return name


def live_release(api: Callable[..., dict]) -> dict:
    release = api('GET', f'sites/{SITE}/channels/live').get('release')
    if not isinstance(release, dict) or not release.get('name'):
        raise RuntimeError('Current live release is missing; refusing deployment.')
    checked_version(release.get('version', {}).get('name'))
    return release


def manifest(api: Callable[..., dict], version: str) -> dict[str, str]:
    checked_version(version)
    result, token, seen = {}, None, set()
    for _ in range(100):
        params: dict[str, Any] = {'pageSize': 1000, 'status': 'ACTIVE'}
        if token:
            params['pageToken'] = token
        page = api('GET', version + '/files', params=params)
        for item in page.get('files', []):
            path, digest = item.get('path'), item.get('hash')
            if not isinstance(path, str) or not path.startswith('/') or path in result or not re.fullmatch(r'[0-9a-f]{64}', digest or ''):
                raise RuntimeError('Invalid or duplicate Hosting file; refusing deployment.')
            result[path] = digest
        token = page.get('nextPageToken')
        if not token:
            return result
        if token in seen:
            raise RuntimeError('Repeated Hosting pagination token.')
        seen.add(token)
    raise RuntimeError('Hosting manifest exceeds bounded page limit.')


def deploy(root: Path, api: Callable[..., dict], public_get: Callable[[str], bytes], report: Path) -> dict:
    raw = {path: (root / 'admin/v2' / path.lstrip('/')).read_bytes() for path in PAYLOADS}
    for path, data in raw.items():
        if blob_sha(data) != PAYLOADS[path]:
            raise RuntimeError('Payload differs from the locally tested build: ' + path)
    original = live_release(api)
    base = checked_version(original['version']['name'])
    old = api('GET', base)
    files = manifest(api, base)
    if not REQUIRED.issubset(files) or len(files) != int(old.get('fileCount', -1)):
        raise RuntimeError('Live manifest is incomplete; no release will be created.')
    if not isinstance(old.get('config'), dict):
        raise RuntimeError('Live Hosting configuration missing; refusing deployment.')
    for path in PAYLOADS:
        if blob_sha(public_get(path)) not in BASE_BLOBS[path] | {PAYLOADS[path]}:
            raise RuntimeError('Live Stories asset has unreviewed changes: ' + path)
    packed = {path: gzip.compress(data, mtime=0) for path, data in raw.items()}
    hashes = {path: hashlib.sha256(data).hexdigest() for path, data in packed.items()}
    desired = {**files, **hashes}
    if set(desired) != set(files) or any(desired[p] != files[p] for p in files if p not in PAYLOADS):
        raise RuntimeError('Deployment would change assets outside Stories.')
    if live_release(api)['name'] != original['name']:
        raise RuntimeError('Live release changed during preparation; restart from the new release.')
    version = checked_version(api('POST', f'sites/{SITE}/versions', json={'config': old['config']})['name'])
    state = {'build': BUILD, 'baseVersion': base, 'version': version, 'status': 'staged',
             'changedPaths': list(PAYLOADS), 'preservedFiles': len(files) - len(PAYLOADS)}
    report.write_text(json.dumps(state, indent=2))
    uploads = {hashes[p]: data for p, data in packed.items()}
    entries = list(desired.items())
    for offset in range(0, len(entries), 1000):
        result = api('POST', version + ':populateFiles', json={'files': dict(entries[offset:offset + 1000])})
        required = result.get('uploadRequiredHashes', [])
        if not isinstance(required, list) or any(digest not in uploads for digest in required):
            raise RuntimeError('Hosting requested an unrelated file upload; live site is unchanged.')
        expected_url = 'https://upload-firebasehosting.googleapis.com/upload/' + version + '/files'
        if required and result.get('uploadUrl', '').rstrip('/') != expected_url:
            raise RuntimeError('Unexpected upload endpoint; credentials will not be sent.')
        for digest in required:
            api('POST', expected_url + '/' + digest, data=uploads[digest], headers={'Content-Type': 'application/octet-stream'})
    finalized = api('PATCH', version, params={'updateMask': 'status'}, json={'status': 'FINALIZED'})
    if finalized.get('status') != 'FINALIZED' or manifest(api, version) != desired:
        raise RuntimeError('Finalized manifest mismatch; live site is unchanged.')
    if live_release(api)['name'] != original['name']:
        raise RuntimeError('Concurrent Hosting release detected; refusing to overwrite it.')
    # The API has no release compare-and-swap. The workflow also serializes
    # its own runs; do not run another admin deploy during this final step.
    state['status'] = 'release-requested'
    report.write_text(json.dumps(state, indent=2))
    release = api('POST', f'sites/{SITE}/releases', params={'versionName': version}, json={'message': 'Stories-only ' + BUILD})
    if release.get('version', {}).get('name') != version:
        raise RuntimeError('Release result uncertain; inspect Hosting before retrying.')
    state.update(status='released', release=release.get('name'))
    report.write_text(json.dumps(state, indent=2))
    for _ in range(10):
        if all(public_get(path) == data for path, data in raw.items()):
            if live_release(api)['version']['name'] != version:
                raise RuntimeError('Another release became active during verification.')
            state['status'] = 'verified-live'
            report.write_text(json.dumps(state, indent=2))
            return state
        time.sleep(2)
    raise RuntimeError('Release created but live byte verification did not finish. See release report.')


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='Release the tested Stories assets to the live admin site.')
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    if not args.apply:
        raise SystemExit('No changes made. Explicit --apply is required.')
    import google.auth
    from google.auth.transport.requests import AuthorizedSession
    import requests
    credentials, _ = google.auth.default(scopes=['https://www.googleapis.com/auth/firebase.hosting'])
    session = AuthorizedSession(credentials)
    public = requests.Session()

    def api(method: str, path: str, **kwargs: Any) -> dict:
        url = path if path.startswith('https://upload-firebasehosting.googleapis.com/upload/sites/' + SITE + '/versions/') else API + path
        response = session.request(method, url, timeout=60, allow_redirects=False, **kwargs)
        if not 200 <= response.status_code < 300:
            raise RuntimeError(f'Hosting {method} failed with HTTP {response.status_code}; inspect the release report. No automatic retry.')
        return response.json() if response.content and 'json' in response.headers.get('Content-Type', '') else {}

    def public_get(path: str) -> bytes:
        if path not in PAYLOADS:
            raise RuntimeError('Public request outside approved Stories assets.')
        response = public.get('https://' + SITE + '.web.app' + path,
                              params={'stories-verify': str(time.time_ns())},
                              headers={'Cache-Control': 'no-cache'}, timeout=30, allow_redirects=False)
        if response.status_code != 200 or len(response.content) > 2_000_000:
            raise RuntimeError('Public Stories asset could not be verified: ' + path)
        return response.content

    result = deploy(args.root.resolve(), api, public_get, Path('stories-release-result.json'))
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
