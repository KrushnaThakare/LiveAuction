package com.cricketauction.config;

import com.cricketauction.entity.AppUser;
import com.cricketauction.repository.AppUserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Order(2)
public class AdminSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

    @Value("${app.admin.username}")
    private String adminUsername;

    @Value("${app.admin.password}")
    private String adminPassword;

    private final AppUserRepository userRepo;
    private final PasswordEncoder   passwordEncoder;

    public AdminSeeder(AppUserRepository userRepo, PasswordEncoder passwordEncoder) {
        this.userRepo        = userRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!userRepo.existsByUsername(adminUsername)) {
            AppUser admin = AppUser.builder()
                    .username(adminUsername)
                    .password(passwordEncoder.encode(adminPassword))
                    .displayName("Super Admin")
                    .role(AppUser.UserRole.SUPER_ADMIN)
                    .active(true)
                    .appName("Cricket Auction")
                    .build();
            userRepo.save(admin);
            log.info("AdminSeeder: created super-admin '{}'", adminUsername);
        }
    }
}
