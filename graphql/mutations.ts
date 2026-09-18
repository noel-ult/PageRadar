import { gql } from "@apollo/client";
import { WATCH_CARD_FRAGMENT } from "./fragments";

export const LOGIN_MUTATION = gql`
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

export const REGISTER_MUTATION = gql`
  mutation Register($name: String!, $email: String!, $password: String!) {
    register(input: { name: $name, email: $email, password: $password }) {
      accessToken
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
    toggleWatch(id: $id, isActive: false) {
      id
      isActive
    }
  }
`;

export const RESUME_WATCH_MUTATION = gql`
  mutation ResumeWatch($id: ID!) {
    toggleWatch(id: $id, isActive: true) {
      id
      isActive
    }
  }
`;

export const DELETE_WATCH_MUTATION = gql`
  mutation DeleteWatch($id: ID!) {
    deleteWatch(id: $id)
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
