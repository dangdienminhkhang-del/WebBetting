package com.webbetting.backend.repository;

import com.webbetting.backend.model.TopUpHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;

public interface TopUpHistoryRepository extends JpaRepository<TopUpHistory, Long>, JpaSpecificationExecutor<TopUpHistory> {
    List<TopUpHistory> findByUserId(Long userId);
}

