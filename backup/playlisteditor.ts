import { Playlist } from '../../types';
import { PlaylistService } from '../../services/PlaylistService';

export interface PlaylistEditorOptions {
    playlist: Playlist;
    onSave: (updatedPlaylist: Playlist) => void;
    onCancel: () => void;
}

export class PlaylistEditor {
    private modal: HTMLElement;
    private playlist!: Playlist;
    private playlistService: PlaylistService;
    private onSave!: (updatedPlaylist: Playlist) => void;
    private onCancel!: () => void;
    private cropperInstance: any = null;
    private selectedImageFile: File | null = null;

    // new properties
    private cropperCanvas: HTMLCanvasElement | null = null;
    private cropperContext: CanvasRenderingContext2D | null = null;
    private originalImageData: any = null;
    private cropArea: any = null;
    private selectedCoverBlob: Blob | null = null;
    private originalPlaylist: Playlist | null = null;

    constructor(playlistService: PlaylistService) {
        this.playlistService = playlistService;
        this.modal = this.createElement();
        document.body.appendChild(this.modal);
    }

    private createElement(): HTMLElement {
        const modal = document.createElement('div');
        modal.className = 'playlist-editor-modal';
        modal.style.display = 'none';
        return modal;
    }

    public show(options: PlaylistEditorOptions): void {
        this.playlist = { ...options.playlist };
        this.originalPlaylist = { ...options.playlist };
        this.onSave = options.onSave;
        this.onCancel = options.onCancel;

        this.modal.innerHTML = `
            <div class="modal-backdrop">
                <div class="modal-content playlist-editor-content">
                    <div class="modal-header">
                        <h3>Edit Playlist</h3>
                        <button class="close-modal-btn" type="button">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="editor-sections">
                            <!-- Cover Art Section -->
                            <div class="cover-art-section">
                                <h4>Cover Art</h4>
                                <div class="cover-art-container">
                                    <div class="current-cover">
                                        <img src="${this.playlist.coverArt || '/assets/images/default-playlist.jpg'}" 
                                             alt="Playlist Cover" class="cover-preview" id="coverPreview">
                                        <div class="cover-overlay">
                                            <button class="change-cover-btn" type="button">
                                                <svg viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                                                </svg>
                                                <span>Change Cover</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Image Cropper Section (Hidden by default) -->
                                <div class="cropper-section" style="display: none;">
                                    <div class="cropper-container">
                                        <img id="cropperImage" style="max-width: 100%;">
                                    </div>
                                    <div class="cropper-controls">
                                        <button class="btn-secondary cancel-crop-btn" type="button">Cancel</button>
                                        <button class="btn-primary apply-crop-btn" type="button">Apply Crop</button>
                                    </div>
                                </div>
                            </div>

                            <!-- Playlist Details Section -->
                            <div class="details-section">
                                <h4>Playlist Details</h4>
                                <div class="form-group">
                                    <label for="playlistName">Name</label>
                                    <input type="text" id="playlistName" class="form-input" 
                                           value="${this.playlist.name}" placeholder="Enter playlist name">
                                </div>
                                <div class="form-group">
                                    <label for="playlistDescription">Description</label>
                                    <textarea id="playlistDescription" class="form-textarea" 
                                              placeholder="Add a description (optional)">${this.playlist.description || ''}</textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary cancel-btn" type="button">Cancel</button>
                        <button class="btn-primary save-btn" type="button">Save Changes</button>
                    </div>
                </div>
            </div>
            
            <!-- Hidden file input -->
            <input type="file" id="coverFileInput" accept="image/*" style="display: none;">
        `;

        this.setupEventListeners();
        this.modal.style.display = 'block';
    }

    private setupEventListeners(): void {
        const fileInput = this.modal.querySelector('#coverFileInput') as HTMLInputElement;
        const changeCoverBtn = this.modal.querySelector('.change-cover-btn') as HTMLButtonElement;
        const cancelCropBtn = this.modal.querySelector('.cancel-crop-btn') as HTMLButtonElement;
        const applyCropBtn = this.modal.querySelector('.apply-crop-btn') as HTMLButtonElement;
        const saveBtn = this.modal.querySelector('.save-btn') as HTMLButtonElement;
        const cancelBtn = this.modal.querySelector('.cancel-btn') as HTMLButtonElement;
        const closeBtn = this.modal.querySelector('.close-modal-btn') as HTMLButtonElement;

        // Change cover button
        changeCoverBtn?.addEventListener('click', () => {
            fileInput?.click();
        });

        // File input change - improved error handling
        fileInput?.addEventListener('change', (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file && file.type.startsWith('image/')) {
                console.log('📁 New image selected:', file.name);

                // Clean up previous selection
                if (this.selectedImageFile) {
                    console.log('🧹 Cleaning up previous image selection');
                }

                this.selectedImageFile = file;
                this.showCropper(file);
            } else if (file) {
                alert('Please select a valid image file');
            }

            // Clear the file input to allow selecting the same file again
            (e.target as HTMLInputElement).value = '';
        });

        // Cropper controls
        cancelCropBtn?.addEventListener('click', () => {
            console.log('❌ Crop cancelled');
            this.hideCropper();
        });

        applyCropBtn?.addEventListener('click', () => {
            console.log('✅ Applying crop');
            this.applyCrop();
        });

        // Modal controls
        saveBtn?.addEventListener('click', () => {
            this.saveChanges();
        });

        cancelBtn?.addEventListener('click', () => {
            this.hide();
            this.onCancel();
        });

        closeBtn?.addEventListener('click', () => {
            this.hide();
            this.onCancel();
        });

        // Close on backdrop click
        this.modal.querySelector('.modal-backdrop')?.addEventListener('click', (e) => {
            if (e.target === this.modal.querySelector('.modal-backdrop')) {
                this.hide();
                this.onCancel();
            }
        });
    }

    private showCropper(file: File): void {
        // Clean up any existing cropper first
        this.hideCropper();

        const reader = new FileReader();
        reader.onload = (e) => {
            // Check if the modal still exists and is visible (user didn't close it)
            if (!this.modal || this.modal.style.display === 'none') {
                console.log('🚫 Modal closed, cancelling image load');
                return;
            }

            const cropperImage = this.modal.querySelector('#cropperImage') as HTMLImageElement;
            const cropperSection = this.modal.querySelector('.cropper-section') as HTMLElement;

            // Double-check that elements still exist
            if (!cropperImage || !cropperSection) {
                console.log('🚫 Cropper elements not found, probably replaced by new cropper');
                return;
            }

            try {
                cropperImage.src = e.target?.result as string;
                cropperSection.style.display = 'block';

                // Add instructions
                const existingInstructions = cropperSection.querySelector('.cropper-instructions');
                if (!existingInstructions) {
                    const instructions = document.createElement('div');
                    instructions.className = 'cropper-instructions';
                    instructions.innerHTML = `
                    <p><strong>Drag</strong> to move the image • <strong>Scroll</strong> to zoom in/out</p>
                    <p>Adjust the image to fit within the green square</p>
                `;
                    cropperSection.insertBefore(instructions, cropperSection.firstChild);
                }

                // Initialize cropper
                this.initializeCropper(cropperImage);
            } catch (error) {
                console.error('❌ Error setting up cropper:', error);
            }
        };

        reader.onerror = (error) => {
            console.error('❌ Error reading file:', error);
        };

        reader.readAsDataURL(file);
    }

    private initializeCropper(image: HTMLImageElement): void {
        // Import Cropper.js dynamically or include it in your project
        // For now, I'll provide a simplified version
        // You should install: npm install cropperjs @types/cropperjs

        this.createFunctionalCropper(image);
    }

    private createFunctionalCropper(image: HTMLImageElement): void {
        const container = image.parentElement;
        if (!container) {
            console.error('❌ No container found for cropper');
            return;
        }

        // Check if image is still valid
        if (!image.src || image.src === '') {
            console.error('❌ Invalid image source for cropper');
            return;
        }

        // Clean up any existing cropper wrapper
        const existingWrapper = container.querySelector('.cropper-wrapper');
        if (existingWrapper) {
            existingWrapper.remove();
        }

        // Create a more functional cropper with responsive sizing
        const cropperWrapper = document.createElement('div');
        cropperWrapper.className = 'cropper-wrapper';

        // Make it responsive
        const maxSize = Math.min(400, window.innerWidth - 100, window.innerHeight - 200);

        cropperWrapper.style.cssText = `
        position: relative;
        width: ${maxSize}px;
        height: ${maxSize}px;
        margin: 0 auto;
        border: 2px solid var(--primary-color);
        overflow: hidden;
        background: #000;
        border-radius: 12px;
    `;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('❌ Could not get canvas context');
            return;
        }

        canvas.width = maxSize;
        canvas.height = maxSize;
        canvas.style.cssText = 'width: 100%; height: 100%; cursor: move; border-radius: 12px;';

        const img = new Image();
        img.onload = () => {
            // Double-check that we're still in a valid state
            if (!this.modal || this.modal.style.display === 'none') {
                console.log('🚫 Modal closed during image load, cancelling cropper setup');
                return;
            }

            // Calculate initial scale to fit image properly
            const imgAspect = img.width / img.height;
            const canvasAspect = maxSize / maxSize; // 1:1 for square canvas

            let initialScale;
            let offsetX = 0;
            let offsetY = 0;

            if (imgAspect > canvasAspect) {
                // Image is wider - scale to fit height, center horizontally
                initialScale = maxSize / img.height;
                offsetX = (maxSize - (img.width * initialScale)) / 2;
            } else {
                // Image is taller - scale to fit width, center vertically
                initialScale = maxSize / img.width;
                offsetY = (maxSize - (img.height * initialScale)) / 2;
            }

            // Store original image data with proper initial positioning
            this.originalImageData = {
                img: img,
                scale: initialScale,
                offsetX: offsetX,
                offsetY: offsetY
            };

            this.drawCropperImage();
            this.addCropInteractions(canvas);
        };

        img.onerror = () => {
            console.error('❌ Failed to load image for cropper');
        };

        img.src = image.src;

        cropperWrapper.appendChild(canvas);
        container.replaceChild(cropperWrapper, image);

        this.cropperCanvas = canvas;
        this.cropperContext = ctx;
    }

    private drawCropperImage(): void {
        if (!this.cropperContext || !this.originalImageData) return;

        const { img, scale, offsetX, offsetY } = this.originalImageData;
        const canvas = this.cropperCanvas!;
        const ctx = this.cropperContext;

        // Clear canvas with a neutral background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Calculate scaled dimensions
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;

        // Draw image with proper scaling
        ctx.drawImage(
            img,
            0, 0, img.width, img.height,
            offsetX, offsetY, scaledWidth, scaledHeight
        );

        // Draw crop overlay
        this.drawCropOverlay();
    }

    private drawCropOverlay(): void {
        if (!this.cropperContext) return;

        const canvas = this.cropperCanvas!;
        const ctx = this.cropperContext;

        // Crop area (square in center)
        const cropSize = Math.min(canvas.width, canvas.height) * 0.8;
        const cropX = (canvas.width - cropSize) / 2;
        const cropY = (canvas.height - cropSize) / 2;

        // Store crop area
        this.cropArea = { x: cropX, y: cropY, width: cropSize, height: cropSize };

        // Save the current state
        ctx.save();

        // Create overlay with semi-transparent dark area
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Clear the crop area to show the image underneath
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillRect(cropX, cropY, cropSize, cropSize);

        // Reset composite operation
        ctx.globalCompositeOperation = 'source-over';

        // Draw crop border with better visibility
        ctx.strokeStyle = '#1db954';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]); // Dashed line for better visibility
        ctx.strokeRect(cropX, cropY, cropSize, cropSize);

        // Add corner handles for better UX
        const handleSize = 8;
        ctx.fillStyle = '#1db954';

        // Corner handles
        const corners = [
            [cropX - handleSize / 2, cropY - handleSize / 2], // Top-left
            [cropX + cropSize - handleSize / 2, cropY - handleSize / 2], // Top-right
            [cropX - handleSize / 2, cropY + cropSize - handleSize / 2], // Bottom-left
            [cropX + cropSize - handleSize / 2, cropY + cropSize - handleSize / 2] // Bottom-right
        ];

        corners.forEach(([x, y]) => {
            ctx.fillRect(x, y, handleSize, handleSize);
        });

        // Add center lines for better alignment
        ctx.strokeStyle = 'rgba(29, 185, 84, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);

        // Vertical center line
        ctx.beginPath();
        ctx.moveTo(cropX + cropSize / 2, cropY);
        ctx.lineTo(cropX + cropSize / 2, cropY + cropSize);
        ctx.stroke();

        // Horizontal center line
        ctx.beginPath();
        ctx.moveTo(cropX, cropY + cropSize / 2);
        ctx.lineTo(cropX + cropSize, cropY + cropSize / 2);
        ctx.stroke();

        // Restore the context
        ctx.restore();
    }

    private addCropInteractions(canvas: HTMLCanvasElement): void {
        let isDragging = false;
        let lastX = 0;
        let lastY = 0;

        canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            const rect = canvas.getBoundingClientRect();
            lastX = e.clientX - rect.left;
            lastY = e.clientY - rect.top;
            canvas.style.cursor = 'grabbing';
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!isDragging || !this.originalImageData) return;

            const rect = canvas.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;

            const deltaX = currentX - lastX;
            const deltaY = currentY - lastY;

            this.originalImageData.offsetX += deltaX;
            this.originalImageData.offsetY += deltaY;

            this.drawCropperImage();

            lastX = currentX;
            lastY = currentY;
        });

        canvas.addEventListener('mouseup', () => {
            isDragging = false;
            canvas.style.cursor = 'move';
        });

        canvas.addEventListener('mouseleave', () => {
            isDragging = false;
            canvas.style.cursor = 'move';
        });

        // Add zoom with mouse wheel with better scaling
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (!this.originalImageData) return;

            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const oldScale = this.originalImageData.scale;
            const newScale = Math.max(0.1, Math.min(5, oldScale * zoomFactor));

            // Adjust offset to zoom towards mouse position
            const scaleChange = newScale / oldScale;
            this.originalImageData.offsetX = mouseX - (mouseX - this.originalImageData.offsetX) * scaleChange;
            this.originalImageData.offsetY = mouseY - (mouseY - this.originalImageData.offsetY) * scaleChange;
            this.originalImageData.scale = newScale;

            this.drawCropperImage();
        });

        // Set initial cursor
        canvas.style.cursor = 'move';
    }


    private applyCrop(): void {
        if (!this.cropperCanvas || !this.cropArea || !this.originalImageData) return;

        // Create final cropped image
        const finalCanvas = document.createElement('canvas');
        const finalCtx = finalCanvas.getContext('2d');
        if (!finalCtx) return;

        const cropSize = 300; // Final crop size
        finalCanvas.width = cropSize;
        finalCanvas.height = cropSize;

        // Instead of drawing from the canvas (which includes overlay), 
        // draw directly from the original image data
        const { img, scale, offsetX, offsetY } = this.originalImageData;

        // Calculate the actual image coordinates that correspond to the crop area
        const cropX = this.cropArea.x - offsetX;
        const cropY = this.cropArea.y - offsetY;
        const cropWidth = this.cropArea.width;
        const cropHeight = this.cropArea.height;

        // Calculate source coordinates on the original image
        const sourceX = cropX / scale;
        const sourceY = cropY / scale;
        const sourceWidth = cropWidth / scale;
        const sourceHeight = cropHeight / scale;

        // Make sure source coordinates are within image bounds
        const clampedSourceX = Math.max(0, Math.min(sourceX, img.width));
        const clampedSourceY = Math.max(0, Math.min(sourceY, img.height));
        const clampedSourceWidth = Math.min(sourceWidth, img.width - clampedSourceX);
        const clampedSourceHeight = Math.min(sourceHeight, img.height - clampedSourceY);

        // Draw the cropped portion directly from the original image
        finalCtx.drawImage(
            img,
            clampedSourceX, clampedSourceY, clampedSourceWidth, clampedSourceHeight,
            0, 0, cropSize, cropSize
        );

        // Convert to blob and update
        finalCanvas.toBlob((blob) => {
            if (blob) {
                // Revoke previous blob URL to prevent memory leaks
                if (this.playlist.coverArt && this.playlist.coverArt.startsWith('blob:')) {
                    URL.revokeObjectURL(this.playlist.coverArt);
                }

                const url = URL.createObjectURL(blob);

                // Update preview
                const preview = this.modal.querySelector('#coverPreview') as HTMLImageElement;
                if (preview) {
                    preview.src = url;
                }

                // Store the blob data
                this.playlist.coverArt = url;
                this.selectedCoverBlob = blob;

                console.log('✅ Cropped image applied successfully');
            }
        }, 'image/jpeg', 0.9);

        this.hideCropper();
    }

    private hideCropper(): void {
        const cropperSection = this.modal.querySelector('.cropper-section') as HTMLElement;
        if (cropperSection) {
            cropperSection.style.display = 'none';

            // Clear any existing instructions
            const instructions = cropperSection.querySelector('.cropper-instructions');
            if (instructions) {
                instructions.remove();
            }

            // Reset the cropper image
            const cropperImage = this.modal.querySelector('#cropperImage') as HTMLImageElement;
            if (cropperImage) {
                cropperImage.src = '';
                cropperImage.onload = null;
                cropperImage.onerror = null;
            }
        }

        // Clean up cropper canvas and context
        if (this.cropperCanvas) {
            this.cropperContext = null;
            this.cropperCanvas = null;
        }

        // Clear original image data
        this.originalImageData = null;
        this.cropArea = null;

        // Clean up any cropper instance
        if (this.cropperInstance) {
            try {
                this.cropperInstance.destroy();
            } catch (error) {
                console.log('Cropper instance already destroyed');
            }
            this.cropperInstance = null;
        }

        // Clear selected image file
        this.selectedImageFile = null;
    }

    private saveChanges(): void {
        const nameInput = this.modal.querySelector('#playlistName') as HTMLInputElement;
        const descriptionInput = this.modal.querySelector('#playlistDescription') as HTMLTextAreaElement;

        if (!nameInput.value.trim()) {
            alert('Please enter a playlist name');
            return;
        }

        // Update playlist data
        const updatedPlaylist: Playlist = {
            ...this.playlist,
            name: nameInput.value.trim(),
            description: descriptionInput.value.trim(),
            updatedAt: new Date()
        };

        // Save to service
        this.playlistService.updatePlaylist(updatedPlaylist.id, updatedPlaylist);

        console.log('💾 Playlist saved:', updatedPlaylist);

        this.hide();
        this.onSave(updatedPlaylist);
    }

    public hide(): void {
        console.log('🙈 Hiding playlist editor');

        // Hide the modal first
        this.modal.style.display = 'none';

        // Clean up cropper completely
        this.hideCropper();

        // Clean up any temporary blob URLs
        this.cleanupTempUrls();

        // Reset all state
        this.selectedImageFile = null;
        this.selectedCoverBlob = null;
        this.originalPlaylist = null;
    }
    private cleanupTempUrls(): void {
        // Clean up any temporary blob URLs created during editing
        if (this.selectedCoverBlob) {
            const tempUrl = URL.createObjectURL(this.selectedCoverBlob);
            URL.revokeObjectURL(tempUrl);
        }
    }


    public destroy(): void {
        this.hideCropper();
        if (this.modal.parentNode) {
            this.modal.parentNode.removeChild(this.modal);
        }
    }
}