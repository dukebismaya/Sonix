import { Track } from '../../types';
import { LikedSongsService } from '../../services/LikedSongsService';
import { PlaylistService } from '../../services/PlaylistService';

export interface TrackContextMenuOptions {
    track: Track;
    playlistContext?: string;
    onRemoveFromPlaylist?: (trackId: string, playlistId: string) => void;
    onAddToPlaylist?: (track: Track) => void;
    onShowDetails?: (track: Track) => void;
}

export class TrackContextMenu {
    private element: HTMLElement;
    private likedSongsService: LikedSongsService;
    private playlistService: PlaylistService;
    private isVisible: boolean = false;

    constructor(likedSongsService: LikedSongsService, playlistService: PlaylistService) {
        this.likedSongsService = likedSongsService;
        this.playlistService = playlistService;
        this.element = this.createElement();
        document.body.appendChild(this.element);
        this.setupEventListeners();
    }

    private createElement(): HTMLElement {
        const menu = document.createElement('div');
        menu.className = 'track-context-menu';
        menu.style.display = 'none';
        return menu;
    }

    private setupEventListeners(): void {
        // Hide menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.element.contains(e.target as Node)) {
                this.hide();
            }
        });

        // Hide menu on scroll
        document.addEventListener('scroll', () => {
            this.hide();
        });
    }

    public show(x: number, y: number, options: TrackContextMenuOptions): void {
        const { track, playlistContext, onRemoveFromPlaylist, onAddToPlaylist, onShowDetails } = options;
        const isLiked = this.likedSongsService.isLiked(track.id);

        this.element.innerHTML = `
            <div class="context-menu-item like-item" data-action="toggle-like">
                <svg class="menu-icon" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
                <span>${isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}</span>
            </div>
            
            <div class="context-menu-item" data-action="add-to-playlist">
                <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M8 12h8m-4-4v8m9-4a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                </svg>
                <span>Add to Playlist</span>
            </div>
            
            ${playlistContext ? `
                <div class="context-menu-item remove-item" data-action="remove-from-playlist">
                    <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                    <span>Remove from Playlist</span>
                </div>
            ` : ''}
            
            <div class="context-menu-separator"></div>
            
            <div class="context-menu-item" data-action="show-details">
                <svg class="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
                </svg>
                <span>Song Details</span>
            </div>
        `;

        // Add event listeners to menu items
        this.element.querySelectorAll('.context-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = item.getAttribute('data-action');
                
                switch (action) {
                    case 'toggle-like':
                        this.likedSongsService.toggleLike(track.id);
                        break;
                    case 'add-to-playlist':
                        onAddToPlaylist?.(track);
                        break;
                    case 'remove-from-playlist':
                        if (playlistContext) {
                            onRemoveFromPlaylist?.(track.id, playlistContext);
                        }
                        break;
                    case 'show-details':
                        onShowDetails?.(track);
                        break;
                }
                
                this.hide();
            });
        });

        // Position and show menu
        this.element.style.left = `${x}px`;
        this.element.style.top = `${y}px`;
        this.element.style.display = 'block';
        this.isVisible = true;

        // Adjust position if menu goes off-screen
        const rect = this.element.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            this.element.style.left = `${x - rect.width}px`;
        }
        if (rect.bottom > window.innerHeight) {
            this.element.style.top = `${y - rect.height}px`;
        }
    }

    public hide(): void {
        this.element.style.display = 'none';
        this.isVisible = false;
    }

    public destroy(): void {
        this.element.remove();
    }
}