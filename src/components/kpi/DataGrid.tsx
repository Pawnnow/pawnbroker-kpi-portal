import { Input } from "@/components/ui/input";
import { useState } from "react";
import { isGridCurrencyField } from "@/lib/utils";
import KpiInfoBubble from "@/components/kpi/KpiInfoBubble";

interface DataGridProps {
  title: string;
  columns: string[];
  rows: string[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  requiredRows?: string[];
  requiredColumn?: string;
  gridPrefix?: string; // e.g. "aged" or "pawn_balance" for currency detection
  infoBubbleField?: string; // field name for KpiInfoBubble next to title
}

const DataGrid = ({ title, columns, rows, values, onChange, requiredRows = [], requiredColumn, gridPrefix, infoBubbleField }: DataGridProps) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateNumeric = (value: string): boolean => {
    if (value === "" || value === "-") return true;
    // Allow numbers with optional decimals and negative sign
    const numericPattern = /^-?\d*\.?\d{0,2}$/;
    return numericPattern.test(value);
  };

  const handleChange = (key: string, value: string) => {
    if (validateNumeric(value)) {
      onChange(key, value);
      setErrors((prev) => ({ ...prev, [key]: "" }));
    } else {
      setErrors((prev) => ({ ...prev, [key]: "Must be a number" }));
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
        {title}
        {infoBubbleField && <KpiInfoBubble fieldName={infoBubbleField} />}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-border bg-secondary p-2 text-left font-bold text-sm"></th>
              {columns.map((col) => (
                <th key={col} className="border border-border bg-secondary p-2 text-center font-bold text-sm min-w-[100px]">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isRequired = requiredRows.includes(row);
              return (
              <tr key={row}>
                <td className="border border-border bg-secondary p-2 text-left font-medium text-sm">
                  {row}
              {isRequired && <span className="text-destructive ml-1">*</span>}
                </td>
                {columns.map((col) => {
                   // Sanitize column name to avoid collisions (e.g., "Total #" vs "Total $")
                  const sanitizedCol = col.replace('#', 'Num').replace('$', 'Dollar');
                  const key = `${row}_${sanitizedCol}`;
                  const hasError = !!errors[key];
                  const isCellRequired = isRequired && (!requiredColumn || col === requiredColumn);
                  const fieldKey = gridPrefix ? `${gridPrefix}_${key}` : key;
                  const isCurrency = isGridCurrencyField(fieldKey);
                  return (
                    <td key={col} className="border border-border p-2">
                      <div className="flex flex-col">
                        <div className="relative">
                          {isCurrency && (
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">$</span>
                          )}
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={values[key] || ""}
                            onChange={(e) => handleChange(key, e.target.value)}
                            className={`w-full text-right text-sm ${isCurrency ? "pl-6" : ""} ${hasError ? "border-destructive" : ""}`}
                            style={isCellRequired ? { backgroundColor: 'rgba(16, 216, 6, 0.15)' } : undefined}
                            placeholder="0"
                          />
                        </div>
                        {hasError && (
                          <span className="text-xs text-destructive mt-1">{errors[key]}</span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataGrid;
