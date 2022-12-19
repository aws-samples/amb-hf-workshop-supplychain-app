// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { RemovalPolicy, CfnOutput, Duration } from "aws-cdk-lib";
import { UserPool, StringAttribute, CfnUserPool } from "aws-cdk-lib/aws-cognito";
import { Vpc, SecurityGroup, Subnet } from "aws-cdk-lib/aws-ec2";
import { PolicyStatement, Role, ServicePrincipal, Effect } from "aws-cdk-lib/aws-iam";
import { InterfaceVpcEndpointAwsService, InterfaceVpcEndpoint } from "aws-cdk-lib/aws-ec2";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Function } from "aws-cdk-lib/aws-lambda";
import { Runtime, LayerVersion, Code, Architecture } from "aws-cdk-lib/aws-lambda";
import { GraphqlApi, SchemaFile, AuthorizationType, FieldLogLevel, Resolver } from "@aws-cdk/aws-appsync-alpha";
import { join } from "path";
import { NagSuppressions } from "cdk-nag";

export interface SupplyChainAppStackProps extends StackProps {
    worker1Name: string;

    worker2Name: string;

    vpcId: string;

    hfClientAndEndpointSgId: string;

    defaultSgId: string;

    subnetId: string;

    memberName: string;
}

export class SupplyChainAppStack extends Stack {
    constructor(scope: Construct, id: string, props: SupplyChainAppStackProps) {
        super(scope, id, props);

        const account: string = Stack.of(this).account;
        const region: string = Stack.of(this).region;

        const { worker1Name, worker2Name, vpcId, hfClientAndEndpointSgId, defaultSgId, subnetId, memberName } = props;

        //**********Secrets******************************
        const worker1PkSecret = new Secret(this, "Worker1Pk", {
            secretName: `amb/supplychain/${worker1Name}/pk`,
            removalPolicy: RemovalPolicy.DESTROY,
        });

        const worker1SignCertSecret = new Secret(this, "Worker1SignCert", {
            secretName: `amb/supplychain/${worker1Name}/signcert`,
            removalPolicy: RemovalPolicy.DESTROY,
        });

        const worker2PkSecret = new Secret(this, "Worker2Pk", {
            secretName: `amb/supplychain/${worker2Name}/pk`,
            removalPolicy: RemovalPolicy.DESTROY,
        });

        const worker2SignCertSecret = new Secret(this, "Worker2SignCert", {
            secretName: `amb/supplychain/${worker2Name}/signcert`,
            removalPolicy: RemovalPolicy.DESTROY,
        });

        //**********VPC Endpoint******************************
        const vpc = Vpc.fromLookup(this, "VPC", {
            vpcId: vpcId,
        });

        const hfClientAndEndpointSg = SecurityGroup.fromSecurityGroupId(
            this,
            "HFClientAndEndpointSG",
            hfClientAndEndpointSgId,
            {
                mutable: false,
            }
        );

        const defaultSg = SecurityGroup.fromSecurityGroupId(this, "DefaultSG", defaultSgId, {
            mutable: false,
        });

        const subnet = Subnet.fromSubnetId(this, "Subnet", subnetId);

        const secretsManagerVpcEndpoint = new InterfaceVpcEndpoint(this, "SecretsManagerEndpoint", {
            vpc,
            service: InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
            privateDnsEnabled: true,
            subnets: {
                subnets: [subnet],
            },
            securityGroups: [hfClientAndEndpointSg, defaultSg],
        });

        secretsManagerVpcEndpoint.applyRemovalPolicy(RemovalPolicy.DESTROY);

        //**********Cognito******************************
        const pool = new UserPool(this, "UserPool", {
            userPoolName: "ambSupplyChainUsers",
            selfSignUpEnabled: true,
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: false,
                tempPasswordValidity: Duration.days(7),
            },
            autoVerify: { email: true },
            standardAttributes: { email: { required: true } },
            customAttributes: {
                permissions: new StringAttribute({ mutable: true }),
            },
            removalPolicy: RemovalPolicy.DESTROY,
        });

        const cfnUserPool = pool.node.defaultChild as CfnUserPool;
        cfnUserPool.userPoolAddOns = { advancedSecurityMode: "ENFORCED" };

        pool.addClient("PoolClient", {
            userPoolClientName: "ambSupplyChainWeb",
            authFlows: {
                userPassword: true,
                userSrp: true,
            },
        });

        //**********Lambda******************************
        const lambdaRole = new Role(this, "LambdaRole", {
            assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
        });

        lambdaRole.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                resources: ["*"],
                actions: [
                    "ec2:CreateNetworkInterface", // Require * in Resource element
                    "ec2:DescribeNetworkInterfaces", // Require * in Resource element
                    "ec2:DeleteNetworkInterface", // Require * in Resource element
                    "ec2:AssignPrivateIpAddresses", // Require * in Resource element
                    "ec2:UnassignPrivateIpAddresses", // Require * in Resource element
                ],
            })
        );

        lambdaRole.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                resources: [`arn:aws:logs:${region}:${account}:log-group:/aws/lambda/*`],
                actions: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
            })
        );

        const layer = new LayerVersion(this, "FabricNetworkLayer", {
            code: Code.fromAsset("lib/lambda-layer"),
            layerVersionName: "FabricNetworkLayer",
            description: "NodeJS lts/gallium layer with aws-sdk, fabric@2.2, and loglevel",
            compatibleArchitectures: [Architecture.X86_64],
            compatibleRuntimes: [Runtime.NODEJS_16_X],
            removalPolicy: RemovalPolicy.DESTROY,
        });

        const ambSupplyChainConnectorFn = new Function(this, "SupplyChainConnectorFn", {
            code: Code.fromAsset(join(__dirname, "lambda")),
            handler: "index.handler",
            environment: {
                MEMBER_NAME: memberName,
            },
            runtime: Runtime.NODEJS_16_X,
            layers: [layer],
            vpc,
            vpcSubnets: {
                subnets: [subnet],
            },
            allowPublicSubnet: true,
            securityGroups: [defaultSg, hfClientAndEndpointSg],
            memorySize: 512,
            timeout: Duration.minutes(1),
            role: lambdaRole,
        });

        worker1PkSecret.grantRead(ambSupplyChainConnectorFn);
        worker1SignCertSecret.grantRead(ambSupplyChainConnectorFn);
        worker2PkSecret.grantRead(ambSupplyChainConnectorFn);
        worker2SignCertSecret.grantRead(ambSupplyChainConnectorFn);

        //**********AppSync******************************
        const api = new GraphqlApi(this, "API", {
            name: "AMBSupplyChainAPI",
            schema: SchemaFile.fromAsset(join(__dirname, "appsync", "schema.graphql")),
            authorizationConfig: {
                defaultAuthorization: {
                    authorizationType: AuthorizationType.USER_POOL,

                    userPoolConfig: {
                        userPool: pool,
                    },
                },
            },
            logConfig: {
                excludeVerboseContent: false,
                fieldLogLevel: FieldLogLevel.ALL,
            },
        });

        api.applyRemovalPolicy(RemovalPolicy.DESTROY);

        const ambSupplyChainConnectorDs = api.addLambdaDataSource("SupplyChainConnectorDS", ambSupplyChainConnectorFn, {
            name: "ambSupplyChainConnector",
            description: "ambSupplyChainConnector Lambda function datasource",
        });

        ["createProduct", "updateProductState"].forEach((f: string) => {
            new Resolver(this, f, {
                api: api,
                typeName: "Mutation",
                fieldName: f,
                dataSource: ambSupplyChainConnectorDs,
            });
        });

        ["product", "products"].forEach((f: string) => {
            new Resolver(this, f, {
                api: api,
                typeName: "Query",
                fieldName: f,
                dataSource: ambSupplyChainConnectorDs,
            });
        });

        // Outputs
        new CfnOutput(this, "Worker1 PK Secret", { value: worker1PkSecret.secretArn });
        new CfnOutput(this, "Worker1 SignCert Secret", { value: worker1SignCertSecret.secretArn });
        new CfnOutput(this, "Worker2 PK Secret", { value: worker2PkSecret.secretArn });
        new CfnOutput(this, "Worker2 SignCert Secret", { value: worker2SignCertSecret.secretArn });
        new CfnOutput(this, "GraphQL URL", { value: api.graphqlUrl });
        new CfnOutput(this, "Cognito Pool ID", { value: pool.userPoolId });

        // cdk-nag suppressions
        NagSuppressions.addResourceSuppressions(
            this,
            [
                {
                    id: "AwsSolutions-L1",
                    reason: "fabric-network can only use Node16 - https://github.com/hyperledger/fabric-sdk-node",
                },
                {
                    id: "AwsSolutions-SMG4",
                    reason: "Cannot use rotation for HF certs and key",
                },
                {
                    id: "AwsSolutions-COG1",
                    reason: "Cannot use special character",
                },
                {
                    id: "AwsSolutions-IAM5",
                    reason: "Permission is restrictive enough",
                },
                {
                    id: "AwsSolutions-IAM4",
                    reason: "Permission is restrictive enough",
                },
            ],
            true
        );
    }
}
