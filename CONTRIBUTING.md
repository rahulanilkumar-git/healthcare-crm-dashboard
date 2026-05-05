# Contributing

## Local workflow

1. Create a feature branch.
2. Run the stack with `docker-compose up -d`.
3. Apply backend migrations with `docker-compose exec laravel php artisan migrate --seed`.
4. Run backend tests with `docker-compose exec laravel php artisan test`.
5. Run frontend checks with `docker-compose exec frontend npm test`.

## Code style

- Keep API responses JSON-only.
- Add validation rules for every write endpoint.
- Prefer focused React components and keep API access inside `src/services`.
- Do not commit `.env`, `vendor`, `node_modules`, or build output.
