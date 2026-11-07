FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
##RUN apk add --no-cache maven
COPY pom.xml .
# Download dependencies first (cached layer)
RUN mvn dependency:go-offline -q
COPY src ./src
RUN mvn clean package -DskipTests -q

FROM eclipse-temurin:17-jre
WORKDIR /app
RUN mkdir -p /tmp/cricket-auction-uploads /tmp/cricket-auction-images
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
