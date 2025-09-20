#!/bin/bash

# Test script for qwen-code-ollama Docker setup

echo "Testing qwen-code-ollama Docker setup..."

# Check if docker is installed
if ! command -v docker &> /dev/null
then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null
then
    echo "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if the docker containers are running
if docker-compose ps | grep -q "qwen-code-ollama"; then
    echo "qwen-code-ollama container is running."
else
    echo "qwen-code-ollama container is not running. Starting containers..."
    docker-compose up -d
fi

# Wait a moment for containers to start
sleep 5

# Test qwen-code-ollama version
echo "Testing qwen-code-ollama version:"
docker-compose exec qwen-code-ollama qwen --version

# Test ollama connection
echo "Testing Ollama connection:"
docker-compose exec qwen-code-ollama curl -s http://ollama:11434/api/tags

echo "Docker setup test completed."