#!/bin/bash
# Update all references from Prompts to Skills

# Update server.ts
sed -i 's|/home/workspace/Prompts|/home/workspace/Skills|g' server.ts
sed -i 's|promptsDir|skillsDir|g' server.ts
sed -i 's|prompts directory|skills directory|g' server.ts
sed -i 's|prompts:|skills:|g' server.ts
sed -i 's|"prompts"|"skills"|g' server.ts
sed -i 's|/api/prompts|/api/skills|g' server.ts
sed -i 's|prompt\.md|SKILL.md|g' server.ts
sed -i 's|\.prompt\.md|.SKILL.md|g' server.ts

# Update README.md
sed -i 's|Prompts Gallery|Skills Gallery|g' README.md
sed -i 's|prompts-gallery|skills-gallery|g' README.md
sed -i 's|/home/workspace/Prompts|/home/workspace/Skills|g' README.md
sed -i 's|prompts-demo|skills-gallery|g' README.md
sed -i 's|\.prompt\.md|SKILL.md|g' README.md
sed -i 's|prompt\.md|SKILL.md|g' README.md
sed -i 's|prompts directory|Skills directory|g' README.md
sed -i 's|saved prompts|saved skills|g' README.md
sed -i 's|prompts|skills|g' README.md
sed -i 's|Prompts|Skills|g' README.md

# Update SHARE-PACKAGE.md
sed -i 's|Prompts Gallery|Skills Gallery|g' SHARE-PACKAGE.md
sed -i 's|prompts-gallery|skills-gallery|g' SHARE-PACKAGE.md
sed -i 's|/home/workspace/Prompts|/home/workspace/Skills|g' SHARE-PACKAGE.md

# Update categorize script
mv scripts/categorize-prompts.ts scripts/categorize-skills.ts
sed -i 's|PROMPTS_DIR|SKILLS_DIR|g' scripts/categorize-skills.ts
sed -i 's|/home/workspace/Prompts|/home/workspace/Skills|g' scripts/categorize-skills.ts
sed -i 's|categorizePrompts|categorizeSkills|g' scripts/categorize-skills.ts
sed -i 's|prompts\.|skills.|g' scripts/categorize-skills.ts
sed -i 's|prompts directory|Skills directory|g' scripts/categorize-skills.ts

# Update app-sidebar.tsx
sed -i 's|title: "Prompts"|title: "Skills"|g' src/components/app-sidebar.tsx

# Update ManageLibraryModal.tsx
sed -i 's|prompts|skills|g' src/components/ManageLibraryModal.tsx
sed -i 's|Prompts|Skills|g' src/components/ManageLibraryModal.tsx

# Delete old prompts-demo.tsx (replaced by prompts-gallery.tsx)
rm -f src/pages/demos/prompts-demo.tsx

# Update plan documents
sed -i 's|/home/workspace/Prompts|/home/workspace/Skills|g' plan-*.md

# Update IMPLEMENTATION_SUMMARY.md
sed -i 's|Prompts Gallery|Skills Gallery|g' IMPLEMENTATION_SUMMARY.md
sed -i 's|/home/workspace/Prompts|/home/workspace/Skills|g' IMPLEMENTATION_SUMMARY.md

echo "✅ All references updated from Prompts to Skills"
