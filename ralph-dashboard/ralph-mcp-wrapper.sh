#!/bin/bash
# Wrapper script for Ralph MCP server
# Ensures the server can find its modules regardless of current directory

export PYTHONPATH="/home/kev/Documents/lab/brainstorming/free-ralph-context:$PYTHONPATH"
export RALPH_DATA_DIR="/home/kev/.ralph"
cd /home/kev/Documents/lab/brainstorming/free-ralph-context
exec /usr/bin/python3 -m ralph.mcp.server "$@"
