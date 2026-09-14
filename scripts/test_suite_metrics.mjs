import { readFile, writeFile } from 'node:fs/promises';

function parseCli(argv) {
  if (argv.length !== 4 || argv[0] !== '--input' || argv[2] !== '--output' || !argv[1] || !argv[3]) {
    throw new Error('usage: test_suite_metrics.mjs --input <jest-json> --output <metrics-json>');
  }
  return { input: argv[1], output: argv[3] };
}

function integer(value) { return Number.isInteger(value) && value >= 0; }

try {
  const { input, output } = parseCli(process.argv.slice(2));
  const result = JSON.parse(await readFile(input, 'utf8'));
  const required = ['numTotalTestSuites', 'numPassedTestSuites', 'numFailedTestSuites', 'numTotalTests', 'numPassedTests', 'numFailedTests', 'numPendingTests'];
  if (required.some((key) => !integer(result[key])) || !Array.isArray(result.testResults)) throw new Error('missing required Jest metrics');
  const suites = result.testResults.map((suite) => {
    const startTime = Number.isFinite(suite.startTime) ? suite.startTime : null;
    const endTime = Number.isFinite(suite.endTime) ? suite.endTime : null;
    const assertionResults = Array.isArray(suite.assertionResults) ? suite.assertionResults : [];
    return {
      path: typeof suite.name === 'string' ? suite.name : 'unknown',
      durationMs: startTime !== null && endTime !== null && endTime >= startTime ? endTime - startTime : null,
      failingTests: integer(suite.numFailingTests) ? suite.numFailingTests : assertionResults.filter((item) => item?.status === 'failed').length,
      retryCount: integer(suite.retryCount) ? suite.retryCount : null,
    };
  });
  const outputValue = {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    source: 'Jest JSON reporter',
    isolationChange: 'none',
    totalSuites: result.numTotalTestSuites,
    passedSuites: result.numPassedTestSuites,
    failedSuites: result.numFailedTestSuites,
    totalTests: result.numTotalTests,
    passedTests: result.numPassedTests,
    failedTests: result.numFailedTests,
    pendingTests: result.numPendingTests,
    peakMemoryMb: null,
    globalMutation: 'unmeasured',
    suites,
  };
  await writeFile(output, `${JSON.stringify(outputValue, null, 2)}\n`);
  console.log(`test_suite_metrics_ok suites=${suites.length} tests=${outputValue.totalTests}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
