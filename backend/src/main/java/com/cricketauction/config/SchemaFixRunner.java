package com.cricketauction.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.*;

/**
 * Drops the UNIQUE constraint on auction_sessions.current_player_id.
 * It was created when the column was mapped as @OneToOne.
 * Now it is @ManyToOne so a player can appear in multiple sessions (re-auction).
 * Uses SHOW INDEX FROM which works on all MySQL/MariaDB versions.
 */
@Component
public class SchemaFixRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SchemaFixRunner.class);
    private final DataSource dataSource;

    public SchemaFixRunner(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(ApplicationArguments args) {
        try (Connection conn = dataSource.getConnection()) {
            String product = conn.getMetaData().getDatabaseProductName().toLowerCase();
            if (!product.contains("mysql") && !product.contains("mariadb")) {
                return; // skip H2 / other test DBs
            }

            String indexToDrop = null;
            // SHOW INDEX is MySQL-native, needs no schema permission
            try (Statement st = conn.createStatement();
                 ResultSet rs = st.executeQuery(
                         "SHOW INDEX FROM auction_sessions WHERE Column_name = 'current_player_id' AND Non_unique = 0")) {
                if (rs.next()) {
                    indexToDrop = rs.getString("Key_name");
                }
            } catch (SQLException e) {
                // Table may not exist yet on very first startup — that's fine
                log.debug("SchemaFixRunner SHOW INDEX: {}", e.getMessage());
                return;
            }

            if (indexToDrop != null) {
                try (Statement st = conn.createStatement()) {
                    st.execute("ALTER TABLE auction_sessions DROP INDEX `" + indexToDrop + "`");
                    log.info("SchemaFixRunner: dropped unique index '{}' — re-auction now works", indexToDrop);
                }
            }
        } catch (Exception e) {
            log.warn("SchemaFixRunner: {}", e.getMessage());
        }
    }
}
