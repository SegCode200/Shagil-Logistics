"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { useRoleRedirect } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import { LoadingState } from "@/components/ui/primitives";

export default function OwnerProfilePage() {
  const { user, isLoading } = useRoleRedirect("OWNER");
  const accountDetails = useQuery({
    queryKey: ["account-details"],
    queryFn: api.getAccountDetails,
    enabled: Boolean(user),
  });
  if (isLoading || !user || accountDetails.isLoading) return <LoadingState />;
  if (accountDetails.isError)
    return <LoadingState label="Unable to load account details" />;
  return (
    <OwnerAccountForm user={user} accountDetails={accountDetails.data ?? null} />
  );
}

function OwnerAccountForm({
  user,
  accountDetails,
}: {
  user: NonNullable<ReturnType<typeof useRoleRedirect>["user"]>;
  accountDetails: Awaited<ReturnType<typeof api.getAccountDetails>> | undefined;
}) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState({
    accountName:
      accountDetails?.accountName ||
      user.accountDetails?.accountName ||
      user.accountName ||
      "",
    accountNumber:
      accountDetails?.accountNumber ||
      user.accountDetails?.accountNumber ||
      user.accountNumber ||
      "",
    bankName:
      accountDetails?.bankName ||
      user.accountDetails?.bankName ||
      user.bankName ||
      "",
  });
  const [formError, setFormError] = useState("");

  const mutation = useMutation({
    mutationFn: () => api.updateAccountDetails(values),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["me"], updatedUser);
      setFormError("");
    },
    onError: (error) => {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to save account details.",
      );
    },
  });

  function updateValue(name: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    if (formError) setFormError("");
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values.accountName.trim() || !values.bankName.trim()) {
      setFormError("Account name and bank name are required.");
      return;
    }
    if (!/^\d{10}$/.test(values.accountNumber.trim())) {
      setFormError("Account number must be 10 digits.");
      return;
    }
    mutation.mutate();
  }

  return (
    <AppShell role="OWNER">
      <div className="page">
        <header className="page-header">
          <div>
            <p className="eyebrow">Owner account</p>
            <h1>Profile</h1>
            <p className="subtext">
              Add the bank account details used for delivery payments.
            </p>
          </div>
        </header>
        <section className="panel profile-card">
          <div className="panel-heading">
            <div>
              <h2>Payment account details</h2>
              <p className="panel-supporting-text">
                These details can be shown to the receiver on their delivery
                link.
              </p>
            </div>
          </div>
          <form className="panel-body form-grid" onSubmit={submit}>
            <div className="field field-span">
              <label htmlFor="account-name">Account name</label>
              <input
                className="input"
                id="account-name"
                maxLength={120}
                value={values.accountName}
                onChange={(event) =>
                  updateValue("accountName", event.target.value)
                }
                required
              />
            </div>
            <div className="field">
              <label htmlFor="account-number">Account number</label>
              <input
                className="input"
                id="account-number"
                inputMode="numeric"
                maxLength={10}
                pattern="\d{10}"
                value={values.accountNumber}
                onChange={(event) =>
                  updateValue(
                    "accountNumber",
                    event.target.value.replace(/\D/g, "").slice(0, 10),
                  )
                }
                required
              />
            </div>
            <div className="field">
              <label htmlFor="bank-name">Bank name</label>
              <input
                className="input"
                id="bank-name"
                maxLength={120}
                value={values.bankName}
                onChange={(event) =>
                  updateValue("bankName", event.target.value)
                }
                required
              />
            </div>
            <div className="form-actions field-span">
              <button
                className="button button-primary"
                disabled={mutation.isPending}
              >
                {mutation.isPending
                  ? "Saving details..."
                  : "Save account details"}
              </button>
            </div>
            {formError && (
              <p className="form-error field-span" role="alert">
                {formError}
              </p>
            )}
            {mutation.isSuccess && !formError && (
              <p className="success-text field-span" role="status">
                Account details saved.
              </p>
            )}
          </form>
        </section>
      </div>
    </AppShell>
  );
}
