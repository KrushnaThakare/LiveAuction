package com.cricketauction.service;

import com.cricketauction.dto.ApiResponse;
import com.cricketauction.entity.AppUser;
import com.cricketauction.repository.AppUserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class AppUserService implements UserDetailsService {

    private final AppUserRepository userRepo;
    private final PasswordEncoder   passwordEncoder;

    public AppUserService(AppUserRepository userRepo, PasswordEncoder passwordEncoder) {
        this.userRepo        = userRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        AppUser user = userRepo.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPassword(),
                user.getActive(),
                true, true, true,
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
    }

    public AppUser createUser(String username, String rawPassword, String displayName,
                               AppUser.UserRole role, String appName, String appLogoUrl) {
        if (userRepo.existsByUsername(username)) {
            throw new IllegalArgumentException("Username '" + username + "' already exists");
        }
        AppUser user = AppUser.builder()
                .username(username)
                .password(passwordEncoder.encode(rawPassword))
                .displayName(displayName)
                .role(role)
                .active(true)
                .appName(appName)
                .appLogoUrl(appLogoUrl)
                .build();
        return userRepo.save(user);
    }

    public AppUser updateUser(Long id, String displayName, AppUser.UserRole role,
                               Boolean active, String appName) {
        AppUser user = userRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (displayName != null) user.setDisplayName(displayName);
        if (role != null)        user.setRole(role);
        if (active != null)      user.setActive(active);
        if (appName != null)     user.setAppName(appName);
        return userRepo.save(user);
    }

    public AppUser findById(Long id) {
        return userRepo.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
    }

    public AppUser save(AppUser user) {
        return userRepo.save(user);
    }

    public void resetPassword(Long id, String newRawPassword) {
        AppUser user = userRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setPassword(passwordEncoder.encode(newRawPassword));
        userRepo.save(user);
    }

    public void deleteUser(Long id) {
        userRepo.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<AppUser> getAllUsers() {
        return userRepo.findAll();
    }

    public AppUser findByUsername(String username) {
        return userRepo.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
