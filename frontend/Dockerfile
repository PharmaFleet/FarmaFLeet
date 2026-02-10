# Frontend Dockerfile

# Stage 1: Build
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_API_URL=http://localhost:8000/api/v1
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Stage 2: Production
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
