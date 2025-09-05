#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Image optimization script for production builds
 * This script analyzes and optimizes images in the assets directory
 */

const ASSETS_DIR = path.join(__dirname, '../assets');
const SUPPORTED_FORMATS = ['.png', '.jpg', '.jpeg', '.webp'];
const MAX_FILE_SIZE = 500 * 1024; // 500KB

function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeImages(dir) {
  const results = {
    totalFiles: 0,
    totalSize: 0,
    largeFiles: [],
    recommendations: [],
  };

  function scanDirectory(currentDir) {
    const files = fs.readdirSync(currentDir);

    files.forEach(file => {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        scanDirectory(filePath);
      } else {
        const ext = path.extname(file).toLowerCase();
        if (SUPPORTED_FORMATS.includes(ext)) {
          const size = getFileSize(filePath);
          results.totalFiles++;
          results.totalSize += size;

          if (size > MAX_FILE_SIZE) {
            results.largeFiles.push({
              path: path.relative(ASSETS_DIR, filePath),
              size: formatBytes(size),
              sizeBytes: size,
            });
          }
        }
      }
    });
  }

  if (fs.existsSync(dir)) {
    scanDirectory(dir);
  }

  return results;
}

function generateRecommendations(analysis) {
  const recommendations = [];

  if (analysis.largeFiles.length > 0) {
    recommendations.push({
      type: 'size',
      message: `Found ${analysis.largeFiles.length} large image(s) that should be optimized:`,
      files: analysis.largeFiles,
      solution: 'Consider using WebP format, reducing dimensions, or compressing these images.',
    });
  }

  if (analysis.totalSize > 5 * 1024 * 1024) { // 5MB
    recommendations.push({
      type: 'total',
      message: `Total image assets size is ${formatBytes(analysis.totalSize)}`,
      solution: 'Consider implementing lazy loading and image optimization.',
    });
  }

  return recommendations;
}

function printReport(analysis) {
  console.log('\n📊 Image Asset Analysis Report');
  console.log('================================');
  console.log(`Total image files: ${analysis.totalFiles}`);
  console.log(`Total size: ${formatBytes(analysis.totalSize)}`);
  
  if (analysis.largeFiles.length > 0) {
    console.log('\n⚠️  Large Files (>500KB):');
    analysis.largeFiles.forEach(file => {
      console.log(`  • ${file.path} (${file.size})`);
    });
  }

  const recommendations = generateRecommendations(analysis);
  
  if (recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    recommendations.forEach((rec, index) => {
      console.log(`\n${index + 1}. ${rec.message}`);
      if (rec.files) {
        rec.files.forEach(file => {
          console.log(`   • ${file.path} (${file.size})`);
        });
      }
      console.log(`   Solution: ${rec.solution}`);
    });
  } else {
    console.log('\n✅ All images are optimized!');
  }

  console.log('\n🚀 Performance Tips:');
  console.log('• Use WebP format for better compression');
  console.log('• Implement lazy loading for non-critical images');
  console.log('• Use appropriate image dimensions for different screen densities');
  console.log('• Consider using vector graphics (SVG) for icons and simple graphics');
  console.log('• Use image CDN for dynamic resizing and optimization');
}

// Run the analysis
console.log('🔍 Analyzing image assets...');
const analysis = analyzeImages(ASSETS_DIR);
printReport(analysis);

// Exit with error code if there are issues
if (analysis.largeFiles.length > 0 || analysis.totalSize > 10 * 1024 * 1024) {
  console.log('\n❌ Image optimization needed before production build');
  process.exit(1);
} else {
  console.log('\n✅ Images are ready for production');
  process.exit(0);
}