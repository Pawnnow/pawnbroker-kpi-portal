import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Plus, Pencil, Power } from "lucide-react";

interface Profile {
  id: string;
  email: string | null;
  user_name: string | null;
}

interface Location {
  id: string;
  user_id: string;
  store_code: string;
  store_name: string;
  is_active: boolean;
  created_at: string;
}

const LocationManager = () => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Add form
  const [storeCode, setStoreCode] = useState("");
  const [storeName, setStoreName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (selectedUserId) fetchLocations();
    else setLocations([]);
  }, [selectedUserId]);

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, email, user_name")
      .order("email");
    if (data) setProfiles(data);
  };

  const fetchLocations = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .eq("user_id", selectedUserId)
      .order("store_code");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setLocations((data || []) as Location[]);
    }
    setIsLoading(false);
  };

  const handleAdd = async () => {
    if (!storeCode.trim() || !storeName.trim() || !selectedUserId) return;
    setIsAdding(true);
    const { error } = await supabase.from("locations").insert({
      user_id: selectedUserId,
      store_code: storeCode.trim(),
      store_name: storeName.trim(),
    });
    if (error) {
      toast({
        title: "Error adding location",
        description: error.message.includes("duplicate")
          ? "This store code already exists. Store codes must be unique."
          : error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Location added", description: `${storeCode.trim()} - ${storeName.trim()}` });
      setStoreCode("");
      setStoreName("");
      fetchLocations();
    }
    setIsAdding(false);
  };

  const handleToggleActive = async (loc: Location) => {
    const { error } = await supabase
      .from("locations")
      .update({ is_active: !loc.is_active })
      .eq("id", loc.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      fetchLocations();
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editCode.trim() || !editName.trim()) return;
    const { error } = await supabase
      .from("locations")
      .update({ store_code: editCode.trim(), store_name: editName.trim() })
      .eq("id", id);
    if (error) {
      toast({
        title: "Error updating",
        description: error.message.includes("duplicate")
          ? "This store code already exists."
          : error.message,
        variant: "destructive",
      });
    } else {
      setEditingId(null);
      fetchLocations();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Manage Locations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User selector */}
        <div>
          <Label className="mb-2 block">Select User</Label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a user..." />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border z-50">
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.user_name || p.email || p.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedUserId && (
          <>
            {/* Add location form */}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label className="mb-1 block text-xs">Store Code</Label>
                <Input
                  placeholder="e.g. F001"
                  value={storeCode}
                  onChange={(e) => setStoreCode(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Label className="mb-1 block text-xs">Store Name</Label>
                <Input
                  placeholder="e.g. Downtown Store"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                />
              </div>
              <Button
                onClick={handleAdd}
                disabled={isAdding || !storeCode.trim() || !storeName.trim()}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>

            {/* Location list */}
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : locations.length === 0 ? (
              <p className="text-muted-foreground text-sm">No locations assigned to this user.</p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store Code</TableHead>
                      <TableHead>Store Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locations.map((loc) => (
                      <TableRow key={loc.id}>
                        <TableCell className="font-mono font-medium">
                          {editingId === loc.id ? (
                            <Input
                              value={editCode}
                              onChange={(e) => setEditCode(e.target.value)}
                              className="h-8"
                            />
                          ) : (
                            loc.store_code
                          )}
                        </TableCell>
                        <TableCell>
                          {editingId === loc.id ? (
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="h-8"
                            />
                          ) : (
                            loc.store_name
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={loc.is_active ? "default" : "secondary"}>
                            {loc.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            {editingId === loc.id ? (
                              <>
                                <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                                  Cancel
                                </Button>
                                <Button size="sm" onClick={() => handleSaveEdit(loc.id)}>
                                  Save
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingId(loc.id);
                                    setEditCode(loc.store_code);
                                    setEditName(loc.store_name);
                                  }}
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleToggleActive(loc)}
                                >
                                  <Power className="w-3 h-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default LocationManager;
