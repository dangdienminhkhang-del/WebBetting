package com.webbetting.backend.repository;

import com.webbetting.backend.model.CaroGame;
import com.webbetting.backend.model.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Repository
public interface CaroGameRepository extends JpaRepository<CaroGame, Long>, JpaSpecificationExecutor<CaroGame> {

    List<CaroGame> findByUserOrderByFinishedAtDesc(User user);

    CaroGame findTopByUserIdAndStatusOrderByCreatedAtDesc(Long userId, String status);

    @Query("SELECT COUNT(c) FROM CaroGame c WHERE c.user = :user AND c.gameResult = 'WIN'")
    Long countWinsByUser(@Param("user") User user);

    @Query("SELECT COUNT(c) FROM CaroGame c WHERE c.user = :user")
    Long countTotalGamesByUser(@Param("user") User user);

    @Query("SELECT COALESCE(SUM(c.winAmount), 0) FROM CaroGame c WHERE c.user = :user")
    Long getTotalWinAmountByUser(@Param("user") User user);

    @Modifying
    @Query("DELETE FROM CaroGame c WHERE c.createdAt < :date")
    int deleteByCreatedAtBefore(@Param("date") LocalDateTime date);

    @Modifying
    @Query("DELETE FROM CaroGame c WHERE c.user.id = :userId AND (:result IS NULL OR c.gameResult = :result)")
    void deleteByUserIdAndResult(@Param("userId") Long userId, @Param("result") String result);

    @Query("SELECT c.user.username as username, c.user.nickname as nickname, c.user.avatarUrl as avatarUrl, COUNT(c) as wins " +
           "FROM CaroGame c WHERE c.gameResult = 'WIN' AND c.user.isDeleted = false " +
           "GROUP BY c.user.id, c.user.username, c.user.nickname, c.user.avatarUrl ORDER BY wins DESC")
    List<Map<String, Object>> findTopWinners(Pageable pageable);

    @Query("SELECT COUNT(c) FROM CaroGame c WHERE c.user.id = :userId AND c.gameResult = 'WIN'")
    long countWinsByUserId(@Param("userId") Long userId);

    @Query("SELECT COUNT(c) FROM CaroGame c WHERE c.user.id = :userId AND c.gameResult = 'LOSE'")
    long countLossesByUserId(@Param("userId") Long userId);

    @Query("SELECT COUNT(c) FROM CaroGame c WHERE c.user.id = :userId AND c.status = 'FINISHED'")
    long countTotalByUserId(@Param("userId") Long userId);
}
