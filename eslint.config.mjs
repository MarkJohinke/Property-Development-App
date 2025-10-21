import path from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const config = [
  {
    ignores: [
      ".next/**/*",
      ".vercel/**/*",
      "node_modules/**/*",
      "next-env.d.ts",
      "backend/**/*",
      "chunk*.js",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default config;
