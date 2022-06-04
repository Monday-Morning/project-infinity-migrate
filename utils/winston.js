import { createLogger, format, transports } from 'winston';

export default class Winston {
  constructor(logModule) {
    const logFormat = format.printf(
      ({ level, message, timestamp }) =>
        `${timestamp} | Project Infinity | ${level.toUpperCase()} | ${logModule} | ${message}`
    );

    const options = {
      error: {
        level: 'error',
        filename: './logs/error.log',
        format: format.combine(format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
        handleExceptions: true,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        json: true,
        colorize: true,
      },
      combined: {
        level: 'info',
        filename: './logs/app.log',
        format: format.combine(format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
        handleExceptions: true,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        json: true,
        colorize: true,
      },
      console: {
        level: 'debug',
        format: format.combine(format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
        handleExceptions: true,
        json: false,
        colorize: true,
      },
    };

    return createLogger({
      transports: [
        new transports.File(options.error),
        new transports.File(options.combined),
        new transports.Console(options.console),
      ],
      exitOnError: false,
    });
  }
}
