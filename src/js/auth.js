// Funções para mostrar/ocultar modais de autenticação
window.toggleAuthModal = function(type, show) {
    document.getElementById('registerModal').style.display = (type === 'register' && show) ? 'flex' : 'none';
    if (!show) {
        document.getElementById('registerForm').reset();
        document.getElementById('registerFeedback').textContent = '';
        document.getElementById('emailFeedback').textContent = '';
    }
};
window.switchAuthModal = function(type) {
    toggleAuthModal('register', false);
    setTimeout(() => toggleAuthModal(type, true), 100);
};

document.addEventListener('DOMContentLoaded', function() {
    // Envio de código de verificação
    const sendCodeBtn = document.getElementById('sendVerificationCode');
    if (sendCodeBtn) {
        sendCodeBtn.addEventListener('click', async function() {
            const email = document.getElementById('registerEmail').value;
            const feedback = document.getElementById('emailFeedback');
            feedback.textContent = '';
            if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
                feedback.textContent = 'Digite um e-mail válido.';
                return;
            }
            feedback.textContent = 'Enviando código...';
            try {
                const res = await fetch('http://localhost:3001/api/auth/send-code', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await res.json();
                if (res.ok) {
                    feedback.textContent = 'Código enviado! Verifique seu e-mail.';
                } else {
                    feedback.textContent = data.error || 'Erro ao enviar código.';
                }
            } catch (err) {
                feedback.textContent = 'Erro de conexão.';
            }
        });
    }

    // Cadastro
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('registerName').value.trim();
            const email = document.getElementById('registerEmail').value.trim();
            const password = document.getElementById('registerPassword').value;
            const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
            const code = document.getElementById('registerCode').value.trim();
            const feedback = document.getElementById('registerFeedback');
            feedback.textContent = '';
            // Validação básica
            if (!name || !email || !password || !passwordConfirm || !code) {
                feedback.textContent = 'Preencha todos os campos.';
                return;
            }
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
                feedback.textContent = 'E-mail inválido.';
                return;
            }
            if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
                feedback.textContent = 'A senha deve ter pelo menos 8 caracteres, incluindo maiúsculas, minúsculas, números e símbolos.';
                return;
            }
            if (password !== passwordConfirm) {
                feedback.textContent = 'As senhas não coincidem.';
                return;
            }
            if (!/^[0-9]{6}$/.test(code)) {
                feedback.textContent = 'Código de verificação inválido.';
                return;
            }
            feedback.textContent = 'Cadastrando...';
            try {
                const res = await fetch('http://localhost:3001/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password, code })
                });
                const data = await res.json();
                if (res.ok) {
                    feedback.style.color = 'var(--success-color)';
                    feedback.textContent = 'Cadastro realizado! Verifique seu e-mail para ativar a conta.';
                    setTimeout(() => { toggleAuthModal('register', false); }, 2000);
                } else {
                    feedback.style.color = 'var(--error-color)';
                    feedback.textContent = data.error || 'Erro ao cadastrar.';
                }
            } catch (err) {
                feedback.style.color = 'var(--error-color)';
                feedback.textContent = 'Erro de conexão.';
            }
        });
    }

    // Login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            try {
                const res = await fetch('http://localhost:3001/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (res.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    alert('Login realizado!');
                    if (window.onLoginSuccess) window.onLoginSuccess();
                } else {
                    alert(data.error || 'Erro ao fazer login.');
                }
            } catch (err) {
                alert('Erro de conexão.');
            }
        });
    }
}); 