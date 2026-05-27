type AvatarSize = 64 | 128 | 256 | 512 | 1000;
type PlayerProfile = {
  username: string;
  avatarUrl: string | null;
};
/**
 * Data structure for a purchase, documented for game use.
 *
 * Because intended consumer is the game, we use decimal credits.
 */
type PurchaseData = {
  purchaseToken: string;
  productSku: string;
  credits: number;
  createdAt: number;
  completedAt: number | null;
  estimatedRevenue: number;
  price: number;
  currency: string;
};
/**
 * Data structure for a subscription offer + the wallet's current
 * entitlement for it. Mirrored in the `SubscriptionsSigned` JWS so
 * games can server-verify the same payload they received over the SDK.
 */
type SubscriptionData = {
  sku: string;
  displayName: string;
  displayDescription: string | null;
  price: number;
  currency: string;
  billingPeriod: "monthly" | "weekly" | "yearly";
  status: "active" | "inactive";
  estimatedRevenue: number;
};

type NotificationPriority = "low" | "medium" | "high" | "critical";
type ReferralNotificationVariant = {
  title?: string | null;
  body: string;
  ctaText: string;
  imageReference?: string | null;
};
type ReferralNotificationTemplate = {
  minConversionCount: number;
  variants: ReferralNotificationVariant[];
};

/**
 * Player data — a simple key-value store for per-player state,
 * persisted across sessions and devices.
 *
 * Use this when your game does not have its own backend. Data is
 * stored alongside the player record on the Jest platform.
 *
 * Constraints:
 * - Values must be JSON-serializable.
 * - Limited to 1 MB per game per player; further writes fail
 *   until the stored data size is reduced.
 * - Written directly from the client — do NOT store sensitive
 *   information or data requiring strong security guarantees.
 * - Writes are batched. Use `flush()` to force an immediate sync.
 *
 * Docs: https://docs.jest.com/sdk/html5/player#player-data
 */
interface PlayerDataModule {
  /**
   * Returns the value for a key, or `undefined` if not set.
   *
   * @throws {Error} If the SDK is not initialized.
   */
  get(key: string): unknown;
  /**
   * Returns a snapshot of all player data.
   *
   * Modifying the returned object does NOT update stored data;
   * use `set()` to write back.
   *
   * @throws {Error} If the SDK is not initialized.
   */
  getAll(): Record<string, unknown>;
  /**
   * Sets a single key-value pair.
   *
   * @throws {Error} If the SDK is not initialized.
   */
  set(key: string, value: unknown): void;
  /**
   * Shallow-merges multiple key-value pairs into player data.
   *
   * Existing keys not in `partial` are preserved. To remove a key,
   * use `delete()` (or set its value to `undefined`).
   *
   * @throws {Error} If the SDK is not initialized.
   * @example
   * ```typescript
   * JestSDK.data.set({ score: 100, level: 2 });
   * ```
   */
  set(partial: Record<string, unknown>): void;
  /**
   * Deletes a key from player data.
   *
   * @throws {Error} If the SDK is not initialized.
   */
  delete(key: string): void;
  /**
   * Forces all pending writes to be persisted to the server.
   *
   * The SDK batches writes by default. Call this when data must
   * be persisted right away (e.g. before navigating away from
   * the game or ending a critical session).
   *
   * @throws {Error} If the SDK is not initialized.
   */
  flush(): Promise<void>;
}
/**
 * Options for {@link NotificationsModule.scheduleNotification}.
 *
 * Provide exactly one of `scheduledAt` (exact time) or `scheduledInDays`
 * (fuzzy timing).
 */
type ScheduleNotificationOptions = {
  /**
   * Stable identifier for this notification. Used to replace or
   * unschedule it later. Scheduling with an existing identifier
   * automatically replaces the previous notification.
   */
  identifier?: string;
  /**
   * Main body text of the notification.
   */
  body: string;
  /**
   * Optional title; rendered above the body where supported.
   */
  title?: string;
  /**
   * Call-to-action button label. Must be 1–25 characters.
   */
  ctaText: string;
  /**
   * Higher-priority notifications are weighted more heavily when
   * the platform selects which notification to deliver per day.
   * Defaults to `"low"`.
   */
  priority: NotificationPriority;
  /**
   * Reference to a pre-approved image from the Developer Console's
   * Assets Library. Falls back to the game's Hero image if missing
   * or unapproved.
   */
  assetReference?: string;
  /**
   * @deprecated Use {@link assetReference} instead.
   */
  imageReference?: string;
  /**
   * Optional metadata embedded into the notification's link.
   * Available via `JestSDK.getEntryPayload()` when the player taps
   * the notification.
   */
  entryPayload?: Record<string, unknown>;
} & (
  | {
      /**
       * Exact scheduled delivery time. Must be within the next 7 days.
       * Use this for fixed events or deadlines.
       */
      scheduledAt: Date;
      scheduledInDays?: never;
    }
  | {
      scheduledAt?: never;
      /**
       * Days from now to deliver the notification (1–7, inclusive).
       * The platform picks an optimal delivery time within that window
       * for each player.
       */
      scheduledInDays: number;
    }
);
/**
 * Notifications — schedule SMS / RCS / Library re-engagement
 * messages for the current player.
 *
 * Only registered players receive notifications. Check via
 * `getPlayer().registered` before scheduling — calls for guest
 * players are valid but won't be delivered.
 *
 * Delivery: scheduled notifications appear in the platform Library tab.
 * Once per day the platform also selects at most one notification per
 * user across all games to deliver as SMS/RCS, weighted by `priority`.
 * Delivery time is platform-determined per user, respecting compliance
 * (quiet hours, opt-outs).
 *
 * Jest handles consent, opt-outs, and messaging cost subsidization.
 *
 * Docs: https://docs.jest.com/sdk/html5/notifications
 */
interface NotificationsModule {
  /**
   * Schedules a notification for the current player.
   *
   * Provide either `scheduledAt` (exact time) or `scheduledInDays`
   * (fuzzy timing — the platform picks an optimal delivery time per
   * user), but not both.
   *
   * Scheduling with an existing `identifier` automatically replaces
   * the previous notification — no need to unschedule first.
   *
   * Constraints (out-of-range values throw `INVALID_ARGUMENTS`):
   * - `scheduledAt` must be within the next 7 days
   * - `scheduledInDays` must be an integer 1–7 (inclusive)
   * - `ctaText` must be 1–25 characters
   *
   * Use exact scheduling for fixed events/deadlines. Use fuzzy
   * scheduling for time-of-day-flexible re-engagement (lets the
   * platform optimize delivery).
   *
   * See {@link ScheduleNotificationOptions} for field-level docs.
   *
   * @throws {Error} If the SDK is not initialized or arguments are invalid.
   * @example
   * ```typescript
   * // Fuzzy: platform picks optimal time within day 2
   * JestSDK.notifications.scheduleNotification({
   *   identifier: "retention_d2",
   *   scheduledInDays: 2,
   *   body: "Your crops are ready to harvest",
   *   ctaText: "Play",
   *   priority: "medium",
   *   entryPayload: { source: "retention_d2" },
   * });
   * ```
   */
  scheduleNotification(options: ScheduleNotificationOptions): void;
  /**
   * Cancels a previously scheduled notification by identifier.
   *
   * Safe to call with an unknown identifier (no-op).
   *
   * @throws {Error} If the SDK is not initialized or arguments are invalid.
   */
  unscheduleNotification(options: { identifier: string }): void;
}
/**
 * Referrals — invite friends via shareable links and track which
 * conversions came from which campaign.
 *
 * Conversions are grouped by `reference`, a stable campaign key
 * you choose (e.g. `"unlock_party_mode_v1"`, `"share_score"`).
 * Only invited players who complete registration count.
 *
 * Both methods work for guest and registered players.
 *
 * For high-stakes rewards (entitlements, currency), verify
 * `referralsSigned` server-side instead of trusting the client.
 *
 * Docs: https://docs.jest.com/sdk/html5/referrals
 */
interface ReferralsModule {
  /**
   * Returns all referral conversions for the current player,
   * grouped by `reference`.
   *
   * @returns
   * - `referrals` — map of reference → array of `{ playerId, joinedAt }`
   *   (where `joinedAt` is an ISO 8601 timestamp).
   * - `referralsSigned` — HS256 JWS for server-side verification,
   *   signed with the game's shared secret. Verified payload shape:
   *   `{ referrals, aud: gameId, sub: referrerPlayerId }`.
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
   * Opens the platform share dialog with a referral link.
   *
   * Only opens the dialog — does NOT guarantee the player completes
   * the share. The promise resolves once the dialog closes.
   *
   * @param opts.reference - Stable campaign key for grouping conversions
   *   (e.g. `"unlock_party_mode_v1"`).
   * @param opts.entryPayload - Metadata embedded into the shared link,
   *   delivered to the invited player via `getEntryPayload()`.
   *   Useful for attribution, custom invite context, etc.
   * @param opts.shareTitle - Title shown in the share sheet (platform-dependent).
   * @param opts.shareText - Body text shown in the share sheet.
   * @param opts.onboardingSlug - Optional game slug to route invited
   *   players through an onboarding game first.
   * @param opts.notificationTemplates - Optional templates used to notify
   *   the referrer when invited players convert. Each template applies
   *   above its `minConversionCount` threshold; the server picks the
   *   template with the highest matching threshold and a variant from
   *   within it.
   * @returns `canceled: true` if the player dismissed the dialog.
   *
   * @example Share + check conversions later
   * ```typescript
   * // When the player taps "Invite friends":
   * await JestSDK.referrals.shareReferralLink({
   *   reference: "unlock_party_mode_v1",
   *   shareTitle: "Come play this with me",
   *   shareText: "Join me — I want to unlock Party Mode.",
   * });
   *
   * // Later (e.g. on resume): check how many invites converted
   * const { referrals } = await JestSDK.referrals.listReferrals();
   * const inviteCount = (referrals["unlock_party_mode_v1"] ?? []).length;
   * if (inviteCount >= 3) {
   *   unlockPartyMode();
   * }
   * ```
   *
   * @throws {Error} If the SDK is not initialized or arguments are invalid.
   */
  shareReferralLink: (opts: {
    reference: string;
    entryPayload?: Record<string, unknown>;
    shareTitle?: string;
    shareText?: string;
    onboardingSlug?: string;
    notificationTemplates?: ReferralNotificationTemplate[];
  }) => Promise<{
    canceled: boolean;
  }>;
}
/**
 * Social - create social interactions between players.
 *
 * Get the profile of the current player if available. Only registered
 * users will have a profile and only after they have set it up.
 *
 * In case you need to fill in gaps with bots, we provide avatars generated by
 * the platform. Those are deterministically picked based on the provided username.
 * The avatars can be scaled to the requested size to reduce network usage.
 *
 * Docs: https://docs.jest.com/sdk/html5/social
 */
interface SocialModule {
  /**
   * Returns the profile of the currently logged in player.
   * @param opts - Options for getting the profile
   * @param opts.avatarSize - The size for width and height of the avatar
   * @returns The profile of the currently logged in player
   * @throws {Error} If the SDK is not initialized.
   */
  getProfile: (opts?: { avatarSize: AvatarSize }) => PlayerProfile | null;
  /**
   * Gets the avatar URL for a bot given its username
   * @param opts - Options for getting the avatar URL
   * @param opts.size - The size for width and height of the avatar in pixels
   * @param opts.username - The username of the bot used as a seed for the avatar
   * @returns The generated avatar URL
   * @example
   * ```typescript
   * const avatarUrl = sdk.getBotAvatar({ size: 128, username: "bot" });
   * ```
   */
  getBotAvatar(opts: { size?: AvatarSize; username: string }): string;
}
/**
 * Payments — sell in-game products in USD.
 *
 * Players purchase products you configure in the Developer Console
 * directly in USD on the Jest platform. Jest handles checkout
 * end-to-end with the player.
 *
 * **Purchase lifecycle:**
 * 1. List products via {@link PaymentsModule.getProducts | getProducts}.
 * 2. Start checkout via {@link PaymentsModule.beginPurchase | beginPurchase}.
 * 3. Grant the item to the player.
 * 4. Confirm via {@link PaymentsModule.completePurchase | completePurchase}.
 * 5. On startup, recover incomplete purchases via {@link PaymentsModule.getIncompletePurchases | getIncompletePurchases}.
 *
 * **Critical: always grant before confirming.** If the game crashes
 * after confirming but before granting, the purchase can't be
 * recovered (it's no longer incomplete).
 *
 * **Server-side verification (recommended):** for any grant that
 * affects entitlements or currency, send `purchaseSigned` /
 * `purchasesSigned` to your backend, verify the HS256 JWS with your
 * shared secret, and use `purchaseToken` as an idempotency key.
 *
 * **Sandbox testing:** sandbox users see real product prices in the
 * game UI, but the platform checkout modal makes clear that no charge
 * will be made and the resulting purchase records 0 credits.
 *
 * Docs: https://docs.jest.com/sdk/html5/payments
 */
interface PaymentsModule {
  /**
   * Lists products available for purchase, configured in the
   * Developer Console.
   *
   * @returns Array of `{ sku, name, description, price, currency }` where
   *   `price` is in the specified `currency` (typically USD).
   * @throws {Error} If the SDK is not initialized or the request fails.
   */
  getProducts(): Promise<
    Array<{
      sku: string;
      name: string;
      description: string | null;
      price: number;
      currency: string;
    }>
  >;
  /**
   * Starts the platform checkout flow for a product.
   *
   * On success, the returned purchase is **incomplete** — your game
   * must grant the item and then call `completePurchase`.
   *
   * @param options.productSku - SKU from `getProducts()`.
   * @returns One of:
   * - `{ result: "success", purchase, purchaseSigned }` — checkout
   *   completed. Use `purchaseSigned` for server-side verification.
   * - `{ result: "cancel" }` — player canceled the flow.
   * - `{ result: "error", error: "internal_error" }` — transient;
   *   safe to retry.
   * - `{ result: "error", error: "invalid_product" }` — SKU not
   *   available; do NOT retry with the same SKU.
   *
   * May also throw on transient errors (e.g. timeout) — treat
   * thrown errors as retryable.
   *
   * @example Full purchase flow (grant before confirm)
   * ```typescript
   * const result = await JestSDK.payments.beginPurchase({
   *   productSku: "powerup_pack_1",
   * });
   *
   * if (result.result !== "success") {
   *   if (result.result === "error") {
   *     console.error("Purchase failed:", result.error);
   *   }
   *   return;
   * }
   *
   * // Recommended: send result.purchaseSigned to your backend to verify
   * // and grant. Use result.purchase.purchaseToken as an idempotency key.
   * await grantItem(result.purchase.productSku);
   *
   * // Only confirm AFTER granting succeeded.
   * await JestSDK.payments.completePurchase({
   *   purchaseToken: result.purchase.purchaseToken,
   * });
   * ```
   *
   * @throws {Error} If the SDK is not initialized or arguments are invalid.
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
   * Confirms a purchase, marking it complete on the platform.
   *
   * **Only call this AFTER the item has been durably granted.**
   * If you confirm first and crash before granting, the purchase
   * can't be recovered.
   *
   * @param options.purchaseToken - Token from `beginPurchase` or
   *   `getIncompletePurchases`.
   * @returns `{ result: "success" }` or:
   * - `error: "internal_error"` — transient; retry later. Leaving
   *   the purchase incomplete is safe; it will reappear in
   *   `getIncompletePurchases`.
   * - `error: "invalid_token"` — already confirmed, wrong player,
   *   etc. Do NOT retry with the same token.
   *
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
   * Starts the platform checkout flow for a subscription.
   *
   * @param options.subscriptionSku - SKU of the subscription to subscribe to.
   * @returns One of:
   * - `{ result: "success", subscription, subscriptionSigned }` — subscribed.
   * - `{ result: "cancel" }` — player canceled the flow.
   * - `{ result: "error", error }` — see error code for details.
   *
   * @throws {Error} If the SDK is not initialized or arguments are invalid.
   */
  beginSubscription(options: { subscriptionSku: string }): Promise<
    | {
        result: "success";
        subscription: SubscriptionData;
        subscriptionSigned: string;
      }
    | {
        result: "cancel";
      }
    | {
        result: "error";
        error:
          | "internal_error"
          | "invalid_subscription"
          | "already_subscribed"
          | "guest_not_allowed";
      }
  >;
  /**
   * Returns purchases that started checkout but were never confirmed.
   *
   * **Call this on every startup** to handle purchases that succeeded
   * at checkout but never reached `completePurchase` (e.g. due to a
   * crash, network failure, or app close).
   *
   * For each returned purchase: grant the item (using `productSku`),
   * then call `completePurchase`. The response is capped at 50
   * purchases — if `hasMore` is true, call again until it's false.
   *
   * Use `purchasesSigned` for server-side verification before granting.
   *
   * @example Recovery loop on startup
   * ```typescript
   * let hasMore = true;
   * while (hasMore) {
   *   const result = await JestSDK.payments.getIncompletePurchases();
   *
   *   for (const purchase of result.purchases) {
   *     // Recommended: verify result.purchasesSigned on your backend
   *     await grantItem(purchase.productSku);
   *
   *     await JestSDK.payments.completePurchase({
   *       purchaseToken: purchase.purchaseToken,
   *     });
   *   }
   *
   *   hasMore = result.hasMore;
   * }
   * ```
   */
  getIncompletePurchases(): Promise<{
    hasMore: boolean;
    purchases: Array<PurchaseData>;
    purchasesSigned: string;
  }>;
  /**
   * Lists subscription offers for this game along with the player's
   * current entitlement on each one.
   *
   * Subscriptions are configured per-game in the Developer Console and
   * billed in USD on a recurring cadence (currently monthly only).
   *
   * Each entry's `active` field is `"active"` if the player currently
   * holds the subscription and `"inactive"` otherwise. Grant the
   * entitlement when `active === "active"`.
   *
   * **Server-side verification (recommended):** for any grant tied to a
   * subscription, send `signed` to your backend and verify the HS256
   * JWS with your shared game secret. The signed payload carries the
   * same `subscriptions` array.
   *
   * For guest players, `subscriptions` is an empty array.
   *
   * @throws {Error} If the SDK is not initialized or the request fails.
   */
  getSubscriptions(): Promise<{
    subscriptions: SubscriptionData[];
    signed: string;
  }>;
  /**
   * Opens a cancellation confirmation dialog for the specified subscription.
   *
   * If the user confirms, the subscription is cancelled at the end of the
   * current billing period (the user retains access until then).
   *
   * @param options.subscriptionSku - The SKU of the subscription to cancel.
   * @returns Result indicating success, user dismissed, or an error.
   * @throws {Error} If the SDK is not initialized or arguments are invalid.
   */
  cancelSubscription(options: { subscriptionSku: string }): Promise<
    | {
        result: "success";
      }
    | {
        result: "cancel";
      }
    | {
        result: "error";
        error:
          | "internal_error"
          | "not_found"
          | "not_active"
          | "guest_not_allowed";
      }
  >;
}
type Jest = JestSDK & {
  /**
   * Initializes the SDK. Must be called before any other SDK method.
   * Safe to call multiple times — subsequent calls return the same
   * ready promise.
   *
   * @example Typical app startup
   * ```typescript
   * await JestSDK.init();
   *
   * const player = JestSDK.getPlayer();
   * if (!player.registered) {
   *   // Optionally prompt registration at the right moment
   * }
   *
   * // Recover any purchases from a previous session that crashed
   * await recoverPurchasesOnStartup();
   *
   * startGame();
   * ```
   */
  init: (opts?: {
    /**
     * When set to false, disables the automatic login reminder popups that appear
     * at escalating intervals for unregistered users. Manual login via `JestSDK.login()`
     * is unaffected. Defaults to true.
     */
    autoLoginReminders?: boolean;
    /**
     * @deprecated mock is no longer used - it is automatically determined based on whether the app is run inside Jest or as standalone.
     */
    mock?: boolean;
  }) => Promise<void>;
};
/**
 * The JestSDK runtime API, exposed as a global when the SDK script is
 * loaded from `https://cdn.jest.com/sdk/latest/jestsdk.js`.
 *
 * Call {@link Jest.init} once on startup, then use the methods below to
 * interact with the player, schedule notifications, sell products, and
 * track referrals. Most methods throw if called before initialization.
 *
 * Docs: https://docs.jest.com/sdk/html5
 */
interface JestSDK {
  /**
   * Resolves once the SDK is fully initialized and player data is loaded.
   *
   * `init()` already returns this promise — call `isReady()` only when
   * you need to await initialization from a different code path that
   * doesn't have access to the original `init()` promise.
   *
   * @throws {Error} If initialization times out or the SDK was never initialized.
   */
  isReady(): Promise<void>;
  /**
   * Returns the entry payload for this game session, or an empty object
   * if no payload was supplied.
   *
   * The entry payload is arbitrary metadata attached to the link the
   * player used to enter the game. Common sources include:
   * - Referral links (from `referrals.shareReferralLink`)
   * - Notification links (from `notifications.scheduleNotification`)
   * - Onboarding game handoffs
   *
   * Typical use cases: difficulty selection, referral attribution,
   * restoring context after registration, A/B test variants.
   *
   * @returns The entry payload as a JSON object (always a `Record`, never null).
   * @throws {Error} If the SDK is not initialized.
   * @example
   * ```typescript
   * const payload = JestSDK.getEntryPayload();
   * const difficulty = payload.difficulty ?? "normal";
   * ```
   */
  getEntryPayload(): Record<string, unknown>;
  /**
   * Returns the current player's identity.
   *
   * Each player has a `playerId` that is stable per-game and persists
   * across sessions and devices, including when a guest later registers.
   * Use this to key your own player state.
   *
   * - `registered: false` — guest player. Cannot receive notifications.
   *   Prompt registration via `login()` or `showRegistrationOverlay()`.
   * - `registered: true` — has a Jest account. `username` and `avatarUrl`
   *   are platform values you may use in your UI.
   *
   * @returns The player object. `username`/`avatarUrl` are `null` for guests.
   * @throws {Error} If the SDK is not initialized.
   * @example
   * ```typescript
   * const player = JestSDK.getPlayer();
   * if (!player.registered) {
   *   // Guest — consider prompting registration
   * }
   * ```
   */
  getPlayer(): {
    playerId: string;
    registered: boolean;
    username: string | null;
    avatarUrl: string | null;
  };
  /**
   * Returns a signed player payload for server-side verification.
   *
   * Use this when your game has a backend and needs to authenticate
   * the player for server requests. `playerSigned` is a JWS (HS256)
   * signed with your game's shared secret (configured in the Developer
   * Console → Games → Secrets).
   *
   * Verify it on your backend with any standard JWT library. The
   * decoded payload has the shape:
   * ```ts
   * {
   *   player: { playerId, registered, username, avatarUrl };
   *   iat: number;  // issued-at timestamp
   *   aud: string;  // game id
   *   sub: string;  // player id
   * }
   * ```
   *
   * Jest does not set an explicit expiration; reject tokens older than
   * a chosen threshold (e.g. 24h) and request a new one when needed.
   *
   * Works for both registered and guest players.
   *
   * Docs: https://docs.jest.com/sdk/html5/player#jestsdkgetplayersigned
   *
   * @example Authenticate a backend request
   * ```typescript
   * const { playerSigned } = await JestSDK.getPlayerSigned();
   * await fetch("/api/save-progress", {
   *   method: "POST",
   *   headers: { authorization: `Bearer ${playerSigned}` },
   *   body: JSON.stringify({ score: 1500 }),
   * });
   * // Server verifies playerSigned (HS256, game's shared secret)
   * // before trusting the request.
   * ```
   *
   * @throws {Error} If the SDK is not initialized or the request fails.
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
   * Reports loading progress (0–100) to the platform loading overlay.
   *
   * Only takes effect when the game's loading screen mode is set to
   * "Manual" in the Developer Console. In Manual mode, the overlay is
   * shown automatically on game entry; the game is responsible for
   * progress and dismissal.
   *
   * - Values outside 0–100 are clamped; non-integers are rounded.
   * - Reaching 100 dismisses the overlay with a fade-out.
   * - Safety timeout: if no progress update is received for 15 seconds,
   *   the platform exits the player to the home screen. Each call
   *   resets this timer.
   *
   * Docs: https://docs.jest.com/sdk/html5/loading-screen
   *
   * @param progress - Loading progress from 0 to 100.
   */
  setLoadingProgress(progress: number): void;
  /**
   * Opens the platform's built-in registration popup.
   *
   * The flow is completed via SMS/RCS, then the player is redirected
   * back into the game. Converting guests to registered players is
   * critical for retention — registered players can receive
   * notifications and won't lose progress when the session ends.
   *
   * Use this for the simplest integration; use
   * {@link showRegistrationOverlay} for a fully custom UI.
   *
   * The platform also triggers automatic registration prompts at
   * escalating intervals; opt out via `init({ autoLoginReminders: false })`.
   *
   * @param opts.entryPayload - Optional metadata embedded in the login link.
   *   Available via {@link getEntryPayload} after the player returns.
   *   Useful for tracking where login was initiated.
   * @throws {Error} If the SDK is not initialized, the player is already
   *   registered, or the entry payload is invalid.
   */
  login(opts?: { entryPayload?: Record<string, unknown> }): void;
  /**
   * Shows a minimal registration overlay and returns action handlers
   * for the game to wire into its own UI.
   *
   * This is the customizable alternative to {@link login}. The platform
   * still renders the required legal text and a close button, but the
   * game owns the rest of the UI (e.g. positioning, copy, buttons).
   *
   * @param opts.theme - "light" or "dark". Defaults to "dark".
   * @param opts.onClose - Called when the overlay is dismissed
   *   (either via the built-in close button or `closeButtonAction`).
   * @param opts.entryPayload - Optional metadata embedded in the login
   *   link, available via {@link getEntryPayload} after registration.
   * @returns Two functions to wire into your in-game UI:
   *   - `loginButtonAction()` — starts the platform login flow
   *   - `closeButtonAction()` — closes the overlay
   *
   * @example Wire actions to in-game UI
   * ```typescript
   * if (!JestSDK.getPlayer().registered) {
   *   const { loginButtonAction, closeButtonAction } =
   *     JestSDK.showRegistrationOverlay({
   *       theme: "light",
   *       onClose: () => closeGamePopup(),
   *     });
   *
   *   myLoginButton.onclick = loginButtonAction;
   *   myCloseButton.onclick = closeButtonAction;
   * }
   * ```
   *
   * @throws {Error} If the SDK is not initialized or arguments are invalid.
   */
  showRegistrationOverlay(opts?: {
    theme?: "light" | "dark";
    onClose?: () => void;
    entryPayload?: Record<string, unknown>;
  }): {
    loginButtonAction: () => void;
    closeButtonAction: () => void;
  };
  /**
   * Records a custom analytics event for the current player.
   *
   * Events are visible in the Developer Console and can be used to
   * track in-game milestones, funnel steps, and feature usage.
   *
   * Property values should be JSON-serializable primitives or simple
   * objects. Avoid storing PII or sensitive data in event properties.
   *
   * @param eventName - Name of the event (e.g. `"level_complete"`).
   *   Use stable, lowercase, snake_case names.
   * @param properties - Optional structured data attached to the event
   *   (e.g. `{ level: 5, score: 1200 }`).
   * @throws {Error} If the SDK is not initialized or arguments are invalid.
   */
  captureEvent(eventName: string, properties?: Record<string, unknown>): void;
  /** Player data — see {@link PlayerDataModule}. */
  data: PlayerDataModule;
  /** Notifications — see {@link NotificationsModule}. */
  notifications: NotificationsModule;
  /** Referrals — see {@link ReferralsModule}. */
  referrals: ReferralsModule;
  /** Payments — see {@link PaymentsModule}. */
  payments: PaymentsModule;
  /** Social - see {@link SocialModule} */
  social: SocialModule;
}
/**
 * The global JestSDK singleton — the entry point for all SDK usage in
 * HTML5 games.
 *
 * Available as `window.JestSDK` after loading the SDK script:
 * ```html
 * <script src="https://cdn.jest.com/sdk/latest/jestsdk.js"></script>
 * ```
 *
 * Call `JestSDK.init()` first; then use the methods documented on the
 * {@link JestSDK} interface (e.g. `JestSDK.getPlayer()`,
 * `JestSDK.notifications.scheduleNotification(...)`).
 *
 * The {@link Jest} type describes this singleton's full shape,
 * including the `init` method.
 */
declare const JestSDK: Jest;
