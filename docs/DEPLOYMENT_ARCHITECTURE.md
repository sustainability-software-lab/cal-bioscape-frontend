# Deployment Architecture

## Overview

This document describes the deployment architecture using Cloud Build and Cloud Run with environment isolation.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Git Repository                           │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    main      │  │   staging    │  │  feature/*   │          │
│  │   branch     │  │    branch    │  │   branches   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼──────────────────┘
          │                  │                  │
          │ Push/Merge       │ Push/Merge       │ Manual
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Cloud Build Triggers                        │
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │  Prod Trigger   │  │ Staging Trigger │  │  Dev Trigger   │  │
│  │                 │  │                 │  │                │  │
│  │ cloudbuild-     │  │ cloudbuild-     │  │ cloudbuild.    │  │
│  │ prod.yaml       │  │ staging.yaml    │  │ yaml           │  │
│  │                 │  │                 │  │                │  │
│  │ _SERVICE_NAME=  │  │ _SERVICE_NAME=  │  │ _SERVICE_NAME= │  │
│  │ cal-bioscape-   │  │ cal-bioscape-   │  │ cal-bioscape-  │  │
│  │ frontend-prod   │  │ frontend-       │  │ frontend-dev   │  │
│  │                 │  │ staging         │  │                │  │
│  │ _ENVIRONMENT=   │  │ _ENVIRONMENT=   │  │ _ENVIRONMENT=  │  │
│  │ production      │  │ staging         │  │ development    │  │
│  └────────┬────────┘  └────────┬────────┘  └───────┬────────┘  │
└───────────┼──────────────────────┼──────────────────┼───────────┘
            │                      │                  │
            ▼                      ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Container Registry (GCR)                        │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  gcr.io/$PROJECT_ID/cal-bioscape-frontend-prod:$SHORT_SHA       │   │
│  │  gcr.io/$PROJECT_ID/cal-bioscape-frontend-prod:production-latest│   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  gcr.io/$PROJECT_ID/cal-bioscape-frontend-staging:$SHORT_SHA    │   │
│  │  gcr.io/$PROJECT_ID/cal-bioscape-frontend-staging:staging-latest│   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  gcr.io/$PROJECT_ID/cal-bioscape-frontend-dev:$SHORT_SHA        │   │
│  │  gcr.io/$PROJECT_ID/cal-bioscape-frontend-dev:development-latest│   │
│  └──────────────────────────────────────────────────────────────────┘   │
└───────────┬──────────────────────┬──────────────────┬───────────┘
            │                      │                  │
            ▼                      ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Cloud Run Services                          │
│                       (us-west1)                                 │
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │  Production     │  │    Staging      │  │  Development   │  │
│  │                 │  │                 │  │                │  │
│  │ cal-bioscape-   │  │ cal-bioscape-   │  │ cal-bioscape-  │  │
│  │ frontend-prod   │  │ frontend-       │  │ frontend-dev   │  │
│  │                 │  │ staging         │  │                │  │
│  │ ENV: production │  │ ENV: staging    │  │ ENV: dev       │  │
│  │                 │  │                 │  │                │  │
│  │ URL:            │  │ URL:            │  │ URL:           │  │
│  │ cal-bioscape-   │  │ cal-bioscape-   │  │ cal-bioscape-  │  │
│  │ frontend-prod-  │  │ frontend-       │  │ frontend-dev-  │  │
│  │ xxx.a.run.app   │  │ staging-xxx.a.  │  │ xxx.a.run.app  │  │
│  │                 │  │ run.app         │  │                │  │
│  │                 │  │                 │  │                │  │
│  │ ✅ min-inst: 1  │  │ ⚡ min-inst: 0  │  │ ⚡ min-inst: 0 │  │
│  │ ✅ scaled       │  │ ⚡ scales to 0  │  │ ⚡ scales to 0│  │
│  │ ✅ monitored    │  │ 📊 monitored    │  │ 🔧 dev mode   │  │
│  └─────────────────┘  └─────────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Image Tagging Strategy

```
Commit: abc123f
│
├─► gcr.io/$PROJECT_ID/cal-bioscape-frontend-prod:abc123f ◄─── Immutable, precise rollback
│
└─► gcr.io/$PROJECT_ID/cal-bioscape-frontend-prod:production-latest ◄─── Mutable, latest prod
```

**Why two tags?**
- **SHA tag**: Immutable reference to exact code version (for rollbacks)
- **Environment-latest**: Easy reference to current deployed version

## Build Process Flow

```
1. Trigger fires ──► 2. Checkout code
                     │
                     ▼
3. Load secrets  ◄── Secret Manager (mapbox-access-token)
    │
    ▼
4. Docker build
    │
    ├─► Tag: gcr.io/.../service:abc123f
    ├─► Tag: gcr.io/.../service:env-latest
    └─► Build arg: ENVIRONMENT=staging
    │
    ▼
5. Push to GCR
    │
    ├─► Push: :abc123f
    └─► Push: :env-latest
    │
    ▼
6. Deploy to Cloud Run
    │
    ├─► Service: cal-bioscape-frontend-staging
    ├─► Image: gcr.io/.../cal-bioscape-frontend-staging:abc123f
    ├─► Region: us-west1
    └─► Env var: ENVIRONMENT=staging
    │
    ▼
7. Service live ✅
```

## Substitution Variables Inheritance

```yaml
# Defined in cloudbuild-{env}.yaml
substitutions:
  _SERVICE_NAME: 'cal-bioscape-frontend-prod'
  _ENVIRONMENT: 'production'
  _REGION: 'us-west1'

# Can be overridden in Cloud Build trigger:
# UI: Substitution variables section
# CLI: --substitutions=_SERVICE_NAME=custom-name

# Used throughout the build:
docker build ... -t gcr.io/$PROJECT_ID/${_SERVICE_NAME}:$SHORT_SHA
gcloud run deploy ${_SERVICE_NAME} --region=${_REGION}
```

## Environment Isolation Benefits

| Feature | Separate Services | Same Service |
|---------|------------------|--------------|
| **Independent URLs** | ✅ Different URLs | ❌ Same URL |
| **Independent Scaling** | ✅ Different configs | ❌ Shared config |
| **Safe Rollbacks** | ✅ Per-environment | ❌ Affects all |
| **IAM Isolation** | ✅ Separate permissions | ❌ Shared perms |
| **Independent Updates** | ✅ Deploy separately | ❌ Coordinated |
| **Cost Control** | ✅ Scale staging to 0 | ❌ Always running |

## Deployment Workflow

### Development to Production

```
1. Feature Branch
   └─► Pull Request
       └─► Code Review
           └─► Merge to 'staging'
               └─► Auto-deploy to cal-bioscape-frontend-staging
                   └─► QA Testing
                       └─► Merge to 'main'
                           └─► Auto-deploy to cal-bioscape-frontend-prod
                               └─► Production ✅
```

### Rollback Workflow

```
Production Issue Detected
│
├─► Option 1: Cloud Run Console
│   └─► Manage Traffic → Previous Revision
│
├─► Option 2: gcloud CLI
│   └─► gcloud run deploy cal-bioscape-frontend-prod --image=gcr.io/.../cal-bioscape-frontend-prod:abc123f
│
└─► Option 3: Redeploy from Git
    └─► git revert → push to main → auto-deploy
```

## Security Considerations

### Secret Management
```
Secret Manager
  └─► mapbox-access-token (secret)
      └─► Available to Cloud Build
          └─► Injected at build time
              └─► NOT stored in image
                  └─► Cleaned up after build
```

### IAM Roles Required

**Cloud Build Service Account needs:**
- `roles/run.admin` - Deploy to Cloud Run
- `roles/iam.serviceAccountUser` - Act as Cloud Run SA
- `roles/secretmanager.secretAccessor` - Access secrets
- `roles/storage.admin` - Push to GCR

**Cloud Run Service Account needs:**
- Application-specific permissions (e.g., access to Cloud Storage, APIs)

## Monitoring & Observability

### Key Metrics to Monitor

**Cloud Build:**
- Build duration
- Build success rate
- Secret access errors

**Cloud Run:**
- Request latency
- Error rate
- Instance count
- CPU/Memory utilization
- Cold start frequency

**Container Registry:**
- Image sizes
- Vulnerability scan results
- Storage costs

## Cost Optimization

```
Production (24/7)     Staging (On-demand)    Development (Manual)
min-instances: 1      min-instances: 0        min-instances: 0
max-instances: 100    max-instances: 10       max-instances: 5
memory: 4Gi          memory: 2Gi             memory: 1Gi
cpu: 2               cpu: 1                  cpu: 1

💰 $$$$              💰 $$                   💰 $
```

## Best Practices Summary

✅ **DO:**
- Use substitution variables for flexibility
- Tag images with both SHA and environment-latest
- Deploy to staging before production
- Monitor all environments
- Set min-instances=0 for non-prod to save costs
- Use Secret Manager for sensitive data
- Test rollback procedures regularly

❌ **DON'T:**
- Share service names across environments
- Hardcode values that could be variables
- Deploy to production without staging validation
- Store secrets in code or build artifacts
- Skip the SHA tag (needed for rollbacks)
- Use the same IAM permissions for all environments

## See Also

- `CLOUDBUILD.md` - Detailed configuration guide
- `.cloudbuild-summary.md` - Quick reference
- Cloud Run Documentation: https://cloud.google.com/run/docs
- Cloud Build Documentation: https://cloud.google.com/build/docs
