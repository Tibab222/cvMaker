import { Plus, Trash2, Tag, X, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ProjectBullet } from "@shared/projects.interface";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  bullets: ProjectBullet[];
  onChange: (bullets: ProjectBullet[]) => void;
}

export function BulletListEditor({ bullets, onChange }: Props) {
  const addBullet = () => {
    const newBullet: ProjectBullet = {
      id: crypto.randomUUID(),
      text: "",
      tags: [],
    };
    onChange([...bullets, newBullet]);
  };

  const updateBullet = (id: string, field: keyof ProjectBullet, value: unknown) => {
    const newList = bullets.map((b) =>
      b.id === id ? { ...b, [field]: value } : b
    );
    onChange(newList);
  };

  const removeBullet = (id: string) => {
    onChange(bullets.filter((b) => b.id !== id));
  };

  return (
    <div className="flex flex-col gap-3 mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Impact Bullet Points
          </h4>

          <TooltipProvider>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-help inline-flex items-center"
                  aria-label="XYZ formula info"
                >
                  <HelpCircle size={15} />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs p-3 flex flex-col">
                <p className="font-semibold mb-1">The XYZ Formula:</p>
                <p>
                  Structure as: <strong>Accomplished [X]</strong>, measured by{" "}
                  <strong>[Y]</strong>, by doing <strong>[Z]</strong>.
                </p>
                <p className="mt-1.5 italic text-muted-foreground border-t pt-1.5">
                  Ex: "Increased sales (X) by 20% (Y) through a new customer follow-up process (Z)."
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addBullet} className="h-8">
          <Plus size={14} className="mr-1" /> Add Bullet
        </Button>
      </div>

      {bullets.map((bullet) => (
        <div key={bullet.id} className="flex flex-col gap-2 p-3 border rounded-lg bg-slate-50/50">
          <div className="flex gap-2">
            <Input
              placeholder="Describe an impact or a task..."
              value={bullet.text}
              onChange={(e) => updateBullet(bullet.id, "text", e.target.value)}
              className="bg-white"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeBullet(bullet.id)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 size={16} />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Tag size={14} className="text-muted-foreground" />
            <Input
              placeholder="Tags (ex: react), press 'enter' to add"
              onKeyDown={(e) => {
                if(e.key === "Enter") {
                    const newTags = [...bullet.tags, e.currentTarget.value]
                    e.currentTarget.value = "";
                    newTags.filter(tag => tag.trim() !== ""); // remove empty tags
                    newTags.filter((tag, index) => newTags.indexOf(tag) === index); // remove duplicates
                    updateBullet(bullet.id, "tags", newTags);
                }
              }}
              className="h-7 text-xs bg-white w-full"
            />
          </div>
            <div className="flex flex-row">
                {bullet.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="group relative text-xs mr-1 pr-2 hover:pr-5 hover:cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-all duration-200" onClick={() => {
                        const newTags = bullet.tags.filter(t => t !== tag);
                        updateBullet(bullet.id, "tags", newTags);
                    }}>
                        {tag}
                        <X 
                            size={12} 
                            className="absolute right-1 opacity-0 group-hover:opacity-100 transition-opacity" 
                        />
                    </Badge>
                ))}
            </div>
        </div>
      ))}
    </div>
  );
}