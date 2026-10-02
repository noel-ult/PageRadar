import type { TypedDocumentNode } from "@apollo/client";
import type {
  LoginMutation,
  LoginMutationVariables,
  RegisterMutation,
  RegisterMutationVariables,
  CreateWatchMutation,
  CreateWatchMutationVariables,
  PauseWatchMutation,
  PauseWatchMutationVariables,
  ResumeWatchMutation,
  ResumeWatchMutationVariables,
  DeleteWatchMutation,
  DeleteWatchMutationVariables,
  CheckWatchNowMutation,
  CheckWatchNowMutationVariables,
  UpdateWatchMutation,
  UpdateWatchMutationVariables,
  PreviewWatchMutation,
  PreviewWatchMutationVariables,
  MarkNotificationReadMutation,
  MarkNotificationReadMutationVariables,
  MarkAllNotificationsReadMutation,
  MarkAllNotificationsReadMutationVariables,
} from "./generated";
import { gql } from "@apollo/client";
import { WATCH_CARD_FRAGMENT } from "./fragments";

export const LOGIN_MUTATION: TypedDocumentNode<
  LoginMutation,
  LoginMutationVariables
> = gql`
  mutation Login($email: String!, $password: String!) {
    login(input: { email: $email, password: $password }) {
      accessToken
      user {
        id
        name
        email
      }
    }
  }
`;

export const REGISTER_MUTATION: TypedDocumentNode<
  RegisterMutation,
  RegisterMutationVariables
> = gql`
  mutation Register($name: String!, $email: String!, $password: String!) {
    register(input: { name: $name, email: $email, password: $password }) {
      accessToken
    }
  }
`;

export const CREATE_WATCH_MUTATION: TypedDocumentNode<
  CreateWatchMutation,
  CreateWatchMutationVariables
> = gql`
  mutation CreateWatch($input: CreateWatchInput!) {
    createWatch(input: $input) {
      ...WatchCardFields
    }
  }
  ${WATCH_CARD_FRAGMENT}
`;

export const PAUSE_WATCH_MUTATION: TypedDocumentNode<
  PauseWatchMutation,
  PauseWatchMutationVariables
> = gql`
  mutation PauseWatch($id: ID!) {
    toggleWatch(id: $id, isActive: false) {
      id
      isActive
    }
  }
`;

export const RESUME_WATCH_MUTATION: TypedDocumentNode<
  ResumeWatchMutation,
  ResumeWatchMutationVariables
> = gql`
  mutation ResumeWatch($id: ID!) {
    toggleWatch(id: $id, isActive: true) {
      id
      isActive
    }
  }
`;

export const DELETE_WATCH_MUTATION: TypedDocumentNode<
  DeleteWatchMutation,
  DeleteWatchMutationVariables
> = gql`
  mutation DeleteWatch($id: ID!) {
    deleteWatch(id: $id)
  }
`;

export const CHECK_WATCH_NOW_MUTATION: TypedDocumentNode<
  CheckWatchNowMutation,
  CheckWatchNowMutationVariables
> = gql`
  mutation CheckWatchNow($id: ID!) {
    checkWatchNow(id: $id) {
      id
      status
      completedAt
      error
    }
  }
`;

export const UPDATE_WATCH_MUTATION: TypedDocumentNode<
  UpdateWatchMutation,
  UpdateWatchMutationVariables
> = gql`
  mutation UpdateWatch($id: ID!, $input: UpdateWatchInput!) {
    updateWatch(id: $id, input: $input) {
      ...WatchCardFields
    }
  }
  ${WATCH_CARD_FRAGMENT}
`;

export const PREVIEW_WATCH_MUTATION: TypedDocumentNode<
  PreviewWatchMutation,
  PreviewWatchMutationVariables
> = gql`
  mutation PreviewWatch($input: CreateWatchInput!) {
    previewWatch(input: $input) {
      text
      sections
    }
  }
`;
export const MARK_NOTIFICATION_READ_MUTATION: TypedDocumentNode<
  MarkNotificationReadMutation,
  MarkNotificationReadMutationVariables
> = gql`
  mutation MarkNotificationRead($id: ID!) {
    markNotificationRead(id: $id)
  }
`;
export const MARK_ALL_NOTIFICATIONS_READ_MUTATION: TypedDocumentNode<
  MarkAllNotificationsReadMutation,
  MarkAllNotificationsReadMutationVariables
> = gql`
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`;
