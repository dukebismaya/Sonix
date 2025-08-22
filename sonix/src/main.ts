import * as jsmediatags from 'jsmediatags';

import './styles/main.css';
import './styles/themes/dark.css';
import './styles/themes/light.css';

import { AudioPlayer } from './components/Player/AudioPlayer';
import { PlaylistView } from './components/Player/PlaylistView';
import { AudioVisualizer } from './components/Visualizer/AudioVisualizer';
import { Sidebar } from './components/UI/Sidebar';
import { Header } from './components/UI/Header';
import { ThemeToggle } from './components/UI/ThemeToggle';
import { PlaylistEditor } from './components/UI/PlaylistEditor';
import { AudioService } from './services/AudioService';
import { PlaylistService } from './services/PlaylistService';
import { SearchService } from './services/SearchService';
import { ThemeService } from './services/ThemeService';
import { LikedSongsService } from './services/LikedSongsService';
import { VolumeControl } from './components/Player/VolumeControl';
import { Track, Playlist } from './types';
import { TrackContextMenu } from './components/UI/TrackContextMenu';

class SonixApp {
    private header!: Header;
    private sidebar!: Sidebar;
    private themeToggle!: ThemeToggle;
    private volumeControl!: VolumeControl;
    private audioVisualizer!: AudioVisualizer;
    private audioPlayer!: AudioPlayer;
    private playlistService!: PlaylistService;
    private audioService!: AudioService;
    private themeService!: ThemeService;
    private searchService!: SearchService;
    private likedSongsService!: LikedSongsService;
    private trackContextMenu!: TrackContextMenu;
    private playlistView!: PlaylistView;
    private playlistEditor!: PlaylistEditor;
    private currentView: string = 'home';
    private blobUrls: Set<string> = new Set();

    constructor() {
        this.initializeTheme();
        this.initializeServices();
        this.initializeComponents();
        this.setupLayout();
        this.connectComponents();
        this.loadInitialContent();

        // Clean up blob URLs on page unload
        window.addEventListener('beforeunload', () => {
            this.blobUrls.forEach(url => URL.revokeObjectURL(url));
        });

        (window as any).sonixApp = {
            audioService: this.audioService
        };
        
    }

    private cleanupBlobUrls(track: any): void {
        if (track.url.startsWith('blob:')) {
            this.blobUrls.add(track.url);
        }
        if (track.coverArt && track.coverArt.startsWith('blob:')) {
            this.blobUrls.add(track.coverArt);
        }
    }

    private initializeTheme(): void {
        ThemeToggle.initializeGlobalTheme();
    }

    private initializeServices(): void {
        this.playlistService = new PlaylistService();
        this.audioService = new AudioService();
        this.searchService = new SearchService(this.playlistService);
        this.themeService = new ThemeService();
        this.likedSongsService = new LikedSongsService();
    }

    private initializeComponents(): void {
        this.header = new Header();
        this.sidebar = new Sidebar(this.playlistService);
        this.themeToggle = new ThemeToggle();
        this.volumeControl = new VolumeControl();

        // Initialize AudioVisualizer BEFORE AudioPlayer
        this.audioVisualizer = new AudioVisualizer();
        console.log('🎨 AudioVisualizer initialized');

        const playerContainer = document.createElement('div');
        this.audioPlayer = new AudioPlayer(this.audioService, playerContainer);

        // Connect visualizer to audio service
        this.audioService.connectVisualizer(this.audioVisualizer);
        console.log('🔗 AudioVisualizer connected to AudioService');

        // ADD THE VISUALIZER TO THE DOM - This was likely missing!
        this.addVisualizerToDOM();

        // Initialize TrackContextMenu
        this.trackContextMenu = new TrackContextMenu(this.likedSongsService, this.playlistService);

        // Initialize PlaylistView
        const playlistContainer = document.createElement('div');
        this.playlistView = new PlaylistView(playlistContainer, this.playlistService, this.likedSongsService);

        // Add PlaylistEditor initialization
        this.playlistEditor = new PlaylistEditor(this.playlistService);
        console.log('🎨 PlaylistEditor initialized:', this.playlistEditor);
    }

    private addVisualizerToDOM(): void {
        // Find a good place to add the visualizer - maybe in the main content area
        const mainContent = document.querySelector('.main-content') as HTMLElement;
        const contentView = document.querySelector('.content-view') as HTMLElement;

        if (mainContent && this.audioVisualizer) {
            // Create a container for the visualizer
            const visualizerContainer = document.createElement('div');
            visualizerContainer.className = 'visualizer-container';
            visualizerContainer.style.cssText = `
            position: fixed;
            bottom: 120px;
            left: 20px;
            right: 20px;
            height: 120px;
            z-index: 100;
            pointer-events: none;
        `;

            // Make the canvas itself clickable
            const visualizerCanvas = this.audioVisualizer.getElement();
            visualizerCanvas.style.pointerEvents = 'auto';

            visualizerContainer.appendChild(visualizerCanvas);
            document.body.appendChild(visualizerContainer);

            console.log('✅ AudioVisualizer added to DOM');
        }
    }
    // private addVisualizerToDOM(): void {
    //     // Add visualizer to main content area
    //     const mainContainer = document.querySelector('.main-content') || document.body;
    //     const visualizerContainer = document.createElement('div');
    //     visualizerContainer.className = 'visualizer-container';
    //     visualizerContainer.style.cssText = `
    //         position: fixed;
    //         top: 10px;
    //         right: 10px;
    //         width: 200px;
    //         height: 60px;
    //         background: rgba(0, 0, 0, 0.5);
    //         border-radius: 8px;
    //         padding: 5px;
    //         z-index: 1000;
    //     `;
        
    //     const canvas = this.audioVisualizer.getElement();
    //     canvas.style.width = '100%';
    //     canvas.style.height = '100%';
        
    //     visualizerContainer.appendChild(canvas);
    //     mainContainer.appendChild(visualizerContainer);
        
    //     console.log('🎨 Visualizer added to DOM');
        
    //     // Auto-connect to audio after a short delay
    //     setTimeout(() => {
    //         this.audioVisualizer.autoConnectToAudio();
    //     }, 1000);
    // }

    private setupLayout(): void {
    const app = document.getElementById('app');
    if (!app) {
        throw new Error('App container not found');
    }

    app.innerHTML = '';

    const layout = document.createElement('div');
    layout.className = 'app-layout';
    layout.innerHTML = `
        <div class="app-header"></div>
        <div class="app-body">
            <div class="app-sidebar"></div>
            <div class="app-main">
                <div class="main-content">
                    <div class="content-header">
                        <div class="theme-toggle-container"></div>
                    </div>
                    <div class="content-body">
                        <div class="content-view"></div>
                    </div>
                </div>
            </div>
        </div>
        <div class="app-player">
            <div class="player-container"></div>
        </div>
    `;

    app.appendChild(layout);
    this.mountComponents();
}

    private mountComponents(): void {
    document.querySelector('.app-header')?.appendChild(this.header.getElement());
    document.querySelector('.app-sidebar')?.appendChild(this.sidebar.getElement());
    document.querySelector('.theme-toggle-container')?.appendChild(this.themeToggle.getElement());

    const playerContainer = document.querySelector('.player-container');
    if (playerContainer) {
        playerContainer.appendChild(this.audioPlayer.container);
        
        // Add visualizer directly to the audio player
        if (this.audioVisualizer && this.audioPlayer) {
            this.audioPlayer.addVisualizer(this.audioVisualizer);
        }
    }
}

    private connectComponents(): void {
        // Connect sidebar navigation
        this.sidebar.onNavigation((section) => {
            this.handleNavigation(section);
        });

        // Connect header search
        this.header.onSearch((query) => {
            this.handleSearch(query);
        });

        // Connect theme toggle
        this.themeToggle.onThemeChange((theme) => {
            this.handleThemeChange(theme);
        });

        // Connect audio player events
        this.audioPlayer.onTrackRemoval((trackId, playlistContext) => {
            this.handleTrackRemoval(trackId, playlistContext);
        });

        // Listen to liked songs changes to update UI
        this.likedSongsService.on('changed', (data: { trackId: string, isLiked: boolean }) => {
            this.updateLikedSongUI(data.trackId, data.isLiked);
        });
    }

    private handleTrackRemoval(trackId: string, playlistContext: string | null): void {
        // Remove from the appropriate playlist
        if (playlistContext) {
            const playlist = this.playlistService.getPlaylist(playlistContext);
            if (playlist) {
                this.playlistService.removeTrackFromPlaylist(playlistContext, trackId);

                // Refresh the current view if we're looking at this playlist
                if (this.currentView === `playlist-${playlistContext}`) {
                    this.loadViewContent(this.currentView);
                }

                console.log(`Removed track ${trackId} from playlist ${playlistContext}`);
            }
        } else {
            // Try to find the track in any playlist and remove it
            const allPlaylists = this.playlistService.getAllPlaylists();
            for (const playlist of allPlaylists) {
                const trackExists = playlist.tracks.find(t => t.id === trackId);
                if (trackExists) {
                    this.playlistService.removeTrackFromPlaylist(playlist.id, trackId);

                    // Refresh view if currently viewing this playlist
                    if (this.currentView === `playlist-${playlist.id}`) {
                        this.loadViewContent(this.currentView);
                    }

                    console.log(`Removed track ${trackId} from playlist ${playlist.name}`);
                    break;
                }
            }
        }

        // Show success notification
        this.createNotification('Track removed successfully', 'success');
    }

    private async handleSearch(query: string): Promise<void> {
        if (!query.trim()) {
            this.loadViewContent('search');
            return;
        }

        const contentView = document.querySelector('.content-view');
        if (!contentView) return;

        // Show loading state
        contentView.innerHTML = `
        <div class="search-view">
            <div class="search-loading">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                </div>
                <h2>Searching for "${query}"...</h2>
                <p>Looking through local library and online sources...</p>
            </div>
        </div>
    `;

        try {
            // Perform the search
            const searchResults = await this.searchService.search(query);

            // Display results
            this.displaySearchResults(query, searchResults);
        } catch (error) {
            console.error('Search failed:', error);
            this.displaySearchError(query);
        }
    }
    private displaySearchResults(query: string, results: any): void {
        const contentView = document.querySelector('.content-view');
        if (!contentView) return;

        const hasResults = results.totalResults > 0;

        contentView.innerHTML = `
        <div class="search-view">
            <div class="search-header">
                <h1>Search Results</h1>
                <p>Found ${results.totalResults} result${results.totalResults !== 1 ? 's' : ''} for "${query}"</p>
            </div>

            ${!hasResults ? `
                <div class="no-results">
                    <div class="no-results-icon">🔍</div>
                    <h3>No results found</h3>
                    <p>Try searching with different keywords or check your spelling.</p>
                    <div class="search-suggestions">
                        <h4>Search tips:</h4>
                        <ul>
                            <li>Try different keywords</li>
                            <li>Search by artist, song, or album name</li>
                            <li>Check spelling and try again</li>
                        </ul>
                    </div>
                </div>
            ` : ''}

            ${results.tracks.length > 0 ? `
                <div class="search-section">
                    <h2>Tracks (${results.tracks.length})</h2>
                    <div class="search-tracks">
                        ${results.tracks.map((track: any, index: number) => `
                            <div class="search-track-item" data-track-index="${index}">
                                <div class="track-info">
                                    <div class="track-cover-container">
                                        <img src="${track.coverArt || '/assets/images/default-track.jpeg'}" 
                                             alt="${track.title}" class="track-cover"
                                             onerror="this.src='/assets/images/default-track.jpeg'">
                                    </div>
                                    <div class="track-details">
                                        <div class="track-title">${track.title}</div>
                                        <div class="track-artist">${track.artist}</div>
                                        <div class="track-album">${track.album}</div>
                                    </div>
                                </div>
                                <div class="track-duration">${this.formatDuration(track.duration)}</div>
                                <div class="track-actions">
                                    <button class="play-search-track-btn" data-track-index="${index}">
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M8 5v14l11-7z"/>
                                        </svg>
                                    </button>
                                    <button class="add-to-playlist-btn" data-track-index="${index}">
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            ${results.playlists.length > 0 ? `
                <div class="search-section">
                    <h2>Playlists (${results.playlists.length})</h2>
                    <div class="search-playlists">
                        ${results.playlists.map((playlist: any) => `
                            <div class="search-playlist-item" data-playlist-id="${playlist.id}">
                                <div class="playlist-cover">
                                    <img src="${playlist.coverArt || '/assets/images/default-playlist.jpg'}" 
                                         alt="${playlist.name}" class="playlist-cover-image"
                                         onerror="this.src='/assets/images/default-playlist.jpg'">
                                </div>
                                <div class="playlist-info">
                                    <div class="playlist-name">${playlist.name}</div>
                                    <div class="playlist-description">${playlist.description || ''}</div>
                                    <div class="playlist-stats">${playlist.tracks.length} tracks</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;

        // Add event listeners for search results
        this.setupSearchInteractions(results);
    }

    private displaySearchError(query: string): void {
        const contentView = document.querySelector('.content-view');
        if (!contentView) return;

        contentView.innerHTML = `
        <div class="search-view">
            <div class="search-error">
                <div class="error-icon">⚠️</div>
                <h2>Search Error</h2>
                <p>There was an error searching for "${query}". Please try again.</p>
                <button class="retry-search-btn" onclick="this.closest('.search-view').querySelector('.search-input')?.focus()">
                    Try Again
                </button>
            </div>
        </div>
    `;
    }

    private setupSearchInteractions(results: any): void {
        // Play track buttons
        document.querySelectorAll('.play-search-track-btn').forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const track = results.tracks[index];
                if (track) {
                    this.audioPlayer.playTrack(track, results.tracks);
                }
            });
        });

        // Add to playlist buttons
        document.querySelectorAll('.add-to-playlist-btn').forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const track = results.tracks[index];
                if (track) {
                    this.showAddToPlaylistModal(track);
                }
            });
        });

        // Track items click
        document.querySelectorAll('.search-track-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                const track = results.tracks[index];
                if (track) {
                    this.audioPlayer.playTrack(track, results.tracks);
                }
            });
        });

        // Playlist items click
        document.querySelectorAll('.search-playlist-item').forEach((item) => {
            item.addEventListener('click', () => {
                const playlistId = item.getAttribute('data-playlist-id');
                if (playlistId) {
                    this.handleNavigation(`playlist-${playlistId}`);
                }
            });
        });
    }

    private showAddToPlaylistModal(track: any): void {
        const modal = document.createElement('div');
        modal.className = 'add-to-playlist-modal';

        const playlists = this.playlistService.getAllPlaylists();

        modal.innerHTML = `
        <div class="modal-backdrop">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Add to Playlist</h3>
                    <button class="close-modal-btn">×</button>
                </div>
                <div class="modal-body">
                    <div class="track-preview">
                        <img src="${track.coverArt || '/assets/images/default-track.jpeg'}" alt="${track.title}" class="track-cover">
                        <div>
                            <div class="track-title">${track.title}</div>
                            <div class="track-artist">${track.artist}</div>
                        </div>
                    </div>
                    <div class="playlist-list">
                        ${playlists.map(playlist => `
                            <div class="playlist-option" data-playlist-id="${playlist.id}">
                                <span>${playlist.name}</span>
                                <span class="track-count">${playlist.tracks.length} tracks</span>
                            </div>
                        `).join('')}
                        <div class="playlist-option create-new" data-create-new="true">
                            <span>+ Create New Playlist</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

        document.body.appendChild(modal);

        // Event listeners for modal
        modal.querySelector('.close-modal-btn')?.addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('.modal-backdrop')?.addEventListener('click', (e) => {
            if (e.target === modal.querySelector('.modal-backdrop')) {
                modal.remove();
            }
        });

        modal.querySelectorAll('.playlist-option').forEach(option => {
            option.addEventListener('click', () => {
                const playlistId = option.getAttribute('data-playlist-id');
                const createNew = option.getAttribute('data-create-new');

                if (createNew) {
                    const name = prompt('Enter playlist name:');
                    if (name?.trim()) {
                        const newPlaylist = this.playlistService.createPlaylist({
                            name: name.trim(),
                            description: `Custom playlist: ${name.trim()}`
                        });
                        this.playlistService.addTrackToPlaylist(newPlaylist.id, track);
                        this.sidebar.addPlaylist(newPlaylist.name, newPlaylist.id);
                        modal.remove();
                    }
                } else if (playlistId) {
                    this.playlistService.addTrackToPlaylist(playlistId, track);
                    modal.remove();
                    // Show success message
                    this.showToast(`Added "${track.title}" to playlist`);
                }
            });
        });
    }


    private showToast(message: string): void {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--primary-color);
        color: black;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 500;
        z-index: 10001;
        animation: slideIn 0.3s ease;
    `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }



    private initializePlaylistView(): void {
        const playlistViewContainer = document.querySelector('.main-content') as HTMLElement;
        if (playlistViewContainer) {
            this.playlistView = new PlaylistView(
                playlistViewContainer,
                this.playlistService,
                this.likedSongsService
            );

            // Set up callbacks
            this.playlistView.setOnTrackSelect((track) => {
                const currentPlaylistId = this.getCurrentPlaylistId();
                const playlist = currentPlaylistId ? this.playlistService.getPlaylist(currentPlaylistId) : null;
                const tracks = playlist ? playlist.tracks : [track];
                this.audioPlayer.playTrack(track, tracks);
            });

            this.playlistView.setOnAddToPlaylist((track) => {
                this.showAddToPlaylistModal(track);
            });

            this.playlistView.setOnShowTrackDetails((track) => {
                this.showTrackDetailsModal(track);
            });

            // Playlist updated callback
            this.playlistView.setOnPlaylistUpdated((playlist) => {
                // Update sidebar if playlist name changed
                this.updateSidebarPlaylist(playlist);

                // Show success message
                this.showToast(`Playlist "${playlist.name}" updated successfully!`);
            });
        }
    }

    private updateSidebarPlaylist(playlist: Playlist): void {
        // Find and update the playlist in the sidebar
        const playlistItem = document.querySelector(`[data-section="playlist-${playlist.id}"]`);
        if (playlistItem) {
            const navText = playlistItem.querySelector('.nav-text');
            if (navText) {
                navText.textContent = playlist.name;
            }
        }
    }

    private getCurrentPlaylistId(): string | null {
        const activeNavItem = document.querySelector('.nav-item.active');
        if (activeNavItem) {
            const section = activeNavItem.getAttribute('data-section');
            if (section && section.startsWith('playlist-')) {
                return section.replace('playlist-', '');
            }
        }
        return null;
    }
    private handleNavigation(section: string): void {
        this.loadViewContent(section);
    }

    private handleThemeChange(theme: 'light' | 'dark'): void {
        document.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme }
        }));
    }

    private loadViewContent(section: string): void {
        const contentView = document.querySelector('.content-view') as HTMLElement;
        this.currentView = section;

        if (section.startsWith('playlist-')) {
            const playlistId = section.replace('playlist-', '');
            const playlist = this.playlistService.getPlaylist(playlistId);

            if (playlist) {
                contentView.innerHTML = `
            <div class="playlist-view">
                <div class="playlist-header">
                    <div class="playlist-cover-container">
                        <img src="${playlist.coverArt || '/assets/images/default-playlist.jpg'}" 
                             alt="${playlist.name}" class="playlist-cover-image"
                             onerror="this.src='/assets/images/default-playlist.jpg'"
                             style="width: 200px; height: 200px; object-fit: cover;">
                        <div class="cover-edit-overlay">
                            <button class="edit-cover-btn" title="Edit Playlist">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="playlist-info">
                        <div class="playlist-title-container">
                            <h1 class="playlist-title">${playlist.name}</h1>
                            <button class="edit-title-btn" title="Edit Playlist">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                        </div>
                        <p class="playlist-description">${playlist.description || ''}</p>
                        <div class="playlist-stats">
                            <span>${playlist.tracks.length} tracks</span>
                        </div>
                    </div>
                    <div class="playlist-actions">
                        <button class="play-all-btn" ${playlist.tracks.length === 0 ? 'disabled' : ''}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="5,3 19,12 5,21"></polygon>
                            </svg>
                            Play All
                        </button>
                    </div>
                </div>
                <div class="track-list">
                    ${playlist.tracks.length > 0 ?
                        playlist.tracks.map((track: any, index: number) => {
                            const isLiked = this.likedSongsService ? this.likedSongsService.isLiked(track.id) : false;
                            return `
                            <div class="track-item" data-track-id="${track.id}">
                                <div class="track-number">${index + 1}</div>
                                <div class="track-info">
                                    <div class="track-cover-container">
                                        <img src="${track.coverArt || '/assets/images/default-track.jpeg'}" 
                                             alt="${track.title}" class="track-cover"
                                             onerror="this.src='/assets/images/default-track.jpeg'">
                                    </div>
                                    <div class="track-details">
                                        <div class="track-title">${track.title}</div>
                                        <div class="track-artist">${track.artist}</div>
                                    </div>
                                </div>
                                <div class="track-album">${track.album}</div>
                                <div class="track-duration">${this.formatDuration(track.duration)}</div>
                                <div class="track-actions">
                                    <button class="like-btn ${isLiked ? 'liked' : ''}" title="${isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}" data-track-id="${track.id}">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                        </svg>
                                    </button>
                                    <button class="play-track-btn" data-track-id="${track.id}">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polygon points="5,3 19,12 5,21"></polygon>
                                        </svg>
                                    </button>
                                    <button class="more-options-btn" data-track-index="${index}" data-track-id="${track.id}">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="12" cy="12" r="1"></circle>
                                            <circle cx="12" cy="5" r="1"></circle>
                                            <circle cx="12" cy="19" r="1"></circle>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        `;
                        }).join('')
                        : '<div class="empty-playlist">No tracks in this playlist yet.</div>'
                    }
                </div>
            </div>
        `;

                this.setupPlaylistInteractions(playlist);
            }
        } else if (section === 'liked') {
            this.loadLikedSongsView(contentView);
        } else {
            switch (section) {
                case 'home':
                    contentView.innerHTML = `
                <div class="home-view">
                    <div class="welcome-section">
                        <h1>Welcome to Sonix</h1>
                        <p>Your personal music streaming experience</p>
                    </div>
                    <div class="quick-actions">
                        <div class="action-card upload-card" onclick="this.querySelector('input').click()">
                            <input type="file" accept="audio/*" multiple style="display: none;" id="music-upload">
                            <h3>Upload Music</h3>
                            <p>Add your favorite tracks</p>
                        </div>
                        <div class="action-card create-playlist-card">
                            <h3>Create Playlist</h3>
                            <p>Organize your music</p>
                        </div>
                        <div class="action-card">
                            <h3>Discover</h3>
                            <p>Find new music</p>
                        </div>
                    </div>
                    <div class="url-upload-section">
                        <h3>Add Music from URL</h3>
                        <div class="url-input-container">
                            <input type="url" id="music-url-input" placeholder="Enter music URL">
                            <button id="add-url-btn">Add</button>
                        </div>
                    </div>
                </div>
            `;
                    this.setupHomeActions();
                    break;
                case 'search':
                    contentView.innerHTML = `
                <div class="search-view">
                    <div class="search-header">
                        <h1>Search</h1>
                        <p>Find your favorite music</p>
                    </div>
                    <div class="search-empty">
                        <div class="empty-icon">🔍</div>
                        <p>Start typing to search for tracks, artists, or albums</p>
                    </div>
                </div>
            `;
                    break;
                case 'library':
                    contentView.innerHTML = `
                <div class="library-view">
                    <div class="library-header">
                        <h1>Your Library<hr/></h1>
                        <p>Recently played and saved music</p>
                    </div>
                    <div class="library-content">
                        <p>Your library content will appear here<hr/>Bismaya: This section is under development</p>
                    </div>
                </div>
            `;
                    break;
                default:
                    contentView.innerHTML = `
                <div class="default-view">
                    <h1>Section: ${section}<hr/></h1>
                    <p>Bismaya: This section is under development</p>
                </div>
            `;
            }
        }
    }

    private loadLikedSongsView(contentView: HTMLElement): void {
        // Check if likedSongsService exists
        if (!this.likedSongsService) {
            contentView.innerHTML = `
                <div class="liked-songs-view">
                    <div class="error-message">
                        <h2>Error Loading Liked Songs</h2>
                        <p>Liked songs service is not available</p>
                    </div>
                </div>
            `;
            return;
        }

        const likedTrackIds = this.likedSongsService.getLikedTrackIds();
        const likedTracks: any[] = [];

        // Get all liked tracks from all playlists
        this.playlistService.getAllPlaylists().forEach(playlist => {
            playlist.tracks.forEach(track => {
                if (likedTrackIds.includes(track.id) && !likedTracks.find(t => t.id === track.id)) {
                    likedTracks.push(track);
                }
            });
        });

        contentView.innerHTML = `
            <div class="liked-songs-view">
                <div class="playlist-header">
                    <div class="playlist-cover liked-songs-cover">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                    </div>
                    <div class="playlist-info">
                        <h1 class="playlist-title">Liked Songs</h1>
                        <p class="playlist-description">Your favorite tracks</p>
                        <div class="playlist-stats">
                            <span>${likedTracks.length} tracks</span>
                        </div>
                    </div>
                    <div class="playlist-actions">
                        <button class="play-all-btn" ${likedTracks.length === 0 ? 'disabled' : ''}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="5,3 19,12 5,21"></polygon>
                            </svg>
                            Play All
                        </button>
                    </div>
                </div>
                <div class="track-list">
                    ${likedTracks.length > 0 ?
                likedTracks.map((track: any, index: number) => `
                        <div class="track-item" data-track-id="${track.id}">
                            <div class="track-number">${index + 1}</div>
                            <div class="track-info">
                                <div class="track-cover-container">
                                    <img src="${track.coverArt || '/assets/images/default-track.jpeg'}" 
                                         alt="${track.title}" class="track-cover"
                                         onerror="this.src='/assets/images/default-track.jpeg'">
                                </div>
                                <div class="track-details">
                                    <div class="track-title">${track.title}</div>
                                    <div class="track-artist">${track.artist}</div>
                                </div>
                            </div>
                            <div class="track-album">${track.album}</div>
                            <div class="track-duration">${this.formatDuration(track.duration)}</div>
                            <div class="track-actions">
                                <button class="like-btn liked" title="Remove from Liked Songs" data-track-id="${track.id}">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
                                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                    </svg>
                                </button>
                                <button class="play-track-btn" data-track-id="${track.id}">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polygon points="5,3 19,12 5,21"></polygon>
                                    </svg>
                                </button>
                                <button class="more-options-btn" data-track-index="${index}" data-track-id="${track.id}">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="1"></circle>
                                        <circle cx="12" cy="5" r="1"></circle>
                                        <circle cx="12" cy="19" r="1"></circle>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    `).join('')
                : '<div class="empty-playlist">No liked songs yet. Start liking some tracks!</div>'
            }
                </div>
            </div>
        `;

        this.setupLikedSongsInteractions(likedTracks);
    }

    private setupPlaylistInteractions(playlist: any): void {
        const playAllBtn = document.querySelector('.play-all-btn');
        playAllBtn?.addEventListener('click', () => {
            if (playlist.tracks.length > 0) {
                this.audioPlayer.setPlaylist(playlist.tracks, 0);
                this.audioPlayer.playTrack(playlist.tracks[0], playlist.tracks);
            }
        });


        const playButtons = document.querySelectorAll('.play-track-btn');
        playButtons.forEach((button, index) => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const track = playlist.tracks[index];
                if (track) {
                    this.audioPlayer.playTrack(track, playlist.tracks);
                }
            });
        });

        const trackItems = document.querySelectorAll('.track-item');
        trackItems.forEach((item, index) => {
            item.addEventListener('click', () => {
                const track = playlist.tracks[index];
                if (track) {
                    this.audioPlayer.playTrack(track, playlist.tracks);
                }
            });
        });

        const editCoverBtn = document.querySelector('.edit-cover-btn');
        const editTitleBtn = document.querySelector('.edit-title-btn');

        if (editCoverBtn) {
            editCoverBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('🖊️ Edit cover clicked for playlist:', playlist.name);
                this.openPlaylistEditor(playlist);
            });
        }

        if (editTitleBtn) {
            editTitleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('🖊️ Edit title clicked for playlist:', playlist.name);
                this.openPlaylistEditor(playlist);
            });
        }
        const coverContainer = document.querySelector('.playlist-cover-container');
        if (coverContainer) {
            coverContainer.addEventListener('mouseenter', () => {
                const overlay = coverContainer.querySelector('.cover-edit-overlay') as HTMLElement;
                if (overlay) overlay.style.opacity = '1';
            });

            coverContainer.addEventListener('mouseleave', () => {
                const overlay = coverContainer.querySelector('.cover-edit-overlay') as HTMLElement;
                if (overlay) overlay.style.opacity = '0';
            });
        }
        // Like button handlers
        document.querySelectorAll('.like-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const trackId = btn.getAttribute('data-track-id');
                if (trackId && this.likedSongsService) {
                    const isLiked = this.likedSongsService.toggleLike(trackId);
                    this.updateLikeButton(btn as HTMLElement, isLiked);
                }
            });
        });

        // More options button handlers
        document.querySelectorAll('.more-options-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const trackIndex = parseInt(btn.getAttribute('data-track-index') || '0');
                const track = playlist.tracks[trackIndex];
                if (track && this.trackContextMenu) {
                    const rect = btn.getBoundingClientRect();

                    // Use the existing TrackContextMenu
                    const options = {
                        track,
                        playlistContext: playlist.id,
                        onRemoveFromPlaylist: (trackId: string, playlistId: string) => {
                            this.playlistService.removeTrackFromPlaylist(playlistId, trackId);
                            this.loadViewContent(this.currentView); // Refresh current view
                        },
                        onAddToPlaylist: (track: any) => {
                            this.showAddToPlaylistModal(track);
                        },
                        onShowDetails: (track: any) => {
                            this.showTrackDetailsModal(track);
                        }
                    };

                    this.trackContextMenu.show(rect.left, rect.bottom + 5, options);
                }
            });
        });
    }

    private openPlaylistEditor(playlist: Playlist): void {
        console.log('🎯 Opening playlist editor for:', playlist.name);

        if (!this.playlistEditor) {
            console.error('❌ Playlist editor not initialized');
            return;
        }

        try {
            this.playlistEditor.show({
                playlist: playlist,
                onSave: (updatedPlaylist) => {
                    console.log('💾 Playlist saved:', updatedPlaylist.name);

                    // Update the playlist in the service
                    this.playlistService.updatePlaylist(updatedPlaylist.id, updatedPlaylist);

                    // Update sidebar if name changed
                    this.updateSidebarPlaylist(updatedPlaylist);

                    // Refresh current view
                    this.loadViewContent(this.currentView);

                    // Show success message
                    this.showToast('Playlist updated successfully!');
                },
                onCancel: () => {
                    console.log('❌ Playlist edit cancelled');
                }
            });
        } catch (error) {
            console.error('❌ Error opening playlist editor:', error);
            this.showToast('Error opening playlist editor');
        }
    }

    private setupLikedSongsInteractions(tracks: any[]): void {
        const playAllBtn = document.querySelector('.play-all-btn');
        playAllBtn?.addEventListener('click', () => {
            if (tracks.length > 0) {
                this.audioPlayer.setPlaylist(tracks, 0);
                this.audioPlayer.playTrack(tracks[0], tracks);
            }
        });

        const playButtons = document.querySelectorAll('.play-track-btn');
        playButtons.forEach((button, index) => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const track = tracks[index];
                if (track) {
                    this.audioPlayer.playTrack(track, tracks);
                }
            });
        });

        const trackItems = document.querySelectorAll('.track-item');
        trackItems.forEach((item, index) => {
            item.addEventListener('click', () => {
                const track = tracks[index];
                if (track) {
                    this.audioPlayer.playTrack(track, tracks);
                }
            });
        });

        // Like button handlers (for removing from liked songs)
        document.querySelectorAll('.like-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const trackId = btn.getAttribute('data-track-id');
                if (trackId && this.likedSongsService) {
                    this.likedSongsService.toggleLike(trackId);
                    // Refresh the liked songs view
                    this.loadViewContent('liked');
                }
            });
        });

        // More options button handlers
        document.querySelectorAll('.more-options-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const trackIndex = parseInt(btn.getAttribute('data-track-index') || '0');
                const track = tracks[trackIndex];
                if (track && this.trackContextMenu) {
                    const rect = btn.getBoundingClientRect();

                    // Use the existing TrackContextMenu for liked songs (no playlist context)
                    const options = {
                        track,
                        // No playlistContext for liked songs
                        onAddToPlaylist: (track: any) => {
                            this.showAddToPlaylistModal(track);
                        },
                        onShowDetails: (track: any) => {
                            this.showTrackDetailsModal(track);
                        }
                    };

                    this.trackContextMenu.show(rect.left, rect.bottom + 5, options);
                }
            });
        });
    }


    private showTrackDetailsModal(track: any): void {
        const modal = document.createElement('div');
        modal.className = 'track-details-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        modal.innerHTML = `
            <div class="modal-content" style="background: var(--bg-elevated); border-radius: 12px; padding: 24px; max-width: 400px; width: 90%;">
                <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0;">Track Details</h3>
                    <button class="close-modal-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-primary);">×</button>
                </div>
                <div class="track-details-content">
                    <div style="display: flex; gap: 16px; margin-bottom: 20px;">
                        <img src="${track.coverArt || '/assets/images/default-track.jpeg'}" 
                             alt="${track.title}" 
                             style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover;"
                             onerror="this.src='/assets/images/default-track.jpeg'">
                        <div>
                            <h4 style="margin: 0 0 8px 0;">${track.title}</h4>
                            <p style="margin: 0 0 4px 0; color: var(--text-secondary);">by ${track.artist}</p>
                            <p style="margin: 0; color: var(--text-muted); font-size: 14px;">${track.album}</p>
                        </div>
                    </div>
                    <div class="track-metadata" style="display: grid; gap: 8px;">
                        <div><strong>Duration:</strong> ${this.formatDuration(track.duration)}</div>
                        ${track.genre ? `<div><strong>Genre:</strong> ${track.genre}</div>` : ''}
                        ${track.year ? `<div><strong>Year:</strong> ${track.year}</div>` : ''}
                        <div><strong>Liked:</strong> ${this.likedSongsService ? (this.likedSongsService.isLiked(track.id) ? 'Yes' : 'No') : 'Unknown'}</div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('.close-modal-btn')?.addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    private updateLikeButton(button: HTMLElement, isLiked: boolean): void {
        const svg = button.querySelector('svg');
        if (svg) {
            svg.setAttribute('fill', isLiked ? 'currentColor' : 'none');
        }
        button.classList.toggle('liked', isLiked);
        button.setAttribute('title', isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs');
    }

    private updateLikedSongUI(trackId: string, isLiked: boolean): void {
        // Update all like buttons for this track
        document.querySelectorAll(`[data-track-id="${trackId}"].like-btn`).forEach(btn => {
            this.updateLikeButton(btn as HTMLElement, isLiked);
        });

        // If we're on the liked songs view, refresh it
        if (this.currentView === 'liked') {
            this.loadViewContent('liked');
        }
    }



    private async playTrack(track: any): Promise<void> {
        try {
            const currentPlaylist = this.getCurrentPlaylistTracks();
            this.audioPlayer.playTrack(track, currentPlaylist);
            console.log('Playing track:', track.title);
        } catch (error) {
            console.error('Error playing track:', error);
        }
    }

    private getCurrentPlaylistTracks(): Track[] {
        if (this.currentView.startsWith('playlist-')) {
            const playlistId = this.currentView.replace('playlist-', '');
            const playlist = this.playlistService.getPlaylist(playlistId);
            return playlist ? playlist.tracks : [];
        }
        return [];
    }

    private formatDuration(seconds: number): string {
        if (!seconds || seconds === 0 || !isFinite(seconds)) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    private setupHomeActions(): void {
        const fileInput = document.getElementById('music-upload') as HTMLInputElement;
        fileInput?.addEventListener('change', (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files) {
                this.handleFileUpload(files);
            }
        });

        const urlInput = document.getElementById('music-url-input') as HTMLInputElement;
        const addUrlBtn = document.getElementById('add-url-btn');
        addUrlBtn?.addEventListener('click', () => {
            const url = urlInput.value.trim();
            if (url) {
                this.handleUrlUpload(url);
                urlInput.value = '';
            }
        });

        const createPlaylistCard = document.querySelector('.create-playlist-card');
        createPlaylistCard?.addEventListener('click', () => {
            this.sidebar.createNewPlaylist();
        });
    }

    private handleFileUpload(files: FileList): void {
        Array.from(files).forEach(async (file, index) => {
            const url = URL.createObjectURL(file);

            // Use simple metadata extraction without external libraries
            this.extractBasicMetadata(file, url, index);
        });
    }

    private async extractBasicMetadata(file: File, url: string, index: number): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log('🔍 Attempting to extract metadata from:', file.name, 'Size:', file.size, 'Type:', file.type);

            jsmediatags.read(file, {
                onSuccess: (tag) => {
                    try {
                        const tags = tag.tags;
                        console.log('📋 Raw metadata extracted:', tags);

                        // Extract cover art if available
                        let coverArt = '/assets/images/default-track.jpeg';
                        if (tags.picture) {
                            try {
                                const { data, format } = tags.picture;
                                console.log('🎨 Found cover art:', format, 'Size:', data.length);

                                const byteArray = new Uint8Array(data);
                                const blob = new Blob([byteArray], { type: format });
                                coverArt = URL.createObjectURL(blob);

                                console.log('✅ Cover art blob created:', coverArt);
                            } catch (coverError) {
                                console.warn('❌ Failed to extract cover art:', coverError);
                            }
                        }

                        // Create track with extracted metadata
                        const track = {
                            id: `upload-${Date.now()}-${Date.now()}`, // More unique ID
                            title: tags.title || this.extractTitleFromFilename(file.name),
                            artist: tags.artist || 'Unknown Artist',
                            album: tags.album || 'Uploaded Music',
                            duration: 0, // Will be set by audio element
                            url: url,
                            coverArt: coverArt,
                            genre: tags.genre || 'Unknown',
                            year: tags.year || new Date().getFullYear()
                        };

                        // Get duration from audio element
                        this.getDurationAndAddTrack(track, url);

                        console.log('✅ Successfully extracted metadata for:', track.title, {
                            artist: track.artist,
                            album: track.album,
                            hasCoverArt: coverArt !== '/assets/images/default-track.jpeg',
                            genre: track.genre,
                            year: track.year
                        });

                        resolve();

                    } catch (processingError) {
                        console.error('❌ Error processing metadata:', processingError);
                        this.extractFallbackMetadata(file, url, Date.now()).then(resolve).catch(reject);
                    }
                },
                onError: (error) => {
                    console.warn('⚠️ jsmediatags extraction failed for:', file.name);
                    console.error('Error details:', error);

                    // Fallback to basic extraction
                    this.extractFallbackMetadata(file, url, Date.now()).then(resolve).catch(reject);
                }
            });
        });
    }
    private getDurationAndAddTrack(track: any, url: string): void {
        const audio = new Audio();
        audio.crossOrigin = 'anonymous';

        let resolved = false;

        const onLoadedMetadata = () => {
            if (resolved) return;
            resolved = true;

            track.duration = audio.duration || 0;
            console.log('📊 Duration extracted:', track.duration);

            this.addToUploadedPlaylist(track);
            this.cleanupBlobUrls(track);
            cleanup();
        };

        const onError = (error: any) => {
            if (resolved) return;
            resolved = true;

            console.warn('❌ Could not load audio metadata for:', track.title, error);
            // Set a default duration or leave as 0 and let the player determine it
            track.duration = 0;
            this.addToUploadedPlaylist(track);
            this.cleanupBlobUrls(track);
            cleanup();
        };

        const onTimeout = () => {
            if (resolved) return;
            resolved = true;

            console.warn('⏰ Timeout loading audio metadata for:', track.title, 'Adding track without duration');
            track.duration = 0;
            this.addToUploadedPlaylist(track);
            this.cleanupBlobUrls(track);
            cleanup();
        };

        const cleanup = () => {
            audio.removeEventListener('loadedmetadata', onLoadedMetadata);
            audio.removeEventListener('error', onError);
            audio.removeEventListener('canplaythrough', onLoadedMetadata);
            audio.src = '';
        };

        // Add multiple event listeners for better compatibility
        audio.addEventListener('loadedmetadata', onLoadedMetadata);
        audio.addEventListener('canplaythrough', onLoadedMetadata);
        audio.addEventListener('error', onError);

        // Set source - use the blob URL as it contains the actual audio data
        audio.src = url;
        audio.load();

        // Increased timeout to 5 seconds for better reliability
        setTimeout(onTimeout, 5000);
    }

    private async extractFallbackMetadata(file: File, url: string, index: number): Promise<void> {
        try {
            const audio = new Audio();
            audio.crossOrigin = 'anonymous';

            // Get duration from audio element
            const duration = await new Promise<number>((resolve) => {
                const onLoadedMetadata = () => {
                    cleanup();
                    resolve(audio.duration || 0);
                };

                const onError = () => {
                    cleanup();
                    resolve(0);
                };

                const cleanup = () => {
                    audio.removeEventListener('loadedmetadata', onLoadedMetadata);
                    audio.removeEventListener('error', onError);
                };

                audio.addEventListener('loadedmetadata', onLoadedMetadata);
                audio.addEventListener('error', onError);

                audio.src = url;
                audio.load();

                // Timeout after 5 seconds
                setTimeout(() => {
                    cleanup();
                    resolve(0);
                }, 5000);
            });

            // Parse filename for title and artist
            const filenameInfo = this.parseFilename(file.name);

            const track = {
                id: `upload-${Date.now()}-${index}`,
                title: filenameInfo.title || file.name.replace(/\.[^/.]+$/, ""),
                artist: filenameInfo.artist || 'Unknown Artist',
                album: 'Uploaded Music',
                duration: duration,
                url: url,
                coverArt: '/assets/images/default-track.jpeg',
                genre: 'Unknown',
                year: new Date().getFullYear()
            };

            this.addToUploadedPlaylist(track);
            this.cleanupBlobUrls(track);

        } catch (error) {
            console.error('❌ Fallback metadata extraction failed:', error);

            // Last resort: create basic track
            const track = {
                id: `upload-${Date.now()}-${index}`,
                title: file.name.replace(/\.[^/.]+$/, ""),
                artist: 'Unknown Artist',
                album: 'Uploaded Music',
                duration: 0,
                url: url,
                coverArt: '/assets/images/default-track.jpeg',
                genre: 'Unknown',
                year: new Date().getFullYear()
            };

            this.addToUploadedPlaylist(track);
        }
    }

    private extractTitleFromFilename(filename: string): string {
        // Remove file extension
        const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");

        // Clean up common patterns
        return nameWithoutExt
            .replace(/_/g, ' ')
            .replace(/-/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    private parseFilename(filename: string): { title?: string, artist?: string } {
        const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");

        // Try to parse patterns like "Artist - Title"
        if (nameWithoutExt.includes(' - ')) {
            const parts = nameWithoutExt.split(' - ');
            if (parts.length >= 2) {
                return {
                    artist: parts[0].trim(),
                    title: parts.slice(1).join(' - ').trim()
                };
            }
        }

        // Try to parse patterns like "Artist_Title" or "Artist-Title"
        if (nameWithoutExt.includes('_') || nameWithoutExt.includes('-')) {
            const separator = nameWithoutExt.includes('_') ? '_' : '-';
            const parts = nameWithoutExt.split(separator);
            if (parts.length >= 2) {
                return {
                    artist: parts[0].trim().replace(/_/g, ' '),
                    title: parts.slice(1).join(' ').trim().replace(/_/g, ' ')
                };
            }
        }

        return {
            title: nameWithoutExt.replace(/_/g, ' ').replace(/-/g, ' ').trim()
        };
    }

    private handleUrlUpload(url: string): void {
        // Validate URL format first
        if (!this.isValidAudioUrl(url)) {
            this.showErrorNotification('Please enter a valid audio URL ending with .mp3, .wav, .ogg, etc.');
            return;
        }

        // Check if it's a local URL (these usually work)
        const isLocalUrl = url.includes('localhost') || url.includes('127.0.0.1') || url.startsWith('/');

        if (!isLocalUrl) {
            // Warn user about external URLs
            this.showWarningNotification('External URLs may not work due to CORS restrictions. Consider uploading the file directly instead.');
        }

        // Create track without proxy first (let user try direct URL)
        const track = {
            id: `url-${Date.now()}`,
            title: this.extractTitleFromUrl(url),
            artist: 'Unknown Artist',
            album: 'URL Music',
            duration: 0,
            url: url, // Use original URL first
            coverArt: '/assets/images/default-track.jpeg',
            genre: 'Unknown',
            year: new Date().getFullYear()
        };

        this.addToUploadedPlaylist(track);
    }
    private isValidAudioUrl(url: string): boolean {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname.toLowerCase();
            const validExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
            return validExtensions.some(ext => pathname.endsWith(ext));
        } catch {
            return false;
        }
    }
    private showErrorNotification(message: string): void {
        this.createNotification(message, 'error');
    }

    private showWarningNotification(message: string): void {
        this.createNotification(message, 'warning');
    }
    private createNotification(message: string, type: 'error' | 'warning' | 'success'): void {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        const colors = {
            error: '#ff4444',
            warning: '#ff9500',
            success: '#1db954'
        };

        notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        z-index: 10000;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-size: 14px;
        line-height: 1.4;
        animation: slideIn 0.3s ease;
    `;

        // Add slide-in animation
        const style = document.createElement('style');
        style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        // Remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideIn 0.3s ease reverse';
                setTimeout(() => {
                    notification.parentNode?.removeChild(notification);
                }, 300);
            }
        }, 5000);
    }

    private extractTitleFromUrl(url: string): string {
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const filename = pathname.split('/').pop() || 'URL Track';
            return filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        } catch {
            return 'URL Track';
        }
    }

    private addToUploadedPlaylist(track: any): void {
        const UPLOADED_PLAYLIST_ID = 'uploaded-music';
        let uploadPlaylist = this.playlistService.getPlaylist(UPLOADED_PLAYLIST_ID);

        if (!uploadPlaylist) {
            uploadPlaylist = this.playlistService.createPlaylist({
                id: UPLOADED_PLAYLIST_ID,
                name: 'Uploaded Music',
                description: 'Your uploaded tracks'
            });

            this.sidebar.addPlaylist('Uploaded Music', uploadPlaylist.id);
            this.setupPlaylistNavigation(uploadPlaylist.id);
        }

        this.playlistService.addTrackToPlaylist(uploadPlaylist.id, track);

        if (this.currentView === `playlist-${uploadPlaylist.id}`) {
            this.loadViewContent(`playlist-${uploadPlaylist.id}`);
        }
    }

    private setupPlaylistNavigation(playlistId: string): void {
        const playlistItem = document.querySelector(`[data-section="playlist-${playlistId}"]`);
        if (playlistItem) {
            const link = playlistItem.querySelector('.nav-link');
            if (link) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.sidebar.setActiveSection(`playlist-${playlistId}`);
                    this.loadViewContent(`playlist-${playlistId}`);
                });
            }
        }
    }

    private loadInitialContent(): void {
        this.loadViewContent('home');

        const savedVolume = localStorage.getItem('sonix-volume');
        if (savedVolume) {
            this.audioService.setVolume(parseFloat(savedVolume));
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SonixApp();
});

export { SonixApp };