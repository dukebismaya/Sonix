export class AudioVisualizer {
    private static instance: AudioVisualizer | null = null;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private audioContext?: AudioContext;
    private analyser?: AnalyserNode;
    private dataArray?: Uint8Array;
    private source?: MediaElementAudioSourceNode;
    private animationId?: number;
    private isActive: boolean = false;
    private visualizerType: 'bars' | 'wave' | 'particles' | 'spectrum' | 'circular' | 'waveform' = 'bars';
    private colors = {
        primary: '#1db954',
        secondary: '#1ed760',
        accent: '#ffffff',
        background: 'transparent'
    };
    // Fix: Update particles array type to include all particle types
    private particles: (Particle | EnhancedParticle | ProfessionalParticle | DrumParticle)[] = [];
    private connectedAudio: HTMLAudioElement | null = null;
    private isCompactMode: boolean = false;
    private isMiniMode: boolean = false;

    // Professional audio analysis properties
    private audioAnalyzer: ProfessionalAudioAnalyzer;
    private beatDetector: AdvancedBeatDetector;
    private frequencyAnalyzer: AdvancedFrequencyAnalyzer;
    private visualEffects: AdvancedVisualEffects;
    private tempoTracker: TempoTracker;
    private rhythmAnalyzer: RhythmAnalyzer;

    // Real-time audio features
    private audioFeatures: AdvancedAudioFeatures = {
        energy: 0,
        bassEnergy: 0,
        midEnergy: 0,
        trebleEnergy: 0,
        subBassEnergy: 0,
        highMidEnergy: 0,
        presenceEnergy: 0,
        brillianceEnergy: 0,
        spectralCentroid: 0,
        spectralRolloff: 0,
        spectralFlux: 0,
        zeroCrossingRate: 0,
        tempo: 0,
        beat: false,
        kick: false,
        snare: false,
        hihat: false,
        onset: false,
        transient: false,
        harmonicContent: 0,
        percussiveContent: 0,
        loudness: 0,
        dynamicRange: 0,
        rhythmStrength: 0,
        beatConfidence: 0
    };

    // History buffers for advanced analysis
    private energyHistory: number[] = [];
    private spectralHistory: Float32Array[] = [];
    private beatHistory: BeatEvent[] = [];
    private onsetHistory: OnsetEvent[] = [];

    // Performance optimization
    private lastAnalysisTime: number = 0;
    private analysisInterval: number = 16.67; // ~60fps
    private adaptiveQuality: boolean = true;
    private performanceMetrics: PerformanceMetrics = {
        avgFrameTime: 0,
        droppedFrames: 0,
        cpuUsage: 0
    };

    private autoConnectToAudioService(): void {
        try {
            const app = (window as any).sonixApp;
            if (app && app.audioService && app.audioService.analyser) {
                console.log('🔌 Auto-connecting to AudioService analyzer');

                // Use the existing AudioService analyzer instead of creating our own
                this.analyser = app.audioService.analyser;
                this.audioContext = app.audioService.audioContext;
                this.connectedAudio = app.audioService.audio;

                // Turn off test mode
                this.testModeActive = false;

                console.log('✅ Auto-connected to AudioService - real audio visualization ready!');

                // Override getAudioServiceData to use the real service
                this.getAudioServiceData = () => {
                    if (app.audioService && app.audioService.getVisualizerData) {
                        return app.audioService.getVisualizerData();
                    }
                    return null;
                };

                return;
            }
        } catch (error) {
            console.log('Could not auto-connect to AudioService:', error);
        }

        // Fallback to manual connection
        this.autoConnectToAudio();
    }

    constructor() {
        this.canvas = this.createElement();
        this.ctx = this.canvas.getContext('2d')!;

        // Store references for global access
        AudioVisualizer.instance = this;
        (this.canvas as any).visualizerInstance = this;
        (window as any).audioVisualizerInstance = this;

        // Initialize professional audio analysis
        this.audioAnalyzer = new ProfessionalAudioAnalyzer();
        this.beatDetector = new AdvancedBeatDetector();
        this.frequencyAnalyzer = new AdvancedFrequencyAnalyzer();
        this.visualEffects = new AdvancedVisualEffects();
        this.tempoTracker = new TempoTracker();
        this.rhythmAnalyzer = new RhythmAnalyzer();

        // Fix missing methods
        this.fixBeatDetector();

        this.setupCanvas();
        this.setupEventListeners();
        this.initializeAudioContext();

        // Try to connect to AudioService first, then fallback to manual
        setTimeout(() => {
            this.autoConnectToAudioService();
        }, 100);

        console.log('🎨 Professional AudioVisualizer created with AudioService integration');
    }

    public checkAudioConnection(): void {
        if (this.connectedAudio) {
            console.log('🔄 Checking audio connection...');
            this.connectAudio(this.connectedAudio);
        }
    }

    public autoConnectToAudio(): void {
        console.log('🔄 Auto-connecting to audio...');

        // Try multiple ways to find audio elements
        let audioElements = document.querySelectorAll('audio');
        console.log(`🎵 Method 1 - Found ${audioElements.length} audio elements with querySelector`);

        if (audioElements.length === 0) {
            // Try finding audio in the connected audio reference
            if (this.connectedAudio) {
                console.log('🎵 Method 2 - Using existing connected audio reference');
                audioElements = [this.connectedAudio] as any;
            }
        }

        if (audioElements.length === 0) {
            // Try finding through the audio service
            const app = (window as any).sonixApp;
            if (app && app.audioService && app.audioService.audioElement) {
                console.log('🎵 Method 3 - Found audio element in audio service');
                audioElements = [app.audioService.audioElement] as any;
            }
        }

        if (audioElements.length === 0) {
            // Try finding through media elements
            const mediaElements = document.querySelectorAll('audio, video');
            console.log(`🎵 Method 4 - Found ${mediaElements.length} media elements`);
            audioElements = mediaElements as any;
        }

        if (audioElements.length > 0) {
            const audioElement = audioElements[0] as HTMLAudioElement;
            console.log('🎵 Connecting to audio element:', audioElement);
            console.log('🎵 Audio element details:', {
                src: audioElement.src || audioElement.currentSrc,
                paused: audioElement.paused,
                currentTime: audioElement.currentTime,
                duration: audioElement.duration,
                readyState: audioElement.readyState
            });

            this.connectAudio(audioElement);

            // If audio is playing, we should get data immediately
            if (!audioElement.paused) {
                console.log('🎵 Audio is playing, should see visualization');
            } else {
                console.log('🎵 Audio is paused, visualization will show when played');
            }
        } else {
            console.log('❌ No audio elements found - enabling test mode');
            this.enableTestMode();
        }
    }

    private createElement(): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        canvas.className = 'audio-visualizer';
        canvas.width = 120;
        canvas.height = 30;
        canvas.style.cursor = 'pointer';
        canvas.title = 'Click to change visualizer type';
        return canvas;
    }

    private async initializeAudioContext(): Promise<void> {
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 44100,
                latencyHint: 'interactive'
            });

            // Create high-resolution analyzer
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 4096; // Higher resolution for better accuracy
            this.analyser.smoothingTimeConstant = 0.1; // Less smoothing for more responsive visuals
            this.analyser.minDecibels = -90;
            this.analyser.maxDecibels = -10;

            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);

            console.log('🎵 High-resolution AudioContext initialized');
        } catch (error) {
            console.error('❌ Failed to initialize AudioContext:', error);
        }
    }

    public async connectAudio(audioElement: HTMLAudioElement): Promise<void> {
        try {
            console.log('🔗 Connecting audio with professional analysis...');

            if (!this.audioContext) {
                await this.initializeAudioContext();
            }

            // Ensure we have all required components
            if (!this.audioContext || !this.analyser) {
                console.error('❌ Missing required components after initialization:', {
                    audioContext: !!this.audioContext,
                    analyser: !!this.analyser
                });
                return;
            }

            if (audioElement) {
                // Resume context if suspended
                if (this.audioContext.state === 'suspended') {
                    console.log('🔊 Resuming suspended audio context...');
                    await this.audioContext.resume();
                }

                // IMPORTANT: Disconnect existing source first
                if (this.source) {
                    console.log('🔌 Disconnecting existing source');
                    try {
                        this.source.disconnect();
                    } catch (disconnectError) {
                        console.log('⚠️ Error disconnecting source:', disconnectError);
                    }
                    this.source = undefined;
                }

                try {
                    // Create new source and connect - WITH PROPER NULL CHECKS
                    console.log('🔌 Creating new media source...');
                    this.source = this.audioContext.createMediaElementSource(audioElement);

                    if (this.source && this.analyser) {
                        console.log('🔌 Connecting source to analyser...');
                        this.source.connect(this.analyser);

                        console.log('🔌 Connecting analyser to destination...');
                        if (this.audioContext.destination) {
                            this.analyser.connect(this.audioContext.destination);
                        }

                        // Store audio element reference
                        this.connectedAudio = audioElement;

                        console.log('✅ Professional audio analysis connected');
                        console.log('🎵 Audio context state:', this.audioContext.state);
                        console.log('🎵 Source node:', this.source);
                        console.log('🎵 Audio element paused:', audioElement.paused);
                        console.log('🎵 Audio current time:', audioElement.currentTime);

                        // Test immediately
                        setTimeout(() => {
                            this.testAudioData();
                        }, 100);
                    } else {
                        throw new Error('Source or analyser is null after creation');
                    }

                } catch (sourceError) {
                    console.error('❌ Error creating audio source:', sourceError);
                    console.log('💡 This might be because the audio element is already connected to another source');

                    // Try alternative approach - find if audio is already connected
                    this.findExistingAudioConnection(audioElement);
                }
            } else {
                console.error('❌ No audio element provided');
            }
        } catch (error) {
            console.error('❌ Failed to connect professional audio analysis:', error);
            // Fallback to external audio service
            this.connectedAudio = audioElement;
        }
    }

    private findExistingAudioConnection(audioElement: HTMLAudioElement): void {
        console.log('🔍 Looking for existing audio connection...');

        // Check if audio context and analyser exist before proceeding
        if (!this.audioContext || !this.analyser) {
            console.log('❌ Audio context or analyser not available');
            return;
        }

        try {
            // Store the audio element reference
            this.connectedAudio = audioElement;

            // Try to get some basic visualization data even without direct connection
            console.log('📱 Using fallback audio connection method');

            // Ensure we have a fallback visualization
            if (!this.isActive) {
                this.start();
            }

        } catch (error) {
            console.error('❌ Error in findExistingAudioConnection:', error);
        }
    }

    // Enhanced test method with null checks
    private testAudioData(): void {
        if (this.analyser && this.dataArray) {
            try {
                const testData = new Uint8Array(this.analyser.frequencyBinCount);
                this.analyser.getByteFrequencyData(testData);
                const sum = Array.from(testData).reduce((a, b) => a + b, 0);

                console.log('🧪 Audio data test:');
                console.log('   📊 Frequency Sum:', sum, 'Has data:', sum > 0);
                console.log('   📊 Data Array Length:', testData.length);
                console.log('   📊 Sample Data:', Array.from(testData.slice(0, 10)));

                if (sum === 0) {
                    console.log('⚠️ No audio data - trying test mode');
                    this.enableTestMode();
                }

            } catch (error) {
                console.error('❌ Error testing audio data:', error);
            }
        } else {
            console.log('⚠️ Cannot test audio data - analyser or dataArray missing');
            console.log('   📊 Analyser:', !!this.analyser);
            console.log('   📊 Data Array:', !!this.dataArray);
        }
    }

    // Method to force reconnection with better error handling
    public forceReconnect(): void {
        console.log('🔄 Force reconnecting audio...');

        if (this.connectedAudio) {
            // Disconnect existing connection safely
            if (this.source) {
                try {
                    this.source.disconnect();
                } catch (error) {
                    console.log('⚠️ Error disconnecting source:', error);
                }
                this.source = undefined;
            }

            // Reconnect
            this.connectAudio(this.connectedAudio);
        } else {
            // Try to find audio elements
            this.autoConnectToAudio();
        }
    }

    public checkInitialization(): void {
        console.group('🔍 Initialization Check');
        console.log('Audio Context:', !!this.audioContext, this.audioContext?.state);
        console.log('Analyser:', !!this.analyser);
        console.log('Source:', !!this.source);
        console.log('Connected Audio:', !!this.connectedAudio);
        console.log('Data Array:', !!this.dataArray);
        console.log('Canvas:', !!this.canvas);
        console.log('Context 2D:', !!this.ctx);
        console.log('Is Active:', this.isActive);
        console.log('Animation ID:', this.animationId);
        console.groupEnd();

        // Try to fix any missing components
        if (!this.audioContext || !this.analyser) {
            console.log('🔧 Reinitializing audio context...');
            this.initializeAudioContext();
        }

        if (!this.connectedAudio) {
            console.log('🔧 Auto-connecting to audio...');
            this.autoConnectToAudio();
        }
    }

    public checkAndFixConnection(): void {
        if (this.analyser && this.connectedAudio && !this.connectedAudio.paused) {
            try {
                const testData = new Uint8Array(this.analyser.frequencyBinCount);
                this.analyser.getByteFrequencyData(testData);
                const sum = Array.from(testData).reduce((a, b) => a + b, 0);

                if (sum === 0) {
                    console.log('🔧 No audio data detected - attempting to fix connection');
                    this.forceReconnect();
                } else {
                    console.log('✅ Audio connection is working - data sum:', sum);
                }
            } catch (error) {
                console.error('❌ Error checking connection:', error);
                this.forceReconnect();
            }
        } else {
            console.log('🔧 Missing components for connection check:', {
                analyser: !!this.analyser,
                connectedAudio: !!this.connectedAudio,
                audioPaused: this.connectedAudio?.paused ?? 'N/A'
            });

            if (!this.connectedAudio) {
                this.autoConnectToAudio();
            }
        }
    }


    public static getInstance(): AudioVisualizer | null {
        return AudioVisualizer.instance;
    }

    private startAnimation(): void {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        let lastFrameTime = performance.now();
        let frameCount = 0;
        let fpsStartTime = performance.now();

        const animate = (currentTime: number) => {
            if (!this.isActive) return;

            // Performance monitoring
            const deltaTime = currentTime - lastFrameTime;
            lastFrameTime = currentTime;

            // Adaptive quality based on performance
            if (this.adaptiveQuality && frameCount % 60 === 0) {
                this.adjustQualityBasedOnPerformance(deltaTime);
            }

            // Only analyze if enough time has passed (adaptive frame rate)
            if (currentTime - this.lastAnalysisTime >= this.analysisInterval) {
                this.clearCanvas();
                this.performAdvancedAudioAnalysis();
                this.draw();
                this.lastAnalysisTime = currentTime;
            }

            // Calculate FPS
            frameCount++;
            if (currentTime - fpsStartTime >= 1000) {
                const fps = frameCount / ((currentTime - fpsStartTime) / 1000);
                this.performanceMetrics.avgFrameTime = deltaTime;
                if (fps < 50) this.performanceMetrics.droppedFrames++;
                frameCount = 0;
                fpsStartTime = currentTime;
            }

            this.animationId = requestAnimationFrame(animate);
        };

        animate(performance.now());
        console.log('🎬 Professional visualizer animation started');
    }

    private adjustQualityBasedOnPerformance(deltaTime: number): void {
        if (deltaTime > 20) { // Frame time > 20ms (< 50fps)
            // Reduce quality
            this.analysisInterval = Math.min(33.33, this.analysisInterval + 2); // Max 30fps
            if (this.analyser) {
                this.analyser.fftSize = Math.max(1024, this.analyser.fftSize / 2);
            }
        } else if (deltaTime < 12) { // Frame time < 12ms (> 80fps)
            // Increase quality
            this.analysisInterval = Math.max(8.33, this.analysisInterval - 1); // Up to 120fps
            if (this.analyser) {
                this.analyser.fftSize = Math.min(8192, this.analyser.fftSize * 2);
            }
        }
    }

    private performAdvancedAudioAnalysis(): void {
        if (this.testModeActive) {
            this.generateTestAudioData();
            return;
        }

        // Try to get data from our analyser first
        if (this.analyser && this.dataArray && this.connectedAudio && !this.connectedAudio.paused) {
            // Get fresh audio data from our analyser
            const frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
            const timeData = new Uint8Array(this.analyser.frequencyBinCount);

            this.analyser.getByteFrequencyData(frequencyData);
            this.analyser.getByteTimeDomainData(timeData);

            // Check if we're getting valid data
            const hasValidData = Array.from(frequencyData).some(val => val > 0);

            if (hasValidData) {
                this.processAudioData(frequencyData, timeData);
                return;
            }
        }

        // Fallback to external audio service
        const audioService = this.getAudioServiceData();
        if (audioService && audioService.frequencyData && audioService.timeData) {
            this.processAudioData(audioService.frequencyData, audioService.timeData);
            return;
        }

        // No audio data available
        this.resetAudioFeatures();
    }

    private processAudioData(frequencyData: Uint8Array, timeData: Uint8Array): void {
        // Convert to float arrays for professional analysis
        const floatFreqData = new Float32Array(frequencyData.length);
        const floatTimeData = new Float32Array(timeData.length);

        for (let i = 0; i < frequencyData.length; i++) {
            floatFreqData[i] = frequencyData[i] / 255.0;
            floatTimeData[i] = (timeData[i] - 128) / 128.0;
        }

        // Check if we have actual audio content
        const energyLevel = floatFreqData.reduce((sum, val) => sum + val, 0) / floatFreqData.length;

        if (energyLevel < 0.001) {
            this.resetAudioFeatures();
            return;
        }

        // Professional audio analysis
        const currentTime = performance.now();
        this.audioFeatures = this.audioAnalyzer.analyze(floatFreqData, floatTimeData, currentTime);

        // Advanced beat detection
        const beatResult = this.beatDetector.process(floatFreqData, currentTime);
        this.audioFeatures.beat = beatResult.beat;
        this.audioFeatures.kick = beatResult.kick;
        this.audioFeatures.snare = beatResult.snare;
        this.audioFeatures.hihat = beatResult.hihat;
        this.audioFeatures.beatConfidence = beatResult.confidence;

        // Tempo tracking
        this.audioFeatures.tempo = this.tempoTracker.update(beatResult);

        // Rhythm analysis
        this.audioFeatures.rhythmStrength = this.rhythmAnalyzer.analyze(floatFreqData);

        // Update histories
        this.updateHistories();

        // Update visual effects
        this.visualEffects.update(this.audioFeatures);

        // Trigger advanced effects
        if (this.audioFeatures.beat) {
            this.triggerAdvancedBeatEffect();
        }
        if (this.audioFeatures.onset) {
            this.triggerOnsetEffect();
        }
        if (this.audioFeatures.transient) {
            this.triggerTransientEffect();
        }
    }

    private getAudioServiceData(): any {
        try {
            // Try multiple ways to get audio service data
            const app = (window as any).sonixApp;
            if (app && app.audioService) {
                return app.audioService.getVisualizerData();
            }

            // Try global audio service
            const globalAudioService = (window as any).audioService;
            if (globalAudioService) {
                return globalAudioService.getVisualizerData();
            }

            // Try direct access to audio elements
            const audioElements = document.querySelectorAll('audio');
            if (audioElements.length > 0) {
                const audioElement = audioElements[0] as HTMLAudioElement;
                if (!audioElement.paused && audioElement.currentTime > 0) {
                    // Create temporary analyser for this audio element
                    return this.createTemporaryAnalysis(audioElement);
                }
            }
        } catch (error) {
            console.log('Could not get audio service data:', error);
        }
        return null;
    }
    private createTemporaryAnalysis(audioElement: HTMLAudioElement): any {
        // This is a fallback method - create some basic visualization data
        // based on the audio element's properties
        const currentTime = audioElement.currentTime;
        const duration = audioElement.duration;

        if (duration > 0) {
            const progress = currentTime / duration;
            const mockFrequencyData = new Uint8Array(128);
            const mockTimeData = new Uint8Array(128);

            // Generate some mock data for testing
            for (let i = 0; i < 128; i++) {
                mockFrequencyData[i] = Math.floor(Math.random() * 100 + Math.sin(currentTime + i * 0.1) * 50);
                mockTimeData[i] = Math.floor(128 + Math.sin(currentTime * 2 + i * 0.05) * 127);
            }

            return {
                frequencyData: mockFrequencyData,
                timeData: mockTimeData
            };
        }

        return null;
    }

    private resetAudioFeatures(): void {
        this.audioFeatures = {
            energy: 0, bassEnergy: 0, midEnergy: 0, trebleEnergy: 0,
            subBassEnergy: 0, highMidEnergy: 0, presenceEnergy: 0, brillianceEnergy: 0,
            spectralCentroid: 0, spectralRolloff: 0, spectralFlux: 0, zeroCrossingRate: 0,
            tempo: 0, beat: false, kick: false, snare: false, hihat: false,
            onset: false, transient: false, harmonicContent: 0, percussiveContent: 0,
            loudness: 0, dynamicRange: 0, rhythmStrength: 0, beatConfidence: 0
        };
    }

    private updateHistories(): void {
        // Energy history
        this.energyHistory.push(this.audioFeatures.energy);
        if (this.energyHistory.length > 120) this.energyHistory.shift(); // 2 seconds at 60fps

        // Beat history
        if (this.audioFeatures.beat) {
            this.beatHistory.push({
                time: performance.now(),
                energy: this.audioFeatures.energy,
                confidence: this.audioFeatures.beatConfidence,
                type: this.audioFeatures.kick ? 'kick' : this.audioFeatures.snare ? 'snare' : 'general'
            });
            if (this.beatHistory.length > 32) this.beatHistory.shift();
        }

        // Onset history
        if (this.audioFeatures.onset) {
            this.onsetHistory.push({
                time: performance.now(),
                spectralFlux: this.audioFeatures.spectralFlux,
                frequency: this.audioFeatures.spectralCentroid
            });
            if (this.onsetHistory.length > 16) this.onsetHistory.shift();
        }
    }

    private triggerAdvancedBeatEffect(): void {
        // CSS effects
        this.canvas.classList.add('beat');
        setTimeout(() => this.canvas.classList.remove('beat'), 100);

        // Specific drum effects
        if (this.audioFeatures.kick) {
            this.canvas.classList.add('kick-hit');
            setTimeout(() => this.canvas.classList.remove('kick-hit'), 150);
        }
        if (this.audioFeatures.snare) {
            this.canvas.classList.add('snare-hit');
            setTimeout(() => this.canvas.classList.remove('snare-hit'), 120);
        }
        if (this.audioFeatures.hihat) {
            this.canvas.classList.add('hihat-hit');
            setTimeout(() => this.canvas.classList.remove('hihat-hit'), 80);
        }

        // Energy-based effects
        if (this.audioFeatures.energy > 0.8) {
            this.canvas.classList.add('high-energy');
            setTimeout(() => this.canvas.classList.remove('high-energy'), 300);
        }

        // Add reactive particles
        if (this.visualizerType === 'particles') {
            this.addBeatParticles();
        }
    }

    private triggerOnsetEffect(): void {
        this.canvas.classList.add('onset');
        setTimeout(() => this.canvas.classList.remove('onset'), 80);
    }

    private triggerTransientEffect(): void {
        this.canvas.classList.add('transient');
        setTimeout(() => this.canvas.classList.remove('transient'), 60);
    }

    private addBeatParticles(): void {
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);

        const particleCount = Math.floor(this.audioFeatures.energy * 8) + 2;

        for (let i = 0; i < particleCount; i++) {
            // Fix: Provide all 6 required arguments to ProfessionalParticle
            this.particles.push(new ProfessionalParticle(
                Math.random() * width,
                Math.random() * height,
                this.getFrequencyColor(this.audioFeatures.spectralCentroid),
                this.audioFeatures.energy,
                this.audioFeatures,
                'sparkle'
            ));
        }
    }

    private clearCanvas(): void {
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);

        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Advanced background effects based on audio
        if (this.audioFeatures.beat && this.audioFeatures.energy > 0.6) {
            const gradient = this.ctx.createRadialGradient(
                width / 2, height / 2, 0,
                width / 2, height / 2, Math.max(width, height) / 2
            );
            const intensity = this.audioFeatures.energy * this.audioFeatures.beatConfidence;
            gradient.addColorStop(0, `rgba(29, 185, 84, ${0.15 * intensity})`);
            gradient.addColorStop(0.5, `rgba(30, 215, 96, ${0.08 * intensity})`);
            gradient.addColorStop(1, this.colors.background);
            this.ctx.fillStyle = gradient;
        } else {
            this.ctx.fillStyle = this.colors.background;
        }
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.restore();
    }

    private draw(): void {
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);

        switch (this.visualizerType) {
            case 'bars':
                this.drawProfessionalBars(width, height);
                break;
            case 'wave':
                this.drawProfessionalWave(width, height);
                break;
            case 'particles':
                this.drawProfessionalParticles(width, height);
                break;
            case 'spectrum':
                this.drawProfessionalSpectrum(width, height);
                break;
            case 'circular':
                this.drawCircularVisualizer(width, height);
                break;
            case 'waveform':
                this.drawAdvancedWaveform(width, height);
                break;
        }

        // Draw professional overlays
        this.drawBeatIndicators(width, height);
        this.drawTempoIndicator(width, height);
    }

    private drawProfessionalParticles(width: number, height: number): void {
        if (!this.analyser || !this.dataArray) return;

        const frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(frequencyData);

        const maxParticles = this.isMiniMode ? 15 : (this.isCompactMode ? 30 : 60);
        const step = this.isMiniMode ? 20 : (this.isCompactMode ? 12 : 8);

        // Generate particles based on advanced audio analysis
        if (this.particles.length < maxParticles) {
            for (let i = 0; i < frequencyData.length; i += step) {
                const energy = frequencyData[i] / 255;
                const threshold = 0.3 + this.audioFeatures.energy * 0.4;

                if (energy > threshold) {
                    const particleType = this.determineParticleType(i, frequencyData.length);

                    this.particles.push(new ProfessionalParticle(
                        Math.random() * width,
                        Math.random() * height,
                        this.getAdvancedFrequencyColor(i, frequencyData.length, energy),
                        energy,
                        this.audioFeatures,
                        particleType
                    ));
                }
            }
        }

        // Add special particles for drum hits
        if (this.audioFeatures.kick && this.particles.length < maxParticles) {
            for (let i = 0; i < 3; i++) {
                this.particles.push(new DrumParticle(
                    width / 2 + (Math.random() - 0.5) * 40,
                    height / 2 + (Math.random() - 0.5) * 20,
                    '#ff4444',
                    this.audioFeatures.bassEnergy,
                    'kick'
                ));
            }
        }

        if (this.audioFeatures.snare && this.particles.length < maxParticles) {
            for (let i = 0; i < 2; i++) {
                this.particles.push(new DrumParticle(
                    width / 2 + (Math.random() - 0.5) * 60,
                    height / 3 + (Math.random() - 0.5) * 30,
                    '#44ff44',
                    this.audioFeatures.midEnergy,
                    'snare'
                ));
            }
        }

        if (this.audioFeatures.hihat && this.particles.length < maxParticles) {
            this.particles.push(new DrumParticle(
                width * 0.75 + (Math.random() - 0.5) * 20,
                height * 0.25 + (Math.random() - 0.5) * 15,
                '#4444ff',
                this.audioFeatures.trebleEnergy,
                'hihat'
            ));
        }

        // Fix: Update and draw all particles with proper type checking
        this.particles = this.particles.filter(particle => {
            // Check particle type and call appropriate update method
            if (particle instanceof ProfessionalParticle) {
                particle.update(this.audioFeatures);
            } else if (particle instanceof DrumParticle) {
                particle.update(this.audioFeatures);
            } else if (particle instanceof EnhancedParticle) {
                particle.update(this.audioFeatures);
            } else if (particle instanceof Particle) {
                particle.update();
            }

            particle.draw(this.ctx);
            return particle.life > 0;
        });
    }

    private determineParticleType(index: number, total: number): ParticleType {
        const ratio = index / total;
        if (ratio < 0.25) return 'bass';
        if (ratio < 0.5) return 'mid';
        if (ratio < 0.75) return 'treble';
        return 'sparkle';
    }

    private getAdvancedFrequencyColor(index: number, total: number, energy: number): string {
        const ratio = index / total;
        const hue = (ratio * 300 + this.visualEffects.getColorShift()) % 360;
        const saturation = 70 + energy * 30;
        const lightness = 50 + energy * 40;
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }


    private drawProfessionalSpectrum(width: number, height: number): void {
        if (!this.analyser || !this.dataArray) return;

        const frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(frequencyData);

        const barCount = this.isMiniMode ? 20 : (this.isCompactMode ? 40 : 80);
        const step = Math.floor(frequencyData.length / barCount);
        const barWidth = width / barCount;

        // Create frequency response curve
        this.ctx.beginPath();
        let x = 0;

        for (let i = 0; i < barCount; i++) {
            const dataIndex = i * step;
            const normalizedValue = frequencyData[dataIndex] / 255;
            let barHeight = normalizedValue * height * 0.85;

            // Apply psychoacoustic weighting
            const freq = (dataIndex / frequencyData.length) * 22050; // Nyquist frequency
            const weightingFactor = this.getPsychoacousticWeight(freq);
            barHeight *= weightingFactor;

            const y = height - barHeight;

            // Create smooth spectrum curve
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }

            // Fill bars with frequency-specific colors
            const hue = (i / barCount) * 280; // Red to blue spectrum
            const saturation = 60 + normalizedValue * 40;
            const lightness = 40 + normalizedValue * 50;
            const alpha = 0.7 + normalizedValue * 0.3;

            this.ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
            this.ctx.fillRect(x, y, barWidth, barHeight);

            x += barWidth;
        }

        // Draw spectrum curve
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = `rgba(255, 255, 255, 0.8)`;
        this.ctx.stroke();

        // Add peak hold indicators
        this.drawPeakHolds(width, height, frequencyData, barCount);
    }

    private getPsychoacousticWeight(frequency: number): number {
        // Simplified A-weighting for perceptual importance
        if (frequency < 100) return 0.3;
        if (frequency < 1000) return 0.6 + (frequency - 100) / 900 * 0.4;
        if (frequency < 4000) return 1.0;
        if (frequency < 10000) return 1.0 - (frequency - 4000) / 6000 * 0.3;
        return 0.7;
    }
    private drawPeakHolds(width: number, height: number, frequencyData: Uint8Array, barCount: number): void {
        // Simple peak hold visualization
        const step = Math.floor(frequencyData.length / barCount);
        const barWidth = width / barCount;

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';

        for (let i = 0; i < barCount; i++) {
            const dataIndex = i * step;
            const normalizedValue = frequencyData[dataIndex] / 255;
            const peakY = height - (normalizedValue * height * 0.85);
            const x = i * barWidth;

            this.ctx.fillRect(x, peakY - 1, barWidth, 2);
        }
    }

    private drawCircularVisualizer(width: number, height: number): void {
        if (!this.analyser || !this.dataArray) return;

        const frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(frequencyData);

        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) * 0.3;
        const barCount = this.isMiniMode ? 16 : (this.isCompactMode ? 32 : 64);
        const angleStep = (Math.PI * 2) / barCount;

        // Draw circular spectrum
        for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor((i / barCount) * frequencyData.length);
            const normalizedValue = frequencyData[dataIndex] / 255;
            const barHeight = normalizedValue * radius * 0.8;

            const angle = i * angleStep - Math.PI / 2; // Start from top
            const startX = centerX + Math.cos(angle) * radius;
            const startY = centerY + Math.sin(angle) * radius;
            const endX = centerX + Math.cos(angle) * (radius + barHeight);
            const endY = centerY + Math.sin(angle) * (radius + barHeight);

            // Color based on frequency and energy
            const hue = (i / barCount) * 360 + this.visualEffects.getColorShift();
            const saturation = 70 + normalizedValue * 30;
            const lightness = 50 + normalizedValue * 40;

            this.ctx.strokeStyle = `hsl(${hue % 360}, ${saturation}%, ${lightness}%)`;
            this.ctx.lineWidth = this.isMiniMode ? 1.5 : (this.isCompactMode ? 2.5 : 4);
            this.ctx.lineCap = 'round';

            // Apply beat effects
            if (this.audioFeatures.beat) {
                this.ctx.lineWidth *= (1 + this.audioFeatures.beatConfidence * 0.5);
            }

            this.ctx.beginPath();
            this.ctx.moveTo(startX, startY);
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();
        }

        // Draw center circle with energy visualization
        const centerRadius = radius * 0.3;
        const energyRadius = centerRadius * (0.5 + this.audioFeatures.energy * 0.5);

        const gradient = this.ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, energyRadius
        );
        gradient.addColorStop(0, `rgba(29, 185, 84, ${0.8 * this.audioFeatures.energy})`);
        gradient.addColorStop(1, 'rgba(29, 185, 84, 0)');

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, energyRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // Beat pulse ring
        if (this.audioFeatures.beat) {
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${this.audioFeatures.beatConfidence})`;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius + 5, 0, Math.PI * 2);
            this.ctx.stroke();
        }
    }

    private drawAdvancedWaveform(width: number, height: number): void {
        if (!this.analyser || !this.dataArray) return;

        const timeData = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteTimeDomainData(timeData);

        // Multi-layer waveform visualization
        this.drawWaveformLayer(timeData, width, height, 1.0, 'rgba(29, 185, 84, 0.8)', 3);
        this.drawWaveformLayer(timeData, width, height, 0.7, 'rgba(30, 215, 96, 0.5)', 2);
        this.drawWaveformLayer(timeData, width, height, 0.4, 'rgba(255, 255, 255, 0.3)', 1);

        // Draw envelope
        this.drawWaveformEnvelope(timeData, width, height);
    }
    private drawWaveformLayer(timeData: Uint8Array, width: number, height: number,
        amplitude: number, color: string, lineWidth: number): void {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.ctx.beginPath();

        const step = Math.max(1, Math.floor(timeData.length / width));

        for (let i = 0; i < width; i++) {
            const dataIndex = Math.floor(i * step);
            if (dataIndex >= timeData.length) break;

            let value = (timeData[dataIndex] - 128) / 128.0;
            value *= amplitude;

            // Apply audio-reactive modulation
            if (this.audioFeatures.beat) {
                value *= (1 + this.audioFeatures.beatConfidence * 0.3);
            }

            const y = (value * height * 0.4) + (height / 2);

            if (i === 0) {
                this.ctx.moveTo(i, y);
            } else {
                this.ctx.lineTo(i, y);
            }
        }

        this.ctx.stroke();
    }

    private drawWaveformEnvelope(timeData: Uint8Array, width: number, height: number): void {
        // Calculate envelope
        const windowSize = 64;
        const envelope: number[] = [];

        for (let i = 0; i < timeData.length - windowSize; i += windowSize / 4) {
            let max = 0;
            for (let j = 0; j < windowSize; j++) {
                const value = Math.abs(timeData[i + j] - 128) / 128.0;
                max = Math.max(max, value);
            }
            envelope.push(max);
        }

        // Draw envelope
        this.ctx.fillStyle = 'rgba(29, 185, 84, 0.2)';
        this.ctx.beginPath();

        const xStep = width / envelope.length;

        // Top envelope
        this.ctx.moveTo(0, height / 2);
        for (let i = 0; i < envelope.length; i++) {
            const x = i * xStep;
            const y = height / 2 - (envelope[i] * height * 0.4);
            this.ctx.lineTo(x, y);
        }

        // Bottom envelope
        for (let i = envelope.length - 1; i >= 0; i--) {
            const x = i * xStep;
            const y = height / 2 + (envelope[i] * height * 0.4);
            this.ctx.lineTo(x, y);
        }

        this.ctx.closePath();
        this.ctx.fill();
    }

    private drawBeatIndicators(width: number, height: number): void {
        if (this.isMiniMode) return;

        const indicatorSize = Math.min(width, height) * 0.08;
        const spacing = indicatorSize * 1.5;
        let x = width - spacing;
        const y = indicatorSize;

        // Beat indicator
        if (this.audioFeatures.beat) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${this.audioFeatures.beatConfidence})`;
            this.ctx.beginPath();
            this.ctx.arc(x, y, indicatorSize, 0, Math.PI * 2);
            this.ctx.fill();
        }
        x -= spacing;

        // Kick indicator
        if (this.audioFeatures.kick) {
            this.ctx.fillStyle = 'rgba(255, 68, 68, 0.8)';
            this.ctx.fillRect(x - indicatorSize / 2, y - indicatorSize / 2, indicatorSize, indicatorSize);
        }
        x -= spacing;

        // Snare indicator
        if (this.audioFeatures.snare) {
            this.ctx.fillStyle = 'rgba(68, 255, 68, 0.8)';
            this.ctx.beginPath();
            this.ctx.moveTo(x, y - indicatorSize);
            this.ctx.lineTo(x - indicatorSize / 2, y + indicatorSize / 2);
            this.ctx.lineTo(x + indicatorSize / 2, y + indicatorSize / 2);
            this.ctx.closePath();
            this.ctx.fill();
        }
        x -= spacing;

        // Hi-hat indicator
        if (this.audioFeatures.hihat) {
            this.ctx.strokeStyle = 'rgba(68, 68, 255, 0.8)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x - indicatorSize / 2, y - indicatorSize / 2);
            this.ctx.lineTo(x + indicatorSize / 2, y + indicatorSize / 2);
            this.ctx.moveTo(x + indicatorSize / 2, y - indicatorSize / 2);
            this.ctx.lineTo(x - indicatorSize / 2, y + indicatorSize / 2);
            this.ctx.stroke();
        }
    }

    private drawTempoIndicator(width: number, height: number): void {
        if (this.isMiniMode || this.audioFeatures.tempo === 0) return;

        const bpm = Math.round(this.audioFeatures.tempo);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.font = this.isCompactMode ? '10px Arial' : '12px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`${bpm} BPM`, width - 5, height - 5);
    }

    // Professional drawing methods
    private drawProfessionalBars(width: number, height: number): void {
        // Get frequency data
        let frequencyData: Uint8Array;

        if (this.analyser && this.connectedAudio && !this.connectedAudio.paused) {
            frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
            this.analyser.getByteFrequencyData(frequencyData);
        } else {
            const audioService = this.getAudioServiceData();
            if (audioService && audioService.frequencyData) {
                frequencyData = audioService.frequencyData;
            } else {
                // Draw placeholder
                this.drawPlaceholder();
                return;
            }
        }

        const barCount = this.isMiniMode ? 12 : (this.isCompactMode ? 24 : 48);
        const step = Math.floor(frequencyData.length / barCount);
        const barWidth = width / barCount * 0.85;
        const barSpacing = width / barCount * 0.15;

        for (let i = 0; i < barCount; i++) {
            const dataIndex = i * step;
            let barHeight = (frequencyData[dataIndex] / 255) * height * 0.9;

            // Apply frequency-specific enhancements
            const normalizedIndex = i / barCount;
            if (normalizedIndex < 0.2 && this.audioFeatures.kick) {
                barHeight *= (1 + this.visualEffects.getKickPulse() * 0.8);
            } else if (normalizedIndex >= 0.2 && normalizedIndex < 0.6 && this.audioFeatures.snare) {
                barHeight *= (1 + this.visualEffects.getSnarePulse() * 0.6);
            } else if (normalizedIndex >= 0.6 && this.audioFeatures.hihat) {
                barHeight *= (1 + this.visualEffects.getHihatPulse() * 0.4);
            }

            // Beat pulse effect
            if (this.audioFeatures.beat) {
                barHeight *= (1 + this.audioFeatures.beatConfidence * 0.4);
            }

            const x = i * (barWidth + barSpacing);
            const y = height - barHeight;

            // Advanced color calculation
            const hue = (this.visualEffects.getColorShift() + i * 5) % 360;
            const saturation = 70 + this.audioFeatures.energy * 30;
            const lightness = 45 + (barHeight / height) * 40;
            const alpha = 0.8 + this.visualEffects.getFlashIntensity() * 0.2;

            this.ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;

            // Draw bar with rounded corners
            this.drawRoundedRect(x, y, barWidth, barHeight, 2);

            // Add glow effect for high energy bars
            if (barHeight > height * 0.7) {
                this.ctx.shadowColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
                this.ctx.shadowBlur = 8 + this.audioFeatures.energy * 12;
                this.drawRoundedRect(x, y, barWidth, barHeight, 2);
                this.ctx.shadowBlur = 0;
            }
        }
    }

    public debugAudioConnection(): void {
        console.group('🔍 Professional Audio Connection Debug');
        console.log('🎵 Audio Context:', this.audioContext);
        console.log('🎵 Audio Context State:', this.audioContext?.state);
        console.log('🎵 Sample Rate:', this.audioContext?.sampleRate);
        console.log('🔌 Analyser Node:', this.analyser);
        console.log('🔌 Source Node:', this.source);
        console.log('🎧 Connected Audio Element:', this.connectedAudio);

        if (this.connectedAudio) {
            console.log('▶️ Audio Paused:', this.connectedAudio.paused);
            console.log('⏱️ Current Time:', this.connectedAudio.currentTime);
            console.log('⏱️ Duration:', this.connectedAudio.duration);
            console.log('🔊 Volume:', this.connectedAudio.volume);
            console.log('🔇 Muted:', this.connectedAudio.muted);
            console.log('📻 Ready State:', this.connectedAudio.readyState);
            console.log('🌐 Network State:', this.connectedAudio.networkState);
            console.log('📍 Source:', this.connectedAudio.src || this.connectedAudio.currentSrc);
        }

        if (this.analyser && this.dataArray) {
            const testFreqData = new Uint8Array(this.analyser.frequencyBinCount);
            const testTimeData = new Uint8Array(this.analyser.frequencyBinCount);

            this.analyser.getByteFrequencyData(testFreqData);
            this.analyser.getByteTimeDomainData(testTimeData);

            const freqSum = Array.from(testFreqData).reduce((a, b) => a + b, 0);
            const timeSum = Array.from(testTimeData).reduce((a, b) => a + b, 0);
            const hasFreqData = freqSum > 0;
            const hasTimeData = timeSum > 0;

            console.log('📊 Has Frequency Data:', hasFreqData, '(Sum:', freqSum, ')');
            console.log('📊 Has Time Data:', hasTimeData, '(Sum:', timeSum, ')');
            console.log('📊 Sample Frequency Data:', Array.from(testFreqData.slice(0, 10)));
            console.log('📊 Sample Time Data:', Array.from(testTimeData.slice(0, 10)));
        }

        console.log('⚡ Audio Features Energy:', this.audioFeatures.energy);
        console.log('🥁 Beat Detected:', this.audioFeatures.beat);
        console.log('🎯 Visualizer Active:', this.isActive);
        console.log('🎨 Visualizer Type:', this.visualizerType);
        console.log('🖼️ Animation ID:', this.animationId);

        // Check for alternative audio sources
        console.log('\n🔍 Checking All Audio Elements:');
        const audioElements = document.querySelectorAll('audio');
        console.log('🎵 Audio Elements Found:', audioElements.length);
        audioElements.forEach((audio, index) => {
            const audioEl = audio as HTMLAudioElement;
            console.log(`Audio ${index}:`, {
                src: audioEl.src || audioEl.currentSrc,
                paused: audioEl.paused,
                currentTime: audioEl.currentTime,
                duration: audioEl.duration,
                volume: audioEl.volume,
                readyState: audioEl.readyState
            });
        });

        console.groupEnd();
    }

    public forceUpdate(): void {
        if (this.isActive) {
            this.clearCanvas();
            this.performAdvancedAudioAnalysis();
            this.draw();
        }
    }

    private generateTestAudioData(): void {
        const time = performance.now() * 0.001; // Convert to seconds

        // Generate realistic test audio data
        const frequencyData = new Uint8Array(1024);
        const timeData = new Uint8Array(1024);

        for (let i = 0; i < frequencyData.length; i++) {
            // Simulate bass, mid, and treble frequencies with more variation
            const bassComponent = Math.sin(time * 2 + i * 0.01) * 100 + Math.sin(time * 0.5) * 80;
            const midComponent = Math.sin(time * 4 + i * 0.02) * 80 + Math.cos(time * 0.8) * 60;
            const trebleComponent = Math.sin(time * 8 + i * 0.04) * 60 + Math.sin(time * 1.2) * 40;

            const decay = Math.exp(-i * 0.005); // Natural frequency rolloff
            const randomVariation = (Math.random() - 0.5) * 20;

            frequencyData[i] = Math.max(0, Math.min(255,
                (bassComponent * (i < 50 ? 1 : 0.3) +
                    midComponent * (i >= 50 && i < 200 ? 1 : 0.3) +
                    trebleComponent * (i >= 200 ? 1 : 0.3)) * decay + randomVariation
            ));

            // Generate time domain data (waveform) with beats
            const beatPulse = Math.sin(time * 2) > 0.7 ? 1.5 : 1.0;
            timeData[i] = Math.floor(128 + Math.sin(time * 10 + i * 0.1) * 100 * beatPulse);
        }

        this.processAudioData(frequencyData, timeData);
    }

    public enableTestMode(): void {
        console.log('🧪 Enabling test mode with simulated audio data');

        this.testModeActive = true;
        this.isActive = true;

        // Start animation if not already running
        if (!this.animationId) {
            this.startAnimation();
        }

        console.log('✅ Test mode enabled - you should see animated visualizer');
    }

    private testModeActive: boolean = false;

    private fixBeatDetector(): void {
        // Add the missing setSensitivity method to AdvancedBeatDetector
        if (!this.beatDetector.setSensitivity) {
            (this.beatDetector as any).setSensitivity = (sensitivity: number) => {
                this.beatDetector.beatThreshold = 1.0 + (1 - sensitivity) * 0.8;
            };
        }
    }

    private drawRoundedRect(x: number, y: number, width: number, height: number, radius: number): void {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
        this.ctx.fill();
    }
    private drawProfessionalWave(width: number, height: number): void {
        if (!this.analyser || !this.dataArray) return;

        const timeData = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteTimeDomainData(timeData);

        this.ctx.lineWidth = this.isMiniMode ? 2.5 : (this.isCompactMode ? 3.5 : 5);
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        // Dynamic color based on audio features
        const hue = this.visualEffects.getColorShift() % 360;
        const alpha = 0.8 + this.audioFeatures.energy * 0.2;
        this.ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${alpha})`;

        this.ctx.beginPath();

        const step = this.isMiniMode ? 12 : (this.isCompactMode ? 6 : 3);
        const sliceWidth = width / (timeData.length / step);
        let x = 0;

        for (let i = 0; i < timeData.length; i += step) {
            let v = (timeData[i] - 128) / 128.0;

            // Enhance waveform based on audio features
            v *= (1 + this.audioFeatures.energy * 0.8);

            // Add rhythm-based modulation
            if (this.audioFeatures.beat) {
                v += Math.sin(x * 0.02) * this.audioFeatures.beatConfidence * 0.3;
            }

            let y = (v * height / 2) + (height / 2);

            // Apply drum-specific effects
            if (this.audioFeatures.kick) {
                y += Math.sin(x * 0.01) * this.visualEffects.getKickPulse() * 15;
            }

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        this.ctx.stroke();

        // Add glow effect
        if (this.audioFeatures.energy > 0.5) {
            this.ctx.shadowColor = `hsla(${hue}, 80%, 60%, 0.8)`;
            this.ctx.shadowBlur = 12 + this.audioFeatures.energy * 18;
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
        }
    }

    private drawPlaceholder(): void {
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);

        if (this.isMiniMode) {
            this.ctx.fillStyle = this.colors.accent;
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('♪', width / 2, height / 2 + 3);
        } else if (this.isCompactMode) {
            this.ctx.fillStyle = this.colors.accent;
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('🎵 Pro Audio', width / 2, height / 2 + 4);
        } else {
            // Animated placeholder
            const pulse = Math.sin(Date.now() * 0.005) * 0.5 + 0.5;
            this.ctx.fillStyle = `rgba(29, 185, 84, ${0.3 + pulse * 0.7})`;
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('🎧 Professional Visualizer Ready', width / 2, height / 2);

            // Draw animated equalizer bars as placeholder
            const barCount = 8;
            const barWidth = width / barCount * 0.6;
            const barSpacing = width / barCount * 0.4;

            for (let i = 0; i < barCount; i++) {
                const animationOffset = (Date.now() * 0.003 + i * 0.5) % (Math.PI * 2);
                const barHeight = (Math.sin(animationOffset) * 0.5 + 0.5) * height * 0.3;
                const x = i * (barWidth + barSpacing) + barSpacing / 2;
                const y = height * 0.7 - barHeight;

                this.ctx.fillStyle = `hsla(${120 + i * 30}, 70%, 60%, 0.6)`;
                this.ctx.fillRect(x, y, barWidth, barHeight);
            }
        }
    }
    // Performance monitoring
    private monitorPerformance(): void {
        const startTime = performance.now();

        // Monitor frame performance
        if (this.animationId) {
            const frameTime = performance.now() - startTime;
            this.performanceMetrics.avgFrameTime =
                (this.performanceMetrics.avgFrameTime * 0.9) + (frameTime * 0.1);

            if (frameTime > 16.67) { // > 60fps threshold
                this.performanceMetrics.droppedFrames++;
            }
        }
    }
    // Public API methods
    public getPerformanceMetrics(): PerformanceMetrics {
        return { ...this.performanceMetrics };
    }

    public getAudioFeatures(): AdvancedAudioFeatures {
        return { ...this.audioFeatures };
    }

    public setAdaptiveQuality(enabled: boolean): void {
        this.adaptiveQuality = enabled;
        console.log(`🎨 Adaptive quality ${enabled ? 'enabled' : 'disabled'}`);
    }

    public getVisualizerTypes(): string[] {
        return ['bars', 'wave', 'particles', 'spectrum', 'circular', 'waveform'];
    }

    public getCurrentType(): string {
        return this.visualizerType;
    }

    public isRunning(): boolean {
        return this.isActive;
    }

    public getTempo(): number {
        return this.audioFeatures.tempo;
    }

    public getBeatConfidence(): number {
        return this.audioFeatures.beatConfidence;
    }

    // Clean up resources
    public destroy(): void {
        console.log('🗑️ Destroying professional visualizer');

        this.stop();

        if (this.source) {
            this.source.disconnect();
            this.source = undefined;
        }

        if (this.analyser) {
            this.analyser.disconnect();
            this.analyser = undefined;
        }

        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
            this.audioContext = undefined;
        }

        // Clear all buffers
        this.particles = [];
        this.energyHistory = [];
        this.spectralHistory = [];
        this.beatHistory = [];
        this.onsetHistory = [];

        // Remove event listeners
        window.removeEventListener('resize', () => { });
        document.removeEventListener('themeChanged', () => { });

        console.log('✅ Professional visualizer destroyed');
    }

    // Getters and setters
    public setCompactMode(compact: boolean): void {
        this.isCompactMode = compact;
        if (compact) {
            this.canvas.style.height = '40px';
            this.canvas.height = 40;
        }
        this.clearCanvas();
    }

    public setMiniMode(mini: boolean): void {
        this.isMiniMode = mini;
        if (mini) {
            this.canvas.style.height = '30px';
            this.canvas.height = 30;
            this.canvas.style.width = '120px';
            this.canvas.width = 120;
        }
        this.clearCanvas();
    }

    public setVisualizerType(type: 'bars' | 'wave' | 'particles' | 'spectrum' | 'circular' | 'waveform'): void {
        this.visualizerType = type;
        this.particles = [];
        this.clearCanvas();
        this.canvas.setAttribute('data-type', type);
        console.log('🎨 Professional visualizer type changed to:', type);
    }

    private cycleVisualizerType(): void {
        const types: ('bars' | 'wave' | 'particles' | 'spectrum' | 'circular' | 'waveform')[] =
            ['bars', 'wave', 'particles', 'spectrum', 'circular', 'waveform'];
        const currentIndex = types.indexOf(this.visualizerType);
        const nextIndex = (currentIndex + 1) % types.length;
        this.setVisualizerType(types[nextIndex]);
    }

    private getFrequencyColor(spectralCentroid: number): string {
        const hue = Math.min(240, spectralCentroid * 2); // Map to hue range
        return `hsl(${hue}, 80%, 60%)`;
    }

    private setupCanvas(): void {
        const resizeCanvas = () => {
            const rect = this.canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;

            this.canvas.width = rect.width * dpr;
            this.canvas.height = rect.height * dpr;

            this.ctx.scale(dpr, dpr);
            this.canvas.style.width = rect.width + 'px';
            this.canvas.style.height = rect.height + 'px';

            this.clearCanvas();
        };

        window.addEventListener('resize', resizeCanvas);
        setTimeout(resizeCanvas, 100);
    }

    private setupEventListeners(): void {
        document.addEventListener('themeChanged', (e: any) => {
            this.updateColors(e.detail.theme);
            this.clearCanvas();
        });

        this.canvas.addEventListener('click', () => {
            this.cycleVisualizerType();
        });
    }

    private updateColors(theme: 'light' | 'dark'): void {
        if (theme === 'light') {
            this.colors = {
                primary: '#1db954',
                secondary: '#1ed760',
                accent: '#000000',
                background: 'rgba(255, 255, 255, 0.03)'
            };
        } else {
            this.colors = {
                primary: '#1db954',
                secondary: '#1ed760',
                accent: '#ffffff',
                background: 'rgba(0, 0, 0, 0.03)'
            };
        }
    }

    public start(): void {
        console.log('▶️ Starting professional visualizer');

        // Ensure we're connected to AudioService
        if (!this.analyser || !this.connectedAudio) {
            this.autoConnectToAudioService();
        }

        this.clearCanvas();
        this.isActive = true;
        this.startAnimation();
    }

    public stop(): void {
        console.log('⏹️ Stopping professional visualizer');
        this.isActive = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.particles = [];
        this.energyHistory = [];
        this.beatHistory = [];
        this.onsetHistory = [];
        this.clearCanvas();
    }

    public getElement(): HTMLCanvasElement {
        return this.canvas;
    }

    // Debug methods
    public enableDebugMode(enabled: boolean): void {
        if (enabled) {
            this.canvas.addEventListener('mousemove', (e) => {
                const rect = this.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                console.log('🎯 Mouse position:', { x, y });
                console.log('🎵 Audio features:', this.audioFeatures);
                console.log('📊 Performance:', this.performanceMetrics);
            });

            // Add visual debug overlay
            this.canvas.style.border = '2px solid rgba(29, 185, 84, 0.5)';
            console.log('🐛 Debug mode enabled');
        } else {
            this.canvas.style.border = 'none';
            console.log('🐛 Debug mode disabled');
        }
    }

    public logAudioAnalysis(): void {
        console.group('🎵 Professional Audio Analysis');
        console.log('Energy:', this.audioFeatures.energy.toFixed(3));
        console.log('Bass:', this.audioFeatures.bassEnergy.toFixed(3));
        console.log('Mid:', this.audioFeatures.midEnergy.toFixed(3));
        console.log('Treble:', this.audioFeatures.trebleEnergy.toFixed(3));
        console.log('Tempo:', this.audioFeatures.tempo.toFixed(1), 'BPM');
        console.log('Beat:', this.audioFeatures.beat,
            'Confidence:', this.audioFeatures.beatConfidence.toFixed(3));
        console.log('Drums - Kick:', this.audioFeatures.kick,
            'Snare:', this.audioFeatures.snare,
            'Hi-hat:', this.audioFeatures.hihat);
        console.log('Spectral Centroid:', this.audioFeatures.spectralCentroid.toFixed(3));
        console.log('Dynamic Range:', this.audioFeatures.dynamicRange.toFixed(3));
        console.groupEnd();
    }

    // Advanced configuration
    public configure(options: VisualizerConfig): void {
        if (options.sensitivity !== undefined) {
            // Fix: Use public method to adjust beat detection sensitivity
            this.beatDetector.setSensitivity(options.sensitivity);
        }

        if (options.colorScheme) {
            this.updateColorScheme(options.colorScheme);
        }

        if (options.particleCount !== undefined) {
            // Will be used in particle generation
        }

        if (options.smoothing !== undefined && this.analyser) {
            this.analyser.smoothingTimeConstant = options.smoothing;
        }

        console.log('⚙️ Visualizer configured:', options);
    }

    private updateColorScheme(scheme: ColorScheme): void {
        switch (scheme) {
            case 'spotify':
                this.colors = {
                    primary: '#1db954',
                    secondary: '#1ed760',
                    accent: '#ffffff',
                    background: 'transparent'
                };
                break;
            case 'neon':
                this.colors = {
                    primary: '#ff0080',
                    secondary: '#00ff80',
                    accent: '#80ff00',
                    background: 'rgba(0, 0, 0, 0.1)'
                };
                break;
            case 'ocean':
                this.colors = {
                    primary: '#0080ff',
                    secondary: '#00c0ff',
                    accent: '#ffffff',
                    background: 'rgba(0, 40, 80, 0.05)'
                };
                break;
            case 'fire':
                this.colors = {
                    primary: '#ff4000',
                    secondary: '#ff8000',
                    accent: '#ffff00',
                    background: 'rgba(40, 0, 0, 0.05)'
                };
                break;
        }
    }
}

// Professional Audio Analysis Classes
class ProfessionalAudioAnalyzer {
    private previousSpectrum: Float32Array = new Float32Array(0);
    private spectralFluxBuffer: number[] = [];
    private windowFunction: Float32Array;

    constructor() {
        // Hamming window for better frequency analysis
        this.windowFunction = this.createHammingWindow(2048);
    }

    private createHammingWindow(size: number): Float32Array {
        const window = new Float32Array(size);
        for (let i = 0; i < size; i++) {
            window[i] = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (size - 1));
        }
        return window;
    }

    public analyze(frequencyData: Float32Array, timeData: Float32Array, currentTime: number): AdvancedAudioFeatures {
        const features: AdvancedAudioFeatures = {
            energy: this.calculateEnergy(frequencyData),
            bassEnergy: this.calculateBandEnergy(frequencyData, 0, 8),
            subBassEnergy: this.calculateBandEnergy(frequencyData, 0, 4),
            midEnergy: this.calculateBandEnergy(frequencyData, 8, 32),
            highMidEnergy: this.calculateBandEnergy(frequencyData, 32, 64),
            trebleEnergy: this.calculateBandEnergy(frequencyData, 64, 128),
            presenceEnergy: this.calculateBandEnergy(frequencyData, 128, 256),
            brillianceEnergy: this.calculateBandEnergy(frequencyData, 256, 512),
            spectralCentroid: this.calculateSpectralCentroid(frequencyData),
            spectralRolloff: this.calculateSpectralRolloff(frequencyData),
            spectralFlux: this.calculateSpectralFlux(frequencyData),
            zeroCrossingRate: this.calculateZeroCrossingRate(timeData),
            harmonicContent: this.calculateHarmonicContent(frequencyData),
            percussiveContent: this.calculatePercussiveContent(timeData),
            loudness: this.calculateLoudness(frequencyData),
            dynamicRange: this.calculateDynamicRange(frequencyData),
            onset: this.detectOnset(frequencyData),
            transient: this.detectTransient(timeData),
            tempo: 0, // Will be set by TempoTracker
            beat: false, // Will be set by BeatDetector
            kick: false,
            snare: false,
            hihat: false,
            rhythmStrength: 0, // Will be set by RhythmAnalyzer
            beatConfidence: 0
        };

        return features;
    }

    private calculateEnergy(spectrum: Float32Array): number {
        let sum = 0;
        for (let i = 0; i < spectrum.length; i++) {
            sum += spectrum[i] * spectrum[i];
        }
        return Math.sqrt(sum / spectrum.length);
    }

    private calculateBandEnergy(spectrum: Float32Array, startBin: number, endBin: number): number {
        let sum = 0;
        const bins = Math.min(endBin, spectrum.length) - startBin;
        for (let i = startBin; i < Math.min(endBin, spectrum.length); i++) {
            sum += spectrum[i] * spectrum[i];
        }
        return Math.sqrt(sum / bins);
    }

    private calculateSpectralCentroid(spectrum: Float32Array): number {
        let weightedSum = 0;
        let magnitudeSum = 0;

        for (let i = 0; i < spectrum.length; i++) {
            const magnitude = spectrum[i];
            weightedSum += i * magnitude;
            magnitudeSum += magnitude;
        }

        return magnitudeSum > 0 ? weightedSum / magnitudeSum / spectrum.length : 0;
    }

    private calculateSpectralRolloff(spectrum: Float32Array, threshold: number = 0.85): number {
        const totalEnergy = spectrum.reduce((sum, val) => sum + val * val, 0);
        const rolloffThreshold = totalEnergy * threshold;

        let cumulativeEnergy = 0;
        for (let i = 0; i < spectrum.length; i++) {
            cumulativeEnergy += spectrum[i] * spectrum[i];
            if (cumulativeEnergy >= rolloffThreshold) {
                return i / spectrum.length;
            }
        }
        return 1;
    }

    private calculateSpectralFlux(spectrum: Float32Array): number {
        if (this.previousSpectrum.length !== spectrum.length) {
            this.previousSpectrum = new Float32Array(spectrum);
            return 0;
        }

        let flux = 0;
        for (let i = 0; i < spectrum.length; i++) {
            const diff = spectrum[i] - this.previousSpectrum[i];
            if (diff > 0) flux += diff;
        }

        this.previousSpectrum = new Float32Array(spectrum);

        // Add to buffer for smoothing
        this.spectralFluxBuffer.push(flux);
        if (this.spectralFluxBuffer.length > 10) {
            this.spectralFluxBuffer.shift();
        }

        return flux;
    }

    private calculateZeroCrossingRate(timeData: Float32Array): number {
        let crossings = 0;
        for (let i = 1; i < timeData.length; i++) {
            if ((timeData[i] >= 0) !== (timeData[i - 1] >= 0)) {
                crossings++;
            }
        }
        return crossings / timeData.length;
    }

    private calculateHarmonicContent(spectrum: Float32Array): number {
        // Simplified harmonic content calculation
        let harmonicEnergy = 0;
        const fundamentalBin = 4; // Approximate fundamental frequency bin

        for (let harmonic = 2; harmonic <= 8; harmonic++) {
            const bin = fundamentalBin * harmonic;
            if (bin < spectrum.length) {
                harmonicEnergy += spectrum[bin];
            }
        }

        return harmonicEnergy / this.calculateEnergy(spectrum);
    }

    private calculatePercussiveContent(timeData: Float32Array): number {
        // Calculate percussive content based on temporal sparsity
        let peaks = 0;
        const threshold = 0.1;

        for (let i = 1; i < timeData.length - 1; i++) {
            if (Math.abs(timeData[i]) > threshold &&
                Math.abs(timeData[i]) > Math.abs(timeData[i - 1]) &&
                Math.abs(timeData[i]) > Math.abs(timeData[i + 1])) {
                peaks++;
            }
        }

        return peaks / timeData.length;
    }

    private calculateLoudness(spectrum: Float32Array): number {
        // A-weighted loudness approximation
        const aWeights = this.getAWeightingCurve(spectrum.length);
        let weightedSum = 0;

        for (let i = 0; i < spectrum.length; i++) {
            weightedSum += spectrum[i] * spectrum[i] * aWeights[i];
        }

        return Math.sqrt(weightedSum / spectrum.length);
    }

    private getAWeightingCurve(length: number): Float32Array {
        // Simplified A-weighting curve
        const weights = new Float32Array(length);
        for (let i = 0; i < length; i++) {
            const freq = (i / length) * 22050; // Assuming 44.1kHz sample rate
            weights[i] = this.aWeightingResponse(freq);
        }
        return weights;
    }

    private aWeightingResponse(freq: number): number {
        // Simplified A-weighting formula
        const f2 = freq * freq;
        const f4 = f2 * f2;
        const numerator = 12194 * 12194 * f4;
        const denominator = (f2 + 20.6 * 20.6) *
            (f2 + 107.7 * 107.7) *
            (f2 + 737.9 * 737.9) *
            (f2 + 12194 * 12194);
        return numerator / denominator;
    }

    private calculateDynamicRange(spectrum: Float32Array): number {
        const sortedSpectrum = Array.from(spectrum).sort((a, b) => b - a);
        const p95 = sortedSpectrum[Math.floor(sortedSpectrum.length * 0.05)];
        const p5 = sortedSpectrum[Math.floor(sortedSpectrum.length * 0.95)];
        return p95 - p5;
    }

    private detectOnset(spectrum: Float32Array): boolean {
        const avgFlux = this.spectralFluxBuffer.reduce((a, b) => a + b, 0) /
            Math.max(this.spectralFluxBuffer.length, 1);
        const currentFlux = this.calculateSpectralFlux(spectrum);
        return currentFlux > avgFlux * 1.5 && currentFlux > 0.1;
    }

    private detectTransient(timeData: Float32Array): boolean {
        // Detect sudden amplitude changes
        let maxChange = 0;
        for (let i = 1; i < timeData.length; i++) {
            const change = Math.abs(timeData[i] - timeData[i - 1]);
            maxChange = Math.max(maxChange, change);
        }
        return maxChange > 0.3;
    }
}

// Advanced Beat Detector
class AdvancedBeatDetector {
    private energyBuffer: number[] = [];
    private bassBuffer: number[] = [];
    private kickDetector: KickDetector;
    private snareDetector: SnareDetector;
    private hihatDetector: HihatDetector;
    private lastBeatTime: number = 0;
    public beatThreshold: number = 1.3;
    private adaptiveThreshold: number = 1.3;
    private minBeatInterval: number = 250;

    constructor() {
        this.kickDetector = new KickDetector();
        this.snareDetector = new SnareDetector();
        this.hihatDetector = new HihatDetector();
    }

    public setSensitivity(sensitivity: number): void {
        this.beatThreshold = 1.0 + (1 - sensitivity) * 0.8;
    }

    public process(spectrum: Float32Array, currentTime: number): BeatResult {
        const bassEnergy = this.calculateBassEnergy(spectrum);
        const totalEnergy = this.calculateTotalEnergy(spectrum);

        // Update buffers
        this.energyBuffer.push(totalEnergy);
        this.bassBuffer.push(bassEnergy);

        if (this.energyBuffer.length > 43) this.energyBuffer.shift();
        if (this.bassBuffer.length > 43) this.bassBuffer.shift();

        // Calculate adaptive threshold
        const avgEnergy = this.energyBuffer.reduce((a, b) => a + b, 0) / this.energyBuffer.length;
        const variance = this.energyBuffer.reduce((sum, val) => sum + Math.pow(val - avgEnergy, 2), 0) / this.energyBuffer.length;
        this.adaptiveThreshold = 1.2 + Math.min(0.5, variance * 2);

        // Beat detection
        const isBeat = totalEnergy > this.adaptiveThreshold * avgEnergy &&
            (currentTime - this.lastBeatTime) > this.minBeatInterval;

        let confidence = 0;
        if (isBeat) {
            confidence = Math.min(1, (totalEnergy / (avgEnergy * this.adaptiveThreshold) - 1) * 2);
            this.lastBeatTime = currentTime;
        }

        // Drum detection
        const kick = this.kickDetector.detect(spectrum, bassEnergy);
        const snare = this.snareDetector.detect(spectrum);
        const hihat = this.hihatDetector.detect(spectrum);

        return {
            beat: isBeat,
            kick,
            snare,
            hihat,
            confidence,
            energy: totalEnergy,
            bassEnergy
        };
    }

    private calculateBassEnergy(spectrum: Float32Array): number {
        let sum = 0;
        const bassRange = Math.min(16, spectrum.length);
        for (let i = 0; i < bassRange; i++) {
            sum += spectrum[i] * spectrum[i];
        }
        return Math.sqrt(sum / bassRange);
    }

    private calculateTotalEnergy(spectrum: Float32Array): number {
        let sum = 0;
        for (let i = 0; i < spectrum.length; i++) {
            sum += spectrum[i] * spectrum[i];
        }
        return Math.sqrt(sum / spectrum.length);
    }
}
// Specialized Drum Detectors
class KickDetector {
    private kickHistory: number[] = [];
    private lastKickTime: number = 0;
    private kickThreshold: number = 0.8;

    public detect(spectrum: Float32Array, bassEnergy: number): boolean {
        // Focus on sub-bass frequencies for kick detection
        const subBassEnergy = this.calculateSubBassEnergy(spectrum);

        this.kickHistory.push(subBassEnergy);
        if (this.kickHistory.length > 10) this.kickHistory.shift();

        const avgKickEnergy = this.kickHistory.reduce((a, b) => a + b, 0) / this.kickHistory.length;
        const currentTime = performance.now();

        const isKick = subBassEnergy > avgKickEnergy * 1.4 &&
            bassEnergy > this.kickThreshold &&
            (currentTime - this.lastKickTime) > 200; // Min 200ms between kicks

        if (isKick) {
            this.lastKickTime = currentTime;
        }

        return isKick;
    }

    private calculateSubBassEnergy(spectrum: Float32Array): number {
        let sum = 0;
        const subBassRange = Math.min(8, spectrum.length); // Very low frequencies (20-80Hz)
        for (let i = 1; i < subBassRange; i++) { // Skip DC component
            sum += spectrum[i] * spectrum[i];
        }
        return Math.sqrt(sum / (subBassRange - 1));
    }
}

class SnareDetector {
    private snareHistory: number[] = [];
    private lastSnareTime: number = 0;

    public detect(spectrum: Float32Array): boolean {
        // Snare typically has energy in mid frequencies with noise components
        const midEnergy = this.calculateMidEnergy(spectrum);
        const highMidEnergy = this.calculateHighMidEnergy(spectrum);
        const noiseComponent = this.calculateNoiseComponent(spectrum);

        const snareCharacteristic = (midEnergy + highMidEnergy) * noiseComponent;

        this.snareHistory.push(snareCharacteristic);
        if (this.snareHistory.length > 8) this.snareHistory.shift();

        const avgSnareEnergy = this.snareHistory.reduce((a, b) => a + b, 0) / this.snareHistory.length;
        const currentTime = performance.now();

        const isSnare = snareCharacteristic > avgSnareEnergy * 1.6 &&
            (currentTime - this.lastSnareTime) > 180;

        if (isSnare) {
            this.lastSnareTime = currentTime;
        }

        return isSnare;
    }

    private calculateMidEnergy(spectrum: Float32Array): number {
        let sum = 0;
        const start = Math.floor(spectrum.length * 0.1); // ~200Hz
        const end = Math.floor(spectrum.length * 0.3);   // ~1kHz
        for (let i = start; i < Math.min(end, spectrum.length); i++) {
            sum += spectrum[i] * spectrum[i];
        }
        return Math.sqrt(sum / (end - start));
    }

    private calculateHighMidEnergy(spectrum: Float32Array): number {
        let sum = 0;
        const start = Math.floor(spectrum.length * 0.3); // ~1kHz
        const end = Math.floor(spectrum.length * 0.6);   // ~4kHz
        for (let i = start; i < Math.min(end, spectrum.length); i++) {
            sum += spectrum[i] * spectrum[i];
        }
        return Math.sqrt(sum / (end - start));
    }

    private calculateNoiseComponent(spectrum: Float32Array): number {
        // Calculate spectral flatness as noise indicator
        let geometricMean = 1;
        let arithmeticMean = 0;
        let count = 0;

        const start = Math.floor(spectrum.length * 0.2);
        const end = Math.floor(spectrum.length * 0.8);

        for (let i = start; i < Math.min(end, spectrum.length); i++) {
            if (spectrum[i] > 0.001) {
                geometricMean *= Math.pow(spectrum[i], 1 / (end - start));
                arithmeticMean += spectrum[i];
                count++;
            }
        }

        arithmeticMean /= count;
        return count > 0 ? geometricMean / arithmeticMean : 0;
    }
}

class HihatDetector {
    private hihatHistory: number[] = [];
    private lastHihatTime: number = 0;

    public detect(spectrum: Float32Array): boolean {
        // Hi-hats have high frequency content with short duration
        const highFreqEnergy = this.calculateHighFreqEnergy(spectrum);
        const brillianceEnergy = this.calculateBrillianceEnergy(spectrum);

        const hihatCharacteristic = highFreqEnergy + brillianceEnergy * 1.5;

        this.hihatHistory.push(hihatCharacteristic);
        if (this.hihatHistory.length > 6) this.hihatHistory.shift();

        const avgHihatEnergy = this.hihatHistory.reduce((a, b) => a + b, 0) / this.hihatHistory.length;
        const currentTime = performance.now();

        const isHihat = hihatCharacteristic > avgHihatEnergy * 1.8 &&
            (currentTime - this.lastHihatTime) > 120; // Very fast hi-hats possible

        if (isHihat) {
            this.lastHihatTime = currentTime;
        }

        return isHihat;
    }

    private calculateHighFreqEnergy(spectrum: Float32Array): number {
        let sum = 0;
        const start = Math.floor(spectrum.length * 0.6); // ~6kHz+
        for (let i = start; i < spectrum.length; i++) {
            sum += spectrum[i] * spectrum[i];
        }
        return Math.sqrt(sum / (spectrum.length - start));
    }

    private calculateBrillianceEnergy(spectrum: Float32Array): number {
        let sum = 0;
        const start = Math.floor(spectrum.length * 0.8); // ~10kHz+
        for (let i = start; i < spectrum.length; i++) {
            sum += spectrum[i] * spectrum[i];
        }
        return Math.sqrt(sum / (spectrum.length - start));
    }
}

// Tempo Tracker
class TempoTracker {
    private beatIntervals: number[] = [];
    private lastBeatTime: number = 0;
    private currentTempo: number = 0;
    private tempoBuffer: number[] = [];
    private confidence: number = 0;

    public update(beatResult: BeatResult): number {
        if (beatResult.beat) {
            const currentTime = performance.now();

            if (this.lastBeatTime > 0) {
                const interval = currentTime - this.lastBeatTime;
                const bpm = 60000 / interval;

                // Filter reasonable BPM range
                if (bpm >= 60 && bpm <= 200) {
                    this.beatIntervals.push(interval);
                    if (this.beatIntervals.length > 16) {
                        this.beatIntervals.shift();
                    }

                    this.currentTempo = this.calculateTempo();
                    this.confidence = this.calculateTempoConfidence();
                }
            }

            this.lastBeatTime = currentTime;
        }

        return this.currentTempo;
    }

    private calculateTempo(): number {
        if (this.beatIntervals.length < 4) return 0;

        // Use median for stability
        const sortedIntervals = [...this.beatIntervals].sort((a, b) => a - b);
        const medianInterval = sortedIntervals[Math.floor(sortedIntervals.length / 2)];
        const tempo = 60000 / medianInterval;

        // Smooth tempo changes
        this.tempoBuffer.push(tempo);
        if (this.tempoBuffer.length > 8) {
            this.tempoBuffer.shift();
        }

        return this.tempoBuffer.reduce((a, b) => a + b, 0) / this.tempoBuffer.length;
    }

    private calculateTempoConfidence(): number {
        if (this.beatIntervals.length < 4) return 0;

        const avgInterval = this.beatIntervals.reduce((a, b) => a + b, 0) / this.beatIntervals.length;
        const variance = this.beatIntervals.reduce((sum, val) =>
            sum + Math.pow(val - avgInterval, 2), 0) / this.beatIntervals.length;
        const stdDev = Math.sqrt(variance);

        // Lower standard deviation = higher confidence
        return Math.max(0, 1 - (stdDev / avgInterval));
    }

    public getTempo(): number {
        return this.currentTempo;
    }

    public getConfidence(): number {
        return this.confidence;
    }
}

// Rhythm Analyzer
class RhythmAnalyzer {
    private rhythmPattern: number[] = [];
    private patternLength: number = 16; // 4/4 time signature
    private beatCounter: number = 0;

    public analyze(spectrum: Float32Array): number {
        const energy = this.calculateEnergy(spectrum);

        // Build rhythm pattern
        this.rhythmPattern[this.beatCounter % this.patternLength] = energy;
        this.beatCounter++;

        // Calculate rhythm strength
        if (this.rhythmPattern.length >= this.patternLength) {
            return this.calculateRhythmStrength();
        }

        return 0;
    }

    private calculateEnergy(spectrum: Float32Array): number {
        let sum = 0;
        for (let i = 0; i < spectrum.length; i++) {
            sum += spectrum[i] * spectrum[i];
        }
        return Math.sqrt(sum / spectrum.length);
    }

    private calculateRhythmStrength(): number {
        // Calculate autocorrelation to find rhythmic patterns
        let maxCorrelation = 0;

        for (let lag = 1; lag < this.patternLength / 2; lag++) {
            let correlation = 0;
            for (let i = 0; i < this.patternLength - lag; i++) {
                correlation += this.rhythmPattern[i] * this.rhythmPattern[i + lag];
            }
            maxCorrelation = Math.max(maxCorrelation, correlation);
        }

        return maxCorrelation / this.patternLength;
    }
}

// Advanced Visual Effects
class AdvancedVisualEffects {
    private flashIntensity: number = 0;
    private pulsePhase: number = 0;
    private kickPulse: number = 0;
    private snarePulse: number = 0;
    private hihatPulse: number = 0;
    private energyPulse: number = 0;
    private colorShift: number = 0;

    public update(audioFeatures: AdvancedAudioFeatures): void {
        // Update flash intensity
        if (audioFeatures.beat) {
            this.flashIntensity = Math.min(1, audioFeatures.energy * audioFeatures.beatConfidence);
        } else {
            this.flashIntensity *= 0.85; // Smooth fade
        }

        // Update drum-specific pulses
        if (audioFeatures.kick) {
            this.kickPulse = 1.0;
        } else {
            this.kickPulse *= 0.8;
        }

        if (audioFeatures.snare) {
            this.snarePulse = 1.0;
        } else {
            this.snarePulse *= 0.7;
        }

        if (audioFeatures.hihat) {
            this.hihatPulse = 1.0;
        } else {
            this.hihatPulse *= 0.6;
        }

        // Update energy pulse
        this.energyPulse = audioFeatures.energy;

        // Update pulse phase based on tempo
        const tempoMultiplier = audioFeatures.tempo > 0 ? audioFeatures.tempo / 120 : 1;
        this.pulsePhase += 0.1 * tempoMultiplier;
        if (this.pulsePhase > Math.PI * 2) {
            this.pulsePhase -= Math.PI * 2;
        }

        // Update color shift based on spectral centroid
        this.colorShift = audioFeatures.spectralCentroid * 360;
    }

    public getFlashIntensity(): number { return this.flashIntensity; }
    public getPulse(): number { return Math.sin(this.pulsePhase); }
    public getKickPulse(): number { return this.kickPulse; }
    public getSnarePulse(): number { return this.snarePulse; }
    public getHihatPulse(): number { return this.hihatPulse; }
    public getEnergyPulse(): number { return this.energyPulse; }
    public getColorShift(): number { return this.colorShift; }
}

// Professional Particle Classes
class ProfessionalParticle {
    public x: number;
    public y: number;
    public vx: number;
    public vy: number;
    public life: number;
    public color: string;
    public size: number;
    public baseSize: number;
    public energy: number;
    public particleType: ParticleType;
    public phase: number;
    public rotationSpeed: number;
    public rotation: number;

    constructor(x: number, y: number, color: string, energy: number,
        audioFeatures: AdvancedAudioFeatures, type: ParticleType) {
        this.x = x;
        this.y = y;
        this.energy = energy;
        this.particleType = type;
        this.color = color;
        this.baseSize = Math.random() * 4 + 2;
        this.size = this.baseSize;
        this.life = 1.0;
        this.phase = Math.random() * Math.PI * 2;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;

        // Type-specific properties
        switch (type) {
            case 'bass':
                this.vx = (Math.random() - 0.5) * 4;
                this.vy = (Math.random() - 0.5) * 8 - 2;
                this.baseSize *= 1.5;
                break;
            case 'mid':
                this.vx = (Math.random() - 0.5) * 6;
                this.vy = (Math.random() - 0.5) * 6;
                break;
            case 'treble':
                this.vx = (Math.random() - 0.5) * 8;
                this.vy = (Math.random() - 0.5) * 4 - 4;
                this.baseSize *= 0.8;
                break;
            case 'sparkle':
                this.vx = (Math.random() - 0.5) * 10;
                this.vy = (Math.random() - 0.5) * 10;
                this.baseSize *= 0.6;
                this.rotationSpeed *= 2;
                break;
        }
    }

    public update(audioFeatures: AdvancedAudioFeatures): void {
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed;
        this.phase += 0.1;

        // Physics
        this.vy += 0.1; // gravity
        this.vx *= 0.98; // air resistance
        this.life -= 0.012;

        // Audio-reactive behaviors
        if (audioFeatures.beat) {
            const beatImpact = audioFeatures.beatConfidence;
            this.size = this.baseSize * (1 + beatImpact * 2);

            // Beat pulse effect
            if (this.particleType === 'bass' && audioFeatures.kick) {
                this.vy -= beatImpact * 3;
                this.size *= 1.5;
            }
            if (this.particleType === 'mid' && audioFeatures.snare) {
                this.vx += (Math.random() - 0.5) * beatImpact * 8;
                this.vy -= beatImpact * 2;
            }
            if (this.particleType === 'treble' && audioFeatures.hihat) {
                this.rotationSpeed *= 1.5;
            }
        } else {
            this.size = this.baseSize * (1 + audioFeatures.energy * 0.5);
        }

        // Type-specific audio reactions
        switch (this.particleType) {
            case 'bass':
                if (audioFeatures.bassEnergy > 0.7) {
                    this.vy -= audioFeatures.bassEnergy * 2;
                }
                break;
            case 'treble':
                if (audioFeatures.trebleEnergy > 0.6) {
                    this.vx += (Math.random() - 0.5) * audioFeatures.trebleEnergy * 4;
                }
                break;
            case 'sparkle':
                this.size = this.baseSize * (1 + Math.sin(this.phase) * 0.5 + audioFeatures.energy);
                break;
        }
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Type-specific drawing
        switch (this.particleType) {
            case 'bass':
                this.drawBassParticle(ctx);
                break;
            case 'mid':
                this.drawMidParticle(ctx);
                break;
            case 'treble':
                this.drawTrebleParticle(ctx);
                break;
            case 'sparkle':
                this.drawSparkleParticle(ctx);
                break;
        }

        ctx.restore();
    }

    private drawBassParticle(ctx: CanvasRenderingContext2D): void {
        // Square with glow
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.size * 2;
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
    }

    private drawMidParticle(ctx: CanvasRenderingContext2D): void {
        // Circle with ring
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.size;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, this.size * 1.5, 0, Math.PI * 2);
        ctx.stroke();
    }

    private drawTrebleParticle(ctx: CanvasRenderingContext2D): void {
        // Triangle
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(0, -this.size);
        ctx.lineTo(-this.size * 0.8, this.size * 0.6);
        ctx.lineTo(this.size * 0.8, this.size * 0.6);
        ctx.closePath();
        ctx.fill();
    }

    private drawSparkleParticle(ctx: CanvasRenderingContext2D): void {
        // Star shape
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.size * 3;

        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI) / 4;
            const radius = i % 2 === 0 ? this.size : this.size * 0.4;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
    }
}

class DrumParticle {
    public x: number;
    public y: number;
    public vx: number;
    public vy: number;
    public life: number;
    public color: string;
    public size: number;
    public drumType: 'kick' | 'snare' | 'hihat';
    public intensity: number;

    constructor(x: number, y: number, color: string, intensity: number, drumType: 'kick' | 'snare' | 'hihat') {
        this.x = x;
        this.y = y;
        this.color = color;
        this.intensity = intensity;
        this.drumType = drumType;
        this.life = 1.0;

        // Drum-specific properties
        switch (drumType) {
            case 'kick':
                this.size = 8 + intensity * 12;
                this.vx = (Math.random() - 0.5) * 6;
                this.vy = -Math.random() * 8 - 4;
                break;
            case 'snare':
                this.size = 6 + intensity * 8;
                this.vx = (Math.random() - 0.5) * 12;
                this.vy = -Math.random() * 6 - 2;
                break;
            case 'hihat':
                this.size = 3 + intensity * 4;
                this.vx = (Math.random() - 0.5) * 8;
                this.vy = -Math.random() * 10 - 6;
                break;
        }
    }

    public update(audioFeatures: AdvancedAudioFeatures): void {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.15; // gravity
        this.vx *= 0.95; // friction
        this.life -= this.drumType === 'hihat' ? 0.03 : 0.02;
        this.size *= 0.98; // shrink
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.size;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// TypeScript Interfaces and Types
interface AdvancedAudioFeatures {
    energy: number;
    bassEnergy: number;
    midEnergy: number;
    trebleEnergy: number;
    subBassEnergy: number;
    highMidEnergy: number;
    presenceEnergy: number;
    brillianceEnergy: number;
    spectralCentroid: number;
    spectralRolloff: number;
    spectralFlux: number;
    zeroCrossingRate: number;
    tempo: number;
    beat: boolean;
    kick: boolean;
    snare: boolean;
    hihat: boolean;
    onset: boolean;
    transient: boolean;
    harmonicContent: number;
    percussiveContent: number;
    loudness: number;
    dynamicRange: number;
    rhythmStrength: number;
    beatConfidence: number;
}

interface BeatResult {
    beat: boolean;
    kick: boolean;
    snare: boolean;
    hihat: boolean;
    confidence: number;
    energy: number;
    bassEnergy: number;
}

interface BeatEvent {
    time: number;
    energy: number;
    confidence: number;
    type: 'kick' | 'snare' | 'general';
}

interface OnsetEvent {
    time: number;
    spectralFlux: number;
    frequency: number;
}

interface PerformanceMetrics {
    avgFrameTime: number;
    droppedFrames: number;
    cpuUsage: number;
}

type ParticleType = 'bass' | 'mid' | 'treble' | 'sparkle';

// Enhanced frequency analyzer
class AdvancedFrequencyAnalyzer {
    private peakHistory: number[][] = [];
    private harmonicSeries: number[] = [];
    private fundamentalFreq: number = 0;

    public analyze(spectrum: Float32Array): void {
        const peaks = this.findSpectralPeaks(spectrum);
        this.peakHistory.push(peaks);

        if (this.peakHistory.length > 20) {
            this.peakHistory.shift();
        }

        this.fundamentalFreq = this.estimateFundamental(peaks);
        this.harmonicSeries = this.detectHarmonics(spectrum, this.fundamentalFreq);
    }

    private findSpectralPeaks(spectrum: Float32Array): number[] {
        const peaks = [];
        const threshold = 0.1;

        for (let i = 2; i < spectrum.length - 2; i++) {
            if (spectrum[i] > threshold &&
                spectrum[i] > spectrum[i - 1] && spectrum[i] > spectrum[i + 1] &&
                spectrum[i] > spectrum[i - 2] && spectrum[i] > spectrum[i + 2]) {
                peaks.push(i);
            }
        }

        // Sort by magnitude
        return peaks.sort((a, b) => spectrum[b] - spectrum[a]).slice(0, 10);
    }

    private estimateFundamental(peaks: number[]): number {
        if (peaks.length === 0) return 0;

        // Simple fundamental estimation - lowest significant peak
        return peaks[peaks.length - 1]; // Lowest frequency peak
    }

    private detectHarmonics(spectrum: Float32Array, fundamental: number): number[] {
        if (fundamental === 0) return [];

        const harmonics = [];
        for (let harmonic = 2; harmonic <= 8; harmonic++) {
            const expectedBin = fundamental * harmonic;
            if (expectedBin < spectrum.length) {
                harmonics.push(spectrum[expectedBin]);
            }
        }
        return harmonics;
    }

    public getPeaks(): number[] {
        return this.peakHistory[this.peakHistory.length - 1] || [];
    }

    public getFundamental(): number {
        return this.fundamentalFreq;
    }

    public getHarmonics(): number[] {
        return this.harmonicSeries;
    }
}

// Enhanced Particle class for backward compatibility
class EnhancedParticle {
    public x: number;
    public y: number;
    public vx: number;
    public vy: number;
    public life: number;
    public color: string;
    public size: number;
    public baseSize: number;
    public energy: number;

    constructor(x: number, y: number, color: string, energy: number = 0.5) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 6;
        this.vy = (Math.random() - 0.5) * 6;
        this.life = 1.0;
        this.color = color;
        this.energy = energy;
        this.baseSize = Math.random() * 3 + 1;
        this.size = this.baseSize;
    }

    public update(audioFeatures: AdvancedAudioFeatures): void {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.015;
        this.vy += 0.08;

        // React to beats
        if (audioFeatures.beat) {
            this.size = this.baseSize * (1 + audioFeatures.energy * 2);
            this.vx *= 1.2;
            this.vy *= 1.2;
        } else {
            this.size = this.baseSize * (1 + audioFeatures.energy * 0.5);
        }

        // React to bass
        if (audioFeatures.bassEnergy > 0.7) {
            this.vy -= audioFeatures.bassEnergy * 2;
        }
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.globalAlpha = this.life;

        // Add glow effect
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.size * 2;

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// Basic Particle class for compatibility
class Particle {
    public x: number;
    public y: number;
    public vx: number;
    public vy: number;
    public life: number;
    public color: string;
    public size: number;

    constructor(x: number, y: number, color: string) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.life = 1.0;
        this.color = color;
        this.size = Math.random() * 3 + 1;
    }

    public update(): void {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.02;
        this.vy += 0.1;
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// Configuration interfaces
interface VisualizerConfig {
    sensitivity?: number; // 0-1
    colorScheme?: ColorScheme;
    particleCount?: number;
    smoothing?: number; // 0-1
}

type ColorScheme = 'spotify' | 'neon' | 'ocean' | 'fire';

// Export the enhanced visualizer
export type { AdvancedAudioFeatures, BeatResult, VisualizerConfig, ColorScheme };

// Additional utility functions
export const VisualizerUtils = {
    // Convert frequency bin to Hz
    binToFrequency: (bin: number, sampleRate: number = 44100, fftSize: number = 2048): number => {
        return (bin * sampleRate) / fftSize;
    },

    // Convert Hz to frequency bin
    frequencyToBin: (frequency: number, sampleRate: number = 44100, fftSize: number = 2048): number => {
        return Math.round((frequency * fftSize) / sampleRate);
    },

    // Calculate RMS energy
    calculateRMS: (data: Float32Array): number => {
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            sum += data[i] * data[i];
        }
        return Math.sqrt(sum / data.length);
    },

    // Apply window function
    applyHammingWindow: (data: Float32Array): Float32Array => {
        const windowed = new Float32Array(data.length);
        for (let i = 0; i < data.length; i++) {
            const window = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (data.length - 1));
            windowed[i] = data[i] * window;
        }
        return windowed;
    },

    // Smooth array values
    smoothArray: (data: number[], factor: number = 0.8): number[] => {
        const smoothed = [...data];
        for (let i = 1; i < smoothed.length; i++) {
            smoothed[i] = smoothed[i - 1] * factor + smoothed[i] * (1 - factor);
        }
        return smoothed;
    }
};

console.log('🎵✨ Professional AudioVisualizer loaded with advanced features!');