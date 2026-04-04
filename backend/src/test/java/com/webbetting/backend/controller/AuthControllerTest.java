package com.webbetting.backend.controller;

import com.webbetting.backend.dto.AuthResponse;
import com.webbetting.backend.dto.UserSummaryDto;
import com.webbetting.backend.model.User;
import com.webbetting.backend.security.JwtService;
import com.webbetting.backend.security.UserDetailsServiceImpl;
import com.webbetting.backend.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Map;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock UserService userService;
    @Mock JwtService jwtService;
    @Mock UserDetailsServiceImpl userDetailsService;

    @InjectMocks AuthController authController;

    private User mockUser;

    @BeforeEach
    void setUp() {
        mockUser = new User();
        mockUser.setId(1L);
        mockUser.setUsername("testuser");
        mockUser.setPassword("encoded");
        mockUser.setNickname("Test");
        mockUser.setBalance(1000L);
        mockUser.setRole("USER");
        mockUser.setActive(true);
        mockUser.setDeleted(false);
    }

    @Test
    void login_shouldReturn200OnValidCredentials() {
        UserDetails userDetails = mock(UserDetails.class);
        when(userService.login("testuser", "password")).thenReturn(mockUser);
        when(userDetailsService.loadUserByUsername("testuser")).thenReturn(userDetails);
        when(jwtService.generateToken(userDetails)).thenReturn("mock.jwt.token");
        when(userService.mapToDTO(mockUser)).thenReturn(new UserSummaryDto(mockUser));

        ResponseEntity<?> response = authController.login(Map.of("username", "testuser", "password", "password"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        AuthResponse body = (AuthResponse) response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getToken()).isEqualTo("mock.jwt.token");
    }

    @Test
    void login_shouldReturn401OnInvalidCredentials() {
        when(userService.login("testuser", "wrong"))
                .thenThrow(new RuntimeException("Incorrect password"));

        ResponseEntity<?> response = authController.login(Map.of("username", "testuser", "password", "wrong"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void login_shouldReturn403WhenAccountLocked() {
        when(userService.login("testuser", "password"))
                .thenThrow(new RuntimeException("User account is locked"));
        when(userService.getByUsername("testuser")).thenReturn(mockUser);

        ResponseEntity<?> response = authController.login(Map.of("username", "testuser", "password", "password"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        @SuppressWarnings("unchecked")
        Map<String, String> body = (Map<String, String>) response.getBody();
        assertThat(body).containsKey("code");
        assertThat(body.get("code")).isEqualTo("ACCOUNT_LOCKED");
    }

    @Test
    void login_shouldReturnMessageOnGenericError() {
        when(userService.login("testuser", "password"))
                .thenThrow(new RuntimeException("User not found"));

        ResponseEntity<?> response = authController.login(Map.of("username", "testuser", "password", "password"));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
