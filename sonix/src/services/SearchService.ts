import { Track, Playlist } from '../types/index';
import { PlaylistService } from './PlaylistService';

export interface SearchResult {
    tracks: Track[];
    playlists: Playlist[];
    totalResults: number;
}

export class SearchService {
    private playlistService: PlaylistService;
    private searchCache: Map<string, SearchResult> = new Map();

    constructor(playlistService: PlaylistService) {
        this.playlistService = playlistService;
    }

    // Main search function
    public async search(query: string): Promise<SearchResult> {
        if (!query.trim()) {
            return { tracks: [], playlists: [], totalResults: 0 };
        }

        const normalizedQuery = query.toLowerCase().trim();

        // Check cache first
        if (this.searchCache.has(normalizedQuery)) {
            return this.searchCache.get(normalizedQuery)!;
        }

        // Search local content
        const localResults = this.searchLocalContent(normalizedQuery);

        // Try to search external APIs if available
        const externalResults = await this.searchExternalAPIs(normalizedQuery);

        // Combine results
        const combinedResults: SearchResult = {
            tracks: [...localResults.tracks, ...externalResults.tracks],
            playlists: [...localResults.playlists, ...externalResults.playlists],
            totalResults: localResults.totalResults + externalResults.totalResults
        };

        // Cache the result
        this.searchCache.set(normalizedQuery, combinedResults);

        return combinedResults;
    }

    private searchLocalContent(query: string): SearchResult {
        // Add null check for playlistService
        if (!this.playlistService) {
            console.warn('PlaylistService not available for local search');
            return { tracks: [], playlists: [], totalResults: 0 };
        }

        const allPlaylists = this.playlistService.getAllPlaylists();
        const matchedTracks: Track[] = [];
        const matchedPlaylists: Playlist[] = [];

        // Search through all playlists and tracks
        allPlaylists.forEach(playlist => {
            // Check if playlist name matches
            if (playlist.name.toLowerCase().includes(query) ||
                playlist.description?.toLowerCase().includes(query)) {
                matchedPlaylists.push(playlist);
            }

            // Search through tracks in this playlist
            playlist.tracks.forEach(track => {
                if (this.trackMatchesQuery(track, query)) {
                    // Avoid duplicates
                    if (!matchedTracks.find(t => t.id === track.id)) {
                        matchedTracks.push(track);
                    }
                }
            });
        });

        return {
            tracks: matchedTracks,
            playlists: matchedPlaylists,
            totalResults: matchedTracks.length + matchedPlaylists.length
        };
    }

    private trackMatchesQuery(track: Track, query: string): boolean {
        const searchFields = [
            track.title,
            track.artist,
            track.album,
            track.genre
        ].map(field => field?.toLowerCase() || '');

        return searchFields.some(field => field.includes(query));
    }

    private async searchExternalAPIs(query: string): Promise<SearchResult> {
        try {
            // Try multiple music APIs
            const results = await Promise.allSettled([
                this.searchJamendoAPI(query),
                this.searchFreeMusicArchive(query),
                this.searchInternetArchive(query)
            ]);

            const tracks: Track[] = [];

            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value) {
                    tracks.push(...result.value);
                }
            });

            return {
                tracks: tracks.slice(0, 20), // Limit to 20 external results
                playlists: [],
                totalResults: tracks.length
            };
        } catch (error) {
            console.log('External API search failed:', error);
            return { tracks: [], playlists: [], totalResults: 0 };
        }
    }

    // Jamendo API (royalty-free music)
    private async searchJamendoAPI(query: string): Promise<Track[]> {
        try {
            const response = await fetch(
                `https://api.jamendo.com/v3.0/tracks/?client_id=56d30c95&format=json&limit=15&search=${encodeURIComponent(query)}&include=musicinfo`
            );

            if (!response.ok) throw new Error('Jamendo API failed');

            const data = await response.json();

            return data.results.map((item: any) => ({
                id: `jamendo-${item.id}`,
                title: item.name,
                artist: item.artist_name,
                album: item.album_name,
                duration: item.duration,
                url: item.audio,
                coverArt: item.album_image || '/assets/images/default-track.jpeg',
                genre: item.musicinfo?.tags?.genres?.[0] || 'Unknown',
                year: new Date(item.releasedate).getFullYear() || 2024
            }));
        } catch (error) {
            console.log('Jamendo search failed:', error);
            return [];
        }
    }


    // Free Music Archive
    private async searchFreeMusicArchive(query: string): Promise<Track[]> {
        try {
            // Note: This is a placeholder - FMA API might not be available
            // You can replace with other free music APIs
            return [];
        } catch (error) {
            return [];
        }
    }

    // Internet Archive search
    private async searchInternetArchive(query: string): Promise<Track[]> {
        try {
            const response = await fetch(
                `https://archive.org/advancedsearch.php?q=collection:opensource_audio+AND+title:(${encodeURIComponent(query)})&fl=identifier,title,creator,date&rows=10&output=json`,
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    }
                }
            );

            if (!response.ok) throw new Error('Internet Archive API failed');

            const data = await response.json();

            return data.response.docs.map((item: any) => ({
                id: `archive-${item.identifier}`,
                title: item.title || 'Unknown Title',
                artist: item.creator || 'Unknown Artist',
                album: 'Internet Archive',
                duration: 0,
                url: `https://archive.org/download/${item.identifier}/${item.identifier}.mp3`,
                coverArt: '/assets/images/default-track.jpeg',
                genre: 'Archive',
                year: parseInt(item.date) || 2024
            }));
        } catch (error) {
            console.log('Internet Archive search failed:', error);
            return [];
        }
    }

    public clearCache(): void {
        this.searchCache.clear();
    }

    public getRecentSearches(): string[] {
        return Array.from(this.searchCache.keys()).slice(-10);
    }
}