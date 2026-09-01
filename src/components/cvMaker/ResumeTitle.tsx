import { useContext } from "react";
import { Input } from "../ui/input";
import { Pencil } from "lucide-react";
import { CVSelectionContext } from "./provider/context";

export default function ResumeTitle() {
  const context = useContext(CVSelectionContext);

  if (!context) return null;

  return (
    <div className="flex w-fit mx-auto items-center gap-2 group">
      <Input
        type="text"
        value={context.title}
        onChange={(e) => context.setTitle(e.target.value)}
        placeholder="Resume Title..."
        className="h-9 w-64 font-medium text-sm bg-transparent border-gray-300 text-gray-500 hover:border-input focus:border-input transition-colors"
      />
      <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}