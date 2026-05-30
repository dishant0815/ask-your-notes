// Shared-password client helpers.
//
// The password is stored in localStorage. lib/api.ts reads it on every call
// and attaches it as `Authorization: Bearer <pw>`. On a 401 the password is
// cleared and the AuthGate component re-shows the login screen.
//
// localStorage is readable by any JS on the same origin -- fine for a shared
// password used by people you trust, not fine for anything sensitive.

const KEY = "asknotes_pw";
const CHANGE_EVENT = "asknotes:auth-changed";

export function getPassword(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}

export function setPassword(pw: string): void {
  window.localStorage.setItem(KEY, pw);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function clearPassword(): void {
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function onAuthChanged(handler: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, handler);
  // 'storage' fires on OTHER tabs when localStorage changes -- keeps tabs in sync.
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
