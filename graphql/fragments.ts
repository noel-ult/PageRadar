import { gql } from "@apollo/client";

export const CHANGE_SUMMARY_FRAGMENT = gql`
  fragment ChangeSummaryFields on ChangeModel {
    id
    watchId
    changeType: type
    importance
    severity
    confidence
    isMeaningful
    changePercentage
    affectedSections
    section
    before: oldValue
    after: newValue
    oldValue
    newValue
    explanation: reason
    detectedAt
    watch {
      id
      name: title
      url
    }
  }
`;

export const WATCH_CARD_FRAGMENT = gql`
  fragment WatchCardFields on WatchModel {
    id
    name: title
    url
    isActive
    interests
    minimumImportance
    emailEnabled
    includeSelector
    excludeSelector
    nextCheckAt
    checkIntervalMinutes: checkInterval
    lastCheckedAt
    createdAt
    latestChange {
      ...ChangeSummaryFields
    }
  }
  ${CHANGE_SUMMARY_FRAGMENT}
`;
