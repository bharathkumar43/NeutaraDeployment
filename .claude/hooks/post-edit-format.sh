#!/bin/bash
# PostToolUse hook — logs file edits for audit trail
# Receives tool name and file path as arguments

TOOL_NAME="$1"
FILE_PATH="$2"
LOG_FILE=".claude/edit-log.txt"

if [[ "$TOOL_NAME" == "Edit" || "$TOOL_NAME" == "Write" ]]; then
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $TOOL_NAME: $FILE_PATH" >> "$LOG_FILE"
fi

exit 0
