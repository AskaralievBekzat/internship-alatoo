FROM node:20-alpine

WORKDIR /app

# Копируем package.json
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Копируем весь код
COPY . .

# Создаём папку для uploads
RUN mkdir -p backend/uploads

EXPOSE 3000

CMD ["node", "backend/server.js"]