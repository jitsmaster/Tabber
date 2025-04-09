# Changelog

All notable changes to the Tabber extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Future features and improvements will be listed here

## [0.1.0] - 2025-04-09

### Added
- Initial release of Tabber extension
- Core space-to-tab conversion algorithm with configurable tab size
- Command to convert spaces to tabs (`Tabber: Convert Spaces to Tabs`)
- Command to format document and convert indentation (`Tabber: Format Document and Convert to Tabs`)
- Command to analyze document indentation (`Tabber: Analyze Document Indentation`)
- Command to open extension settings (`Tabber: Configure Extension Settings`)
- Keyboard shortcuts for quick access:
  - `Ctrl+Alt+T` (`Cmd+Alt+T` on Mac) to convert spaces to tabs
  - `Ctrl+Alt+Shift+T` (`Cmd+Alt+Shift+T` on Mac) to format document and convert to tabs
- Status bar integration showing indentation type and issues
- Format-on-save option for automatic conversion
- Configuration options:
  - Tab size (default: 4 spaces)
  - Format on save toggle
  - Language exclusion/inclusion lists
  - VS Code settings integration
  - Empty line indentation preservation
  - Document analysis on open

### Technical
- Content preservation system for strings, comments, and regular expressions
- Indentation analysis tools to detect mixed indentation and patterns
- Integration with VS Code's native formatters
- Comprehensive testing framework
- Error handling and notification system

## Template for Future Releases

## [x.y.z] - YYYY-MM-DD

### Added
- New features and capabilities added in this release

### Changed
- Changes to existing functionality

### Deprecated
- Features that will be removed in an upcoming release

### Removed
- Features removed in this release

### Fixed
- Bug fixes

### Security
- Security improvements and vulnerability fixes

### Technical
- Technical implementation details, refactoring, etc.

## How to Update the Changelog

1. Add a new version section at the top of the file (below Unreleased)
2. Move relevant entries from Unreleased to the new version
3. Add the release date
4. Add all notable changes, organized by type (Added, Changed, etc.)
5. For each change, provide a brief description that helps users understand the impact

[Unreleased]: https://github.com/yourusername/tabber/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yourusername/tabber/releases/tag/v0.1.0