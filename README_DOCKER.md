# Qwen Code with Ollama Support

This repository contains the Qwen Code project with Ollama support, allowing you to run Qwen Code with locally hosted models using Ollama.

## Features

- Runs Qwen Code with Ollama support in an isolated Docker container
- Pre-configured Ollama service
- Easy to use with docker-compose

## Prerequisites

- Docker installed on your system
- Docker Compose installed on your system

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/legido-ai-workspace/qwen-code-ollama.git
   cd qwen-code-ollama
   ```

2. Build and start the containers:
   ```bash
   docker-compose up -d
   ```

## Usage

### Run Qwen Code
```bash
docker-compose exec qwen-code-ollama qwen
```

### Check version
```bash
docker-compose exec qwen-code-ollama qwen -v
```

### Pull a model (example with qwen3-coder)
```bash
docker-compose exec ollama ollama pull qwen3-coder
```

### Set environment variables for Ollama
```bash
docker-compose exec qwen-code-ollama bash
export OLLAMA_HOST=http://ollama:11434
export OLLAMA_MODEL=qwen3-coder
qwen
```

## Configuration

You can modify the `docker-compose.yml` file to change:
- Port mappings
- Volume mounts
- Environment variables

## Data Persistence

Data is persisted in the `./data` directory which is mounted to `/home/node/.qwen` in the container.

## Troubleshooting

If you encounter any issues:
1. Check that Docker is running properly
2. Ensure ports are not already in use
3. Check the container logs:
   ```bash
   docker-compose logs qwen-code-ollama
   ```

## License

This project is licensed under the Apache License 2.0 - see the LICENSE file for details.