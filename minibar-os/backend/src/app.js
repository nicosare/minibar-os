import express from 'express';
import cors from 'cors';
import deadlinesRouter from './routes/deadlines.js';
import roomsRouter from './routes/rooms.js';
import productsRouter from './routes/products.js';
import templatesRouter from './routes/templates.js';
import checksRouter from './routes/checks.js';
import excisesRouter from './routes/excises.js';
import listsRouter from './routes/lists.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

  app.use('/api/deadlines', deadlinesRouter);
  app.use('/api/rooms', roomsRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/templates', templatesRouter);
  app.use('/api/checks', checksRouter);
  app.use('/api/excises', excisesRouter);
  app.use('/api/lists', listsRouter);

  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  return app;
}
