export class ThemeService {
    private currentTheme: 'light' | 'dark' = 'dark';

    constructor() {
        this.loadTheme();
        this.applyTheme();
    }

    private loadTheme(): void {
        const saved = localStorage.getItem('sonix-theme') as 'light' | 'dark';
        this.currentTheme = saved || 'dark';
    }

    private applyTheme(): void {
        document.body.className = `${this.currentTheme}-theme`;
        document.documentElement.className = `${this.currentTheme}-theme`;
    }

    toggleTheme(): void {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        localStorage.setItem('sonix-theme', this.currentTheme);
        this.notifyListeners();
    }

    getCurrentTheme(): 'light' | 'dark' {
        return this.currentTheme;
    }

    private listeners: Function[] = [];

    on(callback: Function): void {
        this.listeners.push(callback);
    }

    private notifyListeners(): void {
        this.listeners.forEach(callback => callback(this.currentTheme));
    }
}