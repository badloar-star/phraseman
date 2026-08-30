import { generateDialogWithRepeatGuard } from './premium_dialog_quality';
import { emitAcceptedDialogReply } from './premium_dialog_stream_parse';
import fs from 'fs';
import path from 'path';

describe('buffered dialog stream quality', () => {
  it('emits only the accepted regenerated reply', async () => {
    const history = [
      { role: 'assistant' as const, content: 'What size would you like?' },
    ];
    const generated = jest.fn()
      .mockResolvedValueOnce({ reply: 'What size would you like?' })
      .mockResolvedValueOnce({ reply: 'Would you prefer a small or large cup?' });
    const accepted = await generateDialogWithRepeatGuard(generated, history);
    const events: Array<{ type: 'delta'; text: string }> = [];

    emitAcceptedDialogReply(accepted.value.reply, (event) => events.push(event), 12);

    expect(events.map((event) => event.text).join('')).toBe(
      'Would you prefer a small or large cup?',
    );
    expect(events.some((event) => event.text.includes('What size would you like?'))).toBe(false);
  });

  it('emits bounded non-empty chunks', () => {
    const events: Array<{ type: 'delta'; text: string }> = [];

    emitAcceptedDialogReply('123456789', (event) => events.push(event), 4);

    expect(events.map((event) => event.text)).toEqual(['1234', '5678', '9']);
  });

  it('buffers provider chunks and publishes only through the accepted writer', () => {
    const source = fs.readFileSync(path.join(__dirname, 'premium_dialog_stream.ts'), 'utf8');

    expect(source).toContain('generateDialogWithRepeatGuard(async (attempt) =>');
    expect(source).toContain('() => {},');
    expect(source).toContain('emitAcceptedDialogReply(');
    expect(source).toContain('quality,');
    expect(source).not.toContain("sseWrite(res, { type: 'delta', text: piece })");
  });
});
