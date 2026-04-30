# Graph Report - app  (2026-04-12)

## Corpus Check
- Large corpus: 93 files · ~749,543 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 601 nodes · 747 edges · 103 communities detected
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.71)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Navigation & Screens|Navigation & Screens]]
- [[_COMMUNITY_Lesson & Irregular Verbs|Lesson & Irregular Verbs]]
- [[_COMMUNITY_Achievements & Analytics|Achievements & Analytics]]
- [[_COMMUNITY_Tab Navigation & Notifications UI|Tab Navigation & Notifications UI]]
- [[_COMMUNITY_Push Notifications|Push Notifications]]
- [[_COMMUNITY_Firebase & Crashlytics|Firebase & Crashlytics]]
- [[_COMMUNITY_Lesson Training & Hall of Fame|Lesson Training & Hall of Fame]]
- [[_COMMUNITY_Flashcards|Flashcards]]
- [[_COMMUNITY_Medals & Gems|Medals & Gems]]
- [[_COMMUNITY_Club Boosts|Club Boosts]]
- [[_COMMUNITY_League & Streak Utils|League & Streak Utils]]
- [[_COMMUNITY_Active Recall (SRS)|Active Recall (SRS)]]
- [[_COMMUNITY_Dialogs|Dialogs]]
- [[_COMMUNITY_Referral System|Referral System]]
- [[_COMMUNITY_PhraseMen System|PhraseMen System]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]

## God Nodes (most connected - your core abstractions)
1. `XP Manager` - 20 edges
2. `logEvent()` - 12 edges
3. `getNotifications()` - 12 edges
4. `requestNotificationPermission()` - 10 edges
5. `loadPhrasemenState()` - 9 edges
6. `loadItems()` - 8 edges
7. `loadTodayProgress()` - 8 edges
8. `Achievement System` - 8 edges
9. `Lesson Data Index` - 8 edges
10. `saveTodayProgress()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Medal Utils (Bronze/Silver/Gold)` --conceptually_related_to--> `Achievement System`  [INFERRED]
  app/medal_utils.ts → app/achievements.ts
- `Lesson1 Main Screen` --calls--> `Lesson1 Smart Options`  [INFERRED]
  app/lesson1.tsx → app/lesson1_smart_options.ts
- `Lesson Help Screen` --conceptually_related_to--> `Lesson1 Main Screen`  [INFERRED]
  app/lesson_help.tsx → app/lesson1.tsx
- `Lesson1 Main Screen` --shares_data_with--> `Lesson Cards Data`  [INFERRED]
  app/lesson1.tsx → app/lesson_cards_data.ts
- `Level Exam Screen` --shares_data_with--> `Lesson Data Index`  [INFERRED]
  app/level_exam.tsx → app/lesson_data_all.ts

## Communities

### Community 0 - "Navigation & Screens"
Cohesion: 0.06
Nodes (20): Root Layout, Daily Login Bonus System, init(), runSessionChecks(), async(), shareMessage(), buildQueue(), buildVerbCard() (+12 more)

### Community 1 - "Lesson & Irregular Verbs"
Cohesion: 0.11
Nodes (23): Irregular Verbs By Lesson Data, IrregularVerb Interface, Lesson1 Main Screen, L1 Semantic Pools, Lesson1 Distractor Logic, Lesson1 Energy Messages, Lesson1 Smart Options, Lesson Cards Data (+15 more)

### Community 2 - "Achievements & Analytics"
Cohesion: 0.11
Nodes (21): Achievement System, Achievements Screen, Analytics Event Tracking, Avatar Select Screen, Club Boosts System, App Config (DEV_MODE, flags), Daily Tasks System, Daily Tasks Screen (+13 more)

### Community 3 - "Tab Navigation & Notifications UI"
Cohesion: 0.11
Nodes (19): Tab Navigation Context, Tab Slider (Swipe Navigation), Push Notifications System, Phrasemen Integration Rewards, Phrasemen Currency System, Premium Guard (Verification), Premium Modal Screen, Push Notification Schedules (+11 more)

### Community 4 - "Push Notifications"
Cohesion: 0.25
Nodes (14): cancelAllNotifications(), checkLeagueOvertakeNotification(), getDayIndex(), getNotifications(), requestNotificationPermission(), scheduleDailyReminder(), scheduleMonthlyRecapNotification(), scheduleNotifications() (+6 more)

### Community 5 - "Firebase & Crashlytics"
Cohesion: 0.24
Nodes (15): getAnalytics(), getCrashlytics(), logEvent(), logFlashcardAdded(), logHallOfFameViewed(), logLeaguePromoted(), logLessonComplete(), logLessonStart() (+7 more)

### Community 6 - "Lesson Training & Hall of Fame"
Cohesion: 0.17
Nodes (8): Hall of Fame Screen, Home Screen, Lessons Index Screen, async(), loadData(), Quizzes Screen, Settings Screen, Tab Layout

### Community 7 - "Flashcards"
Cohesion: 0.14
Nodes (2): shuffle(), startPractice()

### Community 8 - "Medals & Gems"
Cohesion: 0.21
Nodes (9): getCorrectNeededForNextTier(), getExamMedalTier(), getMedalTier(), getNextMedalHint(), invalidateMedalsCache(), loadExamMedalInfo(), loadMedalInfo(), saveExamProgress() (+1 more)

### Community 9 - "Club Boosts"
Cohesion: 0.21
Nodes (10): activateBoost(), formatBoostTimeRemaining(), formatBoostTimeRemainingUK(), getActiveBoosts(), getBoostDef(), getBoostNotification(), getBoostsHistory(), getBoostTimeRemaining() (+2 more)

### Community 10 - "League & Streak Utils"
Cohesion: 0.25
Nodes (11): addOrUpdateScore(), getMyWeekPoints(), getWeekKey(), loadLeaderboard(), loadWeekLeaderboard(), migrateWeekPointsIfNeeded(), pointsForAnswer(), saveLeaderboard() (+3 more)

### Community 11 - "Active Recall (SRS)"
Cohesion: 0.37
Nodes (12): clearAllItems(), daysFromNow(), getAllItems(), getDueItems(), getItemsByLesson(), getStats(), loadItems(), markReviewed() (+4 more)

### Community 12 - "Dialogs"
Cohesion: 0.17
Nodes (2): getScale(), handleTileTap()

### Community 13 - "Referral System"
Cohesion: 0.31
Nodes (10): awardPremiumBonus(), generateReferralCode(), generateUniqueCode(), getOrCreateUserUUID(), getReferralCode(), getReferralState(), getReferredByCode(), getTodayString() (+2 more)

### Community 14 - "PhraseMen System"
Cohesion: 0.33
Nodes (10): addPhrasemen(), getInitialState(), getLastDailyBonus(), getPhrasemenBalance(), getPhrasemenStats(), getTransactionHistory(), loadPhrasemenState(), savePhrasemenState() (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.49
Nodes (9): claimTask(), getTodayKey(), getTodayTasks(), loadTodayProgress(), resetAndUpdateTaskProgress(), resetTaskProgress(), saveTodayProgress(), updateMultipleTaskProgress() (+1 more)

### Community 16 - "Community 16"
Cohesion: 0.27
Nodes (6): calculateResult(), checkLeagueOnAppOpen(), fetchGroupForUser(), getWeekId(), saveLeagueState(), savePendingResult()

### Community 17 - "Community 17"
Cohesion: 0.18
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 0.22
Nodes (4): loadCard(), makeTiles(), pluralizeRU(), pluralizeUK()

### Community 19 - "Community 19"
Cohesion: 0.33
Nodes (7): getContractionFor(), getPerWordDistracts(), getPhraseWords(), makeSmartOptions(), makeSmartOptionsL1(), shuffle(), tokenizePhrase()

### Community 20 - "Community 20"
Cohesion: 0.4
Nodes (8): calculateRandomBonus(), calculateRewardWithBonus(), canOpenTreasureChest(), getBonusTierInfo(), getTodayString(), getTreasureChestState(), getTreasureStats(), openTreasureChest()

### Community 21 - "Community 21"
Cohesion: 0.31
Nodes (4): getLessonLockInfo(), isLessonUnlocked(), tryUnlockNextLesson(), unlockLesson()

### Community 22 - "Community 22"
Cohesion: 0.33
Nodes (5): buildCard(), fy(), makeOptions(), shuffle(), startPractice()

### Community 23 - "Community 23"
Cohesion: 0.36
Nodes (6): activateFreezeIfNeeded(), goBack(), handlePurchase(), handleRestore(), savePremiumLocally(), showSuccess()

### Community 24 - "Community 24"
Cohesion: 0.53
Nodes (8): getRepairProgress(), isRepairEligible(), isValidDateStr(), loadRepairState(), recordLessonForRepair(), save(), today(), wasRepairedToday()

### Community 25 - "Community 25"
Cohesion: 0.5
Nodes (6): checkAchievements(), getPendingNotifications(), loadAchievementStates(), markAchievementsNotified(), saveStates(), unlockAllAchievements()

### Community 26 - "Community 26"
Cohesion: 0.29
Nodes (2): advance(), getResult()

### Community 27 - "Community 27"
Cohesion: 0.39
Nodes (5): addEnergy(), checkAndRecover(), getEnergyState(), getTimeUntilNextRecovery(), spendEnergy()

### Community 28 - "Community 28"
Cohesion: 0.29
Nodes (2): generateNPCGroup(), load()

### Community 29 - "Community 29"
Cohesion: 0.32
Nodes (3): saveSettings(), toggleEnergyDisabled(), toggleNoLimits()

### Community 30 - "Community 30"
Cohesion: 0.32
Nodes (4): doPlace(), getLast14(), reload(), toDateStr()

### Community 31 - "Community 31"
Cohesion: 0.25
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 0.57
Nodes (5): checkWagerProgress(), loadWager(), placeWager(), saveWager(), today()

### Community 33 - "Community 33"
Cohesion: 0.33
Nodes (2): getNPCHoFStreak(), hofSeed()

### Community 34 - "Community 34"
Cohesion: 0.6
Nodes (5): findAllExplanations(), findContextualExplanation(), findMatchedTrigger(), normalizeForComparison(), sortTriggersByLengthDesc()

### Community 35 - "Community 35"
Cohesion: 0.47
Nodes (6): LeagueResultModal Component, CLUBS Array, ClubDef Interface, LEAGUES Array, League Engine Module, League Screen

### Community 36 - "Community 36"
Cohesion: 0.33
Nodes (6): Error Traps Lessons 17-24, Error Traps Lessons 1-8, Error Traps Lessons 25-32, Error Traps Lessons 9-16, Error Traps Loader, Feedback Types

### Community 37 - "Community 37"
Cohesion: 0.4
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 0.6
Nodes (3): clearEventQueue(), flushAnalytics(), getEventQueue()

### Community 39 - "Community 39"
Cohesion: 0.7
Nodes (4): getDayIndex(), getDefaultPhrase(), getTodayPhrase(), idiomForDay()

### Community 40 - "Community 40"
Cohesion: 0.4
Nodes (0): 

### Community 41 - "Community 41"
Cohesion: 0.4
Nodes (0): 

### Community 42 - "Community 42"
Cohesion: 0.6
Nodes (3): checkForUpdate(), getCurrentVersionCode(), shouldShow()

### Community 43 - "Community 43"
Cohesion: 0.5
Nodes (0): 

### Community 44 - "Community 44"
Cohesion: 0.67
Nodes (2): fy(), makeOptions()

### Community 45 - "Community 45"
Cohesion: 0.5
Nodes (0): 

### Community 46 - "Community 46"
Cohesion: 0.5
Nodes (0): 

### Community 47 - "Community 47"
Cohesion: 0.67
Nodes (2): finishExam(), goNext()

### Community 48 - "Community 48"
Cohesion: 0.67
Nodes (2): cache(), getVerifiedPremiumStatus()

### Community 49 - "Community 49"
Cohesion: 0.67
Nodes (2): saveSettings(), update()

### Community 50 - "Community 50"
Cohesion: 0.5
Nodes (0): 

### Community 51 - "Community 51"
Cohesion: 0.67
Nodes (2): getLessonDifficultyMultiplier(), registerXP()

### Community 52 - "Community 52"
Cohesion: 0.5
Nodes (0): 

### Community 53 - "Community 53"
Cohesion: 0.67
Nodes (2): containsBadWord(), saveName()

### Community 54 - "Community 54"
Cohesion: 0.67
Nodes (0): 

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (2): _doInit(), initRevenueCat()

### Community 56 - "Community 56"
Cohesion: 0.67
Nodes (0): 

### Community 57 - "Community 57"
Cohesion: 1.0
Nodes (2): getErrorTrapsByIndex(), loadTrapsForLesson()

### Community 58 - "Community 58"
Cohesion: 0.67
Nodes (0): 

### Community 59 - "Community 59"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "Community 60"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "Community 61"
Cohesion: 1.0
Nodes (0): 

### Community 62 - "Community 62"
Cohesion: 1.0
Nodes (0): 

### Community 63 - "Community 63"
Cohesion: 1.0
Nodes (0): 

### Community 64 - "Community 64"
Cohesion: 1.0
Nodes (0): 

### Community 65 - "Community 65"
Cohesion: 1.0
Nodes (2): Active Recall (SM-2 Spaced Repetition), Flashcards Screen

### Community 66 - "Community 66"
Cohesion: 1.0
Nodes (2): Daily Phrase System, Idioms Data (Daily Phrase Content)

### Community 67 - "Community 67"
Cohesion: 1.0
Nodes (2): Streak Stats Screen, Streak Wager System

### Community 68 - "Community 68"
Cohesion: 1.0
Nodes (2): Verb Form Groups, Word Pools

### Community 69 - "Community 69"
Cohesion: 1.0
Nodes (2): Comeback Bonus System, XP Multiplier System

### Community 70 - "Community 70"
Cohesion: 1.0
Nodes (0): 

### Community 71 - "Community 71"
Cohesion: 1.0
Nodes (0): 

### Community 72 - "Community 72"
Cohesion: 1.0
Nodes (0): 

### Community 73 - "Community 73"
Cohesion: 1.0
Nodes (0): 

### Community 74 - "Community 74"
Cohesion: 1.0
Nodes (0): 

### Community 75 - "Community 75"
Cohesion: 1.0
Nodes (0): 

### Community 76 - "Community 76"
Cohesion: 1.0
Nodes (0): 

### Community 77 - "Community 77"
Cohesion: 1.0
Nodes (0): 

### Community 78 - "Community 78"
Cohesion: 1.0
Nodes (0): 

### Community 79 - "Community 79"
Cohesion: 1.0
Nodes (0): 

### Community 80 - "Community 80"
Cohesion: 1.0
Nodes (0): 

### Community 81 - "Community 81"
Cohesion: 1.0
Nodes (0): 

### Community 82 - "Community 82"
Cohesion: 1.0
Nodes (0): 

### Community 83 - "Community 83"
Cohesion: 1.0
Nodes (0): 

### Community 84 - "Community 84"
Cohesion: 1.0
Nodes (0): 

### Community 85 - "Community 85"
Cohesion: 1.0
Nodes (0): 

### Community 86 - "Community 86"
Cohesion: 1.0
Nodes (0): 

### Community 87 - "Community 87"
Cohesion: 1.0
Nodes (0): 

### Community 88 - "Community 88"
Cohesion: 1.0
Nodes (0): 

### Community 89 - "Community 89"
Cohesion: 1.0
Nodes (0): 

### Community 90 - "Community 90"
Cohesion: 1.0
Nodes (0): 

### Community 91 - "Community 91"
Cohesion: 1.0
Nodes (1): Diagnostic Test Screen

### Community 92 - "Community 92"
Cohesion: 1.0
Nodes (1): Hint Screen

### Community 93 - "Community 93"
Cohesion: 1.0
Nodes (1): PhraseCard Interface

### Community 94 - "Community 94"
Cohesion: 1.0
Nodes (1): LessonPhrase Interface

### Community 95 - "Community 95"
Cohesion: 1.0
Nodes (1): LessonWord Interface

### Community 96 - "Community 96"
Cohesion: 1.0
Nodes (1): LessonData Interface

### Community 97 - "Community 97"
Cohesion: 1.0
Nodes (1): Medal Info & Tier System

### Community 98 - "Community 98"
Cohesion: 1.0
Nodes (1): CEFR Level Ranges

### Community 99 - "Community 99"
Cohesion: 1.0
Nodes (1): Modal Screen

### Community 100 - "Community 100"
Cohesion: 1.0
Nodes (1): Store Review Utils

### Community 101 - "Community 101"
Cohesion: 1.0
Nodes (1): XP Source Type

### Community 102 - "Community 102"
Cohesion: 1.0
Nodes (1): Daily Treasure Chest System

## Knowledge Gaps
- **55 isolated node(s):** `Active Recall (SM-2 Spaced Repetition)`, `Analytics Event Tracking`, `Avatar Select Screen`, `Daily Phrase System`, `Diagnostic Test Screen` (+50 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 59`** (2 nodes): `dialogs_data.ts`, `getDialogById()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (2 nodes): `image_preload.ts`, `preloadImages()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (2 nodes): `lesson_cards_data.ts`, `getPhraseCard()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (2 nodes): `modal.tsx`, `ModalScreen()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (2 nodes): `quiz_data.ts`, `getQuizPhrases()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (2 nodes): `utils_shuffle.ts`, `shuffle()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (2 nodes): `Active Recall (SM-2 Spaced Repetition)`, `Flashcards Screen`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (2 nodes): `Daily Phrase System`, `Idioms Data (Daily Phrase Content)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (2 nodes): `Streak Stats Screen`, `Streak Wager System`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (2 nodes): `Verb Form Groups`, `Word Pools`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (2 nodes): `Comeback Bonus System`, `XP Multiplier System`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (1 nodes): `config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (1 nodes): `debug-logger.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (1 nodes): `hint.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (1 nodes): `idioms_data.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 74`** (1 nodes): `irregular_verbs_data.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 75`** (1 nodes): `LeagueResultModal.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 76`** (1 nodes): `lesson1_energy.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 77`** (1 nodes): `lesson_data_17_24.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 78`** (1 nodes): `lesson_data_1_8.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79`** (1 nodes): `lesson_data_25_32.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 80`** (1 nodes): `lesson_data_9_16.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 81`** (1 nodes): `lesson_data_types.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 82`** (1 nodes): `lesson_menu.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 83`** (1 nodes): `TabSlider.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 84`** (1 nodes): `verb_forms.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 85`** (1 nodes): `word_pools.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 86`** (1 nodes): `error_traps_17_24.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 87`** (1 nodes): `error_traps_1_8.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 88`** (1 nodes): `error_traps_25_32.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 89`** (1 nodes): `error_traps_9_16.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 90`** (1 nodes): `feedback.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 91`** (1 nodes): `Diagnostic Test Screen`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 92`** (1 nodes): `Hint Screen`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 93`** (1 nodes): `PhraseCard Interface`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 94`** (1 nodes): `LessonPhrase Interface`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 95`** (1 nodes): `LessonWord Interface`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 96`** (1 nodes): `LessonData Interface`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 97`** (1 nodes): `Medal Info & Tier System`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 98`** (1 nodes): `CEFR Level Ranges`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 99`** (1 nodes): `Modal Screen`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 100`** (1 nodes): `Store Review Utils`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 101`** (1 nodes): `XP Source Type`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 102`** (1 nodes): `Daily Treasure Chest System`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `XP Manager` connect `Navigation & Screens` to `Community 32`, `Lesson Training & Hall of Fame`, `Dialogs`, `Community 18`, `Community 22`, `Community 26`, `Community 29`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `Quizzes Screen` connect `Lesson Training & Hall of Fame` to `Navigation & Screens`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **What connects `Active Recall (SM-2 Spaced Repetition)`, `Analytics Event Tracking`, `Avatar Select Screen` to the rest of the system?**
  _55 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Navigation & Screens` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Lesson & Irregular Verbs` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Achievements & Analytics` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Tab Navigation & Notifications UI` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._