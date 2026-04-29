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

// lib/product-service/getProductsById.ts
var getProductsById_exports = {};
__export(getProductsById_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(getProductsById_exports);
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var docClient = import_lib_dynamodb.DynamoDBDocumentClient.from(new import_client_dynamodb.DynamoDBClient({}));
var HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json"
};
async function handler(event) {
  console.log("getProductsById called", { event });
  const productId = event.pathParameters?.productId;
  if (!productId) {
    return { statusCode: 400, headers: HEADERS, body: JSON.stringify({ message: "Product ID is required" }) };
  }
  try {
    const [productResult, stockResult] = await Promise.all([
      docClient.send(new import_lib_dynamodb.GetCommand({
        TableName: process.env.PRODUCTS_TABLE_NAME,
        Key: { id: productId }
      })),
      docClient.send(new import_lib_dynamodb.GetCommand({
        TableName: process.env.STOCK_TABLE_NAME,
        Key: { product_id: productId }
      }))
    ]);
    if (!productResult.Item) {
      return { statusCode: 404, headers: HEADERS, body: JSON.stringify({ message: "Product not found" }) };
    }
    const result = {
      ...productResult.Item,
      count: stockResult.Item?.count ?? 0
    };
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(result) };
  } catch (error) {
    console.error("getProductsById error", error);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: "Internal server error" }) };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
