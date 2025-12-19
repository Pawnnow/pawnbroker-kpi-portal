import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ApiKeyInfo {
  name: string;
  created_at: string;
  last_used_at: string | null;
}

interface ApiKeyState {
  hasActiveKey: boolean;
  keyInfo: ApiKeyInfo | null;
  isLoading: boolean;
  newKey: string | null;
  exportUrl: string | null;
}

export const useApiKey = () => {
  const [state, setState] = useState<ApiKeyState>({
    hasActiveKey: false,
    keyInfo: null,
    isLoading: false,
    newKey: null,
    exportUrl: null,
  });
  const { toast } = useToast();

  const checkApiKeyStatus = async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("manage-api-key", {
        method: "GET",
      });

      if (response.error) throw response.error;

      setState(prev => ({
        ...prev,
        hasActiveKey: response.data.hasActiveKey,
        keyInfo: response.data.keyInfo,
        isLoading: false,
      }));
    } catch (error) {
      console.error("Error checking API key status:", error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const generateApiKey = async () => {
    setState(prev => ({ ...prev, isLoading: true, newKey: null, exportUrl: null }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("manage-api-key", {
        method: "POST",
      });

      if (response.error) throw response.error;

      setState(prev => ({
        ...prev,
        hasActiveKey: true,
        newKey: response.data.apiKey,
        exportUrl: response.data.exportUrl,
        isLoading: false,
        keyInfo: {
          name: "Excel Integration",
          created_at: new Date().toISOString(),
          last_used_at: null,
        },
      }));

      toast({
        title: "API Key Generated",
        description: "Your API key has been created. Copy it now - it won't be shown again!",
      });
    } catch (error) {
      console.error("Error generating API key:", error);
      setState(prev => ({ ...prev, isLoading: false }));
      toast({
        title: "Error",
        description: "Failed to generate API key. Please try again.",
        variant: "destructive",
      });
    }
  };

  const revokeApiKey = async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("manage-api-key", {
        method: "DELETE",
      });

      if (response.error) throw response.error;

      setState({
        hasActiveKey: false,
        keyInfo: null,
        isLoading: false,
        newKey: null,
        exportUrl: null,
      });

      toast({
        title: "API Key Revoked",
        description: "Your API key has been revoked and can no longer be used.",
      });
    } catch (error) {
      console.error("Error revoking API key:", error);
      setState(prev => ({ ...prev, isLoading: false }));
      toast({
        title: "Error",
        description: "Failed to revoke API key. Please try again.",
        variant: "destructive",
      });
    }
  };

  const clearNewKey = () => {
    setState(prev => ({ ...prev, newKey: null, exportUrl: null }));
  };

  return {
    ...state,
    checkApiKeyStatus,
    generateApiKey,
    revokeApiKey,
    clearNewKey,
  };
};
