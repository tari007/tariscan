import test from "node:test";
import assert from "node:assert/strict";
import { aggregateSaleQuantities, calculateRemainingStock } from "../src/lib/offline/stock.mjs";
test("aggregates repeated cart lines for the same product", () => {
 const totals=aggregateSaleQuantities([{product_id:"p1",quantity:2},{product_id:"p2",quantity:1},{product_id:"p1",quantity:3}]);
 assert.equal(totals.get("p1"),5); assert.equal(totals.get("p2"),1);
});
test("rejects zero, negative and non-finite quantities", () => {
 for(const quantity of [0,-1,Number.NaN,Number.POSITIVE_INFINITY]) assert.throws(()=>aggregateSaleQuantities([{product_id:"p1",quantity}]));
});
test("rejects a missing product identifier",()=>assert.throws(()=>aggregateSaleQuantities([{product_id:"",quantity:1}])));
test("deducts stock to three decimal places",()=>assert.equal(calculateRemainingStock(10,2.125),7.875));
test("rejects sales above available stock",()=>assert.throws(()=>calculateRemainingStock(2,3),/Insufficient stock/));
test("rejects invalid current stock",()=>assert.throws(()=>calculateRemainingStock(-1,1),/Current stock is invalid/));
