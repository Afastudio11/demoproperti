import { useState, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NumericInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  value: number;
  onChange: (value: number) => void;
  decimals?: number;
}

const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(
  ({ value, onChange, decimals = 0, className, onFocus, onBlur, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const [raw, setRaw] = useState("");

    const formatted = (value === null || value === undefined || isNaN(value))
      ? ""
      : value === 0
      ? "0"
      : value.toLocaleString("id-ID", {
          minimumFractionDigits: 0,
          maximumFractionDigits: decimals > 0 ? decimals : 20,
        });

    return (
      <input
        ref={ref}
        type="text"
        inputMode={decimals > 0 ? "decimal" : "numeric"}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        value={focused ? raw : formatted}
        onFocus={(e) => {
          setFocused(true);
          const rawStr = (value === 0 || value === null || value === undefined || isNaN(value)) ? "" : decimals > 0 ? String(value) : String(Math.round(value));
          setRaw(rawStr);
          setTimeout(() => e.target.select(), 0);
          onFocus?.(e);
        }}
        onChange={(e) => {
          const input = e.target.value;
          const clean = decimals > 0
            ? input.replace(/[^0-9.]/g, "").replace(/^(\d*\.?\d*).*$/, "$1")
            : input.replace(/[^0-9]/g, "");
          setRaw(clean);
          const parsed = parseFloat(clean) || 0;
          onChange(parsed);
        }}
        onBlur={(e) => {
          setFocused(false);
          const parsed = parseFloat(raw.replace(/[^0-9.]/g, "")) || 0;
          onChange(parsed);
          setRaw("");
          onBlur?.(e);
        }}
        {...props}
      />
    );
  },
);

NumericInput.displayName = "NumericInput";
export { NumericInput };
