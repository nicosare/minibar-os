# MiniBar OS

## Требования
- Docker 20+ и Docker Compose V2
- 2 ГБ RAM
- 10 ГБ свободного места

## Установка

```bash
# 1. Установить Docker (если не установлен)
curl -fsSL https://get.docker.com | sudo sh

# 2. Распаковать архив
tar -xzf minibar-os.tar.gz
cd minibar-os

# 3. Настроить переменные
cp .env.example .env
nano .env  # изменить POSTGRES_PASSWORD

# 4. Запустить
docker compose up -d --build

# 5. Синхронизировать схему с БД
docker exec -it minibar-api sh -c "npx prisma db push --accept-data-loss"

# 6. Залить тестовые данные
cmd /c "docker exec -i minibar-db psql -U minibar -d minibar_db < backend\\prisma\\seed-data.sql"