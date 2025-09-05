import React, { useCallback, useEffect, useRef, useState } from "react";
import { InteractionManager, Platform } from "react-native";

/**
 * Performance monitoring utilities
 */

// Debounce hook for performance optimization
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Throttle hook for performance optimization
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now());

  return useCallback(
    ((...args) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = Date.now();
      }
    }) as T,
    [callback, delay]
  );
}

// Intersection observer hook for lazy loading
export function useIntersectionObserver(
  elementRef: React.RefObject<any>,
  options: {
    threshold?: number;
    rootMargin?: string;
    freezeOnceVisible?: boolean;
  } = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Mock intersection observer for React Native
    // In a real implementation, you might use react-native-intersection-observer
    const observer = {
      observe: () => {
        // Simulate intersection based on component mount
        setIsIntersecting(true);
        if (!hasBeenVisible) {
          setHasBeenVisible(true);
        }
      },
      unobserve: () => {
        if (!options.freezeOnceVisible || !hasBeenVisible) {
          setIsIntersecting(false);
        }
      },
      disconnect: () => {},
    };

    observer.observe();

    return () => {
      observer.unobserve();
    };
  }, [elementRef, options.freezeOnceVisible, hasBeenVisible]);

  return { isIntersecting, hasBeenVisible };
}

// Memory usage monitoring
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = useState<{
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
    jsHeapSizeLimit?: number;
  }>({});

  useEffect(() => {
    const updateMemoryInfo = () => {
      if (Platform.OS === "web" && "memory" in performance) {
        const memory = (performance as any).memory;
        setMemoryInfo({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        });
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 5000);

    return () => clearInterval(interval);
  }, []);

  return memoryInfo;
}

// Performance timing utilities
export class PerformanceTimer {
  private startTime: number = 0;
  private marks: Map<string, number> = new Map();

  start(label?: string): void {
    this.startTime = Date.now();
    if (label) {
      this.marks.set(`${label}_start`, this.startTime);
    }
  }

  mark(label: string): void {
    this.marks.set(label, Date.now());
  }

  measure(startLabel: string, endLabel?: string): number {
    const startTime = this.marks.get(startLabel) || this.startTime;
    const endTime = endLabel ? this.marks.get(endLabel) : Date.now();
    return endTime - startTime;
  }

  end(label?: string): number {
    const endTime = Date.now();
    if (label) {
      this.marks.set(`${label}_end`, endTime);
    }
    return endTime - this.startTime;
  }

  clear(): void {
    this.marks.clear();
    this.startTime = 0;
  }

  getMarks(): Record<string, number> {
    return Object.fromEntries(this.marks);
  }
}

// Lazy component loader
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) {
  return React.lazy(() => {
    return new Promise((resolve) => {
      // Ensure the component loads after interactions are complete
      InteractionManager.runAfterInteractions(() => {
        importFunc().then(resolve);
      });
    });
  });
}

// Bundle size analyzer (development only)
export function analyzeBundleSize() {
  if (__DEV__) {
    const bundleSize = {
      // Mock bundle analysis - in real implementation you'd use tools like
      // react-native-bundle-visualizer or flipper-plugin-react-native-performance
      totalSize: 0,
      jsSize: 0,
      assetsSize: 0,
      breakdown: {} as Record<string, number>,
    };

    console.log("Bundle Analysis:", bundleSize);
    return bundleSize;
  }
  return null;
}

// Image optimization utilities
export const ImageOptimizer = {
  // Get optimized image source based on device capabilities
  getOptimizedSource: (
    baseUrl: string,
    width: number,
    height: number,
    quality: number = 80
  ) => {
    const devicePixelRatio = Platform.select({
      ios: 2, // Assume retina
      android: 2, // Assume high DPI
      web: window.devicePixelRatio || 1,
      default: 1,
    });

    const optimizedWidth = Math.round(width * devicePixelRatio);
    const optimizedHeight = Math.round(height * devicePixelRatio);

    // In a real implementation, you'd integrate with an image CDN
    return {
      uri: `${baseUrl}?w=${optimizedWidth}&h=${optimizedHeight}&q=${quality}&f=webp`,
      width: optimizedWidth,
      height: optimizedHeight,
    };
  },

  // Preload critical images
  preloadImages: async (imageUrls: string[]) => {
    const preloadPromises = imageUrls.map((url) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
    });

    try {
      await Promise.all(preloadPromises);
      console.log("Images preloaded successfully");
    } catch (error) {
      console.warn("Some images failed to preload:", error);
    }
  },
};

// Network optimization
export const NetworkOptimizer = {
  // Batch API requests
  batchRequests: <T>(
    requests: (() => Promise<T>)[],
    batchSize: number = 5,
    delay: number = 100
  ): Promise<T[]> => {
    return new Promise(async (resolve, reject) => {
      const results: T[] = [];

      try {
        for (let i = 0; i < requests.length; i += batchSize) {
          const batch = requests.slice(i, i + batchSize);
          const batchResults = await Promise.all(batch.map((req) => req()));
          results.push(...batchResults);

          // Add delay between batches to avoid overwhelming the server
          if (i + batchSize < requests.length) {
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }

        resolve(results);
      } catch (error) {
        reject(error);
      }
    });
  },

  // Request deduplication
  deduplicate: (() => {
    const cache = new Map<string, Promise<any>>();

    return <T>(key: string, requestFn: () => Promise<T>): Promise<T> => {
      if (cache.has(key)) {
        return cache.get(key)!;
      }

      const promise = requestFn().finally(() => {
        // Remove from cache after completion
        setTimeout(() => cache.delete(key), 1000);
      });

      cache.set(key, promise);
      return promise;
    };
  })(),
};

// React Native specific optimizations
export const RNOptimizations = {
  // Optimize FlatList performance
  getFlatListOptimizations: (itemHeight?: number) => ({
    removeClippedSubviews: true,
    maxToRenderPerBatch: 10,
    updateCellsBatchingPeriod: 50,
    initialNumToRender: 10,
    windowSize: 10,
    ...(itemHeight && {
      getItemLayout: (data: any, index: number) => ({
        length: itemHeight,
        offset: itemHeight * index,
        index,
      }),
    }),
  }),

  // Optimize ScrollView performance
  getScrollViewOptimizations: () => ({
    removeClippedSubviews: true,
    scrollEventThrottle: 16,
    showsVerticalScrollIndicator: false,
    showsHorizontalScrollIndicator: false,
  }),

  // Optimize TextInput performance
  getTextInputOptimizations: () => ({
    autoCorrect: false,
    autoCapitalize: "none",
    spellCheck: false,
    clearButtonMode: "while-editing",
  }),
};
