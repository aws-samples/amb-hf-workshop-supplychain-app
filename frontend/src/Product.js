// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React, { useState } from "react";
import moment from "moment";
import UpdateProductState from "./UpdateProductState.js";
import { STATES, NEXT_STEP_LOOKUP } from "./states";

function Product({ product, user, updateProduct }) {
    const [clickedButton, setClickedButton] = useState("");

    const userCanPerformNextTransitionOnProduct = () => {
        const permissions = user.attributes["custom:permissions"].split("_");
        let canPerform = true;

        if (NEXT_STEP_LOOKUP.hasOwnProperty(product.state)) {
            const transitionStep = NEXT_STEP_LOOKUP[product.state];
            canPerform = permissions.includes(transitionStep);
        }
        return canPerform;
    };

    return (
        <tr>
            <td className="serial">{product.id}</td>
            <td>{product.state}</td>
            {STATES.map((state) => (
                <td key={state}>
                    <span title={moment(product.history[state]).format("MMMM Do YYYY, h:mm:ss a")}>
                        {product.history[state] && moment(product.history[state]).fromNow()}
                    </span>
                </td>
            ))}
            <td>
                {userCanPerformNextTransitionOnProduct(product) && (
                    <UpdateProductState
                        product={product}
                        updateProduct={updateProduct}
                        clickedButton={clickedButton}
                        setClickedButton={setClickedButton}
                    />
                )}
            </td>
        </tr>
    );
}

export default Product;
