#!/bin/bash
echo "Building..."
find . -name "*.html" -o -name "*.js" -o -name "*.css" | while read file; do
    sed -i '1s/^\xEF\xBB\xBF//' "$file"
    sed -i 's/\r$//' "$file"
done
echo "Done"