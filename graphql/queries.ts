import { gql } from "@apollo/client";
import { CHANGE_SUMMARY_FRAGMENT, WATCH_CARD_FRAGMENT } from "./fragments";

export const ME_QUERY = gql`
  query Me {
    me {
      id
      name
      email
    }
  }
`;

export const DASHBOARD_STATS_QUERY = gql`
  query DashboardStats {
    dashboardStats {
      activeWatches
      recentChanges
      importantChanges
    }
  }
`;

export const WATCHES_QUERY = gql`
  query Watches {
    watches {
      ...WatchCardFields
    }
  }
  ${WATCH_CARD_FRAGMENT}
`;

export const WATCH_QUERY = gql`
  query Watch($id: ID!) {
    watch(id: $id) {
      ...WatchCardFields
      changes {
        ...ChangeSummaryFields
      }
    }
  }
  ${WATCH_CARD_FRAGMENT}
  ${CHANGE_SUMMARY_FRAGMENT}
`;

export const RECENT_CHANGES_QUERY = gql`
  query RecentChanges($limit: Int) {
    changes(limit: $limit) {
      ...ChangeSummaryFields
      watch {
        id
        name
        url
      }
    }
  }
  ${CHANGE_SUMMARY_FRAGMENT}
`;

export const CHANGE_QUERY = gql`
  query Change($id: ID!) {
    change(id: $id) {
      ...ChangeSummaryFields
      watch {
        id
        name
        url
      }
    }
  }
  ${CHANGE_SUMMARY_FRAGMENT}
`;
