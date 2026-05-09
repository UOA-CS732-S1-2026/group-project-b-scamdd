.PHONY: help dev install build clean

help:
	@echo "Available targets:"
	@echo "  make dev      Run frontend (5173) and backend (4000) together"
	@echo "  make install  pnpm install in client and server"
	@echo "  make build    Build both client and server"
	@echo "  make clean    Remove build output and node_modules"

dev:
	@echo "Starting backend on :4000 and frontend on :5173 — Ctrl-C to stop both"
	@trap 'kill 0' INT TERM EXIT; \
	 (cd server && pnpm dev) & \
	 (cd client && pnpm dev) & \
	 wait

install:
	cd server && pnpm install
	cd client && pnpm install

build:
	cd server && pnpm build
	cd client && pnpm build

clean:
	rm -rf server/dist server/node_modules
	rm -rf client/dist client/node_modules
