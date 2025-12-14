export interface Player {
  playerId: string;
  registered: boolean;
  entryPayload: Record<string, any>;
  playerData: Record<string, any>;
}

export interface NotificationOptions {
  scheduledAt: Date;
  identifier?: string;
  priority: 'low' | 'medium' | 'high';
  image?: string;
  body: string;
  ctaText: string;
  plainText: string;
}

export interface UnscheduleOptions {
  identifier: string;
}

declare global {
  namespace JestSDK {
    function init(): Promise<void>;
    function Login(payload: Record<string, any>): void;
    function getPlayer(): Player;
    function getEntryPayload(): Record<string, any>;
    function getPlayerData(): Record<string, any>;
    function setPlayerData(data: Record<string, any>): void;
    function getPlayerDataVal(key: string): any;
    function setPlayerDataVal(key: string, value: any): void;

    namespace notifications {
      function scheduleNotification(options: NotificationOptions): void;
      function unscheduleNotification(options: UnscheduleOptions): void;
    }
  }
}
