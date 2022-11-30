// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import React from "react";
import { useMutation, gql } from "@apollo/client";
import moment from "moment";
import { NEXT_STEP_LOOKUP, NEXT_STATE_LOOKUP } from "./states";

const UPDATE_PRODUCT_STATE_MUTATION = gql`
    mutation ($id: ID!, $transition: String!) {
        updateProductState(id: $id, transition: $transition) {
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

function UpdateProductState({ product, updateProduct, clickedButton, setClickedButton }) {
    let tempProductDuringUpdate = {};

    const [updateProductState, { loading: mutationLoading }] = useMutation(UPDATE_PRODUCT_STATE_MUTATION, {
        refetchQueries: ["GetProducts"],
        awaitRefetchQueries: true,
        onCompleted({ updateProductState }) {
            // console.log('onCompleted', updateProductState);
        },
        onError(error) {
            if (product.__oldRecord) {
                updateProduct(product.__oldRecord);
            }
        },
    });
    const transition = NEXT_STEP_LOOKUP[product.state];
    const nextState = NEXT_STATE_LOOKUP[product.state];
    return (
        <div>
            {mutationLoading && <div className="loader">Loading...</div>}
            {!(mutationLoading || clickedButton === nextState) && (
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        setClickedButton(nextState);
                        let newHistory = Object.assign({}, product.history);
                        newHistory[nextState] = moment().toISOString();
                        tempProductDuringUpdate = {
                            id: product.id,
                            state: nextState,
                            history: newHistory,
                            __oldRecord: product,
                        };
                        updateProductState({
                            variables: {
                                id: product.id,
                                transition: transition,
                            },
                        });
                        updateProduct(tempProductDuringUpdate);
                    }}
                >
                    {transition && <button type="submit">{transition}</button>}
                </form>
            )}
        </div>
    );
}

export default UpdateProductState;
