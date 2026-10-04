"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/push/client";

/** Registers the service worker once on load so push can be received. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    registerServiceWorker();
  }, []);
  return null;
}
