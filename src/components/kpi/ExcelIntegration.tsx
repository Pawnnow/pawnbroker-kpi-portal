import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApiKey } from "@/hooks/useApiKey";
import { Key, Copy, RefreshCw, Trash2, Check, ExternalLink } from "lucide-react";
import { format } from "date-fns";

const ExcelIntegration = () => {
  const {
    hasActiveKey,
    keyInfo,
    isLoading,
    newKey,
    exportUrl,
    checkApiKeyStatus,
    generateApiKey,
    revokeApiKey,
    clearNewKey,
  } = useApiKey();

  const [copied, setCopied] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    checkApiKeyStatus();
  }, []);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Build URLs with format parameter
  const baseUrl = exportUrl || "YOUR_EXPORT_URL";
  const wideFormatUrl = baseUrl.includes('?') ? `${baseUrl}&format=wide` : `${baseUrl}?format=wide`;

  const powerQueryCode = `let
    Source = Json.Document(Web.Contents("${wideFormatUrl}")),
    data = Source[data],
    #"Converted to Table" = Table.FromList(data, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    #"Expanded Column" = Table.ExpandRecordColumn(#"Converted to Table", "Column1", Record.FieldNames(data{0}))
in
    #"Expanded Column"`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          Excel Integration
        </CardTitle>
        <CardDescription>
          Connect Excel Power Query to access your KPI data live
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {newKey && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-primary font-medium">
              <Check className="w-4 h-4" />
              API Key Generated Successfully
            </div>
            <p className="text-sm text-muted-foreground">
              <strong>Warning:</strong> This key will only be shown once. Copy it now!
            </p>
            <div className="space-y-2">
              <Label>Your API Key</Label>
              <div className="flex gap-2">
                <Input
                  value={newKey}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(newKey)}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            {exportUrl && (
              <div className="space-y-2">
                <Label>Export URL (Wide Format - Recommended)</Label>
                <div className="flex gap-2">
                  <Input
                    value={wideFormatUrl}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopy(wideFormatUrl)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Wide format gives you one row per user/month with each KPI as a column - ready for pivot tables.
                </p>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={clearNewKey}>
              I've copied my key
            </Button>
          </div>
        )}

        {!newKey && hasActiveKey && keyInfo && (
          <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Active API Key</span>
              <span className="text-xs text-muted-foreground bg-primary/10 px-2 py-1 rounded">
                Active
              </span>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Created: {format(new Date(keyInfo.created_at), "PPp")}</p>
              {keyInfo.last_used_at && (
                <p>Last used: {format(new Date(keyInfo.last_used_at), "PPp")}</p>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {!hasActiveKey ? (
            <Button onClick={generateApiKey} disabled={isLoading}>
              <Key className="w-4 h-4 mr-2" />
              {isLoading ? "Generating..." : "Generate API Key"}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={generateApiKey}
                disabled={isLoading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate Key
              </Button>
              <Button
                variant="destructive"
                onClick={revokeApiKey}
                disabled={isLoading}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Revoke Key
              </Button>
            </>
          )}
        </div>

        <div className="border-t border-border pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInstructions(!showInstructions)}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Power Query Setup Instructions
            </span>
            <span>{showInstructions ? "−" : "+"}</span>
          </Button>

          {showInstructions && (
            <div className="mt-4 space-y-4 text-sm">
              <div className="space-y-2">
                <h4 className="font-medium">Quick Setup (From Web)</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Open Excel → Data → Get Data → From Web</li>
                  <li>Paste your Export URL (with <code className="bg-muted px-1 rounded">format=wide</code>) and click OK</li>
                  <li>You'll see "data" and "meta" - click on "List" next to "data"</li>
                  <li>Click "To Table" in the ribbon, then OK</li>
                  <li>Click the expand icon (↔) on "Column1" header</li>
                  <li>Select all fields and click OK</li>
                  <li>Click "Close & Load" - your data is ready!</li>
                </ol>
                <p className="text-xs text-muted-foreground mt-2 italic">
                  The wide format gives you clean data with each KPI as its own column - perfect for pivot tables.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Advanced Setup (M Code)</h4>
                <p className="text-muted-foreground">
                  For automatic column detection, use this M code in Power Query:
                </p>
                <div className="relative">
                  <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                    {powerQueryCode}
                  </pre>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => handleCopy(powerQueryCode)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">URL Parameters</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><code className="bg-muted px-1 rounded">format=wide</code> - Pivot data (one row per user/month, KPIs as columns)</li>
                  <li><code className="bg-muted px-1 rounded">format=long</code> - Raw data (one row per field, default)</li>
                  <li><code className="bg-muted px-1 rounded">year=2025</code> - Filter by year</li>
                  <li><code className="bg-muted px-1 rounded">month=6</code> - Filter by month</li>
                  <li><code className="bg-muted px-1 rounded">category=pawn</code> - Filter by category</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Creating a Pivot Table</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>After loading data, select it and go to Insert → PivotTable</li>
                  <li>Drag <code className="bg-muted px-1 rounded">user_email</code> to Rows</li>
                  <li>Drag <code className="bg-muted px-1 rounded">month_name</code> to Columns</li>
                  <li>Drag any KPI field to Values</li>
                  <li>Right-click values → Value Field Settings → change "Sum" to "Average" if needed</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ExcelIntegration;
