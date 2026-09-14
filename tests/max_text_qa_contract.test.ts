import { runMaxTextQaGate } from './max_text_qa_gate';

describe('MAX text QA contract', () => {
  it('keeps the text runner and deterministic transcript checks intact', async () => {
    await runMaxTextQaGate();
  });
});
