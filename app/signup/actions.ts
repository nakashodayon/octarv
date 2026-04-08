"use server"

import { cookies } from "next/headers"
import { createUser, createSession } from "@/lib/auth"

export async function signup(formData: FormData) {
  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!name || !email || !password) {
    return { error: "All fields are required" }
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" }
  }

  try {
    const user = await createUser(name, email, password)
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
    if (error instanceof Error && error.message === "User already exists") {
      return { error: "User already exists" }
    }
    console.error("[signup] failed:", error)
    return { error: error instanceof Error ? error.message : "Signup failed" }
  }
}
