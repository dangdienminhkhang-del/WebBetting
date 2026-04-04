package com.webbetting.backend.repository;

import com.webbetting.backend.model.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {
    Optional<User> findByUsername(String username);
    Optional<User> findByNickname(String nickname);
    Optional<User> findByProviderKey(String providerKey);
    List<User> findAllByOrderByBalanceDesc(Pageable pageable);

    @Query("SELECT COUNT(u) FROM User u WHERE u.isDeleted = false")
    long countActive();

    @Query("SELECT COUNT(u) FROM User u WHERE u.isDeleted = false AND u.isActive = true")
    long countActiveUsers();

    @Query("SELECT COUNT(u) FROM User u WHERE u.isDeleted = false AND u.isActive = false")
    long countLockedUsers();

    @Query("SELECT COALESCE(SUM(u.balance), 0) FROM User u WHERE u.isDeleted = false")
    long sumBalance();
}
