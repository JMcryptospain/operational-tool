import { appUrl } from "./client"

/**
 * Email HTML template. Inlined styles — email clients are strict.
 * Uses a light layout, Taiko pink accent on primary CTAs, serif heading.
 */
type LayoutArgs = {
  preheader: string
  heading: string
  intro: string
  /** Optional key/value pairs (e.g. App name / Stage / Owner). */
  meta?: Array<[string, string]>
  body?: string
  ctaLabel: string
  ctaHref: string
  footerNote?: string
}

export function layout(a: LayoutArgs): { html: string; text: string } {
  const metaRows = (a.meta ?? [])
    .map(
      ([k, v]) => `
      <tr>
        <td style="padding:6px 0;color:#8b8b8f;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;font-family:ui-monospace,Menlo,monospace;">${escapeHtml(k)}</td>
        <td style="padding:6px 0;color:#0f0f11;font-size:14px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">${escapeHtml(v)}</td>
      </tr>`
    )
    .join("")

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(a.heading)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f7f7f8;">
    <span style="display:none!important;opacity:0;visibility:hidden;mso-hide:all;height:0;width:0;font-size:0;line-height:0;">
      ${escapeHtml(a.preheader)}
    </span>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f7f7f8;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e6e6ea;border-radius:8px;">
            <tr>
              <td style="padding:28px 32px 20px 32px;border-bottom:1px solid #e6e6ea;">
                <div style="font-family:ui-monospace,Menlo,monospace;font-size:11px;color:#8b8b8f;letter-spacing:0.18em;text-transform:uppercase;">
                  <span style="color:#e81899;">Taiko</span> Launchpad
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 8px 32px;">
                <h1 style="margin:0;font-family:'Iowan Old Style',Palatino,Georgia,serif;font-size:24px;line-height:1.25;color:#0f0f11;font-weight:normal;letter-spacing:-0.01em;">
                  ${escapeHtml(a.heading)}
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 32px 20px 32px;">
                <p style="margin:0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.55;color:#555558;">
                  ${escapeHtml(a.intro)}
                </p>
              </td>
            </tr>
            ${
              metaRows
                ? `<tr>
                    <td style="padding:0 32px 20px 32px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid #e6e6ea;border-bottom:1px solid #e6e6ea;">
                        ${metaRows}
                      </table>
                    </td>
                  </tr>`
                : ""
            }
            ${
              a.body
                ? `<tr>
                    <td style="padding:0 32px 20px 32px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.55;color:#0f0f11;">
                      ${a.body}
                    </td>
                  </tr>`
                : ""
            }
            <tr>
              <td style="padding:0 32px 28px 32px;">
                <a href="${escapeAttr(a.ctaHref)}" style="display:inline-block;background:#e81899;color:#ffffff;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:14px;font-weight:500;text-decoration:none;padding:10px 18px;border-radius:4px;">
                  ${escapeHtml(a.ctaLabel)} &nbsp;&rarr;
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px 24px 32px;border-top:1px solid #e6e6ea;">
                <p style="margin:0;font-family:ui-monospace,Menlo,monospace;font-size:11px;color:#8b8b8f;letter-spacing:0.16em;text-transform:uppercase;">
                  ${escapeHtml(a.footerNote ?? "You're receiving this because you're part of Taiko.")}
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0 0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;font-size:11px;color:#8b8b8f;">
            <a href="${escapeAttr(appUrl("/"))}" style="color:#8b8b8f;text-decoration:underline;">operational-tool.vercel.app</a>
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`

  // Plain-text fallback
  const metaText = (a.meta ?? [])
    .map(([k, v]) => `  ${k.toUpperCase()}: ${v}`)
    .join("\n")
  const text = [
    `Taiko Launchpad`,
    ``,
    a.heading,
    ``,
    a.intro,
    ``,
    metaText,
    ``,
    `${a.ctaLabel}: ${a.ctaHref}`,
    ``,
    a.footerNote ?? "You're receiving this because you're part of Taiko.",
  ]
    .filter(Boolean)
    .join("\n")

  return { html, text }
}

/* --- HTML escape helpers (no deps) --- */

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function escapeAttr(s: string): string {
  return escapeHtml(s)
}
