export class TypeWriter {
    private element: HTMLElement;
    private container!: HTMLElement;
    private texts: string[] = ["Dev Bismaya", "Music Lover Bismaya", "Code Creator Bismaya", "Sound Engineer Bismaya"];
    private currentTextIndex: number = 0;
    private currentIndex: number = 0;
    private typeSpeed: number = 60;
    private eraseSpeed: number = 30;
    private pauseDuration: number = 2000;
    private textSwitchPause: number = 500;
    private animationId: number = 0;
    private isAnimating: boolean = false;

    constructor() {
        this.createTypewriterElement();
        this.element = document.getElementById('typewriter') as HTMLElement;
        if (!this.element) {
            console.error('TypeWriter element was not created properly');
            return;
        }
        this.startAnimation();
    }

    private createTypewriterElement(): void {
        this.container = document.createElement('div');
        this.container.className = 'typewriter-container';

        this.container.innerHTML = `
            <span class="typewriter-text" id="typewriter"></span>
            <span class="typewriter-cursor">|</span>
        `;

        document.body.appendChild(this.container);
        console.log('✅ TypeWriter element created and added to DOM');
    }

    private getCurrentText(): string {
        return this.texts[this.currentTextIndex];
    }

    private startAnimation(): void {
        if (!this.isAnimating) {
            this.isAnimating = true;
            this.smoothTypeText();
        }
    }

    private smoothTypeText(): void {
        if (!this.isAnimating) return;

        const currentText = this.getCurrentText();

        if (this.currentIndex < currentText.length) {
            // Ultra smooth character reveal with clean transition
            const newText = currentText.substring(0, this.currentIndex + 1);

            // Set text with clean transition - NO BLUR EFFECTS
            this.element.style.transition = 'all 0.1s cubic-bezier(0.4, 0, 0.2, 1)';
            this.element.textContent = newText;

            // Remove all glow and blur effects
            this.element.style.textShadow = 'none';
            this.element.style.filter = 'none';

            // Clean scale animation
            this.element.style.transform = 'scale(1.01)';
            setTimeout(() => {
                if (this.element) {
                    this.element.style.transform = 'scale(1)';
                }
            }, 50);

            this.currentIndex++;

            setTimeout(() => {
                if (this.isAnimating) {
                    requestAnimationFrame(() => this.smoothTypeText());
                }
            }, this.typeSpeed);

        } else {
            // Finished typing - clean pause state
            this.element.style.transition = 'all 0.2s ease-out';
            this.element.style.textShadow = 'none';
            this.element.style.filter = 'none';

            // Clean breathing effect
            this.breathingEffect();

            setTimeout(() => {
                if (this.isAnimating) {
                    this.stopBreathing();
                    this.smoothEraseText();
                }
            }, this.pauseDuration);
        }
    }

    private breathingEffect(): void {
        if (!this.element || !this.isAnimating) return;

        this.element.style.transition = 'all 1s ease-in-out';
        this.element.style.transform = 'scale(1.02)';
        this.element.style.textShadow = 'none'; // Keep it clean
        this.element.style.filter = 'none';

        setTimeout(() => {
            if (this.element && this.isAnimating) {
                this.element.style.transform = 'scale(1)';
            }
        }, 1000);
    }

    private stopBreathing(): void {
        if (this.element) {
            this.element.style.transition = 'all 0.2s ease-out';
            this.element.style.transform = 'scale(1)';
        }
    }

    private smoothEraseText(): void {
        if (!this.isAnimating) return;

        const currentText = this.getCurrentText();

        if (this.currentIndex > 0) {
            // Clean erasing with no blur effects
            this.element.style.transition = 'all 0.08s cubic-bezier(0.4, 0, 0.2, 1)';
            this.element.textContent = currentText.substring(0, this.currentIndex - 1);

            // Keep it clean - no glow effects
            this.element.style.textShadow = 'none';
            this.element.style.filter = 'none';

            // Subtle shrink animation
            this.element.style.transform = 'scale(0.99)';
            setTimeout(() => {
                if (this.element) {
                    this.element.style.transform = 'scale(1)';
                }
            }, 40);

            this.currentIndex--;

            setTimeout(() => {
                if (this.isAnimating) {
                    requestAnimationFrame(() => this.smoothEraseText());
                }
            }, this.eraseSpeed);

        } else {
            // Finished erasing - reset cleanly
            this.element.style.transition = 'all 0.2s ease-out';
            this.element.style.textShadow = 'none';
            this.element.style.filter = 'none';
            this.element.style.transform = 'scale(1)';

            // Switch to next text
            this.currentTextIndex = (this.currentTextIndex + 1) % this.texts.length;

            setTimeout(() => {
                if (this.isAnimating) {
                    requestAnimationFrame(() => this.smoothTypeText());
                }
            }, this.textSwitchPause);
        }
    }

    // Enhanced methods
    public addText(text: string): void {
        this.texts.push(text);
    }

    public setTexts(texts: string[]): void {
        this.texts = texts;
        this.currentTextIndex = 0;
    }

    public setText(newText: string): void {
        this.texts = [newText];
        this.currentTextIndex = 0;
    }

    public setSpeed(typeSpeed: number, eraseSpeed?: number): void {
        this.typeSpeed = Math.max(20, typeSpeed); // Minimum for smoothness
        if (eraseSpeed) this.eraseSpeed = Math.max(15, eraseSpeed);
    }

    public pause(): void {
        this.isAnimating = false;
    }

    public resume(): void {
        if (!this.isAnimating) {
            this.isAnimating = true;
            this.startAnimation();
        }
    }

    public destroy(): void {
        this.isAnimating = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.container && this.container.parentNode) {
            // Fade out before removing
            this.container.style.transition = 'all 0.5s ease-out';
            this.container.style.opacity = '0';
            this.container.style.transform = 'translateY(-10px)';

            setTimeout(() => {
                if (this.container && this.container.parentNode) {
                    this.container.parentNode.removeChild(this.container);
                }
            }, 500);
        }
    }

    public getElement(): HTMLElement {
        return this.container;
    }
}