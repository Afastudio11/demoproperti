import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type SubkonMasterOption = {
  name: string;
  contractCount: number;
  activeContractCount: number;
  projectIds: number[];
};

type SubkonSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  projectId?: string | number | null;
  placeholder?: string;
  triggerClassName?: string;
  disabled?: boolean;
};

export function useSubkonOptions(projectId?: string | number | null) {
  const normalizedProjectId = projectId ? String(projectId) : "";

  return useQuery({
    queryKey: ["subkon-master", normalizedProjectId || "all"],
    queryFn: async () => {
      const params = normalizedProjectId ? `?projectId=${encodeURIComponent(normalizedProjectId)}` : "";
      const res = await fetch(`/api/produksi/subkon/master${params}`);
      if (!res.ok) throw new Error("Failed to load subkon master");
      return res.json() as Promise<SubkonMasterOption[]>;
    },
  });
}

export default function SubkonSelect({
  value,
  onValueChange,
  projectId,
  placeholder = "Pilih subkon...",
  triggerClassName,
  disabled,
}: SubkonSelectProps) {
  const { data: options = [], isLoading } = useSubkonOptions(projectId);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || isLoading || options.length === 0}>
      <SelectTrigger className={cn("h-8 text-sm", triggerClassName)}>
        <SelectValue placeholder={isLoading ? "Memuat subkon..." : options.length === 0 ? "Belum ada kontrak subkon" : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.name} value={option.name}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
