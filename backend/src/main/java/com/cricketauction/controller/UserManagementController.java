package com.cricketauction.controller;

import com.cricketauction.dto.ApiResponse;
import com.cricketauction.entity.AppUser;
import com.cricketauction.service.AppUserService;
import lombok.Data;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** SUPER_ADMIN only — manage user accounts */
@RestController
@RequestMapping("/api/users")
public class UserManagementController {

    private final AppUserService userService;

    public UserManagementController(AppUserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserResponse>>> listUsers() {
        List<UserResponse> users = userService.getAllUsers().stream()
                .map(UserResponse::from).toList();
        return ResponseEntity.ok(ApiResponse.success(users));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<UserResponse>> createUser(@RequestBody CreateUserRequest req) {
        AppUser.UserRole role = AppUser.UserRole.valueOf(req.getRole().toUpperCase());
        AppUser user = userService.createUser(req.getUsername(), req.getPassword(),
                req.getDisplayName(), role);
        return ResponseEntity.ok(ApiResponse.success("User created", UserResponse.from(user)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
            @PathVariable Long id, @RequestBody UpdateUserRequest req) {
        AppUser.UserRole role = req.getRole() != null
                ? AppUser.UserRole.valueOf(req.getRole().toUpperCase()) : null;
        AppUser user = userService.updateUser(id, req.getDisplayName(), role, req.getActive());
        return ResponseEntity.ok(ApiResponse.success("User updated", UserResponse.from(user)));
    }

    @PostMapping("/{id}/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @PathVariable Long id, @RequestBody Map<String, String> body) {
        userService.resetPassword(id, body.get("password"));
        return ResponseEntity.ok(ApiResponse.success("Password reset", null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(ApiResponse.success("User deleted", null));
    }

    @Data
    public static class CreateUserRequest {
        private String username;
        private String password;
        private String displayName;
        private String role; // SUPER_ADMIN | OPERATOR | VIEWER
    }

    @Data
    public static class UpdateUserRequest {
        private String  displayName;
        private String  role;
        private Boolean active;
    }

    public record UserResponse(Long id, String username, String displayName,
                               String role, Boolean active, String createdAt) {
        static UserResponse from(AppUser u) {
            return new UserResponse(u.getId(), u.getUsername(), u.getDisplayName(),
                    u.getRole().name(), u.getActive(),
                    u.getCreatedAt() != null ? u.getCreatedAt().toString() : null);
        }
    }
}
