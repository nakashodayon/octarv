import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { v4 as uuidv4 } from "uuid"

const sql = neon(process.env.DATABASE_URL!)

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export async function createUser(
  name: string,
  email: string,
  password: string
) {
  const hashedPassword = await hashPassword(password)
  const id = uuidv4()
  const now = new Date().toISOString()

  const existingUser = await sql`
    SELECT id FROM neon_auth.user WHERE email = ${email}
  `

  if (existingUser.length > 0) {
    throw new Error("User already exists")
  }

  await sql`
    INSERT INTO neon_auth.user (id, name, email, "createdAt", "updatedAt", "emailVerified", banned)
    VALUES (${id}, ${name}, ${email}, ${now}, ${now}, false, false)
  `

  await sql`
    INSERT INTO neon_auth.account (id, "userId", "providerId", "accountId", password, "createdAt", "updatedAt")
    VALUES (${uuidv4()}, ${id}, 'credential', ${email}, ${hashedPassword}, ${now}, ${now})
  `

  return { id, name, email }
}

export async function authenticateUser(email: string, password: string) {
  const users = await sql`
    SELECT u.id, u.name, u.email, a.password
    FROM neon_auth.user u
    JOIN neon_auth.account a ON u.id = a."userId"
    WHERE u.email = ${email} AND a."providerId" = 'credential'
  `

  if (users.length === 0) {
    return null
  }

  const user = users[0]
  const isValid = await verifyPassword(password, user.password)

  if (!isValid) {
    return null
  }

  return { id: user.id, name: user.name, email: user.email }
}

export async function createSession(userId: string) {
  const token = uuidv4()
  const id = uuidv4()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days

  await sql`
    INSERT INTO neon_auth.session (id, "userId", token, "expiresAt", "createdAt", "updatedAt")
    VALUES (${id}, ${userId}, ${token}, ${expiresAt.toISOString()}, ${now.toISOString()}, ${now.toISOString()})
  `

  return token
}

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get("session_token")?.value

  if (!token) {
    return null
  }

  const sessions = await sql`
    SELECT s.*, u.name, u.email
    FROM neon_auth.session s
    JOIN neon_auth.user u ON s."userId" = u.id
    WHERE s.token = ${token} AND s."expiresAt" > NOW()
  `

  if (sessions.length === 0) {
    return null
  }

  return {
    userId: sessions[0].userId,
    name: sessions[0].name,
    email: sessions[0].email,
  }
}

export async function deleteSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get("session_token")?.value

  if (token) {
    await sql`DELETE FROM neon_auth.session WHERE token = ${token}`
  }
}
