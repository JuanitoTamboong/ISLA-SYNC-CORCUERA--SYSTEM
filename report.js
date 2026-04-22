// Report page functionality

// Remove sample image and setup real camera upload
document.addEventListener('DOMContentLoaded', function() {
    const uploadBox = document.querySelector('.upload-box');
    const previewDiv = document.querySelector('.preview');
    const uploadArea = document.querySelector('.upload-area');
    
    // Initially show only upload box, hide preview
    previewDiv.style.display = 'none';
    
    // Camera upload functionality
    uploadBox.addEventListener('click', function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';  // Use device camera
        input.onchange = function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewDiv.querySelector('img').src = e.target.result;
                    previewDiv.querySelector('.remove').onclick = function() {
                        previewDiv.style.display = 'none';
                        uploadArea.insertBefore(uploadBox, previewDiv);
                    };
                    previewDiv.style.display = 'block';
                    uploadArea.appendChild(previewDiv);
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    });
    
    // Category selection
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', function() {
            document.querySelector('.card.active').classList.remove('active');
            this.classList.add('active');
        });
    });
    
    // Back button
    document.querySelector('.header i').addEventListener('click', function() {
        window.history.back();
    });
    
    // Submit (placeholder)
    document.querySelector('.submit').addEventListener('click', function() {
        alert('Report submitted! (Connect to backend)');
    });
    
    // Change location
    document.querySelector('.change').addEventListener('click', function() {
        alert('Location picker coming soon');
    });
});

