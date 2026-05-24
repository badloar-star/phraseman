import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('Gustav French notification target isolation', () => {
  it('uses target-scoped lesson pass counts in monthly recap while keeping shared XP and streak', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'notifications.ts'), 'utf8');

    expect(source).toContain("import { lessonPassCountKey, storageStudyTarget");
    expect(source).toContain('countCompletedLessonsFromStorage(studyTarget?: RuntimeStudyTarget)');
    expect(source).toContain('lessonPassCountKey(i + 1, studyTarget)');
    expect(source).toContain('resolveNotificationStudyTarget(lang, opts.studyTarget)');
    expect(source).toContain('countCompletedLessonsFromStorage(studyTarget)');
    expect(source).toContain("AsyncStorage.getItem('user_total_xp')");
    expect(source).toContain("AsyncStorage.getItem('streak_count')");
    expect(source).not.toContain("`lesson${i + 1}_pass_count`");
  });

  it('cancels English phrase-of-day notifications for French until a sourced French bank exists', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'notifications.ts'), 'utf8');

    expect(source).toContain("import { getStoredStudyTarget } from './study_target'");
    expect(source).toContain('resolveNotificationStudyTarget(lang, opts.studyTarget)');
    expect(source).toContain('getStoredStudyTarget(lang)');
    expect(source).toContain("if (studyTarget === 'fr')");
    expect(source).toContain("cancelScheduledNotificationsByType(N, ['phrase_of_day'])");
    expect(source).toContain("AsyncStorage.removeItem('phrase_notif_scheduled')");
    expect(source).toContain('AsyncStorage.removeItem(PHRASE_OF_DAY_NOTIF_ID_KEY)');
    expect(source).toContain('getTodayPhraseForTarget(studyTarget)');
  });

  it('keeps reminders target-aware without leaking English copy into French-target RU/UK reminders', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'notifications.ts'), 'utf8');
    const frenchReminderSlice = source.slice(
      source.indexOf('const MESSAGES_FR_TARGET_RU'),
      source.indexOf('/** Испанский UX для напоминаний'),
    );

    expect(source).toContain('scheduleDailyReminder = async');
    expect(source).toContain('opts: NotificationTargetOpts = {}');
    expect(source).toContain('const studyTarget = await resolveNotificationStudyTarget(lang, opts.studyTarget)');
    expect(source).toContain('const messages = reminderMessages(lang, studyTarget)');
    expect(source).toContain("data: { type: 'reminder', studyTarget }");
    expect(frenchReminderSlice).toContain('Время для занятия');
    expect(frenchReminderSlice).toContain('Час для заняття');
    expect(frenchReminderSlice).not.toContain('English');
  });

  it('passes active studyTarget from app bootstrap and notification settings into schedulers', () => {
    const layoutSource = fs.readFileSync(path.join(ROOT, 'app', '_layout.tsx'), 'utf8');
    const settingsSource = fs.readFileSync(path.join(ROOT, 'app', 'settings_notifications.tsx'), 'utf8');
    const mainSettingsSource = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'settings.tsx'), 'utf8');

    expect(layoutSource).toContain('const runSessionChecks = async (studyTarget?: RuntimeStudyTarget)');
    expect(layoutSource).toContain('scheduleNotifications(notifSnap, lang, 0, { requestPermission: false, studyTarget })');
    expect(layoutSource).toContain('scheduleDailyReminder(hour, minute, lang, { requestPermission: false, studyTarget })');
    expect(layoutSource).toContain('schedulePhrasOfDayNotification(lang, { requestPermission: false, studyTarget })');
    expect(layoutSource).toContain('scheduleMonthlyRecapNotification(lang, { requestPermission: false, studyTarget })');
    expect(layoutSource).toContain('await runSessionChecks(studyTarget)');
    expect(layoutSource).toContain('await scheduleNotifications(snap, lang, 0, { studyTarget })');
    expect(layoutSource).toContain('await scheduleDailyReminder(hour, minute, lang, { studyTarget })');

    expect(settingsSource).toContain("import { useStudyTarget } from '../components/StudyTargetContext'");
    expect(settingsSource).toContain('const { studyTarget } = useStudyTarget()');
    expect(settingsSource).toContain('await scheduleNotifications(next, lang as Lang, 0, { studyTarget })');
    expect(mainSettingsSource).toContain('await scheduleDailyReminder(notifHour, 0, lang, { studyTarget })');
  });
});
