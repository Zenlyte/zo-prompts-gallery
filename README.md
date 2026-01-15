# Zo Prompts Gallery 🎨

A beautiful, searchable, and categorized gallery for your Zo saved prompts. Built as a reusable Zo Site template.

![Prompts Gallery Preview](public/images/gallery-preview.png)

## ✨ Features

- **🔍 Smart Search**: Filter prompts by title, description, or content
- **🏷️ Tag Filtering**: Filter by tags with OR logic (any selected tag matches)
- **📁 Categories**: Automatically categorize prompts into logical groups
- **🎨 Modern UI**: Beautiful dark-mode friendly design with shadcn/ui components
- **📱 Responsive**: Works great on desktop and mobile
- **✏️ Edit Prompts**: Quick access to edit prompt metadata inline
- **🎯 Quick View**: Pop-up modal to preview prompt content without leaving page
- **⚙️ Batch Management**: Global category and tag management across all prompts with bulk operations
- **🔀 Conflict Resolution**: Smart handling when renaming/moving items with existing names
- **👀 Live Preview**: Preview changes before applying batch operations

## 📦 Installation

### Option 1: Clone from GitHub (Recommended)

```bash
cd /home/workspace/Projects
git clone <your-repo-url> prompt-gallery
cd prompt-gallery
bun install
```

### Option 2: Copy to Existing Site

Copy these files to your existing Zo Site:

```
src/pages/demos/prompts-demo.tsx
src/components/ui/dialog.tsx
src/components/ui/popover.tsx
src/components/ui/command.tsx
src/components/ui/markdown-content.tsx
src/components/ui/alert.tsx
src/components/ui/scroll-area.tsx
src/components/ui/tabs.tsx
scripts/categorize-prompts.ts
server.ts (update your existing with prompts endpoints)
```

## 🚀 Setup

1. **Install Dependencies**:
```bash
bun add marked gray-matter
bunx --bun shadcn@latest add dialog popover command tabs scroll-area alert
```

2. **Update `zosite.json`**:
```json
{
  "env": {
    "VITE_ZO_SITE_DEMO_VARIANT": "prompts"
  }
}
```

3. **Run Categorization Script**:
```bash
bun scripts/categorize-prompts.ts
```

This will auto-categorize your existing prompts in `/home/workspace/Prompts` into logical groups.

4. **Start Site**:
Use the Zo UI to start your site, then visit the preview URL.

## 📁 How It Works

### Backend (`server.ts`)

The site includes API endpoints:

- **`GET /api/prompts`**: Scans `/home/workspace/Prompts` directory and returns all `.prompt.md` files with metadata (title, description, tags, category, emojis)
- **`POST /api/prompts/batch/preview`**: Preview bulk operations (rename/delete categories or tags) before applying
- **`POST /api/prompts/batch/apply`**: Apply bulk operations to all matching prompt files with conflict resolution

### Frontend (`src/pages/demos/prompts-demo.tsx`)

- Fetches all prompts from `/api/prompts` on load
- Provides search, tag filtering, and category filtering
- Shows a beautiful grid of prompt cards
- Click any card to open a modal with full content
- Edit mode allows updating category and description directly
- **Gear icon** (⚙️) in header opens management modal for batch operations
- Manage categories: rename, delete, or merge existing categories
- Manage tags: rename or delete existing tags
- Preview all changes before applying them
- Conflict resolution when target names already exist

## 🎨 Categories

The gallery organizes prompts into these default categories:

- **Productivity & Planning** - Task management, automation, organization
- **Writing & Content** - Blog posts, essay writing, creative writing
- **Data & Integrations** - CSV processing, API integrations, data work
- **Development** - Coding, debugging, code review
- **Media & Graphics** - Image generation, video creation, design
- **Communication** - Email, SMS, messaging
- **Research & Learning** - Topic research, summarization
- **System & Admin** - Site setup, configuration, maintenance

## 🏷️ Customization

### Adding New Categories

Edit `scripts/categorize-prompts.ts` to add or modify category mappings:

```typescript
const categories: Record<string, string> = {
  "your-keyword": "Your Category Name"
};
```

Then run the script again:
```bash
bun scripts/categorize-prompts.ts
```

### Styling

The site uses Tailwind CSS 4. You can customize colors in:
- `src/styles.css` - Global styles
- Component classes - Modify Tailwind utility classes directly

## 📄 Prompt File Format

Prompts should follow this frontmatter format:

```markdown
---
title: Your Prompt Title
description: A brief description
tags: ["tag1", "tag2"]
category: Your Category
tool: true (or false)
---

Your prompt content here...
```

## 🔧 Troubleshooting

### Prompts Not Showing

1. Check that prompts are in `/home/workspace/Prompts`
2. Ensure files end with `.prompt.md`
3. Check browser console for errors
4. Verify API is working: `curl http://localhost:YOUR_PORT/api/prompts`

### Tags Not Filtering Correctly

The gallery uses OR logic by default. If you want AND logic (must match ALL tags), edit the filter function in `src/pages/demos/prompts-demo.tsx`:

```typescript
// Change from:
const matchesTags = selectedTags.length === 0 || selectedTags.some((t) => prompt.tags.includes(t));

// To:
const matchesTags = selectedTags.length === 0 || selectedTags.every((t) => prompt.tags.includes(t));
```

## 🤝 Contributing

This is a community template! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Share your own customizations

## 📝 License

This template is open source and free to use for your personal Zo computer.

## 🌟 Credits

Built with:
- [Zo](https://zocomputer.com) - The AI Computer
- [Bun](https://bun.sh) - JavaScript runtime
- [Hono](https://honojs.dev) - Web framework
- [React](https://react.dev) - UI library
- [shadcn/ui](https://ui.shadcn.com) - Component library
- [Tailwind CSS](https://tailwindcss.com) - Styling

---

Made with ❤️ for the Zo Community


