/**
 * Retention notification series.
 *
 * Schedules a D1 / D3 / D7 progression of fuzzy-scheduled notifications
 * after each game. Each carries an entryPayload with a template ID and
 * day offset so the game can attribute re-engagement when the player
 * returns via JestSDK.getEntryPayload().
 *
 * Pattern — "rolling notifications":
 *   - Reschedule on every game over (latest score travels into the messages)
 *   - Unschedule on every game start (cancels stale messages from a prior
 *     session before delivering them)
 *
 * This avoids the "Inbox Groundhog Day" trap where a returning player
 * keeps getting the same generic Day-1 reminder.
 */

type RetentionContext = { score: number; playerName: string };

const RETENTION_SERIES = [
  {
    identifier: "retention_d1",
    scheduledInDays: 1,
    priority: "high" as const,
    template: "score_challenge_v1",
    body: ({ score, playerName }: RetentionContext) =>
      `${playerName}, your high score of ${score} is under threat! Come defend it.`,
    ctaText: "Play Now",
  },
  {
    identifier: "retention_d3",
    scheduledInDays: 3,
    priority: "medium" as const,
    template: "miss_you_v1",
    body: ({ playerName }: RetentionContext) =>
      `Hey ${playerName}, the cats miss you! Your basket is gathering dust.`,
    ctaText: "Play Again",
  },
  {
    identifier: "retention_d7",
    scheduledInDays: 7,
    priority: "low" as const,
    template: "weekly_reminder_v1",
    body: ({ score, playerName }: RetentionContext) =>
      `${playerName}, can you beat ${score}? New challengers are catching up!`,
    ctaText: "Play",
  },
];

export function scheduleRetentionSeries(context: RetentionContext): void {
  for (const n of RETENTION_SERIES) {
    JestSDK.notifications.scheduleNotification({
      identifier: n.identifier,
      scheduledInDays: n.scheduledInDays,
      priority: n.priority,
      body: n.body(context),
      ctaText: n.ctaText,
      entryPayload: {
        notification_template: n.template,
        notification_offset: `D${n.scheduledInDays}`,
      },
    });
  }
}

export function unscheduleRetentionSeries(): void {
  for (const n of RETENTION_SERIES) {
    JestSDK.notifications.unscheduleNotification({
      identifier: n.identifier,
    });
  }
}
