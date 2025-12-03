import { Playlist, Track } from '../../types';
import { PlaylistService } from '../../services/PlaylistService';
import { LikedSongsService } from '../../services/LikedSongsService';
import { TrackContextMenu, TrackContextMenuOptions } from '../UI/TrackContextMenu';
import { PlaylistEditor } from '../UI/PlaylistEditor';

export class PlaylistView {
    private container: HTMLElement;
    private playlistService: PlaylistService;
    private likedSongsService: LikedSongsService;
    private contextMenu: TrackContextMenu;
    private playlistEditor: PlaylistEditor;
    private currentPlaylist: Playlist | null = null;
    private onTrackSelect?: (track: Track) => void;
    private onAddToPlaylist?: (track: Track) => void;
    private onShowTrackDetails?: (track: Track) => void;
    private onPlaylistUpdated?: (playlist: Playlist) => void;

    constructor(container: HTMLElement, playlistService: PlaylistService, likedSongsService: LikedSongsService) {
        this.container = container;
        this.playlistService = playlistService;
        this.likedSongsService = likedSongsService;
        this.contextMenu = new TrackContextMenu(likedSongsService, playlistService);
        this.playlistEditor = new PlaylistEditor(playlistService);
    }

    setOnTrackSelect(callback: (track: Track) => void): void {
        this.onTrackSelect = callback;
    }

    setOnAddToPlaylist(callback: (track: Track) => void): void {
        this.onAddToPlaylist = callback;
    }

    setOnShowTrackDetails(callback: (track: Track) => void): void {
        this.onShowTrackDetails = callback;
    }

    setOnPlaylistUpdated(callback: (playlist: Playlist) => void): void {
        this.onPlaylistUpdated = callback;
    }

    setCurrentPlaylist(playlist: Playlist | null): void {
        this.currentPlaylist = playlist;
        this.render();
    }

    private render(): void {
        if (!this.currentPlaylist) {
            this.container.innerHTML = `
            <div class="playlist-view">
                <div class="playlist-header">
                    <h2>Select a Playlist</h2>
                    <p>Choose a playlist from the sidebar to view tracks</p>
                </div>
            </div>
        `;
            return;
        }

        this.container.innerHTML = `
        <div class="playlist-view">
            <div class="playlist-header">
                <div class="playlist-cover-container editable-cover">
                    <img src="${this.currentPlaylist.coverArt || '/assets/images/default-playlist.jpg'}" 
                         alt="${this.currentPlaylist.name}" class="playlist-cover-image"
                         onerror="this.src='/assets/images/default-playlist.jpg'"
                         style="width: 200px; height: 200px; object-fit: cover;">
                    <div class="cover-edit-overlay">
                        <button class="edit-cover-btn" title="Edit cover art">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="playlist-info">
                    <div class="playlist-title-container">
                        <h1 class="playlist-title editable-title" title="Click to edit">${this.currentPlaylist.name}</h1>
                        <button class="edit-title-btn" title="Edit playlist name">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                            </svg>
                        </button>
                    </div>
                    <p class="playlist-description">${this.currentPlaylist.description || 'Your uploaded tracks'}</p>
                    <div class="playlist-stats">
                        <span>${this.currentPlaylist.tracks.length} tracks</span>
                        <span>•</span>
                        <span>${this.getTotalDuration()}</span>
                    </div>
                </div>
                <div class="playlist-actions">
                    <button class="play-all-btn" ${this.currentPlaylist.tracks.length === 0 ? 'disabled' : ''}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
                        Play All
                    </button>
                    <button class="shuffle-btn">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
                        </svg>
                        Shuffle
                    </button>
                    <button class="edit-playlist-btn" title="Edit playlist">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                        Edit
                    </button>
                </div>
            </div>
            
            <div class="tracks-list">
                <div class="tracks-header">
                    <div class="track-number">#</div>
                    <div class="track-title">Title</div>
                    <div class="track-album">Album</div>
                    <div class="track-duration">Duration</div>
                    <div class="track-actions">Actions</div>
                </div>
                
                <div class="tracks-body">
                    ${this.currentPlaylist.tracks.map((track, index) => {
            const isLiked = this.likedSongsService.isLiked(track.id);
            return `
                            <div class="track-row" data-track-id="${track.id}">
                                <div class="track-number">
                                    <span class="number">${index + 1}</span>
                                    <button class="play-track-btn">
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M8 5v14l11-7z"/>
                                        </svg>
                                    </button>
                                </div>
                                <div class="track-info">
                                    <div class="track-main-info">
                                        <div class="track-cover-container">
                                            <img src="${track.coverArt || '/assets/images/default-track.jpeg'}" 
                                                 alt="${track.title}" class="track-cover"
                                                 onerror="this.src='/assets/images/default-track.jpeg'; this.classList.add('fallback-cover');"
                                                 onload="this.classList.remove('loading-cover'); this.style.opacity='1';"
                                                 style="opacity:0.5;" class="loading-cover">
                                            <div class="cover-loading-indicator">♪</div>
                                        </div>
                                        <div class="track-text-info">
                                            <div class="track-title">${track.title}</div>
                                            <div class="track-artist">${track.artist}</div>
                                        </div>
                                    </div>
                                </div>
                                <div class="track-album">${track.album}</div>
                                <div class="track-duration">${this.formatDuration(track.duration)}</div>
                                <div class="track-actions">
                                    <button class="action-btn like-btn ${isLiked ? 'liked' : ''}" title="${isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}" data-track-id="${track.id}">
                                        <svg viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor">
                                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                        </svg>
                                    </button>
                                    <button class="action-btn more-btn" title="More options" data-track-index="${index}">
                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                            <circle cx="12" cy="12" r="1"/>
                                            <circle cx="12" cy="5" r="1"/>
                                            <circle cx="12" cy="19" r="1"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
            
            ${this.currentPlaylist.tracks.length === 0 ? `
                <div class="empty-playlist">
                    <div class="empty-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                        </svg>
                    </div>
                    <h3>This playlist is empty</h3>
                    <p>Add some tracks to get started</p>
                </div>
            ` : ''}
        </div>
    `;

        this.attachEventHandlers();
    }

    private attachEventHandlers(): void {
        // Edit cover button
        const editCoverBtn = this.container.querySelector('.edit-cover-btn');
        editCoverBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openPlaylistEditor();
        });

        // Edit title button
        const editTitleBtn = this.container.querySelector('.edit-title-btn');
        editTitleBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openPlaylistEditor();
        });

        // Edit playlist button
        const editPlaylistBtn = this.container.querySelector('.edit-playlist-btn');
        editPlaylistBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openPlaylistEditor();
        });

        // Editable title click
        const playlistTitle = this.container.querySelector('.playlist-title');
        playlistTitle?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openPlaylistEditor();
        });

        // Play individual tracks
        this.container.querySelectorAll('.play-track-btn').forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.currentPlaylist && this.onTrackSelect) {
                    this.onTrackSelect(this.currentPlaylist.tracks[index]);
                }
            });
        });

        // Track row click
        this.container.querySelectorAll('.track-row').forEach((row, index) => {
            row.addEventListener('click', () => {
                if (this.currentPlaylist && this.onTrackSelect) {
                    this.onTrackSelect(this.currentPlaylist.tracks[index]);
                }
            });
        });

        // Like button handlers
        this.container.querySelectorAll('.like-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const trackId = btn.getAttribute('data-track-id');
                if (trackId) {
                    this.likedSongsService.toggleLike(trackId);
                    this.render(); // Re-render to update like state
                }
            });
        });

        // More options button handlers
        this.container.querySelectorAll('.more-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const trackIndex = parseInt(btn.getAttribute('data-track-index') || '0');
                if (this.currentPlaylist && this.currentPlaylist.tracks[trackIndex]) {
                    const rect = btn.getBoundingClientRect();
                    const track = this.currentPlaylist.tracks[trackIndex];

                    const options: TrackContextMenuOptions = {
                        track,
                        playlistContext: this.currentPlaylist.id,
                        onRemoveFromPlaylist: (trackId, playlistId) => {
                            this.playlistService.removeTrackFromPlaylist(playlistId, trackId);
                            this.render(); // Re-render after removal
                        },
                        onAddToPlaylist: this.onAddToPlaylist,
                        onShowDetails: this.onShowTrackDetails
                    };

                    this.contextMenu.show(rect.left, rect.bottom + 5, options);
                }
            });
        });

        // Play all button
        const playAllBtn = this.container.querySelector('.play-all-btn');
        playAllBtn?.addEventListener('click', () => {
            if (this.currentPlaylist && this.currentPlaylist.tracks.length > 0 && this.onTrackSelect) {
                this.onTrackSelect(this.currentPlaylist.tracks[0]);
            }
        });

        // Shuffle button
        const shuffleBtn = this.container.querySelector('.shuffle-btn');
        shuffleBtn?.addEventListener('click', () => {
            if (this.currentPlaylist && this.currentPlaylist.tracks.length > 0 && this.onTrackSelect) {
                const randomIndex = Math.floor(Math.random() * this.currentPlaylist.tracks.length);
                this.onTrackSelect(this.currentPlaylist.tracks[randomIndex]);
            }
        });
    }

    private openPlaylistEditor(): void {
        if (!this.currentPlaylist) return;

        this.playlistEditor.show({
            playlist: this.currentPlaylist,
            onSave: (updatedPlaylist) => {
                this.currentPlaylist = updatedPlaylist;

                // Add visual feedback
                const coverImage = this.container.querySelector('.playlist-cover-image') as HTMLImageElement;
                if (coverImage) {
                    coverImage.classList.add('updated');
                    setTimeout(() => coverImage.classList.remove('updated'), 500);
                }

                this.render();
                this.onPlaylistUpdated?.(updatedPlaylist);
            },
            onCancel: () => {
                // Nothing to do on cancel
            }
        });
    }

    private getTotalDuration(): string {
        if (!this.currentPlaylist) return '0:00';

        const totalSeconds = this.currentPlaylist.tracks.reduce((sum, track) => sum + track.duration, 0);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }

    private formatDuration(seconds: number): string {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}