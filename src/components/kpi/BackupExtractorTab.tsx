import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Save, FileArchive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { extractKpiData, type ExtractedKpiRow, type LogType, type MonthSelection } from "@/lib/kpiExtractor/extractEngine";
import { PasswordRequiredError, IncorrectPasswordError } from "@/lib/kpiExtractor/backupReader";
import { writeKpiEntries } from "@/lib/kpiExtractor/writeToDb";
import type { Location } from "@/hooks/useUserLocations";

interface BackupExtractorTabProps {
  userId: string | null;
  userEmail: string | null;
  group: number | null;
  locations: Location[];
  year: number | null;
  month: number | null;
  currency: string;
}

interface LogLine { msg: string; type: LogType }

const BackupExtractorTab = ({ userId, userEmail, group, locations, year, month, currency }: BackupExtractorTabProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [useMostRecent, setUseMostRecent] = useState(true);
  const [selectedStores, setSelectedStores] = useState<string[]>(() => locations.map((l) => l.id));
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [rows, setRows] = useState<ExtractedKpiRow[] | null>(null);
  const [resolvedMonths, setResolvedMonths] = useState<{ year: number; month: number }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const toggleStore = (id: string) =>
    setSelectedStores((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const activeStores = locations.filter((l) => selectedStores.includes(l.id));

  const handleRun = async () => {
    if (!file || !userId) {
      toast({ title: "Choose a file", description: "Select your PawnMate backup file first.", variant: "destructive" });
      return;
    }
    if (!useMostRecent && (!year || !month)) {
      toast({ title: "Choose a period", description: "Select a year and month, or use the most recent month.", variant: "destructive" });
      return;
    }

    const monthSelection: MonthSelection = useMostRecent
      ? { mode: "mostRecent" }
      : { mode: "manual", months: [{ year: year!, month: month! }] };

    setIsRunning(true);
    setLogs([]);
    setProgress(0);
    setRows(null);

    try {
      const result = await extractKpiData({
        file,
        password: password || undefined,
        userId,
        userEmail,
        group,
        storeRuns:
          activeStores.length > 0
            ? activeStores.map((l) => ({ code: l.store_code, name: l.store_name, location_id: l.id }))
            : [{ code: "", name: "", location_id: null }],
        monthSelection,
        tzOffsetHours: 0,
        currency,
        onLog: (msg, type) => setLogs((prev) => [...prev, { msg, type: type ?? "info" }]),
        onProgress: (pct) => setProgress(pct),
      });

      setRows(result.rows);
      setResolvedMonths(result.resolvedMonths);
      setNeedsPassword(false);
      toast({ title: "Backup read", description: `${result.rows.length} values found. Review, then save.` });
    } catch (err: any) {
      if (err instanceof PasswordRequiredError) {
        setNeedsPassword(true);
        toast({ title: "Password needed", description: "This backup is password protected. Enter the password and try again.", variant: "destructive" });
      } else if (err instanceof IncorrectPasswordError) {
        setNeedsPassword(true);
        setPassword("");
        toast({ title: "Wrong password", description: "That password did not work for this backup file.", variant: "destructive" });
      } else {
        toast({ title: "Could not read backup", description: err?.message ?? "Unknown error", variant: "destructive" });
      }
    } finally {
      setIsRunning(false);
    }
  };

  const handleSave = async () => {
    if (!rows || !userId) return;
    setIsSaving(true);
    try {
      const { written } = await writeKpiEntries(userId, rows);
      toast({ title: "Saved", description: `${written} values saved.` });
    } catch (err: any) {
      toast({ title: "Save failed", description: err?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border p-6 space-y-4">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <FileArchive className="w-5 h-5" />
          PawnMate Backup File
        </h3>
        <p className="text-sm text-muted-foreground">
          Choose your PawnMate backup (.zip or .tar). Your numbers are read from the file and filled in for you.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="backup-file">Backup file</Label>
            <Input
              id="backup-file"
              ref={fileInputRef}
              type="file"
              accept=".zip,.tar"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setRows(null); }}
            />
          </div>
          {needsPassword && (
            <div className="grid gap-2">
              <Label htmlFor="backup-password">Backup password</Label>
              <Input
                id="backup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter the file password"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Checkbox id="most-recent" checked={useMostRecent} onCheckedChange={(c) => setUseMostRecent(!!c)} />
          <Label htmlFor="most-recent" className="text-sm font-normal">
            Use the most recent completed month in the file
          </Label>
        </div>
        {!useMostRecent && (
          <p className="text-sm text-muted-foreground">
            Using the year and month selected above{year && month ? `: ${month}/${year}` : ""}.
          </p>
        )}

        {locations.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm">Stores to process</Label>
            <div className="flex flex-wrap gap-4">
              {locations.map((loc) => (
                <div key={loc.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`store-${loc.id}`}
                    checked={selectedStores.includes(loc.id)}
                    onCheckedChange={() => toggleStore(loc.id)}
                  />
                  <Label htmlFor={`store-${loc.id}`} className="text-sm font-normal">
                    {loc.store_code} - {loc.store_name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleRun} disabled={isRunning || !file}>
            <Upload className="w-4 h-4 mr-2" />
            {isRunning ? "Reading backup..." : "Read Backup"}
          </Button>
        </div>

        {(isRunning || progress > 0) && <Progress value={progress} className="h-2" />}
      </div>

      {logs.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-4">
          <h4 className="font-semibold text-sm mb-2">Progress log</h4>
          <div className="max-h-64 overflow-y-auto font-mono text-xs space-y-0.5">
            {logs.map((l, i) => (
              <div
                key={i}
                className={
                  l.type === "error"
                    ? "text-destructive"
                    : l.type === "warn"
                    ? "text-amber-600"
                    : l.type === "section"
                    ? "font-bold text-foreground mt-2"
                    : "text-muted-foreground"
                }
              >
                {l.msg}
              </div>
            ))}
          </div>
        </div>
      )}

      {rows && (
        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h4 className="font-bold text-foreground">Extracted values</h4>
              <p className="text-sm text-muted-foreground">
                {rows.length} values
                {resolvedMonths.length > 0 && ` for ${resolvedMonths.map((m) => `${m.month}/${m.year}`).join(", ")}`}
              </p>
            </div>
            <Button onClick={handleSave} disabled={isSaving || rows.length === 0}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save to My Data"}
            </Button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="border border-border bg-secondary p-2 text-left">Store</th>
                  <th className="border border-border bg-secondary p-2 text-left">Period</th>
                  <th className="border border-border bg-secondary p-2 text-left">Field</th>
                  <th className="border border-border bg-secondary p-2 text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.store_code}-${r.field_name}-${i}`}>
                    <td className="border border-border p-2">{r.store_code}</td>
                    <td className="border border-border p-2">{r.month}/{r.year}</td>
                    <td className="border border-border p-2">{r.field_label}</td>
                    <td className="border border-border p-2 text-right">{String(r.field_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupExtractorTab;
