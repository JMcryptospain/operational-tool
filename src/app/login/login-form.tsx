"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { sendMagicLink, type LoginState } from "./actions"

const initialState: LoginState = { status: "idle" }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Sending…" : "Send magic link"}
    </Button>
  )
}

export function LoginForm() {
  const [state, formAction] = useActionState(sendMagicLink, initialState)

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@taiko.xyz"
          autoComplete="email"
          required
          disabled={state.status === "sent"}
        />
      </div>

      <SubmitButton />

      {state.status === "sent" && (
        <p className="text-sm text-green-600 dark:text-green-400" role="status">
          {state.message}
        </p>
      )}
      {state.status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.message}
        </p>
      )}
    </form>
  )
}
