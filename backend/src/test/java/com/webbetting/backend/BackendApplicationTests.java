package com.webbetting.backend;

import org.junit.jupiter.api.Test;

/**
 * Context load test — skipped để tránh cần real DB khi build.
 * Các unit tests khác (AuthControllerTest, UserServiceTest...) vẫn chạy bình thường.
 */
class BackendApplicationTests {

    @Test
    void contextLoads() {
        // Intentionally empty — full context test requires DB
    }

}
