/** --- This file is take from https://cdn.jest.com/sdk/latest/jestsdk.d.ts **/
/**
 * Public SDK type definitions for game developers.
 *
 * This file is the entry point for generating the bundled jestsdk.d.ts
 * that ships alongside the SDK on the CDN. It contains only the public
 * API surface — no internal methods, no deprecated APIs, no zod.
 *
 * Sync with the real JestSDK interface is enforced at compile time
 * by public-types.check.ts.
 */
/**
 * Purchase data returned by the payments API.
 */
type PurchaseData = {
  purchaseToken: string;
  productSku: string;
  credits: number;
  createdAt: number;
  completedAt: number | null;
  estimatedRevenue: number;
};
/**
 * Notification priority levels.
 */
type NotificationPriority = "low" | "medium" | "high" | "critical";
/**
 * The JestSDK singleton type, including the `init` method.
 */
type Jest = JestSDK & {
  init: (opts?: {
    /**
     * When set to false, disables the automatic login reminder popups that appear
     * at escalating intervals for unregistered users. Manual login via `JestSDK.login()`
     * is unaffected. Defaults to true.
     */
    autoLoginReminders?: boolean;
  }) => Promise<void>;
};
/**
 * The public JestSDK interface available to game developers.
 */
interface JestSDK {
  /**
   * Waits for the SDK to be fully initialized with player data.
   *
   * @returns A promise that resolves when the player is set.
   * @throws {Error} If initialization times out or the SDK is not initialized.
   */
  isReady(): Promise<void>;
  /**
   * Returns the payload associated with this entry into the game.
   *
   * The payload is included in the link that the player entered the game from and is attached by the sender.
   * That can be a reminder link sent to the player's inbox or a referral link shared with a friend.
   * It can also be attached by the onboarding game associated with the title, if such exists.
   *
   * @returns The entry payload as a JSON object.
   * @throws {Error} If the SDK is not initialized.
   * @example
   * ```typescript
   * const payload = JestSDK.getEntryPayload();
   * console.log(payload.referralCode);
   * ```
   */
  getEntryPayload(): Record<string, unknown>;
  /**
   * Gets player info
   * @returns The player object
   * @throws {Error} If the player is not initialized.
   * @example
   * ```typescript
   * const player = sdk.getPlayer();
   * console.log(player.playerId);
   * ```
   * */
  getPlayer(): {
    playerId: string;
    registered: boolean;
    username: string | null;
    avatarUrl: string | null;
  };
  /**
   * Gets signed player payload for server-side verification.
   * @async
   * @returns A promise resolving to the public player payload and JWS signature.
   * @throws {Error} If the SDK is not initialized or the request fails.
   * @example
   * ```typescript
   * const { player, playerSigned } = await sdk.getPlayerSigned();
   * console.log(player.playerId, playerSigned);
   * ```
   */
  getPlayerSigned(): Promise<{
    player: {
      playerId: string;
      registered: boolean;
      username: string | null;
      avatarUrl: string | null;
    };
    playerSigned: string;
  }>;
  /**
   * Reports loading progress to the platform loading screen overlay.
   * Only works when the game's loading screen mode is set to "manual" in the management console.
   * The overlay is shown automatically when the game loads in manual mode.
   * @param progress - Loading progress from 0 to 100. Setting progress to 100 dismisses the overlay.
   */
  setLoadingProgress(progress: number): void;
  /**
   * Initiates a login flow with a registration code.
   * @param opts - Configuration for the login prompt.
   * @param opts.entryPayload - Optional additional data to include in the entry payload. This will be accessible as `getEntryPayload()` after login.
   * @throws {Error} If the SDK is not initialized or arguments are invalid.
   */
  login(opts?: { entryPayload?: Record<string, unknown> }): void;
  /**
   * Shows the registration overlay.
   * @param opts - Configuration for the registration overlay.
   * @param opts.onClose - Callback function to be executed when the overlay is closed.
   * @param opts.entryPayload - Optional additional data to include in the entry payload. This will be accessible as `getEntryPayload()` after registration.
   * @throws {Error} If the SDK is not initialized or arguments are invalid.
   */
  showRegistrationOverlay(opts?: {
    theme?: "light" | "dark";
    onClose?: () => void;
    entryPayload?: Record<string, unknown>;
  }):
    | {
        loginButtonAction: () => void;
        closeButtonAction: () => void;
      }
    | {
        error: "could_not_acquire_lease";
      };
  /**
   * Player data namespace - provides a cleaner API for data operations.
   */
  data: {
    /**
     * Gets a single value from player data.
     * @param key - The key to retrieve.
     * @returns The value, or undefined if not found.
     * @throws {Error} If the player is not initialized.
     * @example
     * ```typescript
     * const score = JestSDK.data.get("score");
     * ```
     */
    get(key: string): unknown;
    /**
     * Gets all player data.
     * @returns A shallow copy of all player data.
     * @throws {Error} If the player is not initialized.
     * @example
     * ```typescript
     * const allData = JestSDK.data.getAll();
     * ```
     */
    getAll(): Record<string, unknown>;
    /**
     * Sets a single value in player data.
     * @param key - The key to set.
     * @param value - The value to store.
     * @throws {Error} If the player is not initialized.
     * @example
     * ```typescript
     * JestSDK.data.set("score", 100);
     * ```
     */
    set(key: string, value: unknown): void;
    /**
     * Sets multiple values in player data.
     * @param partial - An object with key-value pairs to merge.
     * @throws {Error} If the player is not initialized.
     * @example
     * ```typescript
     * JestSDK.data.set({ score: 100, level: 2 });
     * ```
     */
    set(partial: Record<string, unknown>): void;
    /**
     * Deletes a key from player data (sets it to undefined).
     * @param key - The key to delete.
     * @throws {Error} If the player is not initialized.
     * @example
     * ```typescript
     * JestSDK.data.delete("tempData");
     * ```
     */
    delete(key: string): void;
    /**
     * Waits for all pending data updates to be saved by the server.
     * @returns Promise that resolves when all updates are acknowledged.
     * @throws {Error} If the player is not initialized.
     * @example
     * ```typescript
     * JestSDK.data.set("score", 100);
     * await JestSDK.data.flush();
     * ```
     */
    flush(): Promise<void>;
  };
  /**
   * Notifications API namespace.
   */
  notifications: {
    /**
     * Schedules a notification with rich content including images.
     * Note: notifications can only be scheduled up to 7 days ahead. `scheduledInDays` must be between 1 and 7 (inclusive), and `scheduledAt` must be within the next 7 days; out-of-range values throw.
     * @param options - Notification details.
     * @param options.scheduledAt - When to send the notification (exact time, must be within the next 7 days). Mutually exclusive with scheduledInDays.
     * @param options.scheduledInDays - Days from now to send the notification (1-7, fuzzy timing). Mutually exclusive with scheduledAt.
     * @param options.assetReference - Optional reference to an asset from the Assets Library (e.g., "my-asset-reference"). If omitted, the game's hero image will be used when available.
     * @param options.imageReference - @deprecated Use assetReference instead.
     * @param options.body - Main body text of the notification.
     * @param options.ctaText - Call-to-action button text.
     * @param options.priority - Priority level of the notification ("low", "medium", or "high"). Defaults to "low".
     * @param options.identifier - Unique identifier for the notification.
     * @param options.entryPayload - Optional payload data accessible when the notification is clicked.
     * @throws {Error} If the SDK is not initialized or arguments are invalid.
     * @example
     * ```typescript
     * // Using exact time
     * JestSDK.notifications.scheduleNotification({
     *   scheduledAt: new Date(Date.now() + 60000),
     *   body: "Check out the latest updates in the game",
     *   ctaText: "Play Now",
     *   priority: "high",
     *   identifier: "daily-reminder"
     * });
     *
     * // Using days (fuzzy timing)
     * JestSDK.notifications.scheduleNotification({
     *   scheduledInDays: 2,
     *   body: "Your crops are ready to harvest",
     *   ctaText: "Play Now",
     *   priority: "medium",
     *   identifier: "retention-reminder"
     * });
     * ```
     */
    scheduleNotification(
      options: {
        assetReference?: string;
        /** @deprecated Use assetReference instead */
        imageReference?: string;
        body: string;
        title?: string;
        ctaText: string;
        priority: NotificationPriority;
        identifier?: string;
        entryPayload?: Record<string, unknown>;
      } & (
        | {
            scheduledAt: Date;
            scheduledInDays?: never;
          }
        | {
            scheduledAt?: never;
            scheduledInDays: number;
          }
      ),
    ): void;
    /**
     * Unschedules a previously scheduled notification using the identifier.
     * @param options - Unschedule options.
     * @param options.identifier - The identifier used when scheduling the notification.
     * @throws {Error} If the SDK is not initialized or arguments are invalid.
     */
    unscheduleNotification(options: { identifier: string }): void;
  };
  /**
   * Referrals API namespace for managing referral links and tracking conversions.
   */
  referrals: {
    /**
     * Returns all referral links for the current player along with their conversions.
     * Works for both registered users and guest players (no login required).
     *
     * @returns An object containing:
     * - `referrals` — a map keyed by reference string, where each value is an array of
     *   referred players with their `playerId` and `joinedAt` (ISO 8601) timestamp.
     * - `referralsSigned` — a JWS-signed version of the referrals map for server-side verification.
     */
    listReferrals: () => Promise<{
      referrals: {
        [reference: string]: {
          playerId: string;
          joinedAt: string;
        }[];
      };
      referralsSigned: string;
    }>;
    /**
     * Opens the platform share dialog to share a referral link.
     * Works for both registered users and guest players (no login required).
     *
     * @param opts - Referral dialog options.
     * @param opts.reference - A unique identifier for this referral link (e.g. a campaign name).
     * @param opts.entryPayload - Optional payload attached to the referral link, passed to referred players on entry.
     * @param opts.shareTitle - Optional title for the share dialog.
     * @param opts.shareText - Optional text for the share dialog.
     * @param opts.onboardingSlug - Optional game slug to redirect referred users to an onboarding game first.
     * @returns A promise that resolves with whether the dialog was canceled by the user.
     * @throws {Error} If the SDK is not initialized or arguments are invalid.
     */
    shareReferralLink: (opts: {
      reference: string;
      entryPayload?: Record<string, unknown>;
      shareTitle?: string;
      shareText?: string;
      onboardingSlug?: string;
    }) => Promise<{
      canceled: boolean;
    }>;
  };
  /**
   * Payments API namespace for in-app purchases.
   */
  payments: {
    /**
     * Retrieves the list of available products for the current game.
     *
     * @returns A promise that resolves with an array of products.
     * @throws {Error} If the SDK is not initialized or the request fails.
     * @example
     * ```typescript
     * const products = await JestSDK.payments.getProducts();
     * products.forEach(product => {
     *   console.log(`${product.name}: $${product.price / 100}`);
     * });
     * ```
     */
    getProducts(): Promise<
      Array<{
        sku: string;
        name: string;
        description: string | null;
        price: number;
      }>
    >;
    /**
     * Begins a platform purchase flow for the specified product.
     *
     * @param options - Purchase configuration.
     * @param options.productSku - The ID of the product to purchase.
     * @returns A promise that resolves with the purchase result containing a purchase token on success.
     * @throws {Error} If the SDK is not initialized or arguments are invalid.
     * @example
     * ```typescript
     * const result = await JestSDK.payments.beginPurchase({
     *   productSku: "powerup-pack-1",
     * });
     * if (result.result === "success") {
     *   console.log('Purchase completed with token:', result.purchaseToken);
     * }
     * ```
     */
    beginPurchase(options: { productSku: string }): Promise<
      | {
          result: "success";
          purchase: PurchaseData;
          purchaseSigned: string;
        }
      | {
          result: "cancel";
        }
      | {
          result: "error";
          error: "internal_error" | "invalid_product";
        }
    >;
    /**
     * Complete a purchase, recording receipt.
     *
     * @param options - Completion info.
     * @param options.purchaseToken - Returned from `beginPurchase`.
     * @returns A promise with a result of the completion attempt. If unsuccessful, result property will be "error" and error will contain a reason.
     * @throws {Error} If the SDK is not initialized or arguments are invalid.
     */
    completePurchase(options: { purchaseToken: string }): Promise<
      | {
          result: "success";
        }
      | {
          result: "error";
          error: "internal_error" | "invalid_token";
        }
    >;
    /**
     * Get purchases that have not yet been completed for this player.
     *
     * Purchases returned here should be credited to the user and `completePurchase` called.
     */
    getIncompletePurchases(): Promise<{
      hasMore: boolean;
      purchases: Array<PurchaseData>;
      purchasesSigned: string;
    }>;
  };
}
declare const JestSDK: Jest;
