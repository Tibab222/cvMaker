import { Skeleton } from "@/components/ui/skeleton";

interface TemplateSkeletonProps {
  lines?: number;
  className?: string;
}

export function TemplateSkeleton({ lines = 2, className = "" }: TemplateSkeletonProps) {
  return (
    <div className={`flex flex-col gap-1.5 w-full my-1 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3"
          style={{
            width: i === lines - 1 && lines > 1 ? "70%" : "100%",
          }}
        />
      ))}
    </div>
  );
}