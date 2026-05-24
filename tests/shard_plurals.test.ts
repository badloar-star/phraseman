import {
  ruKnowledgeShardsAfterNumber,
  ukKnowledgeShardsAfterNumber,
  ruShardKnowledgeSubtitle,
} from '../constants/shard_plurals';

describe('shard plurals', () => {
  it('RU: согласует осколок/осколка/осколов с числом', () => {
    expect(ruKnowledgeShardsAfterNumber(1)).toBe('осколок знаний');
    expect(ruKnowledgeShardsAfterNumber(21)).toBe('осколок знаний');
    expect(ruKnowledgeShardsAfterNumber(2)).toBe('осколка знаний');
    expect(ruKnowledgeShardsAfterNumber(22)).toBe('осколка знаний');
    expect(ruKnowledgeShardsAfterNumber(350)).toBe('осколков знаний');
    expect(ruKnowledgeShardsAfterNumber(11)).toBe('осколков знаний');
    expect(ruKnowledgeShardsAfterNumber(112)).toBe('осколков знаний');
  });

  it('UK: согласует формы после числа', () => {
    expect(ukKnowledgeShardsAfterNumber(1)).toBe('осколок знань');
    expect(ukKnowledgeShardsAfterNumber(350)).toBe('осколків знань');
  });

  it('subtitle RU включает число', () => {
    expect(ruShardKnowledgeSubtitle(350)).toBe('+350 осколков знаний');
  });
});
