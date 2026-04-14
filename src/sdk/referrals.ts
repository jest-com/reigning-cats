/**
 * Jest SDK: Referral links and conversion tracking
 * https://docs.jest.com/sdk/html5/referrals
 *
 * Let players invite friends via shareable referral links.
 * Track conversions grouped by a stable reference key
 * (e.g. "share_score", "unlock_party_mode_v1").
 *
 * An optional entryPayload is embedded into the shared link
 * and available to the invited player via getEntryPayload().
 *
 * Conversions only count invited players who complete registration.
 */

/**
 * Opens the platform share dialog with a referral link to your game.
 * Returns true if the player shared, false if they dismissed the dialog.
 */
export async function shareGame(options: {
  reference: string;
  shareTitle?: string;
  shareText?: string;
  entryPayload?: Record<string, unknown>;
}): Promise<boolean> {
  const { canceled } = await JestSDK.referrals.shareReferralLink(options);
  return !canceled;
}

/**
 * Returns the number of successful referral conversions
 * for a given reference key.
 */
export async function getReferralCount(reference: string): Promise<number> {
  const { referrals } = await JestSDK.referrals.listReferrals();
  return (referrals[reference] ?? []).length;
}

/**
 * Returns all referral conversions grouped by reference,
 * along with a signed payload for server-side verification.
 *
 * Verify referralsSigned on your backend (HS256, same shared
 * secret as payments) before granting rewards.
 */
export async function listReferrals(): Promise<{
  referrals: Record<string, { playerId: string; joinedAt: string }[]>;
  referralsSigned: string;
}> {
  return JestSDK.referrals.listReferrals();
}
