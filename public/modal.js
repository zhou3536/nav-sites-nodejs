export function initBookmarkModal({ apiFetch, showToast, onSaved }) {
    let editingId = null; // null = add mode, string = edit mode
    let cropperInstance = null;
    let iconObjectUrl = null;

    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalName = document.getElementById('modal-name');
    const modalUrl = document.getElementById('modal-url');
    const uploadIcon = document.getElementById('uploadIcon');
    const manualIconSection = document.getElementById('manual-icon-section');
    const iconFileInput = document.getElementById('modal-icon-file');
    const iconPickBtn = document.getElementById('modal-icon-pick');
    const cropperWorkspace = document.getElementById('cropper-workspace');
    const cropperImg = document.getElementById('cropper-img');
    const cropperPreview = document.getElementById('cropper-preview');
    const cancelBtn = document.getElementById('modal-cancel');
    const saveBtn = document.getElementById('modal-save');

    function destroyCropper() {
        if (cropperInstance) {
            cropperInstance.destroy();
            cropperInstance = null;
        }
        if (iconObjectUrl) {
            URL.revokeObjectURL(iconObjectUrl);
            iconObjectUrl = null;
        }
        cropperImg.removeAttribute('src');
        cropperPreview.innerHTML = '';
        cropperWorkspace.classList.remove('active');
    }

    function resetIconUploader() {
        uploadIcon.checked = false;
        manualIconSection.classList.remove('open');
        iconFileInput.value = '';
        destroyCropper();
    }

    function openModal() {
        resetIconUploader();
        modalOverlay.classList.add('show');
        setTimeout(() => modalName.focus(), 50);
    }

    function closeModal() {
        modalOverlay.classList.remove('show');
        resetIconUploader();
        editingId = null;
    }

    function openAddModal() {
        editingId = null;
        modalTitle.textContent = '添加网站';
        modalName.value = '';
        modalUrl.value = 'https://';
        openModal();
    }

    function openEditModal(bm) {
        if (!bm) return;
        editingId = bm.id;
        modalTitle.textContent = '编辑网站';
        modalName.value = bm.name;
        modalUrl.value = bm.url;
        openModal();
    }

    uploadIcon.addEventListener('change', () => {
        manualIconSection.classList.toggle('open', uploadIcon.checked);
    });

    iconPickBtn.addEventListener('click', () => {
        iconFileInput.value = '';
        iconFileInput.click();
    });

    iconFileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast('请选择图片文件');
            iconFileInput.value = '';
            return;
        }

        destroyCropper();
        iconObjectUrl = URL.createObjectURL(file);
        cropperWorkspace.classList.add('active');
        cropperImg.onload = () => {
            cropperImg.onload = null;
            cropperInstance = new window.Cropper(cropperImg, {
                aspectRatio: 1,
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 1,
                minContainerWidth: 120,
                minContainerHeight: 120,
                preview: '#cropper-preview',
                guides: true,
                center: true,
                highlight: true,
                background: true,
                cropBoxMovable: true,
                cropBoxResizable: true,
            });
        };
        cropperImg.src = iconObjectUrl;
    });

    cancelBtn.addEventListener('click', closeModal);

    saveBtn.addEventListener('click', async () => {
        const name = modalName.value.trim();
        let url = modalUrl.value.trim();

        if (!name || !url) {
            showToast('请填写名称和网址');
            return;
        }

        let icon = '';
        if (uploadIcon.checked) {
            if (!cropperInstance) {
                showToast('请选择并裁剪图标图片');
                return;
            }
            const canvas = cropperInstance.getCroppedCanvas({
                width: 128,
                height: 128,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high',
            });
            if (!canvas) {
                showToast('图标裁剪失败');
                return;
            }
            icon = canvas.toDataURL('image/png');
        }

        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

        saveBtn.disabled = true;
        try {
            const body = { id: editingId || '', name, url, icon };
            const res = await apiFetch('/bookmark', {
                method: 'POST',
                body,
            });
            showToast('已更新');
            onSaved(res);
            closeModal();
        } catch (e) {
            console.log(e);
            showToast('保存失败');
        } finally {
            saveBtn.disabled = false;
        }
    });

    [modalName, modalUrl].forEach((input) => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') saveBtn.click();
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    return { openAddModal, openEditModal, closeModal };
}
