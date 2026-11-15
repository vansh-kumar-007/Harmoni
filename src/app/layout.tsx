import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/dal";
import { getValidThemeKey } from "@/lib/theme/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: "Harmoni",
  description: "Personal-scale social music web application",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const themeKey = getValidThemeKey(user?.themeKey);

  return (
    <html
      lang="en"
      data-theme={themeKey}
      className="dark h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
