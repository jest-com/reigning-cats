/**
 * Canvas snapshots, used for two different SDK features:
 *
 *   - social.setScreenshotProvider() wants a PNG whenever the platform asks
 *     the game for a screenshot.
 *   - referrals.shareReferralLink({ shareImage }) wants a JPEG small enough
 *     to fit the 2 MB data-URL cap.
 *
 * Phaser hands the snapshot to a callback on the next render rather than
 * returning it, so this wraps it in a promise. WebGL games must read the
 * drawing buffer inside that callback. Reading the canvas directly from an
 * event handler yields a blank frame.
 */

const SNAPSHOT_TIMEOUT_MS = 2000;

let queue: Promise<string | null> = Promise.resolve(null);

/**
 * Captures the game canvas as a base64 data URL, or null if the renderer
 * produced no frame in time (paused, hidden, or mid-load).
 */
export function captureCanvas(
  game: Phaser.Game,
  type: "image/png" | "image/jpeg" = "image/png",
  quality = 0.8,
): Promise<string | null> {
  // Phaser allows a single snapshot per rendered frame, so calls are chained.
  queue = queue.catch(() => null).then(() => captureOnce(game, type, quality));
  return queue;
}

function captureOnce(
  game: Phaser.Game,
  type: string,
  quality: number,
): Promise<string | null> {
  return new Promise((resolve) => {
    // A hidden or paused game never renders, so the callback would never fire.
    const timer = setTimeout(() => resolve(null), SNAPSHOT_TIMEOUT_MS);
    const settle = (value: string | null) => {
      clearTimeout(timer);
      resolve(value);
    };

    try {
      game.renderer.snapshot(
        (result) => {
          // Full-canvas snapshots yield an image. Only snapshotPixel gives a Color.
          settle(result instanceof HTMLImageElement ? result.src : null);
        },
        type,
        quality,
      );
    } catch {
      settle(null);
    }
  });
}
