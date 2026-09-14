import React, { act } from 'react';
import { createRoot, type Root } from 'test-renderer';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let mockDev = true, mockActive = true, mockReplay = true;
const mockDismiss = jest.fn();
jest.mock('../components/AiConsentSheetModal', () => 'ConsentSheet');
jest.mock('../components/feature_intro/DialogueComicStage', () => 'Comic');
jest.mock('../app/feature_intro_dev_replay', () => ({ useDevFeatureIntroReplay: () => mockDev }));
jest.mock('../hooks/use_runtime_active', () => ({ useRuntimeActive: () => mockActive }));
jest.mock('../hooks/use_feature_intro', () => ({ useFeatureIntro: (_: string, enabled: boolean) => ({ visible: enabled && mockReplay, dismiss: mockDismiss }) }));
jest.mock('../constants/i18n', () => ({ triLang: (_: string, copy: Record<string, unknown>) => copy.ru }));
import AiDialogConsentModal from '../components/AiDialogConsentModal';

describe('DEV consent preview cannot write a real consent decision', () => {
  let root: Root;
  const accept = jest.fn(), decline = jest.fn();
  const sheet = () => root.container.queryAll(n => n.type === 'ConsentSheet')[0].props;
  // Mock hooks do not subscribe to changes: refresh callback identities so memo
  // rerenders as the real external-store and route subscriptions would.
  const render = async (visible = false) => {
    await act(() => root.render(React.createElement(AiDialogConsentModal, {
      visible, lang: 'ru', onAccept: () => accept(), onDecline: () => decline(),
    })));
  };
  beforeEach(() => { root = createRoot(); mockDev = mockActive = mockReplay = true; jest.clearAllMocks(); });
  afterEach(async () => { await act(() => root.unmount()); });
  it('repeats as dismiss-only preview while real consent is not requested', async () => {
    await render(); expect(sheet().visible).toBe(true); expect(sheet().acceptLabel).toBe('Закрыть');
    sheet().onAccept(); sheet().onDecline();
    expect(mockDismiss).toHaveBeenCalledTimes(2); expect(accept).not.toHaveBeenCalled(); expect(decline).not.toHaveBeenCalled();
  });
  it('preserves original acceptance and refusal for a real consent request', async () => {
    await render(true); expect(sheet().acceptLabel).toBe('Включить');
    sheet().onAccept(); sheet().onDecline();
    expect(accept).toHaveBeenCalledTimes(1); expect(decline).toHaveBeenCalledTimes(1); expect(mockDismiss).not.toHaveBeenCalled();
  });
  it('does not show another window immediately after the real consent closes', async () => {
    await render(true); await render(false); expect(sheet().visible).toBe(false);
    mockActive = false; await render(); mockActive = true; await render();
    expect(sheet().visible).toBe(true);
  });
  it('disabled flag and hidden routes close preview without converting late taps to consent', async () => {
    await render(); mockDev = false; await render(); expect(sheet().visible).toBe(false);
    sheet().onAccept(); expect(accept).not.toHaveBeenCalled();
    mockDev = true; mockActive = false; await render(); expect(sheet().visible).toBe(false);
  });
});
