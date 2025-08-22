export class VolumeControl {
    private element: HTMLElement;
    private volumeSlider: HTMLInputElement;
    private volumeIcon: HTMLElement;
    private volumeValue: HTMLElement;
    private currentVolume: number = 0.7; // Default 70%
    private previousVolume: number = 0.7;
    private isMuted: boolean = false;
    private onVolumeChangeCallback?: (volume: number) => void;
    private onMuteToggleCallback?: (muted: boolean) => void;

    constructor() {
        this.element = this.createElement();
        this.volumeSlider = this.element.querySelector('.volume-slider') as HTMLInputElement;
        this.volumeIcon = this.element.querySelector('.volume-icon') as HTMLElement;
        this.volumeValue = this.element.querySelector('.volume-value') as HTMLElement;
        this.initializeVolume();
        this.setupEventListeners();
    }

    private createElement(): HTMLElement {
        const volumeContainer = document.createElement('div');
        volumeContainer.className = 'volume-control';
        volumeContainer.innerHTML = `
            <button class="volume-btn" title="Toggle mute">
                <div class="volume-icon">
                    <svg class="volume-high" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                    </svg>
                    <svg class="volume-medium" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </svg>
                    <svg class="volume-low" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    </svg>
                    <svg class="volume-muted" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <line x1="22" y1="9" x2="16" y2="15"></line>
                        <line x1="16" y1="9" x2="22" y2="15"></line>
                    </svg>
                </div>
            </button>
            
            <div class="volume-slider-container">
                <input 
                    type="range" 
                    class="volume-slider" 
                    min="0" 
                    max="100" 
                    value="70"
                    title="Volume"
                >
                <div class="volume-track">
                    <div class="volume-fill"></div>
                    <div class="volume-thumb"></div>
                </div>
            </div>
            
            <div class="volume-value">70%</div>
        `;
        return volumeContainer;
    }

    private initializeVolume(): void {
        // Load saved volume from localStorage
        const savedVolume = localStorage.getItem('sonix-volume');
        const savedMuted = localStorage.getItem('sonix-muted') === 'true';
        
        if (savedVolume !== null) {
            this.currentVolume = parseFloat(savedVolume);
        }
        
        this.isMuted = savedMuted;
        this.updateUI();
    }

    private setupEventListeners(): void {
        const volumeBtn = this.element.querySelector('.volume-btn') as HTMLButtonElement;
        
        // Volume button click (mute/unmute)
        volumeBtn.addEventListener('click', () => {
            this.toggleMute();
        });

        // Volume slider input
        this.volumeSlider.addEventListener('input', (e) => {
            const volume = parseFloat((e.target as HTMLInputElement).value) / 100;
            this.setVolume(volume, false);
        });

        // Volume slider change (when user releases)
        this.volumeSlider.addEventListener('change', () => {
            this.saveVolumeSettings();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target instanceof HTMLInputElement) return;
            
            switch(e.key) {
                case 'ArrowUp':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.increaseVolume();
                    }
                    break;
                case 'ArrowDown':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.decreaseVolume();
                    }
                    break;
                case 'm':
                case 'M':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.toggleMute();
                    }
                    break;
            }
        });

        // Mouse wheel on volume control
        this.element.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.05 : 0.05;
            const newVolume = Math.max(0, Math.min(1, this.currentVolume + delta));
            this.setVolume(newVolume);
        });
    }

    private updateUI(): void {
        const volume = this.isMuted ? 0 : this.currentVolume;
        const volumePercent = Math.round(volume * 100);
        
        // Update slider
        this.volumeSlider.value = this.isMuted ? '0' : (this.currentVolume * 100).toString();
        
        // Update volume value display
        this.volumeValue.textContent = this.isMuted ? '0%' : `${Math.round(this.currentVolume * 100)}%`;
        
        // Update volume icon
        this.updateVolumeIcon(volume);
        
        // Update volume fill
        this.updateVolumeFill(volume);
        
        // Update muted state
        this.element.classList.toggle('muted', this.isMuted);
    }

    private updateVolumeIcon(volume: number): void {
        const icons = this.volumeIcon.querySelectorAll('svg');
        icons.forEach(icon => icon.style.display = 'none');
        
        let activeIcon: Element;
        if (this.isMuted || volume === 0) {
            activeIcon = this.volumeIcon.querySelector('.volume-muted')!;
        } else if (volume < 0.3) {
            activeIcon = this.volumeIcon.querySelector('.volume-low')!;
        } else if (volume < 0.7) {
            activeIcon = this.volumeIcon.querySelector('.volume-medium')!;
        } else {
            activeIcon = this.volumeIcon.querySelector('.volume-high')!;
        }
        
        (activeIcon as HTMLElement).style.display = 'block';
    }

    private updateVolumeFill(volume: number): void {
        const volumeFill = this.element.querySelector('.volume-fill') as HTMLElement;
        const volumeThumb = this.element.querySelector('.volume-thumb') as HTMLElement;
        
        if (volumeFill) {
            volumeFill.style.width = `${volume * 100}%`;
        }
        
        if (volumeThumb) {
            volumeThumb.style.left = `${volume * 100}%`;
        }
    }

    public setVolume(volume: number, saveSettings: boolean = true): void {
        this.currentVolume = Math.max(0, Math.min(1, volume));
        
        if (this.currentVolume > 0) {
            this.isMuted = false;
        }
        
        this.updateUI();
        
        if (this.onVolumeChangeCallback) {
            this.onVolumeChangeCallback(this.isMuted ? 0 : this.currentVolume);
        }
        
        if (saveSettings) {
            this.saveVolumeSettings();
        }
    }

    public toggleMute(): void {
        if (this.isMuted) {
            this.isMuted = false;
            if (this.currentVolume === 0) {
                this.currentVolume = this.previousVolume;
            }
        } else {
            this.previousVolume = this.currentVolume;
            this.isMuted = true;
        }
        
        this.updateUI();
        
        if (this.onVolumeChangeCallback) {
            this.onVolumeChangeCallback(this.isMuted ? 0 : this.currentVolume);
        }
        
        if (this.onMuteToggleCallback) {
            this.onMuteToggleCallback(this.isMuted);
        }
        
        this.saveVolumeSettings();
    }

    public increaseVolume(step: number = 0.1): void {
        this.setVolume(this.currentVolume + step);
    }

    public decreaseVolume(step: number = 0.1): void {
        this.setVolume(this.currentVolume - step);
    }

    private saveVolumeSettings(): void {
        localStorage.setItem('sonix-volume', this.currentVolume.toString());
        localStorage.setItem('sonix-muted', this.isMuted.toString());
    }

    public getVolume(): number {
        return this.isMuted ? 0 : this.currentVolume;
    }

    public getRawVolume(): number {
        return this.currentVolume;
    }

    public isMutedState(): boolean {
        return this.isMuted;
    }

    public onVolumeChange(callback: (volume: number) => void): void {
        this.onVolumeChangeCallback = callback;
    }

    public onMuteToggle(callback: (muted: boolean) => void): void {
        this.onMuteToggleCallback = callback;
    }

    public getElement(): HTMLElement {
        return this.element;
    }
}