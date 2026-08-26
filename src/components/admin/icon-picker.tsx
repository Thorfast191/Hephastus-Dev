"use client";

import * as Icons from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const ICON_OPTIONS = [
  "Globe",
  "Monitor",
  "Smartphone",
  "Cpu",
  "Network",
  "Sparkles",
  "Eye",
  "Code2",
  "Database",
  "Cloud",
  "Server",
  "Shield",
  "Zap",
  "Rocket",
  "Settings",
  "Layers",
  "Terminal",
  "GitBranch",
  "LineChart",
  "MessageSquare",
  "Camera",
  "Bot",
  "Brain",
  "Palette",
  "PenTool",
  "Wrench",
] as const;

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const SelectedIcon = Icons[value as keyof typeof Icons] as
    | Icons.LucideIcon
    | undefined;

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next);
      }}
    >
      <SelectTrigger className="w-full">
        <div className="flex items-center gap-2">
          {SelectedIcon && <SelectedIcon className="h-4 w-4" />}
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {ICON_OPTIONS.map((name) => {
          const OptionIcon = Icons[name] as Icons.LucideIcon;
          return (
            <SelectItem key={name} value={name}>
              <div className="flex items-center gap-2">
                <OptionIcon className="h-4 w-4" />
                {name}
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
