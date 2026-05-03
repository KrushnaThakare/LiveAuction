package com.cricketauction.controller;

import com.cricketauction.dto.ApiResponse;
import com.cricketauction.entity.AppUser;
import com.cricketauction.service.AppUserService;
import com.cricketauction.util.JwtUtil;
import lombok.Data;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authManager;
    private final JwtUtil               jwtUtil;
    private final AppUserService        userService;

    public AuthController(AuthenticationManager authManager,
                          JwtUtil jwtUtil,
                          AppUserService userService) {
        this.authManager = authManager;
        this.jwtUtil     = jwtUtil;
        this.userService = userService;
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@RequestBody LoginRequest req) {
        try {
            Authentication auth = authManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.getUsername(), req.getPassword()));
            UserDetails ud = (UserDetails) auth.getPrincipal();
            AppUser user = userService.findByUsername(ud.getUsername());

            // Track last login
            user.setLastLogin(LocalDateTime.now());

            String token = jwtUtil.generateToken(user.getUsername(), user.getRole().name());
            return ApiResponse.success("Login successful",
                    new LoginResponse(token, user.getUsername(), user.getDisplayName(),
                            user.getRole().name()));
        } catch (BadCredentialsException e) {
            throw new RuntimeException("Invalid username or password");
        }
    }

    @GetMapping("/me")
    public ApiResponse<LoginResponse> me(
            @RequestHeader("Authorization") String bearerToken) {
        String token = bearerToken.substring(7);
        String username = jwtUtil.extractUsername(token);
        AppUser user = userService.findByUsername(username);
        return ApiResponse.success(new LoginResponse(token, user.getUsername(),
                user.getDisplayName(), user.getRole().name()));
    }

    @Data
    public static class LoginRequest {
        private String username;
        private String password;
    }

    public record LoginResponse(String token, String username, String displayName, String role) {}
}
