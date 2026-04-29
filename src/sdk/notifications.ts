/**
 * Jest SDK: Player notifications
 * https://docs.jest.com/sdk/html5/notifications
 *
 * Schedule SMS / RCS notifications to re-engage players.
 * The platform handles delivery, consent, and compliance.
 *
 * Only registered players can receive notifications — check
 * with JestSDK.getPlayer().registered before scheduling.
 *
 * Scheduling modes:
 *   - Exact: scheduledAt (a specific Date, within the next 7 days)
 *   - Fuzzy: scheduledInDays (1–7 days from now; the platform
 *     picks an optimal delivery time per user)
 *
 * Each notification needs an identifier — scheduling with the
 * same identifier replaces the previous notification.
 */

/**
 * Schedules a notification for the current player.
 *
 * Provide either scheduledAt (exact) or scheduledInDays (fuzzy),
 * but not both. CTA text must be 1–25 characters.
 * Priority defaults to "low" if not specified.
 *
 * To attach an image, upload it in the Developer Console first
 * and pass its reference as imageReference.
 */
export function scheduleNotification(
  options: {
    identifier: string;
    body: string;
    title?: string;
    ctaText: string;
    priority: NotificationPriority;
    imageReference?: string;
    entryPayload?: Record<string, unknown>;
  } & (
    | { scheduledAt: Date; scheduledInDays?: never }
    | { scheduledAt?: never; scheduledInDays: number }
  ),
): void {
  JestSDK.notifications.scheduleNotification(options);
}

/**
 * Cancels a previously scheduled notification by its identifier.
 */
export function unscheduleNotification(identifier: string): void {
  JestSDK.notifications.unscheduleNotification({ identifier });
}

// ── Retention notification series ─────────────────────────────
// Each notification carries an entryPayload with a template ID
// and day offset so the game can track which messages drive
// player returns (see getEntryPayload() on re-entry).
//
// Each slot has a small bank of body variants. We pick one at
// scheduling time so engaged players who return often don't
// receive the exact same reminder over and over (the "Inbox
// Groundhog Day" trap described in
// https://docs.jest.com/guides/notifications#beware-of-the-inbox-groundhog-day-trap).

type RetentionContext = { score: number; playerName: string };

type RetentionVariant = {
  template: string;
  body: (ctx: RetentionContext) => string;
  ctaText: string;
};

// Each slot references a single image, scoped by intent. Upload one image
// per reference in the Developer Console (under Manage Images) and submit
// for approval to enable rich notifications. If a reference is missing,
// invalid, or unapproved, the platform automatically falls back to the
// game's Hero image — so leaving them unconfigured is safe.
const RETENTION_SERIES = [
  {
    identifier: "retention_d1",
    scheduledInDays: 1,
    priority: "high" as const,
    imageReference: "notif_score_challenge",
    variants: [
      {
        template: "score_challenge_v1",
        body: ({ score, playerName }: RetentionContext) =>
          `${playerName}, your high score of ${score} is under threat! Come defend it.`,
        ctaText: "Play Now",
      },
      {
        template: "score_challenge_v2",
        body: ({ playerName }: RetentionContext) =>
          `Your basket misses you, ${playerName}. The throne is wobbling.`,
        ctaText: "Defend",
      },
      {
        template: "score_challenge_v3",
        body: ({ score, playerName }: RetentionContext) =>
          `${playerName}, can ${score} hold the line? One run to find out.`,
        ctaText: "Try again",
      },
    ] satisfies RetentionVariant[],
  },
  {
    identifier: "retention_d3",
    scheduledInDays: 3,
    priority: "medium" as const,
    imageReference: "notif_miss_you",
    variants: [
      {
        template: "miss_you_v1",
        body: ({ playerName }: RetentionContext) =>
          `Hey ${playerName}, the cats miss you! Your basket is gathering dust.`,
        ctaText: "Play Again",
      },
      {
        template: "miss_you_v2",
        body: ({ playerName }: RetentionContext) =>
          `${playerName}, the alley's quiet without you. Pop in for a quick run.`,
        ctaText: "Come back",
      },
      {
        template: "miss_you_v3",
        body: ({ playerName }: RetentionContext) =>
          `The cats are restless, ${playerName}. Grab the basket.`,
        ctaText: "Open",
      },
    ] satisfies RetentionVariant[],
  },
  {
    identifier: "retention_d7",
    scheduledInDays: 7,
    priority: "low" as const,
    imageReference: "notif_weekly_reminder",
    variants: [
      {
        template: "weekly_reminder_v1",
        body: ({ score, playerName }: RetentionContext) =>
          `${playerName}, can you beat ${score}? New challengers are catching up!`,
        ctaText: "Play",
      },
      {
        template: "weekly_reminder_v2",
        body: ({ score, playerName }: RetentionContext) =>
          `Weekly check-in, ${playerName}. ${score} could use a refresh.`,
        ctaText: "Refresh it",
      },
      {
        template: "weekly_reminder_v3",
        body: ({ score, playerName }: RetentionContext) =>
          `${playerName}, one week, one run. ${score} is yours to top.`,
        ctaText: "One run",
      },
    ] satisfies RetentionVariant[],
  },
];

function pickVariant(variants: RetentionVariant[]): RetentionVariant {
  return variants[Math.floor(Math.random() * variants.length)] ?? variants[0]!;
}

/**
 * Schedules a D1 / D3 / D7 retention notification series.
 *
 * Each notification uses fuzzy scheduling (scheduledInDays) so
 * the platform picks optimal delivery times per player. For each
 * slot we pick a body variant from a small bank so frequent
 * returners don't see the same template every time.
 *
 * Each notification's entryPayload includes notification_template
 * (the specific variant chosen) and notification_offset, so the
 * game can attribute re-engagement and A/B test variant copy.
 */
export function scheduleRetentionSeries(context: RetentionContext): void {
  for (const n of RETENTION_SERIES) {
    const variant = pickVariant(n.variants);
    JestSDK.notifications.scheduleNotification({
      identifier: n.identifier,
      scheduledInDays: n.scheduledInDays,
      priority: n.priority,
      imageReference: n.imageReference,
      body: variant.body(context),
      ctaText: variant.ctaText,
      entryPayload: {
        notification_template: variant.template,
        notification_offset: `D${n.scheduledInDays}`,
      },
    });
  }
}

/**
 * Cancels all pending retention notifications.
 * Call this when the player returns to the game to prevent
 * stale messages from a previous session being delivered.
 */
export function unscheduleRetentionSeries(): void {
  for (const n of RETENTION_SERIES) {
    JestSDK.notifications.unscheduleNotification({
      identifier: n.identifier,
    });
  }
}
