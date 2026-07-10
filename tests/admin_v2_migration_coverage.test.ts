import fs from 'node:fs';
import path from 'node:path';

const board = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'docs/admin/ADMIN_V2_MIGRATION_COVERAGE.json'), 'utf8')) as {
  source: { buttons: number; functions: number };
  routes: string[];
  buttonCoverage: Array<{ coverageId: string; status: string; target: { route: string } }>;
  functionCoverage: Array<{ coverageId: string; status: string; target: { route: string } }>;
};
const legacy = fs.readFileSync(path.join(process.cwd(), 'admin/index.html'), 'utf8');

describe('Admin v2 migration coverage', () => {
  it('covers every currently inventoried legacy button and function', () => {
    expect(board.source.buttons).toBe(board.buttonCoverage.length);
    expect(board.source.functions).toBe(board.functionCoverage.length);
    expect(new Set(board.buttonCoverage.map((row) => row.coverageId)).size).toBe(board.buttonCoverage.length);
    expect(new Set(board.functionCoverage.map((row) => row.coverageId)).size).toBe(board.functionCoverage.length);
    expect(board.buttonCoverage.every((row) => board.routes.includes(row.target.route))).toBe(true);
    expect(board.functionCoverage.every((row) => board.routes.includes(row.target.route))).toBe(true);
    expect((legacy.match(/<button\b[\s\S]*?<\/button>/gi) ?? []).length).toBe(board.source.buttons);
  });
});
