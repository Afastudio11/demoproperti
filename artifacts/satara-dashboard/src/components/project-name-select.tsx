import { useQuery } from "@tanstack/react-query";

type Project = { id: number; nama: string };

type ProjectNameSelectProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  disabled?: boolean;
};

export default function ProjectNameSelect({ value, onChange, className, required, disabled }: ProjectNameSelectProps) {
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed to load projects");
      return res.json();
    },
  });

  const hasLegacyValue = value && !projects.some(project => project.nama === value);

  return (
    <select
      value={value}
      onChange={event => onChange(event.target.value)}
      className={className}
      required={required}
      disabled={disabled || isLoading}
    >
      <option value="">{isLoading ? "Memuat proyek..." : "-- Pilih Proyek --"}</option>
      {hasLegacyValue && <option value={value}>{value} (data lama)</option>}
      {projects.map(project => (
        <option key={project.id} value={project.nama}>{project.nama}</option>
      ))}
    </select>
  );
}
