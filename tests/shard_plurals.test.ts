import {
  ruKnowledgeShardsAfterNumber,
  ukKnowledgeShardsAfterNumber,
  ruShardKnowledgeSubtitle,
} from '../constants/shard_plurals';

describe('coin plurals (бывшие «осколки» → «монеты», переименование отображаемое)', () => {
  it('RU: согласует монета/монеты/монет с числом', () => {
    expect(ruKnowledgeShardsAfterNumber(1)).toBe('монета');
    expect(ruKnowledgeShardsAfterNumber(21)).toBe('монета');
    expect(ruKnowledgeShardsAfterNumber(2)).toBe('монеты');
    expect(ruKnowledgeShardsAfterNumber(22)).toBe('монеты');
    expect(ruKnowledgeShardsAfterNumber(350)).toBe('монет');
    expect(ruKnowledgeShardsAfterNumber(11)).toBe('монет');
    expect(ruKnowledgeShardsAfterNumber(112)).toBe('монет');
  });

  it('UK: согласует формы после числа', () => {
    expect(ukKnowledgeShardsAfterNumber(1)).toBe('монета');
    expect(ukKnowledgeShardsAfterNumber(21)).toBe('монета');
    expect(ukKnowledgeShardsAfterNumber(3)).toBe('монети');
    expect(ukKnowledgeShardsAfterNumber(11)).toBe('монет');
    expect(ukKnowledgeShardsAfterNumber(350)).toBe('монет');
  });

  it('subtitle RU включает число', () => {
    expect(ruShardKnowledgeSubtitle(350)).toBe('+350 монет');
  });
});
