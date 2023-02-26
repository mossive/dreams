import { useForm } from "react-hook-form";
import { useMutation, gql } from "urql";
import Card from "components/styled/Card";
import { Box, Button, TextField } from "@material-ui/core";
import { FormattedMessage, useIntl } from "react-intl";
import toast from "react-hot-toast";
import { GRAPHQL_COLLECTIVE_NOT_FOUND } from "../../../constants";

const EDIT_ROUND = gql`
  mutation editRound($roundId: ID!, $ocCollectiveSlug: String) {
    editRound(roundId: $roundId, ocCollectiveSlug: $ocCollectiveSlug) {
      id
      ocCollective {
        id
        name
        slug
        stats {
          balance {
            valueInCents
            currency
          }
        }
      }
    }
  }
`;

const SetOpenCollective = ({ closeModal, round }) => {
  const [{ fetching }, editRound] = useMutation(EDIT_ROUND);
  const { handleSubmit, register } = useForm();
  const intl = useIntl();

  return (
    <Card>
      <Box p={3}>
        <h1 className="text-3xl">
          <FormattedMessage defaultMessage="Connect to your collective" />
        </h1>
        <form
          onSubmit={handleSubmit((variables) => {
            try {
              let ocCollectiveSlug = "";
              let ocProjectSlug = "";
              if (variables.ocCollectiveURL) {
                const url = new URL(variables.ocCollectiveURL);
                const pathTokens = url.pathname.split("/").filter((t) => t);
                ocCollectiveSlug = pathTokens[0];
                if (pathTokens[1] === "projects") {
                  ocProjectSlug = pathTokens[2];
                }
              }

              editRound({ ...variables, roundId: round.id, ocCollectiveSlug })
                .then(({ error }) => {
                  if (error) {
                    toast.error(
                      error.message.indexOf(GRAPHQL_COLLECTIVE_NOT_FOUND) > -1
                        ? intl.formatMessage({
                            defaultMessage: "Collective not found",
                          })
                        : intl.formatMessage({
                            defaultMessage: "Unknown Error",
                          })
                    );
                  } else {
                    closeModal();
                    toast.success(
                      intl.formatMessage({
                        defaultMessage: "Collective updated",
                      })
                    );
                  }
                })
                .catch((err) => {
                  console.log({ err });
                  alert(err.message);
                });
            } catch (err) {
              let message = "";
              if (err.message.indexOf("Invalid URL") > -1) {
                message = intl.formatMessage({ defaultMessage: "Invalid URL" });
              }
              toast.error(
                message ||
                  err.message ||
                  intl.formatMessage({ defaultMessage: "Unknown Error" })
              );
            }
          })}
        >
          <Box m="15px 0">
            <TextField
              name="ocCollectiveURL"
              label={intl.formatMessage({
                defaultMessage: "Collective or project URL",
              })}
              defaultValue={
                round.ocCollective?.slug
                  ? "https://opencollective.com/" + round.ocCollective?.slug
                  : ""
              }
              inputRef={register}
              fullWidth
              variant="outlined"
            />
          </Box>

          <Button
            type="submit"
            size="large"
            variant="contained"
            color="primary"
            disabled={fetching}
          >
            <FormattedMessage defaultMessage="Save" />
          </Button>
        </form>
      </Box>
    </Card>
  );
};

export default SetOpenCollective;