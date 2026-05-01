package com.cricketauction.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Drops the UNIQUE constraint on auction_sessions.current_player_id.
 * Uses SHOW INDEX FROM (no WHERE clause — not supported on all MySQL versions),
 * then filters in Java for Non_unique = 0 AND Column_name = current_player_id.
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
                return;
            }

            List<String> uniqueIndexesToDrop = new ArrayList<>();

            try (Statement st = conn.createStatement();
                 ResultSet rs = st.executeQuery("SHOW INDEX FROM auction_sessions")) {
                while (rs.next()) {
                    String column   = rs.getString("Column_name");
                    int    nonUniq  = rs.getInt("Non_unique");
                    String keyName  = rs.getString("Key_name");
                    // Find unique indexes (Non_unique = 0) on current_player_id
                    // but NOT the PRIMARY KEY
                    if ("current_player_id".equals(column)
                            && nonUniq == 0
                            && !"PRIMARY".equals(keyName)) {
                        uniqueIndexesToDrop.add(keyName);
                    }
                }
            } catch (SQLException e) {
                log.debug("SchemaFixRunner: auction_sessions not ready yet — {}", e.getMessage());
                return;
            }

            for (String idx : uniqueIndexesToDrop) {
                try (Statement st = conn.createStatement()) {
                    st.execute("ALTER TABLE auction_sessions DROP INDEX `" + idx + "`");
                    log.info("SchemaFixRunner: dropped unique constraint '{}' on current_player_id — re-auction works", idx);
                } catch (SQLException e) {
                    log.warn("SchemaFixRunner: could not drop index '{}': {}", idx, e.getMessage());
                }
            }
        } catch (Exception e) {
            log.warn("SchemaFixRunner: {}", e.getMessage());
        }
    }
}
