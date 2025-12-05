import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface KpiField {
  name: string;
  label: string;
}

interface KpiInputColumnProps {
  title: string;
  fields: KpiField[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  category: string;
}

const KpiInputColumn = ({ title, fields, values, onChange, category }: KpiInputColumnProps) => {
  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="text-lg font-bold text-foreground mb-4">{title}</h3>
      <div className="space-y-3">
        {fields.map((field) => (
          <div key={field.name} className="flex items-center justify-between gap-4">
            <Label htmlFor={field.name} className="text-sm text-foreground flex-1">
              {field.label}
            </Label>
            <Input
              id={field.name}
              type="text"
              value={values[field.name] || ""}
              onChange={(e) => onChange(field.name, e.target.value)}
              className="w-32 text-right"
              placeholder="0"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default KpiInputColumn;
