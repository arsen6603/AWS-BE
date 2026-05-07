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

// lib/import-service/importProductsFile.ts
var importProductsFile_exports = {};
__export(importProductsFile_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(importProductsFile_exports);
var import_client_s3 = require("@aws-sdk/client-s3");
var import_s3_request_presigner = require("@aws-sdk/s3-request-presigner");
var HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET",
  "Content-Type": "application/json"
};
async function handler(event) {
  console.log("importProductsFile called", { event });
  const fileName = event.queryStringParameters?.name;
  if (!fileName) {
    return {
      statusCode: 400,
      headers: HEADERS,
      body: JSON.stringify({ message: "Missing required query parameter: name" })
    };
  }
  const client = new import_client_s3.S3Client({ region: process.env.REGION });
  const command = new import_client_s3.PutObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: `uploaded/${fileName}`,
    ContentType: "text/csv"
  });
  try {
    const signedUrl = await (0, import_s3_request_presigner.getSignedUrl)(client, command, { expiresIn: 3600 });
    return {
      statusCode: 200,
      headers: HEADERS,
      body: signedUrl
    };
  } catch (error) {
    console.error("importProductsFile error", error);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ message: "Internal server error" })
    };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
