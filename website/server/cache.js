const log = require("./logger");
const Redis = require('ioredis')
const redis = new Redis({
	port: process.env.REDIS_PORT,
	host: process.env.REDIS_HOST,
	password: process.env.REDIS_PASSWORD,
	db: 0
})

redis.on('connect', () => {
	log.info(`Redis connected on: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`)
})


module.exports = {
	async checkResponseCache(ctx, next) {
		const cachedResponse = await redis.get(ctx.url)
		if (cachedResponse) {
			ctx.body = JSON.parse(cachedResponse)
		}
		else {
			await next()
		}
	},

	async addResponseToCache(ctx, next) {
		await next()
		if (ctx.body && ctx.status === 200) {
			await redis.set(ctx.path, JSON.stringify(ctx.body))
		}
	}
}