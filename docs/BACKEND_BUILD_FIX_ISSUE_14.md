# Backend Build Fix: Issue #14 - Cloud Build Failure with setuptools-scm

**Issue:** biocirv-webservice Cloud Build fails with setuptools-scm VCS version detection error
**Status:** Fix documented and ready for implementation in biocirv-webservice repo
**Target Repos:** biocirv-webservice (backend)

## Problem Summary

Cloud Build for biocirv-webservice fails with:
```
LookupError: Error getting the version from source `vcs`: setuptools-scm was unable to detect version for /app.
```

Also reported: Platform resolution error about `osx-64` not being available on Linux.

## Root Causes

### 1. VCS Versioning in Tarball Build Context
- The `ca-biositing-datamodels` package uses hatchling with VCS-based versioning (setuptools-scm)
- Cloud Build delivers source code as a tarball, which strips the `.git` directory
- setuptools-scm requires git history to determine version numbers from tags/commits
- Without git history in the container, setuptools-scm fails with LookupError

### 2. Platform Lock File Mismatch
- `pixi.lock` was likely generated on macOS with platforms: `osx-64`, `osx-arm64`
- Cloud Build runs on Linux (container platform: `linux-64`)
- When pixi tries to resolve dependencies for a Linux platform not in the lock file, it fails

## Solution: Three-Part Fix

### Fix A: Add Fallback Version to datamodels pyproject.toml

**File to modify:** `src/ca_biositing/datamodels/pyproject.toml`

**Change:**
```toml
[tool.hatch.version]
source = "vcs"
fallback-version = "0.0.0"  # ← ADD THIS LINE
```

Or if using setuptools-scm directly:
```toml
[tool.setuptools_scm]
fallback_version = "0.0.0"  # ← ADD THIS LINE
```

**Rationale:**
- When setuptools-scm cannot detect version from VCS (no .git directory), it will use the fallback
- Version "0.0.0" is appropriate for development/staging builds
- In production builds with git tags, the actual tag will be used instead of fallback

### Fix B: Update pixi.toml to Include Linux Platform

**File to modify:** `pixi.toml`

**Change:**
```toml
[project]
name = "biocirv-webservice"
channels = [...]
platforms = ["linux-64", "osx-64", "osx-arm64"]  # ← ADD "linux-64"
description = "..."
```

**After modification, regenerate lock file:**
```bash
pixi lock --unix
```

**Rationale:**
- Cloud Build runs on Linux, which requires `linux-64` platform entries in the lock file
- Ensures pixi can resolve all dependencies for the Linux build environment

### Fix C: Docker Fallback (Optional - Use Only If A & B Insufficient)

If the above fixes don't resolve the issue, add this to the Dockerfile after the `COPY . .` step:

**Option C1: Initialize Git Repository**
```dockerfile
RUN cd /app && git init && git add -A && git commit -m "build" --allow-empty 2>/dev/null || true
```

**Option C2: Environment Variable (Recommended if needed)**
```dockerfile
# Before pixi install step
ENV SETUPTOOLS_SCM_PRETEND_VERSION_FOR_CA_BIOSITING_DATAMODELS=0.0.0
```

Option C2 is simpler and more reliable.

## Implementation Steps

1. **Modify datamodels pyproject.toml**
   - Add `fallback-version = "0.0.0"` to the setuptools-scm configuration
   - File: `src/ca_biositing/datamodels/pyproject.toml`

2. **Update pixi.toml**
   - Add `"linux-64"` to the platforms list
   - Regenerate lock file: `pixi lock --unix`
   - File: `pixi.toml`

3. **Commit changes**
   ```bash
   git add src/ca_biositing/datamodels/pyproject.toml pixi.toml pixi.lock
   git commit -m "fix: add fallback_version for setuptools-scm and linux-64 platform (closes sustainability-software-lab/cal-bioscape-frontend#14)"
   git push origin <your-branch>
   ```

4. **Test in Cloud Build**
   - Trigger a new Cloud Build via GCP Console
   - Monitor logs for successful completion
   - Verify Docker image builds and pushes to GCR

## Expected Build Flow After Fix

```
Cloud Build receives tarball
  ↓
Extract source code
  ↓
Install pixi → uses linux-64 entries from pixi.lock
  ↓
Install dependencies (including ca-biositing-datamodels)
  ↓
setuptools-scm attempts VCS detection
  ↓
No .git directory found
  ↓
Uses fallback-version = "0.0.0" from pyproject.toml
  ↓
Installation succeeds ✓
  ↓
Docker image builds and pushes to GCR ✓
  ↓
Cloud Run deployment succeeds ✓
```

## Verification Checklist

After implementation, verify:

- [ ] Cloud Build completes without setuptools-scm LookupError
- [ ] Docker image builds successfully
- [ ] Image is pushed to Google Container Registry
- [ ] Cloud Run service deploys without crashing
- [ ] Service health check responds (e.g., `/docs` endpoint accessible)
- [ ] Frontend (Cal BioScape) can connect to the webservice
- [ ] Map layers load data from backend API
- [ ] Siting inventory endpoint returns data without errors

## Rollback Plan

If the fix causes issues:
1. Revert the three changes
2. The original error will return (no harm done)
3. No runtime impact to other services

## Notes for Implementation

- This fix is specific to Cloud Build's tarball-based source delivery
- Local development (with full git repo) is unaffected
- The fallback version "0.0.0" is only used in Cloud Build; production deployments with git tags use actual version numbers
- The pixi platform update ensures consistency across development and CI/CD environments

## Related

- **Frontend Repo:** sustainability-software-lab/cal-bioscape-frontend
- **Backend Repo:** sustainability-software-lab/biocirv-webservice
- **Backend API:** https://biocirv-webservice-194468397458.us-west1.run.app
- **Issue:** GitHub Issue #14 in cal-bioscape-frontend

---

**Documentation created:** 2026-03-24
**Last updated:** 2026-03-24
