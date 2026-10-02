// зачем (PM-052, D75): временный переходник. Хук переименован в useCoinRewardFlight,
// но app/lesson1.tsx и app/lesson_words.tsx ещё несут чужие незакоммиченные правки и
// импортируют старое имя. Когда их переведут — этот файл удалить.
export {
  useCoinRewardFlight as usePracticeRuneFlight,
  type UseCoinRewardFlightResult as UsePracticeRuneFlightResult,
} from './useCoinRewardFlight';
