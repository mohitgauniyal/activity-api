// ====================
// Auth helper
// ====================
function isAuthorized(request: Request, env: any) {
  const token = request.headers.get("x-admin-token");
  return token === env.ADMIN_TOKEN;
}

const VALID_SECTIONS = ["building", "learning"];

// ====================
// Worker entry
// ====================
export default {
  async fetch(request: Request, env: any): Promise<Response> {
    try {
      const url = new URL(request.url);

      // ---- normalize path ----
      let path = url.pathname;
      if (path.length > 1 && path.endsWith("/")) {
        path = path.slice(0, -1);
      }

      // ---- normalize method ----
      const method = request.method === "HEAD" ? "GET" : request.method;

      // ====================
      // CORS CONFIG
      // ====================
      const allowedOrigins = [
        "http://localhost:3000",
        "https://mohitgauniyal.netlify.app"
      ];

      const origin = request.headers.get("Origin");
      const isAllowed = origin && (allowedOrigins.includes(origin) || origin.endsWith("mohitgauniyal.netlify.app"));

      const corsHeaders = {
        "Access-Control-Allow-Origin": isAllowed ? origin : "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-admin-token",
        "Access-Control-Max-Age": "86400",
      };

      // Handle Preflight
      if (method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
      }

      // Helper to wrap responses with CORS
      const jsonResponse = (data: any, status = 200) => {
        return new Response(JSON.stringify(data), {
          status,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders
          }
        });
      };

      const errorResponse = (msg: string, status: number) => {
        return new Response(msg, { status, headers: corsHeaders });
      };

      // ====================
      // PUBLIC ROUTES
      // ====================

      if (path === "/" && method === "GET") {
        return jsonResponse({
          service: "activity-api",
          status: "ok",
          endpoints: [
            "GET /status",
            "GET /logs",
            "POST /logs (admin)",
            "POST /status (admin)",
            "DELETE /status/:id (admin)",
            "POST /status/reorder (admin)"
          ]
        });
      }

      if (path === "/status" && method === "GET") {
        const data = await getStatus(env);
        return jsonResponse(data);
      }

      if (path === "/logs" && method === "GET") {
        const data = await getLogs(env, request);
        return jsonResponse(data);
      }

      // ====================
      // ADMIN ROUTES
      // ====================
      if (path === "/logs" && method === "POST") {
        if (!isAuthorized(request, env)) return errorResponse("Unauthorized", 401);
        const res = await createLog(env, request);
        return jsonResponse(res);
      }

      if (path === "/status" && method === "POST") {
        if (!isAuthorized(request, env)) return errorResponse("Unauthorized", 401);
        const res = await upsertStatus(env, request);
        return jsonResponse(res);
      }

      if (path.startsWith("/status/") && method === "DELETE") {
        if (!isAuthorized(request, env)) return errorResponse("Unauthorized", 401);
        const id = Number(path.split("/")[2]);
        const res = await deleteStatus(env, id);
        return jsonResponse(res);
      }

      if (path === "/status/reorder" && method === "POST") {
        if (!isAuthorized(request, env)) return errorResponse("Unauthorized", 401);
        const res = await reorderStatus(env, request);
        return jsonResponse(res);
      }

      // ====================
      // FALLBACK
      // ====================
      return new Response(
        JSON.stringify({ error: "Not Found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } catch (err: any) {
      return new Response(
        JSON.stringify({
          error: "Internal Server Error",
          message: err?.message,
        }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }
  }
};

// ====================
// Handlers
// ====================

async function getStatus(env: any) {
  const result = await env.DB.prepare(`
    SELECT id, section, title, description, position
    FROM status_items
    WHERE is_active = 1
    ORDER BY section, position
  `).all();

  const data: Record<string, any[]> = { building: [], learning: [] };

  for (const row of result.results) {
    if (row.section in data) {
      data[row.section].push(row);
    }
  }

  return data;
}

async function getLogs(env: any, request: Request) {
  const url = new URL(request.url);

  let limit = Number(url.searchParams.get("limit") ?? 10);

  // sanitize
  if (!Number.isFinite(limit) || limit <= 0) {
    limit = 10;
  }

  // hard cap (optional but recommended)
  limit = Math.min(limit, 10);

  const result = await env.DB.prepare(`
    SELECT id, type, message, created_at
    FROM logs
    ORDER BY created_at DESC
    LIMIT ?
  `)
    .bind(limit)
    .all();

  return result.results;
}


async function createLog(env: any, request: Request) {
  const body = await request.json();
  const { type, message } = body;

  if (!type || !message) {
    throw new Error("Missing fields");
  }

  await env.DB.prepare(
    `INSERT INTO logs (type, message) VALUES (?, ?)`
  )
    .bind(type, message)
    .run();

  return { success: true };
}

// -------- STATUS UPSERT (CREATE + PARTIAL UPDATE) --------

async function upsertStatus(env: any, request: Request) {
  const body = await request.json();
  const { id, section, title, description, position, is_active } = body;

  // validate section if provided
  if (section !== undefined && !VALID_SECTIONS.includes(section)) {
    throw new Error("Invalid section");
  }

  // -------- CREATE --------
  if (!id) {
    if (!section || !title) {
      throw new Error("Missing fields");
    }

    await env.DB.prepare(`
      INSERT INTO status_items (section, title, description, position, is_active)
      VALUES (?, ?, ?, ?, ?)
    `)
      .bind(
        section,
        title,
        description ?? "",
        position ?? 0,
        is_active ?? 1
      )
      .run();

    return { success: true };
  }

  // -------- UPDATE (partial allowed) --------
  const updates: string[] = [];
  const values: any[] = [];

  if (section !== undefined) {
    updates.push("section=?");
    values.push(section);
  }
  if (title !== undefined) {
    updates.push("title=?");
    values.push(title);
  }
  if (description !== undefined) {
    updates.push("description=?");
    values.push(description);
  }
  if (position !== undefined) {
    updates.push("position=?");
    values.push(position);
  }
  if (is_active !== undefined) {
    updates.push("is_active=?");
    values.push(is_active);
  }

  if (!updates.length) {
    throw new Error("No fields to update");
  }

  await env.DB.prepare(`
    UPDATE status_items
    SET ${updates.join(", ")}
    WHERE id=?
  `)
    .bind(...values, id)
    .run();

  return { success: true };
}

async function deleteStatus(env: any, id: number) {
  if (!id) throw new Error("Invalid ID");

  await env.DB.prepare(`
    UPDATE status_items SET is_active=0 WHERE id=?
  `)
    .bind(id)
    .run();

  return { success: true };
}

async function reorderStatus(env: any, request: Request) {
  const { section, ids } = await request.json();

  if (!section || !Array.isArray(ids)) {
    throw new Error("Invalid payload");
  }

  if (!VALID_SECTIONS.includes(section)) {
    throw new Error("Invalid section");
  }

  const stmt = env.DB.prepare(
    `UPDATE status_items SET position=? WHERE id=? AND section=?`
  );

  let pos = 0;
  for (const id of ids) {
    await stmt.bind(pos++, id, section).run();
  }

  return { success: true };
}