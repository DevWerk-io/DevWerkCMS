import 'dotenv/config';
import express from 'express';
import routes from './routes/index.js';


const app = express();
app.use(express.json({ limit: '2mb' }));
app.use('/api', routes);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[OK] Server läuft auf :${PORT}`));


