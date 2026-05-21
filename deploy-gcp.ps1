# ============================================================
# Zariya AI Portal — GCP Cloud Run Deployment Script
# Project: Sagheer-321 | Email: mjan8066m@gmail.com
# ============================================================

$PROJECT_ID = "Sagheer-321"
$REGION = "asia-south1"           # Mumbai — closest to Pakistan
$SERVICE_NAME = "zariya-ai-portal"
$IMAGE_NAME = "gcr.io/$PROJECT_ID/$SERVICE_NAME"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  ZARIYA AI PORTAL — GCP DEPLOY SCRIPT  " -ForegroundColor Cyan
Write-Host "  Project: $PROJECT_ID                  " -ForegroundColor Cyan
Write-Host "  Region:  $REGION (Mumbai)             " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Authenticate
Write-Host "[1/6] Authenticating with Google Cloud..." -ForegroundColor Yellow
& gcloud auth login --account mjan8066m@gmail.com

# 2. Set project
Write-Host "[2/6] Setting active project to $PROJECT_ID..." -ForegroundColor Yellow
& gcloud config set project $PROJECT_ID
& gcloud config set run/region $REGION

# 3. Enable required APIs
Write-Host "[3/6] Enabling Cloud Run & Cloud Build APIs..." -ForegroundColor Yellow
& gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com

# 4. Build & Push image using Cloud Build
Write-Host "[4/6] Building Docker image via Cloud Build (this takes ~3-5 min)..." -ForegroundColor Yellow
& gcloud builds submit --tag $IMAGE_NAME .

# 5. Deploy to Cloud Run
Write-Host "[5/6] Deploying to Cloud Run..." -ForegroundColor Yellow
& gcloud run deploy $SERVICE_NAME `
  --image $IMAGE_NAME `
  --platform managed `
  --region $REGION `
  --allow-unauthenticated `
  --port 3001 `
  --memory 512Mi `
  --cpu 1 `
  --min-instances 0 `
  --max-instances 5 `
  --set-env-vars "NODE_ENV=production,PORT=3001,JWT_SECRET=zariya-prod-jwt-secret-2026,ALLOWED_ORIGINS=*"

# 6. Get service URL
Write-Host "[6/6] Fetching deployed service URL..." -ForegroundColor Yellow
$URL = & gcloud run services describe $SERVICE_NAME --region $REGION --format "value(status.url)"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  DEPLOYMENT COMPLETE! ✅               " -ForegroundColor Green
Write-Host "  App URL: $URL                         " -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Visit your app at the URL above"
Write-Host "2. Update VITE_API_URL in your .env to point to $URL/api"
Write-Host "3. Rebuild frontend and redeploy to use the live API"
