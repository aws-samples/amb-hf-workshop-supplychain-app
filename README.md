# AMB Hyperledger Fabric Supply Chain CDK Application

This repository is used for **Invoking chaincode via API** section in [Track-and-Trace Blockchain Workshop for Hyperledger Fabric](https://catalog.us-east-1.prod.workshops.aws/workshops/008da2cb-8454-42d0-877b-bc290bff7fcf/en-US/04-invoking-chaincode-via-api)

All the commands should be executed in a Cloud9 instance provisioned as part of the aforementioned workshop

## Steps

You will deploy the components highlighted in the architecture using [AWS Cloud Development Kit (AWS CDK)](https://docs.aws.amazon.com/cdk/v2/guide/home.html). The AWS CDK lets you build reliable, scalable, cost-effective applications in the cloud with the considerable expressive power of a programming language.

Install NodeJS v16 and set as the default version

```bash
nvm install lts/gallium
nvm use lts/gallium
nvm alias default lts/gallium
```

The AWS CDK includes the CDK Toolkit (also called the CLI), a command line tool for working with your AWS CDK apps and stacks. Install the CDK toolkit

```bash
npm install -g aws-cdk@2.55.1
cdk --version
```

Deploying stacks with the AWS CDK requires dedicated Amazon S3 buckets and other containers to be available to AWS CloudFormation during deployment. Creating these is called bootstrapping. To bootstrap, issue

```bash
cdk bootstrap aws://$MEMBER_AWS_ID/$AWS_DEFAULT_REGION
```

Now that you have installed and bootstrapped CDK, clone the supply chain CDK application code repository. The CDK application code is written in [TypeScript](https://www.typescriptlang.org/). The components are defined in `lib/stack.ts` file

```bash
cd $HOME/environment
git clone --depth=1 https://github.com/aws-samples/amb-hf-workshop-supplychain-app
```

Install the CDK application dependencies

```bash
cd $HOME/environment/amb-hf-workshop-supplychain-app
npm ci
```

Lambda layers are a powerful way of bundling Lambda dependencies in a way that makes them more easily reused. They can also improve the performance of Lambda functions by making it easier for dependencies to be pre-loaded prior to Lambda invocation. Finally, by putting all your dependencies in a layer, your actual Lambda code can be kept lean, which makes it a lot easier to edit and maintain, even in the AWS
Management Console if you prefer. Install the dependencies for Lambda Layer

```bash
cd $HOME/environment/amb-hf-workshop-supplychain-app
npm ci --omit=dev --prefix lib/lambda-layer/nodejs
```

The `lib/lambda` folder consists of files used by the Lambda function. The code in the file `lib/lambda/index.js` retrieves the necessary arguments from the AppSync caller, uses them to retrieve the user's credentials from AWS Secrets Manager, and finally submits a query or transaction to the Fabric peer nodes, returning the result to AppSync.

Generate [connection profile](https://hyperledger.github.io/fabric-sdk-node/release-2.2/tutorial-commonconnectionprofile.html) JSON file from the Fabric environment settings. This file is used by the Lambda function to determine how to connect to the Hyperledger Fabric blockchain network. Observe that `connection-profile.json` and `managedblockchain-tls-chain.pem` files are created in `lib/lambda` folder.

```bash
./scripts/setupConnectionProfile.sh
```

Retrieve environment variables needed to deploy the CDK application

```bash
export INTERFACE=$(curl --silent http://169.254.169.254/latest/meta-data/network/interfaces/macs/)
export SUBNETID=$(curl --silent http://169.254.169.254/latest/meta-data/network/interfaces/macs/${INTERFACE}/subnet-id)
export VPCID=$(curl --silent http://169.254.169.254/latest/meta-data/network/interfaces/macs/${INTERFACE}/vpc-id)
export SECURITY_GROUPS=$(curl --silent http://169.254.169.254/latest/meta-data/network/interfaces/macs/${INTERFACE}/security-group-ids)
export GROUPID=$(aws ec2 describe-security-groups --group-ids $SECURITY_GROUPS --filter "Name=group-name, Values=HFClientAndEndpoint" --query "SecurityGroups[0].GroupId" --output text)
export DEFAULT_GROUP_ID=$(aws ec2 describe-security-groups --filter "Name=group-name, Values=default" --query "SecurityGroups[?VpcId=='"$VPCID"'].GroupId | [0]" --output text)
```

Deploy the application. The file `deploy-out.json` contains the stack output that will be needed in subsequent steps

```bash
cdk deploy --json --outputs-file deploy-output.json
```

A successful output of the deployment should look similar to this

```text
Outputs:
SupplyChainApp.CognitoPoolID = us-east-1_JM1yeHYpg
SupplyChainApp.GraphQLURL = https://mtltpauhj5hnzo27jw6schw574.appsync-api.us-east-1.amazonaws.com/graphql
SupplyChainApp.Worker1PKSecret = arn:aws:secretsmanager:us-east-1:123456789012:secret:amb/supplychain/rtworker/pk-VJzFGf
SupplyChainApp.Worker1SignCertSecret = arn:aws:secretsmanager:us-east-1:123456789012:secret:amb/supplychain/rtworker/signcert-dwbXi8
SupplyChainApp.Worker2PKSecret = arn:aws:secretsmanager:us-east-1:123456789012:secret:amb/supplychain/rtseller/pk-DFkgmJ
SupplyChainApp.Worker2SignCertSecret = arn:aws:secretsmanager:us-east-1:123456789012:secret:amb/supplychain/rtseller/signcert-OEsJLh
```

You should also observe the same output in JSON format by issuing the following

```bash
cat deploy-output.json | jq .
```

Now you will store some of the private key material for each consortium member's
user identities in [AWS SecretsManager](https://aws.amazon.com/secrets-manager/). The SecretsManager secrets have been deployed by CDK. The lambda function will retrieve these secrets so that it can query and invoke chaincode on behalf of authenticated users.

```bash
./scripts/insertSecretValues.sh
```

Your web application users will need to authenticate against some source of user
information. [Amazon Cognito](https://aws.amazon.com/cognito/) was designed to
make this easier. It comes with many important security features for
managing user credentials securely, and follows authentication standards, such
as OAuth. The Cognito User Pool and the web client are previously created by CDK. The following commands will add user records for your two workers.

```bash
./scripts/createUsers.sh
```

## Delete CDK application

Delete AWS Lambda, Cognito User Pool, Appsync APIs and Secret Manager secrets

```bash
cd $HOME/environment/amb-hf-workshop-supplychain-app
cdk destroy
```

## Frontend Application

Refer to [AMB Hyperledger Fabric Supply Chain Frontend App](frontend/README.md)
