// ==================== VARIABEL GLOBAL ====================
let supabase = null;
let currentTheme = 'light';
let encryptionResult = null;
let encryptedFileData = null;
let encryptedFileName = null;
let encryptionHistory = [];
let cloudConnected = false;

// ==================== INISIALISASI APLIKASI ====================
document.addEventListener('DOMContentLoaded', async () => {
    console.log(`${AppConfig.APP.NAME} v${AppConfig.APP.VERSION} - Initializing...`);
    
    // Load konfigurasi tema
    loadTheme();
    
    // Load history dari localStorage
    loadEncryptionHistory();
    
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
    
    // Inisialisasi indikator kekuatan kunci
    document.getElementById('encryption-key').addEventListener('input', updateKeyStrength);
});

// ==================== INTEGRASI SUPABASE ====================
async function initializeSupabase() {
    const config = AppConfig.getSupabaseConfig();
    
    try {
        supabase = window.supabase.createClient(config.url, config.key);
        
        // Test koneksi
        const { data, error } = await supabase
            .from(config.table)
            .select('count')
            .limit(1);
        
        if (error) throw error;
        
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
    if (!cloudConnected) return;
    
    const config = AppConfig.getSupabaseConfig();
    
    try {
        const { data, error } = await supabase
            .from(config.table)
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        displayCloudData(data);
        
    } catch (error) {
        console.error('Error loading cloud data:', error);
        showToast('Failed to load cloud data', 'error');
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
                <div class="storage-item-name">${item.name || 'Encrypted Data'}</div>
                <button class="download-cloud-btn" data-id="${item.id}">
                    <i class="fas fa-download"></i>
                </button>
            </div>
            <div class="storage-item-meta">
                <div>Metode: ${item.method}</div>
                <div>Ukuran: ${AppConfig.formatBytes(item.data.length)}</div>
                <div>Tanggal: ${new Date(item.created_at).toLocaleDateString()}</div>
            </div>
        </div>
    `).join('');
    
    // Tambahkan event listener ke tombol download
    document.querySelectorAll('.download-cloud-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            await downloadFromCloud(id);
        });
    });
}

async function saveToCloud(encryptedData, metadata) {
    if (!cloudConnected) {
        showToast('Cloud not connected', 'error');
        return false;
    }
    
    const config = AppConfig.getSupabaseConfig();
    
    try {
        const { data, error } = await supabase
            .from(config.table)
            .insert([{
                name: metadata.name || 'Encrypted Data',
                method: metadata.method,
                data: encryptedData,
                metadata: JSON.stringify(metadata),
                size: encryptedData.length,
                created_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        
        showToast('Data saved to cloud successfully!', 'success');
        loadCloudData();
        return true;
        
    } catch (error) {
        console.error('Error saving to cloud:', error);
        showToast('Failed to save to cloud', 'error');
        return false;
    }
}

async function downloadFromCloud(id) {
    const config = AppConfig.getSupabaseConfig();
    
    try {
        const { data, error } = await supabase
            .from(config.table)
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        // Tampilkan antarmuka dekripsi
        document.getElementById('decrypt-input').value = data.data;
        document.querySelector('[data-tab="decrypt"]').click();
        showToast('Data loaded from cloud. Enter decryption key.', 'success');
        
    } catch (error) {
        console.error('Error downloading from cloud:', error);
        showToast('Failed to load from cloud', 'error');
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
    });
});

// ==================== INDIKATOR KEKUATAN KUNCI ====================
function updateKeyStrength() {
    const key = document.getElementById('encryption-key').value;
    const strengthBar = document.getElementById('key-strength-bar');
    const strengthText = document.getElementById('key-strength-text');
    
    const strength = AppConfig.validateKeyStrength(key);
    
    strengthBar.className = 'strength-level ' + strength.level;
    strengthText.textContent = strength.text;
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

document.getElementById('self-destruct-slider').addEventListener('input', (e) => {
    document.getElementById('self-destruct-time').textContent = e.target.value;
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

// ==================== MANAJEMEN RIWAYAT ====================
function loadEncryptionHistory() {
    const saved = localStorage.getItem(AppConfig.STORAGE_KEYS.HISTORY);
    if (saved) {
        encryptionHistory = JSON.parse(saved);
    }
}

function saveToHistory(operation) {
    encryptionHistory.unshift({
        ...operation,
        timestamp: new Date().toISOString(),
        id: Date.now()
    });
    
    // Simpan hanya 50 item terakhir
    if (encryptionHistory.length > AppConfig.APP.MAX_HISTORY_ITEMS) {
        encryptionHistory = encryptionHistory.slice(0, AppConfig.APP.MAX_HISTORY_ITEMS);
    }
    
    localStorage.setItem(AppConfig.STORAGE_KEYS.HISTORY, JSON.stringify(encryptionHistory));
}

document.getElementById('view-history-btn').addEventListener('click', () => {
    if (encryptionHistory.length === 0) {
        showToast('No history available', 'info');
        return;
    }
    
    const historyText = encryptionHistory.map((item, index) => 
        `${index + 1}. ${item.method} - ${item.dataType} (${item.timestamp.slice(0, 10)})\n`
    ).join('');
    
    document.getElementById('decrypt-input').value = '=== ENCRYPTION HISTORY ===\n\n' + historyText;
    document.querySelector('[data-tab="decrypt"]').click();
});

document.getElementById('clear-history-btn').addEventListener('click', () => {
    showConfirmation('Clear all history?', () => {
        encryptionHistory = [];
        localStorage.removeItem(AppConfig.STORAGE_KEYS.HISTORY);
        showToast('History cleared', 'success');
    });
});

// ==================== FITUR SELF-DESTRUCT ====================
document.getElementById('create-self-destruct-btn').addEventListener('click', () => {
    const hours = parseInt(document.getElementById('self-destruct-slider').value);
    const text = document.getElementById('text-input').value;
    
    if (!text) {
        showToast('Enter text first', 'warning');
        return;
    }
    
    const selfDestructData = {
        data: text,
        expires: Date.now() + (hours * 60 * 60 * 1000),
        hours: hours
    };
    
    const encrypted = btoa(JSON.stringify(selfDestructData));
    document.getElementById('text-input').value = `SELF-DESTRUCT:${encrypted}`;
    showToast(`Self-destruct data created (expires in ${hours} hours)`, 'success');
});

// ==================== DASAR ENKRIPSI ====================
// Caesar Cipher
function caesarCipher(text, key, encrypt = true) {
    let result = "";
    const shift = encrypt ? parseInt(key) : -parseInt(key);
    
    for (let i = 0; i < text.length; i++) {
        let char = text[i];
        if (char.match(/[a-z]/i)) {
            const code = text.charCodeAt(i);
            
            if (code >= 65 && code <= 90) {
                char = String.fromCharCode(((code - 65 + shift + 26) % 26) + 65);
            } else if (code >= 97 && code <= 122) {
                char = String.fromCharCode(((code - 97 + shift + 26) % 26) + 97);
            }
        }
        result += char;
    }
    return result;
}

// Vigenere Cipher
function vigenereCipher(text, key, encrypt = true) {
    let result = "";
    let keyIndex = 0;
    const keyLength = key.length;
    
    for (let i = 0; i < text.length; i++) {
        let char = text[i];
        if (char.match(/[a-z]/i)) {
            const code = text.charCodeAt(i);
            const keyChar = key[keyIndex % keyLength].toUpperCase();
            const keyShift = keyChar.charCodeAt(0) - 65;
            const shift = encrypt ? keyShift : -keyShift;
            
            if (code >= 65 && code <= 90) {
                char = String.fromCharCode(((code - 65 + shift + 26) % 26) + 65);
            } else if (code >= 97 && code <= 122) {
                char = String.fromCharCode(((code - 97 + shift + 26) % 26) + 97);
            }
            
            keyIndex++;
        }
        result += char;
    }
    return result;
}

// Base64 Encoding/Decoding
function base64Encode(text) {
    return btoa(unescape(encodeURIComponent(text)));
}

function base64Decode(text) {
    try {
        return decodeURIComponent(escape(atob(text)));
    } catch (e) {
        return null;
    }
}

// XOR Cipher
function xorCipher(text, key, encrypt = true) {
    let result = "";
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        result += String.fromCharCode(charCode);
    }
    return result;
}

// AES-256 Encryption
async function aesEncrypt(text, password) {
    try {
        showLoading('Encrypting with AES-256...');
        
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
        return btoa(String.fromCharCode.apply(null, combined));
    } catch (error) {
        hideLoading();
        console.error("AES encryption error:", error);
        return null;
    }
}

async function aesDecrypt(encryptedBase64, password) {
    try {
        showLoading('Decrypting with AES-256...');
        
        const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
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
        
        hideLoading();
        return new TextDecoder().decode(decrypted);
    } catch (error) {
        hideLoading();
        console.error("AES decryption error:", error);
        return null;
    }
}

// ==================== DETEKSI METODE ENKRIPSI ====================
function detectEncryptionMethod(data, password) {
    // Check for self-destruct data
    if (data.startsWith('SELF-DESTRUCT:')) {
        return { method: 'self-destruct', data: data.substring(14) };
    }
    
    // Try Base64 detection
    if (isValidBase64(data)) {
        const decoded = base64Decode(data);
        if (decoded) {
            return { method: 'base64', data: decoded };
        }
    }
    
    // Try AES detection
    if (data.length > 12 && isValidBase64(data)) {
        return { method: 'aes', data: data };
    }
    
    // Try Caesar Cipher
    if (/^[A-Za-z\s]+$/.test(data)) {
        return { method: 'caesar', data: data };
    }
    
    // Try XOR if password exists
    if (password) {
        return { method: 'xor', data: data };
    }
    
    // Default to Vigenere
    return { method: 'vigenere', data: data };
}

function isValidBase64(str) {
    try {
        return btoa(atob(str)) === str;
    } catch (err) {
        return false;
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
    
    if ((method === 'aes' || method === 'vigenere' || method === 'xor') && !key) {
        showToast(AppConfig.MESSAGES.ERRORS.NO_KEY, 'error');
        return;
    }
    
    if (method === 'caesar' && !key) {
        document.getElementById('encryption-key').value = '3';
    }
    
    showProgress('text', 0);
    const startTime = performance.now();
    let result = "";
    
    try {
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 10;
            showProgress('text', progress);
        }, AppConfig.UI.PROGRESS_INTERVAL);
        
        switch(method) {
            case 'caesar':
                result = caesarCipher(text, key || '3', true);
                break;
            case 'vigenere':
                result = vigenereCipher(text, key, true);
                break;
            case 'base64':
                result = base64Encode(text);
                break;
            case 'aes':
                result = await aesEncrypt(text, key);
                if (!result) throw new Error(AppConfig.MESSAGES.ERRORS.AES_FAILED);
                break;
            case 'xor':
                result = xorCipher(text, key, true);
                result = base64Encode(result);
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
            keyUsed: key || '3'
        };
        
        // Save to history
        saveToHistory({
            method: method.toUpperCase(),
            dataType: 'Teks',
            size: new Blob([result]).size,
            operation: 'encrypt'
        });
        
        showResultModal();
        
    } catch (error) {
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
    
    if ((method === 'aes' || method === 'xor') && !key) {
        showToast(AppConfig.MESSAGES.ERRORS.NO_KEY, 'error');
        return;
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
        let allResults = [];
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const reader = new FileReader();
            
            const result = await new Promise((resolve, reject) => {
                reader.onload = async function(e) {
                    try {
                        const content = e.target.result;
                        let result = "";
                        
                        // Update progress
                        showProgress('file', ((i / files.length) * 100));
                        
                        switch(method) {
                            case 'base64':
                                result = btoa(content);
                                break;
                            case 'aes':
                                const base64Content = btoa(content);
                                result = await aesEncrypt(base64Content, key);
                                if (!result) throw new Error(AppConfig.MESSAGES.ERRORS.AES_FAILED);
                                break;
                            case 'xor':
                                result = xorCipher(content, key, true);
                                result = btoa(result);
                                break;
                            default:
                                throw new Error('Unknown method');
                        }
                        
                        resolve({
                            name: file.name,
                            content: result,
                            size: file.size
                        });
                    } catch (error) {
                        reject(error);
                    }
                };
                
                reader.onerror = function() {
                    reject(new Error('Failed to read file'));
                };
                
                reader.readAsBinaryString(file);
            });
            
            allResults.push(result);
        }
        
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
                keyUsed: key
            };
            
            encryptedFileData = allResults[0].content;
            encryptedFileName = allResults[0].name + '.encrypted';
        } else {
            // Multiple files - create archive
            const archiveData = JSON.stringify(allResults);
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
        
        // Save to history
        saveToHistory({
            method: method.toUpperCase(),
            dataType: files.length === 1 ? 'File' : 'Multiple Files',
            size: new Blob([encryptedFileData]).size,
            operation: 'encrypt'
        });
        
        showResultModal();
        
    } catch (error) {
        showToast(`Error: ${error.message}`, 'error');
        hideProgress('file');
    }
});

// ==================== DEKRIPSI DATA ====================
document.getElementById('decrypt-btn').addEventListener('click', async () => {
    const key = document.getElementById('decryption-key').value;
    const fileInput = document.getElementById('decrypt-file-input');
    const textInput = document.getElementById('decrypt-input').value.trim();
    
    let data = textInput;
    let isFile = false;
    let fileName = '';
    
    if (fileInput.files.length) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = async function(e) {
            try {
                const fileContent = e.target.result;
                await performAutoDecryption(fileContent, key, file.name, true);
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
    
    if (!data) {
        showToast('Enter encrypted data or select file', 'error');
        return;
    }
    
    await performAutoDecryption(data, key, '', false);
});

async function performAutoDecryption(data, key, fileName = '', isFile = false) {
    showProgress('decrypt', 0);
    const startTime = performance.now();
    
    try {
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 10;
            showProgress('decrypt', progress);
        }, AppConfig.UI.PROGRESS_INTERVAL);
        
        const detection = detectEncryptionMethod(data, key);
        let result = "";
        let methodUsed = detection.method;
        
        switch(detection.method) {
            case 'base64':
                result = base64Decode(data);
                if (!result) throw new Error(AppConfig.MESSAGES.ERRORS.INVALID_BASE64);
                break;
            case 'aes':
                if (!key) throw new Error(AppConfig.MESSAGES.ERRORS.NO_KEY);
                result = await aesDecrypt(data, key);
                if (!result) throw new Error(AppConfig.MESSAGES.ERRORS.DECRYPTION_FAILED);
                
                if (isFile && isValidBase64(result)) {
                    try {
                        const binaryString = atob(result);
                        result = `File "${fileName}" decrypted successfully.\n\nSize: ${AppConfig.formatBytes(binaryString.length)}\n\nContent preview:\n${binaryString.substring(0, 200)}...`;
                    } catch (e) {}
                }
                break;
            case 'caesar':
                if (!key) {
                    result = "Trying all Caesar cipher shifts:\n\n";
                    for (let shift = 1; shift <= 25; shift++) {
                        const decrypted = caesarCipher(data, shift.toString(), false);
                        result += `Shift ${shift}: ${decrypted.substring(0, 50)}${decrypted.length > 50 ? '...' : ''}\n`;
                    }
                } else {
                    result = caesarCipher(data, key, false);
                }
                break;
            case 'xor':
                if (!key) throw new Error(AppConfig.MESSAGES.ERRORS.NO_KEY);
                let xorData = data;
                if (isValidBase64(data)) {
                    xorData = atob(data);
                }
                result = xorCipher(xorData, key, false);
                break;
            case 'vigenere':
                if (!key) throw new Error(AppConfig.MESSAGES.ERRORS.NO_KEY);
                result = vigenereCipher(data, key, false);
                break;
            case 'self-destruct':
                try {
                    const selfDestruct = JSON.parse(atob(detection.data));
                    if (Date.now() > selfDestruct.expires) {
                        result = "⚠️ DATA HAS SELF-DESTRUCTED ⚠️\n\nThis data has expired and been destroyed.";
                    } else {
                        const remaining = Math.ceil((selfDestruct.expires - Date.now()) / (60 * 60 * 1000));
                        result = `Self-destruct data (expires in ${remaining} hours):\n\n${selfDestruct.data}`;
                    }
                } catch (e) {
                    throw new Error('Invalid self-destruct data');
                }
                break;
            default:
                throw new Error('Cannot detect encryption method');
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
        
        // Save to history
        saveToHistory({
            method: methodUsed.toUpperCase(),
            dataType: isFile ? 'File' : 'Teks',
            size: new Blob([result]).size,
            operation: 'decrypt'
        });
        
        showResultModal();
        
    } catch (error) {
        showToast(`Decryption failed: ${error.message}`, 'error');
        hideProgress('decrypt');
    }
}

// ==================== FUNGSI CLOUD ====================
document.getElementById('refresh-cloud-btn').addEventListener('click', () => {
    if (cloudConnected) {
        loadCloudData();
        showToast('Cloud data refreshed', 'success');
    } else {
        showToast('Cloud not connected', 'error');
    }
});

document.getElementById('upload-to-cloud-btn').addEventListener('click', () => {
    if (!encryptionResult) {
        showToast('Encrypt data first', 'warning');
        return;
    }
    
    const metadata = {
        method: encryptionResult.method,
        dataType: encryptionResult.dataType,
        fileName: encryptionResult.fileName,
        size: encryptionResult.originalSize
    };
    
    saveToCloud(encryptionResult.fullResult, metadata);
});

document.getElementById('modal-save-cloud-btn').addEventListener('click', () => {
    if (!encryptionResult) return;
    
    const metadata = {
        method: encryptionResult.method,
        dataType: encryptionResult.dataType,
        fileName: encryptionResult.fileName || 'Encrypted Data',
        size: encryptionResult.originalSize
    };
    
    saveToCloud(encryptionResult.fullResult, metadata);
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
    document.getElementById('file-list').innerHTML = '';
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

// Progress Bars
function showProgress(type, percent) {
    const container = document.getElementById(`${type}-progress`);
    const fill = document.getElementById(`${type}-progress-fill`);
    const text = document.getElementById(`${type}-progress-text`);
    
    container.classList.add('active');
    fill.style.width = `${percent}%`;
    text.textContent = `${Math.round(percent)}%`;
}

function hideProgress(type) {
    document.getElementById(`${type}-progress`).classList.remove('active');
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
    // Remove potentially dangerous characters
    return input
        .replace(/[<>]/g, '') // Remove < and >
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .trim();
}

// Add input sanitization to all text inputs
document.querySelectorAll('input[type="text"], input[type="password"], textarea').forEach(input => {
    input.addEventListener('input', () => {
        const cursorPos = input.selectionStart;
        const oldValue = input.value;
        const newValue = sanitizeInput(oldValue);
        
        if (oldValue !== newValue) {
            input.value = newValue;
            input.setSelectionRange(cursorPos - 1, cursorPos - 1);
        }
    });
});