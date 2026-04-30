package com.cricketauction.config;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.sql.*;

/**
 * Drops the UNIQUE constraint on auction_sessions.current_player_id that
 * was created when the column was mapped as @OneToOne.
 * We changed it to @ManyToOne so a player can appear in multiple sessions
 * (necessary for re-auction). Hibernate's ddl-auto=update will not drop
 * the constraint automatically, so we do it here at startup.
 *
 * This is a no-op on H2 (tests) and on MySQL if the constraint is already gone.
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
            DatabaseMetaData meta = conn.getMetaData();
            String dbName = conn.getCatalog();

            // Only run on MySQL / MariaDB — skip H2 (used in tests)
            String productName = meta.getDatabaseProductName().toLowerCase();
            if (!productName.contains("mysql") && !productName.contains("mariadb")) {
                log.debug("SchemaFixRunner: skipping on {} database", productName);
                return;
            }

            // Find any unique index on auction_sessions.current_player_id
            String indexName = null;
            String sql = "SELECT INDEX_NAME FROM information_schema.STATISTICS " +
                         "WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'auction_sessions' " +
                         "AND COLUMN_NAME = 'current_player_id' AND NON_UNIQUE = 0 LIMIT 1";

            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setString(1, dbName);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) indexName = rs.getString("INDEX_NAME");
                }
            }

            if (indexName != null) {
                log.info("SchemaFixRunner: dropping unique index '{}' on auction_sessions.current_player_id", indexName);
                try (Statement st = conn.createStatement()) {
                    st.execute("ALTER TABLE auction_sessions DROP INDEX `" + indexName + "`");
                }
                log.info("SchemaFixRunner: unique constraint removed — re-auction will now work");
            } else {
                log.debug("SchemaFixRunner: no unique constraint found on current_player_id, nothing to do");
            }
        } catch (Exception e) {
            // Non-fatal — log and continue. The constraint may not exist.
            log.warn("SchemaFixRunner: {}", e.getMessage());
        }
    }
}
