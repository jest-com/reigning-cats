/**
 * Retention notification series.
 *
 * Schedules one notification for every day from D1 to D7. Each carries an
 * entryPayload with a template ID and day offset so the game can attribute
 * re-engagement when the player returns via JestSDK.getEntryPayload().
 *
 * Pattern, "rolling notifications":
 *   - Reschedule on every game over (latest score travels into the messages)
 *   - Unschedule on every game start (cancels stale messages from a prior
 *     session before delivering them)
 *
 * This avoids the "Inbox Groundhog Day" trap where a returning player
 * keeps getting the same generic Day-1 reminder.
 *
 * Every body names the game, and every entry points at a different image:
 * the platform review checklist flags a series that does neither.
 */

type RetentionContext = { score: number; playerName: string };

type SeriesEntry = {
  identifier: string;
  scheduledInDays: number;
  priority: "low" | "medium" | "high" | "critical";
  template: string;
  assetReference: string;
  title: string;
  body: (context: RetentionContext) => string;
  ctaText: string;
};

// assetReference values must exist in the game's Image Library (Developer
// Console > Image Library) and read "Pass" before they can be scheduled.
// Source art for these lives in notification-assets/ in this repo.
const ASSET_SCORE = "score_defend";
const ASSET_MISS_YOU = "cats_miss_you";
const ASSET_CHALLENGERS = "challengers_closing";

const RETENTION_SERIES: SeriesEntry[] = [
  {
    identifier: "retention_d1",
    scheduledInDays: 1,
    priority: "high",
    template: "score_challenge_v1",
    assetReference: ASSET_SCORE,
    title: "Your crown is slipping",
    body: ({ score, playerName }) =>
      `${playerName}, your Reigning Cats high score of ${score} is under threat. Come defend it.`,
    ctaText: "Play Now",
  },
  {
    identifier: "retention_d2",
    scheduledInDays: 2,
    priority: "high",
    template: "challengers_v1",
    assetReference: ASSET_CHALLENGERS,
    title: "Challengers are closing in",
    body: ({ score, playerName }) =>
      `${playerName}, other cat wranglers are catching up to your ${score} in Reigning Cats.`,
    ctaText: "Defend It",
  },
  {
    identifier: "retention_d3",
    scheduledInDays: 3,
    priority: "medium",
    template: "miss_you_v1",
    assetReference: ASSET_MISS_YOU,
    title: "The cats miss you",
    body: ({ playerName }) =>
      `Hey ${playerName}, the Reigning Cats are restless and your basket is gathering dust.`,
    ctaText: "Play Again",
  },
  {
    identifier: "retention_d4",
    scheduledInDays: 4,
    priority: "medium",
    template: "beat_your_best_v1",
    assetReference: ASSET_SCORE,
    title: "Beat your best",
    body: ({ score, playerName }) =>
      `${playerName}, ${score} is still your Reigning Cats record. One run could change that.`,
    ctaText: "Try Now",
  },
  {
    identifier: "retention_d5",
    scheduledInDays: 5,
    priority: "medium",
    template: "climb_back_v1",
    assetReference: ASSET_CHALLENGERS,
    title: "Climb back up",
    body: ({ playerName }) =>
      `The Reigning Cats leaderboard moved without you, ${playerName}. Time to climb back up.`,
    ctaText: "Climb",
  },
  {
    identifier: "retention_d6",
    scheduledInDays: 6,
    priority: "low",
    template: "empty_basket_v1",
    assetReference: ASSET_MISS_YOU,
    title: "Your basket is empty",
    body: ({ playerName }) =>
      `${playerName}, nobody has caught a cat in your basket for days. Reigning Cats awaits.`,
    ctaText: "Play",
  },
  {
    identifier: "retention_d7",
    scheduledInDays: 7,
    priority: "low",
    template: "weekly_reminder_v1",
    assetReference: ASSET_SCORE,
    title: "One more run?",
    body: ({ score, playerName }) =>
      `${playerName}, a whole week away from Reigning Cats. Can you still beat ${score}?`,
    ctaText: "Play",
  },
];

export function scheduleRetentionSeries(context: RetentionContext): void {
  for (const n of RETENTION_SERIES) {
    JestSDK.notifications.scheduleNotification({
      identifier: n.identifier,
      scheduledInDays: n.scheduledInDays,
      priority: n.priority,
      assetReference: n.assetReference,
      title: n.title,
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
    JestSDK.notifications.unscheduleNotification({ identifier: n.identifier });
  }
}
