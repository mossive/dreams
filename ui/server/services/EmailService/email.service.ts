import { SendEmailInput, sendEmail, sendEmails } from "server/send-email";
import isURL from "validator/lib/isURL";
import escapeImport from "validator/lib/escape";
import { uniqBy } from "lodash";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";

import { Prisma } from "@prisma/client";
import prisma from "../../prisma";
import { getRequestOrigin } from "../../get-request-origin";
import { orgHasDiscourse } from "server/subscribers/discourse.subscriber";

/** path including leading slash */
function appLink(path: string): string {
  const protocol = process.env.NODE_ENV == "production" ? "https" : "http";
  const url = `${protocol}://${process.env.DEPLOY_URL}${path}`;
  if (!isURL(url, { host_whitelist: [process.env.DEPLOY_URL.split(":")[0]] }))
    throw new Error(`Invalid link in mail: ${url}`);
  return url;
}

function escape(input: string): string | undefined | null {
  // sometimes e.g. usernames are null atm
  if (input === null || typeof input === "undefined") return input;
  return escapeImport(input);
}

const footer = `<i>Cobudget helps groups collaboratively ideate, gather and distribute funds to projects that matter to them. <a href="https://guide.cobudget.co/">Discover how it works.</a></i>`;

export default {
  inviteMember: async ({
    email,
    currentUser,
    collection,
    currentOrg,
  }: {
    email: string;
    currentUser: { name: string };
    collection?: {
      title: string;
      slug: string;
      info?: string;
      organization: { slug: string };
    };
    currentOrg?: { slug: string; name: string; info?: string };
  }) => {
    const invitedUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    const inviteLink = appLink(
      `/${currentOrg?.slug ?? collection.organization.slug}/${
        collection?.slug ?? ""
      }`
    );

    const orgCollName = currentOrg?.name ?? collection.title;

    const mdPurpose = currentOrg?.info ?? collection?.info ?? "";

    const htmlPurpose = String(
      await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkRehype)
        .use(rehypeSanitize) // sanitization done here
        .use(rehypeStringify)
        .process(mdPurpose)
    );

    await sendEmail({
      to: email,
      subject: `${currentUser.name} invited you to join "${orgCollName}" on Cobudget!`,
      html: `Hi${invitedUser.name ? ` ${escape(invitedUser.name)}` : ""}!
      <br/><br/>
      You have been invited by ${escape(currentUser.name)} to ${escape(
        orgCollName
      )} on Cobudget.
      Accept your invitation by <a href="${inviteLink}">Clicking here</a>.
      ${
        htmlPurpose
          ? `<br/><br/>
            ${htmlPurpose}`
          : ""
      }
      <br/><br/>
      ${footer}
      `,
    });
  },
  loginMagicLink: async ({ destination, href, code, req }) => {
    const link = `${getRequestOrigin(req)}${href}`;

    const hasAccountAlready = await prisma.user.findUnique({
      where: { email: destination },
    });

    if (hasAccountAlready) {
      await sendEmail({
        to: destination,
        subject: `Your Cobudget login link`,
        html: `<a href="${link}">Click here to login</a>
        <br/><br/>
        Verification code: ${code}
        <br/><br/>
        ${footer}
        `,
      });
    } else {
      await sendEmail({
        to: destination,
        subject: `Welcome to Cobudget - confirm your account and get started!`,
        html: `Welcome!
        <br/><br/>
        Your Cobudget account has been created! We're excited to welcome you to the community.
        <br/><br/>
        Please confirm your account by <a href="${link}">Clicking here</a>! Verification code: ${code}.
        <br/><br/>
        ${footer}
      `,
      });
    }
  },
  welcomeEmail: async ({ newUser }: { newUser: { email: string } }) => {
    await sendEmail({
      to: newUser.email,
      subject: "Welcome to Cobudget!",
      html: `asdfasdf TODO`,
    });
  },
  sendCommentNotification: async ({
    dream,
    event,
    currentOrg,
    currentCollMember,
    currentUser,
    comment,
  }) => {
    const cocreators = await prisma.collectionMember.findMany({
      where: { buckets: { some: { id: dream.id } } },
      include: { user: true },
    });

    const bucketLink = appLink(
      `/${currentOrg?.slug ?? "c"}/${event.slug}/${dream.id}`
    );

    const cocreatorEmails: SendEmailInput[] = cocreators
      .filter(
        (collectionMember) => collectionMember.id !== currentCollMember.id
      )
      .map(
        (collectionMember): SendEmailInput => ({
          to: collectionMember.user.email,
          subject: `New comment by ${currentUser.name} in your bucket ${dream.title}`,
          html: `Hey ${escape(collectionMember.user.name)}!
          <br/><br/>
          Your bucket “${escape(dream.title)}” received a new comment.
          <br/><br/>
          "${escape(comment.content)}"
          <br/><br/>
          <a href="${bucketLink}">Have a look</a>
          <br/><br/>
          ${footer}
          `,
        })
      );

    await sendEmails(cocreatorEmails);

    if (!orgHasDiscourse(currentOrg)) {
      const comments = await prisma.comment.findMany({
        where: { bucketId: dream.id },
        include: {
          collMember: {
            include: {
              user: true,
            },
          },
        },
      });
      const commenters = uniqBy(
        comments
          .map((comment) => comment.collMember.user)
          .filter((user) => currentUser.id !== user.id)
          // don't email the cocreators, we just emailed them above
          .filter(
            (user) =>
              !cocreators
                .map((cocreator) => cocreator.user.id)
                .includes(user.id)
          ),
        "id"
      );
      const commenterEmails = commenters.map((recipient) => ({
        to: recipient.email,
        subject: `New comment by ${currentUser.name} in bucket ${dream.title}`,
        html: `Hey ${escape(recipient.name)}!
          <br/><br/>
          People are talking about “${escape(
            dream.title
          )}” - <a href="${bucketLink}">have a look at the new comments</a>.
          <br/><br/>
          "${escape(comment.content)}"
          <br/><br/>
          ${footer}
        `,
      }));
      await sendEmails(commenterEmails);
    }
  },
  allocateToMemberNotification: async ({
    collectionMemberId,
    collectionId,
    oldAmount,
    newAmount,
  }) => {
    if (newAmount <= oldAmount) return;

    const { user } = await prisma.collectionMember.findUnique({
      where: { id: collectionMemberId },
      include: { user: true },
    });
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      include: { organization: true },
    });
    const org = collection.organization;

    await sendEmail({
      to: user.email,
      subject: `${user.name}, you’ve received funds to spend in ${collection.title}!`,
      html: `You have received ${(newAmount - oldAmount) / 100} ${
        collection.currency
      } in ${escape(collection.title)}.
      <br/><br/>
      Decide now which buckets to allocate your funds to by checking out the current proposals in <a href="${appLink(
        `/${org.slug}/${collection.slug}`
      )}">${escape(collection.title)}</a>.
      <br/><br/>
      ${footer}
      `,
    });
  },
  cancelFundingNotification: async ({
    bucket,
  }: {
    bucket: Prisma.BucketCreateInput & {
      collection: Prisma.CollectionCreateInput & {
        organization: Prisma.OrganizationCreateInput;
      };
      Contributions: Array<
        Prisma.ContributionCreateInput & {
          collectionMember: Prisma.CollectionMemberCreateInput & {
            user: Prisma.UserCreateInput;
          };
        }
      >;
    };
  }) => {
    const refundedCollMembers = uniqBy(
      bucket.Contributions.map((contribution) => contribution.collectionMember),
      "id"
    );
    const emails: SendEmailInput[] = refundedCollMembers.map((collMember) => {
      const amount = bucket.Contributions.filter(
        (contrib) => contrib.collectionMember.id === collMember.id
      )
        .map((contrib) => contrib.amount)
        .reduce((a, b) => a + b, 0);

      return {
        to: collMember.user.email,
        subject: `${bucket.title} was cancelled`,
        html: `The bucket “${escape(
          bucket.title
        )}” you have contributed to was cancelled in ${escape(
          bucket.collection.title
        )}. You've been refunded ${amount / 100} ${bucket.collection.currency}.
        <br/><br/>
        Explore other buckets you can fund in <a href="${appLink(
          `/${bucket.collection.organization.slug}/${bucket.collection.slug}`
        )}">${escape(bucket.collection.title)}</a>.
        <br/><br/>
        ${footer}
        `,
      };
    });
    await sendEmails(emails);
  },
  bucketPublishedNotification: async ({
    currentOrg,
    currentOrgMember,
    event,
    dream,
    unpublish,
  }) => {
    if (unpublish) return;

    const {
      collectionMember: collMembers,
    } = await prisma.collection.findUnique({
      where: { id: event.id },
      include: { collectionMember: { include: { user: true } } },
    });

    const { cocreators } = await prisma.bucket.findUnique({
      where: { id: dream.id },
      include: { cocreators: true },
    });

    // send to all coll members who aren't cocreators to the bucket
    const usersToNotify = collMembers
      .filter(
        (collMember) => !cocreators.map((co) => co.id).includes(collMember.id)
      )
      .map((collMember) => collMember.user);

    const collLink = appLink(`/${currentOrg.slug}/${event.slug}`);

    const emails = usersToNotify.map((user) => ({
      to: user.email,
      subject: `There is a new bucket in ${escape(event.title)}!`,
      html: `Creativity is flowing in ${escape(
        event.title
      )}! <a href="${collLink}">Have a look at the new buckets in this collection.</a>
      <br/><br/>
      ${footer}
      `,
    }));

    await sendEmails(emails);
  },
};
