"use client"

import { useState } from "react"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createApp, type CreateAppState } from "@/app/apps/actions"

const initialState: CreateAppState = { status: "idle" }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Submitting…" : "Submit as MVP"}
    </Button>
  )
}

export function CreateAppDialog() {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useActionState(createApp, initialState)

  function getFieldError(field: string): string | undefined {
    return state.status === "error" ? state.fieldErrors?.[field] : undefined
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          New app
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Submit a new app (MVP)</DialogTitle>
          <DialogDescription>
            Make sure the idea has been validated with your manager before
            submitting. You can edit these fields later.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">App name</Label>
            <Input id="name" name="name" required />
            {getFieldError("name") && (
              <p className="text-xs text-red-600">{getFieldError("name")}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="value_hypothesis">
              Value hypothesis{" "}
              <span className="text-muted-foreground font-normal">
                — one sentence
              </span>
            </Label>
            <Textarea
              id="value_hypothesis"
              name="value_hypothesis"
              rows={2}
              required
            />
            {getFieldError("value_hypothesis") && (
              <p className="text-xs text-red-600">
                {getFieldError("value_hypothesis")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_user">Target user</Label>
            <Input id="target_user" name="target_user" required />
            {getFieldError("target_user") && (
              <p className="text-xs text-red-600">
                {getFieldError("target_user")}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="repo_url">GitHub repo URL</Label>
              <Input
                id="repo_url"
                name="repo_url"
                type="url"
                placeholder="https://github.com/..."
                required
              />
              {getFieldError("repo_url") && (
                <p className="text-xs text-red-600">
                  {getFieldError("repo_url")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="live_url">
                Live URL{" "}
                <span className="text-muted-foreground font-normal">
                  (optional at MVP)
                </span>
              </Label>
              <Input
                id="live_url"
                name="live_url"
                type="url"
                placeholder="https://..."
              />
              {getFieldError("live_url") && (
                <p className="text-xs text-red-600">
                  {getFieldError("live_url")}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="testing_instructions">
              Testing instructions{" "}
              <span className="text-muted-foreground font-normal">
                (optional at MVP, required before Ready for Mainnet)
              </span>
            </Label>
            <Textarea
              id="testing_instructions"
              name="testing_instructions"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="monetization_model">
                Monetization model{" "}
                <span className="text-muted-foreground font-normal">
                  (can be set later)
                </span>
              </Label>
              <Select name="monetization_model">
                <SelectTrigger id="monetization_model">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free_for_now">Free for now</SelectItem>
                  <SelectItem value="crypto">Pay with crypto</SelectItem>
                  <SelectItem value="fiat_stripe">
                    Pay with FIAT (Stripe)
                  </SelectItem>
                  <SelectItem value="hybrid">Hybrid / other</SelectItem>
                </SelectContent>
              </Select>
              {getFieldError("monetization_model") && (
                <p className="text-xs text-red-600">
                  {getFieldError("monetization_model")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="monetization_description">
                Description{" "}
                <span className="text-muted-foreground font-normal">
                  (freemium, pay-per-use, etc.)
                </span>
              </Label>
              <Input
                id="monetization_description"
                name="monetization_description"
              />
            </div>
          </div>

          {state.status === "error" && state.message && (
            <p className="text-sm text-red-600" role="alert">
              {state.message}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
