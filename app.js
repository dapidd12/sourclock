// ==================== VARIABEL GLOBAL ====================
let supabaseClient = null; // GANTI NAMA VARIABEL
let currentTheme = 'light';
let encryptionResult = null;
let encryptedFileData = null;
let encryptedFileName = null;
let cloudConnected = false;
let progressInterval = null;

// ==================== INISIALISASI APLIKASI ====================
document.addEventListener('DOMContentLoaded', async () => {
    console.log(`${AppConfig.APP.NAME} v${AppConfig.APP.VERSION} - Initializing...`);
    
    // Load konfigurasi tema
    loadTheme();
    
    // Inisialisasi Supabase
    await initializeSupabase();
    
    // Inisialisasi tooltips
    initializeTooltips();
    
    // Tampilkan panduan selamat datang
    setTimeout(() => {
        if (!localStorage.getItem(AppConfig.STORAGE_KEYS.GUIDE_SHOWN)) {
            showGuide();
            localStorage.setItem(AppConfig.STORAGE_KEYS.GUIDE_SHOWN, 'true');
        }
    }, 1000);
    
    // Inisialisasi indikator kekuatan kunci untuk teks
    document.getElementById('encryption-key').addEventListener('input', updateKeyStrength);
    
    // Inisialisasi indikator kekuatan kunci untuk file
    document.getElementById('file-key').addEventListener('input', updateFileKeyStrength);
    
    // Fix: Tab handling in textarea
    fixTextareaTab();
    
    // Event listener untuk refresh cloud
    document.getElementById('refresh-cloud-btn').addEventListener('click', () => {
        if (cloudConnected) {
            loadCloudData();
            showToast('Cloud data refreshed', 'success');
        } else {
            showToast('Cloud not connected', 'error');
        }
    });
});

// ==================== FIX: HANDLING TAB IN TEXTAREA ====================
function fixTextareaTab() {
    document.querySelectorAll('textarea').forEach(textarea => {
        textarea.addEventListener('keydown', function(e) {
            if (e.key === 'Tab') {
                e.preventDefault();
                
                const start = this.selectionStart;
                const end = this.selectionEnd;
                
                // Insert 4 spaces at cursor position
                this.value = this.value.substring(0, start) + '    ' + this.value.substring(end);
                
                // Move cursor to after the inserted spaces
                this.selectionStart = this.selectionEnd = start + 4;
            }
        });
    });
}

// ==================== INTEGRASI SUPABASE ====================
async function initializeSupabase() {
    const config = AppConfig.getSupabaseConfig();
    
    try {
        // Cek apakah library Supabase tersedia
        if (typeof window.supabase === 'undefined') {
            throw new Error('Supabase library not loaded');
        }
        
        // Gunakan service role key untuk bypass policy
        supabaseClient = window.supabase.createClient(config.url, config.serviceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false
            }
        });
        
        // Test koneksi dengan query sederhana
        const { data, error } = await supabaseClient
            .from(config.table)
            .select('id')
            .limit(1);
        
        if (error) {
            console.warn('Supabase connection test error:', error.message);
            // Coba buat tabel jika belum ada
            if (error.message.includes('does not exist')) {
                await createTablesIfNotExist();
            } else {
                throw error;
            }
        }
        
        cloudConnected = true;
        updateCloudStatus(true);
        showToast('Connected to Supabase Cloud!', 'success');
        
        // Load data cloud
        loadCloudData();
        
    } catch (error) {
        console.error('Supabase connection failed:', error);
        cloudConnected = false;
        updateCloudStatus(false);
        showToast('Cloud connection failed. Working offline.', 'warning');
    }
}

// Fungsi untuk membuat tabel jika belum ada
async function createTablesIfNotExist() {
    try {
        const config = AppConfig.getSupabaseConfig();
        
        // Coba buat tabel files
        const { error: tableError } = await supabaseClient.rpc('create_encrypted_files_table');
        
        if (tableError) {
            console.log('Tabel files belum ada, akan dibuat secara manual...');
            // Tabel akan dibuat otomatis melalui SQL di Supabase dashboard
        }
        
        // Coba buat tabel keys
        const { error: keyError } = await supabaseClient.rpc('create_encryption_keys_table');
        
        if (keyError) {
            console.log('Tabel keys belum ada, akan dibuat secara manual...');
            // Tabel akan dibuat otomatis melalui SQL di Supabase dashboard
        }
        
        showToast('Database tables initialized', 'info');
        
    } catch (error) {
        console.log('Table creation might need manual setup in Supabase dashboard');
    }
}

function updateCloudStatus(connected) {
    const statusElement = document.getElementById('cloud-status');
    if (connected) {
        statusElement.innerHTML = '<i class="fas fa-cloud"></i><span>Connected to Supabase Cloud</span>';
        statusElement.classList.add('connected');
        statusElement.classList.remove('disconnected');
    } else {
        statusElement.innerHTML = '<i class="fas fa-cloud-slash"></i><span>Offline Mode</span>';
        statusElement.classList.add('disconnected');
        statusElement.classList.remove('connected');
    }
}

async function loadCloudData() {
    if (!cloudConnected || !supabaseClient) return;
    
    const config = AppConfig.getSupabaseConfig();
    
    try {
        const { data, error } = await supabaseClient
            .from(config.table)
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        displayCloudData(data);
        
    } catch (error) {
        console.error('Error loading cloud data:', error);
        document.getElementById('storage-items').innerHTML = 
            '<p style="text-align: center; color: var(--danger);">Failed to load cloud data</p>';
    }
}

function displayCloudData(data) {
    const container = document.getElementById('storage-items');
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray);">Tidak ada data di cloud.</p>';
        return;
    }
    
    container.innerHTML = data.map(item => `
        <div class="storage-item">
            <div class="storage-item-header">
                <div class="storage-item-name">
                    <i class="fas fa-file"></i> ${item.file_name || 'Encrypted Data'}
                </div>
                <div>
                    <button class="download-cloud-btn" data-id="${item.id}" data-method="${item.encryption_method}">
                        <i class="fas fa-download"></i> Download
                    </button>
                </div>
            </div>
            <div class="storage-item-meta">
                <div><strong>Metode:</strong> ${item.encryption_method}</div>
                <div><strong>Ukuran:</strong> ${AppConfig.formatBytes(item.file_size)}</div>
                <div><strong>Tanggal:</strong> ${new Date(item.created_at).toLocaleDateString()}</div>
                <div><strong>Deskripsi:</strong> ${item.description || 'Tidak ada deskripsi'}</div>
                <div style="margin-top: 10px; color: var(--warning); font-size: 0.9rem;">
                    <i class="fas fa-info-circle"></i> File ini terenkripsi. Dibutuhkan kunci untuk dekripsi.
                </div>
            </div>
        </div>
    `).join('');
    
    // Tambahkan event listener ke tombol download
    document.querySelectorAll('.download-cloud-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            const method = btn.getAttribute('data-method');
            await downloadFromCloud(id, method);
        });
    });
}

// Simpan data terenkripsi dan kunci ke database
async function saveToCloud(encryptedData, metadata, encryptionKey) {
    if (!cloudConnected || !supabaseClient) {
        showToast('Cloud not connected', 'error');
        return false;
    }
    
    const config = AppConfig.getSupabaseConfig();
    
    try {
        // Enkripsi kunci sebelum disimpan
        const encryptedKey = await AppConfig.encryptKey(encryptionKey);
        if (!encryptedKey) {
            throw new Error('Failed to encrypt key');
        }
        
        // Simpan file terenkripsi
        const { data: fileData, error: fileError } = await supabaseClient
            .from(config.table)
            .insert([{
                file_name: metadata.fileName || 'encrypted_data.txt',
                encryption_method: metadata.method,
                encrypted_data: encryptedData,
                file_size: encryptedData.length,
                description: metadata.description || 'Encrypted file',
                created_at: new Date().toISOString()
            }])
            .select();
        
        if (fileError) throw fileError;
        
        // Simpan kunci terenkripsi dengan referensi ke file
        if (fileData && fileData[0]) {
            const { error: keyError } = await supabaseClient
                .from(config.keysTable)
                .insert([{
                    file_id: fileData[0].id,
                    encrypted_key: encryptedKey,
                    created_at: new Date().toISOString()
                }]);
            
            if (keyError) throw keyError;
        }
        
        showToast('Data dan kunci berhasil disimpan ke cloud!', 'success');
        loadCloudData();
        return true;
        
    } catch (error) {
        console.error('Error saving to cloud:', error);
        showToast('Failed to save to cloud: ' + error.message, 'error');
        return false;
    }
}

// Download dan coba dekripsi file dari cloud dengan UI yang lebih baik
async function downloadFromCloud(id, method) {
    if (!cloudConnected || !supabaseClient) {
        showToast('Cloud not connected', 'error');
        return;
    }
    
    const config = AppConfig.getSupabaseConfig();
    
    try {
        // Ambil data file
        const { data: fileData, error: fileError } = await supabaseClient
            .from(config.table)
            .select('*')
            .eq('id', id)
            .single();
        
        if (fileError) throw fileError;
        
        // Tampilkan modal untuk memasukkan kunci
        showCloudDecryptionModal(fileData);
        
    } catch (error) {
        console.error('Error downloading from cloud:', error);
        showToast('Failed to load from cloud: ' + error.message, 'error');
    }
}

// Modal untuk memasukkan kunci dekripsi dari cloud
function showCloudDecryptionModal(fileData) {
    // Hapus modal sebelumnya jika ada
    const existingModal = document.getElementById('cloud-decrypt-modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'cloud-decrypt-modal';
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
        <div class="modal" style="max-width: 500px;">
            <div class="modal-header">
                <h2><i class="fas fa-key"></i> Masukkan Kunci Dekripsi</h2>
                <button class="close-modal" id="close-cloud-modal">&times;</button>
            </div>
            <div class="modal-content">
                <div class="file-info" style="margin-bottom: 20px; padding: 15px; background: var(--light); border-radius: 10px;">
                    <h4><i class="fas fa-file"></i> ${fileData.file_name}</h4>
                    <p><strong>Metode:</strong> ${fileData.encryption_method}</p>
                    <p><strong>Ukuran:</strong> ${AppConfig.formatBytes(fileData.file_size)}</p>
                    <p><strong>Deskripsi:</strong> ${fileData.description || 'Tidak ada'}</p>
                </div>
                
                <div class="input-group" style="margin-bottom: 20px;">
                    <label for="cloud-decrypt-key"><i class="fas fa-lock"></i> Kunci Dekripsi:</label>
                    <input type="password" id="cloud-decrypt-key" placeholder="Masukkan kunci untuk mendekripsi" style="width: 100%;">
                    <small style="color: var(--warning); display: block; margin-top: 5px;">
                        <i class="fas fa-exclamation-triangle"></i> Base64 juga membutuhkan kunci untuk dekripsi
                    </small>
                </div>
                
                <div class="modal-actions">
                    <button class="modal-btn decrypt-btn" id="cloud-decrypt-confirm">
                        <i class="fas fa-unlock"></i> Dekripsi
                    </button>
                    <button class="modal-btn close-btn" id="cloud-decrypt-cancel">
                        <i class="fas fa-times"></i> Batal
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    document.getElementById('close-cloud-modal').addEventListener('click', () => {
        modal.remove();
    });
    
    document.getElementById('cloud-decrypt-cancel').addEventListener('click', () => {
        modal.remove();
    });
    
    document.getElementById('cloud-decrypt-confirm').addEventListener('click', async () => {
        const key = document.getElementById('cloud-decrypt-key').value;
        if (!key && fileData.encryption_method.toLowerCase() !== 'base64') {
            showToast('Masukkan kunci dekripsi', 'error');
            return;
        }
        
        modal.remove();
        await attemptCloudDecryption(fileData.encrypted_data, key, fileData.encryption_method, fileData.file_name);
    });
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Dekripsi data dari cloud dengan validasi yang ketat
async function attemptCloudDecryption(encryptedData, key, method, fileName) {
    showLoading('Mendekripsi file dari cloud...');
    
    try {
        // Validasi kunci untuk semua metode kecuali Base64 khusus
        const methodLower = method.toLowerCase();
        if (methodLower !== 'base64' || AppConfig.hasBase64Protection(encryptedData)) {
            const keyError = AppConfig.validateKeyForMethod(key, methodLower);
            if (keyError) {
                throw new Error(keyError);
            }
        }
        
        let decryptedData;
        
        switch(methodLower) {
            case 'aes':
                decryptedData = await secureAesDecrypt(encryptedData, key);
                break;
            case 'base64':
                if (AppConfig.hasBase64Protection(encryptedData)) {
                    // Base64 dengan proteksi
                    decryptedData = AppConfig.secureBase64Decode(encryptedData, key);
                    if (!decryptedData) {
                        throw new Error('Dekripsi Base64 gagal - kunci salah');
                    }
                } else {
                    // Base64 tanpa proteksi (legacy)
                    decryptedData = secureBase64Decode(encryptedData);
                    showToast('Base64 tanpa proteksi - hati-hati dengan data sensitif', 'warning');
                }
                break;
            case 'xor':
                decryptedData = await secureXorDecrypt(encryptedData, key);
                break;
            case 'caesar':
                decryptedData = await secureCaesarDecrypt(encryptedData, key);
                break;
            case 'vigenere':
                decryptedData = await secureVigenereDecrypt(encryptedData, key);
                break;
            default:
                throw new Error('Metode enkripsi tidak dikenali');
        }
        
        if (!decryptedData) {
            throw new Error('Dekripsi gagal - kunci salah atau data rusak');
        }
        
        hideLoading();
        
        // Tampilkan hasil dekripsi
        encryptionResult = {
            method: method,
            dataType: 'File dari Cloud',
            fileName: fileName,
            originalSize: AppConfig.formatBytes(encryptedData.length),
            decryptedSize: AppConfig.formatBytes(new Blob([decryptedData]).size),
            processTime: '0.5s',
            preview: decryptedData.substring(0, 300) + (decryptedData.length > 300 ? '...' : ''),
            fullResult: decryptedData,
            isDecryption: true
        };
        
        showResultModal();
        showToast('Dekripsi berhasil!', 'success');
        
    } catch (error) {
        hideLoading();
        showToast('Dekripsi gagal: ' + error.message, 'error');
    }
}

// ==================== FUNGSI TOGGLE TEMA ====================
function loadTheme() {
    const savedTheme = localStorage.getItem(AppConfig.STORAGE_KEYS.THEME);
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-sun"></i><span>Mode Terang</span>';
        currentTheme = 'dark';
    } else {
        currentTheme = 'light';
    }
}

document.getElementById('theme-toggle').addEventListener('click', () => {
    if (currentTheme === 'light') {
        document.body.classList.add('dark-mode');
        document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-sun"></i><span>Mode Terang</span>';
        currentTheme = 'dark';
        localStorage.setItem(AppConfig.STORAGE_KEYS.THEME, 'dark');
    } else {
        document.body.classList.remove('dark-mode');
        document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-moon"></i><span>Mode Gelap</span>';
        currentTheme = 'light';
        localStorage.setItem(AppConfig.STORAGE_KEYS.THEME, 'light');
    }
});

// ==================== FUNGSI TAB ====================
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const targetTab = tab.getAttribute('data-tab');
        
        // Update tab aktif
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update konten aktif
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${targetTab}-tab`).classList.add('active');
        
        // Load data cloud jika tab cloud
        if (targetTab === 'cloud' && cloudConnected) {
            loadCloudData();
        }
        
        // Reset progress bars
        hideAllProgressBars();
    });
});

// ==================== INDIKATOR KEKUATAN KUNCI ====================
function updateKeyStrength() {
    const key = document.getElementById('encryption-key').value;
    const strengthBar = document.getElementById('key-strength-bar');
    const strengthText = document.getElementById('key-strength-text');
    
    const strength = AppConfig.validateKeyStrength(key);
    
    strengthBar.className = 'strength-level ' + strength.level;
    strengthBar.style.width = strength.strength + '%';
    strengthText.textContent = strength.text;
    strengthText.style.color = getStrengthColor(strength.level);
}

function updateFileKeyStrength() {
    const key = document.getElementById('file-key').value;
    const method = document.getElementById('file-method').value;
    
    // Cari atau buat indikator kekuatan kunci untuk file
    let indicator = document.getElementById('file-key-strength');
    if (!indicator) {
        const container = document.querySelector('#file-key').parentElement;
        indicator = document.createElement('div');
        indicator.id = 'file-key-strength';
        indicator.className = 'key-strength-container';
        indicator.innerHTML = `
            <div class="key-strength-indicator">
                <div class="strength-bar">
                    <div class="strength-level" id="file-key-strength-bar"></div>
                </div>
                <div class="strength-text" id="file-key-strength-text">Kekuatan: -</div>
            </div>
        `;
        container.appendChild(indicator);
    }
    
    const strength = AppConfig.validateKeyStrength(key);
    const strengthBar = document.getElementById('file-key-strength-bar');
    const strengthText = document.getElementById('file-key-strength-text');
    
    strengthBar.className = 'strength-level ' + strength.level;
    strengthBar.style.width = strength.strength + '%';
    strengthText.textContent = strength.text;
    strengthText.style.color = getStrengthColor(strength.level);
}

function getStrengthColor(level) {
    switch(level) {
        case 'weak': return 'var(--danger)';
        case 'medium': return 'var(--warning)';
        case 'good': return 'var(--secondary)';
        case 'strong': return 'var(--success)';
        default: return 'var(--gray)';
    }
}

// ==================== GENERATOR KUNCI ====================
document.getElementById('generate-key').addEventListener('click', () => {
    const length = parseInt(document.getElementById('key-length').value);
    const includeNumbers = document.getElementById('include-numbers').checked;
    const includeSymbols = document.getElementById('include-symbols').checked;
    const includeUppercase = document.getElementById('include-uppercase').checked;
    
    const generatedKey = generateSecureKey(length, includeNumbers, includeSymbols, includeUppercase);
    document.getElementById('generated-key').textContent = generatedKey;
    
    // Auto-copy ke clipboard
    navigator.clipboard.writeText(generatedKey).then(() => {
        showToast('Key generated and copied to clipboard!', 'success');
    });
});

document.getElementById('key-length').addEventListener('input', (e) => {
    document.getElementById('key-length-value').textContent = e.target.value;
});

function generateSecureKey(length, numbers = true, symbols = true, uppercase = true) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbersChars = '0123456789';
    const symbolsChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    let charset = lowercase;
    if (uppercase) charset += uppercaseChars;
    if (numbers) charset += numbersChars;
    if (symbols) charset += symbolsChars;
    
    let key = '';
    for (let i = 0; i < length; i++) {
        key += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return key;
}

// ==================== ENKRIPSI YANG AMAN ====================

// Caesar Cipher dengan checksum - DIPERBAIKI
function caesarCipher(text, key, encrypt = true) {
    // Validasi key
    const shift = parseInt(key);
    if (isNaN(shift) || shift < 1 || shift > 25) {
        return null;
    }
    
    // Tambahkan checksum sebelum enkripsi
    if (encrypt) {
        text = AppConfig.addChecksum(text);
    }
    
    let result = "";
    const actualShift = encrypt ? shift : -shift;
    
    for (let i = 0; i < text.length; i++) {
        let char = text[i];
        const code = text.charCodeAt(i);
        
        if (code >= 65 && code <= 90) { // Huruf besar
            char = String.fromCharCode(((code - 65 + actualShift + 26) % 26) + 65);
        } else if (code >= 97 && code <= 122) { // Huruf kecil
            char = String.fromCharCode(((code - 97 + actualShift + 26) % 26) + 97);
        }
        // Karakter lain tetap sama
        result += char;
    }
    
    // Validasi checksum setelah dekripsi
    if (!encrypt) {
        try {
            result = AppConfig.validateAndRemoveChecksum(result);
        } catch (error) {
            return null; // Kunci salah
        }
    }
    
    return result;
}

// Vigenere Cipher dengan checksum - DIPERBAIKI
function vigenereCipher(text, key, encrypt = true) {
    // Validasi key
    if (!key || key.length < 3) return null;
    
    // Tambahkan checksum sebelum enkripsi
    if (encrypt) {
        text = AppConfig.addChecksum(text);
    }
    
    let result = "";
    let keyIndex = 0;
    const keyLength = key.length;
    
    for (let i = 0; i < text.length; i++) {
        let char = text[i];
        const code = text.charCodeAt(i);
        
        if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
            const keyChar = key[keyIndex % keyLength].toUpperCase();
            const keyShift = keyChar.charCodeAt(0) - 65;
            const shift = encrypt ? keyShift : -keyShift;
            
            if (code >= 65 && code <= 90) { // Huruf besar
                char = String.fromCharCode(((code - 65 + shift + 26) % 26) + 65);
            } else if (code >= 97 && code <= 122) { // Huruf kecil
                char = String.fromCharCode(((code - 97 + shift + 26) % 26) + 97);
            }
            
            keyIndex++;
        }
        result += char;
    }
    
    // Validasi checksum setelah dekripsi
    if (!encrypt) {
        try {
            result = AppConfig.validateAndRemoveChecksum(result);
        } catch (error) {
            return null; // Kunci salah
        }
    }
    
    return result;
}

// Base64 Encoding/Decoding - DIPERBAIKI
function base64Encode(text, key = null) {
    try {
        // Gunakan Base64 yang aman jika ada kunci
        if (key && AppConfig.FEATURES.SECURE_BASE64) {
            const result = AppConfig.secureBase64Encode(text, key);
            if (result) return result;
        }
        
        // Fallback ke Base64 biasa (dengan warning)
        showToast('Base64 tanpa proteksi - tidak aman untuk data sensitif', 'warning');
        
        // Encode string ke UTF-8 dulu
        const utf8Bytes = new TextEncoder().encode(text);
        let binary = '';
        for (let i = 0; i < utf8Bytes.length; i++) {
            binary += String.fromCharCode(utf8Bytes[i]);
        }
        return btoa(binary);
    } catch (e) {
        // Fallback untuk string biasa
        return btoa(unescape(encodeURIComponent(text)));
    }
}

function secureBase64Decode(text, key = null) {
    try {
        // Coba decode dengan proteksi terlebih dahulu
        if (AppConfig.hasBase64Protection(text)) {
            const result = AppConfig.secureBase64Decode(text, key);
            if (result) return result;
            throw new Error('Base64 decode gagal - kunci salah');
        }
        
        // Coba decode biasa
        const binary = atob(text);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return new TextDecoder().decode(bytes);
    } catch (e) {
        // Fallback untuk string biasa
        try {
            return decodeURIComponent(escape(atob(text)));
        } catch (e2) {
            return null;
        }
    }
}

// XOR Cipher dengan checksum - DIPERBAIKI
function xorCipher(text, key, encrypt = true) {
    if (!key) return null;
    
    // Tambahkan checksum sebelum enkripsi
    if (encrypt) {
        text = AppConfig.addChecksum(text);
    }
    
    let result = "";
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        result += String.fromCharCode(charCode);
    }
    
    // Validasi checksum setelah dekripsi
    if (!encrypt) {
        try {
            result = AppConfig.validateAndRemoveChecksum(result);
        } catch (error) {
            return null; // Kunci salah
        }
    }
    
    return result;
}

// AES-256 Encryption dengan validation - DIPERBAIKI
async function aesEncrypt(text, password) {
    try {
        showLoading('Encrypting with AES-256...');
        
        // Tambahkan checksum sebelum enkripsi
        text = AppConfig.addChecksum(text);
        
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        
        const salt = encoder.encode(AppConfig.SECURITY.AES_SALT);
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            encoder.encode(password),
            {name: "PBKDF2"},
            false,
            ["deriveKey"]
        );
        
        const key = await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: AppConfig.SECURITY.AES_ITERATIONS,
                hash: "SHA-256"
            },
            keyMaterial,
            {name: "AES-GCM", length: AppConfig.SECURITY.AES_KEY_LENGTH},
            false,
            ["encrypt"]
        );
        
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            data
        );
        
        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv, 0);
        combined.set(new Uint8Array(encrypted), iv.length);
        
        hideLoading();
        
        // Convert to base64
        let binary = '';
        for (let i = 0; i < combined.length; i++) {
            binary += String.fromCharCode(combined[i]);
        }
        return btoa(binary);
        
    } catch (error) {
        hideLoading();
        console.error("AES encryption error:", error);
        return null;
    }
}

async function secureAesDecrypt(encryptedBase64, password) {
    try {
        showLoading('Decrypting with AES-256...');
        
        // Convert base64 to Uint8Array
        const binary = atob(encryptedBase64);
        const combined = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            combined[i] = binary.charCodeAt(i);
        }
        
        const iv = combined.slice(0, 12);
        const encrypted = combined.slice(12);
        
        const encoder = new TextEncoder();
        const salt = encoder.encode(AppConfig.SECURITY.AES_SALT);
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            encoder.encode(password),
            {name: "PBKDF2"},
            false,
            ["deriveKey"]
        );
        
        const key = await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: AppConfig.SECURITY.AES_ITERATIONS,
                hash: "SHA-256"
            },
            keyMaterial,
            {name: "AES-GCM", length: AppConfig.SECURITY.AES_KEY_LENGTH},
            false,
            ["decrypt"]
        );
        
        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: iv
            },
            key,
            encrypted
        );
        
        const result = new TextDecoder().decode(decrypted);
        
        // Validasi checksum
        try {
            const validatedResult = AppConfig.validateAndRemoveChecksum(result);
            hideLoading();
            return validatedResult;
        } catch (error) {
            hideLoading();
            return null;
        }
        
    } catch (error) {
        hideLoading();
        console.error("AES decryption error:", error);
        return null;
    }
}

// Fungsi dekripsi yang lebih aman - DIPERBAIKI
async function secureXorDecrypt(encryptedData, key) {
    try {
        let data = encryptedData;
        if (isValidBase64(data)) {
            data = atob(data);
        }
        
        const result = xorCipher(data, key, false);
        if (!result) {
            return null;
        }
        
        return result;
    } catch (error) {
        return null;
    }
}

async function secureCaesarDecrypt(encryptedData, key) {
    try {
        const result = caesarCipher(encryptedData, key, false);
        if (!result) {
            return null;
        }
        
        return result;
    } catch (error) {
        return null;
    }
}

async function secureVigenereDecrypt(encryptedData, key) {
    try {
        const result = vigenereCipher(encryptedData, key, false);
        if (!result) {
            return null;
        }
        
        return result;
    } catch (error) {
        return null;
    }
}

// ==================== ENKRIPSI TEKS ====================
document.getElementById('encrypt-text-btn').addEventListener('click', async () => {
    const method = document.getElementById('text-method').value;
    const text = document.getElementById('text-input').value.trim();
    const key = document.getElementById('encryption-key').value;
    
    if (!text) {
        showToast(AppConfig.MESSAGES.ERRORS.NO_TEXT, 'error');
        return;
    }
    
    // Validasi kunci
    const keyError = AppConfig.validateKeyForMethod(key, method);
    if (keyError && method !== 'base64') {
        showToast(keyError, 'error');
        return;
    }
    
    // Untuk Base64, beri peringatan jika tidak ada kunci
    if (method === 'base64' && !key) {
        const confirm = await showConfirmationModal(
            'Base64 tanpa kunci tidak aman. Lanjutkan?',
            'Lanjutkan tanpa kunci',
            'Gunakan kunci'
        );
        if (!confirm) {
            document.getElementById('encryption-key').focus();
            return;
        }
    }
    
    // Set default key untuk caesar jika kosong
    if (method === 'caesar' && !key) {
        document.getElementById('encryption-key').value = '3';
    }
    
    showProgress('text', 0);
    const startTime = performance.now();
    let result = "";
    
    try {
        // Hapus interval sebelumnya jika ada
        if (progressInterval) clearInterval(progressInterval);
        
        let progress = 0;
        progressInterval = setInterval(() => {
            progress = Math.min(progress + 10, 90);
            showProgress('text', progress);
        }, AppConfig.UI.PROGRESS_INTERVAL);
        
        switch(method) {
            case 'caesar':
                result = caesarCipher(text, key || '3', true);
                if (!result) throw new Error('Caesar encryption failed');
                break;
            case 'vigenere':
                result = vigenereCipher(text, key, true);
                if (!result) throw new Error('Vigenere encryption failed');
                break;
            case 'base64':
                result = base64Encode(text, key);
                if (!result) throw new Error('Base64 encoding failed');
                break;
            case 'aes':
                result = await aesEncrypt(text, key);
                if (!result) throw new Error(AppConfig.MESSAGES.ERRORS.AES_FAILED);
                break;
            case 'xor':
                const xorResult = xorCipher(text, key, true);
                if (!xorResult) throw new Error('XOR encryption failed');
                result = base64Encode(xorResult, key);
                break;
            default:
                throw new Error('Unknown method');
        }
        
        clearInterval(progressInterval);
        showProgress('text', 100);
        
        const endTime = performance.now();
        const processTime = ((endTime - startTime) / 1000).toFixed(3);
        
        encryptionResult = {
            method: method.toUpperCase(),
            dataType: 'Teks',
            originalSize: AppConfig.formatBytes(new Blob([text]).size),
            encryptedSize: AppConfig.formatBytes(new Blob([result]).size),
            processTime: `${processTime}s`,
            preview: result.substring(0, 200) + (result.length > 200 ? '...' : ''),
            fullResult: result,
            keyUsed: key || (method === 'base64' ? 'none' : 'default')
        };
        
        setTimeout(() => {
            showResultModal();
        }, 300);
        
    } catch (error) {
        clearInterval(progressInterval);
        showToast(`Error: ${error.message}`, 'error');
        hideProgress('text');
    }
});

// ==================== ENKRIPSI FILE ====================
document.getElementById('encrypt-file-btn').addEventListener('click', async () => {
    const method = document.getElementById('file-method').value;
    const fileInput = document.getElementById('file-input');
    const key = document.getElementById('file-key').value;
    
    if (!fileInput.files.length) {
        showToast(AppConfig.MESSAGES.ERRORS.NO_FILE, 'error');
        return;
    }
    
    // Validasi kunci
    const keyError = AppConfig.validateKeyForMethod(key, method);
    if (keyError && method !== 'base64') {
        showToast(keyError, 'error');
        return;
    }
    
    // Untuk Base64, beri peringatan jika tidak ada kunci
    if (method === 'base64' && !key) {
        const confirm = await showConfirmationModal(
            'Base64 tanpa kunci tidak aman. Lanjutkan?',
            'Lanjutkan tanpa kunci',
            'Gunakan kunci'
        );
        if (!confirm) {
            document.getElementById('file-key').focus();
            return;
        }
    }
    
    const files = Array.from(fileInput.files);
    
    // Check file sizes
    for (const file of files) {
        if (file.size > AppConfig.APP.MAX_FILE_SIZE) {
            showToast(`File ${file.name} is too large (max ${AppConfig.formatBytes(AppConfig.APP.MAX_FILE_SIZE)})`, 'error');
            return;
        }
    }
    
    showProgress('file', 0);
    const startTime = performance.now();
    
    try {
        // Hapus interval sebelumnya jika ada
        if (progressInterval) clearInterval(progressInterval);
        
        let progress = 0;
        progressInterval = setInterval(() => {
            progress = Math.min(progress + 5, 90);
            showProgress('file', progress);
        }, AppConfig.UI.PROGRESS_INTERVAL);
        
        let allResults = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const reader = new FileReader();
            
            const result = await new Promise((resolve, reject) => {
                reader.onload = async function(e) {
                    try {
                        const arrayBuffer = e.target.result;
                        let result = "";
                        const textContent = new TextDecoder().decode(arrayBuffer);
                        
                        switch(method) {
                            case 'base64':
                                result = base64Encode(textContent, key);
                                if (!result) throw new Error('Base64 encoding failed');
                                break;
                            case 'aes':
                                result = await aesEncrypt(textContent, key);
                                if (!result) throw new Error(AppConfig.MESSAGES.ERRORS.AES_FAILED);
                                break;
                            case 'xor':
                                const xorResult = xorCipher(textContent, key, true);
                                if (!xorResult) throw new Error('XOR encryption failed');
                                result = base64Encode(xorResult, key);
                                break;
                            default:
                                throw new Error('Unknown method');
                        }
                        
                        resolve({
                            name: file.name,
                            content: result,
                            size: file.size,
                            originalContent: arrayBuffer
                        });
                    } catch (error) {
                        reject(error);
                    }
                };
                
                reader.onerror = function() {
                    reject(new Error('Failed to read file'));
                };
                
                reader.readAsArrayBuffer(file);
            });
            
            allResults.push(result);
            
            // Update progress per file
            showProgress('file', ((i + 1) / files.length) * 90);
        }
        
        clearInterval(progressInterval);
        showProgress('file', 100);
        
        const endTime = performance.now();
        const processTime = ((endTime - startTime) / 1000).toFixed(3);
        
        if (allResults.length === 1) {
            // Single file
            encryptionResult = {
                method: method.toUpperCase(),
                dataType: 'File',
                fileName: allResults[0].name,
                originalSize: AppConfig.formatBytes(allResults[0].size),
                encryptedSize: AppConfig.formatBytes(new Blob([allResults[0].content]).size),
                processTime: `${processTime}s`,
                preview: allResults[0].content.substring(0, 200) + (allResults[0].content.length > 200 ? '...' : ''),
                fullResult: allResults[0].content,
                keyUsed: key || (method === 'base64' ? 'none' : 'default'),
                originalBuffer: allResults[0].originalContent
            };
            
            encryptedFileData = allResults[0].content;
            encryptedFileName = allResults[0].name + '.encrypted';
        } else {
            // Multiple files - create archive
            const archiveData = JSON.stringify(allResults.map(r => ({
                name: r.name,
                content: r.content,
                size: r.size
            })));
            
            encryptionResult = {
                method: method.toUpperCase(),
                dataType: 'Multiple Files',
                fileName: `${files.length} files`,
                originalSize: AppConfig.formatBytes(files.reduce((sum, f) => sum + f.size, 0)),
                encryptedSize: AppConfig.formatBytes(new Blob([archiveData]).size),
                processTime: `${processTime}s`,
                preview: `Archive containing ${files.length} files`,
                fullResult: archiveData,
                keyUsed: key,
                isArchive: true,
                files: allResults
            };
            
            encryptedFileData = archiveData;
            encryptedFileName = 'files_archive.encrypted';
        }
        
        setTimeout(() => {
            showResultModal();
        }, 300);
        
    } catch (error) {
        clearInterval(progressInterval);
        showToast(`Error: ${error.message}`, 'error');
        hideProgress('file');
    }
});

// ==================== DEKRIPSI DATA YANG AMAN ====================
document.getElementById('decrypt-btn').addEventListener('click', async () => {
    const key = document.getElementById('decryption-key').value;
    const fileInput = document.getElementById('decrypt-file-input');
    const textInput = document.getElementById('decrypt-input').value.trim();
    
    if (fileInput.files.length) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = async function(e) {
            try {
                const fileContent = e.target.result;
                await performSecureDecryption(fileContent, key, file.name, true);
            } catch (error) {
                showToast(`Error: ${error.message}`, 'error');
            }
        };
        
        reader.onerror = function() {
            showToast('Failed to read file', 'error');
        };
        
        reader.readAsText(file);
        return;
    }
    
    if (!textInput) {
        showToast('Enter encrypted data or select file', 'error');
        return;
    }
    
    await performSecureDecryption(textInput, key, '', false);
});

async function performSecureDecryption(data, key, fileName = '', isFile = false) {
    showProgress('decrypt', 0);
    const startTime = performance.now();
    
    try {
        // Hapus interval sebelumnya jika ada
        if (progressInterval) clearInterval(progressInterval);
        
        let progress = 0;
        progressInterval = setInterval(() => {
            progress = Math.min(progress + 10, 90);
            showProgress('decrypt', progress);
        }, AppConfig.UI.PROGRESS_INTERVAL);
        
        let result = "";
        let methodUsed = 'unknown';
        let decryptionSuccessful = false;
        
        // Cek apakah data memiliki proteksi Base64
        if (AppConfig.hasBase64Protection(data)) {
            // Coba dekripsi Base64 dengan proteksi
            const base64Result = AppConfig.secureBase64Decode(data, key);
            if (base64Result && AppConfig.isValidDecryptedText(base64Result)) {
                result = base64Result;
                methodUsed = 'base64_secure';
                decryptionSuccessful = true;
            }
        }
        
        // Jika tidak berhasil, coba metode lain
        if (!decryptionSuccessful && isValidBase64(data)) {
            // Coba Base64 biasa dulu
            const base64Result = secureBase64Decode(data);
            if (base64Result && AppConfig.isValidDecryptedText(base64Result)) {
                result = base64Result;
                methodUsed = 'base64';
                decryptionSuccessful = true;
                showToast('Base64 tanpa proteksi - data mungkin tidak aman', 'warning');
            }
            
            // Jika Base64 gagal, coba AES
            if (!decryptionSuccessful && key) {
                const aesResult = await secureAesDecrypt(data, key);
                if (aesResult) {
                    result = aesResult;
                    methodUsed = 'aes';
                    decryptionSuccessful = true;
                }
            }
            
            // Coba XOR
            if (!decryptionSuccessful && key) {
                const xorResult = await secureXorDecrypt(data, key);
                if (xorResult) {
                    result = xorResult;
                    methodUsed = 'xor';
                    decryptionSuccessful = true;
                }
            }
        }
        
        // Coba Caesar cipher (text tanpa special chars)
        if (!decryptionSuccessful && /^[A-Za-z\s.,!?]+$/.test(data) && key) {
            const caesarResult = await secureCaesarDecrypt(data, key);
            if (caesarResult) {
                result = caesarResult;
                methodUsed = 'caesar';
                decryptionSuccessful = true;
            }
        }
        
        // Coba Vigenere
        if (!decryptionSuccessful && key) {
            const vigenereResult = await secureVigenereDecrypt(data, key);
            if (vigenereResult) {
                result = vigenereResult;
                methodUsed = 'vigenere';
                decryptionSuccessful = true;
            }
        }
        
        if (!decryptionSuccessful) {
            throw new Error('Dekripsi gagal. Kunci salah atau data rusak.');
        }
        
        clearInterval(progressInterval);
        showProgress('decrypt', 100);
        
        const endTime = performance.now();
        const processTime = ((endTime - startTime) / 1000).toFixed(3);
        
        encryptionResult = {
            method: `Auto-Detect (${methodUsed.toUpperCase()})`,
            dataType: isFile ? 'File' : 'Teks',
            fileName: fileName || 'Data',
            originalSize: AppConfig.formatBytes(new Blob([data]).size),
            decryptedSize: AppConfig.formatBytes(new Blob([result]).size),
            processTime: `${processTime}s`,
            preview: result.substring(0, 300) + (result.length > 300 ? '...' : ''),
            fullResult: result,
            isDecryption: true
        };
        
        setTimeout(() => {
            showResultModal();
        }, 300);
        
    } catch (error) {
        clearInterval(progressInterval);
        showToast(`Decryption failed: ${error.message}`, 'error');
        hideProgress('decrypt');
    }
}

function isValidBase64(str) {
    try {
        return btoa(atob(str)) === str;
    } catch (err) {
        return false;
    }
}

// ==================== MODAL SAVE TO CLOUD ====================
document.getElementById('modal-save-cloud-btn').addEventListener('click', async () => {
    if (!encryptionResult) return;
    
    // Buat modal untuk memasukkan deskripsi
    const modal = document.createElement('div');
    modal.id = 'save-cloud-modal';
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
        <div class="modal" style="max-width: 500px;">
            <div class="modal-header">
                <h2><i class="fas fa-cloud-upload-alt"></i> Simpan ke Cloud</h2>
                <button class="close-modal" id="close-save-modal">&times;</button>
            </div>
            <div class="modal-content">
                <div class="file-info" style="margin-bottom: 20px; padding: 15px; background: var(--light); border-radius: 10px;">
                    <h4><i class="fas fa-file"></i> ${encryptionResult.fileName || 'encrypted_data.txt'}</h4>
                    <p><strong>Metode:</strong> ${encryptionResult.method}</p>
                    <p><strong>Ukuran:</strong> ${encryptionResult.encryptedSize || encryptionResult.originalSize}</p>
                    <p><strong>Status:</strong> ${encryptionResult.keyUsed === 'none' ? 'Base64 tanpa kunci (kurang aman)' : 'Terenkripsi dengan kunci'}</p>
                </div>
                
                <div class="input-group" style="margin-bottom: 15px;">
                    <label for="cloud-file-name"><i class="fas fa-file-signature"></i> Nama File:</label>
                    <input type="text" id="cloud-file-name" value="${encryptionResult.fileName || 'encrypted_data.txt'}" style="width: 100%;">
                </div>
                
                <div class="input-group" style="margin-bottom: 20px;">
                    <label for="cloud-description"><i class="fas fa-align-left"></i> Deskripsi (opsional):</label>
                    <textarea id="cloud-description" placeholder="Masukkan deskripsi file..." rows="3" style="width: 100%;"></textarea>
                </div>
                
                <div class="modal-actions">
                    <button class="modal-btn save-cloud-btn" id="confirm-save-cloud">
                        <i class="fas fa-save"></i> Simpan ke Cloud
                    </button>
                    <button class="modal-btn close-btn" id="cancel-save-cloud">
                        <i class="fas fa-times"></i> Batal
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    document.getElementById('close-save-modal').addEventListener('click', () => {
        modal.remove();
    });
    
    document.getElementById('cancel-save-cloud').addEventListener('click', () => {
        modal.remove();
    });
    
    document.getElementById('confirm-save-cloud').addEventListener('click', async () => {
        const fileName = document.getElementById('cloud-file-name').value.trim();
        const description = document.getElementById('cloud-description').value.trim();
        
        if (!fileName) {
            showToast('Masukkan nama file', 'error');
            return;
        }
        
        // Peringatan untuk Base64 tanpa kunci
        if (encryptionResult.method.toLowerCase().includes('base64') && encryptionResult.keyUsed === 'none') {
            const confirm = await showConfirmationModal(
                'Base64 tanpa kunci tidak aman untuk disimpan di cloud. Lanjutkan?',
                'Simpan tanpa kunci',
                'Batal'
            );
            if (!confirm) {
                return;
            }
        }
        
        const metadata = {
            method: encryptionResult.method,
            dataType: encryptionResult.dataType,
            fileName: fileName,
            description: description || 'Encrypted file'
        };
        
        const success = await saveToCloud(encryptionResult.fullResult, metadata, encryptionResult.keyUsed || '');
        
        if (success) {
            modal.remove();
            closeResultModal();
            showToast('Data berhasil disimpan ke cloud!', 'success');
        }
    });
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
});

// ==================== FUNGSI MODAL ====================
function showResultModal() {
    const modal = document.getElementById('result-modal');
    const modalMethod = document.getElementById('modal-method');
    const modalDataType = document.getElementById('modal-data-type');
    const modalDataSize = document.getElementById('modal-data-size');
    const modalProcessTime = document.getElementById('modal-process-time');
    const modalPreview = document.getElementById('modal-preview');
    
    if (!encryptionResult) return;
    
    modalMethod.textContent = encryptionResult.method;
    modalDataType.textContent = encryptionResult.dataType + (encryptionResult.fileName ? `: ${encryptionResult.fileName}` : '');
    modalDataSize.textContent = encryptionResult.isDecryption ? 
        `${encryptionResult.originalSize} → ${encryptionResult.decryptedSize}` : 
        `${encryptionResult.originalSize} → ${encryptionResult.encryptedSize}`;
    modalProcessTime.textContent = encryptionResult.processTime;
    modalPreview.textContent = encryptionResult.preview;
    
    // Update tombol Save to Cloud
    const saveBtn = document.getElementById('modal-save-cloud-btn');
    if (encryptionResult.isDecryption) {
        saveBtn.style.display = 'none';
    } else {
        saveBtn.style.display = 'flex';
    }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeResultModal() {
    const modal = document.getElementById('result-modal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Event listeners modal
document.getElementById('close-modal').addEventListener('click', closeResultModal);
document.getElementById('modal-close-btn').addEventListener('click', closeResultModal);

document.getElementById('modal-copy-btn').addEventListener('click', () => {
    if (encryptionResult) {
        navigator.clipboard.writeText(encryptionResult.fullResult)
            .then(() => showToast('Data copied to clipboard!', 'success'))
            .catch(err => showToast('Failed to copy: ' + err, 'error'));
    }
});

document.getElementById('modal-download-btn').addEventListener('click', () => {
    if (!encryptionResult) return;
    
    let filename, content;
    
    if (encryptionResult.isDecryption) {
        filename = 'decrypted-result.txt';
        content = encryptionResult.fullResult;
    } else if (encryptionResult.isArchive) {
        filename = 'files_archive.encrypted';
        content = encryptionResult.fullResult;
    } else if (encryptionResult.dataType === 'File') {
        filename = encryptedFileName || 'encrypted-file.enc';
        content = encryptionResult.fullResult;
    } else {
        filename = 'encrypted-data.txt';
        content = encryptionResult.fullResult;
    }
    
    downloadFile(content, filename);
    showToast(`File ${filename} downloaded!`, 'success');
});

// Close modal on outside click
document.getElementById('result-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('result-modal')) {
        closeResultModal();
    }
});

// ==================== HANDLER UPLOAD FILE ====================
['file-drop-area', 'decrypt-file-drop-area'].forEach(areaId => {
    const area = document.getElementById(areaId);
    const fileInput = area.querySelector('input[type="file"]');
    const fileName = area.querySelector('.file-name');
    const fileList = area.nextElementSibling;
    
    area.addEventListener('click', () => fileInput.click());
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        area.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        area.addEventListener(eventName, () => {
            area.style.borderColor = 'var(--secondary)';
            area.style.backgroundColor = 'rgba(52, 152, 219, 0.1)';
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        area.addEventListener(eventName, () => {
            area.style.borderColor = 'var(--border-color)';
            area.style.backgroundColor = '';
        }, false);
    });
    
    area.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files.length) {
            fileInput.files = files;
            updateFileDisplay(files, fileName, fileList);
        }
    }, false);
    
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            updateFileDisplay(fileInput.files, fileName, fileList);
        } else {
            fileName.textContent = 'No file selected';
            if (fileList) fileList.innerHTML = '';
        }
    });
});

function updateFileDisplay(files, fileNameElement, fileListElement) {
    if (files.length === 1) {
        fileNameElement.textContent = files[0].name;
        if (fileListElement) fileListElement.innerHTML = '';
    } else {
        fileNameElement.textContent = `${files.length} files selected`;
        if (fileListElement) {
            fileListElement.innerHTML = Array.from(files).map(file => `
                <div class="file-item">
                    <span>${file.name}</span>
                    <span>${AppConfig.formatBytes(file.size)}</span>
                </div>
            `).join('');
        }
    }
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// ==================== TOMBOL BERSIHKAN ====================
document.getElementById('clear-text-btn').addEventListener('click', () => {
    document.getElementById('text-input').value = '';
    document.getElementById('encryption-key').value = '';
    document.getElementById('key-strength-bar').style.width = '0%';
    document.getElementById('key-strength-text').textContent = 'Kekuatan: -';
});

document.getElementById('clear-file-btn').addEventListener('click', () => {
    document.getElementById('file-input').value = '';
    document.getElementById('file-key').value = '';
    document.getElementById('file-name').textContent = 'No file selected';
    const fileList = document.getElementById('file-list');
    if (fileList) fileList.innerHTML = '';
    
    // Hapus indikator kekuatan kunci file
    const indicator = document.getElementById('file-key-strength');
    if (indicator) indicator.remove();
});

document.getElementById('clear-decrypt-btn').addEventListener('click', () => {
    document.getElementById('decrypt-input').value = '';
    document.getElementById('decryption-key').value = '';
    document.getElementById('decrypt-file-input').value = '';
    document.getElementById('decrypt-file-name').textContent = 'No file selected';
});

// ==================== KOMPONEN UI ====================
// Toast Notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas fa-${icons[type] || 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) {
                container.removeChild(toast);
            }
        }, 300);
    }, AppConfig.UI.TOAST_DURATION);
}

// Confirmation Dialog
function showConfirmation(message, onConfirm) {
    const overlay = document.getElementById('confirmation-overlay');
    const messageEl = document.getElementById('confirmation-message');
    const cancelBtn = document.getElementById('confirmation-cancel');
    const confirmBtn = document.getElementById('confirmation-confirm');
    
    messageEl.textContent = message;
    
    const cleanup = () => {
        overlay.classList.remove('active');
        cancelBtn.onclick = null;
        confirmBtn.onclick = null;
    };
    
    cancelBtn.onclick = cleanup;
    confirmBtn.onclick = () => {
        cleanup();
        onConfirm();
    };
    
    overlay.classList.add('active');
}

// Confirmation Modal yang lebih baik
function showConfirmationModal(message, confirmText = 'Ya', cancelText = 'Tidak') {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.id = 'custom-confirmation-modal';
        modal.className = 'modal-overlay active';
        modal.innerHTML = `
            <div class="modal" style="max-width: 400px;">
                <div class="modal-content" style="text-align: center;">
                    <h3 style="margin-bottom: 20px; color: var(--warning);">
                        <i class="fas fa-exclamation-triangle"></i> Peringatan
                    </h3>
                    <p style="margin-bottom: 25px; font-size: 1rem;">${message}</p>
                    <div class="modal-actions">
                        <button class="modal-btn" id="custom-confirm" style="background-color: var(--warning); color: white;">
                            ${confirmText}
                        </button>
                        <button class="modal-btn close-btn" id="custom-cancel">
                            ${cancelText}
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('custom-confirm').addEventListener('click', () => {
            modal.remove();
            resolve(true);
        });
        
        document.getElementById('custom-cancel').addEventListener('click', () => {
            modal.remove();
            resolve(false);
        });
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                resolve(false);
            }
        });
    });
}

// Guide Overlay
function showGuide() {
    document.getElementById('guide-overlay').classList.add('active');
}

document.getElementById('close-guide-btn').addEventListener('click', () => {
    document.getElementById('guide-overlay').classList.remove('active');
});

document.getElementById('guide-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('guide-overlay')) {
        document.getElementById('guide-overlay').classList.remove('active');
    }
});

// Loading Overlay
function showLoading(text = 'Processing...') {
    document.getElementById('loading-text').textContent = text;
    document.getElementById('loading-overlay').classList.add('active');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.remove('active');
}

// Progress Bars - DIPERBAIKI
function showProgress(type, percent) {
    const container = document.getElementById(`${type}-progress`);
    const fill = document.getElementById(`${type}-progress-fill`);
    const text = document.getElementById(`${type}-progress-text`);
    
    if (!container || !fill || !text) return;
    
    container.classList.add('active');
    fill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    text.textContent = `${Math.round(percent)}%`;
}

function hideProgress(type) {
    const container = document.getElementById(`${type}-progress`);
    if (container) container.classList.remove('active');
}

function hideAllProgressBars() {
    ['text', 'file', 'decrypt'].forEach(type => {
        hideProgress(type);
    });
}

// Tooltips
function initializeTooltips() {
    document.querySelectorAll('.info-tooltip').forEach(el => {
        const tooltip = el.getAttribute('data-tooltip');
        if (tooltip) {
            el.title = tooltip;
        }
    });
}

// ==================== FUNGSI UTILITAS ====================
function downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ==================== SANITASI INPUT ====================
function sanitizeInput(input) {
    // Remove potentially dangerous characters but allow spaces and tabs
    return input
        .replace(/[<>]/g, '') // Remove < and >
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .trim();
}

// Add input sanitization to all text inputs
document.querySelectorAll('input[type="text"], input[type="password"], textarea').forEach(input => {
    input.addEventListener('input', () => {
        // Allow spaces and tabs in textarea
        if (input.tagName.toLowerCase() === 'textarea') {
            return;
        }
        
        const cursorPos = input.selectionStart;
        const oldValue = input.value;
        const newValue = sanitizeInput(oldValue);
        
        if (oldValue !== newValue) {
            input.value = newValue;
            input.setSelectionRange(cursorPos - 1, cursorPos - 1);
        }
    });
});