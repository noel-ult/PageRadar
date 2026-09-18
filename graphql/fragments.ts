import { gql } from "@apollo/client";

export const CHANGE_SUMMARY_FRAGMENT = gql`
  fragment ChangeSummaryFields on Change {
    id
    changeType
    importance
    section
    before
    after
    oldValue
    newValue
    explanation
    detectedAt
  }
`;

export const WATCH_CARD_FRAGMENT = gql`
  fragment WatchCardFields on Watch {
    id
    name
    url
    status
    checkIntervalMinutes
    interests
    lastCheckedAt
    createdAt
    latestChange {
      ...ChangeSummaryFields
    }
  }
  ${CHANGE_SUMMARY_FRAGMENT}
`;
