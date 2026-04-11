import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useTheme } from '../components/ThemeContext';
import { hapticTap } from '../hooks/use-haptics';

const BETA_TESTERS = [
  {
    name: 'Nadya123@123',
    bio: 'Первый и лучший бета-тестер PhraseMan. Находила баги раньше всех, давала детальную обратную связь на каждом этапе и помогла сделать приложение таким, каким оно стало. Настоящий MVP команды тестирования — №1 навсегда 🏆',
    bio_uk: 'Перший і найкращий бета-тестер PhraseMan. Знаходила баги раніше за всіх, давала детальний зворотній зв\'язок і допомогла зробити застосунок таким, яким він є. Справжній MVP команди тестування — №1 назавжди 🏆',
  },
  {
    name: 'Abridattelija',
    bio: 'Одна из самых ценных участниц бета-тестирования. Генерировала свежие идеи и нестандартные предложения, многие из которых были реализованы в приложении. Огромное спасибо!',
    bio_uk: 'Одна з найцінніших учасниць бета-тестування. Генерувала свіжі ідеї та нестандартні пропозиції, багато з яких було реалізовано в застосунку. Величезна подяка!',
  },
  {
    name: 'Franssuaza',
    bio: 'Внимательный и тщательный тестер. Скрупулёзно проверяла функционал и помогала находить неочевидные проблемы. Отличный вклад в развитие PhraseMan!',
    bio_uk: 'Уважний і ретельний тестер. Скрупульозно перевіряла функціонал і допомагала знаходити неочевидні проблеми. Чудовий внесок у розвиток PhraseMan!',
  },
  {
    name: 'Roz',
    bio: 'Активно тестировал приложение и регулярно давал полезные отзывы. Помог улучшить несколько ключевых моментов в PhraseMan!',
    bio_uk: 'Активно тестував застосунок і регулярно давав корисні відгуки. Допоміг покращити кілька ключових моментів у PhraseMan!',
  },
  {
    name: 'Евгений',
    bio: 'Добросовестный тестер, который уделил время тщательной проверке приложения. Спасибо за участие и помощь в улучшении качества!',
    bio_uk: 'Сумлінний тестер, який приділив час ретельній перевірці застосунку. Дякуємо за участь і допомогу в покращенні якості!',
  },
  {
    name: 'Nina',
    bio: 'Тестировала приложение и делилась наблюдениями о работе функций. Спасибо за помощь и внимательность!',
    bio_uk: 'Тестувала застосунок і ділилась спостереженнями щодо роботи функцій. Дякуємо за допомогу і уважність!',
  },
  {
    name: 'Вячеслав',
    bio: 'Участвовал в бета-тестировании и помогал проверять работу приложения на разных устройствах. Спасибо за время и участие в проекте!',
    bio_uk: 'Брав участь у бета-тестуванні і допомагав перевіряти роботу застосунку на різних пристроях. Дякуємо за час і участь у проекті!',
  },
  {
    name: 'Dmitry',
    bio: 'Присоединился к тестированию и помог проверить базовый функционал приложения. Ценим каждый вклад в развитие PhraseMan!',
    bio_uk: 'Приєднався до тестування і допоміг перевірити базовий функціонал застосунку. Цінуємо кожен внесок у розвиток PhraseMan!',
  },
];

export default function BetaTesters() {
  const router = useRouter();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const isUK = lang === 'uk';
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <ScreenGradient>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700' }}>
              {isUK ? 'Бета-тестери' : 'Бета-тестеры'}
            </Text>
          </View>
        </View>

        {/* Subtitle */}
        <Text style={{ color: t.textMuted, fontSize: f.caption, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6, lineHeight: f.caption * 1.5 }}>
          {isUK
            ? 'Ці люди допомогли зробити PhraseMan кращим. Їхні імена залишаться тут протягом року після офіційного релізу.'
            : 'Эти люди помогли сделать PhraseMan лучше. Их имена останутся здесь на протяжении года после официального релиза.'}
        </Text>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {BETA_TESTERS.map((tester, index) => {
            const isExpanded = expanded === tester.name;
            const isLast = index === BETA_TESTERS.length - 1;
            const bio = isUK ? tester.bio_uk : tester.bio;
            return (
              <View key={tester.name}>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 20,
                    paddingVertical: 16,
                    borderBottomWidth: (isExpanded || isLast) ? 0 : 0.5,
                    borderBottomColor: t.border,
                  }}
                  onPress={() => { hapticTap(); setExpanded(isExpanded ? null : tester.name); }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="person-circle-outline" size={24} color={t.textSecond} style={{ marginRight: 14 }} />
                  <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '500' }}>{tester.name}</Text>
                  <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={t.textGhost} />
                </TouchableOpacity>
                {isExpanded && (
                  <View style={{
                    paddingHorizontal: 20,
                    paddingTop: 10,
                    paddingBottom: 18,
                    borderBottomWidth: isLast ? 0 : 0.5,
                    borderBottomColor: t.border,
                  }}>
                    <Text style={{ color: t.textSecond, fontSize: f.body, lineHeight: f.body * 1.6 }}>{bio}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </ScreenGradient>
  );
}
