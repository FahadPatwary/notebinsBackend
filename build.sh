#!/bin/bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Make sure dist directory exists
mkdir -p dist 