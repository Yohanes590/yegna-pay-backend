import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const connectionString = `${process.env.DATABASE_URL}`;

const pool = new pg.Pool({
    connectionString,
    max: Number(process.env.PG_POOL_MAX || "20"),
    idleTimeoutMillis: Number(process.env.PG_POOL_IDLE_MS || "30000"),
    connectionTimeoutMillis: Number(process.env.PG_POOL_CONNECT_MS || "10000"),
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export { prisma };