// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useState } from "react";
import awsconfig from "./aws-exports";
import { createSubscriptionHandshakeLink } from "aws-appsync-subscription-link";
import { createAuthLink } from "aws-appsync-auth-link";
import { ApolloClient, ApolloProvider, ApolloLink, InMemoryCache } from "@apollo/client";
import Auth from "@aws-amplify/auth";
import useAmplifyAuth from "./useAmplifyAuth";
import workerNames from "./workerNames.js";

import AllProductsWithData from "./AllProductsWithData";

Auth.configure(awsconfig);
const getAccessToken = () => {
    return Auth.currentSession().then((session) => {
        return session.getAccessToken().getJwtToken();
    });
};

const config = {
    url: awsconfig.aws_appsync_graphqlEndpoint,
    region: awsconfig.aws_appsync_region,
    auth: {
        type: awsconfig.aws_appsync_authenticationType,
        jwtToken: getAccessToken,
    },
    disableOffline: true,
};

const link = ApolloLink.from([createAuthLink(config), createSubscriptionHandshakeLink(config)]);

export const client = new ApolloClient({
    link,
    cache: new InMemoryCache({ addTypename: false, resultCaching: false }),
});

const App = () => {
    const {
        state: { user },
        handleSignout,
    } = useAmplifyAuth();

    const [products, setProducts] = useState({});

    return !user ? (
        <header className="signin">
            <div>
                <h1>Supply Chain Manager</h1>
                <div className="signin">
                    <button onClick={() => Auth.signIn(workerNames["worker1"], workerNames["worker1Password"])}>
                        Sign in as {workerNames["worker1"]}
                    </button>
                    <button onClick={() => Auth.signIn(workerNames["worker2"], workerNames["worker2Password"])}>
                        Sign in as {workerNames["worker2"]}
                    </button>
                </div>
            </div>
        </header>
    ) : (
        <div className="App">
            <header className="section">
                <div>
                    <h1>Supply Chain Manager</h1>
                </div>
                <div>
                    <button onClick={handleSignout}>Sign out {user.username}</button>
                </div>
            </header>
            <main className="section">
                <AllProductsWithData user={user} products={products} setProducts={setProducts} />
            </main>
            <footer className="section">
                <div>
                    This site generated as part of the&nbsp;
                    <a href="https://supply-chain-blockchain.workshops.aws.dev">supply chain workshop</a> for&nbsp;
                    <a href="https://aws.amazon.com/managed-blockchain/">Amazon Managed Blockchain</a>
                </div>
            </footer>
        </div>
    );
};

const WithProvider = () => (
    <ApolloProvider client={client}>
        <App />
    </ApolloProvider>
);

export default WithProvider;
