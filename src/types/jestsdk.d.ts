// Type definitions for the Jest HTML5 SDK
// https://docs.jest.com/sdk/html5

interface JestProduct {
  sku: string;
  name: string;
  description: string | null;
  price: number;
}

interface JestPurchaseData {
  purchaseToken: string;
  productSku: string;
  credits: number;
  createdAt: number;
  completedAt: number | null;
  estimatedRevenue: number;
}

type JestBeginPurchaseResult =
  | { result: "success"; purchase: JestPurchaseData; purchaseSigned: string }
  | { result: "cancel" }
  | { result: "error"; error: string };

type JestCompletePurchaseResult =
  | { result: "success" }
  | { result: "error"; error: "internal_error" | "invalid_token" };

interface JestNotificationOptions {
  scheduledAt?: Date;
  scheduledInDays?: number;
  identifier: string;
  priority?: "low" | "medium" | "high";
  imageReference?: string;
  body: string;
  ctaText: string;
  entryPayload?: Record<string, string>;
}

interface JestPlayerData {
  getAll(): Record<string, unknown>;
  get(key: string): unknown;
  set(data: Record<string, unknown>): void;
  set(key: string, value: unknown): void;
  delete(key: string): void;
  flush(): Promise<void>;
}

declare namespace JestSDK {
  function init(options?: { autoLoginReminders?: boolean }): Promise<void>;
  function getPlayer(): { playerId: string; registered: boolean };
  function getPlayerSigned(): Promise<{
    player: { playerId: string; registered: boolean };
    playerSigned: string;
  }>;
  function login(options?: { entryPayload?: Record<string, unknown> }): void;
  function getEntryPayload(): Record<string, unknown>;
  function setLoadingProgress(progress: number): void;

  const data: JestPlayerData;

  namespace notifications {
    function scheduleNotification(options: JestNotificationOptions): void;
    function unscheduleNotification(options: { identifier: string }): void;
  }

  namespace payments {
    function getProducts(): Promise<JestProduct[]>;
    function beginPurchase(options: {
      productSku: string;
    }): Promise<JestBeginPurchaseResult>;
    function completePurchase(options: {
      purchaseToken: string;
    }): Promise<JestCompletePurchaseResult>;
    function getIncompletePurchases(): Promise<{
      purchases: JestPurchaseData[];
      purchasesSigned: string;
      hasMore: boolean;
    }>;
  }

  namespace referrals {
    function shareReferralLink(options: {
      reference: string;
      entryPayload?: Record<string, unknown>;
      shareTitle?: string;
      shareText?: string;
      onboardingSlug?: string;
    }): Promise<{ canceled: boolean }>;
    function listReferrals(): Promise<{
      referrals: Record<string, { playerId: string; joinedAt: string }[]>;
      referralsSigned: string;
    }>;
  }
}
