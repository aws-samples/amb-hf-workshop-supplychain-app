// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const STATES = ["manufactured", "inspected", "shipped", "stocked", "labeled", "sold"];

const NEXT_STEP_LOOKUP = {
    manufactured: "inspect",
    inspected: "ship",
    shipped: "receive",
    stocked: "label",
    labeled: "sell",
};

const NEXT_STATE_LOOKUP = {
    manufactured: "inspected",
    inspected: "shipped",
    shipped: "stocked",
    stocked: "labeled",
    labeled: "sold",
};

export { STATES, NEXT_STEP_LOOKUP, NEXT_STATE_LOOKUP };
