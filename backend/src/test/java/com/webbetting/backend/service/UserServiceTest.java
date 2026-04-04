package com.webbetting.backend.service;

import com.webbetting.backend.model.User;
import com.webbetting.backend.repository.TopUpHistoryRepository;
import com.webbetting.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock UserRepository userRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock TopUpHistoryRepository topUpHistoryRepository;

    @InjectMocks UserService userService;

    private User mockUser;

    @BeforeEach
    void setUp() {
        mockUser = new User();
        mockUser.setId(1L);
        mockUser.setUsername("testuser");
        mockUser.setPassword("encoded_password");
        mockUser.setNickname("Test User");
        mockUser.setBalance(1000L);
        mockUser.setRole("USER");
        mockUser.setActive(true);
        mockUser.setDeleted(false);
    }

    @Test
    void register_shouldCreateUserWithEncodedPassword() {
        when(userRepository.findByUsername("newuser")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("password123")).thenReturn("encoded_pass");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User result = userService.register("newuser", "password123", "Nick");

        assertThat(result.getUsername()).isEqualTo("newuser");
        assertThat(result.getPassword()).isEqualTo("encoded_pass");
        assertThat(result.getBalance()).isEqualTo(1000L);
        assertThat(result.getRole()).isEqualTo("USER");
        verify(userRepository).save(any(User.class));
    }

    @Test
    void register_shouldThrowWhenUsernameExists() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(mockUser));

        assertThatThrownBy(() -> userService.register("testuser", "pass", "Nick"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("already exists");
    }

    @Test
    void login_shouldReturnUserOnValidCredentials() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(mockUser));
        when(passwordEncoder.matches("password", "encoded_password")).thenReturn(true);

        User result = userService.login("testuser", "password");

        assertThat(result.getUsername()).isEqualTo("testuser");
    }

    @Test
    void login_shouldThrowOnWrongPassword() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(mockUser));
        when(passwordEncoder.matches("wrong", "encoded_password")).thenReturn(false);

        assertThatThrownBy(() -> userService.login("testuser", "wrong"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Incorrect password");
    }

    @Test
    void login_shouldThrowWhenAccountLocked() {
        mockUser.setActive(false);
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(mockUser));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);

        assertThatThrownBy(() -> userService.login("testuser", "password"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("locked");
    }

    @Test
    void userTopUp_shouldIncreaseBalance() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(mockUser));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(topUpHistoryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        User result = userService.userTopUp(1L, 500L, "bank");

        assertThat(result.getBalance()).isEqualTo(1500L);
    }

    @Test
    void userTopUp_shouldThrowOnNegativeAmount() {
        assertThatThrownBy(() -> userService.userTopUp(1L, -100L, "bank"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void setBalance_shouldThrowOnNegativeBalance() {
        assertThatThrownBy(() -> userService.setBalance(1L, -1L))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
