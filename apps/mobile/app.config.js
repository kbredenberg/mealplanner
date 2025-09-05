const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export default {
  expo: {
    name: "Meal Planner",
    slug: "meal-planner",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "meal-planner",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.mealplanner.app",
      // Performance optimizations
      jsEngine: "hermes",
      // Enable bitcode for better optimization
      bitcode: IS_PRODUCTION,
      // App thinning
      appStoreUrl: "https://apps.apple.com/app/meal-planner/id123456789",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.mealplanner.app",
      // Performance optimizations
      jsEngine: "hermes",
      // Enable proguard for code obfuscation and optimization
      proguardDebugVariant: "release",
      // App bundle optimization
      enableProguardInReleaseBuilds: IS_PRODUCTION,
      enableSeparateBuildPerCPUArchitecture: IS_PRODUCTION,
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#ffffff",
          image: "./assets/images/splash-icon.png",
          dark: {
            image: "./assets/images/splash-icon.png",
            backgroundColor: "#000000"
          },
          imageWidth: 200
        }
      ],
      // Performance monitoring
      ...(IS_PRODUCTION ? [
        [
          "@react-native-async-storage/async-storage",
          {
            // Optimize storage for production
            enableBackgroundSync: true,
          }
        ]
      ] : []),
    ],
    experiments: {
      typedRoutes: true,
      // Enable new architecture features
      turboModules: true,
      newArchEnabled: true,
    },
    extra: {
      router: {
        origin: false
      },
      eas: {
        projectId: "your-project-id-here"
      },
      // Environment-specific configurations
      apiUrl: IS_PRODUCTION 
        ? "https://your-api-domain.com" 
        : "http://localhost:3001",
      wsUrl: IS_PRODUCTION 
        ? "wss://your-api-domain.com" 
        : "ws://localhost:3001",
      enableAnalytics: IS_PRODUCTION,
      enableCrashReporting: IS_PRODUCTION,
    },
    // Build optimizations
    optimization: {
      // Tree shaking
      treeShaking: IS_PRODUCTION,
      // Code splitting
      splitChunks: IS_PRODUCTION,
      // Minification
      minify: IS_PRODUCTION,
    },
    // Performance monitoring
    updates: {
      enabled: IS_PRODUCTION,
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 5000,
    },
  }
};