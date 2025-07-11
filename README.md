# Lista de Tarefas - Versão 2

## Estrutura de Pastas (Nova)

- frontend/
  - Tela-Login/
    - index.html
    - styles.css
    - script.js
    - auth.js
    - check_notifications.js
    - Caderno.png
  - (outras telas futuras...)
- backend/
  - auth/
    - auth.js
  - tasks/
    - tasks.js
  - db.js
  - index.js
  - env.env
  - package.json
  - README-backend.md

(As instruções detalhadas de execução permanecem as mesmas, apenas as rotas e caminhos dos arquivos mudam conforme a nova organização.)

## 🌐 Demo
Acesse a versão online: [Lista de Tarefas](https://github.com/Ma4rt/lista-de-tarefas-vesion-2.git)

## 📋 Descrição
Sistema de gerenciamento de tarefas com interface moderna e funcionalidades avançadas, incluindo visão mensal, temas claro/escuro, notificações e interações visuais ricas.

## ✨ Funcionalidades Implementadas

### Sistema de Tarefas
- Criação, edição e exclusão de tarefas
- Categorização por prioridade (Alta, Média, Baixa)
- Definição de data e hora para cada tarefa
- Status de conclusão com animação de check
- Contador de tarefas pendentes
- Sistema de notificações para tarefas próximas
- Validação de formulários
- Feedback visual para ações
- Persistência de dados no localStorage

### Visão Mensal
- Visualização de tarefas em formato de calendário mensal
- Expansão de dias ao clicar, mostrando detalhes das tarefas
- Destaque visual para dias com tarefas (ícone de notificação)
- Navegação entre meses
- Seleção de ano
- Efeito de blur no fundo ao expandir um dia
- Scroll personalizado para tarefas
- Box expandida com fundo escuro e borda destacada

### Interface e Usabilidade
- Design responsivo e moderno
- Temas claro e escuro
- Animações suaves nas interações
- Feedback visual em ações do usuário
- Modal para visão mensal com scroll personalizado
- Formulário de tarefas com validações
- Efeitos hover em todos os elementos interativos
- Transições suaves em todas as interações
- Ícones intuitivos com animações

### Sistema de Notificações
- Notificações do navegador
- Sons de notificação
- Toast notifications para feedback
- Sistema de permissões
- Lembretes configuráveis
- Ações rápidas nas notificações
- Adiamento de tarefas

### Estilização
- Cores personalizadas para diferentes estados
- Efeitos de hover e transições
- Ícones intuitivos com animações
- Layout adaptativo
- Scrollbars personalizadas
- Efeitos de blur e sombra
- Animações de transição
- Feedback visual rico

## 🎨 Tema e Cores
- Tema Claro:
  - Fundo principal: Branco
  - Elementos: Tons de azul turquesa (#93f3f3)
  - Texto: Preto para melhor contraste
  - Hover: Efeitos de brilho e elevação

- Tema Escuro:
  - Fundo principal: Azul escuro (#293a56)
  - Elementos: Tons de azul turquesa mais claros
  - Texto: Branco para melhor legibilidade
  - Hover: Efeitos de brilho e elevação

## 🔄 Melhorias Implementadas
1. Sistema de notificações para tarefas
2. Visão mensal com calendário interativo
3. Temas claro/escuro
4. Animações e transições suaves
5. Interface mais intuitiva e responsiva
6. Melhor organização visual das tarefas
7. Sistema de prioridades
8. Contador de tarefas pendentes
9. Efeitos hover em todos os elementos
10. Feedback visual rico
11. Validações de formulários
12. Persistência de dados
13. Scrollbars personalizadas
14. Efeitos de blur e sombra
15. Sistema de permissões para notificações

## 💡 Sugestões de Melhorias Futuras

### Funcionalidades
1. **Sincronização com Calendário**
   - Integração com Google Calendar
   - Exportação de tarefas
   - Sincronização com outros serviços

2. **Recorrência de Tarefas**
   - Opção para tarefas diárias/semanais/mensais
   - Repetição automática
   - Padrões de recorrência personalizados

3. **Categorias Personalizadas**
   - Criação de tags personalizadas
   - Filtros por categoria
   - Cores personalizadas para categorias

4. **Compartilhamento**
   - Compartilhar tarefas com outros usuários
   - Trabalho colaborativo
   - Comentários em tarefas

5. **Backup e Sincronização**
   - Salvamento automático na nuvem
   - Sincronização entre dispositivos
   - Histórico de alterações

### Interface
1. **Modo Compacto**
   - Visualização em lista mais densa
   - Opção de mini-calendário
   - Atalhos de teclado

2. **Personalização**
   - Temas personalizados
   - Layouts customizáveis
   - Cores personalizadas

3. **Acessibilidade**
   - Suporte a leitores de tela
   - Atalhos de teclado
   - Alto contraste
   - Navegação por teclado

4. **Visualizações Adicionais**
   - Visão semanal
   - Visão de agenda
   - Timeline de tarefas
   - Kanban board

### Performance
1. **Otimização**
   - Carregamento lazy de componentes
   - Cache de dados
   - Compressão de assets
   - PWA (Progressive Web App)

2. **Offline**
   - Funcionamento sem internet
   - Sincronização quando online
   - Cache de recursos

## 🛠️ Tecnologias Utilizadas
- HTML5
- CSS3 (Flexbox, Grid, Variáveis CSS)
- JavaScript (ES6+)
- Font Awesome (ícones)
- Google Fonts
- LocalStorage API
- Notification API
- Web Audio API

## 📱 Compatibilidade
- Navegadores modernos
- Design responsivo para mobile
- Suporte a diferentes resoluções
- PWA ready

## 🔒 Segurança
- Validação de dados
- Sanitização de inputs
- Proteção contra XSS
- Permissões seguras

## 📈 Próximos Passos
1. Implementar sistema de backup
2. Adicionar mais opções de personalização
3. Melhorar acessibilidade
4. Otimizar performance
5. Adicionar mais integrações
6. Implementar PWA
7. Adicionar testes automatizados
8. Melhorar documentação

## 🚀 Como Executar Localmente

1. Clone o repositório:
```bash
git clone https://github.com/Ma4rt/lista-de-tarefas-vesion-2.git
```

2. Navegue até o diretório do projeto:
```bash
cd lista-de-tarefas-vesion-2
```

3. Abra o arquivo `src/index.html` em seu navegador ou use um servidor local:
```bash
# Usando Python
python -m http.server 8000

# Usando Node.js
npx serve src
```

4. Acesse `http://localhost:8000` no seu navegador

## 📦 Estrutura do Projeto
```
lista-de-tarefas-vesion-2/
├── src/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── script.js
│   │   └── check_notifications.js
│   └── index.html
├── .github/
│   └── workflows/
│       └── deploy.yml
├── .gitignore
└── README.md
```

## 🤝 Contribuindo
1. Faça um Fork do projeto
2. Crie uma Branch para sua Feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a Branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença
Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📧 Contato
Rafael Martinelli - martinelli.fix@gmail.com

Link do Projeto: [https://github.com/Ma4rt/lista-de-tarefas-vesion-2](https://github.com/Ma4rt/lista-de-tarefas-vesion-2) 