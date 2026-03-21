## Contributing

### Prerequisites
- [Deno](https://deno.land/) v2+
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose

### Setup
```bash
git clone https://github.com/udleinati/redirect.center.git
cd redirect.center
docker compose up
```

### Code style
- TypeScript strict mode
- Use `.editorconfig` settings

### Running tests
```bash
cd packages/redirect
deno task test
```

### Project structure
This is a Deno workspace monorepo. See [CLAUDE.md](CLAUDE.md) for detailed architecture.
