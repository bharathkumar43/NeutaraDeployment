#!/bin/bash
# PreToolUse hook — blocks direct writes to sensitive files without user confirmation
# Exit 0 = allow, Exit 2 = block with message to user

TOOL_NAME="$1"
FILE_PATH="$2"

# Only block Edit/Write tool calls
if [[ "$TOOL_NAME" != "Edit" && "$TOOL_NAME" != "Write" ]]; then
  exit 0
fi

BLOCKED_PATTERNS=(
  ".env"
  "docker-compose.yml"
  "backend/src/database/schema.sql"
  ".claude/settings.local.json"
)

for pattern in "${BLOCKED_PATTERNS[@]}"; do
  if [[ "$FILE_PATH" == *"$pattern"* ]]; then
    echo "BLOCKED: Direct edits to '$pattern' are restricted."
    echo "This file contains sensitive configuration or schema definitions."
    echo "If this change is intentional, confirm with the user before proceeding."
    exit 2
  fi
done

exit 0
