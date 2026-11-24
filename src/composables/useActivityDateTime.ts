import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { formatActivityTimestamp } from '../utils/datetime';

interface ActivityTimestamp {
  start: string;
  timezone: string;
}

export function useActivityDateTime(
  activity: MaybeRefOrGetter<ActivityTimestamp | null>,
  locale?: MaybeRefOrGetter<string | string[]>
) {
  return computed(() => {
    const value = toValue(activity);
    if (!value) return { date: '', shortDate: '', time: '', dateTime: '', isLocalTimeAvailable: false };
    const activeLocale = toValue(locale);
    const date = formatActivityTimestamp(value.start, value.timezone, {}, activeLocale);
    if (!date.isLocalTimeAvailable) {
      return {
        date: date.text,
        shortDate: date.text,
        time: '',
        dateTime: date.text,
        isLocalTimeAvailable: false,
      };
    }
    return {
      date: date.text,
      shortDate: formatActivityTimestamp(
        value.start,
        value.timezone,
        { year: 'numeric', month: 'short', day: 'numeric' },
        activeLocale
      ).text,
      time: formatActivityTimestamp(
        value.start,
        value.timezone,
        { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' },
        activeLocale
      ).text,
      dateTime: formatActivityTimestamp(
        value.start,
        value.timezone,
        {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
        },
        activeLocale
      ).text,
      isLocalTimeAvailable: true,
    };
  });
}
