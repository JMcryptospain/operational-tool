"use client"

import { useState } from "react"
import { Copy, Check, ChevronDown, ChevronUp } from "lucide-react"

/**
 * Show the owner the exact snippet they need to paste in their app to
 * wire up PostHog analytics. The `group('app', <slug>)` call is what lets
 * us tell apps apart in the shared PostHog project.
 *
 * Collapsed by default to keep the detail page tight. Owners expand it
 * once, copy, then mark "Analytics wired" on the phase card.
 */
export function AnalyticsSnippet({
  slug,
  posthogToken,
  posthogHost,
}: {
  slug: string
  posthogToken: string
  posthogHost: string
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const ingestHost = posthogHost.replace("://eu.posthog.com", "://eu.i.posthog.com")
    .replace("://us.posthog.com", "://us.i.posthog.com")
    .replace("://app.posthog.com", "://app.i.posthog.com")

  const snippet = `<script>
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug getPageViewId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
  posthog.init('${posthogToken}', {
    api_host: '${ingestHost}',
    loaded: (ph) => {
      ph.register({ app: '${slug}' });
      ph.group('app', '${slug}');
    }
  });
</script>`

  const downloadEvent = `posthog.capture('download_clicked', { app: '${slug}' })`
  const paymentEvent = `posthog.capture('payment_completed', { app: '${slug}', amount: 10, currency: 'USD' })`

  const copy = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      setTimeout(() => setCopied(null), 1500)
    } catch {}
  }

  return (
    <section className="rounded-lg border border-[color:var(--color-border)] bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left"
      >
        <div>
          <h2 className="text-sm font-semibold text-[color:var(--color-fg)]">
            Analytics setup
          </h2>
          <p className="mt-0.5 text-xs text-[color:var(--color-fg-muted)]">
            Paste these snippets in your app so we can track visits, downloads
            and payments.
          </p>
        </div>
        {open ? (
          <ChevronUp className="size-4 shrink-0 text-[color:var(--color-fg-muted)]" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-[color:var(--color-fg-muted)]" />
        )}
      </button>

      {open && (
        <div className="space-y-5 border-t border-[color:var(--color-border)] px-5 py-4">
          {/* Slug */}
          <div>
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-subtle)]">
              Your app slug
            </div>
            <div className="flex items-center gap-2">
              <code className="rounded bg-[color:var(--color-bg-subtle)] px-2 py-1 font-mono text-xs text-[color:var(--color-fg)]">
                {slug}
              </code>
              <CopyBtn onCopy={() => copy(slug, "slug")} copied={copied === "slug"} />
            </div>
            <p className="mt-1.5 text-xs text-[color:var(--color-fg-muted)]">
              This identifies your app inside the shared Taiko PostHog project.
            </p>
          </div>

          {/* Step 1 — Snippet */}
          <Block
            title="1. Install the PostHog snippet"
            hint={
              <>
                Paste inside your app's{" "}
                <code className="rounded bg-[color:var(--color-bg-subtle)] px-1">
                  &lt;head&gt;
                </code>
                . Replace{" "}
                <code className="rounded bg-[color:var(--color-bg-subtle)] px-1">
                  &lt;YOUR_POSTHOG_API_KEY&gt;
                </code>{" "}
                with the key from the shared Taiko project settings (ask the
                admin if you don't have it).
              </>
            }
            code={snippet}
            onCopy={() => copy(snippet, "snippet")}
            copied={copied === "snippet"}
          />

          {/* Step 2 — Download event */}
          <Block
            title="2. Track the download / install button"
            hint="Call this from whatever triggers a download or install in your app."
            code={downloadEvent}
            onCopy={() => copy(downloadEvent, "download")}
            copied={copied === "download"}
          />

          {/* Step 3 — Payment event */}
          <Block
            title="3. Track successful payments"
            hint="Call this after a user's payment confirms (Stripe webhook, on-chain confirmation, etc.)."
            code={paymentEvent}
            onCopy={() => copy(paymentEvent, "payment")}
            copied={copied === "payment"}
          />

          <p className="border-t border-[color:var(--color-border)] pt-3 text-xs text-[color:var(--color-fg-muted)]">
            Done? Mark <strong>Analytics wired</strong> on the Refining &amp; Legal
            card above.
          </p>
        </div>
      )}
    </section>
  )
}

function Block({
  title,
  hint,
  code,
  onCopy,
  copied,
}: {
  title: string
  hint: React.ReactNode
  code: string
  onCopy: () => void
  copied: boolean
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-[color:var(--color-fg)]">
          {title}
        </h3>
        <CopyBtn onCopy={onCopy} copied={copied} />
      </div>
      <p className="mb-2 text-xs text-[color:var(--color-fg-muted)]">{hint}</p>
      <pre className="overflow-x-auto rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] p-3 font-mono text-[11px] leading-relaxed text-[color:var(--color-fg)]">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function CopyBtn({ onCopy, copied }: { onCopy: () => void; copied: boolean }) {
  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex items-center gap-1 rounded border border-[color:var(--color-border)] bg-white px-2 py-1 text-[11px] text-[color:var(--color-fg-muted)] transition hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)]"
    >
      {copied ? (
        <>
          <Check className="size-3" strokeWidth={3} /> Copied
        </>
      ) : (
        <>
          <Copy className="size-3" /> Copy
        </>
      )}
    </button>
  )
}
