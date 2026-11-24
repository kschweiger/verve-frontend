import { createI18n } from 'vue-i18n';
import type { SupportedLocale } from '@/types/api';
import * as navigation from './navigation';
import * as auth from './auth';
import * as settings from './settings';
import * as activities from './activities';
import * as calendar from './calendar';
import * as dashboard from './dashboard';
import * as activityHighlights from './activityHighlights';
import * as activityActions from './activityActions';
import * as activityCharts from './activityCharts';
import * as activityDetail from './activityDetail';
import * as workoutFields from './workoutFields';
import * as workout from './workout';
import * as segments from './segments';
import * as linkedActivities from './linkedActivities';
import * as training from './training';
import * as records from './records';
import * as manualEntry from './manualEntry';
import * as swimming from './swimming';
import * as collections from './collections';
import * as equipment from './equipment';
import * as goals from './goals';
import * as locations from './locations';
import * as admin from './admin';
import * as help from './help';
import * as heatmap from './heatmap';
import * as tags from './tags';
import * as stats from './stats';

export function createAppI18n(initialLocale: SupportedLocale = 'en') {
  return createI18n({
    legacy: false,
    locale: initialLocale,
    fallbackLocale: 'en',
    messages: {
      en: {
        navigation: navigation.en,
        auth: auth.en,
        settings: settings.en,
        activities: activities.en,
        calendar: calendar.en,
        dashboard: dashboard.en,
        activityHighlights: activityHighlights.en,
        activityActions: activityActions.en,
        activityCharts: activityCharts.en,
        activityDetail: activityDetail.en,
        workoutFields: workoutFields.en,
        workout: workout.en,
        segments: segments.en,
        linkedActivities: linkedActivities.en,
        training: training.en,
        records: records.en,
        manualEntry: manualEntry.en,
        swimming: swimming.en,
        collections: collections.en,
        equipment: equipment.en,
        goals: goals.en,
        locations: locations.en,
        admin: admin.en,
        help: help.en,
        heatmap: heatmap.en,
        tags: tags.en,
        stats: stats.en,
        language: {
          en: 'English',
          de: 'German',
        },
      },
      de: {
        navigation: navigation.de,
        auth: auth.de,
        settings: settings.de,
        activities: activities.de,
        calendar: calendar.de,
        dashboard: dashboard.de,
        activityHighlights: activityHighlights.de,
        activityActions: activityActions.de,
        activityCharts: activityCharts.de,
        activityDetail: activityDetail.de,
        workoutFields: workoutFields.de,
        workout: workout.de,
        segments: segments.de,
        linkedActivities: linkedActivities.de,
        training: training.de,
        records: records.de,
        manualEntry: manualEntry.de,
        swimming: swimming.de,
        collections: collections.de,
        equipment: equipment.de,
        goals: goals.de,
        locations: locations.de,
        admin: admin.de,
        help: help.de,
        heatmap: heatmap.de,
        tags: tags.de,
        stats: stats.de,
        language: {
          en: 'Englisch',
          de: 'Deutsch',
        },
      },
    },
  });
}
