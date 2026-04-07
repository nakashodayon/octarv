import { redirect } from "next/navigation";
import { neon } from "@neondatabase/serverless";
import { getSession } from "@/lib/auth";
import { ensureXOauthTable } from "@/lib/x-oauth";

const sql = neon(process.env.DATABASE_URL!);

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  await ensureXOauthTable();
  const tokens = await sql`
    SELECT user_id FROM x_oauth_tokens WHERE user_id = ${session.userId} LIMIT 1
  `;
  if (tokens.length === 0) {
    redirect("/onboarding");
  }

  return <>{children}</>;
}
