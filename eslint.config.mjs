import { globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import hooks from "eslint-plugin-react-hooks";
import accessibility from "eslint-plugin-jsx-a11y";
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  hooks.configs.flat.recommended,
  accessibility.flatConfigs.recommended,
  {
    files: ["src/features/billing/plans.tsx", "src/features/admin/shared.tsx"],
    rules: {
      // The named overflow region must remain keyboard-scrollable in Safari.
      "jsx-a11y/no-noninteractive-tabindex": [
        "error",
        { roles: ["tabpanel", "region"] },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "dist/**",
    ".cache/**",
    ".local/**",
    "next-env.d.ts",
    "test-results/**",
    "playwright-report/**",
  ]),
);
