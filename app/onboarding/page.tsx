import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { OnboardingClient } from "./onboarding-client";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.wallet) {
    redirect("/");
  }

  return <OnboardingClient />;
}
