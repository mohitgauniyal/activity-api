require("dotenv").config({
  path: require("path").resolve(__dirname, "../.dev.vars"),
});

const BASE = process.env.BASE;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!BASE || !ADMIN_TOKEN) {
  console.error("❌ BASE or ADMIN_TOKEN not set");
  process.exit(1);
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✔ ${name}`);
    passed++;
  } catch (err) {
    console.error(`✖ ${name}`);
    console.error("  ", err.message);
    failed++;
  }
}

async function expect(res, status, validator) {
  if (res.status !== status) {
    throw new Error(`Expected status ${status}, got ${res.status}`);
  }

  if (validator) {
    const body = await res.json();
    validator(body);
  }
}

/* ---------------- TESTS ---------------- */

(async () => {
  /* ROOT */
  await test("GET /", async () => {
    const res = await fetch(`${BASE}/`);
    await expect(res, 200, body => {
      if (!body.service) throw new Error("Missing service key");
    });
  });

  /* STATUS */
  await test("GET /status (initial)", async () => {
    const res = await fetch(`${BASE}/status`);
    await expect(res, 200, body => {
      if (!("building" in body)) throw new Error("Missing building");
      if (!("learning" in body)) throw new Error("Missing learning");
    });
  });

  await test("POST /status (unauthorized)", async () => {
    const res = await fetch(`${BASE}/status`, { method: "POST" });
    await expect(res, 401);
  });

  let createdStatusId;

  await test("POST /status (create)", async () => {
    const res = await fetch(`${BASE}/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": ADMIN_TOKEN
      },
      body: JSON.stringify({
        section: "building",
        title: "Activity Feed API",
        description: "Cloudflare Worker backend",
        position: 0
      })
    });

    await expect(res, 200);

    const check = await fetch(`${BASE}/status`);
    const data = await check.json();
    createdStatusId = data.building[0]?.id;

    if (!createdStatusId) {
      throw new Error("Status not created");
    }
  });

  await test("DELETE /status/:id", async () => {
    const res = await fetch(`${BASE}/status/${createdStatusId}`, {
      method: "DELETE",
      headers: { "x-admin-token": ADMIN_TOKEN }
    });
    await expect(res, 200);
  });

  /* LOGS */
  await test("GET /logs (empty or array)", async () => {
    const res = await fetch(`${BASE}/logs`);
    await expect(res, 200, body => {
      if (!Array.isArray(body)) throw new Error("Expected array");
    });
  });

  await test("POST /logs (missing fields)", async () => {
    const res = await fetch(`${BASE}/logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": ADMIN_TOKEN
      },
      body: JSON.stringify({})
    });

    await expect(res, 400);
  });

  await test("POST /logs (authorized)", async () => {
    const res = await fetch(`${BASE}/logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": ADMIN_TOKEN
      },
      body: JSON.stringify({
        type: "tech",
        message: "Automated test log"
      })
    });

    await expect(res, 200);
  });

  await test("GET /logs?limit=1", async () => {
    const res = await fetch(`${BASE}/logs?limit=1`);
    await expect(res, 200, body => {
      if (body.length !== 1) throw new Error("Limit not applied");
    });
  });

  /* UNKNOWN */
  await test("GET /unknown", async () => {
    const res = await fetch(`${BASE}/unknown`);
    await expect(res, 404);
  });

  /* SUMMARY */
  console.log("\n--- TEST SUMMARY ---");
  console.log(`✔ Passed: ${passed}`);
  console.log(`✖ Failed: ${failed}`);

  if (failed > 0) process.exit(1);
})();
