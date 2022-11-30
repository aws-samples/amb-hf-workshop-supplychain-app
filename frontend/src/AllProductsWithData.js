// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useEffect } from "react";
import { useQuery, gql } from "@apollo/client";

import AllProducts from "./AllProducts";

const LIST_PRODUCTS_QUERY = gql`
    query GetProducts {
        products {
            id
            state
            history {
                manufactured
                inspected
                shipped
                stocked
                labeled
                sold
            }
        }
    }
`;

const PRODUCTS_SUBSCRIPTION = gql`
    subscription onProductCreated {
        createdProduct {
            id
            state
            history {
                manufactured
                inspected
                shipped
                stocked
                labeled
                sold
            }
        }
    }
`;

const UPDATES_SUBSCRIPTION = gql`
    subscription onProductUpdated {
        updatedProductState {
            id
            state
            history {
                manufactured
                inspected
                shipped
                stocked
                labeled
                sold
            }
        }
    }
`;

function AllProductsWithData({ user, products, setProducts }) {
    const { subscribeToMore, loading, data, refetch } = useQuery(LIST_PRODUCTS_QUERY);

    const updateProduct = (product) => {
        const newProducts = Object.assign(products);
        newProducts[product.id] = product;
        setProducts(newProducts);
        refetch();
    };

    const updateProductListFromSubscriptionData = (prev, update) => {
        if (update.data.createdProduct) {
            const newProducts = {};
            prev.products.forEach((p) => (newProducts[p.id] = p));
            const p = update.data.createdProduct;
            newProducts[p.id] = p;
            setProducts(newProducts);
        }
        if (update.data.updatedProductState) {
            const newProducts = {};
            prev.products.forEach((p) => (newProducts[p.id] = p));
            const p = update.data.updatedProductState;
            newProducts[p.id] = p;
            setProducts(newProducts);
        }
        return prev;
    };

    useEffect(() => {
        if (data && data.products) {
            const prod = {};
            data.products.forEach((p) => (prod[p.id] = p));
            setProducts(prod);
        }
    }, [data, setProducts]);

    if (loading) return <div className="loader">Loading...</div>;

    return (
        <AllProducts
            user={user}
            products={products}
            updateProduct={updateProduct}
            subscribeToNewProducts={() => {
                subscribeToMore({
                    document: PRODUCTS_SUBSCRIPTION,
                    variables: {},
                    updateQuery: (prev, { subscriptionData }) =>
                        updateProductListFromSubscriptionData(prev, subscriptionData),
                });
            }}
            subscribeToUpdatedProducts={() => {
                subscribeToMore({
                    document: UPDATES_SUBSCRIPTION,
                    variables: {},
                    updateQuery: (prev, { subscriptionData }) =>
                        updateProductListFromSubscriptionData(prev, subscriptionData),
                });
            }}
        />
    );
}

export default AllProductsWithData;
