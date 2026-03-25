import { NextResponse } from "next/server"
import { Octokit } from "@octokit/rest"

// GET /api/bug-reports/test — diagnostic endpoint
// Verifies GitHub API connectivity and auth. Remove or gate behind auth in production.
export async function GET() {
  const {
    GITHUB_ISSUE_CREATE_ENABLED,
    GITHUB_TOKEN,
    GITHUB_REPO_OWNER,
    GITHUB_REPO_NAME,
    GITHUB_BASE_URL,
  } = process.env

  const config = {
    enabled: GITHUB_ISSUE_CREATE_ENABLED,
    tokenPrefix: GITHUB_TOKEN ? GITHUB_TOKEN.slice(0, 20) + "…" : "(not set)",
    owner: GITHUB_REPO_OWNER || "(not set)",
    repo: GITHUB_REPO_NAME || "(not set)",
    baseUrl: GITHUB_BASE_URL || "(not set — will use api.github.com)",
  }

  if (!GITHUB_TOKEN || !GITHUB_REPO_OWNER || !GITHUB_REPO_NAME) {
    return NextResponse.json({ ok: false, config, error: "Missing required env vars" })
  }

  const octokit = new Octokit({
    auth: GITHUB_TOKEN,
    ...(GITHUB_BASE_URL ? { baseUrl: GITHUB_BASE_URL } : {}),
  })

  try {
    const { data } = await octokit.repos.get({ owner: GITHUB_REPO_OWNER, repo: GITHUB_REPO_NAME })
    return NextResponse.json({
      ok: true,
      config,
      repo: { fullName: data.full_name, private: data.private, url: data.html_url },
    })
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string; response?: { data?: unknown } }
    return NextResponse.json({
      ok: false,
      config,
      error: {
        status: e.status,
        message: e.message,
        responseData: e.response?.data,
      },
    })
  }
}
