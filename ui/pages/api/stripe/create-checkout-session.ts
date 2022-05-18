import { appLink } from "utils/internalLinks";
import handler from "server/api-handler";
import { getRoundMember } from "server/graphql/resolvers/helpers";
import prisma from "server/prisma";
import stripe from "server/utils/stripe";

export default handler().post(async (req, res) => {
  console.log("handling cchekout");
  if (typeof req.query?.bucketId !== "string") throw new Error("Bad bucketId");
  if (typeof req.query?.contribution !== "string")
    throw new Error("Bad contribution");
  if (typeof req.query?.tipAmount !== "string")
    throw new Error("Bad tipAmount");
  const bucketId = req.query?.bucketId;
  const contribution = Number(req.query?.contribution);
  const tipAmount = Number(req.query?.tipAmount);

  // throws if not a round member
  const roundMember = await getRoundMember({
    bucketId,
    userId: req.user.id,
    include: { user: true },
  });

  const bucket = await prisma.bucket.findUnique({
    where: { id: bucketId },
    include: { round: { include: { group: true } } },
  });

  if (!bucket.directFundingEnabled || !bucket.round.directFundingEnabled) {
    throw new Error("Direct funding not enabled for this bucket and/or round");
  }

  const isExchange = bucket.directFundingType === "EXCHANGE";

  if (
    !Number.isSafeInteger(contribution) ||
    contribution <= 0 ||
    (isExchange && contribution < bucket.exchangeMinimumContribution)
  ) {
    throw new Error("Invalid or too low contribution");
  }

  if (
    !Number.isSafeInteger(tipAmount) ||
    tipAmount < 0 ||
    tipAmount > contribution
  ) {
    throw new Error("Invalid, too low, or too high tip amount");
  }

  req.session.redirect = appLink(
    `/${bucket.round.group.slug}/${bucket.round.slug}/${bucket.id}`
  );

  const callbackLink = appLink("/api/stripe/return");

  //TODO: taxes
  //TODO: text note about which round and bucket it's for
  const session = await stripe.checkout.sessions.create(
    {
      line_items: [
        {
          name: "Contribution",
          amount: contribution,
          currency: bucket.round.currency.toLowerCase(),
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: tipAmount,
      },
      customer_email: roundMember.user.email,
      mode: "payment",
      success_url: callbackLink,
      cancel_url: callbackLink,
    },
    {
      stripeAccount: bucket.round.stripeAccountId,
    }
  );

  res.redirect(303, session.url);
});
