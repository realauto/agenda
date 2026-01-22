# Deployment Guide - ProjectLog

This guide covers deploying the ProjectLog application to AWS.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│    Backend      │────▶│    MongoDB      │
│  AWS Amplify    │     │  AWS App Runner │     │  MongoDB Atlas  │
│  (Expo Web)     │     │  (Fastify API)  │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Current Deployment URLs

| Service | URL |
|---------|-----|
| Backend API | `https://rb2tqems3h.ap-southeast-1.awsapprunner.com` |
| Health Check | `https://rb2tqems3h.ap-southeast-1.awsapprunner.com/health` |
| Frontend | `https://master.dl0afd49ewjq9.amplifyapp.com` |
| Amplify App ID | `dl0afd49ewjq9` |

## Prerequisites

- AWS CLI configured (`aws configure`)
- Docker installed and running
- MongoDB Atlas account with connection string

## Environment Variables

### Backend (App Runner)

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `HOST` | `0.0.0.0` |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for JWT tokens (generate with `openssl rand -base64 32`) |
| `CORS_ORIGIN` | Frontend URL (e.g., `https://master.dl0afd49ewjq9.amplifyapp.com`) |

### Frontend (Amplify)

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Backend API URL (e.g., `https://rb2tqems3h.ap-southeast-1.awsapprunner.com/api`) |

## Deploying Backend (App Runner)

### 1. Build and Push Docker Image

```bash
# Login to ECR
aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin 326649691955.dkr.ecr.ap-southeast-1.amazonaws.com

# Build image (use linux/amd64 for App Runner)
cd backend
docker build --platform linux/amd64 -t projectlog-api .

# Tag and push
docker tag projectlog-api:latest 326649691955.dkr.ecr.ap-southeast-1.amazonaws.com/projectlog-api:latest
docker push 326649691955.dkr.ecr.ap-southeast-1.amazonaws.com/projectlog-api:latest
```

### 2. Update App Runner Service

```bash
# Trigger new deployment with latest image
aws apprunner start-deployment \
  --service-arn "arn:aws:apprunner:ap-southeast-1:326649691955:service/projectlog-api/0fa9cc9b5c6e417086295b26270da9a9" \
  --region ap-southeast-1
```

### 3. Check Deployment Status

```bash
aws apprunner describe-service \
  --service-arn "arn:aws:apprunner:ap-southeast-1:326649691955:service/projectlog-api/0fa9cc9b5c6e417086295b26270da9a9" \
  --region ap-southeast-1 \
  --query 'Service.Status'
```

### 4. Update Environment Variables (if needed)

```bash
aws apprunner update-service \
  --service-arn "arn:aws:apprunner:ap-southeast-1:326649691955:service/projectlog-api/0fa9cc9b5c6e417086295b26270da9a9" \
  --source-configuration '{
    "ImageRepository": {
      "ImageIdentifier": "326649691955.dkr.ecr.ap-southeast-1.amazonaws.com/projectlog-api:latest",
      "ImageRepositoryType": "ECR",
      "ImageConfiguration": {
        "Port": "3000",
        "RuntimeEnvironmentVariables": {
          "NODE_ENV": "production",
          "MONGODB_URI": "YOUR_MONGODB_URI",
          "JWT_SECRET": "YOUR_JWT_SECRET",
          "CORS_ORIGIN": "YOUR_FRONTEND_URL"
        }
      }
    },
    "AuthenticationConfiguration": {
      "AccessRoleArn": "arn:aws:iam::326649691955:role/service-role/AppRunnerECRAccessRole"
    }
  }' \
  --region ap-southeast-1
```

## Deploying Frontend (Amplify)

### Option 1: Auto-deploy via Git Push

Amplify is configured to auto-deploy when you push to the `master` branch:

```bash
git add .
git commit -m "Your changes"
git push origin master
```

### Option 2: Manual Deploy via Console

1. Go to [AWS Amplify Console](https://ap-southeast-1.console.aws.amazon.com/amplify/home?region=ap-southeast-1#/dl0afd49ewjq9)
2. Click on the app
3. Click "Redeploy this version" or trigger a new build

### First-time Amplify Setup

If Amplify is not connected to GitHub:

1. Go to [AWS Amplify Console](https://ap-southeast-1.console.aws.amazon.com/amplify/home?region=ap-southeast-1)
2. Select `projectlog-frontend` app
3. Click "Host web app" → "GitHub"
4. Authorize AWS Amplify
5. Select repo: `realauto/agenda`, branch: `master`
6. Amplify auto-detects `amplify.yml`
7. Click "Save and Deploy"

## Quick Deploy Script

Create this script for quick deployments:

```bash
#!/bin/bash
# deploy.sh - Quick deploy script

set -e

echo "=== Deploying Backend ==="
cd backend

# Build and push
aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin 326649691955.dkr.ecr.ap-southeast-1.amazonaws.com
docker build --platform linux/amd64 -t projectlog-api .
docker tag projectlog-api:latest 326649691955.dkr.ecr.ap-southeast-1.amazonaws.com/projectlog-api:latest
docker push 326649691955.dkr.ecr.ap-southeast-1.amazonaws.com/projectlog-api:latest

# Trigger deployment
aws apprunner start-deployment \
  --service-arn "arn:aws:apprunner:ap-southeast-1:326649691955:service/projectlog-api/0fa9cc9b5c6e417086295b26270da9a9" \
  --region ap-southeast-1

echo "=== Backend deployment triggered ==="

cd ..

echo "=== Deploying Frontend (push to trigger Amplify) ==="
git add .
git commit -m "Deploy: $(date)" || true
git push origin master

echo "=== Done! Check AWS Console for deployment status ==="
```

## Monitoring & Logs

### App Runner Logs

```bash
# View recent logs
aws apprunner list-operations \
  --service-arn "arn:aws:apprunner:ap-southeast-1:326649691955:service/projectlog-api/0fa9cc9b5c6e417086295b26270da9a9" \
  --region ap-southeast-1
```

Or view in AWS Console: [App Runner Console](https://ap-southeast-1.console.aws.amazon.com/apprunner/home?region=ap-southeast-1#/services)

### Amplify Build Logs

View in [Amplify Console](https://ap-southeast-1.console.aws.amazon.com/amplify/home?region=ap-southeast-1#/dl0afd49ewjq9)

## Troubleshooting

### Backend not starting

1. Check health endpoint: `curl https://rb2tqems3h.ap-southeast-1.awsapprunner.com/health`
2. Verify MongoDB URI is correct and IP whitelist includes `0.0.0.0/0`
3. Check App Runner logs in AWS Console

### CORS errors

Update `CORS_ORIGIN` environment variable in App Runner to match your frontend URL.

### Frontend API calls failing

1. Check `EXPO_PUBLIC_API_URL` in Amplify environment variables
2. Verify backend is running
3. Check browser console for detailed errors

## Cost Estimate

| Service | Estimated Cost |
|---------|----------------|
| App Runner (0.25 vCPU, 0.5GB) | ~$5-15/month |
| Amplify Hosting | ~$0-5/month |
| ECR Storage | ~$1/month |
| MongoDB Atlas (M0 Free) | $0 |
| **Total** | **~$6-21/month** |

## AWS Resources

| Resource | ARN/ID |
|----------|--------|
| ECR Repository | `326649691955.dkr.ecr.ap-southeast-1.amazonaws.com/projectlog-api` |
| App Runner Service | `arn:aws:apprunner:ap-southeast-1:326649691955:service/projectlog-api/0fa9cc9b5c6e417086295b26270da9a9` |
| App Runner IAM Role | `arn:aws:iam::326649691955:role/service-role/AppRunnerECRAccessRole` |
| Amplify App | `dl0afd49ewjq9` |
