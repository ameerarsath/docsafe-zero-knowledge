# Docker Configuration

Docker Compose files have been moved to this directory for better organization.

## Running Commands

From the project root, use:

```bash
# Development
docker-compose -f config/docker/docker-compose.yml up -d

# Production  
docker-compose -f config/docker/docker-compose.prod.yml up -d
```

Or from this directory:

```bash
# Development
docker-compose -f docker-compose.yml up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

All paths in the Docker Compose files have been updated to work from this new location.