import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 32;

export function createPhoneOtp() {
  return randomInt(100000, 1000000).toString();
}

export function hashOtp(otp: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(otp, salt, KEY_LENGTH).toString("hex");

  return `${salt}:${hash}`;
}

export function verifyOtp(otp: string, storedHash: string) {
  const [salt, hash] = storedHash.split(":");

  if (!salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(otp, salt, KEY_LENGTH);

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}
