import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import BottomMenu from "@/components/bottom-menu"

export default async function DashboardPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed bottom-6 left-0 right-0 flex justify-center">
        <BottomMenu />
      </div>
    </div>
  )
}
