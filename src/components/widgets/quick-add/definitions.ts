export interface QuickAddDefinition {
  name: string;
  typeName: string;
  subTypeName: string;
  distanceMode: 'REQUIRED' | 'OPTIONAL' | 'NOT_APPLICABLE';
}

export const quickAddDefinitions: QuickAddDefinition[] = [
  {
    name: 'Elliptical',
    typeName: 'Indoor Cardio',
    subTypeName: 'Elliptical',
    distanceMode: 'OPTIONAL',
  },
  {
    name: 'Weight Training',
    typeName: 'Strength Training',
    subTypeName: 'Weight Training',
    distanceMode: 'NOT_APPLICABLE',
  },
  {
    name: 'Yoga',
    typeName: 'Fitness & Flexibility',
    subTypeName: 'Yoga',
    distanceMode: 'NOT_APPLICABLE',
  },
];
