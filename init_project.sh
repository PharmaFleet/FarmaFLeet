#!/bin/bash

# PharmaFleet Project Initialization Script

echo "Initializing PharmaFleet Project..."

# Create Directory Structure
echo "Creating directories..."
mkdir -p backend/app/{api,core,models,schemas,services}
mkdir -p backend/tests
mkdir -p frontend/{public,src}
mkdir -p mobile/android
mkdir -p .github/workflows

# Create Backend Placeholders
echo "Creating backend placeholders..."
touch backend/app/__init__.py
touch backend/app/main.py
touch backend/app/api/__init__.py
touch backend/app/core/__init__.py
touch backend/app/models/__init__.py
touch backend/app/schemas/__init__.py
touch backend/app/services/__init__.py
touch backend/tests/__init__.py

# Note: Dockerfiles, docker-compose.yml, environment files, and CI workflows
# are handled by the agent's file generation, but this script ensures the folder structure triggers.

# Initialize Git
if [ ! -d ".git" ]; then
    echo "Initializing Git repository..."
    git init
    
    # Create .gitignore
    echo "__pycache__/" >> .gitignore
    echo "*.pyc" >> .gitignore
    echo ".env" >> .gitignore
    echo "node_modules/" >> .gitignore
    echo "dist/" >> .gitignore
    echo ".idea/" >> .gitignore
    echo ".vscode/" >> .gitignore
    echo "venv/" >> .gitignore
else
    echo "Git already initialized."
fi

echo "Project structure created successfully."
echo "Don't forget to run 'docker-compose up --build' to start the services."
