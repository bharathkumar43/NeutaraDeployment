interface AuditEntry {
    deploymentId: string;
    action: string;
    performedBy: string;
    oldStatus?: string;
    newStatus?: string;
    comment?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
}
export declare const createAuditLog: (entry: AuditEntry) => Promise<void>;
export declare const getAuditLogs: (deploymentId: string) => Promise<Record<string, unknown>[]>;
export {};
//# sourceMappingURL=audit.service.d.ts.map