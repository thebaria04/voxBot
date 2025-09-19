const winston = require('winston');
const path = require('path');

class Logger {
    constructor() {
        this.logger = winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            defaultMeta: { service: 'teams-ai-foundry-bot' },
            transports: [
                // Console transport for development
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                })
            ]
        });

        // Add file transport if log file path is specified
        if (process.env.LOG_FILE_PATH) {
            const logDir = path.dirname(process.env.LOG_FILE_PATH);
            // Ensure log directory exists
            const fs = require('fs');
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }

            this.logger.add(new winston.transports.File({
                filename: process.env.LOG_FILE_PATH,
                maxsize: 5242880, // 5MB
                maxFiles: 5,
                tailable: true
            }));
        }
    }

    info(message, meta = {}) {
        this.logger.info(message, meta);
    }

    error(message, meta = {}) {
        this.logger.error(message, meta);
    }

    warn(message, meta = {}) {
        this.logger.warn(message, meta);
    }

    debug(message, meta = {}) {
        this.logger.debug(message, meta);
    }
}

module.exports = { Logger };
