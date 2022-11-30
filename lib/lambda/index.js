// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

"use strict";

let log = require("loglevel").getLogger("amb-supply-chain-connector");
log.setLevel("DEBUG");

const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const { Gateway, Wallets, DefaultEventHandlerStrategies, DefaultQueryHandlerStrategies } = require("fabric-network");

const connectionProfile = require("./connection-profile.json");

const secretsManagerClient = new SecretsManagerClient({});

if (!process.env.MEMBER_NAME) {
    throw new Error("One or more required environment variables are not specified");
}

//globally scope gateway
let gateway;

async function getSecret(key, username) {
    log.debug("begin getSecret()");

    const secretId = `amb/supplychain/${username}/${key}`;
    log.debug(`retrieving secret ${secretId}`);

    const command = new GetSecretValueCommand({
        SecretId: secretId,
    });
    let secret = "";
    const data = await secretsManagerClient.send(command);

    if ("SecretString" in data) {
        secret = data.SecretString;
    } else {
        const buff = Buffer.from(data.SecretBinary, "base64");
        secret = buff.toString("ascii");
    }

    return secret;
}

async function prepWallet(username, connectionProfile, orgName) {
    let wallet = await Wallets.newInMemoryWallet();

    const orgId = process.env.MEMBER_NAME;
    const orgMsp = connectionProfile.organizations[orgId].mspid;

    const identityName = username + "@" + orgName;

    //retrieve Fabric USER cert and key from AWS Secrets Manager
    const user_cert = await getSecret("signcert", username);
    const user_key = await getSecret("pk", username);

    const identity = {
        credentials: {
            certificate: user_cert,
            privateKey: user_key,
        },
        mspId: orgMsp,
        type: "X.509",
    };
    await wallet.put(identityName, identity);

    return wallet;
}

async function createGateway(username) {
    const wallet = await prepWallet(username, connectionProfile, process.env.MEMBER_NAME);

    gateway = new Gateway();
    await gateway.connect(connectionProfile, {
        identity: `${username}@${process.env.MEMBER_NAME}`, //load identity based on selected user
        wallet: wallet,
        discovery: { enabled: false, asLocalhost: false },
        eventHandlerOptions: {
            strategy: DefaultEventHandlerStrategies.PREFER_MSPID_SCOPE_ALLFORTX,
            endorseTimeout: 20,
            commitTimeout: 60,
        },
        queryHandlerOptions: {
            strategy: DefaultQueryHandlerStrategies.PREFER_MSPID_SCOPE_SINGLE,
            timeout: 10,
        },
    });
}

async function invokeChaincode(username, methodName, args) {
    log.debug("***//Invoke//***");
    try {
        await createGateway(username);
        // Select the smart contract and channel and open connection
        const network = await gateway.getNetwork(process.env.CHANNEL_NAME || "mainchannel");
        const contract = network.getContract(process.env.CHAINCODE_ID || "supplychaincc");

        const submitResult = await contract.submitTransaction(methodName, ...args);
        const submitResultStr = submitResult.toString();
        log.debug("***INVOKE RESULTS***", submitResultStr);

        return submitResultStr;
    } catch (error) {
        console.error("ERROR:", error);
    }
}

async function queryChaincode(username, args) {
    log.debug("***//Query//***");
    try {
        await createGateway(username);
        // Select the smart contract and channel and open connection
        const network = await gateway.getNetwork(process.env.CHANNEL_NAME || "mainchannel");
        const contract = network.getContract(process.env.CHAINCODE_ID || "supplychaincc");

        // Evaluate query of ledger data via chaincode
        const queryResult = await contract.evaluateTransaction("query", ...args);
        const queryResultStr = queryResult.toString();
        log.debug("***QUERY RESULTS***", queryResultStr);

        return queryResultStr;
    } catch (error) {
        console.error("ERROR:", error);
    }
}

async function dispatchRequest(event) {
    const username = event.identity.claims["cognito:username"] || event.identity.username;
    log.debug("PARAMETER CHECK", username, event.info.parentTypeName, event.arguments.id);
    let response;
    if (event.info.parentTypeName === "Query") {
        switch (event.info.fieldName) {
            case "product":
                const productId = event.arguments.id;
                if (!productId) throw new Error("Product ID is required");
                const product = await queryChaincode(username, [`product_${productId}`]);
                response = { ...JSON.parse(product), id: productId };
                break;

            case "products":
                const productIds = JSON.parse(await queryChaincode(username, ["productIDs"]));
                const products = [];
                for (const id of productIds) {
                    const product = await queryChaincode(username, [id]);
                    const productId = id.split("_")[1];
                    const parsedProduct = JSON.parse(product);
                    products.push({ ...parsedProduct, id: productId });
                }
                response = products;
                break;
        }
    }
    if (event.info.parentTypeName === "Mutation") {
        const productId = event.arguments.id;
        if (!productId) throw new Error("Product ID is required");
        switch (event.info.fieldName) {
            case "updateProductState":
                const updatedProduct = await invokeChaincode(username, "updateProductState", [
                    event.arguments.id,
                    event.arguments.transition,
                ]);
                response = { ...JSON.parse(updatedProduct), id: productId };
                break;
            case "createProduct":
                const newProduct = await invokeChaincode(username, "createProduct", [event.arguments.id]);
                response = { ...JSON.parse(newProduct), id: productId };
                break;
        }
    }
    log.debug(`Response from dispatchRequest was ${JSON.stringify(response)}`);
    return response;
}

exports.handler = async (event, context) => {
    log.debug(`ambSupplyChainConnector called, event = ${JSON.stringify(event)}, context = ${JSON.stringify(context)}`);
    const response = await dispatchRequest(event);
    log.debug(`response sent back from lambda was ${JSON.stringify(response)}.`);
    // Disconnect from the gateway peer when all work for this client identity is complete
    gateway.disconnect();

    return response;
};
