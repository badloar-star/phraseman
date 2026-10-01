import {
  ruKnowledgeShardsAfterNumber,
  ruKnowledgeShardsAccusativeAfterNumber,
  ruKnowledgeShardsGenitiveAfterNumber,
  ukKnowledgeShardsAfterNumber,
  ukKnowledgeShardsAccusativeAfterNumber,
  ukKnowledgeShardsGenitiveAfterNumber,
  ruShardKnowledgeSubtitle,
} from '../constants/shard_plurals';

describe('coin plurals', () => {
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

  // зачем: баг со скриншота владельца — «забери 1 монету» вместо «монета».
  it('RU винительный: «забери 1 монету»', () => {
    expect(ruKnowledgeShardsAccusativeAfterNumber(1)).toBe('монету');
    expect(ruKnowledgeShardsAccusativeAfterNumber(21)).toBe('монету');
    expect(ruKnowledgeShardsAccusativeAfterNumber(11)).toBe('монет');
    expect(ruKnowledgeShardsAccusativeAfterNumber(2)).toBe('монеты');
    expect(ruKnowledgeShardsAccusativeAfterNumber(5)).toBe('монет');
    expect(ruKnowledgeShardsAccusativeAfterNumber(350)).toBe('монет');
  });

  it('UK винительный: «забери 1 монету»', () => {
    expect(ukKnowledgeShardsAccusativeAfterNumber(1)).toBe('монету');
    expect(ukKnowledgeShardsAccusativeAfterNumber(21)).toBe('монету');
    expect(ukKnowledgeShardsAccusativeAfterNumber(11)).toBe('монет');
    expect(ukKnowledgeShardsAccusativeAfterNumber(3)).toBe('монети');
    expect(ukKnowledgeShardsAccusativeAfterNumber(350)).toBe('монет');
  });

  it('RU родительный: «не хватает ещё 1 монеты»', () => {
    expect(ruKnowledgeShardsGenitiveAfterNumber(1)).toBe('монеты');
    expect(ruKnowledgeShardsGenitiveAfterNumber(21)).toBe('монеты');
    expect(ruKnowledgeShardsGenitiveAfterNumber(11)).toBe('монет');
    expect(ruKnowledgeShardsGenitiveAfterNumber(5)).toBe('монет');
  });

  it('UK родительный: «не вистачає ще 1 монети»', () => {
    expect(ukKnowledgeShardsGenitiveAfterNumber(1)).toBe('монети');
    expect(ukKnowledgeShardsGenitiveAfterNumber(21)).toBe('монети');
    expect(ukKnowledgeShardsGenitiveAfterNumber(11)).toBe('монет');
    expect(ukKnowledgeShardsGenitiveAfterNumber(5)).toBe('монет');
  });
});
