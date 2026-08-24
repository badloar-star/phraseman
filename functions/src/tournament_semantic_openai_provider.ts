import {
  openAiChat,
  type OpenAiChatParams,
  type OpenAiChatResult,
} from './explain/explain_provider';
import {
  TOURNAMENT_SEMANTIC_PROMPTS,
  type SemanticProviderRequest,
  type TournamentSemanticReviewProvider,
} from './tournament_semantic_review';

type ChatFunction = (params: OpenAiChatParams) => Promise<OpenAiChatResult>;

const STRING = Object.freeze({ type: 'string' });
const VERDICT = Object.freeze({ type: 'string', enum: Object.freeze(['PASS', 'REJECT']) });

export const TOURNAMENT_SEMANTIC_RESPONSE_SCHEMA: Readonly<Record<string, unknown>> = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: Object.freeze([
    'contentSha256', 'reviewContractVersion', 'promptVersion', 'promptSetSha256', 'pass', 'model', 'verdict',
    'acceptableAnswerCount', 'errorOptionCount', 'subjects', 'blockingFindings',
  ]),
  properties: Object.freeze({
    contentSha256: Object.freeze({ type: 'string', pattern: '^[a-f0-9]{64}$' }),
    reviewContractVersion: STRING,
    promptVersion: STRING,
    promptSetSha256: Object.freeze({ type: 'string', pattern: '^[a-f0-9]{64}$' }),
    pass: Object.freeze({ type: 'string', enum: Object.freeze(['primary', 'adversarial']) }),
    model: STRING,
    verdict: VERDICT,
    acceptableAnswerCount: Object.freeze({ type: 'integer', minimum: 0, maximum: 6 }),
    errorOptionCount: Object.freeze({ type: 'integer', minimum: 0, maximum: 3 }),
    subjects: Object.freeze({
      type: 'array', minItems: 1, maxItems: 16,
      items: Object.freeze({
        type: 'object', additionalProperties: false,
        required: Object.freeze([
          'subjectId', 'verdict', 'findingCode', 'explanation',
          'partOfSpeech', 'grammaticality', 'minimalTwin', 'violationType',
        ]),
        properties: Object.freeze({
          subjectId: STRING,
          verdict: VERDICT,
          findingCode: Object.freeze({ anyOf: Object.freeze([STRING, Object.freeze({ type: 'null' })]) }),
          explanation: STRING,
          partOfSpeech: Object.freeze({ anyOf: Object.freeze([STRING, Object.freeze({ type: 'null' })]) }),
          grammaticality: Object.freeze({
            type: 'string', enum: Object.freeze(['valid', 'invalid', 'not_applicable']),
          }),
          minimalTwin: Object.freeze({
            anyOf: Object.freeze([Object.freeze({ type: 'boolean' }), Object.freeze({ type: 'null' })]),
          }),
          violationType: Object.freeze({ anyOf: Object.freeze([STRING, Object.freeze({ type: 'null' })]) }),
        }),
      }),
    }),
    blockingFindings: Object.freeze({
      type: 'array', maxItems: 16,
      items: Object.freeze({
        type: 'object', additionalProperties: false,
        required: Object.freeze(['code', 'subjectId', 'message']),
        properties: Object.freeze({ code: STRING, subjectId: STRING, message: STRING }),
      }),
    }),
  }),
});

export function createTournamentSemanticOpenAiProvider(input: Readonly<{
  apiKey: string;
  chat?: ChatFunction;
}>): TournamentSemanticReviewProvider {
  const chat = input.chat ?? openAiChat;
  return Object.freeze({
    async review(request: SemanticProviderRequest) {
      const prompt = TOURNAMENT_SEMANTIC_PROMPTS[request.pass];
      if (request.promptVersion !== prompt.version
        || request.promptSetSha256 !== TOURNAMENT_SEMANTIC_PROMPTS.promptSetSha256
        || request.reviewContractVersion !== TOURNAMENT_SEMANTIC_PROMPTS.contractVersion) {
        throw new Error('semantic_prompt_contract_mismatch');
      }
      const result = await chat({
        apiKey: input.apiKey,
        model: request.model,
        messages: [
          { role: 'system', content: prompt.system },
          {
            role: 'user',
            content: JSON.stringify({
              contentSha256: request.candidate.contentSha256,
              reviewContractVersion: request.reviewContractVersion,
              promptVersion: request.promptVersion,
              promptSetSha256: request.promptSetSha256,
              pass: request.pass,
              model: request.model,
              candidate: request.candidate,
            }),
          },
        ],
        maxTokens: 2_400,
        temperature: 0,
        responseFormat: {
          type: 'json_schema',
          json_schema: {
            name: 'tournament_semantic_verdict_v3',
            strict: true,
            schema: TOURNAMENT_SEMANTIC_RESPONSE_SCHEMA,
          },
        },
        maxAttempts: 1,
      });
      return Object.freeze({
        raw: result.text,
        inputTokens: result.promptTokens,
        outputTokens: result.completionTokens,
      });
    },
  });
}
