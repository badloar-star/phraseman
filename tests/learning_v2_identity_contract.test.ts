import fs from 'fs';
import path from 'path';
import ts from 'typescript';

import {
  V2_IDENTITY_ERROR_CODES,
  V2_IDENTITY_PATTERN,
  V2_IDENTITY_REGEX,
  V2IdentityError,
  assertUniqueActivityIdsWithinRelease,
  isActivityId,
  isCourseId,
  isEpisodeId,
  isNodeId,
  isReleaseId,
  isSeasonId,
  isSkillId,
  parseActivityId,
  parseCourseId,
  parseEpisodeId,
  parseNodeId,
  parseReleaseId,
  parseSeasonId,
  parseSkillId,
  type ActivityId,
  type NodeId,
} from '../modules/learning-v2/contracts/identities';
import {
  V2_SCHEMA_VERSION_ERROR_CODE,
  V2_SCHEMA_VERSIONS,
  V2SchemaVersionError,
  isSupportedV2SchemaVersion,
  parseV2SchemaVersion,
  type V2SchemaKind,
  type V2SchemaVersion,
} from '../modules/learning-v2/contracts/schema_versions';

interface IdentityCase {
  readonly kind: string;
  readonly example: string;
  readonly invalidCode: string;
  readonly isId: (value: unknown) => boolean;
  readonly parseId: (value: unknown) => string;
}

const IDENTITY_CASES: readonly IdentityCase[] = [
  {
    kind: 'course',
    example: 'pilot-32-en-ru',
    invalidCode: 'invalid_course_id',
    isId: isCourseId,
    parseId: parseCourseId,
  },
  {
    kind: 'season',
    example: 'pilot-32-en-ru',
    invalidCode: 'invalid_season_id',
    isId: isSeasonId,
    parseId: parseSeasonId,
  },
  {
    kind: 'episode',
    example: 'ep-01',
    invalidCode: 'invalid_episode_id',
    isId: isEpisodeId,
    parseId: parseEpisodeId,
  },
  {
    kind: 'node',
    example: 'ep01.node06',
    invalidCode: 'invalid_node_id',
    isId: isNodeId,
    parseId: parseNodeId,
  },
  {
    kind: 'activity',
    example: 'ep01.qr.origin',
    invalidCode: 'invalid_activity_id',
    isId: isActivityId,
    parseId: parseActivityId,
  },
  {
    kind: 'skill',
    example: 'ep01.qr.origin',
    invalidCode: 'invalid_skill_id',
    isId: isSkillId,
    parseId: parseSkillId,
  },
  {
    kind: 'release',
    example: 'fr-ru-release-0001',
    invalidCode: 'invalid_release_id',
    isId: isReleaseId,
    parseId: parseReleaseId,
  },
] as const;

const DOCUMENTED_ID_EXAMPLES = [
  'pilot-32-en-ru',
  'ep-01',
  'ep01.node06',
  'ep01.qr.origin',
  'fr-ru-release-0001',
] as const;

const EXPECTED_SCHEMA_VERSIONS = {
  modeTemplateRuntime: 'v2-mode-template.v1',
  delayedProbeDefinition: 'v2-delayed-probe-definition.v1',
  attemptBody: 'v2-attempt-body.v1',
  attemptRef: 'v2-attempt-ref.v1',
  attemptEnvelope: 'v2-attempt-envelope.v1',
  delayedAttemptCandidate: 'v2-delayed-attempt-candidate.v1',
  delayedAttemptAck: 'v2-delayed-attempt-ack.v2',
  publishedSeason: 'v2-season.v1',
  lessonBundle: 'lesson-bundle.v2',
} as const;

const expectIdentityError = (operation: () => unknown, code: string): void => {
  let thrown: unknown;
  try {
    operation();
  } catch (error) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(V2IdentityError);
  expect(thrown).toMatchObject({ code, message: code });
};

const expectSchemaError = (operation: () => unknown): void => {
  let thrown: unknown;
  try {
    operation();
  } catch (error) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(V2SchemaVersionError);
  expect(thrown).toMatchObject({
    code: 'unsupported_v2_schema_version',
    message: 'unsupported_v2_schema_version',
  });
};

describe('Learning V2 identity grammar', () => {
  test('exports the exact documented, immutable ASCII allowlist regex', () => {
    expect(V2_IDENTITY_PATTERN).toBe('^[A-Za-z0-9._-]{1,160}$');
    expect(V2_IDENTITY_REGEX.source).toBe(V2_IDENTITY_PATTERN);
    expect(V2_IDENTITY_REGEX.flags).toBe('');
    expect(Object.isFrozen(V2_IDENTITY_REGEX)).toBe(true);
  });

  test('accepts every documented example under the shared lexical grammar', () => {
    for (const identity of IDENTITY_CASES) {
      expect(identity.isId(identity.example)).toBe(true);
      expect(identity.parseId(identity.example)).toBe(identity.example);

      for (const example of DOCUMENTED_ID_EXAMPLES) {
        expect(identity.isId(example)).toBe(true);
      }
    }
  });

  test('accepts exact lengths 1 and 160 for every identity brand', () => {
    const boundaryValues = ['a', 'Z'.repeat(160)];

    for (const identity of IDENTITY_CASES) {
      for (const value of boundaryValues) {
        expect(identity.isId(value)).toBe(true);
        expect(identity.parseId(value)).toBe(value);
      }
    }
  });

  test('keeps leading and repeated allowlisted punctuation valid', () => {
    const punctuationHeavyId = '._-..__--a';

    for (const identity of IDENTITY_CASES) {
      expect(identity.isId(punctuationHeavyId)).toBe(true);
      expect(identity.parseId(punctuationHeavyId)).toBe(punctuationHeavyId);
    }
  });

  test.each([
    ['undefined', undefined],
    ['null', null],
    ['number', 1],
    ['boolean', true],
    ['object', { id: 'ep-01' }],
    ['array', ['ep-01']],
    ['empty', ''],
    ['length 161', 'a'.repeat(161)],
    ['leading whitespace', ' ep-01'],
    ['trailing whitespace', 'ep-01 '],
    ['internal whitespace', 'ep 01'],
    ['slash', 'ep/01'],
    ['backslash', 'ep\\01'],
    ['colon', 'ep:01'],
    ['at sign', 'ep@01'],
    ['unicode', 'café'],
    ['cyrillic', 'эп-01'],
    ['emoji', 'ep-🚀'],
    ['newline', 'ep-01\nnext'],
  ])('rejects invalid %s values for every identity brand', (_label, value) => {
    for (const identity of IDENTITY_CASES) {
      expect(identity.isId(value)).toBe(false);
      expectIdentityError(() => identity.parseId(value), identity.invalidCode);
    }
  });

  test('returns the exact raw string without trim, lowercase, or normalization', () => {
    expect(parseEpisodeId('Ep-01')).toBe('Ep-01');
    expect(parseEpisodeId('ep-01')).toBe('ep-01');
    expect(parseEpisodeId('Ep-01')).not.toBe(parseEpisodeId('ep-01'));
    expect(() => parseEpisodeId(' Ep-01 ')).toThrow('invalid_episode_id');
  });

  test('uses distinct compile-time brands even for the same lexical string', () => {
    const nodeId = parseNodeId('shared.id');
    const activityId = parseActivityId('shared.id');

    if (false) {
      // @ts-expect-error NodeId and ActivityId are intentionally incompatible brands.
      const nodeFromActivity: NodeId = activityId;
      // @ts-expect-error ActivityId and NodeId are intentionally incompatible brands.
      const activityFromNode: ActivityId = nodeId;
      void nodeFromActivity;
      void activityFromNode;
    }

    expect(nodeId).toBe(activityId);
  });

  test('does not derive identity from title or localization changes', () => {
    const activityId = parseActivityId('ep01.qr.origin');
    const original = { activityId, title: { en: 'Order coffee', ru: 'Заказать кофе' } };
    const localized = { activityId, title: { en: 'Buy a coffee', fr: 'Commander un café' } };

    expect(localized.activityId).toBe(original.activityId);
    expect(localized.activityId).toBe('ep01.qr.origin');
  });

  test('exposes stable exact identity error codes', () => {
    expect(V2_IDENTITY_ERROR_CODES).toEqual({
      course: 'invalid_course_id',
      season: 'invalid_season_id',
      episode: 'invalid_episode_id',
      node: 'invalid_node_id',
      activity: 'invalid_activity_id',
      skill: 'invalid_skill_id',
      release: 'invalid_release_id',
      duplicateActivityWithinRelease: 'duplicate_activity_id_within_release',
    });
    expect(Object.isFrozen(V2_IDENTITY_ERROR_CODES)).toBe(true);
  });
});

describe('Learning V2 release-scoped activity identity', () => {
  test('rejects a duplicate activity ID within one release with a stable code', () => {
    const releaseId = parseReleaseId('fr-ru-release-0001');
    const repeated = parseActivityId('ep01.qr.origin');

    expectIdentityError(
      () => assertUniqueActivityIdsWithinRelease(releaseId, [repeated, parseActivityId('ep01.listen'), repeated]),
      'duplicate_activity_id_within_release',
    );
  });

  test('permits the same stable activity ID once in each distinct release', () => {
    const activityId = parseActivityId('ep01.qr.origin');

    expect(() =>
      assertUniqueActivityIdsWithinRelease(parseReleaseId('fr-ru-release-0001'), [activityId]),
    ).not.toThrow();
    expect(() =>
      assertUniqueActivityIdsWithinRelease(parseReleaseId('fr-ru-release-0002'), [activityId]),
    ).not.toThrow();
  });

  test('treats differently cased IDs as distinct byte-for-byte identities', () => {
    expect(() =>
      assertUniqueActivityIdsWithinRelease(parseReleaseId('release-A'), [
        parseActivityId('ep01.activity'),
        parseActivityId('Ep01.activity'),
      ]),
    ).not.toThrow();
  });

  test('revalidates branded release and activity inputs at runtime', () => {
    expectIdentityError(
      () =>
        assertUniqueActivityIdsWithinRelease(
          'release/invalid' as unknown as ReturnType<typeof parseReleaseId>,
          [parseActivityId('activity.valid')],
        ),
      'invalid_release_id',
    );
    expectIdentityError(
      () =>
        assertUniqueActivityIdsWithinRelease(parseReleaseId('release-valid'), [
          'activity invalid' as unknown as ActivityId,
        ]),
      'invalid_activity_id',
    );
  });

  test('keeps skill identity stable across releases and gives its parser no release input', () => {
    const skillId = parseSkillId('spoken.order-coffee');
    const firstRelease = { releaseId: parseReleaseId('release-0001'), skillId };
    const nextRelease = { releaseId: parseReleaseId('release-0002'), skillId: parseSkillId('spoken.order-coffee') };

    if (false) {
      // @ts-expect-error SkillId parsing is release-independent and accepts one input only.
      parseSkillId('spoken.order-coffee', firstRelease.releaseId);
    }

    expect(nextRelease.skillId).toBe(firstRelease.skillId);
  });
});

describe('Learning V2 schema version registry', () => {
  test('exports the exact immutable code-owned baseline and omits CourseRelease', () => {
    expect(V2_SCHEMA_VERSIONS).toEqual(EXPECTED_SCHEMA_VERSIONS);
    expect(Object.isFrozen(V2_SCHEMA_VERSIONS)).toBe(true);
    expect('courseRelease' in V2_SCHEMA_VERSIONS).toBe(false);
    expect(Object.values(V2_SCHEMA_VERSIONS)).not.toContain('course-release.v1');
  });

  test('accepts every known schema only for its own kind', () => {
    const entries = Object.entries(EXPECTED_SCHEMA_VERSIONS) as Array<
      [V2SchemaKind, (typeof EXPECTED_SCHEMA_VERSIONS)[V2SchemaKind]]
    >;

    for (const [kind, version] of entries) {
      expect(isSupportedV2SchemaVersion(kind, version)).toBe(true);
      expect(parseV2SchemaVersion(kind, version)).toBe(version);

      for (const [otherKind] of entries) {
        if (otherKind === kind) continue;
        expect(isSupportedV2SchemaVersion(otherKind, version)).toBe(false);
        expectSchemaError(() => parseV2SchemaVersion(otherKind, version));
      }
    }
  });

  test('fails closed for an unknown version, a known wrong-kind version, and non-strings', () => {
    expect(isSupportedV2SchemaVersion('publishedSeason', 'v2-season.v999')).toBe(false);
    expectSchemaError(() => parseV2SchemaVersion('publishedSeason', 'v2-season.v999'));

    expect(isSupportedV2SchemaVersion('attemptBody', 'v2-attempt-ref.v1')).toBe(false);
    expectSchemaError(() => parseV2SchemaVersion('attemptBody', 'v2-attempt-ref.v1'));

    expect(isSupportedV2SchemaVersion('lessonBundle', null)).toBe(false);
    expectSchemaError(() => parseV2SchemaVersion('lessonBundle', null));
  });

  test('fails closed for an unknown runtime kind', () => {
    const unknownKind = 'courseRelease' as V2SchemaKind;

    expect(isSupportedV2SchemaVersion(unknownKind, 'course-release.v1')).toBe(false);
    expectSchemaError(() => parseV2SchemaVersion(unknownKind, 'course-release.v1'));
  });

  test('brands versions by schema kind at compile time', () => {
    const seasonVersion = parseV2SchemaVersion('publishedSeason', 'v2-season.v1');
    const attemptVersion = parseV2SchemaVersion('attemptBody', 'v2-attempt-body.v1');

    if (false) {
      // @ts-expect-error Schema versions of distinct kinds are intentionally incompatible.
      const wrongKind: V2SchemaVersion<'attemptBody'> = seasonVersion;
      void wrongKind;
    }

    expect(seasonVersion).not.toBe(attemptVersion);
    expect(V2_SCHEMA_VERSION_ERROR_CODE).toBe('unsupported_v2_schema_version');
  });
});

const collectModuleSpecifiers = (source: string): string[] => {
  const sourceFile = ts.createSourceFile(
    'learning-v2-purity-fixture.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const moduleSpecifiers: string[] = [];

  const collectStringLiteral = (node: ts.Node | undefined): void => {
    if (node && ts.isStringLiteralLike(node)) moduleSpecifiers.push(node.text);
  };

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      collectStringLiteral(node.moduleSpecifier);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      collectStringLiteral(node.moduleReference.expression);
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const isDynamicImport = callee.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(callee) && callee.text === 'require';
      const isRequireResolve =
        ts.isPropertyAccessExpression(callee) &&
        ts.isIdentifier(callee.expression) &&
        callee.expression.text === 'require' &&
        callee.name.text === 'resolve';
      const isModuleRequire =
        ts.isPropertyAccessExpression(callee) &&
        ts.isIdentifier(callee.expression) &&
        callee.expression.text === 'module' &&
        callee.name.text === 'require';

      if (isDynamicImport || isRequire || isRequireResolve || isModuleRequire) {
        collectStringLiteral(node.arguments[0]);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return moduleSpecifiers;
};

const isForbiddenLearningV2Module = (moduleSpecifier: string): boolean =>
  moduleSpecifier === 'react' ||
  moduleSpecifier.startsWith('react/') ||
  moduleSpecifier.startsWith('react-') ||
  moduleSpecifier === 'firebase' ||
  moduleSpecifier.startsWith('firebase/') ||
  moduleSpecifier.startsWith('firebase-') ||
  moduleSpecifier.startsWith('@firebase/') ||
  moduleSpecifier.startsWith('@react-native-firebase/');

const hasForbiddenLearningV2Dependency = (source: string): boolean =>
  collectModuleSpecifiers(source).some(isForbiddenLearningV2Module);

describe('Learning V2 contract dependency purity guard', () => {
  test.each([
    ['import declaration', "import React from 'react';"],
    ['side-effect import', "import 'firebase/app';"],
    ['re-export declaration', "export * from /* boundary */ 'react/jsx-runtime';"],
    ['import-equals external module', "import admin = require /* boundary */ ('firebase-admin');"],
    ['dynamic import', "void import('firebase/functions');"],
    ['require call', "const firestore = require('@firebase/firestore');"],
    ['require.resolve call', "const adminPath = require.resolve('firebase-admin');"],
    ['module.require call', "module.require('@react-native-firebase/firestore');"],
  ])('detects a forbidden dependency in %s syntax', (_label, source) => {
    expect(hasForbiddenLearningV2Dependency(source)).toBe(true);
  });

  test('does not flag benign internal module specifiers', () => {
    const source = [
      "import { parseCourseId } from './identities';",
      "export * from '../shared/contracts';",
      "void import('@/modules/local-runtime');",
      "const adapter = require('@internal/firebase-adapter');",
    ].join('\n');

    expect(hasForbiddenLearningV2Dependency(source)).toBe(false);
  });

  test('keeps the actual identity contracts free of React and Firebase dependencies', () => {
    const contractsDirectory = path.join(process.cwd(), 'modules', 'learning-v2', 'contracts');
    const source = ['identities.ts', 'schema_versions.ts']
      .map((fileName) => fs.readFileSync(path.join(contractsDirectory, fileName), 'utf8'))
      .join('\n');

    expect(hasForbiddenLearningV2Dependency(source)).toBe(false);
  });
});
