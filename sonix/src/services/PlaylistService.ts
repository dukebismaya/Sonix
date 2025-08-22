import { Playlist, Track } from '../types';

export class PlaylistService {
    private playlists: Playlist[] = [];
    private listeners: Map<string, Function[]> = new Map();

    constructor() {
        this.loadMockPlaylists();
    }

    private loadMockPlaylists(): void {
        this.playlists = [
            {
                id: '1',
                name: 'Favorites',
                description: 'My favorite tracks',
                tracks: [
                    {
                        id: '1',
                        title: 'Digital Dreams',
                        artist: 'Cyber Sync',
                        album: 'Future Sounds',
                        duration: 240,
                        url: '/assets/audio/track1.mp3',
                        coverArt: '/assets/images/cover1.jpg',
                        genre: 'Electronic',
                        year: 2024
                    },
                    {
                        id: '2',
                        title: 'Neon Nights',
                        artist: 'Synthwave',
                        album: 'Retro Future',
                        duration: 300,
                        url: '/assets/audio/track2.mp3',
                        coverArt: '/assets/images/cover2.jpg',
                        genre: 'Synthwave',
                        year: 2024
                    }
                ],
                createdAt: new Date(),
                updatedAt: new Date(),
                coverArt: '/assets/images/playlist1.jpg'
            },
            {
                id: '2',
                name: 'Chill Vibes',
                description: 'Relaxing electronic music',
                tracks: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                coverArt: '/assets/images/playlist2.jpg'
            }
        ];
    }

    getAllPlaylists(): Playlist[] {
        return [...this.playlists];
    }

    getPlaylist(id: string): Playlist | null {
        return this.playlists.find(playlist => playlist.id === id) || null;
    }

    createPlaylist(data: { name: string; description?: string; id?: string }): Playlist {
        // If ID is provided and playlist exists, return existing
        if (data.id) {
            const existing = this.getPlaylist(data.id);
            if (existing) {
                return existing;
            }
        }

        const playlist: Playlist = {
            id: data.id || Date.now().toString(),
            name: data.name,
            description: data.description,
            tracks: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.playlists.push(playlist);
        this.emit('playlistcreated', playlist);
        return playlist;
    }

    updatePlaylist(id: string, updates: Partial<Playlist>): Playlist | null {
        const playlist = this.getPlaylist(id);
        if (!playlist) return null;

        Object.assign(playlist, updates, { updatedAt: new Date() });
        this.emit('playlistupdated', playlist);
        return playlist;
    }

    deletePlaylist(id: string): boolean {
        const index = this.playlists.findIndex(p => p.id === id);
        if (index === -1) return false;

        const playlist = this.playlists[index];
        this.playlists.splice(index, 1);
        this.emit('playlistdeleted', playlist);
        return true;
    }

    addTrackToPlaylist(playlistId: string, track: Track): boolean {
        const playlist = this.getPlaylist(playlistId);
        if (!playlist) return false;

        if (!playlist.tracks.find(t => t.id === track.id)) {
            playlist.tracks.push(track);
            playlist.updatedAt = new Date();
            this.emit('trackadded', { playlist, track });
            return true;
        }
        return false;
    }

    removeTrackFromPlaylist(playlistId: string, trackId: string): boolean {
        const playlist = this.getPlaylist(playlistId);
        if (!playlist) return false;

        const index = playlist.tracks.findIndex(t => t.id === trackId);
        if (index === -1) return false;

        const track = playlist.tracks[index];
        playlist.tracks.splice(index, 1);
        playlist.updatedAt = new Date();
        this.emit('trackremoved', { playlist, track });
        return true;
    }

    on(event: string, callback: Function): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);
    }

    private emit(event: string, data?: any): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback(data));
        }
    }
}