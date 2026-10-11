import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { formatActivityTimestamp } from '../utils/datetime';

interface ActivityTimestamp {
  start: string;
  timezone: string;
}

export function useActivityDateTime(
  activity: MaybeRefOrGetter<ActivityTimestamp | null>,
  locale?: string | string[]
) {
  return computed(() => {
    const value = toValue(activity);
    if (!value) return { date: '', shortDate: '', time: '', dateTime: '' };
    const date = formatActivityTimestamp(value.start, value.timezone, {}, locale);
    if (!date.isLocalTimeAvailable) {
      return { date: date.text, shortDate: date.text, time: '', dateTime: date.text };
    }
    return {
      date: date.text,
      shortDate: formatActivityTimestamp(
        value.start,
        value.timezone,
        { year: 'numeric', month: 'short', day: 'numeric' },
        locale
      ).text,
      time: formatActivityTimestamp(
        value.start,
        value.timezone,
        { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' },
        locale
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
        locale
      ).text,
    };
  });
}
