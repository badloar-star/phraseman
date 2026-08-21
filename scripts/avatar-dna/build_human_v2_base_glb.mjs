import { buildHumanV2Cc0Glb } from './build_human_v2_cc0_glb.mjs';

buildHumanV2Cc0Glb().then(output => process.stdout.write(`${output}\n`)).catch(error => { process.stdout.write(JSON.stringify({ ok: false, errors: ['build_failed'], message: error.message })); process.exitCode = 1; });
