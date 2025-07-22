# Changelog

All notable changes to this project will be documented in this file.

Most patterns are highly stable, no changes will be made to existing methods, only extended, but I will adhere to adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) just in case. You can safely upgrade, but as always, RTFM (read changelog for major releases).


## [1.0.6] - 2025-07-21

### FIXED

- FileSYstem and ASyncFilesystem are now following Unit Architecture
- Changed dna ids - fs - for sync, and fs-async  for async operations
- Created fs-async full test suite.

## [1.0.5] - 2025-07-14

### Changed

- Updated dependencies

## [1.0.4] - 2025-07-12

### Changed

- Added FileSystem, AsyncFileSystem Units
- FS pattern - factory for building complex filesystem flows


## [1.0.2] - 2025-07-07

### Changed

- IFileSystem is moved from patterns


## [1.0.1] - 2025-06-29

### Added

- AnalyticsFileSystem
- CachedFileSystem
- GithubFileSystem
- JsonFileSystem
- S3FileSystem
- WithIdFileSystem

## [1.0.0] - 2025-04-01

### Added

- NodeFileSystem
- MemFileSystem
- Observable
