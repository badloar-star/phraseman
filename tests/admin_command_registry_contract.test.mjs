import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('admin command registry generator and artifact exist', () => {
  assert.ok(fs.existsSync('scripts/build_admin_command_registry.mjs'));
  assert.ok(fs.existsSync('docs/admin/ADMIN_COMMAND_REGISTRY.json'));
});

test('every registry row has explicit safety fields and blockers are visible', () => {
  const registry = JSON.parse(fs.readFileSync('docs/admin/ADMIN_COMMAND_REGISTRY.json', 'utf8'));
  assert.equal(registry.sourceSurface, 'admin/v2/legacy.html');
  assert.ok(registry.commands.length > 0);
  const fields = ['actorRole', 'inputValidation', 'idempotency', 'previewConfirm', 'auditEvent', 'rollback', 'tests'];
  for (const command of registry.commands) {
    assert.ok(command.name);
    for (const field of fields) assert.ok(command[field], `${command.name}: missing ${field}`);
    assert.ok(command.blockers.length > 0, `${command.name}: unproven safety must remain visible`);
  }
});
