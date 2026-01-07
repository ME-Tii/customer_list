#!/bin/bash
echo "Starting build..."

# Remove any invisible characters and normalize encoding
find . -name "*.html" -o -name "*.js" -o -name "*.css" | while read file; do
    echo "Processing: $file"
    # Remove BOM, normalize spaces, and fix line endings
    sed -i '1s/^\xEF\xBB\xBF//' "$file"
    sed -i 's/\r$//' "$file"
    # Remove any trailing spaces
    sed -i 's/[[:space:]]*$//' "$file"
done

echo "Build complete!"