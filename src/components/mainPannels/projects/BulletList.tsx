import { Plus, Trash2, Tag, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ProjectBullet } from "@shared/projects.interface";
import { Badge } from "@/components/ui/badge";

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
        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Points d'impact (CV Bullets)
        </h4>
        <Button type="button" variant="outline" size="sm" onClick={addBullet} className="h-8">
          <Plus size={14} className="mr-1" /> Ajouter
        </Button>
      </div>

      {bullets.map((bullet) => (
        <div key={bullet.id} className="flex flex-col gap-2 p-3 border rounded-lg bg-slate-50/50">
          <div className="flex gap-2">
            <Input
              placeholder="Décrivez un impact ou une tâche..."
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