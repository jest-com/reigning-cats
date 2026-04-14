/**
 * Jest SDK: Loading screen control
 * https://docs.jest.com/sdk/html5/loading-screen
 *
 * When loading screen mode is set to "Manual" in the Developer Console,
 * the platform displays a branded loading overlay on game entry.
 * Your game controls progress and dismissal via setLoadingProgress().
 *
 * Modes:
 *   - Auto (default): Brief platform animation, no SDK call needed
 *   - Manual: Game reports progress 0–100; overlay dismisses at 100
 *   - Off: No loading overlay
 *
 * Safety: If no progress update is received for 15 seconds,
 * the platform exits the player to the home screen. Each call
 * resets this timer, so long loads are fine as long as progress
 * is reported regularly.
 */

/**
 * Reports loading progress to the platform overlay (0–100).
 * When progress reaches 100, the overlay dismisses with a fade-out.
 *
 * Values outside 0–100 are clamped; non-integers are rounded.
 */
export function setLoadingProgress(progress: number): void {
  JestSDK.setLoadingProgress(progress);
}
