const winston = require('winston')
const path = require('path')

const logger = winston.createLogger({
	transports: [
		new (winston.transports.File)({
			name: 'info-file',
			filename: path.resolve(__dirname, './logs/info.log'),
			level: 'info'
		}),
		new (winston.transports.File)({
			name: 'error-file',
			filename: path.resolve(__dirname, './logs/error.log'),
			level: 'error'
		})
	]
})

if (process.env.NODE_ENV !== 'production') {
	logger.add(new winston.transports.Console({
		format: winston.format.simple(),
	}));
}

module.exports = logger