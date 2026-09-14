import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { OnboardingClient } from "./onboarding-client";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const params = await searchParams;
  const preview =
    process.env.NODE_ENV === "development" && params.preview === "1";

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.wallet && !preview) {
    redirect("/");
  }

  return <OnboardingClient preview={preview} />;
}
