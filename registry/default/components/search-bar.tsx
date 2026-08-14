import * as React from "react";
import { ImageIcon, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface SearchBarProps extends Omit<React.ComponentProps<"form">, "onSubmit"> {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  /**
   * Enable image search. When set, a button lets the shopper pick an image file;
   * the chosen `File` is emitted here for you to read/encode and pass to
   * `client.products.searchByImage`.
   */
  onImageSelected?: (file: File) => void;
  loading?: boolean;
}

export function SearchBar({
  value,
  onValueChange,
  onSubmit,
  placeholder = "Search products",
  onImageSelected,
  loading = false,
  className,
  ...props
}: SearchBarProps) {
  const fileInput = React.useRef<HTMLInputElement>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit?.(value);
  };

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageSelected?.(file);
    }
    event.target.value = "";
  };

  return (
    <form
      role="search"
      data-slot="search-bar"
      onSubmit={handleSubmit}
      className={cn("relative flex items-center gap-2", className)}
      {...props}
    >
      <div className="relative flex-1">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={placeholder}
          aria-busy={loading}
          className="h-10 pr-9 pl-9 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onValueChange("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      {onImageSelected ? (
        <>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-10 shrink-0"
            aria-label="Search by image"
            onClick={() => fileInput.current?.click()}
          >
            <ImageIcon className="size-4" />
          </Button>
        </>
      ) : null}
    </form>
  );
}
