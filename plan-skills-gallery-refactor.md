# Plan: Skills Gallery Refactor

**Goal:** Transform the buggy skills-gallery component into a clean, working Skills Gallery that displays SKILL.md files from the Skills directory with metadata editing capabilities.

**Why refactor instead of fix:**
- Current `skills-gallery.tsx` has 1190 lines with multiple syntax errors
- Multiple failed edit attempts have created broken JSX structure
- Simpler to rebuild with correct architecture than debug existing code
- Target: ~400-500 lines (60% reduction)

---

## Phase 1: Backend API Routes (zo.space)

**Affected Files:**
- Create: `/api/skills` (GET) - List all skills
- Create: `/api/subdirectories` (GET) - List subdirectories
- Create: `/api/skills/update` (POST) - Update skill metadata

**Changes:**

### `/api/skills` Route
```typescript
import matter from 'gray-matter';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

export default async (c) => {
  const skillsDir = '/home/workspace/Skills';
  const skills = [];
  
  function scanDirectory(dir, basePath = '') {
    const entries = readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = join(dir, entry.name, 'SKILL.md');
        try {
          const content = readFileSync(skillPath, 'utf-8');
          const { data, content: body } = matter(content);
          
          skills.push({
            path: skillPath,
            name: data.name || entry.name,
            description: data.description || '',
            emojis: data.emojis || [],
            category: data.category || 'Uncategorized',
            tags: data.tags || [],
            metadata: data.metadata || {},
            subdirectory: basePath || 'Root'
          });
        } catch (e) {
          // Skip if SKILL.md doesn't exist
        }
        
        // Recursively scan subdirectories
        scanDirectory(join(dir, entry.name), entry.name);
      }
    }
  }
  
  scanDirectory(skillsDir);
  return c.json({ skills });
}
```

### `/api/subdirectories` Route
```typescript
export default async (c) => {
  const skillsDir = '/home/workspace/Skills';
  const subdirs = [];
  
  function scanForSubdirs(dir, basePath = '') {
    const entries = readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subdirectoryName = basePath ? `${basePath}/${entry.name}` : entry.name;
        subdirs.push({
          name: entry.name,
          path: subdirectoryName,
          fullPath: join(dir, entry.name)
        });
        scanForSubdirs(join(dir, entry.name), subdirectoryName);
      }
    }
  }
  
  scanForSubdirs(skillsDir);
  return c.json({ subdirectories: subdirs });
}
```

### `/api/skills/update` Route
```typescript
import matter from 'gray-matter';
import { writeFileSync, readFileSync } from 'fs';

export default async (c) => {
  const { path, updates } = await c.req.json();
  
  try {
    const existing = readFileSync(path, 'utf-8');
    const { data, content } = matter(existing);
    
    const updated = {
      ...data,
      ...updates
    };
    
    const newContent = matter.stringify(content, updated);
    writeFileSync(path, newContent);
    
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
}
```

**Testing:**
- Test each endpoint with curl
- Verify file read/write works
- Check frontmatter parsing

---

## Phase 2: Skills Gallery Component

**Affected Files:**
- Create: `src/pages/skills-gallery.tsx` (new file)
- Delete: `src/pages/demos/skills-gallery.tsx` (broken file)

**Component Structure:**

```tsx
export default function SkillsGallery() {
  const [skills, setSkills] = useState([]);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [subdirectories, setSubdirectories] = useState([]);
  const [selectedSubdirectory, setSelectedSubdirectory] = useState('all');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);

  // Fetch skills and subdirectories on mount
  // Filter skills by subdirectory
  // Display grid of skill cards
  // Show modal with skill details
  // Provide edit functionality

  return (
    <div>
      {/* Header with subdirectory filter */}
      {/* Skills grid */}
      {/* Skill detail modal */}
      {/* Edit form (inline in modal) */}
    </div>
  );
}
```

**Features:**
1. **Grid View**: Display skills as cards with emojis + name + description
2. **Subdirectory Filter**: Dropdown or tabs to filter by subdirectory
3. **Quick View Modal**: Click card to see full metadata and README content
4. **Edit Mode**: Button to switch modal to edit mode
   - Edit fields: name, description, category, tags, emojis (max 3)
   - Save/Cancel buttons
   - Auto-update frontmatter on save

**State Management:**
- Simple useState hooks (no Redux/Context needed)
- Load data on mount with useEffect
- Optimistic UI updates for better UX

**Testing:**
- Verify skills load correctly
- Test subdirectory filtering
- Test edit and save functionality
- Verify error handling

---

## Phase 3: Integration & Cleanup

**Affected Files:**
- Update: `src/App.tsx` (change route from `/demos/prompts` to `/skills`)
- Update: `server.ts` (remove old `/api/skills` endpoints if not needed)
- Delete: `src/pages/demos/` directory (cleanup)

**Changes:**
1. Route the skills gallery as the main page:
   ```tsx
   // In App.tsx
   <Route path="/" element={<SkillsGallery />} />
   <Route path="/skills" element={<SkillsGallery />} />
   ```

2. Remove broken prompts code:
   - Delete `src/pages/demos/skills-gallery.tsx`
   - Remove unused imports from App.tsx

3. Test the complete flow:
   - Navigate to `/` or `/skills`
   - Verify skills display
   - Test all interactive features
   - Check for console errors

**Testing:**
- Full user flow test
- Verify no broken imports
- Check that old code is fully removed
- Test on both desktop and mobile viewports

---

## Task Checklist

### Phase 1: Backend API Routes
- [ ] Create `/api/skills` GET route on zo.space
- [ ] Create `/api/subdirectories` GET route on zo.space  
- [ ] Create `/api/skills/update` POST route on zo.space
- [ ] Test all API endpoints with curl
- [ ] Verify gray-matter parsing works correctly
- [ ] Test file read/write operations

### Phase 2: Skills Gallery Component
- [ ] Create `src/pages/skills-gallery.tsx`
- [ ] Implement skills grid display
- [ ] Add subdirectory filter UI
- [ ] Create skill detail modal
- [ ] Implement edit mode in modal
- [ ] Add emoji picker (max 3 emojis)
- [ ] Implement save/cancel functionality
- [ ] Add error handling and loading states

### Phase 3: Integration & Cleanup
- [ ] Update App.tsx routing
- [ ] Remove old skills-gallery.tsx
- [ ] Clean up unused imports
- [ ] Remove old `/api/skills` endpoints from server.ts
- [ ] Test complete user flow
- [ ] Verify no console errors
- [ ] Test responsive design

---

## Open Questions

None - the design is complete and ready for implementation.

---

## Success Criteria

- Skills Gallery loads and displays all SKILL.md files
- Subdirectory filtering works correctly
- Users can view skill details in modal
- Edit functionality updates frontmatter correctly
- Code is clean, simple, and maintainable (~400-500 lines)
- No TypeScript or runtime errors
- Responsive design works on mobile
