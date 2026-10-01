import fs from 'fs';
import path from 'path';

/**
 * зачем: Q5 (координатор 01.10) — старые аватары-картинки и «Студия персонажа»
 * удалены (D57/D61): аватар в 2.0 = монета ранга. В списках админки вместо
 * картинки инициалы, ранг монеты показывается только в карточке пользователя и
 * берётся из public_profiles, который adminUserBriefs уже читает (без +1 чтения
 * на строку). Прежний контракт отрисовки avatarImg снят вместе с функцией.
 */
const html = fs.readFileSync(path.join(__dirname, '..', 'admin', 'v2', 'legacy.html'), 'utf8');

function extractInitials(): (name: string) => string {
  const start = html.indexOf('function adminUserInitials(');
  expect(start).toBeGreaterThanOrEqual(0);
  const end = html.indexOf('\n  }\n', start) + 4;
  return Function(`${html.slice(start, end)}\nreturn adminUserInitials;`)();
}

describe('admin user avatar surfaces (Q5)', () => {
  it('no longer renders old avatar images anywhere in the live admin', () => {
    expect(html).not.toContain('function avatarImg(');
    expect(html).not.toContain('avatarImg(');
    expect(html).not.toMatch(/src="avatars\//u);
  });

  it('shows initials in the user list and drawer header', () => {
    const initials = extractInitials();
    expect(initials('Anna Maria Lee')).toBe('AM');
    expect(initials('  ')).toBe('?');
    expect(html).toContain('<div class="avatar" aria-hidden="true">${escapeHtml(adminUserInitials(u.name))}</div>');
    expect(html).toContain('const avatar = escapeHtml(pmUserInitials(name));');
  });

  it('shows the coin rank only in the user card, from the brief (public_profiles)', () => {
    const drawerStart = html.indexOf('function pmPaintUserDrawerIdentity(');
    const drawer = html.slice(drawerStart, html.indexOf('window.openDetail = function pmOpenDetail', drawerStart));
    expect(drawer).toContain('pmCoinRankOrNull(brief?.coinRank)');
    expect(drawer).toContain('Ранг монеты:');
    const listStart = html.indexOf('function pmUserIdentityInner(');
    const list = html.slice(listStart, html.indexOf('function pmUserIdentityHtml(', listStart));
    expect(list).not.toContain('coinRank');
    expect(html).toContain('coinRank: pmCoinRankOrNull(pub.coinRank)');
    expect(html).toContain('coinRank: pmCoinRankOrNull(raw.coinRank)');
  });
});
