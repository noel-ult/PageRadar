import type { TypedDocumentNode } from "@apollo/client";
import type {
  MeQuery,
  MeQueryVariables,
  DashboardStatsQuery,
  DashboardStatsQueryVariables,
  WatchesQuery,
  WatchesQueryVariables,
  WatchQuery,
  WatchQueryVariables,
  RecentChangesQuery,
  RecentChangesQueryVariables,
  ChangeQuery,
  ChangeQueryVariables,
  NotificationsQuery,
  NotificationsQueryVariables,
  WatchHistoryQuery,
  WatchHistoryQueryVariables,
  NotificationsPageQuery,
  NotificationsPageQueryVariables,
} from "./generated";
import { gql } from "@apollo/client";
import { CHANGE_SUMMARY_FRAGMENT, WATCH_CARD_FRAGMENT } from "./fragments";
import type {
  EmailSettingsQuery,
  EmailSettingsQueryVariables,
  EmailDeliveriesQuery,
  EmailDeliveriesQueryVariables,
} from "./generated";

export const EMAIL_SETTINGS_QUERY: TypedDocumentNode<
  EmailSettingsQuery,
  EmailSettingsQueryVariables
> = gql`
  query EmailSettings {
    emailSettings {
      email
      verifiedAt
      enabled
      available
      suppressed
      suppressionReason
    }
  }
`;
export const EMAIL_DELIVERIES_QUERY: TypedDocumentNode<
  EmailDeliveriesQuery,
  EmailDeliveriesQueryVariables
> = gql`
  query EmailDeliveries($after: String) {
    emailDeliveriesPage(first: 25, after: $after) {
      nodes {
        id
        message
        purpose
        status
        createdAt
        sentAt
        deliveredAt
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const ME_QUERY: TypedDocumentNode<MeQuery, MeQueryVariables> = gql`
  query Me {
    me {
      id
      name
      email
    }
  }
`;

export const DASHBOARD_STATS_QUERY: TypedDocumentNode<
  DashboardStatsQuery,
  DashboardStatsQueryVariables
> = gql`
  query DashboardStats {
    dashboardStats {
      totalWatches
      activeWatches
      recentChanges
      importantChanges
      failedChecks
    }
  }
`;

export const WATCHES_QUERY: TypedDocumentNode<
  WatchesQuery,
  WatchesQueryVariables
> = gql`
  query Watches($after: String) {
    watchesPage(first: 25, after: $after) {
      nodes {
        ...WatchCardFields
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
  ${WATCH_CARD_FRAGMENT}
`;

export const WATCH_QUERY: TypedDocumentNode<WatchQuery, WatchQueryVariables> =
  gql`
    query Watch($id: ID!) {
      watch(id: $id) {
        ...WatchCardFields
      }
      changesPage(first: 25, filter: { watchId: $id }) {
        nodes {
          ...ChangeSummaryFields
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
    ${WATCH_CARD_FRAGMENT}
    ${CHANGE_SUMMARY_FRAGMENT}
  `;

export const RECENT_CHANGES_QUERY: TypedDocumentNode<
  RecentChangesQuery,
  RecentChangesQueryVariables
> = gql`
  query RecentChanges {
    changesPage(first: 10) {
      nodes {
        ...ChangeSummaryFields
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
  ${CHANGE_SUMMARY_FRAGMENT}
`;

export const CHANGE_QUERY: TypedDocumentNode<
  ChangeQuery,
  ChangeQueryVariables
> = gql`
  query Change($id: ID!) {
    change(id: $id) {
      ...ChangeSummaryFields
    }
  }
  ${CHANGE_SUMMARY_FRAGMENT}
`;

export const NOTIFICATIONS_QUERY: TypedDocumentNode<
  NotificationsQuery,
  NotificationsQueryVariables
> = gql`
  query Notifications {
    unreadNotificationCount
    notifications {
      id
      changeId
      channel
      status
      message
      sentAt
      readAt
      createdAt
    }
  }
`;

export const WATCH_HISTORY_QUERY: TypedDocumentNode<
  WatchHistoryQuery,
  WatchHistoryQueryVariables
> = gql`
  query WatchHistory($id: ID!, $after: String) {
    checkRuns(watchId: $id, first: 25, after: $after) {
      nodes {
        id
        status
        attempts
        startedAt
        completedAt
        nextAttemptAt
        error
        changes {
          ...ChangeSummaryFields
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
  ${CHANGE_SUMMARY_FRAGMENT}
`;

export const NOTIFICATIONS_PAGE_QUERY: TypedDocumentNode<
  NotificationsPageQuery,
  NotificationsPageQueryVariables
> = gql`
  query NotificationsPage($after: String) {
    notificationsPage(first: 25, after: $after) {
      nodes {
        id
        changeId
        channel
        status
        message
        readAt
        sentAt
        createdAt
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;
