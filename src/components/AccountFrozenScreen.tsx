import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Lock, Mail } from "lucide-react";

const AccountFrozenScreen = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-secondary/30 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-xl text-destructive">Account Frozen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-muted-foreground">
            Your account has been frozen by site administrators.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span>
              Please contact{" "}
              <a 
                href="mailto:info@pawngorillas.com" 
                className="text-primary hover:underline font-medium"
              >
                info@pawngorillas.com
              </a>
              {" "}with any questions.
            </span>
          </div>
          <Button variant="outline" onClick={handleLogout} className="w-full">
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountFrozenScreen;
