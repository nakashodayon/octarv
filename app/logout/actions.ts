"use server"

import { cookies } from "next/headers"
import { deleteSession } from "@/lib/auth"

export async function logout() {
  await deleteSession()
  const cookieStore = await cookies()
  cookieStore.delete("session_token")
  return { success: true }
}
