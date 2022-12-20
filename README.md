# Wakfu Map

## Requirement
- Docker And Docker Compose
- NodeJs/Npm

## Setup
1. Run [wakfu-png](https://github.com/ViictorD/wakfu-png) (Private repo) and get the maps you want.
2. Run [wakfu-png-to-tiles](https://github.com/ViictorD/wakfu-png-to-tiles).
3. Run [wakfu-data-sql](https://github.com/ViictorD/wakfu-data-sql) (Private repo).
4. Copy the output of `wakfu-png-to-tiles` to website/public/img/tiles.
5. Copy the sql files of the output folder of `wakfu-data-sql` to docker/sql_dump.

## Using
1. And an .env file at the root location with this variables:
	```
	DB_MASTER_PASSWORD=
	DB_WAKFU_PASSWORD=
	DB_USER=
	DB_HOST=wakfu_postgresql
	DB_PORT=
	DB_NAME=
	APP_PORT=5001
	REDIS_HOST=wakfu_redis
	REDIS_PORT=6379
	REDIS_PASSWORD=
	```
2. Backend
	```
	sh docker/start.sh
	```

	This will create 3 docker containers, a Redis instance, a PostgreSQL instance and a Nodejs instance running the website api.
3. Frontend
	```
	cd website && npm i
	npm run serve # Build developpement bundle and run local http server
	OR
	npm run build # Build production bundle
	```

*This project does not include any Ankama Games authored assets, because of that the website will miss many assets needed to run properly*