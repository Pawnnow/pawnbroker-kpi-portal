import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface KpiField {
  name: string;
  label: string;
  isRequired?: boolean;
}

interface KpiInputColumnProps {
  title: string;
  fields: KpiField[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  category: string;
}

const KpiInputColumn = ({ title, fields, values, onChange, category }: KpiInputColumnProps) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateNumeric = (value: string): boolean => {
    if (value === "" || value === "-") return true;
    // Allow numbers with optional decimals and negative sign
    const numericPattern = /^-?\d*\.?\d*$/;
    return numericPattern.test(value);
  };

  const handleChange = (name: string, value: string) => {
    if (validateNumeric(value)) {
      onChange(name, value);
      setErrors((prev) => ({ ...prev, [name]: "" }));
    } else {
      setErrors((prev) => ({ ...prev, [name]: "Must be a number" }));
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="text-lg font-bold text-foreground mb-4">{title}</h3>
      <div className="space-y-3">
        {fields.map((field) => (
          <div key={field.name} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor={field.name} className="text-sm text-foreground flex-1">
                {field.label}
                {field.isRequired && <span className="text-destructive ml-1">*</span>}
              </Label>
              <Input
                id={field.name}
                type="text"
                inputMode="decimal"
                value={values[field.name] || ""}
                onChange={(e) => handleChange(field.name, e.target.value)}
                className={`w-32 text-right ${errors[field.name] ? "border-destructive" : ""}`}
                style={field.isRequired ? { backgroundColor: 'rgba(49, 249, 39, 0.15)' } : undefined}
                placeholder="0"
              />
            </div>
            {errors[field.name] && (
              <p className="text-xs text-destructive text-right">{errors[field.name]}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default KpiInputColumn;
