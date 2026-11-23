import type { HighlightMetric } from '@/types/api';

export const en = {
  title: 'Achievements',
  place: 'Place {rank}',
  inYear: 'In {year}',
  yearly: 'Yearly',
  lifetime: 'All Time',
  metrics: {
    duration: 'Duration',
    distance: 'Distance',
    elevation_change_up: 'Elevation gain',
    avg_speed: 'Average speed',
    avg_power: 'Average power',
    max_speed: 'Max speed',
    max_power: 'Max power',
    avg_power1min: 'Average power over 1 min',
    avg_power2min: 'Average power over 2 min',
    avg_power5min: 'Average power over 5 min',
    avg_power10min: 'Average power over 10 min',
    avg_power20min: 'Average power over 20 min',
    avg_power30min: 'Average power over 30 min',
    avg_power60min: 'Average power over 60 min',
  } satisfies Record<HighlightMetric, string>,
};

export const de = {
  title: 'Bestleistungen',
  place: 'Platz {rank}',
  inYear: 'Im Jahr {year}',
  yearly: 'Jahreswertung',
  lifetime: 'Gesamter Zeitraum',
  metrics: {
    duration: 'Dauer',
    distance: 'Distanz',
    elevation_change_up: 'Höhengewinn',
    avg_speed: 'Durchschnittsgeschwindigkeit',
    avg_power: 'Durchschnittsleistung',
    max_speed: 'Höchstgeschwindigkeit',
    max_power: 'Höchstleistung',
    avg_power1min: 'Durchschnittsleistung über 1 Min.',
    avg_power2min: 'Durchschnittsleistung über 2 Min.',
    avg_power5min: 'Durchschnittsleistung über 5 Min.',
    avg_power10min: 'Durchschnittsleistung über 10 Min.',
    avg_power20min: 'Durchschnittsleistung über 20 Min.',
    avg_power30min: 'Durchschnittsleistung über 30 Min.',
    avg_power60min: 'Durchschnittsleistung über 60 Min.',
  },
} satisfies typeof en;
