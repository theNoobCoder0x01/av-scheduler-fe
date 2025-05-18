#!/bin/bash

# This script starts VLC with the provided arguments

VLC_PATH="vlc" # Default VLC path

# Adjust VLC path for macOS
if [[ "$(uname)" == "Darwin" ]]; then
  VLC_PATH="/Applications/VLC.app/Contents/MacOS/VLC"
fi

# Check if VLC is installed
if ! command -v "$VLC_PATH" &> /dev/null; then
  echo "Error: VLC is not installed or not found at $VLC_PATH"
  exit 1
fi

# Start VLC with the provided arguments
"$VLC_PATH" "$@"
