import React, { useEffect, useMemo, useState } from 'react';
import { CompanyStockBackgroundSlideshow, StockInventoryModuleId } from '../types';
import { isStockBackgroundEnabledForModule } from '../utils/stockBackground';

interface ResolvedStockBackgroundImage {
  id: string;
  src: string;
}

interface StockBackgroundSlideshowProps {
  settings?: CompanyStockBackgroundSlideshow;
  images: ResolvedStockBackgroundImage[];
  moduleId: StockInventoryModuleId;
}

export const StockBackgroundSlideshow: React.FC<StockBackgroundSlideshowProps> = ({ settings, images, moduleId }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(() => new Set());
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const orderedSlides = useMemo(() => {
    if (!settings) return [];
    const resolvedById = new Map(images.map(image => [image.id, image.src]));
    return settings.images
      .map(image => ({ id: image.id, src: resolvedById.get(image.id) }))
      .filter((image): image is { id: string; src: string } => Boolean(image.src) && !failedImageIds.has(image.id));
  }, [settings, images, failedImageIds]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(preference.matches);
    updatePreference();
    preference.addEventListener?.('change', updatePreference);
    return () => preference.removeEventListener?.('change', updatePreference);
  }, []);

  useEffect(() => {
    setActiveIndex(index => orderedSlides.length > 0 ? index % orderedSlides.length : 0);
  }, [orderedSlides.length]);

  useEffect(() => {
    if (!settings || !isStockBackgroundEnabledForModule(settings, moduleId) || orderedSlides.length < 2 || prefersReducedMotion) return;
    const intervalMs = Math.min(15000, Math.max(5000, settings.transition_seconds * 1000));
    const timer = window.setInterval(() => {
      setActiveIndex(index => (index + 1) % orderedSlides.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [settings, moduleId, orderedSlides.length, prefersReducedMotion]);

  if (!settings || !isStockBackgroundEnabledForModule(settings, moduleId) || orderedSlides.length === 0) return null;

  const overlayOpacity = Math.min(0.8, Math.max(0, settings.overlay_opacity / 100));

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      aria-hidden="true"
      data-stock-background-slideshow={moduleId}
      data-slide-count={orderedSlides.length}
      data-active-slide-index={prefersReducedMotion ? 0 : activeIndex}
    >
      {orderedSlides.map((image, index) => (
        <img
          key={image.id}
          src={image.src}
          alt=""
          aria-hidden="true"
          decoding="async"
          fetchPriority={index === activeIndex ? 'high' : 'low'}
          onError={() => setFailedImageIds(previous => new Set(previous).add(image.id))}
          className={`absolute inset-0 h-full w-full object-cover ${prefersReducedMotion ? '' : 'transition-opacity duration-1000 ease-in-out'}`}
          style={{ opacity: index === activeIndex ? 1 : 0 }}
        />
      ))}
      <div className="absolute inset-0 bg-[#F4F7FB]" style={{ opacity: overlayOpacity }} />
    </div>
  );
};
