import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FolderOpen, Upload, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FILE_CATEGORIES } from "@/lib/fileCategories";

const SharedFileManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  const { data: files, isLoading } = useQuery({
    queryKey: ["admin-shared-files"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shared_files")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const catConfig = selectedCategory ? FILE_CATEGORIES[selectedCategory] : null;
  const hasSubcategories = catConfig && catConfig.subcategories.length > 0;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedCategory) {
      toast({ title: "Select a category", description: "Please choose a category before uploading.", variant: "destructive" });
      return;
    }
    if (hasSubcategories && !selectedSubcategory) {
      toast({ title: "Select a subcategory", description: "Please choose a subcategory before uploading.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const subPath = selectedSubcategory || "";
      const storagePath = subPath
        ? `${selectedCategory}/${subPath}/${file.name}`
        : `${selectedCategory}/${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("shared-files")
        .upload(storagePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from("shared_files")
        .insert({
          category: selectedCategory,
          subcategory: selectedSubcategory || null,
          filename: file.name,
          storage_path: storagePath,
          uploaded_by: user.id,
        });
      if (insertError) throw insertError;

      toast({ title: "File uploaded", description: `${file.name} uploaded successfully.` });
      queryClient.invalidateQueries({ queryKey: ["admin-shared-files"] });
      queryClient.invalidateQueries({ queryKey: ["shared-files"] });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (fileId: string, storagePath: string) => {
    try {
      await supabase.storage.from("shared-files").remove([storagePath]);
      const { error } = await supabase.from("shared_files").delete().eq("id", fileId);
      if (error) throw error;
      toast({ title: "File deleted" });
      queryClient.invalidateQueries({ queryKey: ["admin-shared-files"] });
      queryClient.invalidateQueries({ queryKey: ["shared-files"] });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FolderOpen className="w-5 h-5" />
          Shared File Manager
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <Label className="mb-2 block">Category</Label>
            <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); setSelectedSubcategory(""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border z-50">
                {Object.entries(FILE_CATEGORIES).map(([key, cat]) => (
                  <SelectItem key={key} value={key}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasSubcategories && (
            <div>
              <Label className="mb-2 block">Subcategory</Label>
              <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subcategory..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {catConfig!.subcategories.map((sub) => (
                    <SelectItem key={sub} value={sub.toLowerCase()}>{sub}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || !selectedCategory || (hasSubcategories && !selectedSubcategory)}
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? "Uploading..." : "Upload File"}
            </Button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
          </div>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground text-sm py-4">Loading files...</p>
        ) : !files || files.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4">No shared files yet.</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filename</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Subcategory</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="font-medium">{file.filename}</TableCell>
                    <TableCell className="capitalize">{file.category}</TableCell>
                    <TableCell className="capitalize">{file.subcategory || "—"}</TableCell>
                    <TableCell>{new Date(file.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete File?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Delete "{file.filename}"? This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(file.id, file.storage_path)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SharedFileManager;
