import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FolderOpen } from "lucide-react";
import { FILE_CATEGORIES } from "@/lib/fileCategories";

const FilesDropdown = () => {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <FolderOpen className="w-4 h-4 mr-2" />
          Files
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover border-border z-50">
        {Object.entries(FILE_CATEGORIES).map(([key, cat]) =>
          cat.subcategories.length > 0 ? (
            <DropdownMenuSub key={key}>
              <DropdownMenuSubTrigger>{cat.label}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="bg-popover border-border z-50">
                {cat.subcategories.map((sub) => (
                  <DropdownMenuItem
                    key={sub}
                    onClick={() => navigate(`/files/${key}/${sub.toLowerCase()}`)}
                  >
                    {sub}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ) : (
            <DropdownMenuItem key={key} onClick={() => navigate(`/files/${key}`)}>
              {cat.label}
            </DropdownMenuItem>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default FilesDropdown;
