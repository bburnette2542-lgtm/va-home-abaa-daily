import { createHash, timingSafeEqual } from "node:crypto";

export const OFFICE_COOKIE = "office_ok";
export const ARNOLD_COOKIE = "arnold_ok";

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

function equalBytes(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function passcodeMatches(input: string, expected: string) {
  if (!expected || !input) return false;
  return equalBytes(digest(input), digest(expected));
}

export function officeCookieValue(passcode: string) {
  return createHash("sha256").update(`office:${passcode}`).digest("hex");
}

export function officeCookieValid(cookie: string | undefined, passcode: string) {
  if (!cookie || !passcode) return false;
  const expected = officeCookieValue(passcode);
  const left = Buffer.from(cookie);
  const right = Buffer.from(expected);
  return equalBytes(left, right);
}

export function arnoldCookieValue(pin: string) {
  return createHash("sha256").update(`arnold:${pin}`).digest("hex");
}

export function arnoldCookieValid(cookie: string | undefined, pin: string) {
  if (!cookie || !pin) return false;
  const expected = arnoldCookieValue(pin);
  return equalBytes(Buffer.from(cookie), Buffer.from(expected));
}
