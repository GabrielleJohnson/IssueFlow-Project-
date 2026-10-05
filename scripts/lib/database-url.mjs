import * as nextEnv from "@next/env";

const loadEnvConfig = nextEnv.loadEnvConfig ?? nextEnv.default?.loadEnvConfig;

let loaded = false;

export function loadDatabaseEnvironment() {
  if (!loaded) {
    loadEnvConfig(process.cwd());
    loaded = true;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must contain the direct PostgreSQL connection URL.");
  }
  if (!process.env.DATABASE_URL_POOLED) {
    throw new Error("DATABASE_URL_POOLED must contain the pooled PostgreSQL connection URL.");
  }

  return {
    directUrl: process.env.DATABASE_URL,
    pooledUrl: process.env.DATABASE_URL_POOLED
  };
}

export function databaseUrlForSchema(connectionString, schema) {
  if (!/^[a-z][a-z0-9_]*$/.test(schema)) {
    throw new Error(`Invalid PostgreSQL schema name: ${schema}`);
  }

  const url = new URL(connectionString);
  if (!url.protocol.startsWith("postgres")) {
    throw new Error("IssueFlow now requires a PostgreSQL connection URL.");
  }
  url.searchParams.set("schema", schema);
  return url.toString();
}
