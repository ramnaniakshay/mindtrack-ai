#!/bin/bash
set -e

# Target Image URL in Artifact Registry
IMAGE_TAG="asia-south1-docker.pkg.dev/ai-deployment-project-492711/my-ar/mental-wellness-tracker:latest"

echo "Configuring Docker credentials for GCP Artifact Registry in Mumbai (asia-south1)..."
gcloud auth configure-docker asia-south1-docker.pkg.dev --quiet

echo "Building production container..."
docker build --pull=false -t "$IMAGE_TAG" .

echo "Pushing image to GCP Artifact Registry..."
docker push "$IMAGE_TAG"

echo "Deployment container published successfully to: $IMAGE_TAG"
