/**
 * Notification Examples
 *
 * This file contains example functions using the Jest SDK.
 * Uncomment the function calls in GameScene.ts to enable these examples.
 */

/**
 * Schedules a "welcome back" SMS notification to be sent 2 minutes after the game loads.
 * This encourages players to return to the game.
 */
export function scheduleSMSNotification(): void {
  try {
    JestSDK.notifications.scheduleNotification({
      identifier: "welcome_back",
      scheduledAt: new Date(Date.now() + 120 * 1000), // 2 mins from now
      priority: "high",
      body: "Come and play Reigning Cats!",
      ctaText: "Play Now",
      plainText: "Come back to play Reigning Cats! Tap to play now.",
    });
    console.log("✓ SMS notification scheduled successfully");
  } catch (error) {
    console.error("✗ Failed to schedule SMS notification:", error);
  }
}

/**
 * Schedules a rich notification with an image and Play button.
 * When delivered over RCS, this will show with rich formatting and the image.
 * When delivered over SMS, it will use the plainText fallback.
 *
 * Note: The image uses the crown cat base64 data from public/molly-cat-crown-base64.txt
 */
export async function scheduleRCSNotification(): Promise<void> {
  try {
    // Fetch the base64 image
    const response = await fetch("molly-cat-crown-base64.txt");
    const image = await response.text();

    JestSDK.notifications.scheduleNotification({
      identifier: "rich_play_now",
      scheduledAt: new Date(Date.now() + 120 * 1000), // 2 mins from now
      priority: "high",
      image: image.trim(), // Crown cat base64 image
      body: "🐱 Ready to catch some cats? Jump back into Reigning Cats!",
      ctaText: "Play",
      plainText:
        "Ready to catch some cats? Jump back into Reigning Cats! Tap to play now.",
    });
    console.log("✓ RCS notification scheduled successfully");
  } catch (error) {
    console.error("✗ Failed to schedule RCS notification:", error);
  }
}
