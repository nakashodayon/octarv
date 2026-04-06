import { redirect } from "next/navigation"
import { getSession, deleteSession } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { cookies } from "next/headers"

async function logout() {
  "use server"
  await deleteSession()
  const cookieStore = await cookies()
  cookieStore.delete("session_token")
  redirect("/login")
}

export default async function DashboardPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-medium">Welcome, {session.name}!</h1>
        <p className="text-muted-foreground mt-2">{session.email}</p>
        
        <form action={logout} className="mt-8">
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  )
}
