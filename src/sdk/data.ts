/**
 * Jest SDK: Player data persistence
 * https://docs.jest.com/sdk/html5/player#player-data
 *
 * A simple key-value store for per-player data, persisted across
 * sessions and devices. Limited to 1 MB per game.
 * All values must be JSON-serializable.
 *
 * Data is written from the client — do not store sensitive
 * information or data requiring strong security guarantees.
 */

/**
 * Returns the value for a key, or undefined if it doesn't exist.
 */
export function get(key: string): unknown {
  return JestSDK.data.get(key);
}

/**
 * Returns a snapshot of all stored player data.
 * Modifying the returned object does NOT update stored data.
 */
export function getAll(): Record<string, unknown> {
  return JestSDK.data.getAll();
}

/**
 * Sets a single key-value pair in player data.
 */
export function set(key: string, value: unknown): void;
/**
 * Merges multiple key-value pairs into player data (shallow merge).
 */
export function set(data: Record<string, unknown>): void;
export function set(
  keyOrData: string | Record<string, unknown>,
  value?: unknown,
): void {
  if (typeof keyOrData === "string") {
    JestSDK.data.set(keyOrData, value);
  } else {
    JestSDK.data.set(keyOrData);
  }
}

/**
 * Deletes a key from player data.
 */
export function remove(key: string): void {
  JestSDK.data.delete(key);
}

/**
 * Flushes pending data changes to the server immediately.
 * The SDK batches writes by default; call this when data
 * must be persisted right away (e.g. before navigating away).
 */
export async function flush(): Promise<void> {
  await JestSDK.data.flush();
}
