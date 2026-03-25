import { NextResponse } from "next/server"
import { createGitHubIssueFromBugReport } from "@/lib/github"
import { randomBytes } from "crypto"

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif"])
const MAX_SCREENSHOT_SIZE = 10 * 1024 * 1024 // 10 MB

// POST /api/bug-reports — submit a new bug report and create a GitHub issue
export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const title = (formData.get("title") as string)?.trim()
    const description = (formData.get("description") as string)?.trim()
    const reporterName = (formData.get("reporterName") as string)?.trim() || undefined
    const reporterEmail = (formData.get("reporterEmail") as string)?.trim() || undefined
    const screenshotCount = parseInt(formData.get("screenshotCount") as string) || 0

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }
    if (!description) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 })
    }

    const screenshots: Array<{ filename: string; content: Buffer }> = []
    const timestamp = Date.now()

    for (let i = 0; i < screenshotCount; i++) {
      const file = formData.get(`screenshot-${i}`) as File | null
      if (!file || file.size === 0) continue

      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: `File "${file.name}" must be a PNG, JPEG, or GIF image` },
          { status: 400 }
        )
      }
      if (file.size > MAX_SCREENSHOT_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" must be under 10 MB` },
          { status: 400 }
        )
      }

      const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
      const content = Buffer.from(await file.arrayBuffer())
      screenshots.push({ filename: `${timestamp}-${i}-${safeFileName}`, content })
    }

    const bugReportId = randomBytes(8).toString("hex")

    // Fire-and-forget: create GitHub issue
    createGitHubIssueFromBugReport(
      { id: bugReportId, title, description, reporterName, reporterEmail },
      screenshots
    ).catch((err) => console.error("[bug-report] GitHub issue creation failed:", err))

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error("Error submitting bug report:", error)
    return NextResponse.json({ error: "Failed to submit bug report" }, { status: 500 })
  }
}
