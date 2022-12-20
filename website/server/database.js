const { min } = require('joi/lib/types/array')
const postgres = require('pg')
const log = require('./logger')

const RANGE_LEVEL = [2, 8, 11, 20, 35, 50, 65, 80, 95, 110, 125, 140, 155, 170, 185, 200, 215, 230]

const client = new postgres.Client({
	user: process.env.DB_USER,
	host: process.env.DB_HOST,
	database: process.env.DB_NAME,
	password: process.env.DB_WAKFU_PASSWORD,
	port: process.env.DB_PORT
})

client.connect()
.then(() => {
	log.info(`Connected To ${client.database} at ${client.host}:${client.port}`)
})
.catch(log.error)

module.exports = {
	getAllMapIds: async () => {
		const query = `
			SELECT map_id
			FROM map_data
			WHERE map_id IS NOT NULL AND map_id > 0`
		const result = await client.query(query)
		return result.rows
	},

	getAllPaperMapIds: async () => {
		const query = `
			SELECT map_id
			FROM map_data
			WHERE map_id IS NOT NULL AND map_id < 0`
		const result = await client.query(query)
		return result.rows
	},

	getAllDungeonIds: async () => {
		const query = `
			SELECT id AS dungeon_id
			FROM i18n_fr
			WHERE type = 'dungeon_id' IS NOT NULL`
		const result = await client.query(query)
		return result.rows
	},

	getTeleporters: async (map_id) => {
		const query = `
			SELECT ST_AsGeoJSON(geog_origin), dest_map_id, ST_AsGeoJSON(geog_dest) AS dest_point
			FROM teleporters
			WHERE map_id = $1`
		const result = await client.query(query, [map_id])
		return result.rows
	},

	getPaperData: async (lang, map_id) => {
		const table_name = getI18nTableName(lang)
		const query = `
			SELECT ST_AsGeoJSON(marker_name_geog) AS marker_name,
				ST_AsGeoJSON(polygon_hover_geog) AS polygon,
				ST_AsGeoJSON(circle_hover_geog) AS circle,
				circle_radius,
				dest_map_id,
				data as name
			FROM paper_teleporters
			INNER JOIN ${table_name} ON paper_teleporters.dest_map_id = ${table_name}.id
			WHERE paper_teleporters.map_id = $1 AND ${table_name}.type = 'map_id'`
		const result = await client.query(query, [map_id])
		return result.rows
	},

	getMapData: async (lang, map_id) => {
		const table_name = getI18nTableName(lang)
		const query = `
			SELECT min_zoom, max_zoom, width, height, is_indoor, ${table_name}.data AS name
			FROM map_data
			LEFT JOIN ${table_name} ON map_data.map_id = ${table_name}.id
				AND ${table_name}.type = 'map_id'
			WHERE map_data.map_id = $1
			LIMIT 1`
		const result = await client.query(query, [map_id])
		return result.rows;
	},

	getMapChests: async (map_id) => {
		const query = `
			SELECT ST_AsGeoJSON(geog)
			FROM chests
			WHERE map_id = $1`
		const result = await client.query(query, [map_id])
		return result.rows;
	},

	getTerritories: async (lang, map_id) => {
		const table_name = getI18nTableName(lang)
		const query = `
			SELECT ambiance_id, min_level, max_level, ST_AsGeoJSON(polygon_geog), ${table_name}.data AS name
			FROM territories
			INNER JOIN ${table_name} ON ${table_name}.id = territories.ambiance_id
			WHERE territories.map_id = $1 AND ${table_name}.type = 'ambiance_id'`
		const result = await client.query(query, [map_id])
		return result.rows
	},

	search: async (lang, search_query, type = null, offset = 0) => {
		const full_lang = getFullLang(lang)
		const table_name = getI18nTableName(lang)

		// Split whitespaces
		params = search_query.split(/\s+/);

		// pop numbers from params
		let numbers = params.filter((param) => !isNaN(param) ).map((param) => parseInt(param))
		// remove numbers from params
		params = params.filter((param) => isNaN(param) )
		params = params.filter((param) => param.match(/[\wéÉèÈêÊàÀçÇùÙûÛ]+/))
		
		// add tsquery any to the end of each param and join them
		search_query = params.map((param) => `${param}:*` ).join(' & ')
		// search_query = params.join(' ')

		let dungeon_query = null
		let monster_query = null
		let zone_query = null
		let resource_query = null
		let npc_query = null

		if (numbers.length === 1) {
			const level = numbers[0]
			if (level >= 0 && level <= 30_000) {
				let index = RANGE_LEVEL.findIndex((value, index) => {
					return (RANGE_LEVEL[index - 1] || 2) < level && level <= value
				})
				const min_level = RANGE_LEVEL[index - 1] + 1 || 0
				const max_level = RANGE_LEVEL[index] || 2
				let min_resource_level = -1
				if (level >= 0 && level <= 145) {
					min_resource_level = level - level % 5
				}

				dungeon_query = `
				SELECT
					dungeons.dungeon_id,
					${table_name}.data AS name,
					dungeons.map_id,
					ST_AsGeoJSON(teleporters.geog_origin) AS point,
					min_level
				FROM (
						SELECT *
						FROM dungeons
						WHERE min_level = $1
						LIMIT 5 OFFSET $2
					) AS dungeons
				INNER JOIN teleporters ON dungeons.map_id = teleporters.map_id
					AND dungeons.dest_map_id = teleporters.dest_map_id
				INNER JOIN ${table_name} ON ${table_name}.id = dungeons.dungeon_id
					AND ${table_name}.type = 'dungeon_id'`

				const dungeon_promise = (type === null || type === 'dungeon') && min_level >= 3 ? client.query(dungeon_query, [min_level, offset]) : null

				monster_query = `
				SELECT
					monster_id,
					monsters.name,
					family_id,
					monsters.min_level,
					monsters.max_level,
					gfx_id,
					map_id,
					ambiance_id,
					${table_name}.data AS territory_name
				FROM (
					SELECT DISTINCT ON (monster_id)
						${table_name}.data AS name,
						monster_id,
						family_id,
						monsters.min_level,
						monsters.max_level,
						gfx_id
					FROM monsters
					INNER JOIN ${table_name} ON ${table_name}.id = monsters.monster_id
						AND ${table_name}.type = 'monster_id'
					INNER JOIN territories ON monsters.family_id = ANY(territories.monster_families)
					WHERE monsters.min_level BETWEEN ${min_level} AND ${max_level}
					LIMIT 5 OFFSET $1
				) AS monsters
				INNER JOIN territories ON monsters.family_id = ANY(territories.monster_families)
				INNER JOIN ${table_name} ON ${table_name}.id = ambiance_id
					AND ${table_name}.type = 'ambiance_id'`

				const monster_promise = type === null || type === 'monster' ? client.query(monster_query, [offset]) : null

				resource_query = `
					SELECT
						resources.name,
						skill_id,
						level,
						resources.collect_item_id,
						gfx_id,
						map_id,
						ambiance_id,
						i18n_ambiance.data AS territory_name,
						i18n_skill.data AS skill_name
					FROM (
							SELECT DISTINCT ON (collect_item_id)
								${table_name}.data AS name,
								resource_id,
								collect_item_id,
								skill_id,
								level,
								gfx_id
							FROM resources
							INNER JOIN ${table_name} ON ${table_name}.id = resources.collect_item_id
								AND ${table_name}.type = 'item_id'
							INNER JOIN territories ON resources.resource_id = ANY(territories.resources)
							WHERE resources.level = $1
							LIMIT 5 OFFSET $2
						) AS resources
					INNER JOIN territories ON resources.resource_id = ANY(territories.resources)
					INNER JOIN ${table_name} AS i18n_ambiance ON i18n_ambiance.id = ambiance_id
						AND i18n_ambiance.type = 'ambiance_id'
					INNER JOIN ${table_name} AS i18n_skill ON i18n_skill.id = skill_id
						AND i18n_skill.type = 'skill_id'`

				const resource_promise = (type === null || type === 'resource') && min_resource_level != -1 ?
					client.query(resource_query, [min_resource_level, offset]) : null

				zone_query = `
					SELECT
						map_id,
						ambiance_id,
						min_level,
						max_level,
						${table_name}.data AS name
					FROM territories
					INNER JOIN ${table_name} ON ${table_name}.id = territories.ambiance_id
					WHERE ${table_name}.type = 'ambiance_id'
						AND $1 BETWEEN territories.min_level AND territories.max_level
						AND (territories.min_level != 0 AND (territories.min_level = 1 AND territories.max_level = 230) = false)
					LIMIT 5 OFFSET $2`;

				const zone_promise = type === null || type === 'zone' ? client.query(zone_query, [level, offset]) : null

				npc_query = `
					SELECT
						n.name,
						npcs.type AS npc_id,
						npcs.map_id,
						i18n_map.data AS map_name,
						npcs.min_level,
						npcs.max_level,
						ST_AsGeoJSON(npcs.geog) AS point
					FROM (
						SELECT DISTINCT ON (min_level, name)
							i18n_npc.data AS name,
							npcs.type,
							map_id,
							min_level,
							max_level,
							ST_AsGeoJSON(geog) AS point
						FROM npcs
						INNER JOIN ${table_name} AS i18n_npc ON i18n_npc.id = npcs.type
							AND i18n_npc.type = 'npc_id'
						WHERE $1 BETWEEN min_level AND max_level
						LIMIT 5 OFFSET $2
					) AS n
					INNER JOIN npcs ON n.type = npcs.type
						AND n.min_level = npcs.min_level
					INNER JOIN ${table_name} AS i18n_map ON i18n_map.id = npcs.map_id
						AND i18n_map.type = 'map_id'`

				const npc_promise = type === null || type === 'npc' ? client.query(npc_query, [level, offset]) : null
				

				const dungeons = dungeon_promise != null ? (await dungeon_promise).rows || [] : []
				let monsters = monster_promise != null ? (await monster_promise).rows || [] : []
				monsters = sortMonsters(monsters)
				let resources = resource_promise != null ? (await resource_promise).rows || [] : []
				resources = sortResources(resources)
				const zones = zone_promise != null ? (await zone_promise).rows || [] : []
				let npcs = npc_promise != null ? (await npc_promise).rows || [] : []
				npcs = sortNpcs(npcs)

				return {
					dungeons,
					monsters,
					resources,
					zones,
					npcs
				}
			}
			else if (search_query.length == 0) {
				return {
					dungeons: [],
					monsters: [],
					resources: [],
					zones: [],
					npcs: []
				}
			}
		}

		dungeon_query = `
			SELECT
				dungeons.dungeon_id,
				${table_name}.data AS name,
				dungeons.map_id,
				ST_AsGeoJSON(teleporters.geog_origin) AS point,
				min_level
			FROM ${table_name}
			INNER JOIN dungeons ON ${table_name}.id = dungeons.dungeon_id
			INNER JOIN teleporters ON dungeons.map_id = teleporters.map_id
				AND dungeons.dest_map_id = teleporters.dest_map_id
			WHERE ${table_name}.type = 'dungeon_id'
			AND ${table_name}.data_tokens @@ to_tsquery($1, $2)
			LIMIT 5 OFFSET $3`

		const dungeon_promise = type === null || type === 'dungeon' ? client.query(dungeon_query, [full_lang, search_query, offset]) : null

		monster_query = `
			SELECT
				monster_id,
				i18n.name,
				family_id,
				monsters.min_level,
				monsters.max_level,
				gfx_id,
				map_id,
				ambiance_id,
				${table_name}.data AS territory_name
			FROM (
					SELECT DISTINCT ON (data)
						id,
						data AS name
					FROM ${table_name}
					INNER JOIN monsters ON ${table_name}.id = monsters.monster_id
					INNER JOIN territories ON monsters.family_id = ANY(territories.monster_families)
					WHERE ${table_name}.type = 'monster_id'
						AND ${table_name}.data_tokens @@ to_tsquery($1, $2)
					LIMIT 5 OFFSET $3
				) AS i18n
			INNER JOIN monsters ON i18n.id = monsters.monster_id
			INNER JOIN territories ON monsters.family_id = ANY(territories.monster_families)
			INNER JOIN ${table_name} ON ${table_name}.id = ambiance_id
				AND ${table_name}.type = 'ambiance_id'`

		const monster_promise = type === null || type === 'monster' ? client.query(monster_query, [full_lang, search_query, offset]) : null

		resource_query = `
			SELECT
				i18n.name,
				skill_id,
				level,
				resources.collect_item_id,
				gfx_id,
				map_id,
				ambiance_id,
				i18n_ambiance.data AS territory_name,
				i18n_skill.data AS skill_name
			FROM (
					SELECT DISTINCT ON (data)
						id,
						data AS name
					FROM ${table_name}
					INNER JOIN resources ON ${table_name}.id = resources.collect_item_id
						AND ${table_name}.type = 'item_id'
					INNER JOIN territories ON resources.resource_id = ANY(territories.resources)
					WHERE ${table_name}.data_tokens @@ to_tsquery($1, $2)
					LIMIT 5 OFFSET $3
				) AS i18n
			INNER JOIN resources ON i18n.id = resources.collect_item_id
			INNER JOIN territories ON resources.resource_id = ANY(territories.resources)
			INNER JOIN ${table_name} AS i18n_ambiance ON i18n_ambiance.id = ambiance_id
				AND i18n_ambiance.type = 'ambiance_id'
			INNER JOIN ${table_name} AS i18n_skill ON i18n_skill.id = skill_id
				AND i18n_skill.type = 'skill_id'`

		const resource_promise = type === null || type === 'resource' ? client.query(resource_query, [full_lang, search_query, offset]) : null

		zone_query = `
			SELECT
				map_id,
				ambiance_id,
				min_level,
				max_level,
				${table_name}.data AS name
			FROM ${table_name}
			INNER JOIN territories ON ${table_name}.id = territories.ambiance_id
			WHERE ${table_name}.type = 'ambiance_id'
				AND ${table_name}.data_tokens @@ to_tsquery($1, $2)
			LIMIT 5 OFFSET $3`

		const zone_promise = type === null || type === 'zone' ? client.query(zone_query, [full_lang, search_query, offset]) : null

		npc_query = `
			SELECT
				n.name,
				npcs.type AS npc_id,
				npcs.map_id,
				i18n_map.data AS map_name,
				npcs.min_level,
				npcs.max_level,
				ST_AsGeoJSON(npcs.geog) AS point
			FROM (
				SELECT DISTINCT ON (min_level)
					i18n_npc.data AS name,
					npcs.type,
					map_id,
					min_level,
					max_level,
					ST_AsGeoJSON(geog) AS point
				FROM ${table_name} as i18n_npc
				INNER JOIN npcs ON i18n_npc.id = npcs.type
				WHERE i18n_npc.type = 'npc_id'
					AND i18n_npc.data_tokens @@ to_tsquery($1, $2)
				LIMIT 5 OFFSET $3
			) AS n
			INNER JOIN npcs ON n.type = npcs.type
				AND n.min_level = npcs.min_level
			INNER JOIN ${table_name} AS i18n_map ON i18n_map.id = npcs.map_id
				AND i18n_map.type = 'map_id'`

		const npc_promise = type === null || type === 'npc' ? client.query(npc_query, [full_lang, search_query, offset]) : null

		const dungeons = dungeon_promise != null ? (await dungeon_promise).rows || [] : []
		let monsters = monster_promise != null ? (await monster_promise).rows || [] : []
		monsters = sortMonsters(monsters)
		let resources = resource_promise != null ? (await resource_promise).rows || [] : []
		resources = sortResources(resources)
		const zones = zone_promise != null ? (await zone_promise).rows || [] : []
		let npcs = npc_promise != null ? (await npc_promise).rows || [] : []
		npcs = sortNpcs(npcs)

		let result = {
			dungeons,
			monsters,
			resources,
			zones,
			npcs
		}
		return result
	},
}

const getI18nTableName = (lang) => {
	const table_name = `i18n_${lang}`
	if (["i18n_fr", "i18n_en"].indexOf(table_name) === -1) {
		throw new Error(`Invalid language: ${lang}`)
	}
	return table_name
}

const getFullLang = (lang) => {
	if (lang === 'fr') {
		return 'french'
	}
	else if (lang === 'en') {
		return 'english'
	}
	else {
		throw new Error(`Invalid language: ${lang}`)
	}
}

const sortMonsters = (monsters) => {
	let sorted_monsters = {}
	for (let monster of monsters) {
		if (monster.monster_id in sorted_monsters) {
			sorted_monsters[monster.monster_id].location.push({
				map_id: monster.map_id,
				ambiance_id: monster.ambiance_id,
				territory_name: monster.territory_name
			})
		}
		else {
			sorted_monsters[monster.monster_id] = monster
			sorted_monsters[monster.monster_id].location = [{
				map_id: monster.map_id,
				ambiance_id: monster.ambiance_id,
				territory_name: monster.territory_name
			}]
			
		}
	}
	monsters.splice(0, monsters.length)
	Object.keys(sorted_monsters).forEach((key, _) => {
		delete sorted_monsters[key].monster_id
		delete sorted_monsters[key].ambiance_id
		delete sorted_monsters[key].territory_name
		delete sorted_monsters[key].map_id
		monsters.push(sorted_monsters[key])
	})
	return monsters
}

const sortResources = (resources) => {
	let sorted_resources = {}
	for (let resource of resources) {
		if (resource.collect_item_id in sorted_resources) {
			sorted_resources[resource.collect_item_id].location.push({
				map_id: resource.map_id,
				ambiance_id: resource.ambiance_id,
				territory_name: resource.territory_name
			})
		}
		else {
			sorted_resources[resource.collect_item_id] = resource
			sorted_resources[resource.collect_item_id].location = [{
				map_id: resource.map_id,
				ambiance_id: resource.ambiance_id,
				territory_name: resource.territory_name
			}]
			
		}
	}
	resources.splice(0, resources.length)
	Object.keys(sorted_resources).forEach((key, _) => {
		delete sorted_resources[key].collect_item_id
		delete sorted_resources[key].ambiance_id
		delete sorted_resources[key].territory_name
		delete sorted_resources[key].map_id
		resources.push(sorted_resources[key])
	})
	return resources
}

const sortNpcs = (npcs) => {
	let sorted_npcs = {}
	for (let npc of npcs) {
		let key = npc.name + `${npc.min_level}`
		if (key in sorted_npcs) {
			sorted_npcs[key].location.push({
				map_id: npc.map_id,
				map_name: npc.map_name,
				point: JSON.parse(npc.point)
			})
		}
		else {
			sorted_npcs[key] = npc
			sorted_npcs[key].location = [{
				map_id: npc.map_id,
				map_name: npc.map_name,
				point: JSON.parse(npc.point)
			}]
			
		}
	}
	npcs.splice(0, npcs.length)
	Object.keys(sorted_npcs).forEach((key, _) => {
		delete sorted_npcs[key].map_name
		delete sorted_npcs[key].point
		npcs.push(sorted_npcs[key])
	})
	return npcs
}