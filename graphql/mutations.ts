import { gql } from "@apollo/client";
import { WATCH_CARD_FRAGMENT } from "./fragments";

export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      accessToken
      access_token
      token
      user {
        id
        name
        email
      }
    }
  }
`;

export const REGISTER_MUTATION = gql`
  mutation Register($name: String!, $email: String!, $password: String!) {
    register(name: $name, email: $email, password: $password) {
      id
      name
      email
    }
  }
`;

export const CREATE_WATCH_MUTATION = gql`
  mutation CreateWatch($input: CreateWatchInput!) {
    createWatch(input: $input) {
      ...WatchCardFields
    }
  }
  ${WATCH_CARD_FRAGMENT}
`;

export const PAUSE_WATCH_MUTATION = gql`
  mutation PauseWatch($id: ID!) {
    pauseWatch(id: $id) {
      id
      status
    }
  }
`;

export const RESUME_WATCH_MUTATION = gql`
  mutation ResumeWatch($id: ID!) {
    resumeWatch(id: $id) {
      id
      status
    }
  }
`;

export const DELETE_WATCH_MUTATION = gql`
  mutation DeleteWatch($id: ID!) {
    deleteWatch(id: $id)
  }
`;

export const CHECK_WATCH_NOW_MUTATION = gql`
  mutation CheckWatchNow($id: ID!) {
    checkWatchNow(id: $id) {
      id
      status
      lastCheckedAt
    }
  }
`;

export const UPDATE_WATCH_MUTATION = gql`
  mutation UpdateWatch($id: ID!, $input: UpdateWatchInput!) {
    updateWatch(id: $id, input: $input) {
      ...WatchCardFields
    }
  }
  ${WATCH_CARD_FRAGMENT}
`;
