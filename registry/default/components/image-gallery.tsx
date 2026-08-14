import * as React from "react";
import { ImageOff } from "lucide-react";
import type { ProductImage } from "@channel3/sdk/resources";

import { cn } from "@/lib/utils";
import {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

function GalleryImage({
  image,
  priority = false,
}: {
  image: ProductImage;
  priority?: boolean;
}) {
  const [failed, setFailed] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  // A server-rendered image can finish decoding before hydration, so `onLoad`
  // never fires on the client — reveal it on mount if it's already complete.
  const revealIfComplete = React.useCallback((node: HTMLImageElement | null) => {
    if (node?.complete) {
      setLoaded(true);
    }
  }, []);
  if (failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
        <ImageOff className="size-8" aria-hidden />
      </div>
    );
  }
  return (
    <img
      src={image.url}
      alt={image.alt_text ?? ""}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={cn(
        "absolute inset-0 size-full object-cover transition-opacity duration-300",
        loaded ? "opacity-100" : "opacity-0",
      )}
      ref={revealIfComplete}
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
    />
  );
}

export interface ImageGalleryProps extends React.ComponentProps<"div"> {
  images: ReadonlyArray<ProductImage>;
  /**
   * Transient image to overlay on the active slide (e.g. a hovered variant
   * swatch's `thumbnail_url`). The carousel state is untouched; clearing this
   * (`null`/`undefined`) reveals the underlying slide again.
   */
  previewSrc?: string | null;
}

export function ImageGallery({ images, previewSrc, className, ...props }: ImageGalleryProps) {
  const [api, setApi] = React.useState<CarouselApi>();
  const [selected, setSelected] = React.useState(0);

  React.useEffect(() => {
    if (!api) {
      return;
    }
    const sync = () => setSelected(api.selectedScrollSnap());
    sync();
    api.on("select", sync);
    api.on("reInit", sync);
    return () => {
      api.off("select", sync);
      api.off("reInit", sync);
    };
  }, [api]);

  if (images.length === 0) {
    return (
      <div
        data-slot="image-gallery"
        className={cn(
          "flex aspect-square items-center justify-center rounded-lg bg-muted text-muted-foreground",
          className,
        )}
        {...props}
      >
        <ImageOff className="size-10" aria-hidden />
      </div>
    );
  }

  const multiple = images.length > 1;

  return (
    <div data-slot="image-gallery" className={cn("flex flex-col gap-2", className)} {...props}>
      <div className="relative">
        <Carousel setApi={setApi} className="w-full">
          <CarouselContent>
            {images.map((image, index) => (
              <CarouselItem key={`${image.url}-${index}`}>
                <div className="relative overflow-hidden rounded-lg bg-muted">
                  {/* Invisible sizer: a square, plus the thumbnail strip's own
                      height when there's no strip — so a single image fills the
                      same footprint as a multi-image gallery. */}
                  <div aria-hidden className="invisible flex flex-col gap-2">
                    <div className="aspect-square" />
                    {multiple ? null : <div className="size-14" />}
                  </div>
                  <GalleryImage image={image} priority={index === 0} />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {multiple ? (
            <>
              <CarouselPrevious className="left-2" />
              <CarouselNext className="right-2" />
            </>
          ) : null}
        </Carousel>
        {previewSrc ? (
          <img
            src={previewSrc}
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 size-full rounded-lg bg-muted object-cover"
          />
        ) : null}
      </div>

      {multiple ? (
        <div className="flex items-start gap-2 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden">
          {images.map((image, index) => (
            <button
              key={`thumb-${image.url}-${index}`}
              type="button"
              onClick={() => api?.scrollTo(index)}
              onMouseEnter={() => api?.scrollTo(index, true)}
              onFocus={() => api?.scrollTo(index, true)}
              aria-label={`View image ${index + 1}`}
              aria-current={index === selected}
              className={cn(
                "relative size-14 shrink-0 overflow-hidden rounded-md border bg-muted transition-opacity",
                index === selected
                  ? "border-ring ring-1 ring-ring"
                  : "opacity-60 hover:opacity-100",
              )}
            >
              <GalleryImage image={image} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
