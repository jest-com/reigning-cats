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

const RETENTION_SERIES = [
  {
    identifier: "retention_d1",
    scheduledInDays: 1,
    priority: "high" as const,
    template: "score_challenge_v1",
    body: (score: number) =>
      `Your high score of ${score} is under threat! Come defend it.`,
    ctaText: "Play Now",
  },
  {
    identifier: "retention_d3",
    scheduledInDays: 3,
    priority: "medium" as const,
    template: "miss_you_v1",
    body: () => `The cats miss you! Your basket is gathering dust.`,
    ctaText: "Play Again",
  },
  {
    identifier: "retention_d7",
    scheduledInDays: 7,
    priority: "low" as const,
    template: "weekly_reminder_v1",
    body: (score: number) =>
      `Can you beat ${score}? New challengers are catching up!`,
    ctaText: "Play",
  },
];

/**
 * Schedules a D1 / D3 / D7 retention notification series.
 *
 * Each notification uses fuzzy scheduling (scheduledInDays) so
 * the platform picks optimal delivery times per player. Messages
 * reference the player's score to feel personal rather than generic.
 *
 * Each notification's entryPayload includes notification_template
 * and notification_offset so the game can attribute re-engagement
 * and A/B test different copy.
 */
export function scheduleRetentionSeries(score: number): void {
  for (const n of RETENTION_SERIES) {
    JestSDK.notifications.scheduleNotification({
      identifier: n.identifier,
      scheduledInDays: n.scheduledInDays,
      priority: n.priority,
      body: n.body(score),
      ctaText: n.ctaText,
      entryPayload: {
        notification_template: n.template,
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
