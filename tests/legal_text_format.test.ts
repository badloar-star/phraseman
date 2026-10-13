/**
 * EN-проход 13.10 (profile-011/012): адрес почты в юр. документах не рвётся переносом на Android.
 */
import fs from 'fs';
import path from 'path';
import { keepEmailsUnbroken } from '../components/legal/legal_text_format';

const WJ = '⁠';

describe('keepEmailsUnbroken', () => {
  it('joins the address around dots and @, leaves the rest of the text as is', () => {
    const src = 'Privacy contact: support.phraseman@gmail.com. Thank you.';
    const out = keepEmailsUnbroken(src);
    expect(out).toBe(`Privacy contact: support${WJ}.${WJ}phraseman${WJ}@${WJ}gmail${WJ}.${WJ}com. Thank you.`);
    // видимый текст тот же
    expect(out.split(WJ).join('')).toBe(src);
  });

  it('text without addresses is unchanged; several addresses all joined', () => {
    expect(keepEmailsUnbroken('No address here. Version 2.0.')).toBe('No address here. Version 2.0.');
    const out = keepEmailsUnbroken('a.b@c.io and x@y.org');
    expect(out).toBe(`a${WJ}.${WJ}b${WJ}@${WJ}c${WJ}.${WJ}io and x${WJ}@${WJ}y${WJ}.${WJ}org`);
  });

  it('the legal sheet renders section bodies through it', () => {
    const sheet = fs.readFileSync(path.join(__dirname, '..', 'components', 'legal', 'LegalDocumentSheet.tsx'), 'utf8');
    expect(sheet).toContain('{keepEmailsUnbroken(section.body)}');
  });
});
