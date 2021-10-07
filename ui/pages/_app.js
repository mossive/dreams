import { useEffect, useState } from "react";
import { withApollo } from "lib/apollo";
import { useQuery, gql } from "@apollo/client";
import { createMuiTheme, ThemeProvider } from "@material-ui/core/styles";
import { UserProvider, useFetchUser } from "lib/user";
import "../styles.css";
import "react-tippy/dist/tippy.css";
import { withUrqlClient, initUrqlClient } from "next-urql";
import { client } from "../graphql/client";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import * as Urql from "urql";

export const TOP_LEVEL_QUERY = gql`
  query TopLevelQuery($slug: String!, $orgSlug: String!) {
    event(slug: $slug, orgSlug: $orgSlug) {
      id
      slug
      info
      title
      archived
      color
      currency
      registrationPolicy
      maxAmountToDreamPerUser
      dreamCreationCloses
      dreamCreationIsOpen
      grantingOpens
      grantingCloses
      grantingIsOpen
      numberOfApprovedMembers
      about
      allowStretchGoals
      dreamReviewIsOpen
      discourseCategoryId
      guidelines {
        id
        title
        description
        position
      }
      customFields {
        id
        name
        description
        type
        limit
        isRequired
        position
        createdAt
      }
      tags {
        id
        value
      }
    }
    currentUser {
      id
      username
      avatar
      email
      currentOrgMember {
        id
        bio
      }
    }
    currentOrgMember(slug: $orgSlug) {
      id
      bio
      isOrgAdmin
      discourseUsername
      hasDiscourseApiKey
      user {
        id
        username
        email
      }
      eventMemberships {
        id
        event {
          id
          title
          slug
        }
      }
      currentEventMembership(slug: $slug) {
        id
        isAdmin
        isGuide
        isApproved
        balance
        event {
          id
          title
        }
      }
    }

    currentOrg(slug: $orgSlug) {
      id
      name
      info
      logo
      subdomain
      customDomain
      discourseUrl
      finishedTodos
    }
  }
`;

export const CURRENT_USER_QUERY = gql`
  {
    currentUser {
      id
      username
      email
    }
  }
`;

export function useGetCurrentUserQuery(options = {}) {
  return Urql.useQuery({ query: CURRENT_USER_QUERY, ...options });
}

const MyApp = ({ Component, pageProps, router }) => {
  // const { user, loading } = useFetchUser();
  const [
    { data: { currentUser } = { currentUser: null }, fetching },
  ] = useGetCurrentUserQuery();
  console.log({ currentUser, fetching });
  useEffect(() => {
    const jssStyles = document.querySelector("#jss-server-side");
    if (jssStyles && jssStyles.parentNode)
      jssStyles.parentNode.removeChild(jssStyles);
  });
  let currentOrg, currentOrgMember, event;
  // const {
  //   data: { currentUser, currentOrg, currentOrgMember, event } = {},
  // } = useQuery(TOP_LEVEL_QUERY, {
  //   variables: { slug: router.query.event },
  // });

  const [modal, setModal] = useState(null);

  const openModal = (name) => {
    if (modal !== name) setModal(name);
  };

  const closeModal = () => {
    setModal(null);
  };

  return (
    // <UserProvider value={{ user, loading }}>
    // <ThemeProvider theme={theme}>
    <>
      <Modal
        active={modal}
        closeModal={closeModal}
        currentOrgMember={currentOrgMember}
        currentUser={currentUser}
        currentOrg={currentOrg}
      />
      <Layout
        currentUser={currentUser}
        currentOrgMember={currentOrgMember}
        currentOrg={currentOrg}
        openModal={openModal}
        event={event}
        router={router}
        title={
          currentOrg
            ? event
              ? `${event.title} | ${currentOrg.name}`
              : currentOrg.name
            : "Plato"
        }
      >
        <Component
          {...pageProps}
          event={event}
          currentUser={currentUser}
          currentOrgMember={currentOrgMember}
          currentOrg={currentOrg}
          openModal={openModal}
          router={router}
        />
      </Layout>
    </>
    // </ThemeProvider>
    // </UserProvider>
  );
};

export default withUrqlClient(client, { ssr: true })(MyApp);

//export default withApollo({ ssr: true })(MyApp);
