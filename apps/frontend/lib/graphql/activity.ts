import { gql } from "@apollo/client";

// ============================================
// Types
// ============================================

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "LOGIN_FAILED"
  | "PASSWORD_CHANGE"
  | "PASSWORD_RESET"
  | "CREATE"
  | "READ"
  | "UPDATE"
  | "DELETE"
  | "BULK_READ"
  | "BULK_UPDATE"
  | "BULK_DELETE"
  | "UPLOAD"
  | "DOWNLOAD"
  | "SEARCH"
  | "EXPORT";

export interface ActivityLogEntry {
  id: string;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  operationName?: string;
  operationType?: string;
  success: boolean;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  browser?: string;
  timestamp: string;
}

export interface ActivityLogPage {
  items: ActivityLogEntry[];
  total: number;
  hasMore: boolean;
}

export interface ActivityLogFilters {
  actions?: AuditAction[];
  entityType?: string;
  startDate?: string;
  endDate?: string;
  successOnly?: boolean;
}

export interface SessionInfo {
  id: string;
  deviceType?: string;
  deviceName?: string;
  browser?: string;
  operatingSystem?: string;
  city?: string;
  region?: string;
  country?: string;
  isActive: boolean;
  isCurrent: boolean;
  lastActivityAt?: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
}

export interface SessionsPage {
  items: SessionInfo[];
  total: number;
}

export interface ActivitySummary {
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  activeSessions: number;
  lastLoginAt?: string;
  lastActivityAt?: string;
}

// ============================================
// Query Response Types
// ============================================

export interface MyActivityLogData {
  myActivityLog: ActivityLogPage;
}

export interface MyActivityLogVars {
  limit?: number;
  offset?: number;
  filters?: ActivityLogFilters;
}

export interface MyActivitySummaryData {
  myActivitySummary: ActivitySummary;
}

export interface MySessionsData {
  mySessions: SessionsPage;
}

export interface MySessionsVars {
  includeRevoked?: boolean;
}

export interface RevokeSessionData {
  revokeSession: boolean;
}

export interface RevokeSessionVars {
  id: string;
}

export interface RevokeAllOtherSessionsData {
  revokeAllOtherSessions: number;
}

// ============================================
// Queries
// ============================================

export const GET_MY_ACTIVITY_LOG = gql`
  query GetMyActivityLog(
    $limit: Int
    $offset: Int
    $filters: ActivityLogFilters
  ) {
    myActivityLog(limit: $limit, offset: $offset, filters: $filters) {
      items {
        id
        action
        entityType
        entityId
        operationName
        operationType
        success
        errorMessage
        ipAddress
        userAgent
        deviceType
        browser
        timestamp
      }
      total
      hasMore
    }
  }
`;

export const GET_MY_ACTIVITY_SUMMARY = gql`
  query GetMyActivitySummary {
    myActivitySummary {
      totalActions
      successfulActions
      failedActions
      activeSessions
      lastLoginAt
      lastActivityAt
    }
  }
`;

export const GET_MY_SESSIONS = gql`
  query GetMySessions($includeRevoked: Boolean) {
    mySessions(includeRevoked: $includeRevoked) {
      items {
        id
        deviceType
        deviceName
        browser
        operatingSystem
        city
        region
        country
        isActive
        isCurrent
        lastActivityAt
        createdAt
        expiresAt
        revokedAt
      }
      total
    }
  }
`;

// ============================================
// Mutations
// ============================================

export const REVOKE_SESSION = gql`
  mutation RevokeSession($id: ID!) {
    revokeSession(id: $id)
  }
`;

export const REVOKE_ALL_OTHER_SESSIONS = gql`
  mutation RevokeAllOtherSessions {
    revokeAllOtherSessions
  }
`;
