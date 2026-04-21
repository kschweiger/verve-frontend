SHELL := /bin/zsh

.PHONY: help check check-harness check-links check-api check-agent-rules check-eslint-baseline type-check build lint-check lint-fix format-check format diff-distribution

help:
	@echo "Targets:"
	@echo "  make check                  - run the full agent harness gate"
	@echo "  make check-harness          - validate required harness docs"
	@echo "  make check-links            - validate local Markdown links"
	@echo "  make check-api              - validate generated OpenAPI summary freshness"
	@echo "  make check-agent-rules      - validate forbidden agent patterns"
	@echo "  make check-eslint-baseline  - validate no net-new ESLint issues"
	@echo "  make type-check             - run vue-tsc"
	@echo "  make build                  - run Vite production build"
	@echo "  make diff-distribution      - print source/test/docs/other diff counts"

check:
	@bun run check

check-harness:
	@bun run check:harness

check-links:
	@bun run check:links

check-api:
	@bun run check:api

check-agent-rules:
	@bun run check:agent-rules

check-eslint-baseline:
	@bun run check:eslint-baseline

type-check:
	@bun run type-check

build:
	@bun run build-only

lint-check:
	@bun run lint:check

lint-fix:
	@bun run lint:fix

format-check:
	@bun run format:check

format:
	@bun run format

diff-distribution:
	@bun run diff:distribution
