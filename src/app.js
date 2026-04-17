const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

require('./config/env');
const logger = require('./config/logger');
const routes = require('./routes');
const errorMiddleware = require('./middlewares/error.middleware');
const { bootstrapRoles } = require('./services/role.service');
const setupSwagger = require('./docs/swagger');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve('uploads')));

app.get('/health', (_req, res) => res.status(200).json({ success: true, message: 'OK' }));
setupSwagger(app);
app.use('/api', routes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

app.use(errorMiddleware);

const PORT = Number(process.env.PORT) || 3000;

const startServer = async () => {
  try {
    await bootstrapRoles();
    app.listen(PORT, () => logger.info('Servidor iniciado en puerto', PORT));
  } catch (error) {
    logger.error('Error iniciando aplicaci?n', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
