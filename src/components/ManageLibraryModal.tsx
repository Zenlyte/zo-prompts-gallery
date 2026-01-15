import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pen, Trash2, Check, X, Plus, Layers, Tag as TagIcon, Settings } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface ManageLibraryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void; // Callback to refresh parent state
}

interface SettingsData {
  categories: string[];
  tags: string[];
}

export function ManageLibraryModal({ open, onOpenChange, onUpdate }: ManageLibraryModalProps) {
  const [data, setData] = useState<SettingsData>({ categories: [], tags: [] });
  const [loading, setLoading] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [activeTab, setActiveTab] = useState("categories");

  // Load settings
  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error("Failed to load settings", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const handleAdd = async () => {
    if (!newItem.trim()) return;
    const type = activeTab; // "categories" or "tags"
    // Optimistic update
    const currentList = type === "categories" ? data.categories : data.tags;
    if (currentList.includes(newItem.trim())) {
      toast.error("Item already exists");
      return;
    }

    try {
      const res = await fetch(`/api/settings/${type}/add`, {
        method: "POST",
        body: JSON.stringify({ name: newItem.trim() }),
      });
      
      if (res.ok) {
        toast.success(`Added ${newItem}`);
        setNewItem("");
        loadSettings();
        onUpdate();
      }
    } catch (e) {
      toast.error("Failed to add item");
    }
  };

  const handleRename = async (oldName: string) => {
    if (!editValue.trim() || editValue === oldName) {
      setEditingItem(null);
      return;
    }
    const type = activeTab;
    
    // Initial toast
    const toastId = toast.loading(`Renaming ${oldName} to ${editValue}... this may take a moment`);

    try {
      const res = await fetch(`/api/settings/${type}/rename`, {
        method: "POST",
        body: JSON.stringify({ oldName, newName: editValue.trim() }),
      });

      if (res.ok) {
        toast.success("Rename successful", { id: toastId });
        setEditingItem(null);
        setEditValue("");
        loadSettings();
        onUpdate();
      } else {
        toast.error("Failed to rename", { id: toastId });
      }
    } catch (e) {
      toast.error("Error creating request", { id: toastId });
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will remove it from all prompts.`)) return;
    
    const type = activeTab;
    const toastId = toast.loading(`Deleting ${name}...`);

    try {
      const res = await fetch(`/api/settings/${type}/delete`, {
        method: "POST",
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        toast.success("Deleted successfully", { id: toastId });
        loadSettings();
        onUpdate();
      } else {
        toast.error("Failed to delete", { id: toastId });
      }
    } catch (e) {
      toast.error("Error creating request", { id: toastId });
    }
  };

  const renderList = (items: string[], type: "categories" | "tags") => (
    <div className="space-y-2 mt-4">
      {items.map((item) => (
        <div key={item} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 group transition-colors hover:border-slate-200 dark:hover:border-slate-700">
          {editingItem === item ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="h-8 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename(item);
                  if (e.key === "Escape") setEditingItem(null);
                }}
              />
              <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20" onClick={() => handleRename(item)}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-slate-600" onClick={() => setEditingItem(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                {type === "categories" ? (
                  <Badge variant="outline" className="font-normal text-sm bg-white dark:bg-slate-800">{item}</Badge>
                ) : (
                  <Badge variant="secondary" className="font-normal text-sm">{item}</Badge>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  onClick={() => {
                    setEditingItem(item);
                    setEditValue(item);
                  }}
                >
                  <Pen className="h-3.5 w-3.5" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => handleDelete(item)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </>
          )}
        </div>
      ))}
      {items.length === 0 && (
        <div className="text-center py-8 text-slate-400 text-sm">
          No {type} found. create one above.
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings className="h-5 w-5 text-slate-500" />
            Manage Library
          </DialogTitle>
          <DialogDescription>
            Edit or remove categories and tags. Changes will apply to all prompt files.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setEditingItem(null); setNewItem(""); }} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="categories" className="gap-2">
              <Layers className="h-4 w-4" /> Categories
            </TabsTrigger>
            <TabsTrigger value="tags" className="gap-2">
              <TagIcon className="h-4 w-4" /> Tags
            </TabsTrigger>
          </TabsList>

          {/* Add New Bar */}
          <div className="flex gap-2 mb-2">
            <Input 
              placeholder={`Create new ${activeTab === 'categories' ? 'category' : 'tag'}...`}
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={!newItem.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>

          <ScrollArea className="flex-1 pr-4 -mr-4">
            <TabsContent value="categories" className="mt-0">
              {renderList(data.categories, "categories")}
            </TabsContent>
            <TabsContent value="tags" className="mt-0">
              {renderList(data.tags, "tags")}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

