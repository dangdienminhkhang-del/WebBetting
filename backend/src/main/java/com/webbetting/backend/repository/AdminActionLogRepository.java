package com.webbetting.backend.repository;

import com.webbetting.backend.model.AdminActionLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface AdminActionLogRepository extends JpaRepository<AdminActionLog, Long>, JpaSpecificationExecutor<AdminActionLog> {
}
