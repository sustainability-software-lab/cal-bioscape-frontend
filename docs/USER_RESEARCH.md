# Review Cal BioScape user feedback

Use the private admin page to review responses about visitors' roles, affiliations, and intended uses of Cal BioScape. Staging and production keep separate responses and credentials.

## Sign in and export responses

1. Open [production admin](https://calbioscape.org/admin) or [staging admin](https://staging.calbioscape.org/admin). The Contact page also has a **Team admin** link.
2. Sign in with username `admin` and the matching environment's password from Secret Manager. Your Google Cloud account needs `roles/secretmanager.secretAccessor` on that environment's admin-password secret in project `biocirv-470318`. Repository access alone does not grant access to the portal password; ask a project owner for access to this secret if needed.
3. Review the responses and use the page controls to read additional entries. **Export this page** downloads only the currently displayed page, with at most 50 responses. It is not an export of the entire collection.

Pages follow stable object-name order, not chronological order across the collection. Use the displayed submission dates when comparing responses from different pages.

Use Google Cloud CLI authenticated to your authorized developer account. To copy the production password to the macOS clipboard without displaying it in terminal output, run this command from any directory:

```bash
gcloud secrets versions access latest \
  --secret=calbioscape-production-feedback-admin-password \
  --project=biocirv-470318 | pbcopy
```

For staging, replace `production` with `staging` in the secret name. You can also open the [production password in Secret Manager](https://console.cloud.google.com/security/secret-manager/secret/calbioscape-production-feedback-admin-password/versions?project=biocirv-470318) or the [staging password](https://console.cloud.google.com/security/secret-manager/secret/calbioscape-staging-feedback-admin-password/versions?project=biocirv-470318) using an account with the same secret-access permission. Paste the password into the login form. A successful login opens the response list, which may be empty. Keep exported files within the project team: they can contain affiliations, free-text answers, and contact information.

Admin sessions expire after eight hours. The session cookie is HttpOnly, uses `SameSite=Strict`, and is Secure in production builds. Signing out clears the browser's cookie. A password or signing-secret change invalidates sessions once the updated credentials are loaded by the serving revision.

## Understand the collected data

The dialog opens automatically on a first map visit, with the title **Help us improve Cal BioScape**. Visitors enter an affiliation and select a role before entering the map. There is no banner, close button, or outside-click/Escape dismissal. The form collects:

- Their affiliation (required), shown first as **Institution/Affiliation**.
- Their role (required), including an **Other** option with an optional write-in field.
- What they hope to accomplish with the tool, optionally.
- An optional email address, visible by default. A valid email reveals a checkbox to stay informed about tool updates. Clearing or invalidating the email resets this choice. Entering an email alone does not opt the visitor into updates, and no messages are sent automatically by this feature.

The **Explore the tool** button is disabled until a nonblank affiliation and a role are supplied. It saves the response and opens the map directly; all other fields are optional. After submission, the dialog stays closed on later visits in the same browser. The Contact page lets visitors reopen it.

The server stores a submission identifier and timestamp with each validated response. A stable submission identifier lets the browser retry a submission without creating another response. Response objects do not include IP addresses or user-agent strings. Answers and contact information are not persisted in browser local storage. The browser remembers only the pending identifier and whether the response was submitted; suppression lasts until that browser storage is cleared.

There is no automated response deletion policy or delete control in the admin page. Responses remain in their environment's bucket until an authorized operator removes them. Bucket soft delete retains deleted objects for seven days; it does not expire active responses. Review retention needs as the collection grows. Tool-update permission does not grant permission for research interviews. The API and admin view retain a separate follow-up flag for previously collected responses; the current form does not request it.

## Locate storage and runtime configuration

Each response is a separate private JSON object at `responses/<submission-id>.json` in the environment's Cloud Storage bucket. Records include the submission ID/time, affiliation, role, optional intended task/email, and contact preference flags. The portal reads these objects directly through authenticated server routes; responses are not stored in the Git repository or a public data directory. The Next.js server accesses the bucket with its Cloud Run service account through Application Default Credentials. Credentials and bucket access stay on the server.

| Environment | Bucket | Runtime service account |
| --- | --- | --- |
| Staging | `biocirv-470318-calbioscape-feedback-staging` | `biocirv-staging-cr-frontend@biocirv-470318.iam.gserviceaccount.com` |
| Production | `biocirv-470318-calbioscape-feedback-production` | `biocirv-prod-cr-frontend@biocirv-470318.iam.gserviceaccount.com` |

Both buckets use `us-west1`, uniform bucket-level access, enforced public access prevention, and seven-day soft delete. Each runtime service account has `roles/storage.objectCreator` and `roles/storage.objectViewer` on its own bucket. The app can create and read responses but cannot overwrite or delete them. Project administrators retain their existing administrative access.

Do not use `biocirv-production-bucket` or `biocirv-staging-bucket` for user responses: those application-data buckets allow public reads.

The environment's Cloud Build file supplies these server-only settings:

| Variable | Staging | Production |
| --- | --- | --- |
| `USER_RESEARCH_BUCKET` | `biocirv-470318-calbioscape-feedback-staging` | `biocirv-470318-calbioscape-feedback-production` |
| `USER_RESEARCH_ORIGIN` | `https://staging.calbioscape.org` | `https://calbioscape.org` |
| `USER_RESEARCH_ADMIN_USERNAME` | `admin` | `admin` |
| `USER_RESEARCH_ADMIN_PASSWORD` | Secret `calbioscape-staging-feedback-admin-password` | Secret `calbioscape-production-feedback-admin-password` |
| `USER_RESEARCH_SESSION_SECRET` | Secret `calbioscape-staging-feedback-session-secret` | Secret `calbioscape-production-feedback-session-secret` |

Cloud Run references the `latest` version of each secret. Passwords and session secrets are independent for the two environments. Never add them to `NEXT_PUBLIC_*` variables, build arguments, source files, or issue comments.

## Run the survey locally

The first-visit form requires a working response store before it opens the map. For local development, use the staging bucket with Application Default Credentials for an authorized developer account. That account needs object creator and viewer access on the staging feedback bucket.

After authenticating with `gcloud auth application-default login`, start the app from the repository root:

```bash
USER_RESEARCH_BUCKET=biocirv-470318-calbioscape-feedback-staging \
USER_RESEARCH_ORIGIN=http://localhost:3000 \
npm run dev
```

Use the exact configured origin in the browser; if changing ports, change `USER_RESEARCH_ORIGIN` as well. These submissions are real staging records, so label development responses clearly and keep production storage out of local configuration. Review them through the hosted staging admin portal. To use `/admin` locally, also supply the three server-only admin username/password/session-secret variables listed above through an uncommitted local environment or process environment.

## Rotate admin access

Changing a Secret Manager version alone does not replace credentials held by running instances. Rotate the password and session secret, then deploy a new revision through the repository's normal deployment path. Changing the session secret invalidates cookies when requests reach the new revision.

From any directory, use this Python 3 command to add new independent secret versions for staging. It generates the values in memory and passes them to `gcloud` through standard input; it does not print or write the values to disk.

```bash
python3 - <<'PY'
import secrets
import subprocess

environment = 'staging'
for suffix in ['admin-password', 'session-secret']:
    subprocess.run(
        [
            'gcloud', 'secrets', 'versions', 'add',
            f'calbioscape-{environment}-feedback-{suffix}',
            '--project=biocirv-470318', '--data-file=-',
        ],
        input=secrets.token_urlsafe(48),
        text=True,
        check=True,
    )
PY
```

After the new staging revision serves all traffic, retrieve the new staging password and verify that login and response listing work. Repeat for production by changing `environment` to `production`, then deploying the production revision. Verify that the previous password fails and that an old browser session is no longer authorized. Retire older secret versions after verifying the new revision and reviewing rollback needs.

## Deploy and verify

Changes follow feature branch → `staging` → `main`. The staging-first GitHub workflow requires production PRs to originate from `staging`.

- Pushes to `staging` run `cloudbuild-staging.yaml` through global trigger `644190a9-d04e-4f9e-aa4a-88f3e3004010`.
- Pushes to `main` run `cloudbuild-prod.yaml` through global trigger `a8bc7021-185e-4b50-a945-57f73d051bcc`.
- Both pipelines deploy to Cloud Run in `us-west1`, preserve unrelated runtime environment variables, and route all traffic to the new revision.

Before promoting a change, submit an explicitly labeled test response on staging, confirm that it appears in staging admin, check the current-page CSV, and sign out. Verify that unauthenticated requests cannot list responses. Test records are real stored records; use no personal details and keep them in staging.

For a code rollback, revert the feature changes in a new PR to `staging`, validate the correction, then promote `staging` to `main`. If an immediate service rollback is needed, use the Cloud Run revision controls to restore the previously verified image/revision and record the resulting traffic allocation. Keep both response buckets and all secrets: existing responses survive application rollback, and deleting storage is not a rollback step. After restoring service, verify the map and backend proxy as well as any admin routes still present. A prior revision may retain prior credentials, so review secret-version access before rolling back a credential rotation.

To inspect the production bucket's access controls without reading any responses, run these commands from any directory:

```bash
gcloud storage buckets describe \
  gs://biocirv-470318-calbioscape-feedback-production \
  --project=biocirv-470318 --format=json
gcloud storage buckets get-iam-policy \
  gs://biocirv-470318-calbioscape-feedback-production \
  --project=biocirv-470318 --format=json
```

Expect `public_access_prevention: enforced`, `uniform_bucket_level_access: true`, and no `allUsers` or `allAuthenticatedUsers` IAM members. The production frontend service account should have object creator and viewer roles.

## Diagnose access or submission failures

If sign-in or submission is unavailable, check that all five `USER_RESEARCH_*` variables are configured on the serving revision. Inspect secret references without printing secret values. For storage errors, verify the bucket name and the runtime service account's two bucket roles. Browser requests must use the configured canonical origin for that environment.

The server uses bounded in-memory throttles over a 15-minute window: submissions allow 20 requests per IP and 300 total per instance; login allows 10 per IP and 120 total per instance. Limits reset when the instance restarts; they are not a distributed abuse-prevention service. Request bodies are limited to 16 KiB. Monitor failures and storage growth if traffic increases. A retry after a failed submission keeps the same identifier to avoid duplicates.

When investigating failures, record the environment, request time, response status, and Cloud Run revision. Do not copy response text, emails, passwords, session cookies, or bearer credentials into logs or GitHub issues.
