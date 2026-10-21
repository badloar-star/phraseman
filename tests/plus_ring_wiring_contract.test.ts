// зачем (владелец 21.10, реестр №6; эталон docs/design/v2-app/plus-ring-etalon.html): кольцо Plus у аватара — один общий компонент и ровно 7 мест.
// Сторож не даёт месту «потерять» кольцо при чужой правке и не даёт завести вторую копию кольца: числа и цвета живут только в components/plus/*.
import { readSource } from './helpers/read_source';

const src = (rel: string) => readSource(rel);

describe('кольцо Plus: общий компонент', () => {
  it('числа и цвета кольца только в plus_ring_spec; компонент рисует по ним и не держит своих hex-градиентов', () => {
    const comp = src('components/plus/PlusAvatarRing.tsx');
    expect(comp).toContain("from './plus_ring_spec'");
    expect(comp).not.toMatch(/#8E7CFF|#6FA8FF|#7FE0D8|#C69BFF|#9B8CFF/);
    expect(comp).toContain('pointerEvents="none"');
    expect(comp).toContain('React.memo');
  });

  it('без Plus компонент ничего не добавляет в дерево (дети как есть)', () => {
    expect(src('components/plus/PlusAvatarRing.tsx')).toContain('if (plus !== true) return <>{children}</>;');
  });

  it('«у меня Plus» = isPremium || isVip || isPro, вводный пробный доступ кольца не даёт', () => {
    // зачем: комментарии в хуке объясняют, почему вводный доступ не считается, — проверяем только код
    const hook = src('components/plus/use_is_plus.ts').split(/\r?\n/).filter((l) => !l.trim().startsWith('//')).join(' ');
    expect(hook).toContain('return isPremium || isVip || isPro;');
    expect(hook).not.toContain('hasPremiumAccess');
    expect(hook).not.toContain('isIntroFullAccess');
  });

  it('у других Plus = покупка, VIP или пожизненный Pro (isPlusProfile)', () => {
    expect(src('components/plus/plus_ring_spec.ts')).toContain('p?.isPremium === true || p?.isVip === true || p?.isLifetime === true');
  });

  it('AvatarView принимает plus и рисует оверлей внутри своего контейнера (монета и запасной аватар)', () => {
    const view = src('components/AvatarView.tsx');
    expect(view).toContain('plus?: boolean | null;');
    expect(view.match(/plus === true \? <PlusRingOverlay/g)).toHaveLength(2);
  });
});

describe('кольцо Plus: 7 мест эталона', () => {
  it('1 · Настройки: монета в шапке и в карточке профиля обёрнуты, метка «◆ Plus» у имени только при Plus', () => {
    const s = src('app/(tabs)/settings.tsx');
    expect(s).toContain('const isPlus = isPremium || isVip || isPro;');
    expect(s).toContain("<PlusAvatarRing plus={isPlus} size={44} surface={glass.bg}>");
    expect(s).toContain("<PlusAvatarRing plus={isPlus} size={52} surface={glass.plateFillFrom}>");
    expect(s).toContain('{isPlus ? <PlusTag testID="settings-plus-tag"');
  });

  it('2 · Аккаунт: монета 102 в кольце, метка рядом с именем', () => {
    const s = src('app/account_details.tsx');
    expect(s).toContain('const isPlus = useIsPlus();');
    expect(s).toContain('<PlusAvatarRing plus={isPlus} size={COIN_SIZE} surface={glass.bg}>');
    expect(s).toContain('{isPlus ? <PlusTag testID="account-plus-tag"');
  });

  it('3 · Пик, жители на башне: плоское кольцо без значка у соперников, у стопки на этаже и у моего маркера', () => {
    expect(src('components/spire/SpireTower.tsx')).toContain('plus={m.isPremium} plusKind="flat"');
    expect(src('components/spire/SpireTower.tsx')).toContain('plus={myIsPlus} plusKind="flat"');
    expect(src('components/spire/SpireFloorInfo.tsx')).toContain('plus={m.isPremium} plusKind="flat"');
  });

  it('4 · «Все участники» и пьедестал: кольцо со значком, моя строка — по живому статусу', () => {
    expect(src('components/spire/SpireAllMembers.tsx')).toContain('<SpireRankCoin rank={m.coinRank} size={40} plus={m.isPremium} />');
    expect(src('components/spire/SpirePodium.tsx')).toContain('plus={m.isPremium}');
    expect(src('components/spire/SpireHomeScreen.tsx')).toContain('isPremium: r.isMe ? myIsPlus : r.isPremium === true');
  });

  it('5 · Друзья: монета друга в поиске, заявках и списке получает Plus через isPlusProfile', () => {
    expect(src('components/friends/FriendsGlassKit.tsx')).toContain('<PlusAvatarRing plus={plus} size={size} surface={glass.plateFillFrom}>');
    expect(src('components/friends/FriendsFoundCard.tsx')).toContain('plus={isPlusProfile(profile)}');
    expect(src('components/friends/FriendsRequestCard.tsx')).toContain('plus={isPlusProfile(profile)}');
    expect(src('components/friends_together/FriendListRow.tsx')).toContain('plus={isPlus}');
    expect(src('app/(tabs)/friends.tsx')).toContain('isPlus={isPlusProfile(profile)}');
  });

  it('6 · Наборы сообщества: автор из public_profiles (без нового чтения), кольцо у монеты автора', () => {
    const names = src('app/community_packs/packAuthorNames.ts');
    expect(names).toContain('isPlusProfile({ isPremium: data.isPremium === true, isVip: data.isVip === true, isLifetime: data.isLifetime === true })');
    expect(names).toContain('isPremium: profile.isPremium === true');
    const row = src('components/packs/PackRow.tsx');
    expect(row).toContain('plus={author.isPremium}');
    expect(row).toContain('<PlusAvatarRing plus={plus} size={18}');
    expect(src('app/flashcards/FlashcardsCategoryHub.tsx')).toContain('isPremium: author.isPremium');
  });

  it('7 · Визитка: кольцо 6 + 5 и значок 46 внутри плавающей монеты, метка у имени, Обсидиан не получает второго кольца', () => {
    const coin = src('components/profile-card/ProfileCardCoin.tsx');
    expect(coin).toContain('kind="card"');
    expect(coin).toContain("hideRing={look === 'obs'}");
    expect(src('components/profile-card/ProfileCardBody.tsx')).toContain('{plus === true ? <PlusTag testID="profile-card-plus-tag"');
    const modal = src('components/PlayerProfileModal.tsx');
    expect(modal).toContain('const plus = isMe ? myIsPlus : isPlusProfile(player);');
    expect(modal).toContain('plus={plus} plusSurface={tokens.bg}');
  });

  it('метка «◆ Plus» только в трёх местах: Настройки, Аккаунт, визитка (в списках и на башне её нет)', () => {
    for (const rel of ['components/friends/FriendsGlassKit.tsx', 'components/packs/PackRow.tsx', 'components/spire/SpireAllMembers.tsx', 'components/spire/SpireTower.tsx', 'components/spire/SpirePodium.tsx', 'components/friends_together/FriendListRow.tsx']) {
      expect(src(rel)).not.toContain('PlusTag');
    }
  });
});
