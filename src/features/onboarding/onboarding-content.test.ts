import { describe, expect, it } from '@jest/globals';
import { ONBOARDING_STEPS } from './onboarding-content';

describe('onboarding content', () => {
  it('contains the three desktop themes in order', () => {
    expect(ONBOARDING_STEPS).toHaveLength(3);
    expect(ONBOARDING_STEPS.map(({ id }) => id)).toEqual([1, 2, 3]);
    expect(ONBOARDING_STEPS[0].title).toBe(
      'Gérez vos produits, variantes et stocks avec rigueur',
    );
    expect(ONBOARDING_STEPS[1].title).toBe(
      'Enregistrez vos ventes et encaissez en quelques secondes',
    );
    expect(ONBOARDING_STEPS[2].title).toBe(
      'Suivez vos achats, vos dépenses et vos rapports certifiés',
    );
  });

  it('covers SKU tracking and mobile sales actions', () => {
    expect(ONBOARDING_STEPS[0].points[0].title).toContain('SKU');
    expect(ONBOARDING_STEPS[1].subtitle).toContain('tactile');
    expect(ONBOARDING_STEPS[2].points).toHaveLength(3);
  });
});
