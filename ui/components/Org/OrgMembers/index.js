import { useState } from "react";
import { useQuery, useMutation, gql } from "urql";

import Button from "components/Button";
import InviteMembersModal from "components/InviteMembersModal";

import OrgMembersTable from "./OrgMembersTable";

const UPDATE_ORG_MEMBER = gql`
  mutation UpdateOrgMember($orgId: ID!, $memberId: ID!, $isAdmin: Boolean) {
    updateOrgMember(orgId: $orgId, memberId: $memberId, isAdmin: $isAdmin) {
      id
      isAdmin
    }
  }
`;

// // TODO: change to deleting org members, not round members
// const DELETE_MEMBER = gql`
//   mutation UpdateMember($memberId: ID!, $roundId: ID!) {
//     deleteMember(memberId: $memberId, roundId: $roundId) {
//       id
//     }
//   }
// `;

const OrgMembers = ({ currentOrg }) => {
  const [, updateOrgMember] = useMutation(UPDATE_ORG_MEMBER);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  // const [deleteMember] = useMutation(DELETE_MEMBER, {
  //   variables: { roundId: round.id },
  //   update(cache, { data: { deleteMember } }) {
  //     const { members } = cache.readQuery({
  //       query: MEMBERS_QUERY,
  //       variables: { roundId: round.id },
  //     });

  //     cache.writeQuery({
  //       query: MEMBERS_QUERY,
  //       variables: { roundId: round.id },
  //       data: {
  //         members: members.filter((member) => member.id !== deleteMember.id),
  //       },
  //     });
  //   },
  // });

  return (
    <div>
      <div className="flex justify-between mb-3 items-center">
        <h2 className="text-xl font-semibold">Group members</h2>{" "}
        <div>
          <Button onClick={() => setInviteModalOpen(true)}>
            Invite members
          </Button>
          {inviteModalOpen && (
            <InviteMembersModal
              currentOrg={currentOrg}
              handleClose={() => setInviteModalOpen(false)}
            />
          )}
        </div>
      </div>

      <OrgMembersTable
        updateOrgMember={updateOrgMember}
        currentOrg={currentOrg}
      />
    </div>
  );
};

export default OrgMembers;
