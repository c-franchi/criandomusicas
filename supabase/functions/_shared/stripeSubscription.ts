export function isCreatorSubscriptionForUser(
  subscription: { metadata?: Record<string, string> | null },
  userId: string,
): boolean {
  return subscription.metadata?.plan_type === "creator" && subscription.metadata.user_id === userId;
}
