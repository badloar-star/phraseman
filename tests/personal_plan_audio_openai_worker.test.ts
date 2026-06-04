import type { PlanAudioGenerationJob } from '../app/personal_plan_audio_generation_jobs';
import {
  buildOpenAiSpeechRequest,
  runOpenAiPlanAudioGeneration,
} from '../app/personal_plan_audio_openai_worker';

const job: PlanAudioGenerationJob = {
  id: 'audio-job:gavan:week1:block-1:unit-1',
  planId: 'gavan',
  weekId: 'week1',
  blockId: 'gavan-week1-day2:block-2',
  exerciseType: 'plan_listen_choose',
  contentUnitId: 'gavan-w1-d2-p1',
  contentUnitIds: ['gavan-w1-d2-p1'],
  targetText: 'Could you repeat that?',
  sourceBlockTargetText: 'Could you repeat that? / Could you say that again?',
  provider: 'openai',
  voiceId: 'openai:alloy',
  outputPath: 'assets/audio/personal-plans/gavan/week1/block-1/unit-1.mp3',
  expectedAssetId: 'audio:gavan:week1:block-1:unit-1',
  splitPolicy: 'per_content_unit',
  status: 'ready_to_generate',
};

describe('personal plan OpenAI audio worker', () => {
  it('builds the speech request from a plan audio job', () => {
    expect(buildOpenAiSpeechRequest({
      job,
      model: 'gpt-4o-mini-tts',
    })).toEqual({
      endpoint: 'https://api.openai.com/v1/audio/speech',
      body: {
        model: 'gpt-4o-mini-tts',
        voice: 'alloy',
        input: 'Could you repeat that?',
        response_format: 'mp3',
      },
    });
  });

  it('dry-runs jobs without calling fetch or writing files', async () => {
    const fetchSpeech = jest.fn();
    const writeFile = jest.fn();

    const result = await runOpenAiPlanAudioGeneration({
      jobs: [job],
      apiKey: 'sk-test',
      execute: false,
      model: 'gpt-4o-mini-tts',
      fetchSpeech,
      writeFile,
    });

    expect(fetchSpeech).not.toHaveBeenCalled();
    expect(writeFile).not.toHaveBeenCalled();
    expect(result.summary).toEqual({
      jobs: 1,
      generated: 0,
      skippedExisting: 0,
      dryRun: 1,
      failed: 0,
      blocked: 0,
    });
    expect(result.items[0]).toEqual(expect.objectContaining({
      jobId: job.id,
      status: 'dry_run',
      outputPath: job.outputPath,
    }));
  });

  it('blocks execute mode when the API key is missing', async () => {
    const result = await runOpenAiPlanAudioGeneration({
      jobs: [job],
      apiKey: '',
      execute: true,
      model: 'gpt-4o-mini-tts',
      fetchSpeech: jest.fn(),
      writeFile: jest.fn(),
    });

    expect(result.items).toEqual([
      expect.objectContaining({
        jobId: job.id,
        status: 'blocked',
        reason: 'missing_openai_api_key',
      }),
    ]);
    expect(result.summary).toEqual({
      jobs: 1,
      generated: 0,
      skippedExisting: 0,
      dryRun: 0,
      failed: 0,
      blocked: 1,
    });
  });

  it('generates and writes audio in execute mode with injected fetch', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const fetchSpeech = jest.fn(async () => bytes);
    const writeFile = jest.fn(async () => undefined);

    const result = await runOpenAiPlanAudioGeneration({
      jobs: [job],
      apiKey: 'sk-test',
      execute: true,
      model: 'gpt-4o-mini-tts',
      fetchSpeech,
      writeFile,
    });

    expect(fetchSpeech).toHaveBeenCalledWith({
      apiKey: 'sk-test',
      endpoint: 'https://api.openai.com/v1/audio/speech',
      body: {
        model: 'gpt-4o-mini-tts',
        voice: 'alloy',
        input: 'Could you repeat that?',
        response_format: 'mp3',
      },
    });
    expect(writeFile).toHaveBeenCalledWith(job.outputPath, bytes);
    expect(result.summary.generated).toBe(1);
    expect(result.items[0]).toEqual(expect.objectContaining({
      jobId: job.id,
      status: 'generated',
      bytes: 4,
    }));
  });
});
