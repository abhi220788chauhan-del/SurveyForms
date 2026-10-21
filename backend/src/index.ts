import app from './app';
import { closeDb } from './db';

if (!process.env.MONGODB_URI) console.error('[config] MONGODB_URI is missing - add it to forms/backend/.env');

const port = Number(process.env.PORT ?? 4000);
const server = app.listen(port, process.env.HOST ?? '0.0.0.0', () => console.log(`Sahi-Sahi forms API on :${port}`));

const stop = () => server.close(() => closeDb().finally(() => process.exit(0)));
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
