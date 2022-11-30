#!/usr/bin/env bash
set -e

FILE=deploy-output.json

if [ ! -f "$FILE" ]; then
    echo "$FILE does not exist."
    exit 1
fi

if [[ -z "${WORKER1_NAME}" ]]; then
  echo "Specify WORKER1_NAME environment variable"
  exit 1
fi

if [[ -z "${WORKER2_NAME}" ]]; then
  echo "Specify WORKER2_NAME environment variable"
  exit 1
fi

WORKER1_PK_SECRET=$(cat $FILE | jq -r .SupplyChainApp.Worker1PKSecret)
WORKER1_SIGNCERT_SECRET=$(cat $FILE | jq -r .SupplyChainApp.Worker1SignCertSecret)

WORKER2_PK_SECRET=$(cat $FILE | jq -r .SupplyChainApp.Worker2PKSecret)
WORKER2_SIGNCERT_SECRET=$(cat $FILE | jq -r .SupplyChainApp.Worker2SignCertSecret)

echo "Inserting secrets for $WORKER1_NAME in $WORKER1_PK_SECRET"
aws secretsmanager put-secret-value --secret-id $WORKER1_PK_SECRET --secret-string "`cat $HOME/$WORKER1_NAME-msp/keystore/*`"

echo "Inserting secrets for $WORKER1_NAME in $WORKER1_SIGNCERT_SECRET"
aws secretsmanager put-secret-value --secret-id $WORKER1_SIGNCERT_SECRET --secret-string "`cat $HOME/$WORKER1_NAME-msp/signcerts/*`"

echo "Inserting secrets for $WORKER2_NAME in $WORKER2_PK_SECRET"
aws secretsmanager put-secret-value --secret-id $WORKER2_PK_SECRET --secret-string "`cat $HOME/$WORKER2_NAME-msp/keystore/*`"

echo "Inserting secrets for $WORKER2_NAME in $WORKER2_SIGNCERT_SECRET"
aws secretsmanager put-secret-value --secret-id $WORKER2_SIGNCERT_SECRET  --secret-string "`cat $HOME/$WORKER2_NAME-msp/signcerts/*`"

echo 'Done!'