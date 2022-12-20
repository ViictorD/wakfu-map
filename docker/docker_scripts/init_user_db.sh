#!/bin/bash
set -e

# Create new user and database
psql --username "postgres" <<-EOSQL
	CREATE USER wakfu WITH PASSWORD '${DB_WAKFU_PASSWORD}';
	CREATE DATABASE wakfu;
	GRANT ALL PRIVILEGES ON DATABASE wakfu TO wakfu;
	GRANT SELECT ON ALL TABLES IN SCHEMA public TO wakfu;
	\c wakfu
	CREATE EXTENSION postgis;
EOSQL

# Create tables
psql --username "wakfu" --dbname "wakfu" <<-EOSQL
	CREATE TABLE teleporters (
		map_id integer NOT NULL,
		geog_origin geometry,
		dest_map_id integer NOT NULL,
		geog_dest geometry
	);
	CREATE TABLE map_data (
		map_id integer NOT NULL,
		min_zoom smallint NOT NULL,
		max_zoom smallint NOT NULL,
		width integer NOT NULL,
		height integer NOT NULL,
		is_indoor boolean DEFAULT FALSE
	);
	CREATE TABLE paper_teleporters (
		map_id integer NOT NULL,
		marker_name_geog geometry,
		polygon_hover_geog geometry,
		circle_hover_geog geometry,
		circle_radius smallint,
		dest_map_id integer NOT NULL
	);
	CREATE TABLE chests (map_id integer NOT NULL, geog geometry);
	CREATE TYPE i18n_content_type AS ENUM (
		'map_id',
		'dungeon_id',
		'ambiance_id',
		'monster_id',
		'skill_id',
		'item_id',
		'npc_id'
	);
	CREATE TABLE i18n_fr (
		type i18n_content_type NOT NULL,
		id integer NOT NULL,
		data text,
		data_tokens TSVECTOR
	);
	CREATE TABLE i18n_en (
		type i18n_content_type,
		id integer NOT NULL,
		data text,
		data_tokens TSVECTOR
	);
	CREATE TABLE dungeons (
		dungeon_id integer NOT NULL,
		min_level integer NOT NULL,
		map_id integer NOT NULL,
		dest_map_id integer NOT NULL
	);
	CREATE TABLE territories (
		map_id integer NOT NULL,
		ambiance_id integer NOT NULL,
		monster_families integer[],
		resources integer[],
		min_level integer NOT NULL,
		max_level integer NOT NULL,
		polygon_geog geometry NOT NULL
	);
	CREATE TABLE monsters (
		monster_id integer NOT NULL,
		family_id integer NOT NULL,
		min_level integer NOT NULL,
		max_level integer NOT NULL,
		gfx_id integer NOT NULL
	);
	CREATE TABLE resources (
		resource_id integer NOT NULL,
		skill_id smallint NOT NULL,
		collect_item_id integer NOT NULL,
		level smallint NOT NULL,
		gfx_id integer NOT NULL
	);
	CREATE TABLE npcs (
		map_id integer NOT NULL,
		type integer NOT NULL,
		min_level integer NOT NULL,
		max_level integer NOT NULL,
		geog geometry NOT NULL
	);
	
EOSQL

# Dump .sql files into tables
for f in /tmp/sql_dump/*.sql
do
	psql --username wakfu < "$f"
done