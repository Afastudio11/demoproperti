import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "type" | "value"> {
  value: string | number;
  onChange: (raw: string) => void;
}

function toDigits(v: string | number): string {
  return String(v ?? "").replace(/\D/g, "");
}

function formatIDR(digits: string): string {
  if (!digits) return "";
  const n = parseInt(digits, 10);
  if (isNaN(n)) return "";
  return n.toLocaleString("id-ID");
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, className, style, placeholder = "0", ...rest }, ref) => {
    const digits = toDigits(value);
    const display = formatIDR(digits);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, "");
      onChange(raw);
    };

    return (
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(
          "w-full text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring",
          className
        )}
        style={style}
        {...rest}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
