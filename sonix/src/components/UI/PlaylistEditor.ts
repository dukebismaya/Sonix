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
    private selectedImageFile: File | null = null;

    // Enhanced state management
    private cropperCanvas: HTMLCanvasElement | null = null;
    private cropperContext: CanvasRenderingContext2D | null = null;
    private originalImageData: any = null;
    private cropArea: any = null;
    private selectedCoverBlob: Blob | null = null;
    private originalPlaylist: Playlist | null = null;
    private pendingCoverArt: string | null = null;
    private pendingCoverBlob: Blob | null = null;
    private hasUnsavedCropChanges: boolean = false;
    private currentSavedCover: string | null = null;

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
        // Create deep copies to avoid reference issues
        this.playlist = JSON.parse(JSON.stringify(options.playlist));
        this.originalPlaylist = JSON.parse(JSON.stringify(options.playlist));
        this.onSave = options.onSave;
        this.onCancel = options.onCancel;

        // Reset state
        this.pendingCoverArt = null;
        this.pendingCoverBlob = null;
        this.hasUnsavedCropChanges = false;
        this.selectedImageFile = null;
        this.selectedCoverBlob = null;

        // Track the current saved cover (what's actually saved in the playlist)
        this.currentSavedCover = this.playlist.coverArt || null;

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
                                        <div class="cover-actions">
                                            <button class="change-cover-btn" type="button" title="Upload new image">
                                                <svg viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                                    <polyline points="7,10 12,15 17,10"/>
                                                    <line x1="12" y1="15" x2="12" y2="3"/>
                                                </svg>
                                                <span>Upload New</span>
                                            </button>
                                            <button class="resize-cover-btn" type="button" title="Resize current image">
                                                <svg viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                                                </svg>
                                                <span>Resize</span>
                                            </button>
                                        </div>
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
        const resizeCoverBtn = this.modal.querySelector('.resize-cover-btn') as HTMLButtonElement;
        const saveBtn = this.modal.querySelector('.save-btn') as HTMLButtonElement;
        const cancelBtn = this.modal.querySelector('.cancel-btn') as HTMLButtonElement;
        const closeBtn = this.modal.querySelector('.close-modal-btn') as HTMLButtonElement;

        // Upload new cover button
        changeCoverBtn?.addEventListener('click', () => {
            console.log('🖼️ Upload new cover button clicked');
            fileInput?.click();
        });

        // Resize existing cover button
        resizeCoverBtn?.addEventListener('click', () => {
            console.log('🔧 Resize cover button clicked');
            this.resizeExistingCover();
        });

        // File input change - for new uploads
        fileInput?.addEventListener('change', (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file && file.type.startsWith('image/')) {
                console.log('📁 New image selected:', file.name);

                // Store the selected file
                this.selectedImageFile = file;

                // Show cropper immediately
                this.showCropper(file);
            } else if (file) {
                alert('Please select a valid image file');
            }

            // Clear the file input to allow selecting the same file again
            (e.target as HTMLInputElement).value = '';
        });

        // Modal controls
        saveBtn?.addEventListener('click', () => {
            console.log('💾 Save button clicked');
            this.saveChanges();
        });

        cancelBtn?.addEventListener('click', () => {
            console.log('❌ Cancel button clicked');
            this.cancelChanges();
        });

        closeBtn?.addEventListener('click', () => {
            console.log('❌ Close button clicked');
            this.cancelChanges();
        });

        // Close on backdrop click
        this.modal.querySelector('.modal-backdrop')?.addEventListener('click', (e) => {
            if (e.target === this.modal.querySelector('.modal-backdrop')) {
                console.log('🖱️ Clicked outside modal, closing');
                this.cancelChanges();
            }
        });
    }

    private resizeExistingCover(): void {
        console.log('🔧 Starting resize of existing cover');

        const currentCover = this.modal.querySelector('#coverPreview') as HTMLImageElement;
        if (!currentCover || !currentCover.src) {
            console.log('❌ No current cover to resize');
            alert('No cover image to resize');
            return;
        }

        // Check if it's a default image
        if (currentCover.src.includes('default-playlist')) {
            console.log('❌ Cannot resize default image');
            alert('Cannot resize the default playlist image. Please upload a custom image first.');
            return;
        }

        try {
            // Convert current image to a data URL and show in cropper
            this.loadImageForResize(currentCover.src);
        } catch (error) {
            console.error('❌ Error preparing image for resize:', error);
            alert('Error loading image for resize');
        }
    }
    private loadImageForResize(imageSrc: string): void {
        console.log('📸 Loading image for resize:', imageSrc);

        // Create a temporary image to load the current cover
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Handle CORS if needed

        img.onload = () => {
            // Convert image to canvas and then to data URL
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error('❌ Could not get canvas context');
                return;
            }

            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            try {
                const dataURL = canvas.toDataURL('image/jpeg', 0.9);
                this.setupCropperWithImage(dataURL);
                console.log('✅ Image loaded for resize');
            } catch (error) {
                console.error('❌ Error converting image to data URL:', error);
                // Fallback: try to use the image source directly
                this.setupCropperWithImage(imageSrc);
            }
        };

        img.onerror = (error) => {
            console.error('❌ Error loading image for resize:', error);
            // Try to use the source directly as fallback
            try {
                this.setupCropperWithImage(imageSrc);
            } catch (fallbackError) {
                console.error('❌ Fallback also failed:', fallbackError);
                alert('Could not load image for resizing');
            }
        };

        img.src = imageSrc;
    }

    private showCropper(file: File): void {
        console.log('🎨 Setting up cropper for:', file.name);

        const reader = new FileReader();
        reader.onload = (e) => {
            // Check if the modal still exists and is visible
            if (!this.modal || this.modal.style.display === 'none') {
                console.log('🚫 Modal closed, cancelling image load');
                return;
            }

            try {
                const imageData = e.target?.result as string;
                this.setupCropperWithImage(imageData);
            } catch (error) {
                console.error('❌ Error setting up cropper:', error);
            }
        };

        reader.onerror = (error) => {
            console.error('❌ Error reading file:', error);
        };

        reader.readAsDataURL(file);
    }
    private setupCropperWithImage(imageData: string): void {
        console.log('🖼️ Setting up cropper with image data');

        // Get or create the cropper section
        let cropperSection = this.modal.querySelector('.cropper-section') as HTMLElement;
        if (!cropperSection) {
            console.error('❌ Cropper section not found');
            return;
        }

        // Clean existing cropper content
        this.cleanupCropperCanvas();

        // Create new cropper container
        const cropperContainer = document.createElement('div');
        cropperContainer.className = 'cropper-container';

        // Create the image element
        const cropperImage = document.createElement('img');
        cropperImage.id = 'cropperImage';
        cropperImage.src = imageData;
        cropperImage.style.maxWidth = '100%';

        // Clear the cropper section and add new content
        cropperSection.innerHTML = '';

        // Add instructions - different for resize vs new upload
        const instructions = document.createElement('div');
        instructions.className = 'cropper-instructions';

        const isResizing = !this.selectedImageFile; // If no new file selected, we're resizing existing
        instructions.innerHTML = `
        <p><strong>${isResizing ? 'Resize Mode' : 'New Image'}</strong></p>
        <p><strong>Drag</strong> to move the image • <strong>Scroll</strong> to zoom in/out</p>
        <p>Adjust the image to fit within the green square</p>
    `;

        // Add controls with "Change Image" option
        const controls = document.createElement('div');
        controls.className = 'cropper-controls';
        controls.innerHTML = `
        ${isResizing ? '' : `
        <button class="btn-secondary change-image-btn" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Change Image
        </button>`}
        <button class="btn-secondary cancel-crop-btn" type="button">Cancel</button>
        <button class="btn-primary apply-crop-btn" type="button">${isResizing ? 'Apply Resize' : 'Apply Crop'}</button>
    `;

        // Assemble the cropper section
        cropperSection.appendChild(instructions);
        cropperSection.appendChild(cropperContainer);
        cropperSection.appendChild(controls);
        cropperContainer.appendChild(cropperImage);

        // Show the cropper section
        cropperSection.style.display = 'block';

        // Initialize the functional cropper
        this.initializeCropper(cropperImage);

        // Re-attach event listeners for the new buttons
        this.attachCropperControls();

        console.log(`✅ Cropper setup complete for ${isResizing ? 'resize' : 'new image'}`);
    }

    private cleanupCropperCanvas(): void {
        // Clean up existing canvas and context
        if (this.cropperCanvas) {
            // Remove keyboard listener if attached
            if ((this.cropperCanvas as any)._keyHandler) {
                document.removeEventListener('keydown', (this.cropperCanvas as any)._keyHandler);
            }

            const wrapper = this.cropperCanvas.parentElement;
            if (wrapper && wrapper.classList.contains('cropper-wrapper')) {
                wrapper.remove();
            }
            this.cropperCanvas = null;
            this.cropperContext = null;
        }

        // Clear original image data
        this.originalImageData = null;
        this.cropArea = null;
    }

    private attachCropperControls(): void {
        // Get the file input from the main modal
        const fileInput = this.modal.querySelector('#coverFileInput') as HTMLInputElement;

        // Attach change image button
        const changeImageBtn = this.modal.querySelector('.change-image-btn');
        changeImageBtn?.addEventListener('click', () => {
            console.log('🔄 Change image button clicked');
            fileInput?.click();
        });

        // Attach cancel button - use enhanced cancel method
        const cancelBtn = this.modal.querySelector('.cancel-crop-btn');
        cancelBtn?.addEventListener('click', () => {
            console.log('❌ Crop cancelled');
            this.cancelCrop();
        });

        // Attach apply button
        const applyBtn = this.modal.querySelector('.apply-crop-btn');
        applyBtn?.addEventListener('click', () => {
            console.log('✅ Applying crop');
            this.applyCrop();
        });
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

        // Mouse interactions
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

        // Zoom with mouse wheel
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

        // Keyboard shortcuts
        const handleKeyPress = (e: KeyboardEvent) => {
            if (!this.originalImageData) return;

            const moveStep = 5;
            const zoomStep = 0.1;
            let needsRedraw = false;

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    this.originalImageData.offsetY += moveStep;
                    needsRedraw = true;
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.originalImageData.offsetY -= moveStep;
                    needsRedraw = true;
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.originalImageData.offsetX += moveStep;
                    needsRedraw = true;
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.originalImageData.offsetX -= moveStep;
                    needsRedraw = true;
                    break;
                case '+':
                case '=':
                    e.preventDefault();
                    this.originalImageData.scale = Math.min(5, this.originalImageData.scale + zoomStep);
                    needsRedraw = true;
                    break;
                case '-':
                    e.preventDefault();
                    this.originalImageData.scale = Math.max(0.1, this.originalImageData.scale - zoomStep);
                    needsRedraw = true;
                    break;
            }

            if (needsRedraw) {
                this.drawCropperImage();
            }
        };

        // Add keyboard listener
        document.addEventListener('keydown', handleKeyPress);

        // Store reference to remove later
        canvas.dataset.keyHandler = 'attached';
        (canvas as any)._keyHandler = handleKeyPress;

        // Set initial cursor
        canvas.style.cursor = 'move';
    }


    private applyCrop(): void {
        if (!this.cropperCanvas || !this.cropArea || !this.originalImageData) return;

        console.log('🎨 Applying crop/resize...');

        // Create final cropped image
        const finalCanvas = document.createElement('canvas');
        const finalCtx = finalCanvas.getContext('2d');
        if (!finalCtx) return;

        const cropSize = 300; // Final crop size
        finalCanvas.width = cropSize;
        finalCanvas.height = cropSize;

        // Draw directly from the original image data
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

        // Convert to blob and update immediately
        finalCanvas.toBlob((blob) => {
            if (blob) {
                // Clean up previous pending cover art if it exists
                if (this.pendingCoverArt && this.pendingCoverArt.startsWith('blob:')) {
                    URL.revokeObjectURL(this.pendingCoverArt);
                }

                const url = URL.createObjectURL(blob);

                // Store as pending changes (don't modify playlist until save)
                this.pendingCoverArt = url;
                this.pendingCoverBlob = blob;
                this.hasUnsavedCropChanges = true;

                // Update preview immediately
                const preview = this.modal.querySelector('#coverPreview') as HTMLImageElement;
                if (preview) {
                    preview.src = url;
                }

                console.log('✅ Crop applied to preview - ready to save');

                // Show visual feedback that changes are pending
                this.showPendingChangesIndicator();
            }
        }, 'image/jpeg', 0.9);

        this.hideCropper();
    }

    private showPendingChangesIndicator(): void {
        const saveBtn = this.modal.querySelector('.save-btn') as HTMLButtonElement;
        if (saveBtn) {
            saveBtn.innerHTML = '💾 Save Changes *';
            saveBtn.style.background = '#ff9500';
            saveBtn.title = 'You have unsaved image changes';
            saveBtn.classList.add('has-pending-changes');
        }
    }
    private hidePendingChangesIndicator(): void {
        const saveBtn = this.modal.querySelector('.save-btn') as HTMLButtonElement;
        if (saveBtn) {
            saveBtn.innerHTML = '💾 Save Changes';
            saveBtn.style.background = '';
            saveBtn.title = '';
            saveBtn.classList.remove('has-pending-changes');
        }
    }


    private hideCropper(): void {
        console.log('🙈 Hiding cropper');

        const cropperSection = this.modal.querySelector('.cropper-section') as HTMLElement;
        if (cropperSection) {
            cropperSection.style.display = 'none';
        }

        // Clean up canvas and context
        this.cleanupCropperCanvas();

        // Don't clear selectedImageFile here - keep it for state management

        console.log('✅ Cropper hidden and cleaned up');
    }

    private cancelCrop(): void {
        console.log('❌ Cancelling crop operation');

        // Reset preview to the correct state
        const preview = this.modal.querySelector('#coverPreview') as HTMLImageElement;
        if (preview) {
            // Use the current saved cover (what was last saved, not the original)
            const coverToRevertTo = this.currentSavedCover || '/assets/images/default-playlist.jpg';
            preview.src = coverToRevertTo;
            console.log('🔄 Reverted preview to current saved cover:', coverToRevertTo);
        }

        // Clean up pending changes
        if (this.pendingCoverArt && this.pendingCoverArt.startsWith('blob:')) {
            URL.revokeObjectURL(this.pendingCoverArt);
        }

        // Reset pending state
        this.pendingCoverArt = null;
        this.pendingCoverBlob = null;
        this.hasUnsavedCropChanges = false;

        // Clear the selected file since user cancelled
        this.selectedImageFile = null;

        // Hide pending changes indicator
        this.hidePendingChangesIndicator();

        this.hideCropper();
    }

    private saveChanges(): void {
        const nameInput = this.modal.querySelector('#playlistName') as HTMLInputElement;
        const descriptionInput = this.modal.querySelector('#playlistDescription') as HTMLTextAreaElement;

        if (!nameInput.value.trim()) {
            alert('Please enter a playlist name');
            return;
        }

        console.log('💾 Saving playlist changes...');

        // Create updated playlist
        const updatedPlaylist: Playlist = {
            ...this.playlist,
            name: nameInput.value.trim(),
            description: descriptionInput.value.trim(),
            updatedAt: new Date()
        };

        // Apply pending cover art changes if any
        if (this.pendingCoverArt && this.pendingCoverBlob) {
            // Clean up old cover art if it was a blob
            if (updatedPlaylist.coverArt && updatedPlaylist.coverArt.startsWith('blob:')) {
                URL.revokeObjectURL(updatedPlaylist.coverArt);
            }

            updatedPlaylist.coverArt = this.pendingCoverArt;

            // Update the current saved cover to the new one
            this.currentSavedCover = this.pendingCoverArt;

            console.log('✅ Applied cropped cover art to playlist');
        }

        // Save to service
        this.playlistService.updatePlaylist(updatedPlaylist.id, updatedPlaylist);

        console.log('💾 Playlist saved successfully:', updatedPlaylist);

        // Clean up
        this.cleanupOnSave();

        // Hide pending changes indicator
        this.hidePendingChangesIndicator();

        this.hide();
        this.onSave(updatedPlaylist);
    }

    private cleanupOnSave(): void {
        // Don't revoke the cover art URL since it's now being used by the playlist
        // Only clean up temporary resources
        this.selectedImageFile = null;
        this.hasUnsavedCropChanges = false;

        // Clean up any old blob URLs that aren't being used
        if (this.selectedCoverBlob && this.selectedCoverBlob !== this.pendingCoverBlob) {
            const tempUrl = URL.createObjectURL(this.selectedCoverBlob);
            URL.revokeObjectURL(tempUrl);
        }
    }
    private cancelChanges(): void {
        console.log('❌ Cancelling playlist changes...');

        // Check if there are unsaved changes
        const nameInput = this.modal.querySelector('#playlistName') as HTMLInputElement;
        const descriptionInput = this.modal.querySelector('#playlistDescription') as HTMLTextAreaElement;

        const hasTextChanges = nameInput.value.trim() !== this.originalPlaylist?.name ||
            descriptionInput.value.trim() !== (this.originalPlaylist?.description || '');

        if (this.hasUnsavedCropChanges || hasTextChanges) {
            const confirmCancel = confirm('You have unsaved changes. Are you sure you want to cancel?');
            if (!confirmCancel) {
                return;
            }
        }

        // Clean up any pending changes
        if (this.pendingCoverArt && this.pendingCoverArt.startsWith('blob:')) {
            URL.revokeObjectURL(this.pendingCoverArt);
        }

        if (this.pendingCoverBlob) {
            const tempUrl = URL.createObjectURL(this.pendingCoverBlob);
            URL.revokeObjectURL(tempUrl);
        }

        // Reset playlist to original state ONLY if we're cancelling the entire editor
        // Don't modify the playlist object here - that's handled by the onCancel callback

        this.hide();
        this.onCancel();
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