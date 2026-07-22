"use strict";

const { isIP } = require("node:net");

function getTrustedExternalClientIp(req) {
  const forwarded = req?.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string") {
    const addresses = forwarded.split(",").map((value) => value.trim());
    if (addresses.length >= 2) {
      const clientAddress = addresses[addresses.length - 2];
      const loadBalancerAddress = addresses[addresses.length - 1];
      if (isIP(clientAddress) !== 0 && isIP(loadBalancerAddress) !== 0) {
        return clientAddress;
      }
    }
  }

  const socketAddress = req?.socket?.remoteAddress;
  return typeof socketAddress === "string" && isIP(socketAddress) !== 0
    ? socketAddress
    : "";
}

function requestBodyByteLength(req) {
  const rawBody = req?.rawBody;
  if (Buffer.isBuffer(rawBody) || rawBody instanceof Uint8Array) {
    return rawBody.byteLength;
  }

  const contentLength = req?.headers?.["content-length"];
  if (typeof contentLength !== "string" || !/^\d+$/.test(contentLength))
    return 0;
  const parsed = Number(contentLength);
  return Number.isSafeInteger(parsed) ? parsed : 0;
}

module.exports = {
  getTrustedExternalClientIp,
  requestBodyByteLength,
};
