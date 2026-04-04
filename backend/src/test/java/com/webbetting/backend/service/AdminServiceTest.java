package com.webbetting.backend.service;

import com.webbetting.backend.dto.UserSummaryDto;
import com.webbetting.backend.model.AdminActionLog;
import com.webbetting.backend.model.User;
import com.webbetting.backend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AdminServiceTest {

    @Mock UserRepository userRepository;
    @Mock BetHistoryRepository betHistoryRepository;
    @Mock CaroGameRepository caroGameRepository;
    @Mock AdminActionLogRepository adminActionLogRepository;
    @Mock ChessGameRepository chessGameRepository;
    @Mock TopUpHistoryRepository topUpHistoryRepository;
    @Mock TransactionService transactionService;

    @InjectMocks AdminService adminService;

    private User adminUser;
    private User targetUser;

    @BeforeEach
    void setUp() {
        adminUser = new User();
        adminUser.setId(99L);
        adminUser.setUsername("adminK");
        adminUser.setRole("ADMIN");
        adminUser.setActive(true);
        adminUser.setDeleted(false);
        adminUser.setBalance(0L);

        targetUser = new User();
        targetUser.setId(1L);
        targetUser.setUsername("player1");
        targetUser.setBalance(1000L);
        targetUser.setActive(true);
        targetUser.setDeleted(false);

        // Mock SecurityContext
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("adminK");
        SecurityContext ctx = mock(SecurityContext.class);
        when(ctx.getAuthentication()).thenReturn(auth);
        SecurityContextHolder.setContext(ctx);
        when(userRepository.findByUsername("adminK")).thenReturn(Optional.of(adminUser));
    }

    @Test
    void lockUser_shouldSetActiveToFalse() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(targetUser));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(adminActionLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UserSummaryDto result = adminService.lockUser(1L, false);

        assertThat(result.isActive()).isFalse();
        assertThat(targetUser.getLockedAt()).isNotNull();
    }

    @Test
    void lockUser_shouldClearLockedAtWhenUnlocking() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(targetUser));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(adminActionLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UserSummaryDto result = adminService.lockUser(1L, true);

        assertThat(result.isActive()).isTrue();
        assertThat(targetUser.getLockedAt()).isNull();
    }

    @Test
    void topUp_shouldIncreaseBalance() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(targetUser));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(adminActionLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        adminService.topUp(1L, 500L, "adminK");

        assertThat(targetUser.getBalance()).isEqualTo(1500L);
        verify(transactionService).createTransaction(eq(targetUser), any(), eq(500L), eq(1000L), eq(1500L));
    }

    @Test
    void topUp_shouldThrowOnZeroAmount() {
        assertThatThrownBy(() -> adminService.topUp(1L, 0L, "adminK"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void setUserBalance_shouldThrowOnNegative() {
        assertThatThrownBy(() -> adminService.setUserBalance(1L, -1L))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void deleteUser_shouldSoftDelete() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(targetUser));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(adminActionLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        adminService.deleteUser(1L);

        assertThat(targetUser.isDeleted()).isTrue();
    }

    @Test
    void resetUserBalance_shouldSetTo1000() {
        targetUser.setBalance(5000L);
        when(userRepository.findById(1L)).thenReturn(Optional.of(targetUser));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(adminActionLogRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        adminService.resetUserBalance(1L);

        assertThat(targetUser.getBalance()).isEqualTo(1000L);
    }
}
