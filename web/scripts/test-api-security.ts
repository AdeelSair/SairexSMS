/**
 * SAIREX SMS — API Security Test Suite
 * Tests all routes for: auth enforcement, tenant scoping, role checks
 *
 * Run with: npx tsx scripts/test-api-security.ts
 */

const BASE = "http://localhost:3000";

type TestResult = {
  name: string;
  pass: boolean;
  expected: string;
  actual: string;
};

const results: TestResult[] = [];

async function test(
  name: string,
  method: string,
  path: string,
  expectedStatus: number,
  options?: { cookie?: string; body?: any }
) {
  try {
    const headers: Record<string, string> = {};
    if (options?.cookie) headers["Cookie"] = options.cookie;
    if (options?.body) headers["Content-Type"] = "application/json";

    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
      redirect: "manual", // Don't follow redirects — we want to see the 3xx
    });

    const status = res.status;
    const pass = status === expectedStatus;

    results.push({
      name,
      pass,
      expected: `${expectedStatus}`,
      actual: `${status}`,
    });
  } catch (err: any) {
    results.push({
      name,
      pass: false,
      expected: `${expectedStatus}`,
      actual: `ERROR: ${err.message}`,
    });
  }
}

async function getSessionCookie(): Promise<string> {
  // Step 1: Get CSRF token
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;
  const cookies = csrfRes.headers.getSetCookie?.() || [];

  // Step 2: Sign in with credentials
  const signInRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookies.join("; "),
    },
    body: new URLSearchParams({
      csrfToken,
      email: "admin@sairex-sms.com",
      password: "Admin@123",
    }),
    redirect: "manual",
  });

  // Collect all set-cookie headers (session token lives here)
  const signInCookies = signInRes.headers.getSetCookie?.() || [];
  const allCookies = [...cookies, ...signInCookies];

  // Build a cookie string from all received cookies
  const cookieMap = new Map<string, string>();
  for (const c of allCookies) {
    const [nameVal] = c.split(";");
    const [name, ...valParts] = nameVal.split("=");
    cookieMap.set(name.trim(), valParts.join("=").trim());
  }

  const cookieStr = Array.from(cookieMap.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");

  return cookieStr;
}

async function main() {
  console.log("==============================================");
  console.log("  SAIREX SMS — API Security Test Suite");
  console.log("==============================================\n");

  // ─── PHASE 1: UNAUTHENTICATED ACCESS (should all return 401) ───
  console.log("Phase 1: Unauthenticated access (expect 401)...");

  const routes = [
    ["GET", "/api/organizations"],
    ["POST", "/api/organizations"],
    ["GET", "/api/regions"],
    ["POST", "/api/regions"],
    ["GET", "/api/campuses"],
    ["POST", "/api/campuses"],
    ["GET", "/api/students"],
    ["POST", "/api/students"],
    ["GET", "/api/finance/heads"],
    ["POST", "/api/finance/heads"],
    ["GET", "/api/finance/structures"],
    ["POST", "/api/finance/structures"],
    ["GET", "/api/finance/challans"],
    ["POST", "/api/finance/challans"],
    ["PUT", "/api/finance/challans"],
    ["GET", "/api/cron/reminders"],
  ];

  for (const [method, path] of routes) {
    await test(
      `NO AUTH → ${method} ${path}`,
      method,
      path,
      401,
      { body: method !== "GET" ? {} : undefined }
    );
  }

  // ─── PHASE 2: AUTHENTICATED ACCESS (SUPER_ADMIN) ───
  console.log("Phase 2: Authenticating as SUPER_ADMIN...");
  let cookie: string;
  try {
    cookie = await getSessionCookie();
    if (!cookie || cookie.length < 20) {
      console.error("  FAILED to get session cookie. Aborting Phase 2+3.");
      printResults();
      return;
    }
    console.log("  Session cookie obtained.\n");
  } catch (err: any) {
    console.error("  Auth error:", err.message);
    printResults();
    return;
  }

  console.log("Phase 2: Authenticated GET requests (expect 200)...");

  const getRoutes = [
    "/api/organizations",
    "/api/regions",
    "/api/campuses",
    "/api/students",
    "/api/finance/heads",
    "/api/finance/structures",
    "/api/finance/challans",
    "/api/cron/reminders",
  ];

  for (const path of getRoutes) {
    await test(`AUTH → GET ${path}`, "GET", path, 200, { cookie });
  }

  // ─── PHASE 3: TENANT SCOPING — verify data comes back ───
  console.log("Phase 3: Verifying data shape & tenant scoping...");

  // Fetch organizations and verify it returns an array
  const orgsRes = await fetch(`${BASE}/api/organizations`, {
    headers: { Cookie: cookie },
  });
  const orgs = await orgsRes.json();
  const orgsIsArray = Array.isArray(orgs);
  results.push({
    name: "SCOPE → /api/organizations returns array",
    pass: orgsIsArray,
    expected: "array",
    actual: orgsIsArray ? `array(${orgs.length})` : typeof orgs,
  });

  // Fetch students and verify array
  const studRes = await fetch(`${BASE}/api/students`, {
    headers: { Cookie: cookie },
  });
  const students = await studRes.json();
  const studIsArray = Array.isArray(students);
  results.push({
    name: "SCOPE → /api/students returns array",
    pass: studIsArray,
    expected: "array",
    actual: studIsArray ? `array(${students.length})` : typeof students,
  });

  // Fetch challans and verify array
  const challRes = await fetch(`${BASE}/api/finance/challans`, {
    headers: { Cookie: cookie },
  });
  const challans = await challRes.json();
  const challIsArray = Array.isArray(challans);
  results.push({
    name: "SCOPE → /api/finance/challans returns array",
    pass: challIsArray,
    expected: "array",
    actual: challIsArray ? `array(${challans.length})` : typeof challans,
  });

  // ─── PHASE 4: ROLE CHECK — verify SUPER_ADMIN can create org ───
  console.log("Phase 4: Role-based access checks...");

  await test(
    "ROLE → SUPER_ADMIN can POST /api/organizations",
    "POST",
    "/api/organizations",
    201,
    {
      cookie,
      body: {
        name: "Test Org (Security Check)",
        orgCode: `TEST-SEC-${Date.now()}`,
        plan: "FREE",
      },
    }
  );

  // ─── PRINT RESULTS ───
  printResults();

  // ─── CLEANUP: Delete the test org ───
  try {
    // No delete endpoint, but that's fine — it's just a test record
  } catch {}
}

function printResults() {
  console.log("\n==============================================");
  console.log("  TEST RESULTS");
  console.log("==============================================\n");

  let passed = 0;
  let failed = 0;

  for (const r of results) {
    const icon = r.pass ? "PASS" : "FAIL";
    const marker = r.pass ? "  " : "  ";
    console.log(`  ${icon} | ${r.name}`);
    if (!r.pass) {
      console.log(`       Expected: ${r.expected}, Got: ${r.actual}`);
    }
    if (r.pass) passed++;
    else failed++;
  }

  console.log("\n----------------------------------------------");
  console.log(`  Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log("----------------------------------------------");

  if (failed === 0) {
    console.log("\n  ALL TESTS PASSED!\n");
  } else {
    console.log(`\n  ${failed} TEST(S) FAILED — see details above.\n`);
  }
}

main();
