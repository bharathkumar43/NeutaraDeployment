interface NotificationPayload {
    userId: string;
    deploymentId?: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
}
export declare const createNotification: (payload: NotificationPayload) => Promise<void>;
export declare const notifyRoleUsers: (role: string, payload: Omit<NotificationPayload, "userId">) => Promise<void>;
export declare const getUserNotifications: (userId: string, limit?: number) => Promise<Record<string, unknown>[]>;
export declare const markNotificationRead: (id: string, userId: string) => Promise<void>;
export declare const markAllNotificationsRead: (userId: string) => Promise<void>;
export declare const getUnreadCount: (userId: string) => Promise<number>;
export {};
//# sourceMappingURL=notification.service.d.ts.map