import type en from "../../messages/en.json";
import type { Locale } from "@/lib/site/config";

// Typed message keys: a missing or misspelled key is a compile error.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof en;
  }
}
