"use client";

import { useFormState } from "react-dom";
import { setAdmin, type SetAdminState } from "@/lib/admin";

const initialState: SetAdminState = {};

/**
 * Grant/revoke admin role button. The server action re-validates everything
 * (role, ownership of self, zod input) — this is only the affordance.
 */
export default function AdminToggle({
  userId,
  email,
  isAdmin,
}: {
  userId: string;
  email: string;
  isAdmin: boolean;
}) {
  const [state, formAction] = useFormState(setAdmin, initialState);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !confirm(
            `${isAdmin ? "Revoke" : "Grant"} admin access for ${email}?`,
          )
        ) {
          e.preventDefault();
        }
      }}
      className="inline"
    >
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="grant" value={isAdmin ? "false" : "true"} />
      <button
        type="submit"
        className={
          isAdmin
            ? "rounded-full bg-red-100 px-4 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-200"
            : "rounded-full bg-orange-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-orange-700"
        }
      >
        {isAdmin ? "Revoke admin" : "Grant admin"}
      </button>
      {state?.error ? (
        <p className="mt-1 text-xs text-red-600">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="mt-1 text-xs text-green-600">Updated.</p>
      ) : null}
    </form>
  );
}
