FROM postgis/postgis:14-3.3

COPY ./docker_scripts/init_user_db.sh /docker-entrypoint-initdb.d/init_user_db.sh
COPY ./sql_dump/* /tmp/sql_dump/