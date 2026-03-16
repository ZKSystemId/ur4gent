import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const getKey = () => {
  const secret = process.env.WALLET_SECRET_KEY;
  if (!secret) {
    throw new Error("WALLET_SECRET_KEY is not configured");
  }
  return createHash("sha256").update(secret).digest();
};

export const encryptPrivateKey = (privateKey: string) => {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(privateKey, "utf8"),
    cipher.final(),
  ]);
  return `${iv.toString("base64")}:${encrypted.toString("base64")}`;
};

export const decryptPrivateKey = (payload: string) => {
  const [ivBase64, dataBase64] = payload.split(":");
  if (!ivBase64 || !dataBase64) {
    throw new Error("Invalid encrypted payload");
  }
  const iv = Buffer.from(ivBase64, "base64");
  const encrypted = Buffer.from(dataBase64, "base64");
  const decipher = createDecipheriv("aes-256-cbc", getKey(), iv);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
};
