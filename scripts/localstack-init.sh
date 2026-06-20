#!/usr/bin/env bash
# ============================================================
# scripts/localstack-init.sh
#
# Bootstrap LocalStack for local development.
# Creates the SNS topic, SQS queues, and SNS→SQS subscriptions
# with raw message delivery so consumers receive plain JSON
# (not the SNS wrapper envelope).
#
# Usage:
#   AWS_ENDPOINT_URL=http://localhost:4566 bash scripts/localstack-init.sh
#
# Outputs the env var values to paste into your .env.local:
#   SNS_TOPIC_ARN=...
#   SQS_NOTIFICATIONS_URL=...
#   SQS_AUDIT_URL=...
#   SQS_REPORTING_URL=...
# ============================================================
set -euo pipefail

ENDPOINT="${AWS_ENDPOINT_URL:-http://localhost:4566}"
REGION="${AWS_REGION:-ap-southeast-1}"
AWS="aws --endpoint-url=$ENDPOINT --region=$REGION --no-cli-pager --output text"

echo "Bootstrapping LocalStack at $ENDPOINT ..."

# ── SNS topic ──────────────────────────────────────────────────────────────
TOPIC_ARN=$($AWS sns create-topic --name rally-domain-events --query 'TopicArn')
echo "SNS topic:  $TOPIC_ARN"

# ── SQS queues ─────────────────────────────────────────────────────────────
NOTIFICATIONS_URL=$($AWS sqs create-queue --queue-name rally-notifications --query 'QueueUrl')
AUDIT_URL=$($AWS sqs create-queue         --queue-name rally-audit          --query 'QueueUrl')
REPORTING_URL=$($AWS sqs create-queue     --queue-name rally-reporting      --query 'QueueUrl')

echo "SQS notifications: $NOTIFICATIONS_URL"
echo "SQS audit:         $AUDIT_URL"
echo "SQS reporting:     $REPORTING_URL"

# ── Queue ARNs (needed for SNS subscription) ───────────────────────────────
NOTIFICATIONS_ARN=$($AWS sqs get-queue-attributes \
  --queue-url "$NOTIFICATIONS_URL" --attribute-names QueueArn \
  --query 'Attributes.QueueArn')

AUDIT_ARN=$($AWS sqs get-queue-attributes \
  --queue-url "$AUDIT_URL" --attribute-names QueueArn \
  --query 'Attributes.QueueArn')

# ── SNS → SQS subscriptions (raw message delivery) ────────────────────────
# Raw delivery = SQS message body is the plain JSON string passed to sns.publish()
# without the SNS envelope wrapper.

$AWS sns subscribe \
  --topic-arn "$TOPIC_ARN" \
  --protocol sqs \
  --notification-endpoint "$AUDIT_ARN" \
  --attributes '{"RawMessageDelivery":"true"}' \
  > /dev/null

$AWS sns subscribe \
  --topic-arn "$TOPIC_ARN" \
  --protocol sqs \
  --notification-endpoint "$NOTIFICATIONS_ARN" \
  --attributes '{"RawMessageDelivery":"true","FilterPolicy":"{\"eventType\":[{\"prefix\":\"NOTIFICATION\"}]}"}' \
  > /dev/null

echo ""
echo "========================================================"
echo "Add these to your .env.local:"
echo ""
echo "AWS_ENDPOINT_URL=$ENDPOINT"
echo "AWS_REGION=$REGION"
echo "AWS_ACCESS_KEY_ID=test"
echo "AWS_SECRET_ACCESS_KEY=test"
echo "SNS_TOPIC_ARN=$TOPIC_ARN"
echo "SQS_NOTIFICATIONS_URL=$NOTIFICATIONS_URL"
echo "SQS_AUDIT_URL=$AUDIT_URL"
echo "SQS_REPORTING_URL=$REPORTING_URL"
echo "========================================================"
