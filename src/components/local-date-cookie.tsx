"use client";

import { useEffect } from "react";
import { formatLocalDate } from "@/lib/dates";

export function LocalDateCookie() {
  useEffect(() => {
    const today = formatLocalDate();
    document.cookie = `local-date=${today}; path=/; max-age=86400; samesite=lax`;
  }, []);
  return null;
}
