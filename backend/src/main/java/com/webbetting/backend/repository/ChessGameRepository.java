package com.webbetting.backend.repository;

import com.webbetting.backend.model.ChessGame;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Map;

public interface ChessGameRepository extends JpaRepository<ChessGame, Long>, JpaSpecificationExecutor<ChessGame> {
    List<ChessGame> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    @Query("SELECT COUNT(g) FROM ChessGame g WHERE g.user.id = :userId AND g.status = 'IN_PROGRESS'")
    int countActiveGamesByUserId(@Param("userId") Long userId);

    ChessGame findTopByUserIdAndStatusOrderByCreatedAtDesc(Long userId, String status);

    @Modifying
    @Query("DELETE FROM ChessGame g WHERE g.user.id = :userId AND (:result IS NULL OR g.gameResult = :result)")
    void deleteByUserIdAndResult(@Param("userId") Long userId, @Param("result") String result);

    @Query("SELECT g.user.username as username, g.user.nickname as nickname, g.user.avatarUrl as avatarUrl, COUNT(g) as wins " +
           "FROM ChessGame g WHERE g.gameResult = 'WIN' AND g.user.isDeleted = false " +
           "GROUP BY g.user.id, g.user.username, g.user.nickname, g.user.avatarUrl ORDER BY wins DESC")
    List<Map<String, Object>> findTopWinners(Pageable pageable);

    @Query("SELECT COUNT(g) FROM ChessGame g WHERE g.user.id = :userId AND g.gameResult = 'WIN'")
    long countWinsByUserId(@Param("userId") Long userId);

    @Query("SELECT COUNT(g) FROM ChessGame g WHERE g.user.id = :userId AND g.gameResult = 'LOSE'")
    long countLossesByUserId(@Param("userId") Long userId);

    @Query("SELECT COUNT(g) FROM ChessGame g WHERE g.user.id = :userId AND g.gameResult = 'DRAW'")
    long countDrawsByUserId(@Param("userId") Long userId);

    @Query("SELECT COUNT(g) FROM ChessGame g WHERE g.user.id = :userId AND g.status = 'FINISHED'")
    long countTotalByUserId(@Param("userId") Long userId);
}
