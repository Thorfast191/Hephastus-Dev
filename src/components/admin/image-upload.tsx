"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

async function uploadFile(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch("/api/upload", { method: "POST", body: formData });
  if (!response.ok) return null;
  const data = (await response.json()) as { path: string };
  return data.path;
}

export function ImageUpload({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (path: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = await uploadFile(file);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (path) onChange(path);
  }

  return (
    <div className="flex items-center gap-3">
      {value && (
        <div className="relative h-16 w-16 overflow-hidden rounded-md border">
          <Image src={value} alt="" fill className="object-cover" />
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="mr-2 h-4 w-4" />
        {uploading ? "Uploading..." : value ? "Replace" : "Upload"}
      </Button>
      {value && (
        <Button type="button" variant="ghost" size="icon" onClick={() => onChange(null)}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export function MultiImageUpload({
  value,
  onChange,
}: {
  value: string[];
  onChange: (paths: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = await uploadFile(file);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (path) onChange([...value, path]);
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {value.map((src, index) => (
            <div key={src} className="relative h-16 w-16 overflow-hidden rounded-md border">
              <Image src={src} alt="" fill className="object-cover" />
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="absolute top-0 right-0 rounded-bl bg-background/80 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="mr-2 h-4 w-4" />
        {uploading ? "Uploading..." : "Add image"}
      </Button>
    </div>
  );
}
