import { Suspense } from "react";
import SignupForm from "./SignupForm";

export const metadata = {
  title: "Create account — Desi Cal AI",
};

// Day 11: Suspense boundary — SignupForm reads ?ref= via useSearchParams,
// which requires it for static prerendering.
export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
