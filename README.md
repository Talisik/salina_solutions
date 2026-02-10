# salina-vad-helpers

Helper functions for Salina VAD (Voice Activity Detection) desktop application.

## Features
- Resource validation for VAD worker files.
- SQLite database helpers for task queuing and status tracking.
- Shared TypeScript interfaces.

## Installation
```bash
npm install salina-vad-helpers
```

## Usage
Refer to the migration guide for detailed usage instructions.

## Testing

Run tests with:
```bash
npm test
```

Run tests once (CI mode):
```bash
npm run test:run
```

### Testing Strategy

- **Database tests**: Mock `better-sqlite3` to isolate database logic without requiring a real database connection
- **Resource validation tests**: Use real file system operations with temporary directories for reliable testing
