import API from "../services/api";

class CaroService {
  // ✅ THÊM: Gọi API Bet giống Tài Xỉu
  async placeCaroBet(userId, betAmount, difficulty) {
    try {
      const response = await API.post("/bet/caro", {
        userId: userId,
        amount: betAmount,
        difficulty: difficulty
      });
      return response.data;
    } catch (error) {
      console.error('Error placing caro bet:', error);
      throw error;
    }
  }

  async saveGameResult(gameData) {
    try {
        console.log('💾 Saving caro game with data:', {
        betAmount: gameData.betAmount,
        winAmount: gameData.winAmount,
        balanceBefore: gameData.balanceBefore,
        balanceAfter: gameData.balanceAfter,
        gameMovesLength: gameData.gameMoves?.length
      });
      const response = await API.post('/caro/save-game', gameData);
      return response.data;
    } catch (error) {
      console.error('Error saving game result:', error);
      throw error;
    }
  }

  async getGameHistory() {
    try {
      const response = await API.get('/caro/history');
      return response.data;
    } catch (error) {
      console.error('Error fetching game history:', error);
      throw error;
    }
  }

  async getUserStats() {
    try {
      const response = await API.get('/caro/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw error;
    }
  }
    async getGameReplay(gameId) {
    try {
      const response = await API.get(`/caro/games/${gameId}/replay`);
      return response.data;
    } catch (error) {
      console.error('Error fetching game replay:', error);
      throw error;
    }
  }

  // ✅ THÊM: Lấy game public (không cần auth)
  async getPublicGame(gameId) {
    try {
      const response = await API.get(`/caro/games/${gameId}/public`);
      return response.data;
    } catch (error) {
      console.error('Error fetching public game:', error);
      throw error;
    }
  }

}

export default new CaroService();