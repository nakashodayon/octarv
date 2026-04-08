"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import { BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { login } from './actions'
import FamilyButton from '@/components/ui/family-button'

type ButtonVariant = "loading" | "error" | "success" | undefined;

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [variant, setVariant] = useState<ButtonVariant>(undefined)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setVariant("loading")
    setError(null)

    const result = await login(formData)

    if (result?.error) {
      setError(result.error)
      setVariant("error")
      setTimeout(() => setVariant(undefined), 2000)
      return
    }

    setVariant("success")
    setTimeout(() => {
      router.refresh()
      router.push("/dashboard")
    }, 1200)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <MistKitLogo className="mx-auto" />
          </Link>
          <h1 className="mt-6 text-2xl font-medium">Welcome back</h1>
          <p className="text-muted-foreground mt-2 text-sm">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          <Field>
            <FieldLabel>Email</FieldLabel>
            <Input
              type="email"
              name="email"
              placeholder="you@example.com"
              required
            />
          </Field>

          <Field>
            <FieldLabel>Password</FieldLabel>
            <Input
              type="password"
              name="password"
              placeholder="Enter your password"
              required
            />
          </Field>

          <FamilyButton
            type="submit"
            variant={variant}
            text={{
              loading: "Signing in...",
              success: "Signed in!",
              error: "Failed",
            }}
          >
            Sign in
          </FamilyButton>
        </form>

        <p className="text-muted-foreground mt-6 text-center text-sm">
          {"Don't have an account? "}
          <Link href="/signup" className="text-foreground underline underline-offset-4 hover:no-underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

const MistKitLogo = ({ className }: { className?: string }) => (
  <div
    aria-hidden
    className={cn('border-background bg-gradient-to-b rounded-xl relative flex size-9 translate-y-0.5 items-center justify-center border from-yellow-300 to-orange-600 shadow-lg shadow-black/20 ring-1 ring-black/10', className)}>
    <BookOpen className="mask-b-from-25% size-6 fill-white stroke-white drop-shadow-sm" />
    <BookOpen className="absolute inset-0 m-auto size-6 fill-white stroke-white opacity-65 drop-shadow-sm" />
    <div className="z-1 h-4.5 absolute inset-2 m-auto w-px translate-y-px rounded-full bg-black/10"></div>
  </div>
)
