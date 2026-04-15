/**
 * Jest SDK: In-app purchases
 * https://docs.jest.com/sdk/html5/payments
 *
 * Players spend Jest Tokens (1 token = $1 USD) to buy in-game
 * products. Products and prices are configured in the Developer Console.
 *
 * Purchase lifecycle:
 *   1. List products with getProducts()
 *   2. Start checkout with purchaseProduct()
 *   3. Grant the item to the player
 *   4. Confirm the purchase with completePurchase()
 *   5. On startup, recover incomplete purchases with recoverPurchases()
 *
 * Always grant before confirming — if the game crashes after
 * confirming but before granting, the purchase can't be recovered.
 */

/**
 * Returns the list of products available for purchase,
 * as configured in the Developer Console.
 *
 * Each product includes: sku, name, description, and price (in Jest Tokens).
 */
export async function getProducts() {
  return JestSDK.payments.getProducts();
}

/**
 * Runs the full purchase lifecycle for a product:
 * checkout → grant → confirm.
 *
 * The onGrant callback is invoked after a successful checkout
 * but before confirming with the platform. This ordering ensures
 * the item is granted even if confirmation fails — incomplete
 * purchases are recoverable via recoverPurchases().
 *
 * Returns true if the purchase is completed, false if canceled or errored.
 */
export async function purchaseProduct(
  productSku: string,
  onGrant: (sku: string) => void,
): Promise<boolean> {
  const result = await JestSDK.payments.beginPurchase({ productSku });

  if (result.result === "cancel") {
    return false;
  }

  if (result.result === "error") {
    console.error("Purchase failed:", result.error);
    return false;
  }

  // In production, send result.purchaseSigned to your server to verify
  // the purchase before granting. Use purchase.purchaseToken as an
  // idempotency key to prevent double-grants.
  onGrant(result.purchase.productSku);

  await JestSDK.payments.completePurchase({
    purchaseToken: result.purchase.purchaseToken,
  });

  return true;
}

/**
 * Recovers incomplete purchases from previous sessions.
 * Call this on every startup to handle purchases that succeeded
 * at checkout but were never confirmed (e.g. due to a crash).
 *
 * For each incomplete purchase, onGrant is called to re-grant
 * the item, then the purchase is confirmed with the platform.
 *
 * The response is capped at 50 purchases per call; this function
 * loops until all incomplete purchases are processed.
 */
export async function recoverPurchases(
  onGrant: (sku: string) => void,
): Promise<void> {
  let hasMore = true;

  while (hasMore) {
    const result = await JestSDK.payments.getIncompletePurchases();

    for (const purchase of result.purchases) {
      // In production, verify result.purchasesSigned on your server
      // before granting items.
      onGrant(purchase.productSku);

      await JestSDK.payments.completePurchase({
        purchaseToken: purchase.purchaseToken,
      });
    }

    hasMore = result.hasMore;
  }
}
