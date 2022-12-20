# Build and run containers

sudo docker build -t wakfu_postgresql .
sudo docker-compose --env-file ../.env up -d
