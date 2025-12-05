import { Input } from "@/components/ui/input";

interface DataGridProps {
  title: string;
  columns: string[];
  rows: string[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

const DataGrid = ({ title, columns, rows, values, onChange }: DataGridProps) => {
  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="text-lg font-bold text-foreground mb-4">{title}</h3>
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
            {rows.map((row) => (
              <tr key={row}>
                <td className="border border-border bg-secondary p-2 text-left font-medium text-sm">
                  {row}
                </td>
                {columns.map((col) => {
                  const key = `${row}_${col}`;
                  return (
                    <td key={col} className="border border-border p-2">
                      <Input
                        type="text"
                        value={values[key] || ""}
                        onChange={(e) => onChange(key, e.target.value)}
                        className="w-full text-right text-sm"
                        placeholder="0"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataGrid;
