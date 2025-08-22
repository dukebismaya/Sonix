export class LikedSongsService {
    private likedTrackIds: Set<string> = new Set();
    private listeners: Map<string, Function[]> = new Map();

    constructor() {
        this.loadLikedSongs();
    }

    private loadLikedSongs(): void {
        try {
            const saved = localStorage.getItem('sonix-liked-songs');
            if (saved) {
                const likedIds = JSON.parse(saved);
                this.likedTrackIds = new Set(likedIds);
            }
        } catch (error) {
            console.error('Failed to load liked songs:', error);
        }
    }

    private saveLikedSongs(): void {
        try {
            const likedIds = Array.from(this.likedTrackIds);
            localStorage.setItem('sonix-liked-songs', JSON.stringify(likedIds));
        } catch (error) {
            console.error('Failed to save liked songs:', error);
        }
    }

    public isLiked(trackId: string): boolean {
        return this.likedTrackIds.has(trackId);
    }

    public toggleLike(trackId: string): boolean {
        const wasLiked = this.likedTrackIds.has(trackId);
        
        if (wasLiked) {
            this.likedTrackIds.delete(trackId);
        } else {
            this.likedTrackIds.add(trackId);
        }
        
        this.saveLikedSongs();
        this.emit(wasLiked ? 'unliked' : 'liked', trackId);
        this.emit('changed', { trackId, isLiked: !wasLiked });
        
        return !wasLiked;
    }

    public getLikedTrackIds(): string[] {
        return Array.from(this.likedTrackIds);
    }

    public on(event: string, callback: Function): void {
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