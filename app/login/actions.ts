"use server"

import { cookies } from "next/headers"
import { authenticateUser, createSession } from "@/lib/auth"

export async function login(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  try {
    const user = await authenticateUser(email, password)

    if (!user) {
      return { error: "Invalid email or password" }
    }

    const token = await createSession(user.id)

    const cookieStore = await cookies()
    cookieStore.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    })

    return { success: true }
  } catch (error) {
    console.error("[login] failed:", error)
    return { error: error instanceof Error ? error.message : "Login failed" }
  }
}
