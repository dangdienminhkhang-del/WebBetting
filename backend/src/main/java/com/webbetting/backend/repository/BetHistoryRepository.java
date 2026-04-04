package com.webbetting.backend.repository;

import com.webbetting.backend.model.BetHistory;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Map;

public interface BetHistoryRepository extends JpaRepository<BetHistory, Long>, JpaSpecificationExecutor<BetHistory> {

    @Query("SELECT h FROM BetHistory h WHERE h.user.id = :userId ORDER BY h.createdAt DESC")
    List<BetHistory> findHistoryByUser(@Param("userId") Long userId);

    void deleteByUserIdAndResult(Long userId, String result);

    @Query("SELECT h.user.username as username, h.user.nickname as nickname, h.user.avatarUrl as avatarUrl, COUNT(h) as wins " +
           "FROM BetHistory h WHERE h.game = :game AND h.result = 'WIN' AND h.user.isDeleted = false " +
           "GROUP BY h.user.id, h.user.username, h.user.nickname, h.user.avatarUrl ORDER BY wins DESC")
    List<Map<String, Object>> findTopWinnersByGame(@Param("game") String game, Pageable pageable);

    @Query("SELECT COUNT(h) FROM BetHistory h WHERE h.user.id = :userId AND h.game = :game AND h.result = 'WIN'")
    long countWinsByUserIdAndGame(@Param("userId") Long userId, @Param("game") String game);

    @Query("SELECT COUNT(h) FROM BetHistory h WHERE h.user.id = :userId AND h.game = :game AND h.result = 'LOSE'")
    long countLossesByUserIdAndGame(@Param("userId") Long userId, @Param("game") String game);

    @Query("SELECT COUNT(h) FROM BetHistory h WHERE h.user.id = :userId AND h.game = :game")
    long countTotalByUserIdAndGame(@Param("userId") Long userId, @Param("game") String game);
}