// ==================== KONFIGURASI APLIKASI SOURCELOCK ====================

const AppConfig = {
    // Konfigurasi Supabase Database
    SUPABASE: {
        URL: 'https://your-project.supabase.co', // Ganti dengan URL Supabase Anda
        ANON_KEY: 'your-anon-key', // Ganti dengan API Key Anda
        TABLE_NAME: 'encrypted_data',
        SCHEMA: 'public'
    },
    
    // Konfigurasi Aplikasi
    APP: {
        NAME: 'SourceLock',
        VERSION: '1.0.0',
        DESCRIPTION: 'Platform enkripsi lengkap dengan cloud storage',
        AUTHOR: 'DAPID & ARYAPIW',
        YEAR: 2023,
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
        MAX_HISTORY_ITEMS: 50,
        DEFAULT_ENCRYPTION_METHOD: 'aes',
        DEFAULT_KEY_LENGTH: 32
    },
    
    // Konfigurasi Keamanan
    SECURITY: {
        AES_SALT: "SourceLockSecureSalt",
        AES_ITERATIONS: 100000,
        AES_KEY_LENGTH: 256,
        KEY_STRENGTH_THRESHOLDS: {
            WEAK: 6,
            MEDIUM: 10,
            STRONG: 12
        },
        ALLOWED_METHODS: ['caesar', 'vigenere', 'base64', 'aes', 'xor']
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
        SELF_DESTRUCT: true,
        HISTORY_MANAGEMENT: true,
        KEY_GENERATOR: true
    },
    
    // Konfigurasi Penyimpanan Lokal
    STORAGE_KEYS: {
        HISTORY: 'sourceLock_history',
        THEME: 'sourceLock_theme',
        GUIDE_SHOWN: 'sourceLock_guide_shown',
        SETTINGS: 'sourceLock_settings'
    },
    
    // Pesan dan Teks
    MESSAGES: {
        ERRORS: {
            NO_TEXT: 'Masukkan teks terlebih dahulu',
            NO_FILE: 'Pilih file terlebih dahulu',
            NO_KEY: 'Kunci enkripsi diperlukan untuk metode ini',
            FILE_TOO_LARGE: 'File terlalu besar (maksimal 10MB)',
            CLOUD_CONNECTION_FAILED: 'Koneksi ke cloud gagal',
            DECRYPTION_FAILED: 'Dekripsi gagal. Pastikan kunci benar.',
            INVALID_BASE64: 'Format Base64 tidak valid',
            AES_FAILED: 'Enkripsi/Dekripsi AES gagal'
        },
        SUCCESS: {
            ENCRYPTION_COMPLETE: 'Enkripsi berhasil',
            DECRYPTION_COMPLETE: 'Dekripsi berhasil',
            CLOUD_SAVED: 'Data berhasil disimpan ke cloud',
            CLOUD_LOADED: 'Data berhasil dimuat dari cloud',
            COPIED: 'Disalin ke clipboard',
            DOWNLOADED: 'File berhasil diunduh'
        },
        WARNINGS: {
            CLOUD_OFFLINE: 'Mode offline. Cloud tidak tersedia.',
            WEAK_KEY: 'Kunci terlalu lemah. Gunakan minimal 8 karakter.',
            SELF_DESTRUCT_EXPIRED: 'Data telah hancur sendiri'
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
            maxKey: 25
        },
        VIGENERE: {
            name: 'Vigenere Cipher',
            description: 'Cipher polyalphabetic yang lebih aman dari Caesar',
            keyType: 'text',
            minLength: 3
        },
        BASE64: {
            name: 'Base64 Encoding',
            description: 'Encoding binary ke text, bukan enkripsi sebenarnya',
            keyType: 'none'
        },
        AES: {
            name: 'AES-256',
            description: 'Advanced Encryption Standard - Enkripsi kuat',
            keyType: 'password',
            minLength: 8
        },
        XOR: {
            name: 'XOR Cipher',
            description: 'Cipher berbasis operasi XOR',
            keyType: 'text'
        }
    },
    
    // Fungsi Helper
    getSupabaseConfig: function() {
        return {
            url: this.SUPABASE.URL,
            key: this.SUPABASE.ANON_KEY,
            table: this.SUPABASE.TABLE_NAME
        };
    },
    
    getDefaultSettings: function() {
        return {
            theme: this.UI.DEFAULT_THEME,
            defaultMethod: this.APP.DEFAULT_ENCRYPTION_METHOD,
            autoDetect: this.FEATURES.AUTO_DETECTION,
            saveHistory: this.FEATURES.HISTORY_MANAGEMENT,
            maxFileSize: this.APP.MAX_FILE_SIZE
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
    }
};

// Ekspor konfigurasi untuk digunakan di file lain
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppConfig;
} else {
    window.AppConfig = AppConfig;
}