import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Loader2, X, Pen, ChevronDown, Filter, Save, Tag, Layers, Plus, Settings, Trash2, RefreshCw } from "lucide-react";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster, toast } from "sonner";
import EmojiPicker from "emoji-picker-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Type definitions
interface Prompt {
  path: string;
  filename: string;
  title: string;
  description: string;
  tags: string[];
  category: string;
  emojis: string[];
  tool: boolean;
}

interface BatchPreviewResponse {
  op: string;
  totalFiles: number;
  matchedFiles: number;
  changes: Array<{
    path: string;
    filename: string;
    before: Record<string, any>;
    after: Record<string, any>;
  }>;
  targetExists: boolean;
  conflictingPaths?: string[];
}

export default function PromptsDemo() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [filteredPrompts, setFilteredPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [promptContent, setPromptContent] = useState("");
  const [contentLoading, setContentLoading] = useState(false);
  const [isTagsExpanded, setIsTagsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Management Modal State
  const [managementModalOpen, setManagementModalOpen] = useState(false);
  const [managementTab, setManagementTab] = useState<"categories" | "tags">("categories");
  const [previewData, setPreviewData] = useState<BatchPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [renameFrom, setRenameFrom] = useState("");
  const [renameTo, setRenameTo] = useState("");
  const [deleteValue, setDeleteValue] = useState("");
  // Type definitions for batch operations
  interface ConflictInfo {
    existingPrompt: Prompt;
    targetExists: boolean;
  }

  interface EditForm {
    mode: "edit" | "add";
    type: "category" | "tag";
    name?: string;
    description?: string;
    category?: string;
    tags?: string[];
    emojis?: string[];
  }


  // Conflict resolution state for batch operations
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);
  const [mergeAction, setMergeAction] = useState<"merge" | "different" | null>(null);
  const [mergeNewName, setMergeNewName] = useState("");

  // Form state for add/edit metadata
  const [showAddForm, setShowAddForm] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [newTagInput, setNewTagInput] = useState("");
  const [newCategoryInput, setNewCategoryInput] = useState("");
  // Emoji picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Load prompts from API
  useEffect(() => {
    async function loadPrompts() {
      try {
        const response = await fetch("/api/prompts");
        if (response.ok) {
          const data = await response.json();
          setPrompts(data.prompts);
          setFilteredPrompts(data.prompts);
          
          // Extract unique tags and categories
          const tags = new Set<string>();
          const cats = new Set<string>();
          data.prompts.forEach((p: Prompt) => {
            p.tags.forEach((t) => tags.add(t));
            if (p.category && p.category !== "Uncategorized") cats.add(p.category);
          });
          setAllTags(Array.from(tags).sort());
          setCategories(Array.from(cats).sort());
        }
      } catch (error) {
        console.error("Failed to load prompts:", error);
      } finally {
        setLoading(false);
      }
    }

    loadPrompts();
  }, []);

  // Search and filter prompts
  useEffect(() => {
    const filtered = prompts.filter((prompt) => {
      const matchesSearch =
        prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prompt.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some((t) => prompt.tags.includes(t));
        
      const matchesCategory = 
        selectedCategories.length === 0 || 
        selectedCategories.includes(prompt.category || "Uncategorized");

      return matchesSearch && matchesTags && matchesCategory;
    });
    setFilteredPrompts(filtered);
  }, [prompts, searchQuery, selectedTags, selectedCategories]);

  // Toggle tag selection
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
  };

  // Toggle category selection
  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat)
        ? prev.filter((c) => c !== cat)
        : [...prev, cat]
    );
  };

  // Load prompt content when selected
  const handlePromptSelect = async (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setEditForm({
      mode: "edit" as const,
      type: "category" as const,
      name: "",
      description: prompt.description,
      category: prompt.category || "Uncategorized",
      tags: [...prompt.tags],
    });
    setIsEditing(false);
    setContentLoading(true);
    setPromptContent("");
    
    // Lock body scroll
    document.body.style.overflow = 'hidden';

    try {
      const response = await fetch(`/api/prompts/raw?path=${encodeURIComponent(prompt.path)}`);
      if (response.ok) {
        const data = await response.json();
        setPromptContent(data.raw);
      }
    } catch (error) {
      console.error("Failed to load prompt content:", error);
      setPromptContent("Failed to load prompt content.");
    } finally {
      setContentLoading(false);
    }
  };

  // Save changes
  const handleSave = async () => {
    if (!selectedPrompt) return;
    try {
      const response = await fetch("/api/prompts/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: selectedPrompt.path,
          ...editForm,
          emojis: editForm?.emojis
        }),
      });
      if (response.ok) {
        // Refresh local state
        const updatedPrompts = prompts.map(p => 
          p.path === selectedPrompt.path ? { ...p, ...editForm } : p
        );
        setPrompts(updatedPrompts);
        setSelectedPrompt({ ...selectedPrompt, ...editForm });
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Failed to save prompt:", error);
    }
  };

  // Close dialog
  const closeDialog = () => {
    setSelectedPrompt(null);
    setPromptContent("");
    setIsEditing(false);
    // Unlock body scroll
    document.body.style.overflow = 'unset';
  };

  // Add new category
  const handleAddCategory = () => {
    if (newCategoryInput.trim() && !categories.includes(newCategoryInput.trim())) {
      const newCat = newCategoryInput.trim();
      setCategories(prev => [...prev, newCat].sort());
      setEditForm(prev => prev ? {...prev, category: newCat} : prev);
      setNewCategoryInput("");
      toast.success(`Category "${newCat}" created`);
    }
  };

  // Toggle tag in edit form
  const toggleEditTag = (tag: string) => {
    setEditForm(prev => {
      if (!prev || !prev.tags) return prev;
      return {
        ...prev,
        tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag]
      };
    });
  };

  // Add new tag
  const handleAddTag = () => {
    if (newTagInput.trim() && !(editForm?.tags ?? []).includes(newTagInput.trim())) {
      const newTag = newTagInput.trim();
      setEditForm(prev => {
        if (!prev || !prev.tags) return prev;
        return {
          ...prev,
          tags: [...prev.tags, newTag].sort()
        };
      });
      setNewTagInput("");
      toast.success(`Tag "${newTag}" added`);
    }
  };

  // Batch Operation Handlers
  const handleBatchPreview = async (op: string, params: Record<string, any>) => {
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const response = await fetch("/api/prompts/batch/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op, ...params }),
      });
      if (response.ok) {
        const data = await response.json();
        setPreviewData(data);
        if (data.targetExists) {
          setShowMergeDialog(true);
        }
      } else {
        toast.error("Failed to generate preview");
      }
    } catch (error) {
      console.error("Preview error:", error);
      toast.error("An error occurred during preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleBatchApply = async () => {
    if (!previewData) return;
    setApplyLoading(true);
    try {
      const response = await fetch("/api/prompts/batch/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          op: previewData.op,
          from: renameFrom,
          to: renameTo,
          value: deleteValue,
          merge: mergeAction === "merge"
        }),
      });
      if (response.ok) {
        toast.success(`Succesfully updated ${previewData.matchedFiles} files`);
        setManagementModalOpen(false);
        setPreviewData(null);
        setRenameFrom("");
        setRenameTo("");
        setDeleteValue("");
        // Refresh prompts
        window.location.reload();
      } else {
        toast.error("Failed to apply batch operation");
      }
    } catch (error) {
      console.error("Apply error:", error);
      toast.error("An error occurred while applying changes");
    } finally {
      setApplyLoading(false);
      setShowMergeDialog(false);
      setMergeAction(null);
    }
  };

  const handleRename = () => {
    const op = managementTab === "categories" ? "category_rename" : "tag_rename";
    handleBatchPreview(op, { from: renameFrom, to: renameTo });
  };

  const handleDelete = () => {
    const op = managementTab === "categories" ? "category_delete" : "tag_delete";
    handleBatchPreview(op, { value: deleteValue });
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-100 selection:text-blue-900 dark:selection:bg-blue-900 dark:selection:text-blue-100">
      <Toaster />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
                  Prompts Gallery
                </h1>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full h-10 w-10 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  onClick={() => setManagementModalOpen(true)}
                >
                  <Settings className="h-6 w-6" />
                </Button>
              </div>
              <p className="mt-2 text-lg text-slate-500 dark:text-slate-400">
                A beautiful mirror of your saved knowledge
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Search input */}
            <div className="relative group max-w-2xl">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors z-10" />
              <Input
                type="text"
                placeholder="Search by title, description, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-12 text-lg bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500/20 shadow-sm"
              />
            </div>

            {/* Categories as Badges */}
            {categories.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 py-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 h-full self-center mr-1">
                  <Layers className="h-3.5 w-3.5" />
                  Categories:
                </span>
                {categories.map((cat) => {
                  const isSelected = selectedCategories.includes(cat);
                  return (
                    <Badge
                      key={cat}
                      variant={isSelected ? "default" : "outline"}
                      className={`cursor-pointer px-3 py-1.5 text-sm transition-all border ${
                        isSelected 
                          ? "bg-indigo-600 hover:bg-indigo-700 border-indigo-600 shadow-md shadow-indigo-500/20" 
                          : "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 text-slate-600 dark:text-slate-300"
                      }`}
                      onClick={() => toggleCategory(cat)}
                    >
                      {cat}
                      {isSelected && <X className="ml-1.5 h-3 w-3" />}
                    </Badge>
                  );
                })}
                {selectedCategories.length > 0 && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setSelectedCategories([])}
                    className="h-6 px-2 text-xs text-slate-500 hover:text-indigo-600"
                  >
                    Clear categories
                  </Button>
                )}
              </div>
            )}

            {/* Tags filter */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 py-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 h-full self-center mr-1">
                  <Tag className="h-3.5 w-3.5" />
                  Tags:
                </span>
                <div className="flex flex-wrap gap-2 items-center">
                  {(isTagsExpanded ? allTags : allTags.slice(0, 15)).map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <Badge
                        key={tag}
                        variant={isSelected ? "default" : "outline"}
                        className={`cursor-pointer px-2.5 py-1 transition-all ${
                          isSelected 
                            ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 shadow-md shadow-blue-500/20" 
                            : "bg-slate-50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500"
                        }`}
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                        {isSelected && <X className="ml-1.5 h-3 w-3" />}
                      </Badge>
                    );
                  })}
                  
                  {allTags.length > 15 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs font-medium text-slate-500 hover:text-blue-600"
                      onClick={() => setIsTagsExpanded(!isTagsExpanded)}
                    >
                      {isTagsExpanded ? "Show less" : `+${allTags.length - 15} more`}
                    </Button>
                  )}

                  {(selectedTags.length > 0 || selectedCategories.length > 0) && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => {
                        setSelectedTags([]);
                        setSelectedCategories([]);
                      }}
                      className="h-6 px-2 text-xs text-red-500 hover:text-red-600"
                    >
                      Reset all
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            <div className="text-slate-500 font-medium">Scanning your library...</div>
          </div>
        ) : filteredPrompts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/50">
            <div className="text-2xl font-bold text-slate-400 dark:text-slate-600">
              No prompts match your criteria
            </div>
            <p className="mt-2 text-slate-500">Try adjusting your search or filters</p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setSelectedTags([]);
                setSelectedCategories([]);
              }}
              className="mt-6"
            >
              Clear all filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
            {filteredPrompts.map((prompt) => (
              <Card
                key={prompt.path}
                className="group relative cursor-pointer border-slate-200/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 dark:border-slate-800 dark:hover:border-blue-500/30 flex flex-col h-full"
                onClick={() => handlePromptSelect(prompt)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex -space-x-1.5">
                      {prompt.emojis.length > 0 ? (
                        prompt.emojis.map((emoji, idx) => (
                          <div 
                            key={idx} 
                            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl shadow-sm border-2 border-white dark:border-slate-900"
                          >
                            {emoji}
                          </div>
                        ))
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl shadow-sm border-2 border-white dark:border-slate-900">
                          📝
                        </div>
                      )}
                    </div>
                    {prompt.category && prompt.category !== "Uncategorized" && (
                      <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-none font-medium text-[10px] px-2">
                        {prompt.category}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg font-bold line-clamp-2 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {prompt.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <CardDescription className="line-clamp-3 mb-4 text-slate-500 dark:text-slate-400 text-sm">
                    {prompt.description || "No description provided."}
                  </CardDescription>
                  <div className="flex flex-wrap gap-1.5 mt-auto">
                    {prompt.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/50 px-1.5 py-0.5 rounded">
                        #{tag}
                      </span>
                    ))}
                    {prompt.tags.length > 3 && (
                      <span className="text-[10px] font-bold text-blue-500 px-1.5 py-0.5">+ {prompt.tags.length - 3}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Improved Glassmorphism Modal */}
        {selectedPrompt && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
            onClick={closeDialog}
          >
            {/* Backdrop with blur */}
            <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm transition-opacity" />
            
            {/* Modal Window */}
            <div
              className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white/90 dark:bg-slate-900/90 shadow-2xl ring-1 ring-slate-900/5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Bar - Fixed at top */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/50 dark:border-slate-800/50 shrink-0">
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 flex items-center justify-center text-3xl shadow-inner shrink-0 border border-slate-100 dark:border-slate-700">
                    {selectedPrompt.emojis[0] || "📝"}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold truncate text-slate-900 dark:text-slate-100 pr-4">
                      {selectedPrompt.title}
                    </h2>
                    <p className="text-xs text-slate-500 font-mono truncate">
                      {selectedPrompt.filename}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!isEditing ? (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-full gap-2 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => setIsEditing(true)}
                    >
                      <Pen className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                  ) : (
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="rounded-full gap-2 bg-green-600 hover:bg-green-700 text-white border-none shadow-lg shadow-green-600/20"
                      onClick={handleSave}
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeDialog}
                    className="rounded-full h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
                {/* Meta Panel */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50/80 dark:bg-slate-950/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
                  {/* Left Column: Description */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2 block flex items-center gap-2">
                        Description
                      </label>
                      {isEditing ? (
                        <div className="flex flex-col h-full gap-4">
                          <div className="flex-1 min-h-[400px]">
                            <label className="text-sm font-medium mb-1.5 block">Description</label>
                            <Textarea
                              value={(editForm?.description ?? "")}
                              onChange={(e) =>
                                setEditForm(prev => prev ? {...prev, description: e.target.value} : null)
                              }
                              className="h-full min-h-[400px] resize-none font-mono text-sm leading-relaxed"
                              placeholder="Enter a description..."
                            />
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm whitespace-pre-wrap">
                          {selectedPrompt.description || "No description available."}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Category & Tags */}
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2 block flex items-center gap-2">
                        Category
                      </label>
                      {isEditing ? (
                        <div className="space-y-3">
                          <Select
                            value={(editForm?.category ?? "")}
                            onValueChange={(val) => setEditForm(prev => prev ? {...prev, category: val} : null)}
                          >
                            <SelectTrigger className="w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent className="z-[9999]">
                              {categories.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                              {newCategoryInput && !categories.includes(newCategoryInput) && (
                                <SelectItem value={newCategoryInput}>{newCategoryInput}</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          
                          <div className="flex gap-2">
                            <Input 
                              placeholder="New category name..." 
                              value={newCategoryInput}
                              onChange={(e) => setNewCategoryInput(e.target.value)}
                              className="h-9 bg-white dark:bg-slate-900 text-sm"
                            />
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={handleAddCategory}
                              disabled={!newCategoryInput.trim()}
                              className="shrink-0"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-sm font-medium py-1 px-3 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                          {selectedPrompt.category || "Uncategorized"}
                        </Badge>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2 block flex items-center gap-2">
                        Tags
                      </label>
                      <div className="flex flex-col gap-3">
                        {isEditing ? (
                          <>
                            {/* Selected Tags */}
                            <div className="flex flex-wrap gap-2 mb-2">
                              {(editForm?.tags ?? []).map((tag) => (
                                <Badge key={tag} variant="secondary" className="px-2 py-1 gap-1 pr-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                  {tag}
                                  <button
                                    onClick={() => toggleEditTag(tag)}
                                    className="hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full p-0.5"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>

                            {/* Add New Tag */}
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder="Add new tag..."
                                value={newTagInput}
                                onChange={(e) => setNewTagInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddTag();
                                  }
                                }}
                                className="h-8 text-xs flex-1 bg-white dark:bg-slate-900"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleAddTag}
                                disabled={!newTagInput.trim()}
                                className="h-8 w-8 p-0"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* Available Tags Selection */}
                            <div className="mt-2">
                              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                                Add Existing Tags
                              </label>
                              <div className="flex flex-wrap gap-1.5 p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 max-h-32 overflow-y-auto custom-scrollbar">
                                {allTags.filter(t => !(editForm?.tags ?? []).includes(t)).map((tag) => (
                                  <Badge 
                                    key={tag} 
                                    variant="outline" 
                                    className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-2 py-0.5 text-[10px]"
                                    onClick={() => toggleEditTag(tag)}
                                  >
                                    + {tag}
                                  </Badge>
                                ))}
                                {allTags.filter(t => !(editForm?.tags ?? []).includes(t)).length === 0 && (
                                  <span className="text-xs text-slate-400 italic p-1">All tags selected</span>
                                )}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {selectedPrompt.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="px-2.5 py-1 rounded-lg bg-slate-200/50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-0 font-medium text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {selectedPrompt.tags.length === 0 && <span className="text-xs text-slate-400 italic">No tags</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>


              </div>
            </div>
          </div>
        )}
      </div>

      {/* Global Metadata Management Modal */}
      <Dialog open={managementModalOpen} onOpenChange={setManagementModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200 dark:border-slate-800">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-6 w-6 text-blue-500" />
              Manage Metadata
            </DialogTitle>
            <DialogDescription>
              Batch update or delete categories and tags across all your prompt files.
            </DialogDescription>
          </DialogHeader>

          <Tabs 
            value={managementTab} 
            onValueChange={(v) => setManagementTab(v as "categories" | "tags")}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="px-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="categories" className="gap-2">
                  <Layers className="h-4 w-4" />
                  Categories
                </TabsTrigger>
                <TabsTrigger value="tags" className="gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 custom-scrollbar">
              {/* Active Action UI (Rename/Delete Inputs) */}
              {(renameFrom || deleteValue) && (
                <div className="mb-6 p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                       {renameFrom ? (
                         <>
                           <Pen className="h-4 w-4" />
                           Rename {managementTab === "categories" ? "Category" : "Tag"}
                         </>
                       ) : (
                         <>
                           <Trash2 className="h-4 w-4" />
                           Delete {managementTab === "categories" ? "Category" : "Tag"}
                         </>
                       )}
                    </h4>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 rounded-full hover:bg-white dark:hover:bg-slate-800"
                      onClick={() => {
                        setRenameFrom("");
                        setRenameTo("");
                        setDeleteValue("");
                        setPreviewData(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {renameFrom ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">From</label>
                          <Input value={renameFrom} disabled className="h-9 bg-white/50 dark:bg-slate-900/50" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">To</label>
                          <Input 
                            value={renameTo} 
                            onChange={(e) => setRenameTo(e.target.value)}
                            className="h-9 bg-white dark:bg-slate-900" 
                            placeholder="New name..."
                          />
                        </div>
                      </div>
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                        disabled={previewLoading || !renameTo.trim() || renameTo === renameFrom}
                        onClick={handleRename}
                      >
                        {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Preview Changes"}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Alert className="bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30">
                        <AlertDescription className="text-red-700 dark:text-red-400 text-xs">
                          {managementTab === "categories" 
                            ? `Are you sure? All prompts in "${deleteValue}" will be moved to "Uncategorized".`
                            : `Are you sure? This tag will be removed from all affected prompts.`}
                        </AlertDescription>
                      </Alert>
                      <Button 
                        variant="destructive"
                        className="w-full"
                        disabled={previewLoading}
                        onClick={handleDelete}
                      >
                        {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Preview Deletion"}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Preview Results */}
              {previewData && (
                <div className="mb-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Preview Changes</h4>
                    <Badge variant="outline" className="text-xs font-mono">{previewData.matchedFiles} Files Affected</Badge>
                  </div>
                  
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-2 space-y-1 custom-scrollbar">
                    {previewData.changes.map((change, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <span className="text-xs font-mono truncate max-w-[200px]">{change.filename}</span>
                        <div className="flex items-center gap-2 text-[10px]">
                          {renameFrom ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400 line-through">{renameFrom}</span>
                              <ChevronDown className="h-3 w-3 -rotate-90 text-blue-500" />
                              <span className="text-blue-600 dark:text-blue-400 font-bold">{renameTo}</span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-red-500 h-5 px-1 font-bold">REMOVED</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {previewData.changes.length === 0 && (
                      <div className="text-center py-4 text-xs text-slate-400">No matching files found.</div>
                    )}
                  </div>

                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleBatchApply}
                    disabled={applyLoading || previewData.matchedFiles === 0}
                  >
                    {applyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply Changes Now"}
                  </Button>
                </div>
              )}

              <TabsContent value="categories" className="mt-0 space-y-4">
                <div className="grid gap-3">
                  {categories.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 italic bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                      No categories found
                    </div>
                  ) : (
                    categories.map((cat) => (
                      <div key={cat} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800 transition-colors group">
                        <span className="font-medium text-slate-700 dark:text-slate-200">{cat}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-blue-600"
                            onClick={() => {
                              setRenameFrom(cat);
                              setRenameTo(cat);
                              setPreviewData(null);
                            }}
                          >
                            <Pen className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-red-500"
                            onClick={() => {
                              setDeleteValue(cat);
                              setPreviewData(null);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="tags" className="mt-0 space-y-4">
                <div className="grid gap-3">
                  {allTags.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 italic bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                      No tags found
                    </div>
                  ) : (
                    allTags.map((tag) => (
                      <div key={tag} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800 transition-colors group">
                        <span className="font-medium text-slate-700 dark:text-slate-200">#{tag}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-blue-600"
                            onClick={() => {
                              setRenameFrom(tag);
                              setRenameTo(tag);
                              setPreviewData(null);
                            }}
                          >
                            <Pen className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-slate-400 hover:text-red-500"
                            onClick={() => {
                              setDeleteValue(tag);
                              setPreviewData(null);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
            <Button variant="outline" onClick={() => setManagementModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Confirmation Dialog */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-orange-500" />
              Items Merge Conflict
            </DialogTitle>
            <DialogDescription>
              A {managementTab === "categories" ? "category" : "tag"} named "<strong>{renameTo}</strong>" already exists. How would you like to proceed?
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Button 
              className="w-full justify-start h-auto p-4 gap-4 bg-slate-50 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-900/20 border border-slate-200 dark:border-slate-800 hover:border-blue-400"
              variant="ghost"
              onClick={() => {
                setMergeAction("merge");
                setShowMergeDialog(false);
              }}
            >
              <div className="flex flex-col items-start gap-1">
                <span className="font-bold text-slate-900 dark:text-slate-100">Merge into existing</span>
                <span className="text-xs text-slate-500">Combine all affected prompts into the existing "{renameTo}" item.</span>
              </div>
            </Button>
            <Button 
              className="w-full justify-start h-auto p-4 gap-4 bg-slate-50 hover:bg-orange-50 dark:bg-slate-800 dark:hover:bg-orange-900/20 border border-slate-200 dark:border-slate-800 hover:border-orange-400"
              variant="ghost"
              onClick={() => {
                setShowMergeDialog(false);
                setRenameTo("");
              }}
            >
              <div className="flex flex-col items-start gap-1">
                <span className="font-bold text-slate-900 dark:text-slate-100">Choose a different name</span>
                <span className="text-xs text-slate-500">Cancel this rename and enter a unique name instead.</span>
              </div>
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowMergeDialog(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}





























