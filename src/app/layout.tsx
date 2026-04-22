import type { Metadata } from "next"
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
})

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "Taiko Launchpad",
  description: "Internal launch pipeline for Taiko apps",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-screen">
        {children}
        <Toaster
          richColors
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--color-bg-overlay)",
              border: "1px solid var(--color-border)",
              color: "var(--color-fg)",
              fontFamily: "var(--font-sans)",
            },
          }}
        />
      </body>
    </html>
  )
}
