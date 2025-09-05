const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Force Metro to resolve (sub)dependencies only from the `nodeModulesPaths`
config.resolver.disableHierarchicalLookup = true;

// 4. Bundle size optimization
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    // Enable advanced minification
    mangle: {
      keep_fnames: true,
    },
    output: {
      ascii_only: true,
      quote_keys: false,
      wrap_iife: true,
    },
    sourceMap: false,
    toplevel: false,
    warnings: false,
    parse: {
      html5_comments: false,
      shebang: false,
    },
    compress: {
      arguments: false,
      arrows: true,
      booleans_as_integers: false,
      booleans: true,
      collapse_vars: true,
      comparisons: true,
      computed_props: true,
      conditionals: true,
      dead_code: true,
      directives: true,
      drop_console: true, // Remove console.log in production
      drop_debugger: true,
      evaluate: true,
      expression: false,
      global_defs: {},
      hoist_funs: false,
      hoist_props: true,
      hoist_vars: false,
      if_return: true,
      inline: true,
      join_vars: true,
      keep_fargs: true,
      keep_fnames: false,
      keep_infinity: false,
      loops: true,
      negate_iife: true,
      properties: true,
      pure_getters: 'strict',
      pure_funcs: null,
      reduce_funcs: true,
      reduce_vars: true,
      sequences: true,
      side_effects: true,
      switches: true,
      top_retain: null,
      typeofs: true,
      unsafe: false,
      unsafe_arrows: false,
      unsafe_comps: false,
      unsafe_Function: false,
      unsafe_math: false,
      unsafe_symbols: false,
      unsafe_methods: false,
      unsafe_proto: false,
      unsafe_regexp: false,
      unsafe_undefined: false,
      unused: true,
    },
  },
};

// 5. Asset optimization
config.resolver.assetExts = [
  ...config.resolver.assetExts,
  'webp', // Add WebP support for better image compression
];

// 6. Platform-specific extensions for better tree shaking
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// 7. Enable experimental features for better performance
config.transformer.experimentalImportSupport = true;
config.transformer.inlineRequires = true;

// 8. Optimize for production builds
if (process.env.NODE_ENV === 'production') {
  // Remove development-only code
  config.transformer.transform = {
    ...config.transformer.transform,
    experimentalImportSupport: true,
    inlineRequires: true,
  };
  
  // Enable aggressive caching
  config.cacheStores = [
    {
      name: 'filesystem',
      options: {
        cacheDirectory: path.join(projectRoot, '.metro-cache'),
      },
    },
  ];
}

module.exports = config;