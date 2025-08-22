import { Track, AudioState, VisualizerData } from '../types';

// Restore point

export class AudioService {
    private audio: HTMLAudioElement;
    private audioContext: AudioContext;
    private analyser: AnalyserNode;
    private source: MediaElementAudioSourceNode | null = null;
    private state: AudioState;
    private listeners: Map<string, Function[]> = new Map();
    private currentTrack: Track | null = null;

    // Add visualizer reference
    private visualizer: any = null;

    constructor() {
        // Fix: Use new Audio() instead of new HTMLAudioElement()
        this.audio = new Audio();
        this.audio.crossOrigin = 'anonymous';

        // Initialize AudioContext and analyser
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;

        this.state = {
            currentTrack: null,
            isPlaying: false,
            currentTime: 0,
            duration: 0,
            volume: 0.5,
            playbackRate: 1,
            isLoading: false
        };

        this.setupAudioEvents();
        this.setupAudioContext();
    }

    private setupAudioContext(): void {
        try {
            // Create media source and connect to analyser only once
            if (!this.source) {
                this.source = this.audioContext.createMediaElementSource(this.audio);
                this.source.connect(this.analyser);
                this.analyser.connect(this.audioContext.destination);
                console.log('✅ AudioContext and analyser setup complete');
            }
        } catch (error) {
            console.error('❌ Failed to setup AudioContext:', error);
            // If we can't create the audio context, still allow basic playback
        }
    }

    public connectVisualizer(visualizer: any): void {
        this.visualizer = visualizer;
        if (this.visualizer) {
            // Instead of trying to create a new connection, 
            // let the visualizer use our existing analyzer
            console.log('✅ Visualizer will use AudioService analyzer directly');

            // Set up the connection after a short delay to ensure everything is ready
            setTimeout(() => {
                if ((window as any).audioVisualizerInstance) {
                    const viz = (window as any).audioVisualizerInstance;
                    viz.analyser = this.analyser;
                    viz.audioContext = this.audioContext;
                    viz.connectedAudio = this.audio;
                    viz.testModeActive = false;
                    console.log('🔗 Visualizer connected to AudioService analyzer');
                }
            }, 50);
        }
    }

    public startVisualizer(): void {
        if (this.visualizer && this.state.isPlaying) {
            this.visualizer.start();
        }
    }

    public stopVisualizer(): void {
        if (this.visualizer) {
            this.visualizer.stop();
        }
    }

    getAudioElement(): HTMLAudioElement {
        return this.audio;
    }

    private setupAudioEvents(): void {
        this.audio.addEventListener('loadstart', () => {
            console.log('🔄 Audio loading started');
            this.state.isLoading = true;
            this.emit('loadstart', this.state);
        });

        this.audio.addEventListener('canplay', () => {
            console.log('✅ Audio can play');
            this.state.isLoading = false;
            this.emit('canplay', this.state);
        });

        this.audio.addEventListener('loadeddata', () => {
            console.log('📊 Audio data loaded');
            this.state.duration = this.audio.duration || 0;
            this.state.isLoading = false;
            this.emit('loadeddata', this.state);
        });

        this.audio.addEventListener('timeupdate', () => {
            this.state.currentTime = this.audio.currentTime;
            this.emit('timeupdate', this.state);
        });

        this.audio.addEventListener('ended', () => {
            this.state.isPlaying = false;
            this.stopVisualizer();
            this.emit('ended', this.state);
        });

        this.audio.addEventListener('error', (e) => {
            console.error('❌ Audio error:', e);
            this.state.isLoading = false;
            this.stopVisualizer();
            this.emit('error', this.state);
        });

        this.audio.addEventListener('loadedmetadata', () => {
            this.state.duration = this.audio.duration || 0;
            this.emit('loadedmetadata', this.state);
        });

        this.audio.addEventListener('play', () => {
            this.state.isPlaying = true;
            this.startVisualizer();
            this.emit('play', this.state);
        });

        this.audio.addEventListener('pause', () => {
            this.state.isPlaying = false;
            this.stopVisualizer();
            this.emit('pause', this.state);
        });
    }

    async loadTrack(track: any): Promise<void> {
        try {
            // Stop visualizer when changing tracks
            this.stopVisualizer();

            this.currentTrack = track;
            this.state.currentTrack = track;
            this.state.isLoading = true;

            console.log('🎵 Loading track:', track.title);

            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            this.audio.src = track.src;
            this.audio.load();

            return new Promise((resolve, reject) => {
                const handleCanPlay = () => {
                    this.audio.removeEventListener('canplay', handleCanPlay);
                    this.audio.removeEventListener('error', handleError);
                    this.state.isLoading = false;
                    this.emit('loadeddata', this.state);
                    resolve();
                };

                const handleError = (e: any) => {
                    this.audio.removeEventListener('canplay', handleCanPlay);
                    this.audio.removeEventListener('error', handleError);
                    this.state.isLoading = false;
                    reject(e);
                };

                this.audio.addEventListener('canplay', handleCanPlay);
                this.audio.addEventListener('error', handleError);
            });
        } catch (error) {
            this.state.isLoading = false;
            console.error('❌ Failed to load track:', error);
            throw error;
        }
    }

    async play(): Promise<void> {
        try {
            console.log('🔄 AudioService.play() called');
            console.log('📊 AudioContext state:', this.audioContext.state);
            console.log('📊 Audio readyState:', this.audio.readyState);
            console.log('📊 Audio src:', this.audio.src);
            
            // Resume AudioContext if needed
            if (this.audioContext.state === 'suspended') {
                console.log('🔄 Resuming suspended AudioContext...');
                await this.audioContext.resume();
                console.log('✅ AudioContext resumed, new state:', this.audioContext.state);
            }

            console.log('▶️ Calling audio.play()...');
            await this.audio.play();
            console.log('✅ Audio.play() succeeded');
            
            this.state.isPlaying = true;
            this.startVisualizer();
            this.emit('play', this.state);
        } catch (error) {
            console.error('❌ Failed to play audio:', error);
            throw error;
        }
    }

    pause(): void {
        this.audio.pause();
        this.state.isPlaying = false;
        this.stopVisualizer();
        this.emit('pause', this.state);
    }

    stop(): void {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.state.isPlaying = false;
        this.state.currentTime = 0;
        this.state.currentTrack = null;
        this.currentTrack = null;
        this.stopVisualizer();
        this.emit('stop', this.state);
    }

    setVolume(volume: number): void {
        this.state.volume = Math.max(0, Math.min(1, volume));
        this.audio.volume = this.state.volume;
        this.emit('volumechange', this.state);
    }

    setCurrentTime(time: number): void {
        this.audio.currentTime = time;
        this.state.currentTime = time;
        this.emit('timeupdate', this.state);
    }

    setPlaybackRate(rate: number): void {
        this.state.playbackRate = rate;
        this.audio.playbackRate = rate;
        this.emit('ratechange', this.state);
    }

    public getVisualizerData(): VisualizerData {
        if (!this.analyser) {
            return {
                frequencyData: new Uint8Array(128),
                timeData: new Uint8Array(128),
                sampleRate: 44100
            };
        }

        const bufferLength = this.analyser.frequencyBinCount;
        const frequencyData = new Uint8Array(bufferLength);
        const timeData = new Uint8Array(bufferLength);

        // Get fresh data each time
        this.analyser.getByteFrequencyData(frequencyData);
        this.analyser.getByteTimeDomainData(timeData);

        return {
            frequencyData,
            timeData,
            sampleRate: this.audioContext.sampleRate
        };
    }

    private calculatePeaks(data: Uint8Array): number[] {
        const peaks = [];
        const threshold = 128;

        for (let i = 0; i < data.length; i++) {
            if (data[i] > threshold) {
                peaks.push(i);
            }
        }

        return peaks;
    }

    getTrack(id: string): Track | null {
        return this.currentTrack?.id === id ? this.currentTrack : null;
    }

    getState(): AudioState {
        // Return a complete state object
        return {
            currentTrack: this.state.currentTrack,
            isPlaying: this.state.isPlaying,
            volume: this.state.volume,
            currentTime: this.state.currentTime,
            duration: this.state.duration,
            playbackRate: this.state.playbackRate,
            isLoading: this.state.isLoading
        };
    }

    on(event: string, callback: Function): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);
    }

    off(event: string, callback: Function): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    private emit(event: string, data?: any): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback(data));
        }
    }
}