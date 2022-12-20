const Koa = require("koa");
const cors = require("kcors");
const log = require("./logger");
const api = require("./api");
const ratelimit = require('koa-ratelimit')
const Redis = require('ioredis')

const app = new Koa();
const port = process.env.APP_PORT || 5000;

const origin = process.env.CORS_ORIGIN | "*";

const redis = new Redis({
	port: process.env.REDIS_PORT,
	host: process.env.REDIS_HOST,
	password: process.env.REDIS_PASSWORD,
	db: 1
})

app.use(ratelimit({
	driver: 'redis',
	db: redis,
	duration: 1000,
	errorMessage: 'Too many request !',
	id: (ctx) => ctx.ip,
	max: 10,
	disableHeader: true,
}));

app.use(cors({ origin }));

app.use(async (ctx, next) => {
	const start = Date.now()
	await next()
	const responseTime = Date.now() - start
	log.info(`${ctx.method} ${ctx.status} ${ctx.url} - ${responseTime} ms`)
})

app.use(async (ctx, next) => {
	try {
		await next()
	} catch (err) {
		ctx.status = err.status || 500
		ctx.body = err.status ? err.message : "Internal server error"
		if (!err.status || err.status == 500) {
			log.error(`Request Error ${ctx.url} - ${err.message}`)
		}
	}
});

app.use(api.routes(), api.allowedMethods());

app.listen(port, () => {
	log.info(`Server listening on port ${port}`);
})
