import express from 'express';
import { openDb } from '../db.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'segredo';

// Middleware para autenticação
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Token ausente.' });
  const token = auth.split(' ')[1];
  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Token inválido.' });
  }
}

// Criação da tabela de tarefas se não existir
(async () => {
  const db = await openDb();
  await db.exec(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    description TEXT,
    due_date TEXT,
    status TEXT DEFAULT 'pendente',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
})();

// Criação da tabela de compartilhamentos se não existir
(async () => {
  const db = await openDb();
  await db.exec(`CREATE TABLE IF NOT EXISTS task_shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    from_user_id INTEGER,
    to_user_id INTEGER,
    status TEXT DEFAULT 'pendente', -- pendente, aceita, recusada
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
})();

// Criar tarefa
router.post('/', authMiddleware, async (req, res) => {
  const { title, description, due_date } = req.body;
  if (!title) return res.status(400).json({ error: 'Título obrigatório.' });
  const db = await openDb();
  const result = await db.run(
    'INSERT INTO tasks (user_id, title, description, due_date) VALUES (?, ?, ?, ?)',
    [req.user.id, title, description, due_date]
  );
  res.json({ id: result.lastID, title, description, due_date, status: 'pendente' });
});

// Listar tarefas do usuário
router.get('/', authMiddleware, async (req, res) => {
  const db = await openDb();
  const tasks = await db.all('SELECT * FROM tasks WHERE user_id = ?', [req.user.id]);
  res.json(tasks);
});

// Editar tarefa
router.put('/:id', authMiddleware, async (req, res) => {
  const { title, description, due_date, status } = req.body;
  const { id } = req.params;
  const db = await openDb();
  await db.run(
    'UPDATE tasks SET title = ?, description = ?, due_date = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
    [title, description, due_date, status, id, req.user.id]
  );
  res.json({ message: 'Tarefa atualizada.' });
});

// Excluir tarefa
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const db = await openDb();
  await db.run('DELETE FROM tasks WHERE id = ? AND user_id = ?', [id, req.user.id]);
  res.json({ message: 'Tarefa excluída.' });
});

// Compartilhar tarefa com outro usuário
router.post('/:id/share', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { to_email } = req.body;
  if (!to_email) return res.status(400).json({ error: 'Email do destinatário obrigatório.' });
  const db = await openDb();
  // Verifica se o destinatário existe
  const toUser = await db.get('SELECT id FROM users WHERE email = ?', [to_email]);
  if (!toUser) return res.status(404).json({ error: 'Usuário destinatário não encontrado.' });
  // Verifica se a tarefa pertence ao usuário autenticado
  const task = await db.get('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, req.user.id]);
  if (!task) return res.status(403).json({ error: 'Você não pode compartilhar esta tarefa.' });
  // Cria o convite de compartilhamento
  await db.run('INSERT INTO task_shares (task_id, from_user_id, to_user_id) VALUES (?, ?, ?)', [id, req.user.id, toUser.id]);
  // (Opcional) Aqui você pode enviar notificação por email
  res.json({ message: 'Tarefa compartilhada! O usuário poderá aceitar ou recusar.' });
});

// Listar tarefas compartilhadas com o usuário autenticado
router.get('/shared/received', authMiddleware, async (req, res) => {
  const db = await openDb();
  const tasks = await db.all(`
    SELECT t.*, ts.status as share_status, u.name as from_user_name, u.email as from_user_email
    FROM task_shares ts
    JOIN tasks t ON t.id = ts.task_id
    JOIN users u ON u.id = ts.from_user_id
    WHERE ts.to_user_id = ?
  `, [req.user.id]);
  res.json(tasks);
});

// Listar tarefas compartilhadas pelo usuário autenticado
router.get('/shared/sent', authMiddleware, async (req, res) => {
  const db = await openDb();
  const tasks = await db.all(`
    SELECT t.*, ts.status as share_status, u.name as to_user_name, u.email as to_user_email
    FROM task_shares ts
    JOIN tasks t ON t.id = ts.task_id
    JOIN users u ON u.id = ts.to_user_id
    WHERE ts.from_user_id = ?
  `, [req.user.id]);
  res.json(tasks);
});

// Aceitar ou recusar tarefa compartilhada
router.post('/shared/:share_id/respond', authMiddleware, async (req, res) => {
  const { share_id } = req.params;
  const { response } = req.body; // 'aceita' ou 'recusada'
  if (!['aceita', 'recusada'].includes(response)) return res.status(400).json({ error: 'Resposta inválida.' });
  const db = await openDb();
  // Verifica se o convite é para o usuário autenticado
  const share = await db.get('SELECT * FROM task_shares WHERE id = ? AND to_user_id = ?', [share_id, req.user.id]);
  if (!share) return res.status(403).json({ error: 'Convite não encontrado.' });
  await db.run('UPDATE task_shares SET status = ? WHERE id = ?', [response, share_id]);
  // (Opcional) Aqui você pode enviar notificação para o usuário que compartilhou
  res.json({ message: `Tarefa ${response === 'aceita' ? 'aceita' : 'recusada'}.` });
});

export default router; 