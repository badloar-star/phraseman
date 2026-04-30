/**
 * @deprecated — використовуйте `node tools/victoria_marketplace_phrase_qa.mjs` або `npm run vq:marketplace`.
 * Обгортка залишена для `npm run vq:peaky`.
 */
import { runMarketplacePhraseQa } from './victoria_marketplace_phrase_qa.mjs';
import { resolve } from 'path';

const packPath = process.argv[2] ? resolve(process.argv[2]) : undefined;
runMarketplacePhraseQa(packPath);
