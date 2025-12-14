/**
 * Products Examples
 *
 * This file contains example functions using the Jest SDK Payments API.
 * Uncomment the function calls in GameScene.ts to enable these examples.
 */

/**
 * Example: Purchase a power-up product
 * This shows how to handle a one-time purchase of a consumable item.
 */
export async function purchasePowerUp(): Promise<void> {
  try {
    const result = await JestSDK.payments.purchase({
      productId: "power_up_double_score",
      quantity: 1,
    });

    if (result.success) {
      console.log("Power-up purchased successfully!");
      // Grant the player the power-up in your game
    } else {
      console.log("Purchase failed:", result.error);
    }
  } catch (error) {
    console.error("Error purchasing power-up:", error);
  }
}

/**
 * Example: Purchase premium currency
 * This shows how to handle purchasing in-game currency.
 */
export async function purchaseCurrency(): Promise<void> {
  try {
    const result = await JestSDK.payments.purchase({
      productId: "coins_100",
      quantity: 1,
    });

    if (result.success) {
      console.log("Currency purchased successfully!");
      // Add coins to player's balance
      const currentCoins = JestSDK.getPlayerDataVal("coins") || 0;
      JestSDK.setPlayerDataVal("coins", currentCoins + 100);
    }
  } catch (error) {
    console.error("Error purchasing currency:", error);
  }
}

/**
 * Example: Subscribe to premium membership
 * This shows how to handle a subscription purchase.
 */
export async function subscribeToPremium(): Promise<void> {
  try {
    const result = await JestSDK.payments.purchase({
      productId: "premium_monthly",
      quantity: 1,
    });

    if (result.success) {
      console.log("Premium subscription activated!");
      // Grant premium benefits
      JestSDK.setPlayerDataVal("isPremium", true);
    }
  } catch (error) {
    console.error("Error subscribing to premium:", error);
  }
}

/**
 * Example: Get available products
 * This shows how to fetch the list of products available for purchase.
 */
export async function loadAvailableProducts(): Promise<void> {
  try {
    const products = await JestSDK.payments.getProducts();
    console.log("Available products:", products);

    // Display products in your game UI
    products.forEach((product) => {
      console.log(`${product.name}: ${product.price}`);
    });
  } catch (error) {
    console.error("Error loading products:", error);
  }
}

/**
 * Example: Check if player owns a product
 * This shows how to verify ownership of a non-consumable product.
 */
export async function checkPremiumStatus(): Promise<boolean> {
  try {
    const ownedProducts = await JestSDK.payments.getOwnedProducts();
    const hasPremium = ownedProducts.some(
      (product) => product.productId === "premium_monthly"
    );

    if (hasPremium) {
      console.log("Player has premium membership");
      JestSDK.setPlayerDataVal("isPremium", true);
    }

    return hasPremium;
  } catch (error) {
    console.error("Error checking premium status:", error);
    return false;
  }
}

/**
 * Example: Restore previous purchases
 * This shows how to restore purchases (useful for reinstalls or new devices).
 */
export async function restorePurchases(): Promise<void> {
  try {
    const result = await JestSDK.payments.restorePurchases();

    if (result.success) {
      console.log("Purchases restored successfully!");
      console.log("Restored items:", result.restoredProducts);

      // Re-grant items to the player
      result.restoredProducts.forEach((product) => {
        console.log(`Restored: ${product.productId}`);
        // Apply the restored products to player data
      });
    }
  } catch (error) {
    console.error("Error restoring purchases:", error);
  }
}
