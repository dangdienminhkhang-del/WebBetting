package com.webbetting.backend.controller;

import com.webbetting.backend.dto.*;
import com.webbetting.backend.model.User;import com.webbetting.backend.service.AdminService;
import com.webbetting.backend.service.ExportService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private AdminService adminService;

    @Autowired
    private ExportService exportService;

    // ========== USER MANAGEMENT ==========

    @PutMapping("/users/{id}/lock")
    public ResponseEntity<UserSummaryDto> lockUser(@PathVariable Long id, @RequestParam boolean active) {
        UserSummaryDto userDto = adminService.lockUser(id, active);
        return ResponseEntity.ok(userDto);
    }

    @GetMapping("/users")
    public ResponseEntity<Page<UserSummaryDto>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) Long minBalance,
            @RequestParam(required = false) Long maxBalance) {
        Page<UserSummaryDto> users = adminService.getUsers(page, size, keyword, active, minBalance, maxBalance);
        return ResponseEntity.ok(users);
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        adminService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    // ========== BALANCE MANAGEMENT ==========

    @PostMapping("/users/{id}/topup")
    public ResponseEntity<Map<String, String>> topUp(@PathVariable Long id, @Valid @RequestBody TopUpRequest request) {
        adminService.topUp(id, request.getAmount(), "ADMIN");
        return ResponseEntity.ok(Map.of("message", "Top up successful"));
    }

    @PutMapping("/users/{id}/set-balance")
    public ResponseEntity<Map<String, String>> setBalance(@PathVariable Long id, @Valid @RequestBody SetBalanceRequest request) {
        adminService.setUserBalance(id, request.getBalance());
        return ResponseEntity.ok(Map.of("message", "Balance updated successfully"));
    }

    @PostMapping("/users/{id}/reset-balance")
    public ResponseEntity<Map<String, String>> resetBalance(@PathVariable Long id) {
        adminService.resetUserBalance(id);
        return ResponseEntity.ok(Map.of("message", "Balance reset to default"));
    }

    // ========== DASHBOARD & STATS ==========

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboard() {
        return ResponseEntity.ok(adminService.getDashboardStats());
    }

    @GetMapping("/stats/user-stats")
    public ResponseEntity<Map<String, Object>> getUserStats() {
        return ResponseEntity.ok(adminService.getUserStatistics());
    }

    // ========== EXPORT FUNCTIONS ==========

    @GetMapping("/export/users")
    public void exportUsers(
            HttpServletResponse response,
            @RequestParam(defaultValue = "csv") String format,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean active) throws IOException {

        List<User> users = adminService.getFilteredUsersForExport(keyword, active);

        if ("xlsx".equalsIgnoreCase(format)) {
            response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            response.setHeader("Content-Disposition", "attachment; filename=users.xlsx");
            exportService.exportUsersToExcel(response.getOutputStream(), users);
        } else {
            response.setContentType("text/csv; charset=UTF-8");
            response.setCharacterEncoding("UTF-8");
            response.setHeader("Content-Disposition", "attachment; filename=users.csv");
            exportService.exportUsersToCsv(response.getWriter(), users);
        }
    }

    // ========== GAME MANAGEMENT ==========

    @GetMapping("/bets")
    public ResponseEntity<Page<BetHistoryDto>> getAllBets(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String game,
            @RequestParam(required = false) String result,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String dateTo) {
        return ResponseEntity.ok(adminService.getAllBetHistory(page, size, game, result, username, date, dateTo));
    }

    @GetMapping("/caro-games")
    public ResponseEntity<Page<CaroGameDto>> getAllCaroGames(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String result,
            @RequestParam(required = false) String opponentType,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String dateTo) {
        return ResponseEntity.ok(adminService.getAllCaroGames(page, size, username, result, opponentType, date, dateTo));
    }

    @GetMapping("/chess-games")
    public ResponseEntity<Page<ChessGameDto>> getAllChessGames(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String result,
            @RequestParam(required = false) String difficulty,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String dateTo) {
        return ResponseEntity.ok(adminService.getAllChessGames(page, size, username, result, difficulty, date, dateTo));
    }

    @GetMapping("/topup-history")
    public ResponseEntity<Page<TopUpHistoryDto>> getAllTopUpHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String createdBy,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String dateTo) {
        return ResponseEntity.ok(adminService.getAllTopUpHistory(page, size, username, createdBy, date, dateTo));
    }

    @GetMapping("/action-logs")
    public ResponseEntity<Page<AdminActionLogDto>> getActionLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String dateTo) {
        return ResponseEntity.ok(adminService.getAdminActionLogs(page, size, action, date, dateTo));
    }
}
