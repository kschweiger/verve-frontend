export interface QuickAddDefinition {
  key: 'elliptical' | 'weightTraining' | 'yoga';
  typeName: string;
  subTypeName: string;
  distanceMode: 'REQUIRED' | 'OPTIONAL' | 'NOT_APPLICABLE';
}

export const quickAddDefinitions: QuickAddDefinition[] = [
  {
    key: 'elliptical',
    typeName: 'Indoor Cardio',
    subTypeName: 'Elliptical',
    distanceMode: 'OPTIONAL',
  },
  {
    key: 'weightTraining',
    typeName: 'Strength Training',
    subTypeName: 'Weight Training',
    distanceMode: 'NOT_APPLICABLE',
  },
  {
    key: 'yoga',
    typeName: 'Fitness & Flexibility',
    subTypeName: 'Yoga',
    distanceMode: 'NOT_APPLICABLE',
  },
];
