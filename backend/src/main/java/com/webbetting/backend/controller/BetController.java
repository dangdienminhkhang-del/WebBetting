package com.webbetting.backend.controller;

import com.webbetting.backend.model.BetHistory;
import com.webbetting.backend.service.BetService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bet")
@CrossOrigin(origins = "*")
public class BetController {

    @Autowired
    private BetService betService;

    @PostMapping("/place")
    public BetHistory placeBet(@RequestBody Map<String, Object> payload) {
        Long userId = Long.valueOf(payload.get("userId").toString());
        Long amount = Long.valueOf(payload.get("amount").toString());
        String game = payload.get("game").toString();
        boolean win = Boolean.parseBoolean(payload.get("win").toString());

        return betService.placeBet(userId, amount, game, win);
    }
    @GetMapping("/history/{userId}")
    public List<BetHistory> getHistory(@PathVariable Long userId) {
        return betService.getHistoryByUserId(userId);
    }
    @PostMapping("/taixiu")
    public Map<String, Object> placeTaiXiuBet(@RequestBody Map<String, Object> payload) {
        Long userId = Long.valueOf(payload.get("userId").toString());
        
        // ⭐ CHỈ NHẬN SỐ NGUYÊN
        Long amount;
        Object amountObj = payload.get("amount");
        
        if (amountObj instanceof Integer) {
            amount = ((Integer) amountObj).longValue();
        } else if (amountObj instanceof Double) {
            // Nếu frontend gửi số thập phân, làm tròn thành số nguyên
            Double doubleValue = (Double) amountObj;
            amount = doubleValue.longValue();
        } else {
            amount = Long.valueOf(amountObj.toString());
        }
        
        String choice = payload.get("choice").toString(); // "TAI" hoặc "XIU"
        
        return betService.placeTaiXiuBet(userId, amount, choice);
    }
    @GetMapping("/stats/{userId}")
    public Map<String, Object> getUserStats(@PathVariable Long userId) {
        return betService.getUserStats(userId);
    }

    @DeleteMapping("/history/delete-filtered")
    public Map<String, Object> deleteFilteredHistory(
            @RequestParam Long userId,
            @RequestParam String game,
            @RequestParam String result) {
        betService.deleteFilteredHistory(userId, game, result);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Đã xóa lịch sử theo bộ lọc");
        return response;
    }
}
