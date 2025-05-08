const fs = require('fs');
const path = require('path');
const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

// 1. Garantir que a pasta de logs existe
const ensureLogsDirectory = () => {
  const logDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
    console.log(`Diretório de logs criado em: ${logDir}`);
  }
};

// 2. Configurações por ambiente
const getEnvironmentConfig = () => {
  const currentEnv = process.env.NODE_ENV || 'development';
  
  return {
    development: {
      level: 'debug',
      console: true,
      file: true,
      handleExceptions: true,
      handleRejections: true
    },
    test: {
      level: 'verbose',
      console: false,
      file: true,
      filename: 'test-%DATE%.log',
      handleExceptions: true
    },
    production: {
      level: 'info',
      console: false,
      file: true,
      filename: 'application-%DATE%.log',
      handleExceptions: true,
      handleRejections: true
    }
  }[currentEnv];
};

// 3. Formatos de log
const createFormats = () => ({
  base: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  console: format.combine(
    format.colorize(),
    format.printf(({ level, message, timestamp, stack, ...metadata }) => {
      let msg = `${timestamp} [${process.env.NODE_ENV || 'development'}] ${level}: ${message}`;
      if (stack) msg += `\n${stack}`;
      if (Object.keys(metadata).length) msg += `\n${JSON.stringify(metadata, null, 2)}`;
      return msg;
    })
  )
});

// 4. Criar transportes
const createTransports = (config, formats) => {
  const transportsList = [];
  const env = process.env.NODE_ENV || 'development';
  const logPrefix = env === 'test' ? 'test' : 'application';

  if (config.console) {
    transportsList.push(new transports.Console({
      format: formats.console,
      level: config.level,
      handleExceptions: config.handleExceptions,
      handleRejections: config.handleRejections
    }));
  }

  if (config.file) {
    transportsList.push(
      new DailyRotateFile({
        filename: path.join(__dirname, `../logs/${logPrefix}-%DATE%.log`),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
        level: config.level,
        format: formats.base,
        handleExceptions: config.handleExceptions
      }),
      new DailyRotateFile({
        filename: path.join(__dirname, '../logs/error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
        level: 'error',
        format: formats.base,
        handleExceptions: true
      })
    );
  }

  return transportsList;
};

// 5. Configuração principal do logger
const configureLogger = () => {
  ensureLogsDirectory();
  const config = getEnvironmentConfig();
  const formats = createFormats();
  const transportsList = createTransports(config, formats);

  const logger = createLogger({
    level: config.level,
    format: formats.base,
    transports: transportsList,
    exceptionHandlers: [
      new transports.File({
        filename: path.join(__dirname, '../logs/exceptions.log'),
        format: formats.base
      })
    ],
    rejectionHandlers: [
      new transports.File({
        filename: path.join(__dirname, '../logs/rejections.log'),
        format: formats.base
      })
    ],
    exitOnError: false
  });

  // Stream para Morgan
  logger.stream = {
    write: (message) => {
      if (process.env.NODE_ENV !== 'test') {
        logger.info(message.trim(), { module: 'http' });
      }
    }
  };

  // Metadata padrão
  logger.defaultMeta = { 
    env: process.env.NODE_ENV || 'development',
    service: 'your-service-name'
  };

  return logger;
};

module.exports = configureLogger();