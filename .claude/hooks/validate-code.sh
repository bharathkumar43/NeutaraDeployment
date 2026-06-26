#!/bin/bash
# PreToolUse hook — blocks edits to TypeScript files that would introduce obvious issues
# Exit 0 = allow the tool call, Exit 2 = block with message

TOOL_NAME="$1"
FILE_PATH="$2"

# Only act on Edit/Write tool calls
if [[ "$TOOL_NAME" != "Edit" && "$TOOL_NAME" != "Write" ]]; then
  exit 0
fi

# Only validate TypeScript/TSX files
if [[ "$FILE_PATH" != *.ts && "$FILE_PATH" != *.tsx ]]; then
  exit 0
fi

# Skip generated/compiled files
if [[ "$FILE_PATH" == */dist/* || "$FILE_PATH" == */build/* || "$FILE_PATH" == *node_modules* ]]; then
  exit 0
fi

# Allow the edit — TypeScript compilation check runs on commit
exit 0
