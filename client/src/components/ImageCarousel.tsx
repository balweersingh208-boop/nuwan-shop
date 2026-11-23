import { useState, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageCarouselProps {
  images: string[];
  alt: string;
  height?: string;
  showControls?: boolean;
  onImageClick?: (e: React.MouseEvent) => void;
}

export function ImageCarousel({
  images,
  alt,
  height = "h-32",
  showControls = true,
  onImageClick,
}: ImageCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (emblaApi) {
        emblaApi.scrollPrev();
        setSelectedIndex(emblaApi.selectedScrollSnap());
      }
    },
    [emblaApi]
  );

  const scrollNext = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (emblaApi) {
        emblaApi.scrollNext();
        setSelectedIndex(emblaApi.selectedScrollSnap());
      }
    },
    [emblaApi]
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  if (emblaApi) {
    emblaApi.on("select", onSelect);
  }

  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <img
        src={images[0]}
        alt={alt}
        className={`w-full ${height} object-cover rounded-md`}
        onClick={onImageClick}
        data-testid="img-product-single"
      />
    );
  }

  return (
    <div className="relative group" data-testid="carousel-container">
      <div className="overflow-hidden rounded-md" ref={emblaRef}>
        <div className="flex">
          {images.map((img, index) => (
            <div
              key={index}
              className="flex-[0_0_100%] min-w-0"
              onClick={onImageClick}
            >
              <img
                src={img}
                alt={`${alt} ${index + 1}`}
                className={`w-full ${height} object-cover`}
                data-testid={`img-carousel-${index}`}
              />
            </div>
          ))}
        </div>
      </div>

      {showControls && (
        <>
          <Button
            size="icon"
            variant="ghost"
            className="absolute left-1 top-1/2 -translate-y-1/2 h-6 w-6 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={scrollPrev}
            data-testid="button-carousel-prev"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={scrollNext}
            data-testid="button-carousel-next"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </>
      )}

      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
        {images.map((_, index) => (
          <span
            key={index}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              index === selectedIndex ? "bg-white" : "bg-white/50"
            }`}
            data-testid={`dot-indicator-${index}`}
          />
        ))}
      </div>
    </div>
  );
}
