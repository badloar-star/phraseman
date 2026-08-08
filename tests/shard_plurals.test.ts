import {
  ruKnowledgeShardsAfterNumber,
  ruKnowledgeShardsAccusativeAfterNumber,
  ruKnowledgeShardsGenitiveAfterNumber,
  ukKnowledgeShardsAfterNumber,
  ukKnowledgeShardsAccusativeAfterNumber,
  ukKnowledgeShardsGenitiveAfterNumber,
  ruShardKnowledgeSubtitle,
} from '../constants/shard_plurals';

describe('pearl plurals', () => {
  it('RU: согласует жемчужина/жемчужины/жемчужин с числом', () => {
    expect(ruKnowledgeShardsAfterNumber(1)).toBe('жемчужина');
    expect(ruKnowledgeShardsAfterNumber(21)).toBe('жемчужина');
    expect(ruKnowledgeShardsAfterNumber(2)).toBe('жемчужины');
    expect(ruKnowledgeShardsAfterNumber(22)).toBe('жемчужины');
    expect(ruKnowledgeShardsAfterNumber(350)).toBe('жемчужин');
    expect(ruKnowledgeShardsAfterNumber(11)).toBe('жемчужин');
    expect(ruKnowledgeShardsAfterNumber(112)).toBe('жемчужин');
  });

  it('UK: согласует формы после числа', () => {
    expect(ukKnowledgeShardsAfterNumber(1)).toBe('перлина');
    expect(ukKnowledgeShardsAfterNumber(21)).toBe('перлина');
    expect(ukKnowledgeShardsAfterNumber(3)).toBe('перлини');
    expect(ukKnowledgeShardsAfterNumber(11)).toBe('перлин');
    expect(ukKnowledgeShardsAfterNumber(350)).toBe('перлин');
  });

  it('subtitle RU включает число', () => {
    expect(ruShardKnowledgeSubtitle(350)).toBe('+350 жемчужин');
  });

  // зачем: баг со скриншота владельца — «забери 1 жемчужина» вместо «жемчужину».
  it('RU винительный: «забери 1 жемчужину»', () => {
    expect(ruKnowledgeShardsAccusativeAfterNumber(1)).toBe('жемчужину');
    expect(ruKnowledgeShardsAccusativeAfterNumber(21)).toBe('жемчужину');
    expect(ruKnowledgeShardsAccusativeAfterNumber(11)).toBe('жемчужин');
    expect(ruKnowledgeShardsAccusativeAfterNumber(2)).toBe('жемчужины');
    expect(ruKnowledgeShardsAccusativeAfterNumber(5)).toBe('жемчужин');
    expect(ruKnowledgeShardsAccusativeAfterNumber(350)).toBe('жемчужин');
  });

  it('UK винительный: «забери 1 перлину»', () => {
    expect(ukKnowledgeShardsAccusativeAfterNumber(1)).toBe('перлину');
    expect(ukKnowledgeShardsAccusativeAfterNumber(21)).toBe('перлину');
    expect(ukKnowledgeShardsAccusativeAfterNumber(11)).toBe('перлин');
    expect(ukKnowledgeShardsAccusativeAfterNumber(3)).toBe('перлини');
    expect(ukKnowledgeShardsAccusativeAfterNumber(350)).toBe('перлин');
  });

  it('RU родительный: «не хватает ещё 1 жемчужины»', () => {
    expect(ruKnowledgeShardsGenitiveAfterNumber(1)).toBe('жемчужины');
    expect(ruKnowledgeShardsGenitiveAfterNumber(21)).toBe('жемчужины');
    expect(ruKnowledgeShardsGenitiveAfterNumber(11)).toBe('жемчужин');
    expect(ruKnowledgeShardsGenitiveAfterNumber(5)).toBe('жемчужин');
  });

  it('UK родительный: «не вистачає ще 1 перлини»', () => {
    expect(ukKnowledgeShardsGenitiveAfterNumber(1)).toBe('перлини');
    expect(ukKnowledgeShardsGenitiveAfterNumber(21)).toBe('перлини');
    expect(ukKnowledgeShardsGenitiveAfterNumber(11)).toBe('перлин');
    expect(ukKnowledgeShardsGenitiveAfterNumber(5)).toBe('перлин');
  });
});
