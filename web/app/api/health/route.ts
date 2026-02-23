/**
 * Health Check Endpoints
 *
 * GET /api/health       — Overall status
 * GET /api/health?check=db    — Database connectivity
 * GET /api/health?check=redis — Redis connectivity
 *
 * Used by load balancers, uptime monitors, and deployment pipelines.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedisConnection } from "@/lib/queue/connection";

interface HealthStatus {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  uptime: number;
  checks: Record<
    string,
    { status: "ok" | "down"; latencyMs?: number; error?: string }
  >;
}

const startTime = Date.now();

async function checkDatabase(): Promise<{
  status: "ok" | "down";
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function checkRedis(): Promise<{
  status: "ok" | "down";
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    const redis = getRedisConnection();
    const pong = await redis.ping();
    return {
      status: pong === "PONG" ? "ok" : "down",
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const check = searchParams.get("check");

  const health: HealthStatus = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks: {},
  };

  const runDb = !check || check === "db";
  const runRedis = !check || check === "redis";

  if (runDb) {
    health.checks.database = await checkDatabase();
  }

  if (runRedis) {
    health.checks.redis = await checkRedis();
  }

  const anyDown = Object.values(health.checks).some((c) => c.status === "down");
  const allDown = Object.values(health.checks).every(
    (c) => c.status === "down",
  );

  if (allDown && Object.keys(health.checks).length > 0) {
    health.status = "down";
  } else if (anyDown) {
    health.status = "degraded";
  }

  const httpStatus = health.status === "down" ? 503 : 200;

  return NextResponse.json(health, { status: httpStatus });
}
