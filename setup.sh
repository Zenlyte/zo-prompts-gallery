#!/bin/bash
# Zo Prompts Gallery - Quick Setup Script
# Run this after cloning the repository to set up dependencies

set -e

echo "🎨 Setting up Zo Prompts Gallery..."

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
bun add marked gray-matter

# Step 2: Install shadcn components
echo "🧩 Installing shadcn/ui components..."
bunx --bun shadcn@latest add dialog popover command

# Step 3: Create required directories
echo "📁 Creating directories..."
mkdir -p scripts

# Step 4: Run categorization script
echo "🏷️  Categorizing existing prompts..."
if [ -f "scripts/categorize-prompts.ts" ]; then
    bun scripts/categorize-prompts.ts
else
    echo "⚠️  No categorization script found. You'll need to categorize prompts manually."
fi

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Use Zo UI to start the site"
echo "2. Visit the preview URL"
echo "3. Your prompts will automatically appear in the gallery"

