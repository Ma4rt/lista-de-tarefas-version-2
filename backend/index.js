import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './auth/auth.js';
import tasksRoutes from './tasks/tasks.js';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
  res.send('API Lista de Tarefas - Backend rodando!');
});

app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
}); 