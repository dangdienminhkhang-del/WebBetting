// File: src/services/betService.js
import API from "./api";

const betService = {
  getBetHistory: async (userId) => {
    try {
      const response = await API.get(`/bet/history/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching bet history:', error);
      throw error;
    }
  },

  getUserStats: async (userId) => {
    try {
      const response = await API.get(`/bet/stats/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw error;
    }
  }
};

export default betService;