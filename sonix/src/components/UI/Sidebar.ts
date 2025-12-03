import { PlaylistService } from '../../services/PlaylistService';

export class Sidebar {
    private element: HTMLElement;
    private onNavigationCallback?: (section: string) => void;
    private playlistService?: PlaylistService;
    private isCollapsed: boolean = false;
    private activeSection: string = 'home';

    constructor(playlistService?: PlaylistService) {
        this.playlistService = playlistService;
        this.element = this.createElement();
        this.setupEventListeners();
    }

    private createElement(): HTMLElement {
        const sidebar = document.createElement('aside');
        sidebar.className = 'sidebar';
        sidebar.innerHTML = `
            <div class="sidebar-content">
                <div class="sidebar-header">
                    <button class="sidebar-toggle">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>
                </div>
                
                <nav class="sidebar-nav">
                    <div class="nav-section">
                        <ul class="nav-list">
                            <li class="nav-item active" data-section="home">
                                <a href="#" class="nav-link">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                        <polyline points="9,22 9,12 15,12 15,22"></polyline>
                                    </svg>
                                    <span class="nav-text">Home</span>
                                </a>
                            </li>
                            <li class="nav-item" data-section="search">
                                <a href="#" class="nav-link">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <path d="m21 21-4.35-4.35"></path>
                                    </svg>
                                    <span class="nav-text">Search</span>
                                </a>
                            </li>
                            <li class="nav-item" data-section="library">
                                <a href="#" class="nav-link">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                                    </svg>
                                    <span class="nav-text">Your Library</span>
                                </a>
                            </li>
                        </ul>
                    </div>

                    <div class="nav-section">
                        <h3 class="nav-section-title">
                            <span class="nav-text">Playlists</span>
                            <button class="create-playlist-btn">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                            </button>
                        </h3>
                        <ul class="nav-list playlist-list">
                            <li class="nav-item" data-section="liked">
                                <a href="#" class="nav-link">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                    </svg>
                                    <span class="nav-text">Liked Songs</span>
                                </a>
                            </li>
                            <li class="nav-item" data-section="recently-played">
                                <a href="#" class="nav-link">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M1 14s9-3 12-3 11 3 11 3-3 9-11 9-12-9-12-9z"></path>
                                        <path d="M8.5 17l6.5-4-6.5-4v8z"></path>
                                    </svg>
                                    <span class="nav-text">Recently Played</span>
                                </a>
                            </li>
                        </ul>
                    </div>
                </nav>
            </div>
        `;
        return sidebar;
    }

    private setupEventListeners(): void {
        const toggleBtn = this.element.querySelector('.sidebar-toggle') as HTMLButtonElement;
        const navItems = this.element.querySelectorAll('.nav-item');
        const createPlaylistBtn = this.element.querySelector('.create-playlist-btn') as HTMLButtonElement;

        // Toggle sidebar collapse
        toggleBtn.addEventListener('click', () => {
            this.toggle();
        });

        // Navigation items
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.getAttribute('data-section');
                if (section) {
                    this.setActiveSection(section);
                    if (this.onNavigationCallback) {
                        this.onNavigationCallback(section);
                    }
                }
            });
        });

        // Create playlist button
        createPlaylistBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.createNewPlaylist();
        });
    }

    public toggle(): void {
        this.isCollapsed = !this.isCollapsed;
        this.element.classList.toggle('collapsed', this.isCollapsed);
    }

    public collapse(): void {
        this.isCollapsed = true;
        this.element.classList.add('collapsed');
    }

    public expand(): void {
        this.isCollapsed = false;
        this.element.classList.remove('collapsed');
    }

    public setActiveSection(section: string): void {
        // Remove active class from all items
        const navItems = this.element.querySelectorAll('.nav-item');
        navItems.forEach(item => item.classList.remove('active'));

        // Add active class to selected item
        const activeItem = this.element.querySelector(`[data-section="${section}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
            this.activeSection = section;
        }
    }

    public onNavigation(callback: (section: string) => void): void {
        this.onNavigationCallback = callback;
    }

    public removePlaylist(id: string): void {
        const playlistItem = this.element.querySelector(`[data-section="playlist-${id}"]`);
        if (playlistItem) {
            playlistItem.remove();
        }
    }

    public addPlaylist(name: string, id: string): void {
        const playlistList = this.element.querySelector('.playlist-list') as HTMLUListElement;

        // Check if playlist already exists in sidebar - remove duplicates
        const existingPlaylistById = this.element.querySelector(`[data-section="playlist-${id}"]`);
        if (existingPlaylistById) {
            existingPlaylistById.remove();
        }

        // Also check for duplicates by name (manual iteration since :contains() doesn't work)
        const allNavItems = this.element.querySelectorAll('.nav-item');
        allNavItems.forEach(item => {
            const navText = item.querySelector('.nav-text');
            if (navText && navText.textContent?.trim() === name) {
                item.remove();
            }
        });

        const playlistItem = document.createElement('li');
        playlistItem.className = 'nav-item';
        playlistItem.setAttribute('data-section', `playlist-${id}`);

        playlistItem.innerHTML = `
        <a href="#" class="nav-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18V5l12-2v13"></path>
                <circle cx="6" cy="18" r="3"></circle>
                <circle cx="18" cy="16" r="3"></circle>
            </svg>
            <span class="nav-text">${name}</span>
        </a>
    `;

        // Add click listener with proper navigation
        const navLink = playlistItem.querySelector('.nav-link');
        navLink?.addEventListener('click', (e) => {
            e.preventDefault();
            this.setActiveSection(`playlist-${id}`);
            if (this.onNavigationCallback) {
                this.onNavigationCallback(`playlist-${id}`);
            }
        });

        playlistList.appendChild(playlistItem);
    }
    public createNewPlaylist(): void {
        const name = prompt('Enter playlist name:');
        if (name && name.trim()) {
            const playlist = {
                name: name.trim(),
                description: `Custom playlist: ${name.trim()}`
            };

            // Create playlist using the service
            const createdPlaylist = this.playlistService?.createPlaylist(playlist);

            if (createdPlaylist) {
                this.addPlaylist(createdPlaylist.name, createdPlaylist.id);
            }

            if (this.onNavigationCallback) {
                this.onNavigationCallback(`playlist-${createdPlaylist?.id}`);
            }
        }
    }

    public getElement(): HTMLElement {
        return this.element;
    }

    public getActiveSection(): string {
        return this.activeSection;
    }
}