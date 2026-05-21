# Google Cloud Platform (GCP) Deployment Handbook
## Project: AISeekhoProject
## Target Service: Zariya AI Portal

This comprehensive deployment handbook outlines the end-to-end production pipeline for deploying the containerized Zariya AI Portal app to **Google Cloud Run** using **Google Cloud Build** and **Google Artifact Registry**.

---

### Prerequisites & Credentials
- **GCP Project ID**: `AISeekhoProject`
- **Owner Email**: `shahnazmemon50@gmail.com`
- **Region**: `asia-south1` (or your preferred regional zone close to your Pakistani target audience)
- **Port**: `3001` (Internal Container Port)

---

## 1. Google Cloud SDK CLI Setup

To manage your Google Cloud deployment from your local terminal, install and initialize the Google Cloud SDK:

1. **Download and Install**:
   - For Windows, download the Google Cloud CLI Installer from the [official download page](https://cloud.google.com/sdk/docs/install#windows) and follow the installer prompts.

2. **Authenticate & Initialize**:
   Open PowerShell or Command Prompt and execute:
   ```bash
   gcloud init
   ```
   *Follow the browser authentication login prompt using `mjan8066m@gmail.com`.*

3. **Configure active project**:
   Ensure you select project ID `Sagheer-321` as your workspace focus:
   ```bash
   gcloud config set project Sagheer-321
   ```

4. **Enable required services APIs**:
   Enable Google Cloud Build, Artifact Registry, and Cloud Run APIs:
   ```bash
   gcloud services enable run.googleapis.com \
                          cloudbuild.googleapis.com \
                          artifactregistry.googleapis.com
   ```

---

## 2. Docker Image Creation & Registry Management

We will use **Google Artifact Registry** to host our secure Docker images.

1. **Create Artifact Repository**:
   Create a repository named `zariya-app` in your target region:
   ```bash
   gcloud artifacts repositories create zariya-app \
       --repository-format=docker \
       --location=us-central1 \
       --description="Zariya AI Portal Production Docker Registry"
   ```

2. **Configure Docker Auth**:
   Configure local Docker client credentials to push to GCP Artifact Registry:
   ```bash
   gcloud auth configure-docker us-central1-docker.pkg.dev
   ```

---

## 3. Build & Push Container via Cloud Build

Google Cloud Build allows you to build the Docker container directly in the cloud without needing a heavy local Docker engine.

Run the build command from the root folder containing the `Dockerfile`:
```bash
gcloud builds submit --tag us-central1-docker.pkg.dev/Sagheer-321/zariya-app/portal-app:latest .
```

*This uploads the codebase safely, performs npm caching, builds the production Vite bundle, and compiles the production Node/Express runtime into a single optimized Alpine container.*

---

## 4. Deployment to Google Cloud Run

Deploy the constructed container image to **Google Cloud Run** with production-grade performance tuning and environmental configuration:

```bash
gcloud run deploy zariya-portal-service \
    --image us-central1-docker.pkg.dev/Sagheer-321/zariya-app/portal-app:latest \
    --region us-central1 \
    --platform managed \
    --allow-unauthenticated \
    --port 3001 \
    --cpu 1 \
    --memory 1Gi \
    --min-instances 0 \
    --max-instances 5 \
    --set-env-vars="NODE_ENV=production,GEMINI_API_KEY=YOUR_PRODUCTION_GEMINI_KEY"
```

### Resource Optimizations:
- `--cpu 1` / `--memory 1Gi`: Allocates optimal resources for high-speed AI orchestration logic and map rendering calculations.
- `--min-instances 0` / `--max-instances 5`: Auto-scaling threshold to ensure cost-efficiency (down to $0 when inactive) while capping potential burst traffic.

---

## 5. Custom Domain & SSL Provisioning

To present your application under a custom domain (e.g. `portal.zariya.pk`), map the domain inside Google Cloud Run:

1. **Map Custom Domain**:
   ```bash
   gcloud beta run domain-mappings create \
       --service zariya-portal-service \
       --domain portal.zariya.pk \
       --region us-central1
   ```

2. **Configure DNS Records**:
   - Google Cloud Run will output the required **CNAME** and **A records**.
   - Copy these parameters and configure them on your domain registrar dashboard (e.g., GoDaddy, Namecheap, Cloudflare).

3. **Automatic SSL Provisioning**:
   - Google Cloud Run automatically provisions, manages, and renews a free **Let's Encrypt SSL/TLS Certificate** for the mapped domain.
   - Once DNS propagation is complete (typically 15-30 minutes), secure HTTPS communication (`https://portal.zariya.pk`) will be operational immediately!

---

*Manual generated with precision by Antigravity AI agent. For support, verify active project billing or email `mjan8066m@gmail.com`.*
