SHELL := /bin/zsh

.PHONY: help check type-check build lint-check lint-fix format-check format

help:
	@echo "Targets:"
	@echo "  make check         - check ESLint baseline, types, and production build"
	@echo "  make type-check    - run vue-tsc"
	@echo "  make build         - run Vite production build"
	@echo "  make lint-check    - check against existing ESLint debt"
	@echo "  make lint-fix      - run ESLint with fixes"
	@echo "  make format-check - check formatting"
	@echo "  make format       - apply formatting"

check:
	@bun run check

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
