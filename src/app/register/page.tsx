import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { RegisterForm } from "./register-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Join with Invitation — Harmoni",
  description: "Create your private Harmoni circle account using an invitation code",
};

interface RegisterPageProps {
  searchParams: Promise<{ code?: string }>;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const user = await getCurrentUser();
  const { code } = await searchParams;

  if (user) {
    redirect("/");
  }

  return (
    <main className="min-h-full flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <RegisterForm initialInviteCode={code} />
    </main>
  );
}
