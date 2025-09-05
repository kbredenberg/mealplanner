import React, { useState, useCallback, memo } from "react";
import { View, StyleSheet, ViewStyle, ImageStyle } from "react-native";
import { Image } from "expo-image";
import { useIntersectionObserver, ImageOptimizer } from "../../lib/performance";

interface OptimizedImageProps {
  source: string | { uri: string };
  width: number;
  height: number;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  placeholder?: string;
  quality?: number;
  lazy?: boolean;
  onLoad?: () => void;
  onError?: (error: any) => void;
  alt?: string;
  priority?: boolean;
}

const OptimizedImage = memo<OptimizedImageProps>(
  ({
    source,
    width,
    height,
    style,
    containerStyle,
    placeholder,
    quality = 80,
    lazy = true,
    onLoad,
    onError,
    alt,
    priority = false,
  }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const imageRef = React.useRef<View>(null);

    // Use intersection observer for lazy loading
    const { isIntersecting } = useIntersectionObserver(imageRef, {
      threshold: 0.1,
      freezeOnceVisible: true,
    });

    // Determine if image should load
    const shouldLoad = !lazy || priority || isIntersecting;

    // Get optimized image source
    const optimizedSource = React.useMemo(() => {
      if (typeof source === "string") {
        return ImageOptimizer.getOptimizedSource(
          source,
          width,
          height,
          quality
        );
      }
      return source;
    }, [source, width, height, quality]);

    const handleLoad = useCallback(() => {
      setIsLoaded(true);
      onLoad?.();
    }, [onLoad]);

    const handleError = useCallback(
      (error: any) => {
        setHasError(true);
        onError?.(error);
      },
      [onError]
    );

    const imageStyles = [
      styles.image,
      {
        width,
        height,
        opacity: isLoaded ? 1 : 0,
      },
      style,
    ];

    const placeholderStyles = [
      styles.placeholder,
      {
        width,
        height,
        opacity: isLoaded ? 0 : 1,
      },
    ];

    return (
      <View ref={imageRef} style={[styles.container, containerStyle]}>
        {/* Placeholder */}
        {!isLoaded && !hasError && (
          <View style={placeholderStyles}>
            {placeholder && (
              <Image
                source={{ uri: placeholder }}
                style={styles.placeholderImage}
                contentFit="cover"
              />
            )}
          </View>
        )}

        {/* Main image */}
        {shouldLoad && !hasError && (
          <Image
            source={optimizedSource}
            style={imageStyles}
            contentFit="cover"
            onLoad={handleLoad}
            onError={handleError}
            placeholder={placeholder}
            transition={200}
            cachePolicy="memory-disk"
            priority={priority ? "high" : "normal"}
            accessible={!!alt}
            accessibilityLabel={alt}
          />
        )}

        {/* Error state */}
        {hasError && (
          <View style={[styles.errorContainer, { width, height }]}>
            <View style={styles.errorPlaceholder} />
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "hidden",
  },
  image: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  placeholder: {
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
  },
  errorContainer: {
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  errorPlaceholder: {
    width: 40,
    height: 40,
    backgroundColor: "#ddd",
    borderRadius: 4,
  },
});

OptimizedImage.displayName = "OptimizedImage";

export default OptimizedImage;
