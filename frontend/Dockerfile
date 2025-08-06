# frontend/Dockerfile

FROM node:20-alpine

WORKDIR /app/frontend

COPY package*.json ./

RUN npm cache clean --force

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]