// зачем: обучающая подсказка обязана случиться один раз и замолчать. Если она
// повторяется вечно, это уже не обучение, а раздражитель на каждом входе.
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SAVED_CARDS_FLIGHT_LIMIT,
  homeArrivalEffect,
  markCardSaved,
  markHomeArrivalPlayed,
  readSavedCardsFirstRun,
  resetSavedCardsFirstRun,
  shouldPulseSaveButton,
} from "../app/saved_cards_first_run";

beforeEach(async () => {
  await resetSavedCardsFirstRun();
});

describe("saved cards first run", () => {
  it("pulses the save button until the very first save", async () => {
    expect(shouldPulseSaveButton(await readSavedCardsFirstRun())).toBe(true);
    const { wasFirstEver } = await markCardSaved();
    expect(wasFirstEver).toBe(true);
    expect(shouldPulseSaveButton(await readSavedCardsFirstRun())).toBe(false);
  });

  it("reports the first save only once", async () => {
    await markCardSaved();
    const second = await markCardSaved();
    expect(second.wasFirstEver).toBe(false);
  });

  it("plays nothing on home when nothing was saved", async () => {
    expect(homeArrivalEffect(await readSavedCardsFirstRun())).toBe("none");
  });

  it("flies the cards in, then falls back to a quiet pulse", async () => {
    for (let visit = 1; visit <= SAVED_CARDS_FLIGHT_LIMIT; visit += 1) {
      await markCardSaved();
      expect(homeArrivalEffect(await readSavedCardsFirstRun())).toBe("flight");
      await markHomeArrivalPlayed("flight");
    }
    await markCardSaved();
    expect(homeArrivalEffect(await readSavedCardsFirstRun())).toBe("pulse");
  });

  // зачем: самый заметный баг такой анимации — она играет снова при каждом
  // возврате на главную, хотя ничего нового не сохранялось.
  it("does not replay the animation when nothing new arrived", async () => {
    await markCardSaved();
    await markHomeArrivalPlayed("flight");
    expect(homeArrivalEffect(await readSavedCardsFirstRun())).toBe("none");
  });

  it("counts several saves as one arrival", async () => {
    await markCardSaved();
    await markCardSaved();
    await markCardSaved();
    const state = await readSavedCardsFirstRun();
    expect(state.pendingArrivals).toBe(3);
    await markHomeArrivalPlayed("flight");
    expect((await readSavedCardsFirstRun()).pendingArrivals).toBe(0);
  });

  // зачем: повреждённая запись не должна ронять главную — это экран запуска.
  it("survives a corrupted record", async () => {
    await AsyncStorage.setItem("saved_cards_first_run_v1", "{not json");
    const state = await readSavedCardsFirstRun();
    expect(state.hasSavedEver).toBe(false);
    expect(homeArrivalEffect(state)).toBe("none");
  });
});
