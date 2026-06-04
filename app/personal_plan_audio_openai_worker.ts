import type { PlanAudioGenerationJob } from './personal_plan_audio_generation_jobs';

export type OpenAiSpeechRequestBody = {
  model: string;
  voice: string;
  input: string;
  response_format: 'mp3';
};

export type OpenAiSpeechRequest = {
  endpoint: 'https://api.openai.com/v1/audio/speech';
  body: OpenAiSpeechRequestBody;
};

export type FetchOpenAiSpeechInput = {
  apiKey: string;
  endpoint: string;
  body: OpenAiSpeechRequestBody;
};

export type FetchOpenAiSpeech = (input: FetchOpenAiSpeechInput) => Promise<Uint8Array>;
export type WritePlanAudioFile = (outputPath: string, bytes: Uint8Array) => Promise<void>;
export type PlanAudioFileExists = (outputPath: string) => boolean;

export type OpenAiPlanAudioGenerationItemStatus =
  | 'dry_run'
  | 'generated'
  | 'skipped_existing'
  | 'blocked'
  | 'failed';

export type OpenAiPlanAudioGenerationItem = {
  jobId: string;
  outputPath: string;
  targetText: string;
  status: OpenAiPlanAudioGenerationItemStatus;
  bytes?: number;
  reason?: string;
};

export type RunOpenAiPlanAudioGenerationInput = {
  jobs: PlanAudioGenerationJob[];
  apiKey?: string;
  execute: boolean;
  model: string;
  fetchSpeech: FetchOpenAiSpeech;
  writeFile: WritePlanAudioFile;
  fileExists?: PlanAudioFileExists;
};

export type OpenAiPlanAudioGenerationResult = {
  items: OpenAiPlanAudioGenerationItem[];
  summary: {
    jobs: number;
    generated: number;
    skippedExisting: number;
    dryRun: number;
    failed: number;
    blocked: number;
  };
};

function cleanVoiceId(voiceId: string): string {
  const trimmed = voiceId.trim();
  return trimmed.includes(':') ? trimmed.split(':').pop() || trimmed : trimmed;
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function item(
  job: PlanAudioGenerationJob,
  status: OpenAiPlanAudioGenerationItemStatus,
  extras: Pick<OpenAiPlanAudioGenerationItem, 'bytes' | 'reason'> = {},
): OpenAiPlanAudioGenerationItem {
  return {
    jobId: job.id,
    outputPath: job.outputPath,
    targetText: job.targetText,
    status,
    ...extras,
  };
}

function summarize(items: OpenAiPlanAudioGenerationItem[]): OpenAiPlanAudioGenerationResult['summary'] {
  return {
    jobs: items.length,
    generated: items.filter((entry) => entry.status === 'generated').length,
    skippedExisting: items.filter((entry) => entry.status === 'skipped_existing').length,
    dryRun: items.filter((entry) => entry.status === 'dry_run').length,
    failed: items.filter((entry) => entry.status === 'failed').length,
    blocked: items.filter((entry) => entry.status === 'blocked').length,
  };
}

export function buildOpenAiSpeechRequest(input: {
  job: PlanAudioGenerationJob;
  model: string;
}): OpenAiSpeechRequest {
  return {
    endpoint: 'https://api.openai.com/v1/audio/speech',
    body: {
      model: input.model,
      voice: cleanVoiceId(input.job.voiceId),
      input: input.job.targetText,
      response_format: 'mp3',
    },
  };
}

export async function defaultFetchOpenAiSpeech(
  input: FetchOpenAiSpeechInput,
): Promise<Uint8Array> {
  const response = await fetch(input.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input.body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`OpenAI speech request failed: ${response.status} ${text}`.trim());
  }

  return new Uint8Array(await response.arrayBuffer());
}

export async function runOpenAiPlanAudioGeneration(
  input: RunOpenAiPlanAudioGenerationInput,
): Promise<OpenAiPlanAudioGenerationResult> {
  const items: OpenAiPlanAudioGenerationItem[] = [];

  for (const job of input.jobs) {
    if (!input.execute) {
      items.push(item(job, 'dry_run'));
      continue;
    }

    if (!hasText(input.apiKey)) {
      items.push(item(job, 'blocked', { reason: 'missing_openai_api_key' }));
      continue;
    }

    if (input.fileExists?.(job.outputPath)) {
      items.push(item(job, 'skipped_existing'));
      continue;
    }

    try {
      const request = buildOpenAiSpeechRequest({ job, model: input.model });
      const bytes = await input.fetchSpeech({
        apiKey: input.apiKey.trim(),
        endpoint: request.endpoint,
        body: request.body,
      });
      await input.writeFile(job.outputPath, bytes);
      items.push(item(job, 'generated', { bytes: bytes.byteLength }));
    } catch (error) {
      items.push(item(job, 'failed', {
        reason: error instanceof Error ? error.message : 'unknown_error',
      }));
    }
  }

  return {
    items,
    summary: summarize(items),
  };
}
