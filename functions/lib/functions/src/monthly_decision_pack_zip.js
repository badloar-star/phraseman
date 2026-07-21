"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DECISION_PACK_UNCOMPRESSED_LIMIT_BYTES = exports.DECISION_PACK_ZIP_LIMIT_BYTES = void 0;
exports.createDecisionPackZip = createDecisionPackZip;
const archiver_1 = __importDefault(require("archiver"));
const node_stream_1 = require("node:stream");
const monthly_decision_pack_core_1 = require("./monthly_decision_pack_core");
exports.DECISION_PACK_ZIP_LIMIT_BYTES = 4 * 1024 * 1024;
exports.DECISION_PACK_UNCOMPRESSED_LIMIT_BYTES = 12 * 1024 * 1024;
const FIXED_ZIP_DATE = new Date('1980-01-01T00:00:00.000Z');
async function createDecisionPackZip(files) {
    const uncompressedBytes = monthly_decision_pack_core_1.DECISION_PACK_FILE_NAMES.reduce((sum, name) => sum + Buffer.byteLength(files[name] ?? '', 'utf8'), 0);
    if (uncompressedBytes > exports.DECISION_PACK_UNCOMPRESSED_LIMIT_BYTES)
        throw new Error('decision_pack_uncompressed_limit');
    const output = new node_stream_1.PassThrough();
    const chunks = [];
    output.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    const complete = new Promise((resolve, reject) => {
        output.once('end', () => {
            const buffer = Buffer.concat(chunks);
            if (buffer.length > exports.DECISION_PACK_ZIP_LIMIT_BYTES)
                reject(new Error('decision_pack_zip_limit'));
            else
                resolve(buffer);
        });
        output.once('error', reject);
    });
    const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
    archive.once('error', (error) => output.destroy(error));
    archive.pipe(output);
    for (const name of monthly_decision_pack_core_1.DECISION_PACK_FILE_NAMES) {
        archive.append(Buffer.from(files[name], 'utf8'), { name, date: FIXED_ZIP_DATE, mode: 0o100644 });
    }
    await archive.finalize();
    return complete;
}
//# sourceMappingURL=monthly_decision_pack_zip.js.map