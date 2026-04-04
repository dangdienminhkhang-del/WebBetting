package com.webbetting.backend.controller;

import com.webbetting.backend.model.User;
import com.webbetting.backend.security.JwtService;
import com.webbetting.backend.service.TopUpService;
import com.webbetting.backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/topup")
@CrossOrigin(origins = "*")
public class TopUpController {

    @Autowired
    private TopUpService topUpService;

    @Autowired
    private UserService userService;

    @Autowired
    private JwtService jwtService;

    @PostMapping
    public Map<String, Object> topUp(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, Long> payload
    ) {
        String token = authHeader.replace("Bearer ", "");
        String username = jwtService.extractUsername(token);

        User user = userService.login(username, ""); // hoặc getByUsername nếu m có
        Long amount = payload.get("amount");

        topUpService.topUp(user, amount);

        return Map.of(
                "message", "Top up success",
                "balance", user.getBalance()
        );
    }
}
