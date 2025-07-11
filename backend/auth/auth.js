import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { openDb } from '../db.js';
import dotenv from 'dotenv';

dotenv.config();

console.log('SMTP_HOST:', process.env.SMTP_HOST);
console.log('SMTP_PORT:', process.env.SMTP_PORT);
console.log('SMTP_USER:', process.env.SMTP_USER);

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'segredo';
const EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@suatarefa.com';

// Configuração do Nodemailer (exemplo com SMTP)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Armazenamento temporário de códigos de verificação
const verificationCodes = new Map(); // email -> { code, expires }

// Criação da tabela de usuários se não existir
(async () => {
  const db = await openDb();
  await db.exec(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    verified INTEGER DEFAULT 0,
    verification_token TEXT
  )`);
})();

// Enviar código de verificação
router.post('/send-code', async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'E-mail inválido.' });
  }
  // Gera código de 6 dígitos
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = Date.now() + 10 * 60 * 1000; // 10 minutos
  verificationCodes.set(email, { code, expires });
  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: email,
      subject: 'Código de verificação - Lista de Tarefas',
      html: `<p>Seu código de verificação é: <b>${code}</b><br>Ele expira em 10 minutos.</p>`
    });
    res.json({ message: 'Código enviado!' });
  } catch (e) {
    console.error(e); // Adicionado para debug
    res.status(500).json({ error: 'Erro ao enviar e-mail.' });
  }
});

// Cadastro com validação de código
router.post('/register', async (req, res) => {
  const { name, email, password, code } = req.body;
  if (!name || !email || !password || !code) return res.status(400).json({ error: 'Preencha todos os campos.' });
  // Valida código
  const entry = verificationCodes.get(email);
  if (!entry || entry.code !== code || entry.expires < Date.now()) {
    return res.status(400).json({ error: 'Código de verificação inválido ou expirado.' });
  }
  verificationCodes.delete(email);
  const db = await openDb();
  const hashed = await bcrypt.hash(password, 10);
  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1d' });
  try {
    await db.run('INSERT INTO users (name, email, password, verification_token) VALUES (?, ?, ?, ?)', [name, email, hashed, token]);
    // Enviar email de verificação
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: email,
      subject: 'Verifique seu email',
      html: `<p>Olá, ${name}! Clique <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/verificar?token=${token}">aqui</a> para verificar seu email.</p>`
    });
    res.json({ message: 'Cadastro realizado! Verifique seu email.' });
  } catch (e) {
    res.status(400).json({ error: 'Email já cadastrado.' });
  }
});

// Verificação de email
router.get('/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token ausente.' });
  try {
    const { email } = jwt.verify(token, JWT_SECRET);
    const db = await openDb();
    const user = await db.get('SELECT * FROM users WHERE email = ? AND verification_token = ?', [email, token]);
    if (!user) return res.status(400).json({ error: 'Token inválido.' });
    await db.run('UPDATE users SET verified = 1, verification_token = NULL WHERE email = ?', [email]);
    res.json({ message: 'Email verificado com sucesso!' });
  } catch (e) {
    res.status(400).json({ error: 'Token inválido ou expirado.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Preencha todos os campos.' });
  const db = await openDb();
  const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) return res.status(400).json({ error: 'Usuário não encontrado.' });
  if (!user.verified) return res.status(400).json({ error: 'Email não verificado.' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: 'Senha incorreta.' });
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

export default router; 