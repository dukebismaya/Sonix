import { AudioService } from '../../services/AudioService';
import { Track, AudioState } from '../../types';

export class AudioPlayer {
    public container: HTMLElement;
    private audio: HTMLAudioElement;
    private audioService: AudioService;
    private currentTrack: Track | null = null;
    private playlist: Track[] = [];
    private currentIndex: number = 0;
    private isShuffled: boolean = false;
    private repeatMode: 'none' | 'one' | 'all' = 'none';
    private shuffledIndices: number[] = [];
    private onTrackChange?: (track: Track) => void;
    private onTrackRemovalCallback?: (trackId: string, playlistContext: string | null) => void;


    constructor(audioService?: AudioService, container?: HTMLElement) {
        this.audioService = audioService || new AudioService();
        this.container = container || document.createElement('div');
        this.container.className = 'audio-player';

        this.audio = this.audioService.getAudioElement() || new Audio();

        this.setupAudio();
        this.render();
        this.attachEventListeners();
    }

    private setupAudio(): void {
        this.audio.addEventListener('canplay', this.handleCanPlay);
        this.audio.addEventListener('loadeddata', this.handleLoadedData);
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.handleTrackEnd());
        this.audio.addEventListener('error', (e) => this.handleError(e));

        this.audio.addEventListener('loadedmetadata', () => {
            const durationEl = this.container.querySelector('.time-duration') as HTMLElement;
            if (durationEl && this.audio.duration) {
                durationEl.textContent = this.formatTime(this.audio.duration);
            }
        });
    }

    private render(): void {
        this.container.innerHTML = `
        <div class="track-info">
            <div class="track-artwork">
                <img src="/assets/images/default-track.jpeg" alt="Track artwork" class="artwork-image">
                <div class="loading-spinner" style="display: none;">
                    <div class="spinner"></div>
                </div>
            </div>
            <div class="track-details">
                <h3>Select a track</h3>
                <p>No artist</p>
                <p>No album</p>
            </div>
        </div>
        
        <div class="player-controls">
            <div class="control-buttons">
                <button class="control-btn shuffle-btn" title="Shuffle" data-active="${this.isShuffled}">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
                    </svg>
                </button>
                
                <button class="control-btn prev-btn" title="Previous">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                    </svg>
                </button>
                
                <button class="control-btn play-pause-btn" title="Play">
                    <svg class="play-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                    <svg class="pause-icon" viewBox="0 0 24 24" fill="currentColor" style="display: none;">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                </button>
                
                <button class="control-btn next-btn" title="Next">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 18h2V6h-2v12zM6 6v12l8.5-6z"/>
                    </svg>
                </button>
                
                <button class="control-btn repeat-btn" title="Repeat" data-mode="${this.repeatMode}">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
                    </svg>
                    <span class="repeat-indicator" style="display: none;">1</span>
                </button>
            </div>
            
            <div class="progress-section">
                <span class="time-current">0:00</span>
                <div class="progress-bar-container">
                    <div class="progress-bar">
                        <div class="progress-fill">
                            <div class="progress-handle"></div>
                        </div>
                    </div>
                </div>
                <span class="time-duration">0:00</span>
            </div>
        </div>
        
        <div class="additional-controls">
            <div class="volume-section">
                <button class="control-btn volume-btn" title="Volume">
                    <svg class="volume-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                    <svg class="volume-muted-icon" viewBox="0 0 24 24" fill="currentColor" style="display: none;">
                        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.25.17-.52.32-.81.42v2.08c.58-.21 1.12-.54 1.58-.98l1.42 1.42 1.27-1.27L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                    </svg>
                </button>
                <div class="volume-slider">
                    <input type="range" min="0" max="100" value="50" class="volume-range" title="Volume">
                </div>
                <span class="volume-value">50%</span>
            </div>
            
            <!-- Add visualizer between volume and speed controls -->
            <div class="mini-visualizer-container" id="miniVisualizerContainer">
                <!-- Visualizer will be inserted here -->
            </div>
            
            <button class="control-btn speed-btn" title="Playback Speed">
                <span class="speed-text">1x</span>
            </button>
        </div>
    `;
    }

    private attachEventListeners(): void {
        // Play/Pause button
        const playPauseBtn = this.container.querySelector('.play-pause-btn') as HTMLButtonElement;
        playPauseBtn?.addEventListener('click', () => this.togglePlayPause());

        // Previous button
        const prevBtn = this.container.querySelector('.prev-btn') as HTMLButtonElement;
        prevBtn?.addEventListener('click', () => this.previousTrack());

        // Next button
        const nextBtn = this.container.querySelector('.next-btn') as HTMLButtonElement;
        nextBtn?.addEventListener('click', () => this.nextTrack());

        // Shuffle button
        const shuffleBtn = this.container.querySelector('.shuffle-btn') as HTMLButtonElement;
        shuffleBtn?.addEventListener('click', () => this.toggleShuffle());

        // Repeat button
        const repeatBtn = this.container.querySelector('.repeat-btn') as HTMLButtonElement;
        repeatBtn?.addEventListener('click', () => this.toggleRepeat());

        // Speed button
        const speedBtn = this.container.querySelector('.speed-btn') as HTMLButtonElement;
        speedBtn?.addEventListener('click', () => this.togglePlaybackSpeed());

        // Progress bar
        const progressBar = this.container.querySelector('.progress-bar') as HTMLElement;
        progressBar?.addEventListener('click', (e) => this.seekTo(e));
        // Volume controls
        const volumeBtn = this.container.querySelector('.volume-btn') as HTMLButtonElement;
        const volumeRange = this.container.querySelector('.volume-range') as HTMLInputElement;

        volumeBtn?.addEventListener('click', () => this.toggleMute());
        volumeRange?.addEventListener('input', (e) => {
            const volume = parseInt((e.target as HTMLInputElement).value);
            this.setVolume(volume);
        });
    }

    private toggleMute(): void {
        const volumeRange = this.container.querySelector('.volume-range') as HTMLInputElement;
        const currentVolume = parseInt(volumeRange.value);

        if (currentVolume > 0) {
            // Store current volume and mute
            volumeRange.setAttribute('data-previous-volume', currentVolume.toString());
            this.setVolume(0);
        } else {
            // Restore previous volume
            const previousVolume = parseInt(volumeRange.getAttribute('data-previous-volume') || '50');
            this.setVolume(previousVolume);
        }
    }

    private setVolume(volume: number): void {
        this.audio.volume = volume / 100;

        const volumeRange = this.container.querySelector('.volume-range') as HTMLInputElement;
        const volumeValue = this.container.querySelector('.volume-value') as HTMLElement;
        const volumeIcon = this.container.querySelector('.volume-icon') as HTMLElement;
        const volumeMutedIcon = this.container.querySelector('.volume-muted-icon') as HTMLElement;

        volumeRange.value = volume.toString();
        volumeValue.textContent = `${volume}%`;

        // Update volume icon
        if (volume === 0) {
            volumeIcon.style.display = 'none';
            volumeMutedIcon.style.display = 'block';
        } else {
            volumeIcon.style.display = 'block';
            volumeMutedIcon.style.display = 'none';
        }
    }

    // Public method to play a specific track
    public playTrack(track: Track, playlist: Track[] = []): void {
        this.playlist = playlist.length > 0 ? playlist : [track];
        this.currentIndex = this.playlist.findIndex(t => t.id === track.id);
        if (this.currentIndex === -1) this.currentIndex = 0;

        this.loadTrack(this.currentIndex);

        // Wait for the audio to be ready before playing
        const playWhenReady = () => {
            this.audio.removeEventListener('canplay', playWhenReady);
            this.play();
        };
        this.audio.addEventListener('canplay', playWhenReady);
    }


    // Public method to set playlist
    public setPlaylist(tracks: Track[], startIndex: number = 0): void {
        this.playlist = tracks;
        if (tracks.length > 0) {
            this.loadTrack(startIndex);
        }
    }

    private togglePlayPause(): void {
        if (!this.currentTrack) return;

        const audioState = this.audioService.getState();
        if (!audioState.isPlaying) {
            this.play();
        } else {
            this.pause();
        }
    }

    private play(): void {
        if (!this.currentTrack) return;

        this.audioService.play()
            .then(() => {
                this.updatePlayPauseButton(true);
            })
            .catch(error => {
                console.error('Error playing audio:', error);
                this.updatePlayPauseButton(false);
            });
    }

    private pause(): void {
        this.audioService.pause();
        this.updatePlayPauseButton(false);
    }

    private previousTrack(): void {
        if (this.playlist.length === 0) return;

        const wasPlaying = this.audioService.getState().isPlaying;

        if (this.isShuffled) {
            const currentShuffledIndex = this.shuffledIndices.indexOf(this.currentIndex);
            const prevShuffledIndex = currentShuffledIndex > 0 ? currentShuffledIndex - 1 : this.shuffledIndices.length - 1;
            this.loadTrack(this.shuffledIndices[prevShuffledIndex]);
        } else {
            const prevIndex = this.currentIndex > 0 ? this.currentIndex - 1 : this.playlist.length - 1;
            this.loadTrack(prevIndex);
        }

        // Only play if the previous track was playing
        if (wasPlaying) {
            const playWhenReady = () => {
                this.audio.removeEventListener('canplay', playWhenReady);
                this.audio.removeEventListener('loadeddata', playWhenReady);
                this.play();
            };
            this.audio.addEventListener('canplay', playWhenReady);
            this.audio.addEventListener('loadeddata', playWhenReady);
        }
    }

    private nextTrack(): void {
        if (this.playlist.length === 0) return;

        const wasPlaying = this.audioService.getState().isPlaying;

        if (this.isShuffled) {
            const currentShuffledIndex = this.shuffledIndices.indexOf(this.currentIndex);
            const nextShuffledIndex = currentShuffledIndex < this.shuffledIndices.length - 1 ? currentShuffledIndex + 1 : 0;
            this.loadTrack(this.shuffledIndices[nextShuffledIndex]);
        } else {
            const nextIndex = this.currentIndex < this.playlist.length - 1 ? this.currentIndex + 1 : 0;
            this.loadTrack(nextIndex);
        }

        // Only play if the previous track was playing
        if (wasPlaying) {
            const playWhenReady = () => {
                this.audio.removeEventListener('canplay', playWhenReady);
                this.audio.removeEventListener('loadeddata', playWhenReady);
                this.play();
            };
            this.audio.addEventListener('canplay', playWhenReady);
            this.audio.addEventListener('loadeddata', playWhenReady);
        }
    }

    private loadTrack(index: number): void {
        if (index < 0 || index >= this.playlist.length) return;

        this.currentIndex = index;
        this.currentTrack = this.playlist[index];

        // Reset the audio element completely
        this.audio.pause();
        this.audio.currentTime = 0;

        // Clear any existing event listeners that might interfere
        this.audio.removeEventListener('canplay', this.handleCanPlay);
        this.audio.removeEventListener('loadeddata', this.handleLoadedData);

        // Handle CORS for external URLs
        if (this.currentTrack.url.startsWith('http') && !this.currentTrack.url.includes('localhost')) {
            this.audio.crossOrigin = 'anonymous';
        } else {
            this.audio.removeAttribute('crossorigin');
        }

        // Set new source and reload
        this.audio.src = this.currentTrack.url;
        this.audio.load();

        // Update UI immediately
        this.updateTrackInfo();
        this.updateLoadingState(true);

        // Re-attach event listeners
        this.audio.addEventListener('canplay', this.handleCanPlay);
        this.audio.addEventListener('loadeddata', this.handleLoadedData);

        // Reset progress bar
        const progressFill = this.container.querySelector('.progress-fill') as HTMLElement;
        const currentTimeEl = this.container.querySelector('.time-current') as HTMLElement;
        const durationEl = this.container.querySelector('.time-duration') as HTMLElement;

        if (progressFill) progressFill.style.width = '0%';
        if (currentTimeEl) currentTimeEl.textContent = '0:00';
        if (durationEl) durationEl.textContent = '0:00';

        // Notify about track change
        if (this.onTrackChange) {
            this.onTrackChange(this.currentTrack);
        }
    }

    // Helper methods for consistent event handling
    private handleCanPlay = () => {
        console.log('🎵 Audio ready to play');
    }

    private handleLoadedData = () => {
        // Update duration display when loaded
        const durationEl = this.container.querySelector('.time-duration') as HTMLElement;
        if (durationEl && this.audio.duration && isFinite(this.audio.duration)) {
            durationEl.textContent = this.formatTime(this.audio.duration);

            // Update the track's duration if it was 0
            if (this.currentTrack && this.currentTrack.duration === 0) {
                this.currentTrack.duration = this.audio.duration;
            }
        }
    }


    private toggleShuffle(): void {
        this.isShuffled = !this.isShuffled;

        if (this.isShuffled) {
            this.createShuffledIndices();
        }

        this.updateShuffleButton();
    }

    private toggleRepeat(): void {
        switch (this.repeatMode) {
            case 'none':
                this.repeatMode = 'all';
                break;
            case 'all':
                this.repeatMode = 'one';
                break;
            case 'one':
                this.repeatMode = 'none';
                break;
        }
        this.updateRepeatButton();
    }

    private togglePlaybackSpeed(): void {
        const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
        const currentSpeed = this.audio.playbackRate;
        const currentIndex = speeds.indexOf(currentSpeed);
        const nextIndex = (currentIndex + 1) % speeds.length;

        this.audio.playbackRate = speeds[nextIndex];
        this.updateSpeedButton();
    }

    private createShuffledIndices(): void {
        this.shuffledIndices = Array.from({ length: this.playlist.length }, (_, i) => i);

        // Fisher-Yates shuffle
        for (let i = this.shuffledIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.shuffledIndices[i], this.shuffledIndices[j]] = [this.shuffledIndices[j], this.shuffledIndices[i]];
        }
    }

    private handleTrackEnd(): void {
        switch (this.repeatMode) {
            case 'one':
                this.audio.currentTime = 0;
                this.play();
                break;
            case 'all':
                this.nextTrackAndPlay();
                break;
            case 'none':
                if (this.hasNextTrack()) {
                    this.nextTrackAndPlay();
                } else {
                    this.updatePlayPauseButton(false);
                }
                break;
        }
    }

    private nextTrackAndPlay(): void {
        if (this.playlist.length === 0) return;

        let nextIndex: number;

        if (this.isShuffled) {
            const currentShuffledIndex = this.shuffledIndices.indexOf(this.currentIndex);
            const nextShuffledIndex = currentShuffledIndex < this.shuffledIndices.length - 1 ? currentShuffledIndex + 1 : 0;
            nextIndex = this.shuffledIndices[nextShuffledIndex];
        } else {
            nextIndex = this.currentIndex < this.playlist.length - 1 ? this.currentIndex + 1 : 0;
        }

        // Load the next track
        this.loadTrack(nextIndex);

        // Auto-play the next track immediately when it's ready
        const autoPlayNext = () => {
            this.audio.removeEventListener('canplay', autoPlayNext);
            this.audio.removeEventListener('loadeddata', autoPlayNext);

            // Small delay to ensure everything is ready
            setTimeout(() => {
                this.play();
            }, 100);
        };

        // Listen for when the audio is ready to play
        this.audio.addEventListener('canplay', autoPlayNext);
        this.audio.addEventListener('loadeddata', autoPlayNext);
    }


    private hasNextTrack(): boolean {
        if (this.isShuffled) {
            const currentShuffledIndex = this.shuffledIndices.indexOf(this.currentIndex);
            return currentShuffledIndex < this.shuffledIndices.length - 1;
        } else {
            return this.currentIndex < this.playlist.length - 1;
        }
    }

    private seekTo(event: MouseEvent): void {
        const progressBar = event.currentTarget as HTMLElement;
        const rect = progressBar.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const newTime = percent * this.audio.duration;

        if (isFinite(newTime)) {
            this.audio.currentTime = newTime;

            const progressFill = this.container.querySelector('.progress-fill') as HTMLElement;
            const progressHandle = this.container.querySelector('.progress-handle') as HTMLElement;

            if (progressFill) {
                progressFill.style.width = `${percent * 100}%`;
            }

            // Position handle at the clicked position
            if (progressHandle) {
                const handlePosition = percent * progressBar.offsetWidth;
                progressHandle.style.left = `${handlePosition}px`;
            }
        }
    }

    private updatePlayPauseButton(isPlaying: boolean): void {
        const playIcon = this.container.querySelector('.play-icon') as HTMLElement;
        const pauseIcon = this.container.querySelector('.pause-icon') as HTMLElement;
        const button = this.container.querySelector('.play-pause-btn') as HTMLButtonElement;

        if (isPlaying) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
            button.title = 'Pause';
        } else {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
            button.title = 'Play';
        }
    }

    private updateShuffleButton(): void {
        const shuffleBtn = this.container.querySelector('.shuffle-btn') as HTMLButtonElement;
        shuffleBtn.setAttribute('data-active', String(this.isShuffled));
        shuffleBtn.style.color = this.isShuffled ? 'var(--primary-color)' : '';
    }

    private updateRepeatButton(): void {
        const repeatBtn = this.container.querySelector('.repeat-btn') as HTMLButtonElement;
        const repeatIndicator = this.container.querySelector('.repeat-indicator') as HTMLElement;

        repeatBtn.setAttribute('data-mode', this.repeatMode);

        switch (this.repeatMode) {
            case 'none':
                repeatBtn.style.color = '';
                repeatIndicator.style.display = 'none';
                break;
            case 'all':
                repeatBtn.style.color = 'var(--primary-color)';
                repeatIndicator.style.display = 'none';
                break;
            case 'one':
                repeatBtn.style.color = 'var(--primary-color)';
                repeatIndicator.style.display = 'block';
                break;
        }
    }

    private updateSpeedButton(): void {
        const speedText = this.container.querySelector('.speed-text') as HTMLElement;
        speedText.textContent = `${this.audio.playbackRate}x`;
    }

    private updateProgress(): void {
        if (!this.audio.duration || !isFinite(this.audio.duration)) return;

        const progress = (this.audio.currentTime / this.audio.duration) * 100;
        const progressBar = this.container.querySelector('.progress-bar') as HTMLElement;
        const progressFill = this.container.querySelector('.progress-fill') as HTMLElement;
        const progressHandle = this.container.querySelector('.progress-handle') as HTMLElement;
        const currentTimeEl = this.container.querySelector('.time-current') as HTMLElement;
        const durationEl = this.container.querySelector('.time-duration') as HTMLElement;

        if (progressFill) {
            progressFill.style.width = `${Math.max(0, Math.min(100, progress))}%`;
        }

        // Calculate handle position based on progress bar width, not fill width
        if (progressHandle && progressBar) {
            const progressBarWidth = progressBar.offsetWidth;
            const handlePosition = (progress / 100) * progressBarWidth;
            progressHandle.style.left = `${handlePosition}px`;
        }

        if (currentTimeEl) {
            currentTimeEl.textContent = this.formatTime(this.audio.currentTime);
        }

        if (durationEl && this.audio.duration) {
            durationEl.textContent = this.formatTime(this.audio.duration);
        }
    }


    private updateLoadingState(isLoading: boolean): void {
        const spinner = this.container.querySelector('.loading-spinner') as HTMLElement;
        spinner.style.display = isLoading ? 'flex' : 'none';
    }

    public onTrackRemoval(callback: (trackId: string, playlistContext: string | null) => void): void {
        this.onTrackRemovalCallback = callback;
    }

    private handleError(error: Event): void {
        console.error('Audio error:', error);
        this.updateLoadingState(false);

        if (this.currentTrack?.url.startsWith('http')) {
            console.warn('CORS error detected. The audio source may not allow cross-origin requests.');

            // Create a more detailed error message with retry options
            this.showErrorMessage();
        }
    }

    private showErrorMessage(): void {
        // Remove any existing error messages
        const existingError = document.querySelector('.advanced-error-notification');
        if (existingError) {
            existingError.remove();
        }

        const errorDiv = document.createElement('div');
        errorDiv.className = 'advanced-error-notification';
        errorDiv.innerHTML = `
        <div class="error-header">
            <h4>❌ Unable to Load Audio</h4>
            <button class="close-error">×</button>
        </div>
        <div class="error-content">
            <p><strong>The external URL cannot be accessed due to CORS restrictions.</strong></p>
            <div class="error-options">
                <h5>What you can do:</h5>
                <ul>
                    <li><strong>Upload the file directly</strong> - Most reliable option</li>
                    <li><strong>Use a local server</strong> - Host files on localhost</li>
                    <li><strong>Try a different URL</strong> - Some hosts allow cross-origin access</li>
                </ul>
            </div>
            <div class="error-actions">
                <button class="btn-upload-instead">Upload File Instead</button>
                <button class="btn-remove-track">Remove This Track</button>
            </div>
        </div>
    `;

        errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #2a2a2a;
        color: white;
        padding: 0;
        border-radius: 12px;
        z-index: 10000;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        border: 1px solid rgba(255,255,255,0.1);
        overflow: hidden;
    `;

        // styles for the error dialog
        const style = document.createElement('style');
        style.textContent = `
        .error-header {
            background: #ff4444;
            padding: 16px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .error-header h4 {
            margin: 0;
            font-size: 16px;
        }
        .close-error {
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
        }
        .close-error:hover {
            background: rgba(255,255,255,0.2);
        }
        .error-content {
            padding: 20px;
        }
        .error-content p {
            margin: 0 0 16px 0;
            line-height: 1.5;
        }
        .error-options h5 {
            margin: 16px 0 8px 0;
            color: #ff9500;
        }
        .error-options ul {
            margin: 0;
            padding-left: 20px;
        }
        .error-options li {
            margin-bottom: 8px;
            line-height: 1.4;
        }
        .error-actions {
            display: flex;
            gap: 12px;
            margin-top: 20px;
        }
        .error-actions button {
            flex: 1;
            padding: 12px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s ease;
        }
        .btn-upload-instead {
            background: #1db954;
            color: white;
        }
        .btn-upload-instead:hover {
            background: #1ed760;
        }
        .btn-remove-track {
            background: #333;
            color: white;
        }
        .btn-remove-track:hover {
            background: #444;
        }
    `;
        document.head.appendChild(style);

        document.body.appendChild(errorDiv);

        // event listeners with proper functionality
        const closeBtn = errorDiv.querySelector('.close-error');
        closeBtn?.addEventListener('click', () => {
            errorDiv.remove();
        });

        const uploadBtn = errorDiv.querySelector('.btn-upload-instead');
        uploadBtn?.addEventListener('click', () => {
            errorDiv.remove();
            this.triggerFileUpload();
        });

        const removeBtn = errorDiv.querySelector('.btn-remove-track');
        removeBtn?.addEventListener('click', () => {
            errorDiv.remove();
            this.removeCurrentTrack();
        });

        // Auto-close after 15 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 15000);
    }
    private triggerFileUpload(): void {
        // First try to find existing file input
        const fileInput = document.getElementById('music-upload') as HTMLInputElement;
        if (fileInput) {
            fileInput.click();
            return;
        }

        // If no file input exists, navigate to home first
        const homeNavItem = document.querySelector('[data-section="home"]') as HTMLElement;
        if (homeNavItem) {
            homeNavItem.click();

            // Wait for home view to load, then trigger file input
            setTimeout(() => {
                const newFileInput = document.getElementById('music-upload') as HTMLInputElement;
                if (newFileInput) {
                    newFileInput.click();
                } else {
                    // Create a temporary file input as fallback
                    this.createTemporaryFileInput();
                }
            }, 100);
        } else {
            // Fallback: create temporary file input
            this.createTemporaryFileInput();
        }
    }

    private createTemporaryFileInput(): void {
        const tempInput = document.createElement('input');
        tempInput.type = 'file';
        tempInput.accept = 'audio/*';
        tempInput.multiple = true;
        tempInput.style.display = 'none';

        tempInput.addEventListener('change', (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files) {
                // Emit event for main app to handle
                window.dispatchEvent(new CustomEvent('handle-file-upload', {
                    detail: { files }
                }));
            }
            tempInput.remove();
        });

        document.body.appendChild(tempInput);
        tempInput.click();
    }

    private removeCurrentTrack(): void {
        if (!this.currentTrack) return;

        const trackId = this.currentTrack.id;
        const playlistContext = this.getPlaylistContext();

        // Call the removal callback if it exists
        if (this.onTrackRemovalCallback) {
            this.onTrackRemovalCallback(trackId, playlistContext);
        }

        // Stop current playback
        this.audio.pause();
        this.audio.currentTime = 0;

        // Move to next track if available
        if (this.playlist.length > 1) {
            // Remove current track from playlist
            this.playlist = this.playlist.filter(track => track.id !== this.currentTrack!.id);

            // Adjust current index
            if (this.currentIndex >= this.playlist.length) {
                this.currentIndex = 0;
            }

            // Load next available track
            if (this.playlist.length > 0) {
                this.loadTrack(this.currentIndex);
                this.updateTrackInfo();
            } else {
                this.currentTrack = null;
                this.updateTrackInfo();
            }
        } else {
            // No more tracks
            this.currentTrack = null;
            this.playlist = [];
            this.updateTrackInfo();
        }
    }

    private getPlaylistContext(): string | null {
        // Try to determine current playlist context
        const activeNavItem = document.querySelector('.nav-item.active');
        if (activeNavItem) {
            const section = activeNavItem.getAttribute('data-section');
            if (section && section.startsWith('playlist-')) {
                return section.replace('playlist-', '');
            }
        }
        return null;
    }
    private formatTime(seconds: number): string {
        if (!isFinite(seconds)) return '0:00';

        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    private updateTrackInfo(): void {
        if (!this.currentTrack) return;

        const artworkImg = this.container.querySelector('.artwork-image') as HTMLImageElement;
        const titleEl = this.container.querySelector('.track-details h3') as HTMLElement;
        const artistEl = this.container.querySelector('.track-details p:nth-child(2)') as HTMLElement;
        const albumEl = this.container.querySelector('.track-details p:nth-child(3)') as HTMLElement;

        if (artworkImg) {
            // Show loading spinner when starting to load image
            this.updateLoadingState(true);

            // Remove any existing error handlers
            artworkImg.onerror = null;
            artworkImg.onload = null;

            // Set up proper error handling
            artworkImg.onerror = () => {
                console.log('🖼️ Cover art failed to load, using default');
                artworkImg.src = '/assets/images/default-track.jpeg';
                // Hide loading spinner when error occurs
                this.updateLoadingState(false);
            };

            artworkImg.onload = () => {
                console.log('🖼️ Cover art loaded successfully');
                // Hide loading spinner when image loads successfully
                this.updateLoadingState(false);
            };

            // Set the source
            const coverArtUrl = this.currentTrack.coverArt || '/assets/images/default-track.jpeg';
            artworkImg.src = coverArtUrl;

            console.log('🎨 Setting cover art URL:', coverArtUrl);
        }

        if (titleEl) titleEl.textContent = this.currentTrack.title;
        if (artistEl) artistEl.textContent = this.currentTrack.artist;
        if (albumEl) albumEl.textContent = this.currentTrack.album;
    }


    // Public methods for external control
    public getCurrentTrack(): Track | null {
        return this.currentTrack;
    }

    public isPlaying(): boolean {
        return this.audioService.getState().isPlaying;
    }

    public onTrackChangeCallback(callback: (track: Track) => void): void {
        this.onTrackChange = callback;
    }

    public addVisualizer(visualizer: any): void {
        const container = this.container.querySelector('#miniVisualizerContainer');
        if (container && visualizer) {
            const canvas = visualizer.getElement();

            // Set mini mode for even more compact visualization
            visualizer.setMiniMode(true);

            // Resize canvas for mini mode
            canvas.style.width = '120px';
            canvas.style.height = '30px';
            canvas.width = 120;
            canvas.height = 30;

            container.appendChild(canvas);
            console.log('✅ Mini visualizer added to AudioPlayer');
        }
    }

}