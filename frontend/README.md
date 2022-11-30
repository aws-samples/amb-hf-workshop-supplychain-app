# AMB Hyperledger Fabric Supply Chain Frontend App

This repository is used for **Building a frontend** section in [Track-and-Trace Blockchain Workshop for Hyperledger Fabric](https://catalog.us-east-1.prod.workshops.aws/workshops/008da2cb-8454-42d0-877b-bc290bff7fcf/en-US/05-building-a-frontend)

All the commands should be executed in a Cloud9 instance provisioned as part of the aforementioned workshop

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app)

## Steps

Install NodeJS v16 and set as the default version

```bash
nvm install lts/gallium
nvm use lts/gallium
nvm alias default lts/gallium
```

Install dependencies

```bash
npm ci
```

Retrieve Cognito and AppSync information and write into `src/aws-exports.js` file

```bash
export POOLID=$(aws cognito-idp list-user-pools --max-results 60 | jq -r '.UserPools | .[] | select(.Name == "ambSupplyChainUsers") | .Id')
export CLIENTID=$(aws cognito-idp list-user-pool-clients --user-pool-id $POOLID | jq -r .UserPoolClients[0].ClientId)
export GRAPHQL_ENDPOINT=$(aws appsync list-graphql-apis | jq -r '.graphqlApis | .[] | select(.name == "SupplyChain API" and .authenticationType == "AMAZON_COGNITO_USER_POOLS").uris.GRAPHQL')

cat <<EOT > src/aws-exports.js
const awsconfig = {
  aws_project_region: "$AWS_DEFAULT_REGION",
  aws_cognito_region: "$AWS_DEFAULT_REGION",
  aws_user_pools_id: "$POOLID",
  aws_user_pools_web_client_id: "$CLIENTID",
  aws_appsync_graphqlEndpoint: "$GRAPHQL_ENDPOINT",
  aws_appsync_region: "$AWS_DEFAULT_REGION",
  aws_appsync_authenticationType: "AMAZON_COGNITO_USER_POOLS",
  aws_mandatory_sign_in: true
};
export default awsconfig;
EOT
```

Retrieve users' credentials and write into `src/workerNames.js` file

```bash
export WORKER1_PASSWORD=$(aws secretsmanager get-secret-value --secret-id="HLF-MEMBER-PW-NETWORK-${NETWORKID}-ACCOUNT-${WORKER1_NAME}" | jq -r '.SecretString')
export WORKER2_PASSWORD=$(aws secretsmanager get-secret-value --secret-id="HLF-MEMBER-PW-NETWORK-${NETWORKID}-ACCOUNT-${WORKER2_NAME}" | jq -r '.SecretString')

cat <<EOT > src/workerNames.js
const workerNames = {
  "worker1": "$WORKER1_NAME",
  "worker2": "$WORKER2_NAME",
  "worker1Password": "$WORKER1_PASSWORD",
  "worker2Password": "$WORKER2_PASSWORD"
};
export default workerNames;
EOT
```

Run the app in the development mode.

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view it in your browser.
