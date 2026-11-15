import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { getSafeRedirectUrl } from "@/lib/auth/redirect";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign In — Harmoni",
  description: "Sign in to your private Harmoni circle account",
};

interface LoginPageProps {
  searchParams: Promise<{ returnTo?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  const { returnTo } = await searchParams;

  if (user) {
    const destination = getSafeRedirectUrl(returnTo, "/");
    redirect(destination);
  }

  return (
    <main className="min-h-full flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <LoginForm returnTo={returnTo} />
    </main>
  );
}
