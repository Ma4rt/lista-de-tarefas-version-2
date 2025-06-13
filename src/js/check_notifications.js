/**
 * Notification Permission and Management System
 * Handles browser notification permissions and displays permission requests
 */

class NotificationManager {
    constructor() {
        this.permissionGranted = false;
        this.bannerDismissed = localStorage.getItem('notificationBannerDismissed') === 'true';
        this.init();
    }

    /**
     * Initialize notification system
     */
    init() {
        this.checkPermission();
        this.setupEventListeners();
        this.showBannerIfNeeded();
    }

    /**
     * Check current notification permission status
     */
    checkPermission() {
        if ('Notification' in window) {
            this.permissionGranted = Notification.permission === 'granted';
            
            if (Notification.permission === 'default' && !this.bannerDismissed) {
                this.showPermissionBanner();
            }
        }
    }

    /**
     * Setup event listeners for notification banner
     */
    setupEventListeners() {
        const enableBtn = document.getElementById('enableNotifications');
        const dismissBtn = document.getElementById('dismissBanner');

        if (enableBtn) {
            enableBtn.addEventListener('click', () => this.requestPermission());
        }

        if (dismissBtn) {
            dismissBtn.addEventListener('click', () => this.dismissBanner());
        }
    }

    /**
     * Show notification permission banner
     */
    showPermissionBanner() {
        const banner = document.getElementById('notificationBanner');
        if (banner && !this.bannerDismissed) {
            banner.style.display = 'block';
            setTimeout(() => {
                banner.classList.add('show');
            }, 100);
        }
    }

    /**
     * Show banner if needed (called after DOM is ready)
     */
    showBannerIfNeeded() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.checkPermission();
            });
        } else {
            this.checkPermission();
        }
    }

    /**
     * Request notification permission from user
     */
    async requestPermission() {
        try {
            if ('Notification' in window) {
                const permission = await Notification.requestPermission();
                
                if (permission === 'granted') {
                    this.permissionGranted = true;
                    this.hideBanner();
                    this.showToast('success', 'Notificações ativadas!', 'Você receberá lembretes das suas tarefas.');
                    
                    // Test notification
                    this.showTestNotification();
                } else {
                    this.showToast('warning', 'Permissão negada', 'Você pode ativar as notificações nas configurações do navegador.');
                }
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            this.showToast('error', 'Erro', 'Não foi possível solicitar permissão para notificações.');
        }
    }

    /**
     * Show test notification
     */
    showTestNotification() {
        if (this.permissionGranted) {
            const notification = new Notification('Notificações ativadas! 🎉', {
                body: 'Agora você receberá lembretes das suas tarefas.',
                icon: '/favicon.ico',
                tag: 'test-notification',
                requireInteraction: false
            });

            // Auto close after 3 seconds
            setTimeout(() => {
                notification.close();
            }, 3000);
        }
    }

    /**
     * Create and show a notification
     * @param {string} title - Notification title
     * @param {string} body - Notification body
     * @param {Object} options - Additional notification options
     * @returns {Notification|null} - The notification object or null
     */
    createNotification(title, body, options = {}) {
        if (!this.permissionGranted) {
            console.warn('Notifications not permitted');
            return null;
        }

        try {
            const defaultOptions = {
                body: body,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: `task-reminder-${Date.now()}`,
                requireInteraction: true,
                actions: [
                    {
                        action: 'mark-done',
                        title: 'Marcar como concluída'
                    },
                    {
                        action: 'snooze',
                        title: 'Adiar 5 min'
                    }
                ],
                ...options
            };

            const notification = new Notification(title, defaultOptions);

            // Handle notification click
            notification.onclick = (event) => {
                event.preventDefault();
                window.focus();
                notification.close();
            };

            // Handle notification actions (if supported)
            if ('actions' in notification) {
                notification.addEventListener('notificationclick', (event) => {
                    const action = event.action;
                    
                    if (action === 'mark-done') {
                        // Emit custom event for task completion
                        window.dispatchEvent(new CustomEvent('markTaskDone', {
                            detail: { notificationTag: notification.tag }
                        }));
                    } else if (action === 'snooze') {
                        // Emit custom event for task snooze
                        window.dispatchEvent(new CustomEvent('snoozeTask', {
                            detail: { notificationTag: notification.tag, minutes: 5 }
                        }));
                    }
                    
                    notification.close();
                });
            }

            // Auto close after 10 seconds if not requiring interaction
            if (!defaultOptions.requireInteraction) {
                setTimeout(() => {
                    notification.close();
                }, 10000);
            }

            return notification;

        } catch (error) {
            console.error('Error creating notification:', error);
            return null;
        }
    }

    /**
     * Dismiss notification banner
     */
    dismissBanner() {
        this.bannerDismissed = true;
        localStorage.setItem('notificationBannerDismissed', 'true');
        this.hideBanner();
    }

    /**
     * Hide notification banner
     */
    hideBanner() {
        const banner = document.getElementById('notificationBanner');
        if (banner) {
            banner.classList.remove('show');
            setTimeout(() => {
                banner.style.display = 'none';
            }, 300);
        }
    }

    /**
     * Show toast notification
     * @param {string} type - Toast type (success, error, warning, info)
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     */
    showToast(type, title, message) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        toast.innerHTML = `
            <i class="${iconMap[type] || iconMap.info}"></i>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" aria-label="Fechar">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add close functionality
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            this.removeToast(toast);
        });

        // Add to container
        container.appendChild(toast);

        // Show toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        // Auto remove after 5 seconds
        setTimeout(() => {
            this.removeToast(toast);
        }, 5000);
    }

    /**
     * Remove toast notification
     * @param {HTMLElement} toast - Toast element to remove
     */
    removeToast(toast) {
        if (toast && toast.parentNode) {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }

    /**
     * Check if notifications are supported
     * @returns {boolean} - True if notifications are supported
     */
    isSupported() {
        return 'Notification' in window;
    }

    /**
     * Get current permission status
     * @returns {string} - Permission status
     */
    getPermissionStatus() {
        return Notification.permission;
    }

    /**
     * Check if permission is granted
     * @returns {boolean} - True if permission is granted
     */
    isPermissionGranted() {
        return this.permissionGranted;
    }
}

// Create global notification manager instance
window.notificationManager = new NotificationManager();

// Export for use in other modules
if (typeof module !== 'Undefined' && module.exports) {
    module.exports = NotificationManager;
}
