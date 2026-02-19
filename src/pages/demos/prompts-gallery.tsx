import React, { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Search, Loader2, X, Settings } from "lucide-react";
import { Input } from "../../../components/ui/input";
import { Separator } from "../../../components/ui/separator";
import { Toaster, toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";

interface Skill {
  path: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  emojis: string[];
}

export default function SkillsGallery() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [filteredSkills, setFilteredSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [skillContent, setSkillContent] = useState("");
  const [contentLoading, setContentLoading] = useState(false);

  // Load skills on mount
  useEffect(() => {
    loadSkills();
  }, []);

  // Filter skills when search, category, or tags change
  useEffect(() => {
    filterSkills();
  }, [searchQuery, selectedCategory, selectedTags, skills]);

  const loadSkills = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/skills");
      if (response.ok) {
        const data = await response.json();
        setSkills(data.skills);
        setCategories(data.categories);
        setAllTags(data.tags);
      } else {
        toast.error("Failed to load skills");
      }
    } catch (error) {
      console.error("Error loading skills:", error);
      toast.error("Error loading skills");
    } finally {
      setLoading(false);
    }
  };

  const filterSkills = () => {
    let filtered = skills;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (skill) =>
          skill.name.toLowerCase().includes(query) ||
          skill.description.toLowerCase().includes(query) ||
          skill.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((skill) => skill.category === selectedCategory);
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter((skill) =>
        selectedTags.every((tag) => skill.tags.includes(tag))
      );
    }

    setFilteredSkills(filtered);
  };

  const handleSelectSkill = async (skill: Skill) => {
    setSelectedSkill(skill);
    setContentLoading(true);
    try {
      const response = await fetch(`/api/skills/${encodeURIComponent(skill.path)}`);
      if (response.ok) {
        const data = await response.json();
        setSkillContent(data.content);
      } else {
        toast.error("Failed to load skill content");
      }
    } catch (error) {
      console.error("Error loading skill content:", error);
      toast.error("Error loading skill content");
    } finally {
      setContentLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <Toaster />
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Skills Gallery
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Browse and discover available skills and tools
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <Input
              placeholder="Search skills by name, description, or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 py-6 text-base"
            />
          </div>
        </div>

        {/* Filters */}
        {categories.length > 0 && (
          <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold mb-3 text-slate-700 dark:text-slate-300">
              Categories
            </h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                All
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Skills Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : filteredSkills.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              No skills found matching your criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSkills.map((skill) => (
              <Card
                key={skill.path}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleSelectSkill(skill)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{skill.name}</CardTitle>
                      <CardDescription className="mt-2">
                        {skill.description}
                      </CardDescription>
                    </div>
                    {skill.emojis.length > 0 && (
                      <div className="text-2xl ml-2 flex gap-1">
                        {skill.emojis.map((emoji, idx) => (
                          <span key={idx}>{emoji}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        Category
                      </p>
                      <Badge variant="secondary">{skill.category}</Badge>
                    </div>
                    {skill.tags.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Tags
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {skill.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Skill Detail Modal */}
      <Dialog open={!!selectedSkill} onOpenChange={(open) => !open && setSelectedSkill(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-2xl">{selectedSkill?.name}</DialogTitle>
                <DialogDescription className="mt-2">
                  {selectedSkill?.description}
                </DialogDescription>
              </div>
              {selectedSkill?.emojis.length ? (
                <div className="text-3xl flex gap-2">
                  {selectedSkill.emojis.map((emoji, idx) => (
                    <span key={idx}>{emoji}</span>
                  ))}
                </div>
              ) : null}
            </div>
          </DialogHeader>

          <Separator />

          <div className="space-y-4">
            {selectedSkill && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                    Category
                  </p>
                  <Badge className="mt-1">{selectedSkill.category}</Badge>
                </div>
                {selectedSkill.tags.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                      Tags
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedSkill.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <Separator />

            {contentLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="prose dark:prose-invert max-w-none">
                <pre className="bg-slate-100 dark:bg-slate-900 p-4 rounded overflow-x-auto text-sm">
                  {skillContent}
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
