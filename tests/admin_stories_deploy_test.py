"""Offline safety tests for the pinned Stories Hosting assets. No network."""
import gzip
import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('stories_deploy', ROOT / 'scripts/deploy_admin_stories_only.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class HostingFixture:
    def __init__(self, mode='ok'):
        self.mode = mode
        self.calls = []
        self.base = f'sites/{m.SITE}/versions/base123'
        self.next = f'sites/{m.SITE}/versions/next123'
        self.old = {p: b'old:' + p.encode() for p in m.REQUIRED}
        self.old['/unrelated-current.js'] = b'preserve a concurrently maintained feature'
        self.files = {p: hashlib.sha256(gzip.compress(v, mtime=0)).hexdigest() for p, v in self.old.items()}
        self.desired = {}
        self.uploads = {}
        self.config = {'headers': [{'glob': '**', 'headers': {'Cache-Control': 'no-store'}}], 'redirects': [{'glob': '/', 'location': '/legacy.html', 'statusCode': 301}]}
        self.active = self.base
        self.live_reads = 0

    def api(self, method, path, **kwargs):
        self.calls.append((method, path, kwargs))
        if method == 'GET' and path.endswith('/channels/live'):
            self.live_reads += 1
            version = self.active
            if (self.mode == 'preparation_race' and self.live_reads == 2) or (self.mode == 'final_race' and self.live_reads == 3):
                version = f'sites/{m.SITE}/versions/concurrent'
            return {'release': {'name': f'sites/{m.SITE}/releases/' + version.split('/')[-1], 'version': {'name': version}}}
        if method == 'GET' and path == self.base:
            return {'name': self.base, 'config': self.config, 'fileCount': len(self.files) + (self.mode == 'bad_count')}
        if method == 'GET' and path.endswith('/files'):
            files = self.files if path == self.base + '/files' else dict(self.desired)
            if self.mode == 'bad_final_manifest' and path.startswith(self.next):
                files.pop('/unrelated-current.js')
            return {'files': [{'path': p, 'hash': h, 'status': 'ACTIVE'} for p, h in files.items()]}
        if method == 'POST' and path.endswith('/versions'):
            assert kwargs['json']['config'] == self.config
            return {'name': self.next}
        if method == 'POST' and path.endswith(':populateFiles'):
            self.desired.update(kwargs['json']['files'])
            hashes = [h for p, h in kwargs['json']['files'].items() if p in m.PAYLOADS]
            if self.mode == 'unrelated_upload':
                hashes.append(self.files['/unrelated-current.js'])
            url = 'https://upload-firebasehosting.googleapis.com/upload/' + self.next + '/files'
            if self.mode == 'wrong_upload_host':
                url = 'https://example.invalid/steal-credentials'
            return {'uploadRequiredHashes': hashes, 'uploadUrl': url}
        if method == 'POST' and path.startswith('https://upload-firebasehosting.googleapis.com/'):
            data = kwargs['data']
            digest = path.rsplit('/', 1)[-1]
            assert hashlib.sha256(data).hexdigest() == digest
            self.uploads[digest] = gzip.decompress(data)
            return {}
        if method == 'PATCH':
            return {'name': self.next, 'status': 'FINALIZED'}
        if method == 'POST' and path.endswith('/releases'):
            self.active = self.next
            return {'name': f'sites/{m.SITE}/releases/next123', 'version': {'name': self.next}}
        raise AssertionError((method, path))

    def public(self, path):
        if self.active == self.base:
            return b'unreviewed change' if self.mode == 'unknown_live' else self.old[path]
        return self.uploads[self.desired[path]]

    @property
    def released(self):
        return any(method == 'POST' and path.endswith('/releases') for method, path, _ in self.calls)


class StoriesDeploySafetyTests(unittest.TestCase):
    def run_fixture(self, mode='ok', error=None, before_writes=False):
        fixture = HostingFixture(mode)
        payloads = {p: b'new tested payload:' + p.encode() for p in m.PAYLOADS}
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for path, data in payloads.items():
                target = root / 'admin/v2' / path.lstrip('/')
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
            hashes = {p: m.blob_sha(v) for p, v in payloads.items()}
            if mode == 'modified_payload':
                next(iter(hashes.keys()))
                hashes[next(iter(hashes))] = '0' * 40
            bases = {p: {m.blob_sha(fixture.old[p])} for p in payloads}
            with patch.object(m, 'PAYLOADS', hashes), patch.object(m, 'BASE_BLOBS', bases):
                if error:
                    with self.assertRaisesRegex(RuntimeError, error):
                        m.deploy(root, fixture.api, fixture.public, root / 'report.json')
                    self.assertFalse(fixture.released)
                    if before_writes:
                        self.assertTrue(all(method == 'GET' for method, _, _ in fixture.calls))
                else:
                    result = m.deploy(root, fixture.api, fixture.public, root / 'report.json')
                    self.assertEqual(result['status'], 'verified-live')
                    self.assertTrue(fixture.released)
                    self.assertEqual(set(fixture.desired), set(fixture.files))
                    self.assertEqual(len(fixture.uploads), len(m.PAYLOADS))
                    for path in fixture.files:
                        if path not in payloads:
                            self.assertEqual(fixture.files[path], fixture.desired[path])
                    self.assertEqual(json.loads((root / 'report.json').read_text())['status'], 'verified-live')

    def test_only_pinned_files_and_existing_config_change(self):
        self.run_fixture()

    def test_unknown_live_version_never_writes(self):
        self.run_fixture('unknown_live', 'unreviewed changes', True)

    def test_incomplete_manifest_never_writes(self):
        self.run_fixture('bad_count', 'manifest is incomplete', True)

    def test_payload_pin_never_writes(self):
        self.run_fixture('modified_payload', 'Payload differs', True)

    def test_preparation_race_never_writes(self):
        self.run_fixture('preparation_race', 'changed during preparation', True)

    def test_final_race_never_releases(self):
        self.run_fixture('final_race', 'Concurrent Hosting release')

    def test_unrelated_upload_never_releases(self):
        self.run_fixture('unrelated_upload', 'unrelated file upload')

    def test_untrusted_upload_host_never_receives_credentials(self):
        self.run_fixture('wrong_upload_host', 'Unexpected upload endpoint')

    def test_incomplete_final_version_never_releases(self):
        self.run_fixture('bad_final_manifest', 'Finalized manifest mismatch')

    def test_wrong_project_name_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError, 'Unexpected Hosting version'):
            m.checked_version('sites/another-site/versions/test')


if __name__ == '__main__':
    unittest.main(verbosity=2)
