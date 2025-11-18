# Cloud Build Configuration Guide

## Overview

This project uses environment-specific Cloud Build configurations with substitution variables for flexibility and maintainability.

## Architecture

We maintain **separate Cloud Build files per environment** for:
- True environment isolation (separate Cloud Run services)
- Independent configuration per environment
- Safe rollback capabilities
- Clear deployment workflows

## Files

| File | Service Name | Environment | Purpose |
|------|-------------|-------------|---------|
| `cloudbuild.yaml` | `cal-bioscape-frontend-dev` | development | Development/default builds |
| `cloudbuild-staging.yaml` | `cal-bioscape-frontend-staging` | staging | Staging environment |
| `cloudbuild-prod.yaml` | `cal-bioscape-frontend-prod` | production | Production environment |

## Substitution Variables

Each configuration uses these substitution variables:

```yaml
substitutions:
  _SERVICE_NAME: 'cal-bioscape-frontend-staging'  # Cloud Run service name
  _ENVIRONMENT: 'staging'                          # Environment identifier
  _REGION: 'us-west1'                             # Deployment region
```

### Benefits

1. **Easy customization** - Override variables in Cloud Build triggers
2. **Reduced duplication** - Common logic, environment-specific values
3. **Flexibility** - Can change values without editing YAML structure
4. **Maintainability** - Update common patterns once, applies to all

## Image Tagging Strategy

Each build creates **two tags**:

1. **Commit-specific**: `gcr.io/$PROJECT_ID/${_SERVICE_NAME}:$SHORT_SHA`
   - Immutable reference to specific commit
   - Used for deployments
   - Enables precise rollbacks

2. **Environment-latest**: `gcr.io/$PROJECT_ID/${_SERVICE_NAME}:${_ENVIRONMENT}-latest`
   - Always points to latest deployment for that environment
   - Useful for quick reference
   - Example: `staging-latest`, `production-latest`

## Cloud Build Triggers Setup

### Recommended Configuration

#### Staging Trigger
```yaml
Name: deploy-staging
Description: Deploy to staging on push to staging branch
Event: Push to branch
Branch: ^staging$
Configuration: cloudbuild-staging.yaml
```

Optional substitutions override (if needed):
```yaml
_SERVICE_NAME: cal-bioscape-frontend-staging
_ENVIRONMENT: staging
_REGION: us-west1
```

#### Production Trigger
```yaml
Name: deploy-production
Description: Deploy to production on push to main branch
Event: Push to branch
Branch: ^main$
Configuration: cloudbuild-prod.yaml
```

Optional substitutions override:
```yaml
_SERVICE_NAME: cal-bioscape-frontend-prod
_ENVIRONMENT: production
_REGION: us-west1
```

## Manual Deployment

### Deploy to Staging
```bash
gcloud builds submit \
  --config=cloudbuild-staging.yaml \
  --substitutions=_SERVICE_NAME=cal-bioscape-frontend-staging,_ENVIRONMENT=staging,_REGION=us-west1
```

### Deploy to Production
```bash
gcloud builds submit \
  --config=cloudbuild-prod.yaml \
  --substitutions=_SERVICE_NAME=cal-bioscape-frontend-prod,_ENVIRONMENT=production,_REGION=us-west1
```

## Environment Variables

The build automatically sets the `ENVIRONMENT` variable in Cloud Run:
- Development: `ENVIRONMENT=development`
- Staging: `ENVIRONMENT=staging`
- Production: `ENVIRONMENT=production`

Your application can use this to adjust behavior per environment.

## Extending Configuration

### Adding a New Environment

1. Copy an existing `cloudbuild-{env}.yaml`
2. Update substitution variables:
   ```yaml
   substitutions:
     _SERVICE_NAME: 'cal-bioscape-frontend-new-env'
     _ENVIRONMENT: 'new-env'
     _REGION: 'us-west1'
   ```
3. Create corresponding Cloud Build trigger
4. Update this documentation

### Customizing Per Environment

#### Different Regions
Override `_REGION` in the trigger or file:
```yaml
_REGION: 'us-east1'
```

#### Additional Build Arguments
Add to the docker build command:
```yaml
--build-arg API_URL=${_API_URL}
```

Then define in substitutions:
```yaml
_API_URL: 'https://api.staging.example.com'
```

#### Environment-Specific Cloud Run Flags
Modify the `gcloud run deploy` args section:

**Staging** (allow more resources):
```yaml
- '--memory'
- '2Gi'
- '--max-instances'
- '10'
```

**Production** (optimize for scale):
```yaml
- '--memory'
- '4Gi'
- '--max-instances'
- '100'
- '--min-instances'
- '1'
- '--cpu'
- '2'
```

## Best Practices

### ✅ Do's
- Keep substitution variables at the top of each file
- Use meaningful service names that include environment
- Tag images with both commit SHA and environment-latest
- Set environment variables in Cloud Run for runtime behavior
- Use Cloud Build triggers for automated deployments
- Test in staging before promoting to production

### ❌ Don'ts
- Don't share the same service name across environments
- Don't hardcode values that could be substitution variables
- Don't skip the commit-specific tag (needed for rollbacks)
- Don't deploy directly to production without staging validation

## Rollback Procedure

### Find Previous Version
```bash
gcloud container images list-tags gcr.io/$PROJECT_ID/cal-bioscape-frontend-prod
```

### Rollback to Specific Version
```bash
gcloud run deploy cal-bioscape-frontend-prod \
  --image=gcr.io/$PROJECT_ID/cal-bioscape-frontend-prod:abc123f \
  --region=us-west1 \
  --platform=managed
```

### Rollback via Cloud Run Console
1. Go to Cloud Run console
2. Select the service (e.g., `cal-bioscape-frontend-prod`)
3. Click "Manage Traffic"
4. Choose a previous revision
5. Migrate traffic to that revision

## Secrets Management

The configuration uses Google Cloud Secret Manager for sensitive values:

```yaml
availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/mapbox-access-token/versions/latest
      env: 'MAPBOX_ACCESS_TOKEN'
```

### Adding New Secrets

1. Create secret in Secret Manager:
   ```bash
   echo -n "secret-value" | gcloud secrets create my-secret --data-file=-
   ```

2. Add to `availableSecrets` in cloudbuild YAML:
   ```yaml
   - versionName: projects/$PROJECT_ID/secrets/my-secret/versions/latest
     env: 'MY_SECRET'
   ```

3. Reference in build step:
   ```yaml
   secretEnv: ['MAPBOX_ACCESS_TOKEN', 'MY_SECRET']
   ```

## Troubleshooting

### Build fails with "substitution not found"
- Ensure substitution variables are defined in the `substitutions` section
- Check for typos in variable names (they're case-sensitive)
- Variables must use `${_VARIABLE_NAME}` syntax

### Cloud Run service not updating
- Check that the image tag in deployment matches what was built
- Verify the region matches where the service exists
- Check Cloud Build logs for deployment step errors

### Secret not available
- Ensure Cloud Build service account has `secretAccessor` role
- Verify secret exists in Secret Manager
- Check the secret version is `latest` or specify a version number

## Cost Optimization

### Staging
- Consider using `--min-instances=0` (scale to zero when idle)
- Use smaller machine types
- Set aggressive timeout values

### Production
- Use `--min-instances=1` for consistent performance
- Right-size memory and CPU based on metrics
- Implement request-based scaling

## Monitoring

After deployment, monitor:
- Cloud Build history: https://console.cloud.google.com/cloud-build
- Cloud Run metrics: https://console.cloud.google.com/run
- Container Registry: https://console.cloud.google.com/gcr

## Support

For issues or questions:
1. Check Cloud Build logs in GCP Console
2. Review this documentation
3. Contact the DevOps team
