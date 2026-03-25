/**
 * GitHub Issue Integration Module
 *
 * Automatically creates GitHub issues from user-submitted bug reports.
 * Uploads screenshots to a dedicated branch and embeds them in the issue body.
 *
 * Gracefully no-ops if GitHub integration is not configured.
 *
 * Required env vars:
 *   GITHUB_TOKEN               — Personal access token with `repo` scope
 *   GITHUB_REPO_OWNER          — Repository owner (e.g. "sustainability-software-lab")
 *   GITHUB_REPO_NAME           — Repository name (e.g. "cal-bioscape-frontend")
 *
 * Optional:
 *   GITHUB_ISSUE_CREATE_ENABLED — Set to "true" to enable (default: disabled)
 *   GITHUB_BASE_URL             — GitHub API base URL for GitHub Enterprise
 *                                  (e.g. "https://lbl.github.com/api/v3").
 *                                  Defaults to public GitHub (api.github.com).
 */

import { Octokit } from "@octokit/rest"

interface BugReportData {
  id: string
  title: string
  description: string
  reporterName?: string
  reporterEmail?: string
}

interface ScreenshotData {
  filename: string
  content: Buffer
}

interface GitHubIssueResult {
  issueNumber: number
  issueUrl: string
}

function getConfig() {
  const {
    GITHUB_TOKEN,
    GITHUB_REPO_OWNER,
    GITHUB_REPO_NAME,
    GITHUB_ISSUE_CREATE_ENABLED,
    GITHUB_BASE_URL,
  } = process.env

  if (GITHUB_ISSUE_CREATE_ENABLED !== "true") {
    return null
  }

  if (!GITHUB_TOKEN || !GITHUB_REPO_OWNER || !GITHUB_REPO_NAME) {
    console.warn(
      "[github] GITHUB_ISSUE_CREATE_ENABLED is true but missing required env vars " +
      "(GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME). Skipping issue creation."
    )
    return null
  }

  return {
    token: GITHUB_TOKEN,
    owner: GITHUB_REPO_OWNER,
    repo: GITHUB_REPO_NAME,
    baseUrl: GITHUB_BASE_URL || undefined,
  }
}

// Dedicated branch for storing bug-report screenshot assets.
// Using a separate branch keeps main clean and avoids triggering CI/CD.
const ASSETS_BRANCH = "bug-report-assets"

function isNotFoundError(err: unknown): boolean {
  return (err as { status?: number })?.status === 404
}

async function getOrCreateAssetsBranch(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<{ baseCommitSha: string; baseTreeSha: string }> {
  try {
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${ASSETS_BRANCH}`,
    })
    const { data: commitData } = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: refData.object.sha,
    })
    return { baseCommitSha: refData.object.sha, baseTreeSha: commitData.tree.sha }
  } catch (err) {
    if (!isNotFoundError(err)) throw err

    // Branch does not exist — create it from the tip of main.
    const { data: mainRef } = await octokit.git.getRef({
      owner,
      repo,
      ref: "heads/main",
    })
    const mainCommitSha = mainRef.object.sha
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${ASSETS_BRANCH}`,
      sha: mainCommitSha,
    })
    const { data: commitData } = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: mainCommitSha,
    })
    return { baseCommitSha: mainCommitSha, baseTreeSha: commitData.tree.sha }
  }
}

async function uploadScreenshotsToGitHub(
  octokit: Octokit,
  owner: string,
  repo: string,
  bugReportId: string,
  screenshots: ScreenshotData[],
  baseUrl?: string
): Promise<string[]> {
  if (screenshots.length === 0) return []

  const { baseCommitSha, baseTreeSha } = await getOrCreateAssetsBranch(
    octokit,
    owner,
    repo
  )

  const treeItems: Array<{
    path: string
    mode: "100644"
    type: "blob"
    sha: string
  }> = []

  const rawUrls: string[] = []

  for (const { filename, content } of screenshots) {
    const filePath = `bug-report-assets/${bugReportId}/${filename}`

    const { data: blob } = await octokit.git.createBlob({
      owner,
      repo,
      content: content.toString("base64"),
      encoding: "base64",
    })

    treeItems.push({ path: filePath, mode: "100644", type: "blob", sha: blob.sha })

    // Raw URL differs between public GitHub and GitHub Enterprise:
    //   Public: https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}
    //   GHE:    https://{ghe-host}/{owner}/{repo}/raw/{branch}/{path}
    const rawUrl = baseUrl
      ? `${baseUrl.replace(/\/api\/v3\/?$/, "")}/${owner}/${repo}/raw/${ASSETS_BRANCH}/${filePath}`
      : `https://raw.githubusercontent.com/${owner}/${repo}/${ASSETS_BRANCH}/${filePath}`

    rawUrls.push(rawUrl)
  }

  const { data: newTree } = await octokit.git.createTree({
    owner,
    repo,
    base_tree: baseTreeSha,
    tree: treeItems,
  })

  const { data: newCommit } = await octokit.git.createCommit({
    owner,
    repo,
    message: `Add screenshots for bug report ${bugReportId}`,
    tree: newTree.sha,
    parents: [baseCommitSha],
  })

  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${ASSETS_BRANCH}`,
    sha: newCommit.sha,
  })

  return rawUrls
}

function formatGitHubIssueBody(
  description: string,
  reporterName: string | undefined,
  reporterEmail: string | undefined,
  screenshotUrls: string[]
): string {
  const reporter = reporterName || reporterEmail
  let body = `## Bug Report\n\n`

  if (reporter) {
    const emailPart = reporterEmail ? ` (${reporterEmail})` : ""
    body += `**Reported by:** ${reporter}${!reporterName ? "" : emailPart}\n\n`
    body += `---\n\n`
  }

  body += `### Description\n\n${description}\n\n`

  if (screenshotUrls.length > 0) {
    body += `---\n\n### Screenshots\n\n`
    for (let i = 0; i < screenshotUrls.length; i++) {
      body += `![Screenshot ${i + 1}](${screenshotUrls[i]})\n\n`
    }
  }

  body += `---\n\n*Submitted via the CAL BioScape in-app bug report form*`
  return body
}

const ISSUE_LABELS: Array<{ name: string; color: string; description: string }> = [
  { name: "bug", color: "d73a4a", description: "Something isn't working" },
  { name: "user-reported", color: "e4e669", description: "Reported by a user via the in-app bug report form" },
]

async function ensureLabelsExist(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<void> {
  for (const label of ISSUE_LABELS) {
    try {
      await octokit.issues.getLabel({ owner, repo, name: label.name })
    } catch (err) {
      if (!isNotFoundError(err)) {
        console.warn(`[github] Unexpected error checking label "${label.name}":`, err)
        continue
      }
      try {
        await octokit.issues.createLabel({
          owner,
          repo,
          name: label.name,
          color: label.color,
          description: label.description,
        })
      } catch (createErr) {
        console.warn(`[github] Could not create label "${label.name}":`, createErr)
      }
    }
  }
}

/**
 * Create a GitHub issue from a bug report.
 * Errors are logged but never thrown — callers can safely fire-and-forget.
 */
export async function createGitHubIssueFromBugReport(
  bugReport: BugReportData,
  screenshots: ScreenshotData[]
): Promise<GitHubIssueResult | null> {
  const config = getConfig()
  if (!config) return null

  const octokit = new Octokit({
    auth: config.token,
    ...(config.baseUrl ? { baseUrl: config.baseUrl } : {}),
  })
  const { owner, repo } = config

  await ensureLabelsExist(octokit, owner, repo)

  let screenshotUrls: string[] = []
  if (screenshots.length > 0) {
    try {
      screenshotUrls = await uploadScreenshotsToGitHub(
        octokit,
        owner,
        repo,
        bugReport.id,
        screenshots,
        config.baseUrl
      )
    } catch (err) {
      console.error("[github] Failed to upload screenshots:", err)
    }
  }

  const body = formatGitHubIssueBody(
    bugReport.description,
    bugReport.reporterName,
    bugReport.reporterEmail,
    screenshotUrls
  )

  try {
    const issue = await octokit.issues.create({
      owner,
      repo,
      title: bugReport.title,
      body,
      labels: ISSUE_LABELS.map((l) => l.name),
    })

    console.log(`[github] Created issue #${issue.data.number}: ${issue.data.html_url}`)
    return { issueNumber: issue.data.number, issueUrl: issue.data.html_url }
  } catch (err) {
    console.error("[github] Failed to create GitHub issue:", err)
    return null
  }
}
