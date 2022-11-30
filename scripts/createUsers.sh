#!/usr/bin/env bash
set -e

FILE=deploy-output.json

if [ ! -f "$FILE" ]; then
    echo "$FILE does not exist."
    exit 1
fi

POOLID=$(cat $FILE | jq -r .SupplyChainApp.CognitoPoolID)

if [[ -z "${NETWORKID}" ]]; then
  echo "Specify NETWORKID environment variable"
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

echo "POOLID = $POOLID"
echo "NETWORKID= $NETWORKID"
echo "WORKER1_NAME = $WORKER1_NAME"
echo "WORKER2_NAME = $WORKER2_NAME"

echo "Creating user group.."
aws cognito-idp create-group --user-pool-id $POOLID --group-name default

echo "Creating worker 1.."
WORKER1_PASSWORD=$(aws secretsmanager get-secret-value --secret-id="HLF-MEMBER-PW-NETWORK-${NETWORKID}-ACCOUNT-${WORKER1_NAME}" | jq -r '.SecretString')
aws cognito-idp admin-create-user --user-pool-id $POOLID --username $WORKER1_NAME
aws cognito-idp admin-set-user-password --user-pool-id $POOLID --username $WORKER1_NAME --password $WORKER1_PASSWORD --permanent
aws cognito-idp admin-update-user-attributes --user-pool-id $POOLID --username $WORKER1_NAME --user-attributes "Name=custom:permissions,Value=$WORKER1_PERMISSIONS"

echo "Creating worker 2.."
WORKER2_PASSWORD=$(aws secretsmanager get-secret-value --secret-id="HLF-MEMBER-PW-NETWORK-${NETWORKID}-ACCOUNT-${WORKER2_NAME}" | jq -r '.SecretString')
aws cognito-idp admin-create-user --user-pool-id $POOLID --username $WORKER2_NAME
aws cognito-idp admin-set-user-password --user-pool-id $POOLID --username $WORKER2_NAME --password $WORKER2_PASSWORD --permanent
aws cognito-idp admin-update-user-attributes --user-pool-id $POOLID --username $WORKER2_NAME --user-attributes "Name=custom:permissions,Value=$WORKER2_PERMISSIONS"

echo "Add users to group.."
aws cognito-idp admin-add-user-to-group --user-pool-id $POOLID --username $WORKER1_NAME --group-name default
aws cognito-idp admin-add-user-to-group --user-pool-id $POOLID --username $WORKER2_NAME --group-name default

echo "Done!"