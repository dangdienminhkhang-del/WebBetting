// utils/gameStorage.js
const STORAGE_KEY = 'caro_auto_save';

export const saveGameToLocal = (gameData) => {
  try {
    const saveData = {
      ...gameData,
      savedAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24h
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
    console.log('💾 [Auto-save] Game saved to localStorage');
    return true;
  } catch (error) {
    console.error('❌ [Auto-save] Failed to save:', error);
    return false;
  }
};

export const loadGameFromLocal = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    
    const gameData = JSON.parse(saved);
    
    // Kiểm tra hết hạn (24h)
    if (gameData.expiresAt < Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    
    console.log('📀 [Auto-save] Game loaded from localStorage');
    return gameData;
  } catch (error) {
    console.error('❌ [Auto-save] Failed to load:', error);
    return null;
  }
};

export const clearAutoSave = () => {
  localStorage.removeItem(STORAGE_KEY);
  console.log('🗑️ [Auto-save] Cleared');
};