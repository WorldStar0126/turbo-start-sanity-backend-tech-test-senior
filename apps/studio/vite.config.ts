import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  server: {
    // Bind to IPv4 loopback to avoid environments where IPv6 ::1 is blocked.
    host: "127.0.0.1",
    port: 3333,
    strictPort: true,
  },
});
