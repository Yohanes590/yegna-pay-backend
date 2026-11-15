export interface NotificationItem {
    id: string;
    type: "security" | "success" | "info" | "warning";
    title: string;
    description: string;
    time?: string | undefined;
    isRead: boolean;
    longDetails?: string | undefined;
    createdAt?: string | undefined;
}
export declare function createNotification(params: {
    userId: string;
    type: "security" | "success" | "info" | "warning";
    title: string;
    description: string;
    longDetails?: string;
}): Promise<NotificationItem>;
export declare function ensureWelcomeNotification(userId: string): Promise<void>;
export declare function getUserNotifications(userId: string): Promise<NotificationItem[]>;
export declare function markUserNotificationsAsRead(userId: string): Promise<void>;
export declare function clearUserNotifications(userId: string): Promise<void>;
//# sourceMappingURL=notification-service.d.ts.map