FROM node:20-alpine AS build
WORKDIR /app
COPY POS/pos-frontend/package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS final
# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf
# Copy our template
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
# Copy built app
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

# nginx docker image auto-substitutes env vars in /etc/nginx/templates/*.template
# API_URL must be set at runtime (e.g. https://pos-api.onrender.com)
ENV API_URL=http://localhost:5100
