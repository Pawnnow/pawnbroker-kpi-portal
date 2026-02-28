

# Fix: Redeploy admin-create-user Edge Function

## Problem
The `admin-create-user` edge function running in production is an outdated version. Evidence: the API response doesn't include the `email_sent` field that exists in the current code (line 212), which means the welcome email logic with member_number support was never deployed.

## Solution
Redeploy the `admin-create-user` edge function so the latest code (with email sending, member_number validation, and placeholder support) takes effect.

## Steps
1. Redeploy the `admin-create-user` edge function using the deploy tool
2. Verify by creating a test user and confirming the response includes `email_sent` and the welcome email arrives

No code changes are needed — the code is already correct.
