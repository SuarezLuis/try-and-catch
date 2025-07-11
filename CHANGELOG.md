# Changelog

## [5.0.0] - 2025-07-11

### Major Features Added
- **NEW**: `tryAndCatchAsync()` - Explicitly async function to avoid linter warnings
- **ENHANCED**: Improved TypeScript overloads for better type inference
- **FIXED**: Timer leaks in retry mechanisms with proper cleanup and `.unref()`
- **IMPROVED**: Memory management with configurable error history limits
- **ADDED**: Concurrency protection utilities (mutex, semaphore)
- **ENHANCED**: JSON-safe error serialization with circular reference protection
- **OPTIMIZED**: Performance monitoring and timeout controls
- **STRENGTHENED**: Resource-safe cleanup that never breaks main logic

### Breaking Changes
- This is a major version due to significant API enhancements and new features
- All existing code continues to work (backward compatible)
- New `tryAndCatchAsync` provides cleaner async experience

### Test Coverage
- 48 comprehensive tests covering all features and edge cases
- Zero dependencies maintained
- Full TypeScript support with intelligent inference

### Documentation
- Complete README overhaul with modern structure
- Clear migration guide and real-world examples
- Comprehensive API reference

## [4.1.1] - Previous Version
- Timer leak fixes
- Documentation improvements

## [4.1.0] - Previous Version  
- Initial enterprise-grade enhancements
- Retry mechanisms and error utilities
