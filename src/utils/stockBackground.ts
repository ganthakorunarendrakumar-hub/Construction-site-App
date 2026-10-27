import { CompanyStockBackgroundSlideshow, StockInventoryModuleId } from '../types';

export const MAX_STOCK_BACKGROUND_IMAGES = 5;
export const MAX_STOCK_BACKGROUND_IMAGE_BYTES = 1536 * 1024;
export const MAX_LOCAL_STOCK_BACKGROUND_BYTES = 2 * 1024 * 1024;

export const STOCK_INVENTORY_MODULES: Array<{ id: StockInventoryModuleId; label: string }> = [
  { id: 'cement_module', label: 'Cement Inventory' },
  { id: 'steel_module', label: 'Steel Inventory' },
  { id: 'sand_module', label: 'Sand Inventory' },
  { id: 'bricks_module', label: 'Bricks Inventory' },
  { id: 'aggregate_module', label: 'Aggregate Inventory' }
];

export const DEFAULT_STOCK_BACKGROUND_SLIDESHOW: CompanyStockBackgroundSlideshow = {
  enabled: false,
  images: [],
  transition_seconds: 6,
  overlay_opacity: 32,
  modules: STOCK_INVENTORY_MODULES.map(module => module.id)
};

export const normalizeStockBackgroundSlideshow = (value: unknown): CompanyStockBackgroundSlideshow => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...DEFAULT_STOCK_BACKGROUND_SLIDESHOW, images: [], modules: [...DEFAULT_STOCK_BACKGROUND_SLIDESHOW.modules] };
  }

  const candidate = value as Partial<CompanyStockBackgroundSlideshow>;
  const validModuleIds = new Set(STOCK_INVENTORY_MODULES.map(module => module.id));
  const images = Array.isArray(candidate.images)
    ? candidate.images
      .filter(image => image && typeof image.id === 'string' && typeof image.name === 'string' && typeof image.url === 'string' && image.url.length > 0)
      .map(image => ({
        id: image.id,
        name: image.name.slice(0, 160),
        url: image.url,
        size_bytes: Number.isFinite(image.size_bytes) && image.size_bytes > 0 ? Math.floor(image.size_bytes) : 0
      }))
    : [];
  const modules = Array.isArray(candidate.modules)
    ? candidate.modules.filter((module): module is StockInventoryModuleId => validModuleIds.has(module))
    : [...DEFAULT_STOCK_BACKGROUND_SLIDESHOW.modules];
  const transitionSeconds = Number(candidate.transition_seconds);
  const overlayOpacity = Number(candidate.overlay_opacity);

  return {
    enabled: candidate.enabled === true && images.length > 0 && modules.length > 0,
    images,
    transition_seconds: Number.isFinite(transitionSeconds) ? Math.min(15, Math.max(5, transitionSeconds)) : DEFAULT_STOCK_BACKGROUND_SLIDESHOW.transition_seconds,
    overlay_opacity: Number.isFinite(overlayOpacity) ? Math.min(80, Math.max(0, overlayOpacity)) : DEFAULT_STOCK_BACKGROUND_SLIDESHOW.overlay_opacity,
    modules: Array.from(new Set(modules))
  };
};

export const isStockBackgroundEnabledForModule = (
  settings: CompanyStockBackgroundSlideshow | undefined,
  moduleId: StockInventoryModuleId
): boolean => Boolean(settings?.enabled && settings.images.length > 0 && settings.modules.includes(moduleId));
