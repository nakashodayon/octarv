import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import BottomMenu from "@/components/bottom-menu"
import FolderInteraction from "@/components/folder-interaction"

export default async function DashboardPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  const folders = [
    { title: "Work" },
    { title: "Personal" },
    { title: "Archive" },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      {/* Folders - same width as bottom menu */}
      <div className="fixed top-6 left-0 right-0 flex justify-center">
        <div className="flex items-center gap-6">
          {folders.map((folder) => (
            <FolderInteraction key={folder.title} title={folder.title} />
          ))}
        </div>
      </div>

      {/* Bottom Menu */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center">
        <BottomMenu />
      </div>
    </div>
  )
}
