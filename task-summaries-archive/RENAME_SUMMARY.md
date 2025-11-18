# Service Rename Summary

## Overview
All services have been renamed to include "frontend" to clearly indicate these are frontend applications for Cal-BioScape.

## Service Name Changes

### Before → After

| Environment | Old Service Name | New Service Name |
|------------|-----------------|------------------|
| **Production** | `cal-bioscape` | `cal-bioscape-frontend-prod` |
| **Staging** | `cal-bioscape-staging` | `cal-bioscape-frontend-staging` |
| **Development** | `biocirv-frontend` | `cal-bioscape-frontend-dev` |

## Updated Files

### Cloud Build Configurations
- ✅ `cloudbuild.yaml` → `cal-bioscape-frontend-dev`
- ✅ `cloudbuild-staging.yaml` → `cal-bioscape-frontend-staging`
- ✅ `cloudbuild-prod.yaml` → `cal-bioscape-frontend-prod`

### Documentation
- ✅ `CLOUDBUILD.md` - All references updated
- ✅ `DEPLOYMENT_ARCHITECTURE.md` - All diagrams and examples updated
- ✅ `.cloudbuild-summary.md` - Quick reference table updated

## Image Names

### Production
```
gcr.io/$PROJECT_ID/cal-bioscape-frontend-prod:$SHORT_SHA
gcr.io/$PROJECT_ID/cal-bioscape-frontend-prod:production-latest
```

### Staging
```
gcr.io/$PROJECT_ID/cal-bioscape-frontend-staging:$SHORT_SHA
gcr.io/$PROJECT_ID/cal-bioscape-frontend-staging:staging-latest
```

### Development
```
gcr.io/$PROJECT_ID/cal-bioscape-frontend-dev:$SHORT_SHA
gcr.io/$PROJECT_ID/cal-bioscape-frontend-dev:development-latest
```

## Cloud Run Service URLs

When deployed, the services will be accessible at:
- **Production**: `https://cal-bioscape-frontend-prod-{hash}.run.app`
- **Staging**: `https://cal-bioscape-frontend-staging-{hash}.run.app`
- **Development**: `https://cal-bioscape-frontend-dev-{hash}.run.app`

## Benefits of New Naming

1. **Clarity**: Immediately identifies this as the frontend component
2. **Scalability**: Prepares for potential backend services (e.g., `cal-bioscape-backend`)
3. **Consistency**: Unified naming across all environments with explicit environment suffixes
4. **Organization**: Easier to find in Cloud Console when multiple services exist
5. **Safety**: Explicit `-prod` suffix prevents accidental production deployments

## Next Steps

When deploying for the first time with the new names:

1. **Create new Cloud Run services** with the updated names
2. **Update Cloud Build triggers** to use the correct configuration files
3. **Update any DNS/domain mappings** to point to the new service URLs
4. **(Optional) Delete old services** after confirming new ones work:
   ```bash
   gcloud run services delete biocirv-frontend --region=us-west1
   gcloud run services delete cal-bioscape --region=us-west1
   gcloud run services delete cal-bioscape-staging --region=us-west1
   ```

## Naming Convention Rationale

All service names now follow the pattern: `{project}-{component}-{environment}`
- **Production**: `cal-bioscape-frontend-prod` (explicit environment)
- **Staging**: `cal-bioscape-frontend-staging` (explicit environment)
- **Development**: `cal-bioscape-frontend-dev` (explicit environment)

This follows **industry best practices** by:
- ✅ Making production explicitly identifiable (no implicit assumptions)
- ✅ Enabling consistent automation across all environments
- ✅ Reducing operational risk during deployments
- ✅ Improving clarity for new team members
- ✅ Following conventions used by Google, Amazon, and Microsoft

## Testing the Changes

Deploy to staging first to verify:
```bash
gcloud builds submit --config=cloudbuild-staging.yaml
```

Then check the Cloud Run console to confirm the new service `cal-bioscape-frontend-staging` was created successfully.

---

**Date Updated**: October 15, 2025  
**Reasons**: 
1. Add "frontend" to service names for clarity and future scalability
2. Add explicit "-prod" suffix to production for consistency and safety (industry best practice)
