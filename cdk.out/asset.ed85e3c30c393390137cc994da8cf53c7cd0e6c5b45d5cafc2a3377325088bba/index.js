"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// lib/product-service/getProductsList.ts
var getProductsList_exports = {};
__export(getProductsList_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(getProductsList_exports);
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var docClient = import_lib_dynamodb.DynamoDBDocumentClient.from(new import_client_dynamodb.DynamoDBClient({}));
var HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET",
  "Content-Type": "application/json"
};
async function handler(event) {
  console.log("getProductsList called", { event });
  try {
    const [productsResult, stockResult] = await Promise.all([
      docClient.send(new import_lib_dynamodb.ScanCommand({ TableName: process.env.PRODUCTS_TABLE_NAME })),
      docClient.send(new import_lib_dynamodb.ScanCommand({ TableName: process.env.STOCK_TABLE_NAME }))
    ]);
    const products = productsResult.Items ?? [];
    const stocks = stockResult.Items ?? [];
    const stockMap = Object.fromEntries(stocks.map((s) => [s.product_id, s.count]));
    const result = products.map((product) => ({
      ...product,
      count: stockMap[product.id] ?? 0
    }));
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(result) };
  } catch (error) {
    console.error("getProductsList error", error);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: "Internal server error" }) };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
