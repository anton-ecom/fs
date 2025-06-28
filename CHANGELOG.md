# Changelog

All notable changes to this project will be documented in this file.

Most patterns are highly stable, no changes will be made to existing methods, only extended, but I will adhere to adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) just in case. You can safely upgrade, but as always, RTFM (read changelog for major releases).


# [2.1.4] - 2025-06-21

### Changed:

- RealtimeChannel now use publish, instead of emit. Emit is depricated.

# [2.1.3] - 2025-06-21 {# [2.1.3] - 2025-06-21  ### Added:  - EventChannel - EventBrokerServer}

### Added:

- EventChannel
- EventBrokerServer

### Changed

- RealtimeServer now comes with a TShape

# [2.1.2] - 2025-06-20

Fixed:

- IIndexer now exported correctly

# [2.1.1] - 2025-06-18

### Added

- Storage pattern (promises/result)
- Indexer pattern (promises/result)
- Documentation for APIResponse
- Now RealtimeClient and RealtimeServer have separate importable implementations, check them out [https://github.com/sinthetism/realtime](https://github.com/sinthetism/realtime)

## [2.1.0] - 2025-06-17

### Added:

- Realtime Server
- Realtime Client (streamlined version of RealtimeService)
- APIResponse, APIError patterns
- Many Realtime examples: Realtime Client (NATS, Websocket), Realtime Server (NATS, Websocket)

## [2.0.3] - 2025-06-14

### Added

- Command Bus pattern
- Result combine method

# Changed

- Improved documentation
- Better tests
- 

## [2.0.1] - 2025-05-28

**Major release**

### Added

Experimential patterns - no part of the build, up for discussion

- AIOperator
- AdaptiveResilience
- PropagatedContext
- Intention
- Progressive
- SemanticGateways

Not for production.

### Changed

- Improved tests
- Refactored
- Streamlined based on feedback (nothing broken)

## [1.1.7] - 2025-05-21

### Added

- Realtime Serice Pattern

## [1.1.6] - 2025-05-15

### Added

- Observer Pattern
- Event Emitter Pattern
- Result Extensions now available
- Documentation and example implementation

## Changed

- Moved all the working examples to tests.
- Moved examples to docs forlder for referencing from docs.

## [1.1.3] - 2025-05-10

### Added

- Mediator pattern
- Documentation and example implementation

### Changed

- Folder structure for examples

## [1.1.2] - 2025-05-02

### Added

- Guard pattern

### Changed

- Improved type safety in ValueObject.equals method

## [1.1.1] - 2025-04-15

### Added

- ValueObject pattern
- Mapper pattern

### Fixed

- Fixed Result.combine to properly handle empty arrays

## [1.0.0] - 2025-04-01

### Added

- Initial release with Result,
- Comprehensive documentation and examples
