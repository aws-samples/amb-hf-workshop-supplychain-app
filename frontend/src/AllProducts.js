// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useEffect } from "react";
import Product from "./Product";
import CreateProduct from "./CreateProduct";
import { STATES } from "./states";

function AllProducts({ subscribeToNewProducts, subscribeToUpdatedProducts, user, products, updateProduct }) {
    useEffect(() => subscribeToNewProducts());
    useEffect(() => subscribeToUpdatedProducts());

    const sortProducts = (products) => {
        const prodArray = Object.entries(products).map((e) => e[1]);
        return prodArray.sort((a, b) => {
            return b.history.manufactured.localeCompare(a.history.manufactured);
        });
    };
    const sortedProducts = sortProducts(products);

    return (
        <div>
            <CreateProduct user={user} />
            <table>
                <thead>
                    <tr>
                        <th>serial number</th>
                        <th>current state</th>
                        {STATES.map((state) => (
                            <th key={state}>{state}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sortedProducts.map((product) => (
                        <Product key={product.id} product={product} user={user} updateProduct={updateProduct} />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default AllProducts;
