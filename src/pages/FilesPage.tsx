import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { FILE_CATEGORIES } from "@/lib/fileCategories";
import FilesDropdown from "@/components/FilesDropdown";
import { useUserRole } from "@/hooks/useUserRole";
import { LogOut, Shield } from "lucide-react";

const FilesPage = () => {
  const { category, subcategory } = useParams<{ category: string; subcategory?: string }>();
  const navigate = useNavigate();
  const { data: roleData } = useUserRole();

  const catConfig = category ? FILE_CATEGORIES[category] : null;
  const subLabel = subcategory
    ? catConfig?.subcategories.find((s) => s.toLowerCase() === subcategory) || subcategory
    : null;

  const { data: files, isLoading } = useQuery({
    queryKey: ["shared-files", category, subcategory],
    queryFn: async () => {
      let query = supabase
        .from("shared_files")
        .select("*")
        .eq("category", category!)
        .order("created_at", { ascending: false });

      if (subcategory) {
        query = query.eq("subcategory", subcategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!category,
  });

  const getDownloadUrl = (storagePath: string) => {
    const { data } = supabase.storage.from("shared-files").getPublicUrl(storagePath);
    return data.publicUrl;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Files</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/kpi-upload")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Upload Portal
            </Button>
            <FilesDropdown />
            {roleData?.isAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
                <Shield className="w-4 h-4 mr-2" />
                Admin
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink className="cursor-pointer" onClick={() => navigate("/kpi-upload")}>
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {subLabel ? (
                <BreadcrumbLink className="cursor-pointer" onClick={() => navigate(`/files/${category}`)}>
                  {catConfig?.label || category}
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{catConfig?.label || category}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {subLabel && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{subLabel}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>

        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">
            {catConfig?.label || category}
            {subLabel && ` — ${subLabel}`}
          </h2>

          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Loading files...</p>
          ) : !files || files.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No files available in this category.</p>
          ) : (
            <div className="space-y-3">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 rounded-md border border-border bg-secondary/30"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">{file.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(file.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={getDownloadUrl(file.storage_path)} target="_blank" rel="noopener noreferrer" download>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default FilesPage;
