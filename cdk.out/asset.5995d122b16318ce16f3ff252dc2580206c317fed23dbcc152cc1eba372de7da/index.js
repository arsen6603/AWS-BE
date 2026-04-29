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

// lib/product-service/createProduct.ts
var createProduct_exports = {};
__export(createProduct_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(createProduct_exports);
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var import_crypto = require("crypto");
var docClient = import_lib_dynamodb.DynamoDBDocumentClient.from(new import_client_dynamodb.DynamoDBClient({}));
var HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json"
};
async function handler(event) {
  console.log("createProduct called", { event });
  try {
    const body = JSON.parse(event.body ?? "{}");
    const { title, description, price, count } = body;
    if (!title || price == null || Number(price) < 0 || count == null || Number(count) < 0) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ message: "Invalid product data: title, price and count are required and must be non-negative" })
      };
    }
    const id = (0, import_crypto.randomUUID)();
    const productPrice = Number(price);
    const productCount = Number(count);
    const productDescription = description ?? "";
    await docClient.send(new import_lib_dynamodb.TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: process.env.PRODUCTS_TABLE_NAME,
            Item: { id, title, description: productDescription, price: productPrice }
          }
        },
        {
          Put: {
            TableName: process.env.STOCK_TABLE_NAME,
            Item: { product_id: id, count: productCount }
          }
        }
      ]
    }));
    return {
      statusCode: 201,
      headers: HEADERS,
      body: JSON.stringify({ id, title, description: productDescription, price: productPrice, count: productCount })
    };
  } catch (error) {
    console.error("createProduct error", error);
    return { statusCode: 500, headers: HEADERS, body: JSON.stringify({ message: "Internal server error" }) };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
