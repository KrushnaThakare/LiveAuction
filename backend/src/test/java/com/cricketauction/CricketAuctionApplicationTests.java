package com.cricketauction;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;NON_KEYWORDS=VALUE",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
    "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
    "spring.jpa.properties.hibernate.hbm2ddl.auto=create-drop",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "app.admin.username=testadmin",
    "app.admin.password=testpass123",
    "app.jwt.secret=TestSecretKeyForJwtThatIsLongEnoughForHmacSha256Algorithm",
    "app.jwt.expiration-ms=3600000"
})
class CricketAuctionApplicationTests {

    @Test
    void contextLoads() {
    }
}
