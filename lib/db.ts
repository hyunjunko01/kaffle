import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaVersion?: number;
};

/** Bump when Prisma schema changes so dev HMR picks up new models without a full restart. */
const PRISMA_SCHEMA_VERSION = 2;

function createPrismaClient() {
  const client = new PrismaClient();
  if (!("raffleSnapshot" in client) || !("prizeClaim" in client)) {
    throw new Error(
      "Prisma client is out of date. Run `npx prisma generate`, then restart the dev server.",
    );
  }
  return client;
}

export const prisma =
  globalForPrisma.prisma &&
  globalForPrisma.prismaSchemaVersion === PRISMA_SCHEMA_VERSION
    ? globalForPrisma.prisma
    : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION;
}
