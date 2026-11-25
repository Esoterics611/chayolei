#!/usr/bin/env bash
# One-time Google Cloud set-up for deploying Chayolei from GitHub Actions
# (docs/DEPLOY.md, "From GitHub"). Run it ONCE, in Cloud Shell
# (console.cloud.google.com, the >_ button), signed in as the project's owner:
#
#   git clone -b claude/nifty-darwin-0h2ew6 https://github.com/Esoterics611/chayolei
#   bash chayolei/scripts/gcp-bootstrap.sh <firebase-project-id>
#
# It enables the services the deploy uses, makes the image registry and the
# Firestore database if missing, makes a "deployer" service account that only
# GitHub Actions of Esoterics611/chayolei can act as (no key is ever created),
# and gives the app's runtime account access to Firestore. It is safe to rerun.
# At the end it prints the two values to put in deploy.env.
set -euo pipefail
PROJECT="${1:?usage: gcp-bootstrap.sh <firebase-project-id>}"
REGION="${REGION:-us-central1}"
REPO_GH="${REPO_GH:-Esoterics611/chayolei}"
gcloud config set project "$PROJECT" >/dev/null
NUM="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')"
DEPLOYER="deployer@${PROJECT}.iam.gserviceaccount.com"
RUNTIME="${NUM}-compute@developer.gserviceaccount.com"

echo "== Services"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  secretmanager.googleapis.com iamcredentials.googleapis.com sts.googleapis.com firestore.googleapis.com \
  firebasehosting.googleapis.com firebaserules.googleapis.com identitytoolkit.googleapis.com \
  cloudresourcemanager.googleapis.com serviceusage.googleapis.com

echo "== Image registry"
gcloud artifacts repositories describe chayolei --location="$REGION" >/dev/null 2>&1 \
  || gcloud artifacts repositories create chayolei --repository-format=docker --location="$REGION"

echo "== Firestore"
gcloud firestore databases describe --database='(default)' >/dev/null 2>&1 \
  || gcloud firestore databases create --location=nam5

echo "== The deployer account"
gcloud iam service-accounts describe "$DEPLOYER" >/dev/null 2>&1 \
  || gcloud iam service-accounts create deployer --display-name="Deploys Chayolei from GitHub Actions"
for role in roles/run.admin roles/cloudbuild.builds.editor roles/artifactregistry.writer \
            roles/iam.serviceAccountUser roles/storage.admin roles/firebase.admin \
            roles/datastore.user roles/serviceusage.serviceUsageConsumer roles/logging.viewer; do
  gcloud projects add-iam-policy-binding "$PROJECT" --member="serviceAccount:$DEPLOYER" --role="$role" \
    --condition=None >/dev/null
done

echo "== The app's runtime account (Cloud Run) and the image builds"
for role in roles/datastore.user roles/cloudbuild.builds.builder roles/artifactregistry.writer \
            roles/logging.logWriter roles/storage.objectViewer; do
  gcloud projects add-iam-policy-binding "$PROJECT" --member="serviceAccount:$RUNTIME" --role="$role" \
    --condition=None >/dev/null
done

echo "== GitHub sign-in without a key (only $REPO_GH)"
gcloud iam workload-identity-pools describe github --location=global >/dev/null 2>&1 \
  || gcloud iam workload-identity-pools create github --location=global --display-name="GitHub Actions"
gcloud iam workload-identity-pools providers describe chayolei --location=global --workload-identity-pool=github >/dev/null 2>&1 \
  || gcloud iam workload-identity-pools providers create-oidc chayolei --location=global --workload-identity-pool=github \
       --issuer-uri="https://token.actions.githubusercontent.com" \
       --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
       --attribute-condition="assertion.repository=='${REPO_GH}'"
gcloud iam service-accounts add-iam-policy-binding "$DEPLOYER" --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/${NUM}/locations/global/workloadIdentityPools/github/attribute.repository/${REPO_GH}" >/dev/null

cat <<OUT

Done. Send these two lines to Claude (they are not secrets):

GCP_WORKLOAD_IDENTITY_PROVIDER=projects/${NUM}/locations/global/workloadIdentityPools/github/providers/chayolei
GCP_DEPLOYER_SERVICE_ACCOUNT=${DEPLOYER}

Still by hand, in the Firebase console (Authentication → Sign-in method):
  Email/Password → Enable, and enable "Email link (passwordless sign-in)".
OUT
