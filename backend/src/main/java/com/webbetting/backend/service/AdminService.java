package com.webbetting.backend.service;

import com.webbetting.backend.dto.AdminActionLogDto;
import com.webbetting.backend.dto.BetHistoryDto;
import com.webbetting.backend.dto.CaroGameDto;
import com.webbetting.backend.dto.ChessGameDto;
import com.webbetting.backend.dto.TopUpHistoryDto;
import com.webbetting.backend.dto.UserSummaryDto;
import com.webbetting.backend.model.*;
import com.webbetting.backend.repository.*;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Predicate;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AdminService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BetHistoryRepository betHistoryRepository;

    @Autowired
    private CaroGameRepository caroGameRepository;

    @Autowired
    private AdminActionLogRepository adminActionLogRepository;

    @Autowired
    private ChessGameRepository chessGameRepository;

    @Autowired
    private TopUpHistoryRepository topUpHistoryRepository;

    @Autowired
    private TransactionService transactionService;

    private User getCurrentAdmin() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Admin user not found in security context"));
    }

    private void logAdminAction(String action, Long targetUserId, Long amount, String description) {
        User admin = getCurrentAdmin();
        AdminActionLog log = new AdminActionLog(admin.getId(), action, targetUserId, amount, description);
        adminActionLogRepository.save(log);
    }

    // ========== USER MANAGEMENT ==========

    @Transactional
    public UserSummaryDto lockUser(Long userId, boolean active) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setActive(active);
        user.setLockedAt(active ? null : LocalDateTime.now());
        userRepository.save(user);
        logAdminAction(active ? "UNLOCK_USER" : "LOCK_USER", userId, null, "User active status set to " + active);
        return new UserSummaryDto(user);
    }

    public Page<UserSummaryDto> getUsers(int page, int size, String keyword, Boolean active, Long minBalance, Long maxBalance) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        Specification<User> spec = (root, query, cb) -> {
            Predicate p = cb.equal(root.get("isDeleted"), false);
            if (keyword != null && !keyword.isBlank()) {
                p = cb.and(p, cb.or(
                        cb.like(cb.lower(root.get("username")), "%" + keyword.toLowerCase() + "%"),
                        cb.like(cb.lower(root.get("nickname")), "%" + keyword.toLowerCase() + "%")
                ));
            }
            if (active != null) {
                p = cb.and(p, cb.equal(root.get("isActive"), active));
            }
            if (minBalance != null) {
                p = cb.and(p, cb.greaterThanOrEqualTo(root.get("balance"), minBalance));
            }
            if (maxBalance != null) {
                p = cb.and(p, cb.lessThanOrEqualTo(root.get("balance"), maxBalance));
            }
            return p;
        };
        return userRepository.findAll(spec, pageable).map(UserSummaryDto::new);
    }

    @Transactional
    public void deleteUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setDeleted(true);
        userRepository.save(user);
        logAdminAction("DELETE_USER", userId, null, "Soft deleted user");
    }

    // ========== BALANCE MANAGEMENT ==========

    @Transactional
    public void topUp(Long userId, long amount, String adminName) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Amount must be positive");
        }
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        long before = user.getBalance();
        long after = before + amount;
        user.setBalance(after);
        userRepository.save(user);
        transactionService.createTransaction(user, TransactionType.TOPUP, amount, before, after);
        logAdminAction("TOP_UP", userId, amount, "Topped up " + amount + " for user " + user.getUsername());
    }

    @Transactional
    public void setUserBalance(Long userId, long newBalance) {
        if (newBalance < 0) {
            throw new IllegalArgumentException("Balance cannot be negative");
        }
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        long oldBalance = user.getBalance();
        user.setBalance(newBalance);
        userRepository.save(user);
        transactionService.createTransaction(user, TransactionType.SET, newBalance - oldBalance, oldBalance, newBalance);
        logAdminAction("SET_BALANCE", userId, newBalance, "Set balance to " + newBalance + " for user " + user.getUsername());
    }

    @Transactional
    public void resetUserBalance(Long userId) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        long oldBalance = user.getBalance();
        long defaultBalance = 1000L;
        user.setBalance(defaultBalance);
        userRepository.save(user);
        transactionService.createTransaction(user, TransactionType.RESET, defaultBalance - oldBalance, oldBalance, defaultBalance);
        logAdminAction("RESET_BALANCE", userId, defaultBalance, "Reset balance to default for user " + user.getUsername());
    }

    // ========== DASHBOARD & STATS ==========

    public Map<String, Object> getDashboardStats() {
        // Dùng COUNT query thay vì load toàn bộ users vào memory
        long totalUsers = userRepository.countActive();
        long activeUsers = userRepository.countActiveUsers();
        long lockedUsers = userRepository.countLockedUsers();
        long totalBalance = userRepository.sumBalance();
        long totalBets = betHistoryRepository.count();
        long totalCaroGames = caroGameRepository.count();

        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);
        Specification<BetHistory> todaySpec = (root, query, cb) ->
                cb.between(root.get("createdAt"), startOfDay, endOfDay);
        long todayBets = betHistoryRepository.count(todaySpec);

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", totalUsers);
        stats.put("activeUsers", activeUsers);
        stats.put("lockedUsers", lockedUsers);
        stats.put("totalBalance", totalBalance);
        stats.put("totalBets", totalBets);
        stats.put("todayBets", todayBets);
        stats.put("totalCaroGames", totalCaroGames);
        stats.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        return stats;
    }

    public Map<String, Object> getUserStatistics() {
        List<User> users = userRepository.findAll().stream().filter(u -> !u.isDeleted()).toList();
        Map<String, Long> roleCount = users.stream().collect(java.util.stream.Collectors.groupingBy(User::getRole, java.util.stream.Collectors.counting()));
        Map<String, Long> activityCount = users.stream().collect(java.util.stream.Collectors.groupingBy(u -> u.isActive() ? "ACTIVE" : "INACTIVE", java.util.stream.Collectors.counting()));
        double avgBalance = users.stream().mapToLong(User::getBalance).average().orElse(0.0);

        return Map.of(
                "byRole", roleCount,
                "byActivity", activityCount,
                "averageBalance", Math.round(avgBalance * 100.0) / 100.0
        );
    }

    // ========== EXPORT & GAME MANAGEMENT ==========

    public List<User> getAllUsersForExport() {
        return userRepository.findAll().stream().filter(u -> !u.isDeleted()).toList();
    }

    public List<User> getFilteredUsersForExport(String keyword, Boolean active) {
        Specification<User> spec = (root, query, cb) -> {
            Predicate p = cb.equal(root.get("isDeleted"), false);
            if (keyword != null && !keyword.isBlank()) {
                p = cb.and(p, cb.or(
                        cb.like(cb.lower(root.get("username")), "%" + keyword.toLowerCase() + "%"),
                        cb.like(cb.lower(root.get("nickname")), "%" + keyword.toLowerCase() + "%")
                ));
            }
            if (active != null) {
                p = cb.and(p, cb.equal(root.get("isActive"), active));
            }
            return p;
        };
        return userRepository.findAll(spec);
    }

    public Page<BetHistoryDto> getAllBetHistory(int page, int size, String game, String result, String username, String dateFrom, String dateTo) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Specification<BetHistory> spec = (root, query, cb) -> {
            Predicate p = cb.conjunction();
            if (game != null && !game.isBlank())
                p = cb.and(p, cb.equal(root.get("game"), game));
            if (result != null && !result.isBlank())
                p = cb.and(p, cb.equal(root.get("result"), result));
            if (username != null && !username.isBlank())
                p = cb.and(p, cb.like(cb.lower(root.get("user").get("username")), "%" + username.toLowerCase() + "%"));
            if (dateFrom != null && !dateFrom.isBlank()) {
                LocalDateTime start = LocalDate.parse(dateFrom).atStartOfDay();
                LocalDateTime end = (dateTo != null && !dateTo.isBlank())
                        ? LocalDate.parse(dateTo).atStartOfDay().plusDays(1)
                        : start.plusDays(1);
                p = cb.and(p, cb.between(root.get("createdAt"), start, end));
            }
            return p;
        };
        return betHistoryRepository.findAll(spec, pageable).map(BetHistoryDto::new);
    }

    public Page<CaroGameDto> getAllCaroGames(int page, int size, String username, String result, String opponentType, String dateFrom, String dateTo) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("finishedAt").descending());
        Specification<CaroGame> spec = (root, query, cb) -> {
            Predicate p = cb.conjunction();
            if (username != null && !username.isBlank())
                p = cb.and(p, cb.like(cb.lower(root.get("user").get("username")), "%" + username.toLowerCase() + "%"));
            if (result != null && !result.isBlank())
                p = cb.and(p, cb.equal(root.get("gameResult"), result));
            if (opponentType != null && !opponentType.isBlank())
                p = cb.and(p, cb.equal(root.get("opponentType"), opponentType));
            if (dateFrom != null && !dateFrom.isBlank()) {
                LocalDateTime start = LocalDate.parse(dateFrom).atStartOfDay();
                LocalDateTime end = (dateTo != null && !dateTo.isBlank())
                        ? LocalDate.parse(dateTo).atStartOfDay().plusDays(1)
                        : start.plusDays(1);
                p = cb.and(p, cb.between(root.get("finishedAt"), start, end));
            }
            return p;
        };
        return caroGameRepository.findAll(spec, pageable).map(CaroGameDto::new);
    }

    public Page<ChessGameDto> getAllChessGames(int page, int size, String username, String result, String difficulty, String dateFrom, String dateTo) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Specification<ChessGame> spec = (root, query, cb) -> {
            Predicate p = cb.conjunction();
            if (username != null && !username.isBlank())
                p = cb.and(p, cb.like(cb.lower(root.get("user").get("username")), "%" + username.toLowerCase() + "%"));
            if (result != null && !result.isBlank())
                p = cb.and(p, cb.equal(root.get("gameResult"), result));
            if (difficulty != null && !difficulty.isBlank())
                p = cb.and(p, cb.equal(root.get("difficulty"), difficulty));
            if (dateFrom != null && !dateFrom.isBlank()) {
                LocalDateTime start = LocalDate.parse(dateFrom).atStartOfDay();
                LocalDateTime end = (dateTo != null && !dateTo.isBlank())
                        ? LocalDate.parse(dateTo).atStartOfDay().plusDays(1)
                        : start.plusDays(1);
                p = cb.and(p, cb.between(root.get("createdAt"), start, end));
            }
            return p;
        };
        return chessGameRepository.findAll(spec, pageable).map(ChessGameDto::new);
    }

    public Page<TopUpHistoryDto> getAllTopUpHistory(int page, int size, String username, String createdBy, String dateFrom, String dateTo) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Specification<TopUpHistory> spec = (root, query, cb) -> {
            Predicate p = cb.conjunction();
            if (username != null && !username.isBlank())
                p = cb.and(p, cb.like(cb.lower(root.get("user").get("username")), "%" + username.toLowerCase() + "%"));
            if (createdBy != null && !createdBy.isBlank())
                p = cb.and(p, cb.equal(root.get("createdBy"), createdBy));
            if (dateFrom != null && !dateFrom.isBlank()) {
                LocalDateTime start = LocalDate.parse(dateFrom).atStartOfDay();
                LocalDateTime end = (dateTo != null && !dateTo.isBlank())
                        ? LocalDate.parse(dateTo).atStartOfDay().plusDays(1)
                        : start.plusDays(1);
                p = cb.and(p, cb.between(root.get("createdAt"), start, end));
            }
            return p;
        };
        return topUpHistoryRepository.findAll(spec, pageable).map(TopUpHistoryDto::new);
    }

    public Page<AdminActionLogDto> getAdminActionLogs(int page, int size, String action, String dateFrom, String dateTo) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("timestamp").descending());
        Specification<AdminActionLog> spec = (root, query, cb) -> {
            Predicate p = cb.conjunction();
            if (action != null && !action.isBlank())
                p = cb.and(p, cb.equal(root.get("action"), action));
            if (dateFrom != null && !dateFrom.isBlank()) {
                LocalDateTime start = LocalDate.parse(dateFrom).atStartOfDay();
                LocalDateTime end = (dateTo != null && !dateTo.isBlank())
                        ? LocalDate.parse(dateTo).atStartOfDay().plusDays(1)
                        : start.plusDays(1);
                p = cb.and(p, cb.between(root.get("timestamp"), start, end));
            }
            return p;
        };
        return adminActionLogRepository.findAll(spec, pageable).map(AdminActionLogDto::new);
    }
}
