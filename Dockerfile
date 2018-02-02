FROM node

MAINTAINER Nicholas Lopez

WORKDIR /src

COPY . /src

RUN npm install
RUN npm install -g nodemon

EXPOSE 3000

CMD ["npm", "run", "start"]
