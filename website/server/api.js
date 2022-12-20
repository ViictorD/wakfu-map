const Router = require('koa-router')
const database = require('./database')
const cache = require('./cache')
const joi = require('joi')
const validate = require('./koa-joi-validate')
const { xor } = require('joi/lib/types/object')

const router = new Router()

router.use(cache.checkResponseCache)
router.use(cache.addResponseToCache)

const get_all_ids = async () => {
	const result = await Promise.all([
		database.getAllMapIds(),
		database.getAllPaperMapIds(),
		database.getAllDungeonIds()
	])

	const all_map_ids = result[0].map((map_id) => map_id.map_id)
	const all_paper_map_ids = result[1].map((map_id) => map_id.map_id)
	const all_dungeon_ids = result[2].map((dungeon_id) => dungeon_id.dungeon_id)
	return { all_map_ids, all_paper_map_ids, all_dungeon_ids }
}

get_all_ids()
.then((ids) => {
	const { all_map_ids, all_paper_map_ids, all_dungeon_ids } = ids

	const mapIdValidator = validate({
		params: { map_id: joi.number().valid(all_map_ids).required() }
	})

	const mapIdAndLangValidator = validate({
		params: {
			lang: joi.string().valid(['fr', 'en']).required(),
			map_id: joi.number().valid(all_map_ids).required()
		}
	})

	const mapIdAndPaperValidator = validate({
		params: {
			lang: joi.string().valid(['fr', 'en']).required(),
			map_id: joi.number().valid(all_map_ids.concat(all_paper_map_ids)).required()
		}
	})

	const paperDataValidator = validate({
		params: {
			lang: joi.string().valid(['fr', 'en']).required(),
			map_id: joi.number().valid([-1, -2, -3, -5, -6, -7]).required()
		}
	})

	const i18nInstanceNameValidator = validate({
		params: {
			lang: joi.string().valid(['fr', 'en']).required(),
			map_ids: joi.array().items(joi.number().valid(all_map_ids).required())
		}
	})

	const searchValidator = validate({
		params: {
			lang: joi.string().valid(['fr', 'en']).required(),
			query: joi.string().regex(RegExp("^[A-Za-z0-9 \-éÉèÈêÊàÀçÇùÙûÛ'\"]+$")).required()
		}
	})

	const searchMoreValidator = validate({
		params: {
			lang: joi.string().valid(['fr', 'en']).required(),
			type: joi.string().valid(['dungeon', 'monster', 'zone', 'resource', 'npc']).required(),
			offset: joi.number().integer().min(1).required(),
			query: joi.string().regex(RegExp("^[A-Za-z0-9 \-éÉèÈêÊàÀçÇùÙûÛ'\"]+$")).required()
		}
	})

	router.get('/map/teleporters/:map_id', mapIdValidator, async (ctx) => {
		const map_id = ctx.params.map_id
		const results = await database.getTeleporters(map_id)
		if (results.length === 0) {
			ctx.body = [];
			return ;
		}
	
		const teleporters = results.map((row) => {
			const geojson = JSON.parse(row.st_asgeojson)
			geojson.properties = {
				dest_map_id: row.dest_map_id,
				dest_point: JSON.parse(row.dest_point)
			}
			return geojson
		})
		ctx.body = teleporters
	})

	
	router.get('/paper/data/:lang/:map_id', paperDataValidator, async (ctx) => {
		const lang = ctx.params.lang
		const map_id = ctx.params.map_id
		const results = await database.getPaperData(lang, map_id)
		if (results.length === 0) {
			ctx.throw(404, `No teleporters found for map ${map_id}`)
		}
	
		const teleporters = results.map((row) => {
			let geojson = null
			if (row.polygon != null) {
				geojson = JSON.parse(row.polygon)
				geojson.properties = {
					marker_name_point: JSON.parse(row.marker_name),
					dest_map_id: row.dest_map_id,
					name: row.name
				}
			}
			else if (row.circle != null) {
				geojson = JSON.parse(row.circle)
				geojson.properties = {
					marker_name_point: JSON.parse(row.marker_name),
					circle_radius: row.circle_radius,
					dest_map_id: row.dest_map_id,
					name: row.name
				}
			}
			else {
				ctx.throw(500, `No geometry was found for map ${map_id}`)
			}
			return geojson
		})
		ctx.body = teleporters
	})
	
	router.get('/map/chests/:map_id', mapIdValidator, async (ctx) => {
		const map_id = ctx.params.map_id
		const results = await database.getMapChests(map_id)
		if (results.length === 0) {
			ctx.body = []
			return ;
		}
	
		const teleporters = results.map((row) => {
			const geojson = JSON.parse(row.st_asgeojson)
			return geojson
		})
		ctx.body = teleporters
	})
	
	router.get('/map/data/:lang/:map_id', mapIdAndPaperValidator, async (ctx) => {
		const lang = ctx.params.lang
		const map_id = ctx.params.map_id
		const results = await database.getMapData(lang, map_id)
		if (results.length === 0) {
			ctx.throw(404, `No map data found for map ${map_id}`)
		}
		if (results.length > 1) {
			ctx.throw(500, `More than one result was found for map ${map_id}`)
		}
	
		ctx.body = results[0]
	})
	
	router.get('/i18n/instance/names/:lang/:map_ids', i18nInstanceNameValidator, async (ctx) => {
		const lang = ctx.params.lang
		const map_ids = JSON.parse(ctx.params.map_ids)
		const results = await database.getI18nInstanceNames(lang, map_ids)
		if (results.length === 0) {
			ctx.throw(404, `No i18n data found for language ${lang} and map ids ${map_ids}`)
		}
		ctx.body = results
	})

	router.get('/search/:lang/:query', searchValidator, async (ctx) => {
		const lang = ctx.params.lang
		const query = ctx.params.query.trim().toLowerCase()
		if (query.length == 0) {
			ctx.throw(400, `Can not search for empty query`)
		}
		const results = await database.search(lang, query)

		if (results == null) {
			ctx.throw(500, `An error occured while searching for ${query}`)
		}

		ctx.body = results
	})

	router.get('/search/more/:lang/:type/:offset/:query', searchMoreValidator, async (ctx) => {
		const lang = ctx.params.lang
		const type = ctx.params.type
		const offset = ctx.params.offset
		const query = ctx.params.query.trim().toLowerCase()
		if (query.length == 0) {
			ctx.throw(400, `Can not search for empty query`)
		}
		const results = await database.search(lang, query, type, offset)

		if (results == null) {
			ctx.throw(500, `An error occured while searching for ${query}`)
		}

		ctx.body = results
	})

	router.get('/map/territories/:lang/:map_id', mapIdAndLangValidator, async (ctx) => {
		const lang = ctx.params.lang
		const map_id = ctx.params.map_id
		const results = await database.getTerritories(lang, map_id)
		if (results.length === 0) {
			ctx.body = []
			return ;
		}
	
		const territories = results.map((row) => {
			let geojson = JSON.parse(row.st_asgeojson)
			geojson.properties = {
				ambiance_id: row.ambiance_id,
				name: row.name,
				level_min: row.min_level,
				level_max: row.max_level
			}
			return geojson
		})
		ctx.body = territories
	})
})


module.exports = router