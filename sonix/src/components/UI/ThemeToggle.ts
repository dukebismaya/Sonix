export class ThemeToggle {
    private element: HTMLElement;
    private currentTheme: 'light' | 'dark' = 'dark';
    private onThemeChangeCallback?: (theme: 'light' | 'dark') => void;

    constructor() {
        this.element = this.createElement();
        this.initializeTheme();
        this.setupEventListeners();
    }

    private createElement(): HTMLElement {
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'theme-toggle-container';
        toggleContainer.innerHTML = `
            <button class="theme-toggle" title="Toggle theme">
                <div class="toggle-track">
                    <div class="toggle-thumb">
                        <svg class="sun-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="5"></circle>
                            <line x1="12" y1="1" x2="12" y2="3"></line>
                            <line x1="12" y1="21" x2="12" y2="23"></line>
                            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                            <line x1="1" y1="12" x2="3" y2="12"></line>
                            <line x1="21" y1="12" x2="23" y2="12"></line>
                            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                        </svg>
                        <svg class="moon-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="m21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                        </svg>
                    </div>
                </div>
                <span class="theme-label">
                    <span class="light-label">Light</span>
                    <span class="dark-label">Dark</span>
                </span>
            </button>
        `;
        return toggleContainer;
    }

    private initializeTheme(): void {
        // Check for saved theme preference or default to dark
        const savedTheme = localStorage.getItem('sonix-theme') as 'light' | 'dark';
        if (savedTheme) {
            this.currentTheme = savedTheme;
        } else {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.currentTheme = prefersDark ? 'dark' : 'light';
        }

        this.applyTheme(this.currentTheme);
    }

    private setupEventListeners(): void {
        const toggleButton = this.element.querySelector('.theme-toggle') as HTMLButtonElement;

        toggleButton.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('sonix-theme')) {
                this.currentTheme = e.matches ? 'dark' : 'light';
                this.applyTheme(this.currentTheme);
            }
        });

        // Keyboard support
        toggleButton.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggleTheme();
            }
        });
    }

    private toggleTheme(): void {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(this.currentTheme);
        
        // Save preference
        localStorage.setItem('sonix-theme', this.currentTheme);
        
        // Trigger callback
        if (this.onThemeChangeCallback) {
            this.onThemeChangeCallback(this.currentTheme);
        }
    }

    private applyTheme(theme: 'light' | 'dark'): void {
        const body = document.body;
        const html = document.documentElement;
        
        // Remove existing theme classes
        body.classList.remove('light-theme', 'dark-theme');
        html.classList.remove('light-theme', 'dark-theme');
        
        // Add new theme class
        body.classList.add(`${theme}-theme`);
        html.classList.add(`${theme}-theme`);
        
        // Update toggle button state
        const toggleButton = this.element.querySelector('.theme-toggle') as HTMLButtonElement;
        toggleButton.classList.toggle('dark', theme === 'dark');
        toggleButton.classList.toggle('light', theme === 'light');
        
        // Update data attribute for CSS
        toggleButton.setAttribute('data-theme', theme);
        
        // Add smooth transition class temporarily
        body.classList.add('theme-transition');
        setTimeout(() => {
            body.classList.remove('theme-transition');
        }, 300);
    }

    public setTheme(theme: 'light' | 'dark'): void {
        this.currentTheme = theme;
        this.applyTheme(theme);
        localStorage.setItem('sonix-theme', theme);
        
        if (this.onThemeChangeCallback) {
            this.onThemeChangeCallback(theme);
        }
    }

    public getCurrentTheme(): 'light' | 'dark' {
        return this.currentTheme;
    }

    public onThemeChange(callback: (theme: 'light' | 'dark') => void): void {
        this.onThemeChangeCallback = callback;
    }

    public getElement(): HTMLElement {
        return this.element;
    }

    // Static method to get current theme without instantiating
    public static getCurrentTheme(): 'light' | 'dark' {
        const savedTheme = localStorage.getItem('sonix-theme') as 'light' | 'dark';
        if (savedTheme) {
            return savedTheme;
        }
        
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? 'dark' : 'light';
    }

    // Static method to initialize theme before app loads
    public static initializeGlobalTheme(): void {
        const theme = ThemeToggle.getCurrentTheme();
        const body = document.body;
        const html = document.documentElement;
        
        body.classList.add(`${theme}-theme`);
        html.classList.add(`${theme}-theme`);
    }
}