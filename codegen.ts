import type { CodegenConfig } from "@graphql-codegen/cli";
const config: CodegenConfig = {
  schema: "apps/api/src/schema.gql",
  documents: [
    "graphql/queries.ts",
    "graphql/mutations.ts",
    "graphql/fragments.ts",
  ],
  generates: {
    "graphql/generated.ts": {
      plugins: ["typescript-operations", "typed-document-node"],
      config: {
        useTypeImports: true,
        enumsAsTypes: true,
        scalars: { DateTime: "string" },
      },
    },
  },
};
export default config;
