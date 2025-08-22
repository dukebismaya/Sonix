export interface Track {
    id: string;
    title: string;
    artist: string;
    album: string;
    duration: number;
    url: string;
    coverArt?: string;
    genre?: string;
    year?: number;
    isLiked?: boolean;
}

export interface Playlist {
    id: string;
    name: string;
    description?: string;
    tracks: Track[];
    createdAt: Date;
    updatedAt: Date;
    coverArt?: string;
}

export interface AudioState {
    currentTrack: Track | null;
    isPlaying: boolean;
    volume: number;
    currentTime: number;
    duration: number;
    playbackRate: number;
    isLoading: boolean;
}

export interface Theme {
    name: string;
    colors: {
        primary: string;
        secondary: string;
        background: string;
        surface: string;
        text: string;
        accent: string;
    };
}

export interface VisualizerData {
    frequencyData: Uint8Array;
    timeData: Uint8Array;
    sampleRate: number;
}

export interface LikedSongsState {
    likedTrackIds: string[];
    lastUpdated: Date;
}