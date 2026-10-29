/** Step IDs stay stable: existing validation, saved data and checkout are unchanged. */
export function giftWizardSteps(hasCard: boolean): number[] {
  return hasCard ? [0, 1, 2, 3, 4] : [0, 1, 4];
}
export const giftStepKeys = ['choose', 'people', 'personalize', 'delivery', 'review'] as const;
