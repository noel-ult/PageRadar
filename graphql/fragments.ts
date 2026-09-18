import { gql } from "@apollo/client";

export const CHANGE_SUMMARY_FRAGMENT = gql`
  fragment ChangeSummaryFields on ChangeModel {
    id
    changeType: type
    importance
    section
    before: oldValue
    after: newValue
    oldValue
    newValue
    explanation: reason
    detectedAt
  }
`;

export const WATCH_CARD_FRAGMENT = gql`
  fragment WatchCardFields on WatchModel {
    id
    name: title
    url
    isActive
    checkIntervalMinutes: checkInterval
    lastCheckedAt
    createdAt
  }
`;
