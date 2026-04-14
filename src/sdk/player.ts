/**
 * Jest SDK: Player identification and authentication
 * https://docs.jest.com/sdk/html5/player
 *
 * Each user has a unique playerId per game. This ID persists
 * even if a guest later registers an account.
 */

/**
 * Returns the current player's ID and registration status.
 */
export function getPlayer(): { playerId: string; registered: boolean } {
  return JestSDK.getPlayer();
}

/**
 * Returns true if the current player has a registered account.
 * Guest players cannot receive notifications.
 */
export function isRegistered(): boolean {
  return JestSDK.getPlayer().registered;
}

/**
 * Returns a signed payload (JWS) for server-side player verification.
 * Verify the HS256 signature using your game's shared secret
 * (base64-encoded, found in the Developer Console).
 *
 * The signed payload includes an issued-at (iat) timestamp;
 * reject tokens older than a chosen threshold on your server.
 */
export async function getPlayerSigned(): Promise<{
  player: { playerId: string; registered: boolean };
  playerSigned: string;
}> {
  return JestSDK.getPlayerSigned();
}

/**
 * Prompts a guest player to register or sign in via the
 * platform login flow (SMS / RCS). The player is redirected
 * back into the game after completing the flow.
 *
 * If provided, entryPayload is passed back to the game on login.
 */
export function promptLogin(entryPayload?: Record<string, unknown>): void {
  JestSDK.login(entryPayload ? { entryPayload } : undefined);
}

/**
 * Returns the entry payload provided when the game was launched,
 * or an empty object if no payload was supplied.
 *
 * Entry payloads are set via the URL used to enter the game and
 * enable use cases like difficulty selection, referral tracking,
 * or onboarding choices.
 */
export function getEntryPayload(): Record<string, unknown> {
  return JestSDK.getEntryPayload();
}
