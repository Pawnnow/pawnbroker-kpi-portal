import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { getGroupLabel } from "@/lib/groupLabel";

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string | null;
    user_name: string | null;
    full_name: string | null;
    group: number | null;
    isAdmin: boolean;
  } | null;
  currentUserId: string | null;
  onSuccess: () => void;
}

const EditUserDialog = ({
  open,
  onOpenChange,
  user,
  currentUserId,
  onSuccess,
}: EditUserDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    user_name: "",
    full_name: "",
    member_number: "",
    email: "",
    group: "0",
    is_admin: false,
  });
  const { toast } = useToast();

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        user_name: user.user_name || "",
        full_name: user.full_name || "",
        member_number: (user as any).member_number || "",
        email: user.email || "",
        group: String(user.group ?? 0),
        is_admin: user.isAdmin,
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("No active session");
      }

      const response = await supabase.functions.invoke("admin-update-user", {
        body: {
          user_id: user.id,
          user_name: formData.user_name || null,
          full_name: formData.full_name || null,
          member_number: formData.member_number || null,
          email: formData.email || null,
          group: parseInt(formData.group, 10),
          is_admin: formData.is_admin,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: "User updated",
        description: `${formData.user_name || formData.email || "User"} has been updated successfully.`,
      });

      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast({
        title: "Error updating user",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isOwnAccount = user?.id === currentUserId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user details. Changes will take effect immediately.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="user_name">Username</Label>
              <Input
                id="user_name"
                value={formData.user_name}
                onChange={(e) =>
                  setFormData({ ...formData, user_name: e.target.value })
                }
                placeholder="Enter username"
              />
              <p className="text-xs text-muted-foreground">
                Letters, numbers, underscores, and hyphens only
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                placeholder="Enter full name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="member_number">Member Number</Label>
              <Input
                id="member_number"
                value={formData.member_number}
                onChange={(e) =>
                  setFormData({ ...formData, member_number: e.target.value })
                }
                placeholder="Enter member number"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Enter email"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="group">Group</Label>
              <Select
                value={formData.group}
                onValueChange={(value) =>
                  setFormData({ ...formData, group: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4, 5].map((g) => (
                    <SelectItem key={g} value={String(g)}>
                      {getGroupLabel(g)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="grid gap-1">
                <Label htmlFor="is_admin">Admin Status</Label>
                <p className="text-xs text-muted-foreground">
                  {isOwnAccount
                    ? "You cannot change your own admin status"
                    : "Grant or revoke admin privileges"}
                </p>
              </div>
              <Switch
                id="is_admin"
                checked={formData.is_admin}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_admin: checked })
                }
                disabled={isOwnAccount}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditUserDialog;
