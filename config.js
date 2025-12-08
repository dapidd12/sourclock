// ==================== KONFIGURASI APLIKASI SOURCELOCK ====================

const AppConfig = {
    // Konfigurasi Supabase Database (GANTI DENGAN DATA ANDA)
    SUPABASE: {
        URL: 'https://domtvtkwkgbqcbytkaul.supabase.co',
        SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvbXR2dGt3a2dicWNieXRrYXVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTA1OTczNSwiZXhwIjoyMDgwNjM1NzM1fQ.CRDlwwsuKA901sPNzU1qDq7Ij_Oke0sLViGuiaNWCBw',
        TABLE_NAME: 'encrypted_files',
        KEYS_TABLE: 'encryption_keys'
    },
    
    // Konfigurasi Aplikasi
    APP: {
        NAME: 'SourceLock',
        VERSION: '1.0.4', // Versi diperbarui
        DESCRIPTION: 'Platform enkripsi lengkap dengan cloud storage global',
        AUTHOR: 'DAPID & ARYAPIW',
        YEAR: 2023,
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        DEFAULT_ENCRYPTION_METHOD: 'aes',
        DEFAULT_KEY_LENGTH: 32
    },
    
    // Konfigurasi Keamanan - DIPERBAIKI
    SECURITY: {
        AES_SALT: "SourceLockSecureSaltV3",
        AES_ITERATIONS: 100000,
        AES_KEY_LENGTH: 256,
        KEY_STRENGTH_THRESHOLDS: {
            WEAK: 6,
            MEDIUM: 10,
            STRONG: 12
        },
        ALLOWED_METHODS: ['caesar', 'vigenere', 'base64', 'aes', 'xor'],
        // Kunci master untuk mengenkripsi kunci sebelum disimpan ke database
        MASTER_KEY: 'SourceLockMasterKey2023!Secure!',
        // Checksum untuk validasi dekripsi
        CHECKSUM_PREFIX: 'SLOCK_',
        MIN_PLAINTEXT_LENGTH: 3,
        // Validasi kunci minimal
        MIN_KEY_LENGTH: {
            caesar: 1, // Untuk caesar, key adalah angka
            vigenere: 3,
            aes: 8,
            xor: 1,
            base64: 0
        },
        // Base64 security - TANDAI BASE64 DENGAN PREFIX KHUSUS
        BASE64_PREFIX: 'BASE64_SLOCK_',
        BASE64_SUFFIX: '_END'
    },
    
    // Konfigurasi UI/UX
    UI: {
        DEFAULT_THEME: 'light',
        ANIMATION_DURATION: 300,
        TOAST_DURATION: 5000,
        PROGRESS_INTERVAL: 100,
        RUNNING_TEXT_SPEED: 30 // detik
    },
    
    // Konfigurasi Fitur
    FEATURES: {
        CLOUD_STORAGE: true,
        AUTO_DETECTION: true,
        BATCH_PROCESSING: true,
        KEY_STORAGE: true,
        KEY_GENERATOR: true,
        STRICT_DECRYPTION: true,
        SECURE_BASE64: true // Fitur baru: Base64 dengan proteksi
    },
    
    // Konfigurasi Penyimpanan Lokal
    STORAGE_KEYS: {
        THEME: 'sourceLock_theme',
        GUIDE_SHOWN: 'sourceLock_guide_shown'
    },
    
    // Pesan dan Teks
    MESSAGES: {
        ERRORS: {
            NO_TEXT: 'Masukkan teks terlebih dahulu',
            NO_FILE: 'Pilih file terlebih dahulu',
            NO_KEY: 'Kunci enkripsi diperlukan untuk metode ini',
            INVALID_KEY: 'Kunci tidak valid untuk metode ini',
            FILE_TOO_LARGE: 'File terlalu besar (maksimal 10MB)',
            CLOUD_CONNECTION_FAILED: 'Koneksi ke cloud gagal',
            DECRYPTION_FAILED: 'Dekripsi gagal. Pastikan kunci benar.',
            INVALID_BASE64: 'Format Base64 tidak valid',
            AES_FAILED: 'Enkripsi/Dekripsi AES gagal',
            INVALID_KEY_FORMAT: 'Format kunci tidak valid',
            INVALID_CHECKSUM: 'Data rusak atau kunci salah',
            INVALID_CHARACTERS: 'Hasil dekripsi mengandung karakter tidak valid',
            KEY_TOO_SHORT: 'Kunci terlalu pendek. Minimal {length} karakter.',
            BASE64_NO_KEY: 'Base64 membutuhkan kunci untuk keamanan tambahan'
        },
        SUCCESS: {
            ENCRYPTION_COMPLETE: 'Enkripsi berhasil',
            DECRYPTION_COMPLETE: 'Dekripsi berhasil',
            CLOUD_SAVED: 'Data berhasil disimpan ke cloud',
            CLOUD_LOADED: 'Data berhasil dimuat dari cloud',
            COPIED: 'Disalin ke clipboard',
            DOWNLOADED: 'File berhasil diunduh',
            KEY_SAVED: 'Kunci berhasil disimpan ke database'
        },
        WARNINGS: {
            CLOUD_OFFLINE: 'Mode offline. Cloud tidak tersedia.',
            WEAK_KEY: 'Kunci terlalu lemah. Gunakan minimal {length} karakter.',
            PUBLIC_CLOUD: 'File tersedia secara publik di cloud',
            SUSPICIOUS_RESULT: 'Hasil dekripsi mungkin tidak valid',
            BASE64_UNSECURE: 'Base64 tidak aman. Gunakan AES untuk keamanan maksimal.'
        }
    },
    
    // Warna Tema
    COLORS: {
        LIGHT_THEME: {
            primary: '#2c3e50',
            secondary: '#3498db',
            success: '#27ae60',
            danger: '#e74c3c',
            warning: '#f39c12',
            light: '#ecf0f1',
            dark: '#2c3e50',
            gray: '#95a5a6',
            bg: '#f5f7fa',
            card: '#ffffff',
            text: '#333333',
            border: '#ddd',
            shadow: 'rgba(0, 0, 0, 0.1)'
        },
        DARK_THEME: {
            primary: '#3498db',
            secondary: '#2980b9',
            success: '#2ecc71',
            danger: '#e74c3c',
            warning: '#f39c12',
            light: '#34495e',
            dark: '#ecf0f1',
            gray: '#7f8c8d',
            bg: '#1a1a2e',
            card: '#16213e',
            text: '#e6e6e6',
            border: '#2c3e50',
            shadow: 'rgba(0, 0, 0, 0.3)'
        }
    },
    
    // Metode Enkripsi
    ENCRYPTION_METHODS: {
        CAESAR: {
            name: 'Caesar Cipher',
            description: 'Cipher substitusi sederhana dengan pergeseran alfabet',
            defaultKey: '3',
            keyType: 'number',
            minKey: 1,
            maxKey: 25,
            requiresChecksum: true,
            requiresKey: true
        },
        VIGENERE: {
            name: 'Vigenere Cipher',
            description: 'Cipher polyalphabetic yang lebih aman dari Caesar',
            keyType: 'text',
            minLength: 3,
            requiresChecksum: true,
            requiresKey: true
        },
        BASE64: {
            name: 'Base64 Encoding',
            description: 'Encoding binary ke text dengan proteksi tambahan',
            keyType: 'password',
            minLength: 4,
            requiresChecksum: true,
            requiresKey: true, // BASE64 SEKARANG BUTUH KUNCI
            isEncoding: true
        },
        AES: {
            name: 'AES-256',
            description: 'Advanced Encryption Standard - Enkripsi kuat',
            keyType: 'password',
            minLength: 8,
            requiresChecksum: true,
            requiresKey: true
        },
        XOR: {
            name: 'XOR Cipher',
            description: 'Cipher berbasis operasi XOR',
            keyType: 'text',
            minLength: 1,
            requiresChecksum: true,
            requiresKey: true
        }
    },
    
    // Fungsi Helper
    getSupabaseConfig: function() {
        return {
            url: this.SUPABASE.URL,
            serviceKey: this.SUPABASE.SERVICE_ROLE_KEY,
            table: this.SUPABASE.TABLE_NAME,
            keysTable: this.SUPABASE.KEYS_TABLE
        };
    },
    
    validateKeyStrength: function(key) {
        if (!key) return { strength: 0, level: 'none', text: 'Kekuatan: -' };
        
        const length = key.length;
        const { WEAK, MEDIUM, STRONG } = this.SECURITY.KEY_STRENGTH_THRESHOLDS;
        
        if (length < WEAK) {
            return { strength: 33, level: 'weak', text: 'Kekuatan: Lemah' };
        } else if (length < MEDIUM) {
            return { strength: 66, level: 'medium', text: 'Kekuatan: Sedang' };
        } else if (length < STRONG) {
            return { strength: 90, level: 'good', text: 'Kekuatan: Baik' };
        } else {
            return { strength: 100, level: 'strong', text: 'Kekuatan: Kuat' };
        }
    },
    
    validateKeyForMethod: function(key, method) {
        const minLength = this.SECURITY.MIN_KEY_LENGTH[method];
        const methodInfo = this.getMethodInfo(method);
        
        // Periksa apakah metode memerlukan kunci
        if (methodInfo.requiresKey && !key) {
            return this.MESSAGES.ERRORS.NO_KEY;
        }
        
        if (method === 'caesar') {
            // Untuk caesar, key harus angka
            const num = parseInt(key);
            if (isNaN(num)) return 'Kunci harus angka untuk Caesar Cipher';
            if (num < 1 || num > 25) return 'Kunci harus antara 1-25 untuk Caesar Cipher';
            return null;
        }
        
        if (minLength > 0 && key.length < minLength) {
            return `Kunci terlalu pendek. Minimal ${minLength} karakter.`;
        }
        
        return null;
    },
    
    formatBytes: function(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },
    
    getMethodInfo: function(method) {
        return this.ENCRYPTION_METHODS[method.toUpperCase()] || this.ENCRYPTION_METHODS.AES;
    },
    
    // Fungsi untuk mengenkripsi kunci sebelum disimpan ke database
    encryptKey: async function(key) {
        try {
            // Gunakan XOR dengan master key untuk mengenkripsi kunci
            let encrypted = '';
            const masterKey = this.SECURITY.MASTER_KEY;
            
            for (let i = 0; i < key.length; i++) {
                const charCode = key.charCodeAt(i) ^ masterKey.charCodeAt(i % masterKey.length);
                encrypted += String.fromCharCode(charCode);
            }
            
            // Tambahkan checksum
            const checksum = this.generateChecksum(key);
            encrypted = checksum + '|' + encrypted;
            
            // Encode ke base64
            return btoa(encodeURIComponent(encrypted));
        } catch (error) {
            console.error('Error encrypting key:', error);
            return null;
        }
    },
    
    // Fungsi untuk mendekripsi kunci dari database
    decryptKey: async function(encryptedKey) {
        try {
            // Decode dari base64
            const decoded = decodeURIComponent(atob(encryptedKey));
            const parts = decoded.split('|');
            
            if (parts.length !== 2) {
                throw new Error('Invalid key format');
            }
            
            const [checksum, encrypted] = parts;
            const masterKey = this.SECURITY.MASTER_KEY;
            let decrypted = '';
            
            for (let i = 0; i < encrypted.length; i++) {
                const charCode = encrypted.charCodeAt(i) ^ masterKey.charCodeAt(i % masterKey.length);
                decrypted += String.fromCharCode(charCode);
            }
            
            // Validasi checksum
            const expectedChecksum = this.generateChecksum(decrypted);
            if (checksum !== expectedChecksum) {
                throw new Error('Key checksum validation failed');
            }
            
            return decrypted;
        } catch (error) {
            console.error('Error decrypting key:', error);
            return null;
        }
    },
    
    // Generate checksum untuk validasi
    generateChecksum: function(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return this.SECURITY.CHECKSUM_PREFIX + Math.abs(hash).toString(16).substring(0, 8);
    },
    
    // Validasi teks hasil dekripsi - DIPERBAIKI
    isValidDecryptedText: function(text) {
        if (!text || text.length < this.SECURITY.MIN_PLAINTEXT_LENGTH) {
            return false;
        }
        
        // Cek karakter yang tidak valid (control characters)
        const invalidPattern = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
        if (invalidPattern.test(text)) {
            return false;
        }
        
        // Untuk file, bisa mengandung berbagai karakter
        // Hanya validasi karakter kontrol saja
        return true;
    },
    
    // Tambahkan checksum ke data sebelum enkripsi
    addChecksum: function(text) {
        const checksum = this.generateChecksum(text);
        return checksum + '|' + text;
    },
    
    // Validasi dan hapus checksum dari data terdekripsi
    validateAndRemoveChecksum: function(text) {
        if (!text.includes('|')) {
            throw new Error('No checksum found');
        }
        
        const parts = text.split('|');
        if (parts.length < 2) {
            throw new Error('Invalid checksum format');
        }
        
        const checksum = parts[0];
        const data = parts.slice(1).join('|');
        
        if (!checksum.startsWith(this.SECURITY.CHECKSUM_PREFIX)) {
            throw new Error('Invalid checksum prefix');
        }
        
        const expectedChecksum = this.generateChecksum(data);
        if (checksum !== expectedChecksum) {
            throw new Error('Checksum validation failed');
        }
        
        return data;
    },
    
    // Fungsi baru: Enkripsi Base64 yang aman dengan proteksi
    secureBase64Encode: function(text, key) {
        try {
            // Tambahkan checksum
            const dataWithChecksum = this.addChecksum(text);
            
            // XOR dengan kunci sebelum encode
            let processed = '';
            if (key && key.length > 0) {
                for (let i = 0; i < dataWithChecksum.length; i++) {
                    const charCode = dataWithChecksum.charCodeAt(i) ^ key.charCodeAt(i % key.length);
                    processed += String.fromCharCode(charCode);
                }
            } else {
                processed = dataWithChecksum;
            }
            
            // Encode ke base64
            const base64 = btoa(encodeURIComponent(processed));
            
            // Tambahkan prefix dan suffix untuk identifikasi
            return this.SECURITY.BASE64_PREFIX + base64 + this.SECURITY.BASE64_SUFFIX;
            
        } catch (error) {
            console.error('Secure Base64 encoding error:', error);
            return null;
        }
    },
    
    // Fungsi baru: Dekode Base64 yang aman dengan proteksi
    secureBase64Decode: function(base64Text, key) {
        try {
            // Hapus prefix dan suffix
            if (base64Text.startsWith(this.SECURITY.BASE64_PREFIX) && 
                base64Text.endsWith(this.SECURITY.BASE64_SUFFIX)) {
                
                const cleanBase64 = base64Text.substring(
                    this.SECURITY.BASE64_PREFIX.length,
                    base64Text.length - this.SECURITY.BASE64_SUFFIX.length
                );
                
                // Decode dari base64
                const decoded = decodeURIComponent(atob(cleanBase64));
                
                // XOR dengan kunci jika ada
                let processed = decoded;
                if (key && key.length > 0) {
                    processed = '';
                    for (let i = 0; i < decoded.length; i++) {
                        const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
                        processed += String.fromCharCode(charCode);
                    }
                }
                
                // Validasi dan hapus checksum
                return this.validateAndRemoveChecksum(processed);
                
            } else {
                // Ini Base64 biasa tanpa proteksi
                throw new Error('Base64 tanpa proteksi - butuh metode lain');
            }
            
        } catch (error) {
            console.error('Secure Base64 decoding error:', error);
            return null;
        }
    },
    
    // Deteksi apakah Base64 memiliki proteksi
    hasBase64Protection: function(text) {
        return text.startsWith(this.SECURITY.BASE64_PREFIX) && 
               text.endsWith(this.SECURITY.BASE64_SUFFIX);
    }
};

// Ekspor konfigurasi untuk digunakan di file lain
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppConfig;
} else {
    window.AppConfig = AppConfig;
}