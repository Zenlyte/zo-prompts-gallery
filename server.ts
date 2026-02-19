import { serveStatic } from "hono/bun";
import type { ViteDevServer } from "vite";
import { createServer as createViteServer } from "vite";
import config from "./zosite.json";
import { Hono } from "hono";
import { getRecentRegistrations, createRegistration } from "./backend-lib/db";
import matter from "gray-matter";

type Mode = "development" | "production";
const app = new Hono();

const mode: Mode =
  process.env.NODE_ENV === "production" ? "production" : "development";

/**
 * Add any API routes here.
 */
app.get("/api/hello-zo", (c) => c.json({ msg: "Hello from Zo" }));

app.get("/api/skills", async (c) => {
  const skillsDir = "/home/workspace/Skills";
  console.log("Scanning Skills directory:", skillsDir);
  
  try {
    const glob = new Bun.Glob("*.SKILL.md");
    const filenames = [];
    for await (const file of glob.scan({ cwd: skillsDir, onlyFiles: true })) {
      filenames.push(file);
    }
    
    console.log("Found filenames:", filenames.length);

    const promises = filenames.map(async (filename) => {
      const abs = `${skillsDir}/${filename}`;
      const file = Bun.file(abs);
      const content = await file.text();
      
      const { data } = matter(content);
      
      const title = data.title || filename.replace(".SKILL.md", "");
      const description = data.description || "";
      const tags = data.tags || [];
      const tool = data.tool || false;
      const category = data.category || "Uncategorized"; // New field

      // Auto-emoji logic (keep existing)
      const emojis = data.emojis || [];
      if (emojis.length === 0) {
        // ... existing emoji logic ...
        // Re-implement emoji logic here or extract it
         const t = [
          title.toLowerCase(),
          description.toLowerCase(),
          ...tags.map((x: string) => x.toLowerCase()),
        ];

        const add = (e: string) => {
          if (emojis.length < 3 && !emojis.includes(e)) emojis.push(e);
        };
        
        if (t.some((x) => ["write", "edit", "text", "blog"].includes(x))) add("📝");
        if (t.some((x) => ["code", "dev", "script", "function"].includes(x))) add("💻");
        if (t.some((x) => ["image", "photo", "picture", "draw"].includes(x))) add("🎨");
        if (t.some((x) => ["email", "message", "contact"].includes(x))) add("📧");
        if (t.some((x) => ["data", "csv", "json", "analyze"].includes(x))) add("📊");
        if (t.some((x) => ["web", "site", "html", "css"].includes(x))) add("🌐");
        if (t.some((x) => ["audio", "video", "media"].includes(x))) add("🎬");
        if (t.some((x) => ["chat", "conversation", "ai", "bot"].includes(x))) add("🤖");
        if (t.some((x) => ["research", "news"].includes(x))) add("🔎");
        if (t.some((x) => ["pdf", "docx", "pptx", "xlsx"].includes(x))) add("📄");
        if (t.some((x) => ["setup", "install", "config"].includes(x))) add("🛠️");
        if (t.some((x) => ["productivity", "planning"].includes(x))) add("🧠");
      }

      return {
        path: abs,
        filename,
        title,
        description,
        tags,
        category,
        emojis,
        tool,
      };
    });

    const skills = await Promise.all(promises);
    console.log("Processed skills:", skills.length);
    return c.json({ skills });
  } catch (err) {
    console.error("Error reading skills:", err);
    return c.json(
      { error: err instanceof Error ? err.message : "Failed to read skills" },
      500
    );
  }
});

app.post("/api/skills/update", async (c) => {
  try {
    const { path, tags, category, description, emojis } = await c.req.json();
    
    if (!path || !(await Bun.file(path).exists())) {
      return c.json({ error: "File not found" }, 404);
    }

    const file = Bun.file(path);
    const content = await file.text();
    const parsed = matter(content);

    // Update frontmatter
    if (tags) parsed.data.tags = tags;
    if (category) parsed.data.category = category;
    if (description) parsed.data.description = description;
    if (emojis) parsed.data.emojis = emojis;

    // Stringify back to file
    const newContent = matter.stringify(parsed.content, parsed.data);
    await Bun.write(path, newContent);

    return c.json({ success: true });
  } catch (err) {
     console.error("Error updating prompt:", err);
     return c.json({ error: "Failed to update prompt" }, 500);
  }
});

app.get("/api/skills/raw", async (c) => {
  const path = c.req.query("path") || "";
  if (!path.startsWith("/home/workspace/Skills/") || !path.endsWith(".SKILL.md")) {
    return c.json({ error: "Invalid path" }, 400);
  }
  try {
    const content = await Bun.file(path).text();
    const parsed = matter(content);
    return c.json({ raw: parsed.content });
  } catch (e) {
    return c.json({ error: (e as Error).message || "Failed to read file" }, 500);
  }
});

// Batch operations for global category/tag management
app.post("/api/skills/batch/preview", async (c) => {
  const body = await c.req.json();
  const { op, from, to, value } = body;

  const validOps = ["category_rename", "category_delete", "tag_rename", "tag_delete"];
  if (!op || !validOps.includes(op)) {
    return c.json({ error: "Invalid operation" }, 400);
  }

  // Validate required fields
  if ((op === "category_rename" || op === "tag_rename") && (!from || !to)) {
    return c.json({ error: "from and to are required for rename operations" }, 400);
  }
  if ((op === "category_delete" || op === "tag_delete") && !value) {
    return c.json({ error: "value is required for delete operations" }, 400);
  }

  const skillsDir = "/home/workspace/Skills";
  const norm = (s: string) => s.trim().toLowerCase();

  try {
    const glob = new Bun.Glob("*.SKILL.md");
    const filenames = [];
    for await (const file of glob.scan({ cwd: skillsDir, onlyFiles: true })) {
      filenames.push(file);
    }

    const changes: Array<{
      path: string;
      filename: string;
      before: Record<string, any>;
      after: Record<string, any>;
    }> = [];
    const matchedFiles: string[] = [];

    for (const filename of filenames) {
      const abs = `${skillsDir}/${filename}`;
      const file = Bun.file(abs);
      const content = await file.text();
      const parsed = matter(content);
      const before = { ...parsed.data };

      let willChange = false;
      const after = { ...parsed.data };

      switch (op) {
        case "category_rename":
          if (norm(before.category || "") === norm(from)) {
            after.category = to;
            willChange = true;
          }
          break;

        case "category_delete":
          if (norm(before.category || "") === norm(value)) {
            after.category = "Uncategorized";
            willChange = true;
          }
          break;

        case "tag_rename":
          if (before.tags && Array.isArray(before.tags)) {
            after.tags = before.tags.map((tag: string) =>
              norm(tag) === norm(from) ? to : tag
            );
            if (JSON.stringify(before.tags) !== JSON.stringify(after.tags)) {
              willChange = true;
            }
          }
          break;

        case "tag_delete":
          if (before.tags && Array.isArray(before.tags)) {
            after.tags = before.tags.filter(
              (tag: string) => norm(tag) !== norm(value)
            );
            if (JSON.stringify(before.tags) !== JSON.stringify(after.tags)) {
              willChange = true;
            }
          }
          break;
      }

      if (willChange) {
        changes.push({
          path: abs,
          filename,
          before: { category: before.category, tags: before.tags },
          after: { category: after.category, tags: after.tags },
        });
        matchedFiles.push(abs);
      }
    }

    // Check for target conflict (for rename operations)
    let targetExists = false;
    let conflictingPaths: string[] = [];

    if (op === "category_rename") {
      targetExists = changes.some((ch) => norm(ch.after.category || "") === norm(to));
      conflictingPaths = changes
        .filter((ch) => norm(ch.after.category || "") === norm(to) && norm(ch.before.category || "") !== norm(from))
        .map((ch) => ch.path);
    } else if (op === "tag_rename") {
      targetExists = changes.some((ch) =>
        ch.after.tags?.some((tag: string) => norm(tag) === norm(to)) &&
        !ch.before.tags?.some((tag: string) => norm(tag) === norm(from))
      );
      conflictingPaths = changes
        .filter((ch) =>
          ch.after.tags?.some((tag: string) => norm(tag) === norm(to)) &&
          !ch.before.tags?.some((tag: string) => norm(tag) === norm(from))
        )
        .map((ch) => ch.path);
    }

    return c.json({
      op,
      totalFiles: filenames.length,
      matchedFiles: matchedFiles.length,
      changes,
      targetExists,
      conflictingPaths: conflictingPaths.length > 0 ? conflictingPaths : undefined,
    });
  } catch (err) {
    console.error("Error in batch preview:", err);
    return c.json(
      { error: err instanceof Error ? err.message : "Failed to preview changes" },
      500
    );
  }
});

app.post("/api/skills/batch/apply", async (c) => {
  const body = await c.req.json();
  const { op, from, to, value } = body;

  const validOps = ["category_rename", "category_delete", "tag_rename", "tag_delete"];
  if (!op || !validOps.includes(op)) {
    return c.json({ error: "Invalid operation" }, 400);
  }

  const skillsDir = "/home/workspace/Skills";
  const norm = (s: string) => s.trim().toLowerCase();

  try {
    const glob = new Bun.Glob("*.SKILL.md");
    const filenames = [];
    for await (const file of glob.scan({ cwd: skillsDir, onlyFiles: true })) {
      filenames.push(file);
    }

    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const filename of filenames) {
      const abs = `${skillsDir}/${filename}`;
      try {
        const file = Bun.file(abs);
        const content = await file.text();
        const parsed = matter(content);

        let willChange = false;
        const newData = { ...parsed.data };

        switch (op) {
          case "category_rename":
            if (norm(parsed.data.category || "") === norm(from)) {
              newData.category = to;
              willChange = true;
            }
            break;

          case "category_delete":
            if (norm(parsed.data.category || "") === norm(value)) {
              newData.category = "Uncategorized";
              willChange = true;
            }
            break;

          case "tag_rename":
            if (parsed.data.tags && Array.isArray(parsed.data.tags)) {
              newData.tags = parsed.data.tags.map((tag: string) =>
                norm(tag) === norm(from) ? to : tag
              );
              if (JSON.stringify(parsed.data.tags) !== JSON.stringify(newData.tags)) {
                willChange = true;
              }
            }
            break;

          case "tag_delete":
            if (parsed.data.tags && Array.isArray(parsed.data.tags)) {
              newData.tags = parsed.data.tags.filter(
                (tag: string) => norm(tag) !== norm(value)
              );
              if (JSON.stringify(parsed.data.tags) !== JSON.stringify(newData.tags)) {
                willChange = true;
              }
            }
            break;
        }

        if (willChange) {
          const newContent = matter.stringify(parsed.content, newData);
          await Bun.write(abs, newContent);
          updated++;
        } else {
          skipped++;
        }
      } catch (err) {
        errors.push(`${filename}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return c.json({
      updated,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("Error in batch apply:", err);
    return c.json(
      { error: err instanceof Error ? err.message : "Failed to apply changes" },
      500
    );
  }
});

// Event registration endpoints (namespaced under _zo to avoid conflicts)
app.get("/api/_zo/demo/registrations", (c) => {
  const registrations = getRecentRegistrations();
  return c.json(registrations);
});

app.post("/api/_zo/demo/register", async (c) => {
  const body = await c.req.json();
  const { name, email, company, notes } = body;

  if (!name || !email) {
    return c.json({ error: "Name and email are required" }, 400);
  }

  const registration = createRegistration(name, email, company, notes);
  return c.json(registration, 201);
});

if (mode === "production") {
  configureProduction(app);
} else {
  await configureDevelopment(app);
}

/**
 * Determine port based on mode. In production, use the published_port if available.
 * In development, always use the local_port.
 * Ports are managed by the system and injected via the PORT environment variable.
 */
const port = process.env.PORT
  ? parseInt(process.env.PORT, 10)
  : mode === "production"
    ? (config.publish?.published_port ?? config.local_port)
    : config.local_port;

export default { fetch: app.fetch, port, idleTimeout: 255 };

/**
 * Configure routing for production builds.
 *
 * - Streams prebuilt assets from `dist`.
 * - Static files from `public/` are copied to `dist/` by Vite and served at root paths.
 * - Falls back to `index.html` for any other GET so the SPA router can resolve the request.
 */
function configureProduction(app: Hono) {
  app.use("/assets/*", serveStatic({ root: "./dist" }));
  app.get("/favicon.ico", (c) => c.redirect("/favicon.svg", 302));
  app.use(async (c, next) => {
    if (c.req.method !== "GET") return next();

    const path = c.req.path;
    if (path.startsWith("/api/") || path.startsWith("/assets/")) return next();

    const file = Bun.file(`./dist${path}`);
    if (await file.exists()) {
      const stat = await file.stat();
      if (stat && !stat.isDirectory()) {
        return new Response(file);
      }
    }

    return serveStatic({ path: "./dist/index.html" })(c, next);
  });
}

/**
 * Configure routing for development builds.
 *
 * - Boots Vite in middleware mode for transforms.
 * - Static files from `public/` are served at root paths (matching Vite convention).
 * - Mirrors production routing semantics so SPA routes behave consistently.
 */
async function configureDevelopment(app: Hono): Promise<ViteDevServer> {
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: "custom",
  });

  app.use("*", async (c, next) => {
    if (c.req.path.startsWith("/api/")) return next();
    if (c.req.path === "/favicon.ico") return c.redirect("/favicon.svg", 302);

    const url = c.req.path;
    try {
      if (url === "/" || url === "/index.html") {
        let template = await Bun.file("./index.html").text();
        template = await vite.transformIndexHtml(url, template);
        return c.html(template);
      }

      const publicFile = Bun.file(`./public${url}`);
      if (await publicFile.exists()) {
        const stat = await publicFile.stat();
        if (stat && !stat.isDirectory()) {
          return new Response(publicFile, {
            headers: { "Cache-Control": "no-cache" },
          });
        }
      }

      let result;
      try {
        result = await vite.transformRequest(url);
      } catch {
        result = null;
      }

      if (result) {
        return new Response(result.code, {
          headers: {
            "Content-Type": "application/javascript",
            "Cache-Control": "no-cache",
          },
        });
      }

      let template = await Bun.file("./index.html").text();
      template = await vite.transformIndexHtml("/", template);
      return c.html(template);
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      console.error(error);
      return c.text("Internal Server Error", 500);
    }
  });

  return vite;
}

function parsePromptFrontmatter(raw: string): {
  title?: string;
  description?: string;
  tags?: string[];
  emoji?: string | string[];
  tool?: boolean;
} {
  const fm = extractFrontmatter(raw);
  if (!fm) return {};

  const title = parseYamlScalarString(fm, "title");
  const tool = parseYamlBool(fm, "tool");
  const emoji = parseYamlEmoji(fm);
  const tags = parseYamlStringList(fm, "tags");
  const description = parseYamlMultilineString(fm, "description");

  return {
    title,
    description,
    tags,
    emoji,
    tool,
  };
}

function extractFrontmatter(raw: string): string | null {
  const s = raw.replace(/\r\n/g, "\n");
  if (!s.startsWith("---\n")) return null;
  const end = s.indexOf("\n---\n", 4);
  if (end === -1) return null;
  return s.slice(4, end + 1);
}

function parseYamlScalarString(fm: string, key: string): string | undefined {
  const re = new RegExp(`^${escapeRegExp(key)}:\\s*(.+?)\\s*$`, "m");
  const m = fm.match(re);
  if (!m) return undefined;
  return stripYamlQuotes(m[1]);
}

function parseYamlBool(fm: string, key: string): boolean | undefined {
  const v = parseYamlScalarString(fm, key);
  if (v === undefined) return undefined;
  if (v.toLowerCase() === "true") return true;
  if (v.toLowerCase() === "false") return false;
  return undefined;
}

function parseYamlStringList(fm: string, key: string): string[] | undefined {
  const reBlock = new RegExp(`^${escapeRegExp(key)}:\\s*\\n((?:\\s*-\\s*.*\\n?)*)`, "m");
  const m = fm.match(reBlock);
  if (!m) return undefined;
  const block = m[1] || "";
  const items = block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("-"))
    .map((l) => l.replace(/^ -\s*|^-\s*/, "").trim())
    .map(stripYamlQuotes)
    .filter(Boolean);
  return items;
}

function parseYamlMultilineString(fm: string, key: string): string | undefined {
  const re = new RegExp(`^${escapeRegExp(key)}:\\s*\\|\\s*\\n([\\s\\S]*?)(?=\\n^[A-Za-z0-9_-]+:|\\n?$)`, "m");
  const m = fm.match(re);
  if (!m) return undefined;
  const body = m[1] || "";
  return body
    .replace(/\n+$/, "")
    .split("\n")
    .map((l) => l.replace(/^\s{2}/, ""))
    .join("\n")
    .trim();
}

function parseYamlEmoji(fm: string): string | string[] | undefined {
  const scalar = parseYamlScalarString(fm, "emoji");
  if (scalar !== undefined) return scalar;

  const list = parseYamlStringList(fm, "emoji");
  if (list !== undefined) return list;

  return undefined;
}

function stripYamlQuotes(s: string): string {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
}

function titleFromFilename(filename: string): string {
  const base = filename.replace(/\\.prompt\\.md$/i, "");
  return base
    .split(/[-_]+/g)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function normalizeEmojis(frontmatter: { emoji?: string | string[] }): string[] {
  const anyEmoji = frontmatter.emoji;
  if (!anyEmoji) return [];
  if (Array.isArray(anyEmoji)) {
    return anyEmoji
      .map((e) => String(e || "").trim())
      .flatMap((e) => e.split(/\\s+/g))
      .map((e) => e.trim())
      .filter(Boolean)
      .slice(0, 3);
  }
  return String(anyEmoji)
    .trim()
    .split(/\\s+/g)
    .map((e) => e.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function fallbackEmojisFromTags(tags: string[]): string[] {
  const t = tags.map((x) => x.toLowerCase());
  const pick: string[] = [];

  const add = (e: string) => {
    if (pick.length >= 3) return;
    if (!pick.includes(e)) pick.push(e);
  };

  if (t.some((x) => ["email", "gmail"].includes(x))) add("✉️");
  if (t.some((x) => ["calendar", "schedule"].includes(x))) add("📅");
  if (t.some((x) => ["automation", "agent", "workflow"].includes(x))) add("🤖");
  if (t.some((x) => ["research", "news"].includes(x))) add("🔎");
  if (t.some((x) => ["pdf", "docx", "pptx", "xlsx"].includes(x))) add("📄");
  if (t.some((x) => ["image", "video"].includes(x))) add("🖼️");
  if (t.some((x) => ["setup", "install", "config"].includes(x))) add("🛠️");
  if (t.some((x) => ["productivity", "planning"].includes(x))) add("🧠");

  return pick;
}











