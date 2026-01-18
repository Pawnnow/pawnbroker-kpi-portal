import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Eye, EyeOff, RefreshCw, Copy, Check } from "lucide-react";

const CreateUserForm = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [group, setGroup] = useState<number>(0);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [createdUser, setCreatedUser] = useState<{ email: string; password: string; user_name: string; group: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let result = "";
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
    setShowPassword(true);
  };

  const copyCredentials = () => {
    if (!createdUser) return;
    const text = `Email: ${createdUser.email}\nUsername: ${createdUser.user_name}\nGroup: ${createdUser.group}\nTemporary Password: ${createdUser.password}\n\nPlease log in and change your password immediately.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Credentials copied",
      description: "User credentials have been copied to clipboard.",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setCreatedUser(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email,
            password,
            user_name: userName,
            full_name: fullName,
            group,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create user");
      }

      setCreatedUser({ email, password, user_name: userName, group });
      toast({
        title: "User created successfully",
        description: `User ${userName} (Group ${group}) has been created. Share the credentials below.`,
      });

      // Reset form except for the success message
      setEmail("");
      setUserName("");
      setFullName("");
      setPassword("");
      setGroup(0);
    } catch (error: any) {
      toast({
        title: "Error creating user",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Create New User
        </CardTitle>
        <CardDescription>
          Create a new user account. They will be required to change their password on first login.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userName">User Name *</Label>
              <Input
                id="userName"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g., jsmith or store42"
                required
                pattern="^[a-zA-Z0-9_-]+$"
                title="Only letters, numbers, underscores, and hyphens allowed"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Smith"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group">Group *</Label>
              <Select value={group.toString()} onValueChange={(val) => setGroup(parseInt(val))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4, 5].map((g) => (
                    <SelectItem key={g} value={g.toString()}>
                      Group {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Temporary Password *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={generatePassword}
                  title="Generate random password"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating User..." : "Create User"}
          </Button>
        </form>

        {createdUser && (
          <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-green-800 dark:text-green-200">
                User Created Successfully!
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={copyCredentials}
                className="text-green-800 dark:text-green-200"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Credentials
                  </>
                )}
              </Button>
            </div>
            <div className="text-sm space-y-1 text-green-700 dark:text-green-300">
              <p><strong>Email:</strong> {createdUser.email}</p>
              <p><strong>Username:</strong> {createdUser.user_name}</p>
              <p><strong>Group:</strong> {createdUser.group}</p>
              <p><strong>Temporary Password:</strong> {createdUser.password}</p>
            </div>
            <p className="text-xs text-green-600 dark:text-green-400">
              Share these credentials securely with the user. They will be prompted to change their password on first login.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CreateUserForm;
