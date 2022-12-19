#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { SupplyChainAppStack } from "../lib/stack";
import { AwsSolutionsChecks } from "cdk-nag";

const app = new cdk.App();

const REGION = process.env.AWS_DEFAULT_REGION;
const MEMBER_AWS_ID = process.env.MEMBER_AWS_ID;

const WORKER1_NAME = process.env.WORKER1_NAME;
const WORKER2_NAME = process.env.WORKER2_NAME;
const VPCID = process.env.VPCID;
const SUBNETID = process.env.SUBNETID;
const GROUPID = process.env.GROUPID;
const DEFAULT_GROUP_ID = process.env.DEFAULT_GROUP_ID;
const MEMBER_NAME = process.env.MEMBER_NAME;

console.log(`
  REGION: ${REGION}
  MEMBER_AWS_ID: ${MEMBER_AWS_ID}
  WORKER1_NAME: ${WORKER1_NAME}
  WORKER2_NAME: ${WORKER2_NAME}
  VPCID: ${VPCID}
  SUBNETID: ${SUBNETID}
  GROUPID: ${GROUPID}
  DEFAULT_GROUP_ID: ${DEFAULT_GROUP_ID}
  MEMBER_NAME: ${MEMBER_NAME}`);

if (
    !REGION ||
    !MEMBER_AWS_ID ||
    !WORKER1_NAME ||
    !WORKER2_NAME ||
    !VPCID ||
    !SUBNETID ||
    !GROUPID ||
    !DEFAULT_GROUP_ID ||
    !MEMBER_NAME
) {
    throw "One or more required environment variables are not specified";
}

const supplyChainAppStack = new SupplyChainAppStack(app, "SupplyChainApp", {
    env: {
        region: REGION,
        account: MEMBER_AWS_ID,
    },
    worker1Name: WORKER1_NAME,
    worker2Name: WORKER2_NAME,
    vpcId: VPCID,
    hfClientAndEndpointSgId: GROUPID,
    defaultSgId: DEFAULT_GROUP_ID,
    subnetId: SUBNETID,
    memberName: MEMBER_NAME,
});

cdk.Aspects.of(supplyChainAppStack).add(new AwsSolutionsChecks({ verbose: false, reports: true, logIgnores: false }));
