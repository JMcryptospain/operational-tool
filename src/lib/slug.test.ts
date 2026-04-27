import { describe, it, expect } from "vitest"
import { slugifyName, buildAppSlug } from "./slug"

describe("slugifyName", () => {
  it("lowercases", () => {
    expect(slugifyName("Hello World")).toBe("hello-world")
  })

  it("collapses runs of non-alphanumerics to a single dash", () => {
    expect(slugifyName("a   b___c!!d")).toBe("a-b-c-d")
  })

  it("strips leading and trailing dashes", () => {
    expect(slugifyName("---hello---")).toBe("hello")
  })

  it("strips accents from NFKD-normalizable characters", () => {
    expect(slugifyName("Aplicación")).toBe("aplicacion")
    expect(slugifyName("café")).toBe("cafe")
    expect(slugifyName("naïve")).toBe("naive")
  })

  it("caps at 48 characters", () => {
    const long = "a".repeat(60)
    expect(slugifyName(long)).toHaveLength(48)
  })

  it("returns empty string for non-alphanumeric input", () => {
    expect(slugifyName("!!!---???")).toBe("")
    expect(slugifyName("")).toBe("")
  })

  it("preserves digits", () => {
    expect(slugifyName("App 2.0 Beta")).toBe("app-2-0-beta")
  })

  it("does not produce double dashes inside the slug", () => {
    expect(slugifyName("foo -- bar")).toBe("foo-bar")
  })
})

describe("buildAppSlug", () => {
  const appId = "abcdef12-3456-7890-abcd-ef1234567890"

  it("appends a 6-char suffix derived from the app id", () => {
    expect(buildAppSlug("Inspector", appId)).toBe("inspector-abcdef")
  })

  it("falls back to 'app' when the name has no usable characters", () => {
    expect(buildAppSlug("???", appId)).toBe("app-abcdef")
    expect(buildAppSlug("", appId)).toBe("app-abcdef")
  })

  it("strips dashes from the suffix and lowercases", () => {
    expect(buildAppSlug("X", "ABCDEF-1234")).toBe("x-abcdef")
  })

  it("is stable for the same (name, id)", () => {
    const a = buildAppSlug("Same Name", appId)
    const b = buildAppSlug("Same Name", appId)
    expect(a).toBe(b)
  })

  it("changes when only the id changes", () => {
    const id1 = "11111111-aaaa-bbbb-cccc-dddddddddddd"
    const id2 = "22222222-eeee-ffff-0000-111111111111"
    expect(buildAppSlug("Same", id1)).not.toBe(buildAppSlug("Same", id2))
  })
})
