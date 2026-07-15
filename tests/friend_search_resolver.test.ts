const lookupUserByFriendCode = jest.fn();
const lookupUserByNickname = jest.fn();

jest.mock('../app/firestore_friends', () => ({
  lookupUserByFriendCode: (...args: unknown[]) => lookupUserByFriendCode(...args),
  lookupUserByNickname: (...args: unknown[]) => lookupUserByNickname(...args),
}));

describe('friend search resolution', () => {
  beforeEach(() => {
    lookupUserByFriendCode.mockReset();
    lookupUserByNickname.mockReset();
  });

  it('falls back to nickname in the same action after a six-character code miss', async () => {
    lookupUserByFriendCode.mockResolvedValue(null);
    lookupUserByNickname.mockResolvedValue({ uid: 'nick-uid', name: 'ABC234' });
    const { resolveFriendSearch } = require('../app/friend_search_resolver');

    await expect(resolveFriendSearch('ABC234', 'SELF99')).resolves.toEqual({
      kind: 'found',
      queryType: 'nickname',
      result: { uid: 'nick-uid', name: 'ABC234' },
    });
    expect(lookupUserByFriendCode).toHaveBeenCalledWith('ABC234');
    expect(lookupUserByNickname).toHaveBeenCalledWith('ABC234');
    expect(lookupUserByFriendCode.mock.invocationCallOrder[0]).toBeLessThan(
      lookupUserByNickname.mock.invocationCallOrder[0],
    );
  });

  it('preserves self-code handling without looking up another user by nickname', async () => {
    const { resolveFriendSearch } = require('../app/friend_search_resolver');

    await expect(resolveFriendSearch('self99', 'SELF99')).resolves.toEqual({
      kind: 'self_code',
      queryType: 'code',
    });
    expect(lookupUserByFriendCode).not.toHaveBeenCalled();
    expect(lookupUserByNickname).not.toHaveBeenCalled();
  });

  it('does not spend a nickname callable when the code lookup succeeds', async () => {
    lookupUserByFriendCode.mockResolvedValue({ uid: 'code-uid', name: 'Code User' });
    const { resolveFriendSearch } = require('../app/friend_search_resolver');

    await expect(resolveFriendSearch('ABC234', 'SELF99')).resolves.toMatchObject({
      kind: 'found',
      queryType: 'code',
      result: { uid: 'code-uid' },
    });
    expect(lookupUserByNickname).not.toHaveBeenCalled();
  });
});
