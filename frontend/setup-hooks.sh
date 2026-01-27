#!/bin/sh
# Setup script for git hooks

# Create hooks directory if it doesn't exist
mkdir -p .git/hooks

# Copy pre-commit hook to .git/hooks
if [ -f ".hooks/pre-commit" ]; then
    cp .hooks/pre-commit .git/hooks/pre-commit
    chmod +x .git/hooks/pre-commit
    echo "✅ Pre-commit hook installed successfully!"
else
    echo "❌ Pre-commit hook not found in .hooks directory"
    exit 1
fi

# Make sure the hook is executable
chmod +x .git/hooks/pre-commit

echo "🎉 Git hooks setup complete!"
echo ""
echo "The following checks will run before each commit:"
echo "  • Run tests with coverage (80% threshold)"
echo "  • Run ESLint"
echo "  • Check for console.log statements"
echo "  • Verify package-lock.json is up to date"