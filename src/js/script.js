/**
 * Task Management Application with Calendar Integration
 * Pure vanilla JavaScript implementation with localStorage persistence
 */

// Global state management
const AppState = {
    tasks: [],
    currentEditingTask: null,
    currentDate: new Date(),
    showCompleted: true,
    maxVisibleTasks: 10,
    reminderTimeouts: new Map(),
    theme: localStorage.getItem('theme') || 'light'
};

// Utility functions
const Utils = {
    /**
     * Format date for display
     * @param {Date} date - Date to format
     * @returns {string} - Formatted date string
     */
    formatDate(date) {
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            weekday: 'short'
        };
        return date.toLocaleDateString('pt-BR', options);
    },

    /**
     * Format date and time for display
     * @param {Date} date - Date to format
     * @returns {string} - Formatted date and time string
     */
    formatDateTime(date) {
        const dateStr = date.toLocaleDateString('pt-BR');
        const timeStr = date.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        return `${dateStr} às ${timeStr}`;
    },

    /**
     * Summarize text to specified length
     * @param {string} text - Text to summarize
     * @param {number} maxLength - Maximum length
     * @returns {string} - Summarized text
     */
    summarizeText(text, maxLength = 100) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    },

    /**
     * Debounce function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} - Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Generate unique ID for tasks
     * @returns {string} - Unique ID
     */
    generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * Validate task data
     * @param {Object} task - Task object to validate
     * @returns {Object} - Validation result
     */
    validateTask(task) {
        const errors = [];
        
        if (!task.title || task.title.trim().length === 0) {
            errors.push('Título da tarefa é obrigatório');
        }
        
        if (!task.date || isNaN(new Date(task.date).getTime())) {
            errors.push('Data válida é obrigatória');
        }
        
        if (task.title && task.title.length > 100) {
            errors.push('Título muito longo (máximo 100 caracteres)');
        }
        
        if (task.description && task.description.length > 500) {
            errors.push('Descrição muito longa (máximo 500 caracteres)');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    },

    /**
     * Get relative time string
     * @param {Date} date - Date to compare
     * @returns {string} - Relative time string
     */
    getRelativeTime(date) {
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMs < 0) {
            return 'Vencida';
        } else if (diffMinutes < 60) {
            return `Em ${diffMinutes} min`;
        } else if (diffHours < 24) {
            return `Em ${diffHours}h`;
        } else {
            return `Em ${diffDays} dia(s)`;
        }
    },

    /**
     * Play notification sound
     */
    playNotificationSound() {
        try {
            // Create audio context for notification sound
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.warn('Could not play notification sound:', error);
        }
    }
};

// Local storage management
const Storage = {
    /**
     * Save tasks to localStorage
     * @param {Array} tasks - Tasks array
     */
    saveTasks(tasks) {
        try {
            localStorage.setItem('tasks', JSON.stringify(tasks));
        } catch (error) {
            console.error('Error saving tasks:', error);
            if (window.notificationManager) {
                window.notificationManager.showToast('error', 'Erro', 'Não foi possível salvar as tarefas.');
            }
        }
    },

    /**
     * Load tasks from localStorage
     * @returns {Array} - Tasks array
     */
    loadTasks() {
        try {
            const tasks = localStorage.getItem('tasks');
            if (tasks) {
                const parsedTasks = JSON.parse(tasks);
                // Convert date strings back to Date objects
                return parsedTasks.map(task => ({
                    ...task,
                    date: new Date(task.date),
                    createdAt: new Date(task.createdAt),
                    updatedAt: task.updatedAt ? new Date(task.updatedAt) : null
                }));
            }
            return [];
        } catch (error) {
            console.error('Error loading tasks:', error);
            return [];
        }
    },

    /**
     * Save app settings
     * @param {Object} settings - Settings object
     */
    saveSettings(settings) {
        try {
            Object.keys(settings).forEach(key => {
                localStorage.setItem(key, settings[key]);
            });
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }
};

// --- INTEGRAÇÃO COM BACKEND ---
const API_URL = 'http://localhost:3001/api/tasks';

const BackendTasks = {
    async fetchTasks() {
        const token = localStorage.getItem('token');
        const res = await fetch(API_URL, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) throw new Error('Erro ao buscar tarefas');
        return await res.json();
    },
    async createTask(task) {
        const token = localStorage.getItem('token');
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({
                title: task.title,
                description: task.description,
                due_date: task.date.toISOString().slice(0, 16) // yyyy-mm-ddThh:mm
            })
        });
        if (!res.ok) throw new Error('Erro ao criar tarefa');
        return await res.json();
    },
    async updateTask(taskId, task) {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({
                title: task.title,
                description: task.description,
                due_date: task.date.toISOString().slice(0, 16),
                status: task.status || 'pendente'
            })
        });
        if (!res.ok) throw new Error('Erro ao atualizar tarefa');
        return await res.json();
    },
    async deleteTask(taskId) {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/${taskId}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) throw new Error('Erro ao excluir tarefa');
        return await res.json();
    }
};

// --- COMPARTILHAMENTO DE TAREFAS ---
const ShareAPI = {
    async shareTask(taskId, to_email) {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/${taskId}/share`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ to_email })
        });
        if (!res.ok) throw new Error('Erro ao compartilhar tarefa');
        return await res.json();
    },
    async getReceivedShares() {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/shared/received`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) throw new Error('Erro ao buscar tarefas compartilhadas recebidas');
        return await res.json();
    },
    async getSentShares() {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/shared/sent`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!res.ok) throw new Error('Erro ao buscar tarefas compartilhadas enviadas');
        return await res.json();
    },
    async respondShare(share_id, response) {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/shared/${share_id}/respond`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ response })
        });
        if (!res.ok) throw new Error('Erro ao responder compartilhamento');
        return await res.json();
    }
};

// Task Manager
const TaskManager = {
    /**
     * Initialize task manager
     */
    init() {
        this.loadTasks();
        this.setupEventListeners();
        this.updateTaskList();
        this.scheduleExistingNotifications();
    },

    /**
     * Load tasks from storage
     */
    async loadTasks() {
        try {
            AppState.tasks = (await BackendTasks.fetchTasks()).map(task => ({
                id: task.id,
                title: task.title,
                description: task.description,
                date: new Date(task.due_date),
                status: task.status,
                createdAt: new Date(task.created_at),
                updatedAt: task.updated_at ? new Date(task.updated_at) : null
            }));
        } catch (e) {
            AppState.tasks = [];
            alert('Erro ao carregar tarefas do servidor.');
        }
    },

    /**
     * Setup event listeners for task management
     */
    setupEventListeners() {
        const taskForm = document.getElementById('taskForm');
        const showMoreBtn = document.getElementById('showMoreTasks');
        const cancelEditBtn = document.getElementById('cancelEdit');

        if (taskForm) {
            taskForm.addEventListener('submit', this.handleTaskSubmit.bind(this));
        }

        if (showMoreBtn) {
            showMoreBtn.addEventListener('click', this.showMoreTasks.bind(this));
        }

        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', this.cancelEdit.bind(this));
        }

        // Listen for notification actions
        window.addEventListener('markTaskDone', this.handleNotificationMarkDone.bind(this));
        window.addEventListener('snoozeTask', this.handleNotificationSnooze.bind(this));
    },

    /**
     * Handle task form submission
     * @param {Event} event - Form submit event
     */
    handleTaskSubmit(event) {
        event.preventDefault();
        
        const formData = this.getFormData();
        const validation = Utils.validateTask(formData);
        
        if (!validation.isValid) {
            this.showValidationErrors(validation.errors);
            return;
        }

        if (AppState.currentEditingTask) {
            this.updateTask(AppState.currentEditingTask.id, formData);
        } else {
            this.addTask(formData);
        }

        this.resetForm();
    },

    /**
     * Get form data
     * @returns {Object} - Form data object
     */
    getFormData() {
        const titleEl = document.getElementById('taskTitle');
        const descriptionEl = document.getElementById('taskDescription');
        const dateEl = document.getElementById('taskDate');
        const timeEl = document.getElementById('taskTime');

        const dateTime = new Date(`${dateEl.value}T${timeEl.value}`);

        return {
            title: titleEl.value.trim(),
            description: descriptionEl.value.trim(),
            date: dateTime
        };
    },

    /**
     * Show validation errors
     * @param {Array} errors - Array of error messages
     */
    showValidationErrors(errors) {
        const errorMessage = errors.join('\n');
        if (window.notificationManager) {
            window.notificationManager.showToast('error', 'Erro de validação', errorMessage);
        } else {
            alert(errorMessage);
        }
    },

    /**
     * Add new task
     * @param {Object} taskData - Task data
     */
    async addTask(taskData) {
        try {
            const task = await BackendTasks.createTask(taskData);
            await this.loadTasks();
            this.updateTaskList();
            CalendarManager.updateCalendar();
            if (window.notificationManager) {
                window.notificationManager.showToast('success', 'Tarefa criada!', 'Nova tarefa adicionada com sucesso.');
            }
            this.showReminderModal(task);
        } catch (e) {
            alert('Erro ao criar tarefa.');
        }
    },

    /**
     * Update existing task
     * @param {string} taskId - Task ID
     * @param {Object} taskData - Updated task data
     */
    async updateTask(taskId, taskData) {
        try {
            await BackendTasks.updateTask(taskId, taskData);
            await this.loadTasks();
            this.updateTaskList();
            CalendarManager.updateCalendar();
            if (window.notificationManager) {
                window.notificationManager.showToast('success', 'Tarefa atualizada!', 'Tarefa modificada com sucesso.');
            }
        } catch (e) {
            alert('Erro ao atualizar tarefa.');
        }
    },

    /**
     * Edit task
     * @param {string} taskId - Task ID
     */
    editTask(taskId) {
        const task = AppState.tasks.find(t => t.id === taskId);
        if (!task) return;

        AppState.currentEditingTask = task;

        // Populate form
        const titleEl = document.getElementById('taskTitle');
        const descriptionEl = document.getElementById('taskDescription');
        const dateEl = document.getElementById('taskDate');
        const timeEl = document.getElementById('taskTime');
        const submitBtn = document.querySelector('#taskForm button[type="submit"]');
        const cancelBtn = document.getElementById('cancelEdit');

        if (titleEl) titleEl.value = task.title || '';
        if (descriptionEl) descriptionEl.value = task.description || '';
        if (dateEl) dateEl.value = task.date.toISOString().split('T')[0];
        if (timeEl) timeEl.value = task.date.toTimeString().slice(0, 5);
        
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Alterações';
        }
        
        if (cancelBtn) {
            cancelBtn.style.display = 'inline-flex';
        }

        // Scroll to form
        document.getElementById('taskForm').scrollIntoView({ behavior: 'smooth' });
    },

    /**
     * Cancel edit mode
     */
    cancelEdit() {
        AppState.currentEditingTask = null;
        this.resetForm();
    },

    /**
     * Reset form to initial state
     */
    resetForm() {
        const form = document.getElementById('taskForm');
        const submitBtn = form.querySelector('button[type="submit"]');
        const cancelBtn = document.getElementById('cancelEdit');

        form.reset();
        
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-plus"></i> Adicionar Tarefa';
        }
        
        if (cancelBtn) {
            cancelBtn.style.display = 'none';
        }

        AppState.currentEditingTask = null;
    },

    /**
     * Toggle task completion status
     * @param {string} taskId - Task ID
     */
    toggleTask(taskId) {
        const task = AppState.tasks.find(t => t.id === taskId);
        if (!task) return;

        task.completed = !task.completed;
        task.updatedAt = new Date();

        // Clear reminder if task is completed
        if (task.completed && task.reminder) {
            this.clearTaskReminder(task);
        }

        Storage.saveTasks(AppState.tasks);
        this.updateTaskList();
        CalendarManager.updateCalendar();

        const status = task.completed ? 'concluída' : 'reaberta';
        if (window.notificationManager) {
            window.notificationManager.showToast('info', `Tarefa ${status}!`, task.title || task.text || 'Tarefa sem título');
        }
    },

    /**
     * Remove task
     * @param {string} taskId - Task ID
     */
    async removeTask(taskId) {
        try {
            await BackendTasks.deleteTask(taskId);
            await this.loadTasks();
            this.updateTaskList();
            CalendarManager.updateCalendar();
            if (window.notificationManager) {
                window.notificationManager.showToast('success', 'Tarefa excluída!', 'Tarefa removida com sucesso.');
            }
        } catch (e) {
            alert('Erro ao excluir tarefa.');
        }
    },

    /**
     * Show reminder configuration modal
     * @param {Object} task - Task object
     */
    showReminderModal(task) {
        const modal = document.getElementById('reminderModal');
        if (!modal) return;

        AppState.currentReminderTask = task;
        
        // Setup modal event listeners
        this.setupReminderModalListeners();
        
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
    },

    /**
     * Setup reminder modal event listeners
     */
    setupReminderModalListeners() {
        const modal = document.getElementById('reminderModal');
        const confirmBtn = document.getElementById('confirmReminder');
        const cancelBtn = document.getElementById('cancelReminder');
        const closeBtn = modal.querySelector('.modal-close');
        const reminderOptions = modal.querySelectorAll('.reminder-option');

        // Remove existing listeners
        confirmBtn.replaceWith(confirmBtn.cloneNode(true));
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
        closeBtn.replaceWith(closeBtn.cloneNode(true));

        const newConfirmBtn = document.getElementById('confirmReminder');
        const newCancelBtn = document.getElementById('cancelReminder');
        const newCloseBtn = modal.querySelector('.modal-close');

        // Selected reminder time
        let selectedMinutes = null;

        // Handle reminder option selection
        reminderOptions.forEach(option => {
            const newOption = option.cloneNode(true);
            option.parentNode.replaceChild(newOption, option);
            
            newOption.addEventListener('click', () => {
                reminderOptions.forEach(opt => opt.classList.remove('selected'));
                newOption.classList.add('selected');
                selectedMinutes = parseInt(newOption.dataset.minutes);
                newConfirmBtn.disabled = false;
            });
        });

        // Confirm reminder
        newConfirmBtn.addEventListener('click', () => {
            if (selectedMinutes !== null && AppState.currentReminderTask) {
                this.setTaskReminder(AppState.currentReminderTask.id, selectedMinutes);
            }
            this.closeReminderModal();
        });

        // Cancel/close modal
        const closeModal = () => this.closeReminderModal();
        newCancelBtn.addEventListener('click', closeModal);
        newCloseBtn.addEventListener('click', closeModal);

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Reset selections
        reminderOptions.forEach(opt => opt.classList.remove('selected'));
        newConfirmBtn.disabled = true;
    },

    /**
     * Close reminder modal
     */
    closeReminderModal() {
        const modal = document.getElementById('reminderModal');
        if (modal) {
            modal.classList.remove('show');
            modal.setAttribute('aria-hidden', 'true');
        }
        AppState.currentReminderTask = null;
    },

    /**
     * Set task reminder
     * @param {string} taskId - Task ID
     * @param {number} minutesBefore - Minutes before task to remind
     */
    setTaskReminder(taskId, minutesBefore) {
        const task = AppState.tasks.find(t => t.id === taskId);
        if (!task) return;

        // Clear existing reminder
        if (task.reminder) {
            this.clearTaskReminder(task);
        }

        const reminderTime = new Date(task.date.getTime() - (minutesBefore * 60 * 1000));
        const now = new Date();

        if (reminderTime <= now) {
            if (window.notificationManager) {
                window.notificationManager.showToast('warning', 'Lembrete não definido', 'O horário do lembrete já passou.');
            }
            return;
        }

        task.reminder = {
            minutesBefore,
            scheduledFor: reminderTime
        };

        this.scheduleNotification(task);
        Storage.saveTasks(AppState.tasks);
        this.updateTaskList();

        const timeDesc = this.getReminderTimeDescription(minutesBefore);
        if (window.notificationManager) {
            window.notificationManager.showToast('success', 'Lembrete definido!', `Você será lembrado ${timeDesc}.`);
        }
    },

    /**
     * Get reminder time description
     * @param {number} minutes - Minutes before
     * @returns {string} - Description
     */
    getReminderTimeDescription(minutes) {
        if (minutes < 60) {
            return `${minutes} minutos antes`;
        } else if (minutes < 1440) {
            const hours = Math.floor(minutes / 60);
            return `${hours} hora(s) antes`;
        } else {
            const days = Math.floor(minutes / 1440);
            return `${days} dia(s) antes`;
        }
    },

    /**
     * Clear task reminder
     * @param {Object} task - Task object
     */
    clearTaskReminder(task) {
        if (task.reminder && AppState.reminderTimeouts.has(task.id)) {
            clearTimeout(AppState.reminderTimeouts.get(task.id));
            AppState.reminderTimeouts.delete(task.id);
        }
        task.reminder = null;
    },

    /**
     * Schedule notification for task
     * @param {Object} task - Task object
     */
    scheduleNotification(task) {
        if (!task.reminder) return;

        const now = new Date();
        const reminderTime = new Date(task.reminder.scheduledFor);
        const delay = reminderTime.getTime() - now.getTime();

        if (delay <= 0) return;

        const timeoutId = setTimeout(() => {
            this.showTaskNotification(task);
            AppState.reminderTimeouts.delete(task.id);
        }, delay);

        AppState.reminderTimeouts.set(task.id, timeoutId);
    },

    /**
     * Show task notification
     * @param {Object} task - Task object
     */
    showTaskNotification(task) {
        // Play sound
        Utils.playNotificationSound();

        // Show browser notification
        if (window.notificationManager && window.notificationManager.isPermissionGranted()) {
            const title = '🔔 Lembrete de Tarefa';
            const body = `${task.text}\n⏰ ${Utils.formatDateTime(task.date)}`;
            
            window.notificationManager.createNotification(title, body, {
                tag: `task-${task.id}`,
                requireInteraction: true
            });
        } else {
            // Fallback toast notification
            if (window.notificationManager) {
                window.notificationManager.showToast('warning', '🔔 Lembrete!', `${task.text} - ${Utils.formatDateTime(task.date)}`);
            }
        }
    },

    /**
     * Schedule existing notifications on app load
     */
    scheduleExistingNotifications() {
        AppState.tasks.forEach(task => {
            if (task.reminder && !task.completed) {
                this.scheduleNotification(task);
            }
        });
    },

    /**
     * Handle notification mark done action
     * @param {Event} event - Custom event
     */
    handleNotificationMarkDone(event) {
        const { notificationTag } = event.detail;
        const taskId = notificationTag.replace('task-', '');
        this.toggleTask(taskId);
    },

    /**
     * Handle notification snooze action
     * @param {Event} event - Custom event
     */
    handleNotificationSnooze(event) {
        const { notificationTag, minutes } = event.detail;
        const taskId = notificationTag.replace('task-', '');
        
        const task = AppState.tasks.find(t => t.id === taskId);
        if (task) {
            // Update task date
            task.date = new Date(task.date.getTime() + (minutes * 60 * 1000));
            
            // Reschedule reminder if exists
            if (task.reminder) {
                task.reminder.scheduledFor = new Date(task.date.getTime() - (task.reminder.minutesBefore * 60 * 1000));
                this.scheduleNotification(task);
            }
            
            Storage.saveTasks(AppState.tasks);
            this.updateTaskList();
            CalendarManager.updateCalendar();
            
            if (window.notificationManager) {
                window.notificationManager.showToast('info', 'Tarefa adiada!', `Adiada por ${minutes} minutos.`);
            }
        }
    },

    /**
     * Show more tasks
     */
    showMoreTasks() {
        AppState.maxVisibleTasks += 10;
        this.updateTaskList();
    },

    /**
     * Update task list display
     */
    updateTaskList() {
        const taskList = document.getElementById('taskList');
        const showMoreBtn = document.getElementById('showMoreTasks');
        const taskCounter = document.getElementById('taskCounter');

        if (!taskList) return;

        // Sort tasks by date (earliest first)
        const sortedTasks = [...AppState.tasks].sort((a, b) => a.date.getTime() - b.date.getTime());
        
        // Filter tasks if needed
        const filteredTasks = AppState.showCompleted ? 
            sortedTasks : 
            sortedTasks.filter(task => !task.completed);

        // Update counter
        if (taskCounter) {
            const total = AppState.tasks.length;
            const completed = AppState.tasks.filter(t => t.completed).length;
            taskCounter.textContent = `${total} tarefa(s) (${completed} concluída(s))`;
        }

        // Clear current list
        taskList.innerHTML = '';

        if (filteredTasks.length === 0) {
            taskList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <p>Nenhuma tarefa encontrada</p>
                    <small>Adicione sua primeira tarefa acima!</small>
                </div>
            `;
            if (showMoreBtn) showMoreBtn.style.display = 'none';
            return;
        }

        // Render visible tasks
        const visibleTasks = filteredTasks.slice(0, AppState.maxVisibleTasks);
        visibleTasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            taskList.appendChild(taskElement);
        });

        // Show/hide "Show More" button
        if (showMoreBtn) {
            showMoreBtn.style.display = filteredTasks.length > AppState.maxVisibleTasks ? 'block' : 'none';
        }
    },

    /**
     * Create task element
     * @param {Object} task - Task object
     * @returns {HTMLElement} - Task element
     */
    createTaskElement(task) {
        const taskItem = document.createElement('div');
        taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;
        taskItem.setAttribute('role', 'listitem');

        const isOverdue = !task.completed && task.date < new Date();
        const relativeTime = Utils.getRelativeTime(task.date);

        taskItem.innerHTML = `
            <div class="task-checkbox ${task.completed ? 'checked' : ''}" 
                 onclick="TaskManager.toggleTask('${task.id}')"
                 role="checkbox" 
                 aria-checked="${task.completed}"
                 aria-label="Marcar tarefa como ${task.completed ? 'pendente' : 'concluída'}">
            </div>
            <div class="task-content">
                <div class="task-title">${task.title || task.text || 'Tarefa sem título'}</div>
                ${task.description ? `<div class="task-description">${Utils.summarizeText(task.description, 150)}</div>` : ''}
                <div class="task-datetime ${isOverdue ? 'overdue' : ''}">
                    <i class="fas fa-calendar"></i>
                    <span>${Utils.formatDateTime(task.date)}</span>
                    <span class="relative-time">(${relativeTime})</span>
                </div>
                ${task.reminder ? `
                    <div class="task-reminder">
                        <i class="fas fa-bell"></i>
                        <span>Lembrete: ${this.getReminderTimeDescription(task.reminder.minutesBefore)}</span>
                    </div>
                ` : ''}
            </div>
            <div class="task-actions">
                <button class="edit" onclick="TaskManager.editTask('${task.id}')" 
                        aria-label="Editar tarefa" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="reminder" onclick="TaskManager.showReminderModal(AppState.tasks.find(t => t.id === '${task.id}'))" 
                        aria-label="Configurar lembrete" title="Lembrete">
                    <i class="fas fa-bell"></i>
                </button>
                <button class="delete" onclick="TaskManager.removeTask('${task.id}')" 
                        aria-label="Excluir tarefa" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        return taskItem;
    }
};

// Calendar Manager
const CalendarManager = {
    /**
     * Initialize calendar
     */
    init() {
        console.log('CalendarManager.init() called'); // Debug log
        this.setupEventListeners();
        this.populateYearSelect();
        this.updateCalendar();
    },

    /**
     * Setup calendar event listeners
     */
    setupEventListeners() {
        console.log('Setting up calendar event listeners'); // Debug log
        const prevBtn = document.getElementById('prevMonth');
        const nextBtn = document.getElementById('nextMonth');
        const yearSelect = document.getElementById('yearSelect');
        const monthViewBtn = document.getElementById('monthViewBtn');

        console.log('Month View Button found:', monthViewBtn); // Debug log

        if (prevBtn) prevBtn.addEventListener('click', this.prevMonth.bind(this));
        if (nextBtn) nextBtn.addEventListener('click', this.nextMonth.bind(this));
        if (yearSelect) yearSelect.addEventListener('change', this.changeYear.bind(this));
        if (monthViewBtn) {
            console.log('Adding click listener to Month View Button'); // Debug log
            monthViewBtn.addEventListener('click', (e) => {
                console.log('Month View Button clicked', e); // Debug log
                e.preventDefault();
                e.stopPropagation();
                this.openMonthView();
            });
        } else {
            console.error('Month View Button not found!'); // Debug log
        }

        // Month view modal listeners
        this.setupMonthModalListeners();
    },

    /**
     * Setup month modal event listeners
     */
    setupMonthModalListeners() {
        const modal = document.getElementById('monthModal');
        const closeBtn = modal?.querySelector('.modal-close');
        const prevBtn = document.getElementById('prevMonthModal');
        const nextBtn = document.getElementById('nextMonthModal');
        const yearSelect = document.getElementById('yearSelectModal');

        if (closeBtn) closeBtn.addEventListener('click', this.closeMonthModal.bind(this));
        if (prevBtn) prevBtn.addEventListener('click', () => {
            this.prevMonth();
            this.updateMonthModal();
        });
        if (nextBtn) nextBtn.addEventListener('click', () => {
            this.nextMonth();
            this.updateMonthModal();
        });
        if (yearSelect) yearSelect.addEventListener('change', (e) => {
            AppState.currentDate.setFullYear(parseInt(e.target.value));
            this.updateCalendar();
            this.updateMonthModal();
        });

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeMonthModal();
            });
        }
    },

    /**
     * Populate year select options
     */
    populateYearSelect() {
        const yearSelects = [
            document.getElementById('yearSelect'),
            document.getElementById('yearSelectModal')
        ];

        const currentYear = new Date().getFullYear();
        const startYear = currentYear - 5;
        const endYear = currentYear + 10;

        yearSelects.forEach(select => {
            if (!select) return;
            
            select.innerHTML = '';
            for (let year = startYear; year <= endYear; year++) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                if (year === AppState.currentDate.getFullYear()) {
                    option.selected = true;
                }
                select.appendChild(option);
            }
        });
    },

    /**
     * Navigate to previous month
     */
    prevMonth() {
        AppState.currentDate.setMonth(AppState.currentDate.getMonth() - 1);
        this.updateCalendar();
        this.updateYearSelects();
    },

    /**
     * Navigate to next month
     */
    nextMonth() {
        AppState.currentDate.setMonth(AppState.currentDate.getMonth() + 1);
        this.updateCalendar();
        this.updateYearSelects();
    },

    /**
     * Change year
     * @param {Event} event - Change event
     */
    changeYear(event) {
        const newYear = parseInt(event.target.value);
        AppState.currentDate.setFullYear(newYear);
        this.updateCalendar();
    },

    /**
     * Update year select elements
     */
    updateYearSelects() {
        const yearSelects = [
            document.getElementById('yearSelect'),
            document.getElementById('yearSelectModal')
        ];

        yearSelects.forEach(select => {
            if (select) {
                select.value = AppState.currentDate.getFullYear();
            }
        });
    },

    /**
     * Update calendar display
     */
    updateCalendar() {
        const calendar = document.getElementById('calendar');
        const currentMonthEl = document.getElementById('currentMonth');

        if (!calendar) return;

        // Update month display
        if (currentMonthEl) {
            currentMonthEl.textContent = AppState.currentDate.toLocaleDateString('pt-BR', { 
                month: 'long', 
                year: 'numeric' 
            });
        }

        // Clear calendar
        calendar.innerHTML = '';

        // Add day headers
        const dayHeaders = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        dayHeaders.forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-header';
            header.textContent = day;
            calendar.appendChild(header);
        });

        // Get first day of month and number of days
        const firstDay = new Date(AppState.currentDate.getFullYear(), AppState.currentDate.getMonth(), 1);
        const lastDay = new Date(AppState.currentDate.getFullYear(), AppState.currentDate.getMonth() + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        // Generate calendar days
        const today = new Date();
        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);

            const dayElement = this.createCalendarDay(date, today, firstDay, lastDay);
            calendar.appendChild(dayElement);
        }
    },

    /**
     * Create calendar day element
     * @param {Date} date - Day date
     * @param {Date} today - Today's date
     * @param {Date} firstDay - First day of month
     * @param {Date} lastDay - Last day of month
     * @returns {HTMLElement} - Day element
     */
    createCalendarDay(date, today, firstDay, lastDay) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = date.getDate();

        // Add classes
        if (date < firstDay || date > lastDay) {
            dayElement.classList.add('other-month');
        }

        if (date.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }

        // Check for tasks on this day
        const dayTasks = this.getTasksForDate(date);
        if (dayTasks.length > 0) {
            dayElement.classList.add('has-tasks');
            dayElement.title = `${dayTasks.length} tarefa(s) neste dia`;
        }

        return dayElement;
    },

    /**
     * Get tasks for specific date
     * @param {Date} date - Date to check
     * @returns {Array} - Tasks for that date
     */
    getTasksForDate(date) {
        return AppState.tasks.filter(task => {
            const taskDate = new Date(task.date);
            return taskDate.toDateString() === date.toDateString();
        });
    },

    /**
     * Open month view modal
     */
    openMonthView() {
        console.log('Opening month view modal'); // Debug log
        const modal = document.getElementById('monthModal');
        console.log('Month Modal Element:', modal); // Debug log
        
        if (!modal) {
            console.error('Month modal element not found!'); // Debug log
            return;
        }

        // Primeiro atualiza o conteúdo
        this.updateMonthModal();
        
        // Depois mostra o modal
        requestAnimationFrame(() => {
            modal.style.display = 'flex';
            modal.classList.add('show');
            modal.setAttribute('aria-hidden', 'false');
            console.log('Month view modal opened successfully'); // Debug log
        });
    },

    /**
     * Close month view modal
     */
    closeMonthModal() {
        const modal = document.getElementById('monthModal');
        if (modal) {
            modal.classList.remove('show');
            modal.setAttribute('aria-hidden', 'true');
        }
    },

    /**
     * Update month modal content
     */
    updateMonthModal() {
        const calendar = document.getElementById('monthCalendar');
        const currentMonthEl = document.getElementById('currentMonthModal');
        const yearSelect = document.getElementById('yearSelectModal');

        if (!calendar) return;

        // Update month display
        if (currentMonthEl) {
            currentMonthEl.textContent = AppState.currentDate.toLocaleDateString('pt-BR', { 
                month: 'long', 
                year: 'numeric' 
            });
        }

        // Update year select
        if (yearSelect) {
            yearSelect.value = AppState.currentDate.getFullYear();
        }

        // Clear calendar
        calendar.innerHTML = '';

        // Add day headers
        const dayHeaders = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        dayHeaders.forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-header';
            header.textContent = day;
            calendar.appendChild(header);
        });

        // Generate month days
        const firstDay = new Date(AppState.currentDate.getFullYear(), AppState.currentDate.getMonth(), 1);
        const lastDay = new Date(AppState.currentDate.getFullYear(), AppState.currentDate.getMonth() + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        const today = new Date();
        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);

            const dayElement = this.createMonthCalendarDay(date, today, firstDay, lastDay);
            calendar.appendChild(dayElement);
        }
    },

    /**
     * Create month calendar day element with tasks
     * @param {Date} date - Day date
     * @param {Date} today - Today's date
     * @param {Date} firstDay - First day of month
     * @param {Date} lastDay - Last day of month
     * @returns {HTMLElement} - Day element
     */
    createMonthCalendarDay(date, today, firstDay, lastDay) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';

        // Day number
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = date.getDate();
        dayElement.appendChild(dayNumber);

        // Add classes
        if (date < firstDay || date > lastDay) {
            dayElement.classList.add('other-month');
        }

        if (date.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }

        // Add tasks
        const dayTasks = this.getTasksForDate(date);
        if (dayTasks.length > 0) {
            dayElement.classList.add('has-tasks');
            
            const tasksContainer = document.createElement('div');
            tasksContainer.className = 'day-tasks';
            
            // Sort tasks by time
            dayTasks.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            // Show all tasks with time
            dayTasks.forEach(task => {
                const taskDot = document.createElement('div');
                taskDot.className = `task-dot ${task.completed ? 'completed' : ''}`;
                
                const taskTime = document.createElement('div');
                taskTime.className = 'task-time';
                taskTime.textContent = Utils.formatDateTime(task.date);
                
                const taskTitle = document.createElement('div');
                taskTitle.className = 'task-title';
                taskTitle.textContent = task.title || task.text || 'Tarefa sem título';
                
                taskDot.appendChild(taskTime);
                taskDot.appendChild(taskTitle);
                tasksContainer.appendChild(taskDot);
            });

            dayElement.appendChild(tasksContainer);

            // Add click handler for expansion
            dayElement.addEventListener('click', (e) => {
                e.stopPropagation();
                
                const calendarGrid = document.querySelector('.month-calendar-grid');
                
                // Remove expanded class from all other days
                document.querySelectorAll('.month-calendar-grid .calendar-day.expanded').forEach(day => {
                    if (day !== dayElement) {
                        day.classList.remove('expanded');
                    }
                });
                
                // Toggle expanded class on clicked day
                dayElement.classList.toggle('expanded');
                
                // Toggle blur effect on background
                if (dayElement.classList.contains('expanded')) {
                    calendarGrid.classList.add('has-expanded');
                } else {
                    calendarGrid.classList.remove('has-expanded');
                }
            });
        }

        return dayElement;
    }
};

// Theme Manager
const ThemeManager = {
    /**
     * Initialize theme manager
     */
    init() {
        this.applyTheme(AppState.theme);
        this.setupEventListeners();
    },

    /**
     * Setup theme event listeners
     */
    setupEventListeners() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', this.toggleTheme.bind(this));
        }
    },

    /**
     * Toggle theme
     */
    toggleTheme() {
        const themeToggle = document.getElementById('themeToggle');
        const logoImg = document.querySelector('.img');
        
        if (themeToggle) {
            // Adiciona a classe de rotação ao botão de tema
            themeToggle.classList.add('rotating');
            
            // Remove a classe após a animação terminar
            setTimeout(() => {
                themeToggle.classList.remove('rotating');
            }, 500);
        }

        if (logoImg) {
            // Adiciona a classe de rotação à imagem do caderno
            logoImg.classList.add('rotating');
            
            // Remove a classe após a animação terminar
            setTimeout(() => {
                logoImg.classList.remove('rotating');
            }, 500);
        }

        AppState.theme = AppState.theme === 'light' ? 'dark' : 'light';
        this.applyTheme(AppState.theme);
        Storage.saveSettings({ theme: AppState.theme });
    },

    /**
     * Apply theme
     * @param {string} theme - Theme name
     */
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
            }
        }
    }
};

// Application initialization
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const loginScreen = document.getElementById('loginScreen');
    const mainContent = document.querySelector('.main-content');
    if (!token) {
        if (mainContent) mainContent.style.display = 'none';
        if (loginScreen) loginScreen.style.display = 'flex';
        return;
    } else {
        if (mainContent) mainContent.style.display = '';
        if (loginScreen) loginScreen.style.display = 'none';
        if (TaskManager && typeof TaskManager.init === 'function') {
            TaskManager.init();
        }
    }
    ThemeManager.init();
    CalendarManager.init();
    // Botões globais de compartilhamento
    const header = document.querySelector('.header-controls');
    if (header) {
        const btnReceived = document.createElement('button');
        btnReceived.textContent = 'Tarefas Compartilhadas';
        btnReceived.className = 'btn btn-outline';
        btnReceived.onclick = () => toggleReceivedSharesModal(true);
        header.appendChild(btnReceived);
        const btnSent = document.createElement('button');
        btnSent.textContent = 'Tarefas que Compartilhei';
        btnSent.className = 'btn btn-outline';
        btnSent.onclick = () => toggleSentSharesModal(true);
        header.appendChild(btnSent);
    }
});

// Função global chamada após login bem-sucedido
window.onLoginSuccess = async function() {
    const loginScreen = document.getElementById('loginScreen');
    const mainContent = document.querySelector('.main-content');
    if (mainContent) mainContent.style.display = '';
    if (loginScreen) loginScreen.style.display = 'none';
    if (TaskManager && typeof TaskManager.init === 'function') {
        await TaskManager.loadTasks();
        TaskManager.init();
    }
};

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Application error:', event.error);
    if (window.notificationManager) {
        window.notificationManager.showToast('error', 'Erro da aplicação', 'Ocorreu um erro inesperado. Recarregue a página se o problema persistir.');
    }
});

// Handle visibility change for notification scheduling
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Reschedule notifications when page becomes visible
        TaskManager.scheduleExistingNotifications();
    }
});

// Export for global access
window.TaskManager = TaskManager;
window.CalendarManager = CalendarManager;
window.ThemeManager = ThemeManager;
window.Utils = Utils;
window.AppState = AppState;

// Add click handler to close expanded days when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.calendar-day')) {
        document.querySelectorAll('.month-calendar-grid .calendar-day.expanded').forEach(day => {
            day.classList.remove('expanded');
        });
        document.querySelector('.month-calendar-grid')?.classList.remove('has-expanded');
    }
});

// Funções globais para modais de compartilhamento
window.toggleShareModal = function(show, taskId) {
    const modal = document.getElementById('shareTaskModal');
    modal.style.display = show ? 'flex' : 'none';
    if (show && taskId) {
        document.getElementById('shareTaskId').value = taskId;
    } else {
        document.getElementById('shareTaskForm').reset();
    }
};
window.toggleReceivedSharesModal = function(show) {
    document.getElementById('receivedSharesModal').style.display = show ? 'flex' : 'none';
    if (show) loadReceivedShares();
};
window.toggleSentSharesModal = function(show) {
    document.getElementById('sentSharesModal').style.display = show ? 'flex' : 'none';
    if (show) loadSentShares();
};

// Evento de envio do formulário de compartilhamento
const shareTaskForm = document.getElementById('shareTaskForm');
if (shareTaskForm) {
    shareTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const taskId = document.getElementById('shareTaskId').value;
        const to_email = document.getElementById('shareEmail').value;
        try {
            await ShareAPI.shareTask(taskId, to_email);
            alert('Tarefa compartilhada!');
            toggleShareModal(false);
        } catch (err) {
            alert('Erro ao compartilhar tarefa.');
        }
    });
}

// Carregar tarefas compartilhadas recebidas
async function loadReceivedShares() {
    const list = document.getElementById('receivedSharesList');
    list.innerHTML = 'Carregando...';
    try {
        const shares = await ShareAPI.getReceivedShares();
        if (shares.length === 0) {
            list.innerHTML = '<p>Nenhuma tarefa compartilhada com você.</p>';
            return;
        }
        list.innerHTML = shares.map(share => `
            <div class="share-item">
                <b>${share.title}</b> de ${share.from_user_name} (${share.from_user_email})<br>
                Status: <span>${share.share_status}</span><br>
                <button onclick="respondShare(${share.id}, 'aceita')" ${share.share_status !== 'pendente' ? 'disabled' : ''}>Aceitar</button>
                <button onclick="respondShare(${share.id}, 'recusada')" ${share.share_status !== 'pendente' ? 'disabled' : ''}>Recusar</button>
            </div>
        `).join('');
    } catch (err) {
        list.innerHTML = '<p>Erro ao carregar tarefas compartilhadas.</p>';
    }
}

// Carregar tarefas compartilhadas enviadas
async function loadSentShares() {
    const list = document.getElementById('sentSharesList');
    list.innerHTML = 'Carregando...';
    try {
        const shares = await ShareAPI.getSentShares();
        if (shares.length === 0) {
            list.innerHTML = '<p>Você não compartilhou nenhuma tarefa ainda.</p>';
            return;
        }
        list.innerHTML = shares.map(share => `
            <div class="share-item">
                <b>${share.title}</b> para ${share.to_user_name} (${share.to_user_email})<br>
                Status: <span>${share.share_status}</span>
            </div>
        `).join('');
    } catch (err) {
        list.innerHTML = '<p>Erro ao carregar tarefas compartilhadas.</p>';
    }
}

// Aceitar ou recusar compartilhamento
window.respondShare = async function(shareId, response) {
    try {
        await ShareAPI.respondShare(shareId, response);
        loadReceivedShares();
        alert('Resposta enviada!');
    } catch (err) {
        alert('Erro ao responder compartilhamento.');
    }
};
