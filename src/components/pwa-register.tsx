"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let active = true;
    const register = async () => {
      if (!active) return;
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch (error) {
        console.error("TariScan service worker registration failed", error);
      }
    };
    void register();
    const onVisible = () => {
      if (document.visibilityState === "visible") void register();
    };
    window.addEventListener("online", register);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.removeEventListener("online", register);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return null;
}
