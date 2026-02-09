import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Maximize2 } from "lucide-react";
import UserList from "./UserList";

const UserListExpanded = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <div className="relative">
        <div className="absolute right-2 top-2 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(true)}
            title="Expand user list"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
        <UserList />
      </div>

      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>User Management</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <UserList />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserListExpanded;
