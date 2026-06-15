import crypto from "crypto";

const alphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export const nanoId = (size = 12) => {
  const bytes = crypto.randomBytes(size);
  let id = "";

  for (const byte of bytes) {
    id += alphabet[byte % alphabet.length];
  }

  return id;
};

export const prefixedNanoId = (prefix, size = 10) =>
  `${prefix}-${nanoId(size)}`;
