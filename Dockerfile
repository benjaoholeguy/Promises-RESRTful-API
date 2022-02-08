FROM node:14
ENV NODE_ENV staging
WORKDIR /usr/src/app
COPY package*.json ./
RUN apt-get update && apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_8.x | bash -
RUN apt-get update && apt-get install -y nodejs
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
