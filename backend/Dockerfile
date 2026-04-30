FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app
RUN apk add --no-cache maven
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests -q

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN mkdir -p /app/images
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENV APP_IMAGES_STORAGE_DIR=/app/images
ENTRYPOINT ["java", "-jar", "app.jar"]
