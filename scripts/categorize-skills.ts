import { Glob } from "bun";
import matter from "gray-matter";

const SKILLS_DIR = "/home/workspace/Skills";

const CATEGORIES = {
  "Coding & Engineering": [
    "code", "git", "react", "component", "test", "setup", "install", "api", "database", "sql", "typescript", "python", "script", "terminal", "debug", "refactor", "build", "deploy", "vscode", "ssh", "docker", "mcp", "skill", "artifact", "theme", "webapp", "algorithmic", "pdf", "docx", "pptx", "xlsx"
  ],
  "Content & Writing": [
    "blog", "write", "essay", "article", "summary", "summarize", "video", "youtube", "script", "newsletter", "digest", "email", "post", "social", "media", "content", "copy", "draft", "edit", "proofread", "translate", "transcribe", "recipe", "book", "slide"
  ],
  "Productivity & Planning": [
    "plan", "daily", "weekly", "review", "task", "todo", "calendar", "schedule", "meeting", "agenda", "goal", "habit", "journal", "note", "organize", "workspace", "workflow", "process", "backlog", "inbox", "gtd", "focus", "time", "management", "affirmation"
  ],
  "Data & Integrations": [
    "csv", "excel", "sheet", "data", "analyze", "enrich", "scrape", "extract", "convert", "transform", "api", "integration", "linear", "notion", "google", "drive", "gmail", "calendar", "slack", "discord", "spotify", "dropbox", "onedrive", "airtable", "stripe", "mem", "bika"
  ],
  "Utilities & Tools": [
    "tool", "helper", "generator", "create", "make", "format", "convert", "optimize", "check", "validate", "verify", "system", "config", "settings", "backup", "restore", "clean", "fix", "repair", "help", "guide", "tutorial", "learn", "mistake", "qr"
  ]
};

async function categorizeSkills() {
  const glob = new Glob("*.prompt.md");
  let updatedCount = 0;

  for await (const file of glob.scan({ cwd: SKILLS_DIR })) {
    const filePath = `${SKILLS_DIR}/${file}`;
    const fileContent = await Bun.file(filePath).text();
    const { data, content } = matter(fileContent);

    // Skip if already categorized (unless we want to force re-categorize, let's skip "Uncategorized" though)
    if (data.category && data.category !== "Uncategorized") {
      console.log(`Skipping ${file} - already has category: ${data.category}`);
      continue;
    }

    const textToAnalyze = `${file} ${data.title || ""} ${data.description || ""} ${(data.tags || []).join(" ")}`.toLowerCase();
    let bestCategory = "Uncategorized";
    let maxMatches = 0;

    for (const [category, keywords] of Object.entries(CATEGORIES)) {
      let matches = 0;
      for (const keyword of keywords) {
        if (textToAnalyze.includes(keyword)) {
          matches++;
        }
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        bestCategory = category;
      }
    }

    // Default to Utilities if no matches but it's a prompt
    if (bestCategory === "Uncategorized" && maxMatches === 0) {
       bestCategory = "Utilities & Tools";
    }

    data.category = bestCategory;
    
    // Update the file
    const newContent = matter.stringify(content, data);
    await Bun.write(filePath, newContent);
    console.log(`Updated ${file} -> ${bestCategory}`);
    updatedCount++;
  }

  console.log(`\nDone! Updated ${updatedCount} skills.`);
}

categorizeSkills();

