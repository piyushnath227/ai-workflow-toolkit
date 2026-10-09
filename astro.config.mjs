import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://ai-workflow-toolkit.pages.dev",
  integrations: [sitemap()],
  output: "static",
});
