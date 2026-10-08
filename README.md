# Minibar OS

Unified Minibar OS platform.

## Components

- `frontend/` — desktop web application
- `miniapp/` — VK Mini App for mobile
- `backend/` — common REST API
- `vk-proxy/` — VK API proxy for sending photos/messages
- PostgreSQL — common database

## Architecture

Desktop web and VK Mini App are independent clients of the same backend.

Neither client communicates directly with the other.

The backend is the single API layer and PostgreSQL is the common source of truth.

## Future

- VK Bot as another client of the same backend
