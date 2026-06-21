#!/usr/bin/env bash
# ============================================================
# scripts/localstack/init.sh
#
# LocalStack init hook — runs automatically inside the container
# when LocalStack is ready (mounted at /etc/localstack/init/ready.d/).
#
# Idempotent: create-topic / create-queue return the existing resource
# if it already exists, so re-runs on container restart are safe.
#
# All ARNs and URLs produced here are DETERMINISTIC because LocalStack
# always uses account ID 000000000000. The static values are pre-filled
# in .env.example — no manual copy-paste step required.
# ============================================================
set -euo pipefail

REGION="${AWS_DEFAULT_REGION:-ap-southeast-1}"
ENDPOINT="http://localhost:4566"
AWS="aws --endpoint-url=$ENDPOINT --region=$REGION --no-cli-pager --output text"

echo "[localstack-init] Creating SNS topic + SQS queues..."

# ── Dead-letter queues ─────────────────────────────────────────────────────
NOTIFICATIONS_DLQ_URL=$($AWS sqs create-queue --queue-name rally-notifications-dlq --query 'QueueUrl')
AUDIT_DLQ_URL=$($AWS sqs create-queue         --queue-name rally-audit-dlq        --query 'QueueUrl')

NOTIFICATIONS_DLQ_ARN=$($AWS sqs get-queue-attributes \
  --queue-url "$NOTIFICATIONS_DLQ_URL" --attribute-names QueueArn \
  --query 'Attributes.QueueArn')

AUDIT_DLQ_ARN=$($AWS sqs get-queue-attributes \
  --queue-url "$AUDIT_DLQ_URL" --attribute-names QueueArn \
  --query 'Attributes.QueueArn')

# ── Main queues with RedrivePolicy ─────────────────────────────────────────
NOTIFICATIONS_URL=$($AWS sqs create-queue --queue-name rally-notifications --query 'QueueUrl')
AUDIT_URL=$($AWS sqs create-queue         --queue-name rally-audit          --query 'QueueUrl')
REPORTING_URL=$($AWS sqs create-queue     --queue-name rally-reporting      --query 'QueueUrl')

$AWS sqs set-queue-attributes \
  --queue-url "$NOTIFICATIONS_URL" \
  --attributes "{\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"$NOTIFICATIONS_DLQ_ARN\\\",\\\"maxReceiveCount\\\":\\\"5\\\"}\"}"

$AWS sqs set-queue-attributes \
  --queue-url "$AUDIT_URL" \
  --attributes "{\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"$AUDIT_DLQ_ARN\\\",\\\"maxReceiveCount\\\":\\\"5\\\"}\"}"

# ── SNS topic ──────────────────────────────────────────────────────────────
TOPIC_ARN=$($AWS sns create-topic --name rally-domain-events --query 'TopicArn')

# ── Queue ARNs ────────────────────────────────────────────────────────────
NOTIFICATIONS_ARN=$($AWS sqs get-queue-attributes \
  --queue-url "$NOTIFICATIONS_URL" --attribute-names QueueArn \
  --query 'Attributes.QueueArn')

AUDIT_ARN=$($AWS sqs get-queue-attributes \
  --queue-url "$AUDIT_URL" --attribute-names QueueArn \
  --query 'Attributes.QueueArn')

# ── SNS → SQS subscriptions (raw message delivery) ────────────────────────
# Audit: receives ALL domain events
$AWS sns subscribe \
  --topic-arn "$TOPIC_ARN" \
  --protocol sqs \
  --notification-endpoint "$AUDIT_ARN" \
  --attributes '{"RawMessageDelivery":"true"}' \
  > /dev/null

# Notifications: receives only events with eventType prefix "NOTIFICATION"
$AWS sns subscribe \
  --topic-arn "$TOPIC_ARN" \
  --protocol sqs \
  --notification-endpoint "$NOTIFICATIONS_ARN" \
  --attributes '{"RawMessageDelivery":"true","FilterPolicy":"{\"eventType\":[{\"prefix\":\"NOTIFICATION\"}]}"}' \
  > /dev/null

echo "[localstack-init] Done."
echo "  SNS_TOPIC_ARN=$TOPIC_ARN"
echo "  SQS_NOTIFICATIONS_URL=$NOTIFICATIONS_URL"
echo "  SQS_AUDIT_URL=$AUDIT_URL"
echo "  SQS_REPORTING_URL=$REPORTING_URL"
