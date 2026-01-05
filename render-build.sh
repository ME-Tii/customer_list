#!/bin/bash
# Render build script to normalize line endings
set -e  # Exit on any error

echo "Starting build process..."

# Make sure we're in the right directory
ls -la

echo "Normalizing line endings for deployment..."

# Normalize line endings in HTML, JS, and CSS files
find . -name "*.html" -o -name "*.js" -o -name "*.css" | while IFS= read -r file; do
    echo "Processing: $file"
    # Convert Windows line endings to Unix
    if [[ -f "$file" ]]; then
        sed -i.bak 's/\r$//' "$file" && rm -f "$file.bak"
    fi
done

echo "Line ending normalization complete!"

# Check if server file exists
if [[ -f "server_fixed.py" ]]; then
    echo "Server file found: server_fixed.py"
else
    echo "Warning: server_fixed.py not found"
fi

echo "Build completed successfully!"