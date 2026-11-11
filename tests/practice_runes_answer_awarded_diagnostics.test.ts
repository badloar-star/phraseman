import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const babel = require('@babel/core') as typeof import('@babel/core');
const generate = require('@babel/generator').default as (node: unknown, options?: object) => { code: string };
const traverse = require('@babel/traverse').default as (ast: unknown, visitors: object) => void;

const root = path.join(__dirname, '..');
const hookPath = path.join(root, 'hooks', 'usePracticeRunes.ts');
const helperPath = path.join(root, 'app', 'lesson_coins_log.ts');
const babelConfigPath = path.join(root, 'babel.config.js');

type BabelOutput = Readonly<{ ast: unknown; code: string }>;

function transformRealSource(filePath: string, isDev: boolean): BabelOutput {
  const output = babel.transformFileSync(filePath, {
    cwd: root,
    envName: isDev ? 'development' : 'production',
    caller: { name: 'metro', isDev, platform: 'ios' },
    configFile: babelConfigPath,
    babelrc: false,
    ast: true,
    code: true,
    comments: false,
    compact: false,
  });
  if (!output?.ast || typeof output.code !== 'string') {
    throw new Error(`Babel did not transform ${path.relative(root, filePath)}`);
  }
  return { ast: output.ast, code: output.code };
}

function calleeName(node: any): string | null {
  if (node?.type === 'Identifier') return node.name;
  if (node?.type === 'MemberExpression' && !node.computed && node.property?.type === 'Identifier') {
    return node.property.name;
  }
  if (node?.type === 'SequenceExpression') {
    return calleeName(node.expressions[node.expressions.length - 1]);
  }
  return null;
}

function stringArgument(node: any, index: number): string | null {
  const argument = node?.arguments?.[index];
  return argument?.type === 'StringLiteral' ? argument.value : null;
}

function directCallStatementName(node: any): string | null {
  if (node?.type !== 'ExpressionStatement' || node.expression?.type !== 'CallExpression') return null;
  return calleeName(node.expression.callee);
}

function runTransformedHelper(isDev: boolean) {
  const transformed = transformRealSource(helperPath, isDev);
  const info = jest.fn();
  const consoleLog = jest.fn();
  const consoleWarn = jest.fn();
  const module = { exports: {} as Record<string, unknown> };
  const context = vm.createContext({
    __DEV__: isDev,
    module,
    exports: module.exports,
    require: (request: string) => {
      if (request === './debug-logger') return { DebugLogger: { info } };
      throw new Error(`Unexpected helper dependency: ${request}`);
    },
    console: { log: consoleLog, warn: consoleWarn },
  });
  vm.runInContext(transformed.code, context, { filename: helperPath });
  const lessonCoinsLog = module.exports.lessonCoinsLog;
  if (typeof lessonCoinsLog !== 'function') throw new Error('Transformed helper did not export lessonCoinsLog');
  return { lessonCoinsLog: lessonCoinsLog as (step: string, fields?: Record<string, unknown>) => void, info, consoleLog, consoleWarn };
}

describe('practice rune answer-awarded diagnostics', () => {
  test('production Metro transform makes the award diagnostic unreachable while business steps stay outside the guard', () => {
    expect(fs.existsSync(babelConfigPath)).toBe(true);
    const transformed = transformRealSource(hookPath, false);
    let awardCallPath: any = null;

    traverse(transformed.ast, {
      CallExpression(callPath: any) {
        if (calleeName(callPath.node.callee) === 'lessonCoinsLog'
          && stringArgument(callPath.node, 0) === 'answer_awarded') {
          awardCallPath = callPath;
        }
      },
    });

    expect(awardCallPath).not.toBeNull();
    const guardPath = awardCallPath.findParent((candidate: any) => candidate.isIfStatement());
    expect(guardPath).not.toBeNull();
    if (!guardPath) throw new Error('answer_awarded diagnostic is reachable without a release guard');
    expect(vm.runInNewContext(generate(guardPath.node.test).code, { __DEV__: false })).toBe(false);

    const callbackPath = guardPath.findParent((candidate: any) => (
      candidate.isFunctionExpression() || candidate.isArrowFunctionExpression()
    ));
    const useCallbackPath = callbackPath?.parentPath;
    expect(useCallbackPath?.isCallExpression()).toBe(true);
    expect(useCallbackPath.node.arguments[0]).toBe(callbackPath.node);
    expect((useCallbackPath.node.arguments[1]?.elements ?? []).map((entry: unknown) => generate(entry, { compact: true }).code)).toEqual([
      'devFakeStartRunes',
      'enabled',
      'input.activity',
      'persist',
    ]);

    const callbackBody = callbackPath.node.body.body as any[];
    const earningsAssignmentIndex = callbackBody.findIndex((statement) => (
      statement.type === 'ExpressionStatement'
      && statement.expression?.type === 'AssignmentExpression'
      && generate(statement.expression.left, { compact: true }).code === 'earningsRef.current'
    ));
    const displayedAwardIndex = callbackBody.findIndex((statement) => (
      statement.type === 'VariableDeclaration'
      && statement.declarations?.some((declaration: any) => declaration.id?.name === 'displayedAward')
    ));
    const guardIndex = callbackBody.indexOf(guardPath.node);
    const setBaseRunesIndex = callbackBody.findIndex((statement) => directCallStatementName(statement) === 'setBaseRunes');
    const persistIndex = callbackBody.findIndex((statement) => directCallStatementName(statement) === 'persist');
    const returnIndex = callbackBody.findIndex((statement) => (
      statement.type === 'ReturnStatement' && statement.argument?.name === 'displayedAward'
    ));
    expect([
      earningsAssignmentIndex,
      displayedAwardIndex,
      guardIndex,
      setBaseRunesIndex,
      persistIndex,
      returnIndex,
    ]).toEqual([
      earningsAssignmentIndex,
      displayedAwardIndex,
      guardIndex,
      setBaseRunesIndex,
      persistIndex,
      returnIndex,
    ].slice().sort((left, right) => left - right));
    expect(earningsAssignmentIndex).toBeGreaterThanOrEqual(0);
  });

  test('production Metro transform has no duplicate direct answer-awarded info payload', () => {
    const transformed = transformRealSource(hookPath, false);
    let duplicateInfoCalls = 0;
    traverse(transformed.ast, {
      CallExpression(callPath: any) {
        if (calleeName(callPath.node.callee) === 'info'
          && stringArgument(callPath.node, 0) === 'practice_runes:answer_awarded') {
          duplicateInfoCalls += 1;
        }
      },
    });
    expect(duplicateInfoCalls).toBe(0);
  });

  test('real transformed helper skips production award serialization but preserves other production routing', () => {
    const runtime = runTransformedHelper(false);
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    expect(() => runtime.lessonCoinsLog('answer_awarded', circular)).not.toThrow();
    expect(runtime.consoleLog).not.toHaveBeenCalled();
    expect(runtime.consoleWarn).not.toHaveBeenCalled();
    expect(runtime.info).not.toHaveBeenCalled();

    runtime.lessonCoinsLog('settle_start', { pendingRunes: 3 });
    expect(runtime.info).toHaveBeenCalledTimes(1);
    expect(runtime.info.mock.calls[0][0]).toBe('[LESSON-COINS]');
    expect(runtime.info.mock.calls[0][1]).toContain('"step":"settle_start"');

    expect(() => runtime.lessonCoinsLog('settle_failed', circular)).not.toThrow();
    expect(runtime.consoleWarn).toHaveBeenCalledTimes(1);
  });

  test('real transformed helper emits one development award line and stays circular-safe', () => {
    const runtime = runTransformedHelper(true);
    runtime.lessonCoinsLog('answer_awarded', { awarded: 3 });
    expect(runtime.consoleLog).toHaveBeenCalledTimes(1);
    expect(runtime.consoleLog.mock.calls[0][0]).toBe('[LESSON-COINS]');
    expect(runtime.consoleLog.mock.calls[0][1]).toContain('"step":"answer_awarded"');
    expect(runtime.info).not.toHaveBeenCalled();

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => runtime.lessonCoinsLog('answer_awarded', circular)).not.toThrow();
    expect(runtime.consoleWarn).toHaveBeenCalledTimes(1);
  });
});
