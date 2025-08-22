export class Header {
    private element: HTMLElement;
    private searchInput: HTMLInputElement;
    private onSearchCallback?: (query: string) => void;

    constructor() {
        this.element = this.createElement();
        this.searchInput = this.element.querySelector('.search-input') as HTMLInputElement;
        this.setupEventListeners();
    }

    private createElement(): HTMLElement {
        const header = document.createElement('header');
        header.className = 'header';
        header.innerHTML = `
            <div class="header-content">
                <div class="logo">
                    <h1>Sonix</h1>
                </div>
                <div class="search-container">
                    <input type="text" class="search-input" placeholder="Search for songs, artists, or albums...">
                    <button class="search-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="m21 21-4.35-4.35"></path>
                        </svg>
                    </button>
                </div>
                <div class="header-actions">
                    <button class="user-menu-btn">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        return header;
    }

    private setupEventListeners(): void {
        const searchBtn = this.element.querySelector('.search-btn') as HTMLButtonElement;
        
        // Search functionality
        this.searchInput.addEventListener('input', (e) => {
            const query = (e.target as HTMLInputElement).value;
            if (this.onSearchCallback) {
                this.onSearchCallback(query);
            }
        });

        searchBtn.addEventListener('click', () => {
            const query = this.searchInput.value;
            if (this.onSearchCallback) {
                this.onSearchCallback(query);
            }
        });

        // Enter key search
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = this.searchInput.value;
                if (this.onSearchCallback) {
                    this.onSearchCallback(query);
                }
            }
        });
    }

    public onSearch(callback: (query: string) => void): void {
        this.onSearchCallback = callback;
    }

    public getElement(): HTMLElement {
        return this.element;
    }

    public setSearchValue(value: string): void {
        this.searchInput.value = value;
    }

    public clearSearch(): void {
        this.searchInput.value = '';
    }
}