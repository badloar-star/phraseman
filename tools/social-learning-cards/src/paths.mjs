import path from 'node:path';

export function revisionKey(contentId, revision) {
  if (!/^slc_[a-z0-9_]+$/.test(contentId)) throw new Error('invalid_content_id');
  if (!Number.isInteger(revision) || revision < 1) throw new Error('invalid_revision');
  return `${contentId}/revision_${String(revision).padStart(3, '0')}`;
}

export function resolveInside(root, relativePath) {
  if (path.isAbsolute(relativePath) || path.win32.isAbsolute(relativePath)) {
    throw new Error('path_absolute');
  }
  const base = path.resolve(root);
  const resolved = path.resolve(base, relativePath);
  const relative = path.relative(base, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('path_traversal');
  return resolved;
}
